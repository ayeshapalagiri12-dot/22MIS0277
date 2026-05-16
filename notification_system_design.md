# Campus Notifications Microservice Design

## Stage 1: API Design
### Display Notifications API Contract

**Endpoint:** `GET /api/v1/notifications`
**Description:** Fetches a paginated list of notifications for the authenticated student.

**Headers:**
- `Authorization`: Bearer `<token>`

**Query Parameters:**
- `page` (integer, default: 1): Page number.
- `limit` (integer, default: 20): Number of notifications per page.
- `status` (string, optional): Filter by `read` or `unread`.

**Response (200 OK):**
```json
{
  "data": [
    {
      "notificationId": "123e4567-e89b-12d3-a456-426614174000",
      "type": "placement",
      "message": "Infosys campus drive scheduled for 25th Oct.",
      "isRead": false,
      "createdAt": "2023-10-20T10:00:00Z",
      "actionUrl": "https://placement.college.edu/infosys"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "totalPages": 5,
    "totalItems": 100
  }
}
```

### Real-Time Delivery Mechanism
For real-time delivery, **Server-Sent Events (SSE)** is the most appropriate mechanism for this use case.
- **Why SSE?** Notifications flow unidirectionally from the server to the client. SSE is natively supported by browsers, simpler to implement than WebSockets, and uses standard HTTP without the overhead of the WebSocket handshake.

---

## Stage 2: Persistence

### Database Choice: PostgreSQL
PostgreSQL (a Relational Database) is highly recommended for this scenario.
- **Reasoning:** Notifications require structured data with relationships (Student ID, Notification Type). PostgreSQL handles complex querying and indexing effectively. Its robust support for JSONB allows flexibility if notification payloads vary in structure without abandoning relational guarantees.

### Schema Design
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action_url TEXT
);
```

### Data Volume Considerations
With 50,000 students receiving 5 notifications daily, the table grows by 250,000 rows/day (91+ million/year).
- **Archival/Partitioning:** We can partition the `notifications` table by `created_at` (e.g., monthly partitions) so older notifications can be easily archived or dropped.
- **TTL/Cleanup:** Automatically delete or archive notifications older than 6 months since student notifications have high recency value.

---

## Stage 3: Optimization

### Analysis of the Slow Query
**Query:** `SELECT * FROM notifications WHERE studentID = 1042 AND isRead = false ORDER BY createdAt DESC;`

**Problem:** Without proper indexing, the database performs a full table scan, scanning millions of rows to find the unread notifications for a single student. Furthermore, sorting by `createdAt` adds an in-memory sort operation which degrades performance under load.

**Solution: Composite Index**
Create a composite index on the columns used for filtering and sorting:
```sql
CREATE INDEX idx_student_unread_created ON notifications (student_id, is_read, created_at DESC);
```
- **How it helps:** The database can instantly jump to the exact rows for a specific `student_id` where `is_read = false`, and since the index is already sorted by `created_at DESC`, it eliminates the need for an expensive sorting step.

---

## Stage 4: Scaling

### Handling High Traffic Spikes
When 50,000 students check their phones simultaneously (e.g., after an exam result is declared), the database will be overwhelmed by concurrent read queries.

**Mitigation Strategies:**
1. **Caching Layer (Redis):**
   - Cache the unread count and the first page of notifications for each active student in Redis.
   - Cache Key: `notifications:student:1042:page:1`
   - Cache Expiry: 15-30 minutes, invalidated immediately when a new notification is generated or a notification is marked as read.
2. **Read Replicas:**
   - Offload `GET` requests to database read replicas to prevent the primary write database from being blocked.
3. **Cursor-Based Pagination:**
   - Replace traditional `OFFSET`/`LIMIT` pagination with cursor-based pagination (using `created_at` or `id`) to prevent deep-pagination performance degradation on the database.

---

## Stage 5: Reliability

### Analysis of the Flawed Pseudocode
```python
def notify_all():
    db.insert_notification(event)
    email.send_to_all()
```
**Issues:**
1. **Synchronous Blocking:** Sending emails to 50,000 students synchronously will take a massive amount of time, causing the API request to timeout.
2. **Partial Failures:** If `email.send_to_all()` crashes halfway, there is no way to resume or know who received the email.
3. **Coupling:** The database transaction and the third-party email API are tightly coupled.

### Redesigned Architecture
Introduce an asynchronous Message Queue (e.g., RabbitMQ, Apache Kafka, or AWS SQS).

**1. Producer (API Server):**
```python
def notify_all(event):
    # 1. Quickly insert notification into DB (fast)
    db.insert_notification(event)
    # 2. Publish an event to the message queue (fast)
    message_queue.publish('notification.created', event)
    return "Notification queued successfully."
```

**2. Consumer (Background Worker):**
```python
# Listens to 'notification.created'
def process_email_queue(event):
    students = db.get_target_students(event)
    for student in students:
        try:
            email.send(student, event)
            # Acknowledge message for this student
        except EmailServiceDownException:
            # Retry mechanism (Dead Letter Queue)
            message_queue.nack_with_delay(student, event)
```
**Benefits:** The API responds instantly. Email sending is decoupled, parallelized across multiple worker nodes, and resilient to third-party failures with built-in retries.

---

## Stage 6: Priority Inbox

The code implementation for the Priority Inbox is located in the `notification_app_be` directory.

### Efficiency Explanation
To maintain the top 10 notifications efficiently without querying the database, the implementation uses a **Min-Heap (Priority Queue) bounded to a size of 10**.

1. **Processing:** As we iterate through incoming notifications, we calculate a score for each based on the priority weights (Placement=3, Result=2, Event=1) and an inverse penalty for recency.
2. **Heap Insertion:** We insert the notification into the Min-Heap.
3. **Bounding:** If the heap exceeds 10 elements, we extract the minimum (the lowest score item).
4. **Time Complexity:** For `N` notifications, maintaining a heap of size `K` (where `K=10`) takes `O(N log K)` time. Since `K` is a constant (10), the time complexity simplifies to `O(N)`, which is vastly more efficient than sorting the entire list `O(N log N)`. Space complexity is `O(K)`, meaning it uses minimal memory.
