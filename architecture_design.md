# System Architecture Design

This document outlines the architecture design for the Microservices implemented in this assessment.

---

## 1. Campus Notifications Microservice Architecture

The notification system is designed for high throughput, real-time delivery, and fault tolerance.

### Architecture Diagram

```mermaid
graph TD
    subgraph Client Layer
        Web[Web/Mobile Client]
    end

    subgraph API Gateway / Load Balancer
        LB[Load Balancer]
    end

    subgraph Notification Services
        API[Notification API Server]
        Worker[Background Email Worker]
    end

    subgraph Message Broker
        Queue[(RabbitMQ / Kafka)]
    end

    subgraph Data Layer
        Cache[(Redis Cache)]
        DB[(PostgreSQL Primary)]
        DB_Rep[(PostgreSQL Read Replica)]
    end

    subgraph External Services
        Email[Third-Party Email Service]
    end

    %% Connections
    Web -->|GET /notifications | LB
    LB --> API
    
    %% Write flow
    API -->|1. Insert Notification| DB
    API -->|2. Publish Event| Queue
    Queue -->|Consume Event| Worker
    Worker -->|Send Email| Email
    
    %% Read flow
    API -->|Check Cache| Cache
    API -->|Read| DB_Rep
    DB -.->|Replication| DB_Rep
```

### Key Architectural Decisions:
1. **Asynchronous Processing**: The use of a Message Broker (RabbitMQ) decouples the API from the slow third-party email service, ensuring the API responds instantly and prevents request timeouts.
2. **Caching Strategy**: Redis caches unread notifications to handle sudden traffic spikes (e.g., when 50,000 students log in simultaneously).
3. **Database Replication**: Offloading read queries to a PostgreSQL Read Replica prevents heavy read traffic from locking or slowing down write operations.

---

## 2. Vehicle Maintenance Scheduler Architecture

The scheduler microservice interacts securely with external APIs to aggregate data and compute the optimal maintenance schedule.

### Architecture Diagram

```mermaid
graph TD
    subgraph Execution Context
        Scheduler[Maintenance Scheduler Script]
        Logger[Logging Middleware]
    end

    subgraph Affordmed Evaluation Server
        AuthAPI[Auth API /auth]
        DepotAPI[Depots API /depots]
        VehicleAPI[Vehicles API /vehicles]
        LogAPI[Logs API /logs]
    end

    %% Flow
    Scheduler -->|1. Request Auth| AuthAPI
    AuthAPI -->|2. Return Bearer Token| Scheduler
    
    Scheduler -->|3. Fetch Depots data| DepotAPI
    Scheduler -->|4. Fetch Vehicles data| VehicleAPI
    
    Scheduler -->|5. Compute 0/1 Knapsack| Scheduler
    
    Scheduler -->|Log Events| Logger
    Logger -->|Push Logs| LogAPI
```

### Key Architectural Decisions:
1. **Separation of Concerns**: The `logging_middleware` is decoupled into its own reusable package, handling its own authentication caching and payload validation.
2. **Algorithmic Efficiency**: The scheduler leverages Dynamic Programming (0/1 Knapsack) to find the absolute mathematical optimum impact score without relying on brute force or external libraries.
