const axios = require('axios');
const { configureLogger, getAuthToken, Log } = require('logging_middleware');

configureLogger({
  "email": "palagiri.ayesha2022@vitstudent.ac.in",
  "name": "ayesha palagiri",
  "rollNo": "22mis0277",
  "accessCode": "SfFuWg",
  "clientID": "71d2d9a1-d296-4832-a124-7d081796ae88",
  "clientSecret": "abksAcUSBuyBeqcU"
});

const DEPOTS_URL = 'http://4.224.186.213/evaluation-service/depots';
const VEHICLES_URL = 'http://4.224.186.213/evaluation-service/vehicles';

async function solveScheduler() {
  try {
    await Log("backend", "info", "service", "Starting Vehicle Maintenance Scheduler");
    
    const token = await getAuthToken();
    const config = { headers: { Authorization: `Bearer ${token}` } };
    
    await Log("backend", "info", "repository", "Fetching depots data");
    const depotsRes = await axios.get(DEPOTS_URL, config);
    const depots = depotsRes.data.depots;
    const totalCapacity = depots.reduce((sum, d) => sum + d.MechanicHours, 0);
    await Log("backend", "debug", "service", `Capacity: ${totalCapacity} hrs, ${depots.length} depots`);

    await Log("backend", "info", "repository", "Fetching vehicles data");
    const vehiclesRes = await axios.get(VEHICLES_URL, config);
    const tasks = vehiclesRes.data.vehicles;
    await Log("backend", "debug", "service", `Total tasks: ${tasks.length}`);

    await Log("backend", "info", "service", "Running Knapsack algorithm");
    const n = tasks.length;
    const capacity = totalCapacity;
    const dp = Array(n + 1).fill(0).map(() => Array(capacity + 1).fill(0));

    for (let i = 1; i <= n; i++) {
      const task = tasks[i - 1];
      const weight = task.Duration;
      const value = task.Impact;
      for (let w = 0; w <= capacity; w++) {
        if (weight <= w) {
          dp[i][w] = Math.max(dp[i - 1][w], dp[i - 1][w - weight] + value);
        } else {
          dp[i][w] = dp[i - 1][w];
        }
      }
    }

    let res = dp[n][capacity];
    const maxImpact = res;
    let w = capacity;
    const selectedTasks = [];

    for (let i = n; i > 0 && res > 0; i--) {
      if (res === dp[i - 1][w]) {
        continue;
      } else {
        const task = tasks[i - 1];
        selectedTasks.push(task.TaskID);
        res -= task.Impact;
        w -= task.Duration;
      }
    }

    await Log("backend", "info", "service", `Done. Max Impact: ${maxImpact}, Tasks: ${selectedTasks.length}`);
    
    console.log("=== SCHEDULER RESULT ===");
    console.log("Total Mechanic Hours:", totalCapacity);
    console.log("Total Tasks Available:", tasks.length);
    console.log("Max Impact Score:", maxImpact);
    console.log("Selected Tasks:", JSON.stringify(selectedTasks, null, 2));

  } catch (error) {
    await Log("backend", "error", "service", `Scheduler failed: ${error.message}`);
    console.error("Scheduler Error:", error);
  }
}

solveScheduler();
