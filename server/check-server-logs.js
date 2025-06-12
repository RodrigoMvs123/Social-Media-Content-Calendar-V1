// Script to check if the server is properly configured for SQLite
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

function checkConfiguration() {
  console.log('Checking server configuration...');
  
  // Check .env file
  console.log('\n--- Environment Variables ---');
  console.log(`DB_TYPE: ${process.env.DB_TYPE}`);
  console.log(`DB_PATH: ${process.env.DB_PATH}`);
  console.log(`USE_MOCK_DATA: ${process.env.USE_MOCK_DATA}`);
  
  // Check if SQLite file exists
  const dbPath = process.env.DB_PATH || './data.sqlite';
  console.log('\n--- Database File ---');
  try {
    const stats = fs.statSync(dbPath);
    console.log(`SQLite database exists: Yes (${Math.round(stats.size / 1024)} KB)`);
  } catch (err) {
    console.log(`SQLite database exists: No (${err.message})`);
  }
  
  // Check if server is running
  console.log('\n--- Server Status ---');
  const http = require('http');
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/health',
    method: 'GET',
    timeout: 3000
  };
  
  const req = http.request(options, (res) => {
    console.log(`Server is running: Yes (Status: ${res.statusCode})`);
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        console.log(`Server response: ${JSON.stringify(parsed)}`);
      } catch (e) {
        console.log(`Server response: ${data}`);
      }
    });
  });
  
  req.on('error', (e) => {
    console.log(`Server is running: No (${e.message})`);
    console.log('\nPlease make sure the server is running on port 3001');
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.log('Server is running: No (Request timed out)');
  });
  
  req.end();
}

checkConfiguration();