const axios = require('axios');
const { configureLogger, getAuthToken } = require('logging_middleware');

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
    const token = await getAuthToken();
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const vehiclesRes = await axios.get('http://4.224.186.213/evaluation-service/vehicles', config);
    console.log("Vehicles keys:", Object.keys(vehiclesRes.data));
    if (vehiclesRes.data.vehicles) {
      console.log("Vehicles:", JSON.stringify(vehiclesRes.data.vehicles.slice(0, 3), null, 2));
    } else if (vehiclesRes.data.tasks) {
      console.log("Tasks:", JSON.stringify(vehiclesRes.data.tasks.slice(0, 3), null, 2));
    } else {
      console.log(vehiclesRes.data);
    }
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}
run();
