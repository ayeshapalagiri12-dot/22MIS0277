const axios = require('axios');

let currentToken = null;
let tokenExpiresAt = 0;
let authConfig = null;

const AUTH_URL = 'http://4.224.186.213/evaluation-service/auth';
const LOG_URL = 'http://4.224.186.213/evaluation-service/logs';

function configureLogger(config) {
  authConfig = config;
}

async function getAuthToken() {
  if (!authConfig) {
    throw new Error("Logger is not configured. Call configureLogger(config) first.");
  }
  
  if (currentToken && Date.now() < tokenExpiresAt) {
    return currentToken;
  }

  try {
    const response = await axios.post(AUTH_URL, authConfig);
    currentToken = response.data.access_token;
    const expiresInSec = response.data.expires_in; 
    tokenExpiresAt = Date.now() + 3600 * 1000; 
    if (expiresInSec > Date.now() / 1000) {
       tokenExpiresAt = expiresInSec * 1000;
    }
    return currentToken;
  } catch (error) {
    console.error("Failed to authenticate logger:", error?.response?.data || error.message);
    throw error;
  }
}

async function Log(stack, level, pkg, message) {
  const allowedStacks = ["backend", "frontend"];
  const allowedLevels = ["debug", "info", "warn", "error", "fatal"];
  const allowedPackages = [
    "cache", "controller", "cron_job", "db", "domain", 
    "handler", "repository", "route", "service", 
    "auth", "config", "middleware", "utils"
  ];

  if (!allowedStacks.includes(stack.toLowerCase())) {
    throw new Error(`Invalid stack: ${stack}. Must be one of ${allowedStacks.join(', ')}`);
  }
  if (!allowedLevels.includes(level.toLowerCase())) {
    throw new Error(`Invalid level: ${level}. Must be one of ${allowedLevels.join(', ')}`);
  }
  
  const token = await getAuthToken();
  
  try {
    const response = await axios.post(
      LOG_URL,
      {
        stack: stack.toLowerCase(),
        level: level.toLowerCase(),
        package: pkg.toLowerCase(),
        message: message
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error("Failed to log:", error?.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  configureLogger,
  Log,
  getAuthToken
};