const { configureLogger, Log } = require('./index');

configureLogger({
  "email": "palagiri.ayesha2022@vitstudent.ac.in",
  "name": "ayesha palagiri",
  "rollNo": "22mis0277",
  "accessCode": "SfFuWg",
  "clientID": "71d2d9a1-d296-4832-a124-7d081796ae88",
  "clientSecret": "abksAcUSBuyBeqcU"
});

async function run() {
  try {
    const res = await Log("backend", "info", "utils", "Logger initialized successfully");
    console.log("Log response:", res);
  } catch (err) {
    console.error("Test error:", err);
  }
}
run();
