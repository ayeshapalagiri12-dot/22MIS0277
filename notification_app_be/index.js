const { configureLogger, Log } = require('logging_middleware');

configureLogger({
  "email": "palagiri.ayesha2022@vitstudent.ac.in",
  "name": "ayesha palagiri",
  "rollNo": "22mis0277",
  "accessCode": "SfFuWg",
  "clientID": "71d2d9a1-d296-4832-a124-7d081796ae88",
  "clientSecret": "abksAcUSBuyBeqcU"
});

class PriorityInbox {
  constructor() {
    this.maxSize = 10;
    this.inbox = [];
  }

  getWeight(type) {
    if (type === 'placement') return 3;
    if (type === 'result') return 2;
    if (type === 'event') return 1;
    return 0;
  }

  getScore(notification) {
    // Score based on weight and recency (timestamp).
    return this.getWeight(notification.type) * 10000000000000 + notification.timestamp;
  }

  add(notification) {
    notification.score = this.getScore(notification);
    this.inbox.push(notification);
    // Sort descending by score
    this.inbox.sort((a, b) => b.score - a.score);
    
    // Keep only top 10
    if (this.inbox.length > this.maxSize) {
      this.inbox.pop();
    }
  }

  getTop10() {
    return this.inbox;
  }
}

async function run() {
  try {
    await Log("backend", "info", "service", "Initializing Priority Inbox");
    
    const inbox = new PriorityInbox();
    const types = ['event', 'result', 'placement'];
    const now = Date.now();
    
    // Simulate 20 incoming notifications over time
    for (let i = 0; i < 20; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      inbox.add({
        id: i,
        type: type,
        message: `Notification ${i} of type ${type}`,
        timestamp: now + i * 1000
      });
    }

    const top10 = inbox.getTop10();
    
    await Log("backend", "info", "service", "Processed 20 notifications. Retained top 10");
    
    console.log("=== PRIORITY INBOX (TOP 10) ===");
    top10.forEach((n, idx) => {
      console.log(`${idx + 1}. [${n.type.toUpperCase()}] ${n.message}`);
    });
    
  } catch (error) {
    await Log("backend", "error", "service", `Priority Inbox failed: ${error.message}`);
    console.error("Error:", error);
  }
}

run();
