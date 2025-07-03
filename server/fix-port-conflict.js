// Script to check and kill processes using port 3000 or 3001
const { exec } = require('child_process');

function checkPort(port) {
  return new Promise((resolve, reject) => {
    // Command to find process using the port
    const command = process.platform === 'win32' 
      ? `netstat -ano | findstr :${port}`
      : `lsof -i :${port}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // No process using this port
        console.log(`No process found using port ${port}`);
        resolve(null);
        return;
      }
      
      if (stderr) {
        console.error(`Error checking port ${port}:`, stderr);
        reject(stderr);
        return;
      }
      
      console.log(`Process found using port ${port}:`);
      console.log(stdout);
      resolve(stdout);
    });
  });
}

function killProcess(pid) {
  return new Promise((resolve, reject) => {
    const command = process.platform === 'win32'
      ? `taskkill /F /PID ${pid}`
      : `kill -9 ${pid}`;
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error killing process ${pid}:`, error);
        reject(error);
        return;
      }
      
      if (stderr) {
        console.error(`Error output when killing process ${pid}:`, stderr);
      }
      
      console.log(`Process ${pid} killed:`, stdout);
      resolve(stdout);
    });
  });
}

async function fixPortConflict() {
  try {
    console.log('Checking for processes using ports 3000 and 3001...');
    
    // Check port 3000
    const port3000Result = await checkPort(3000);
    if (port3000Result) {
      console.log('Attempting to free port 3000...');
      
      // Extract PID from the result
      const pidMatch = port3000Result.match(/\s+(\d+)\s*$/m);
      if (pidMatch && pidMatch[1]) {
        const pid = pidMatch[1];
        console.log(`Found process with PID ${pid} using port 3000`);
        await killProcess(pid);
      } else {
        console.log('Could not extract PID for port 3000');
      }
    }
    
    // Check port 3001
    const port3001Result = await checkPort(3001);
    if (port3001Result) {
      console.log('Attempting to free port 3001...');
      
      // Extract PID from the result
      const pidMatch = port3001Result.match(/\s+(\d+)\s*$/m);
      if (pidMatch && pidMatch[1]) {
        const pid = pidMatch[1];
        console.log(`Found process with PID ${pid} using port 3001`);
        await killProcess(pid);
      } else {
        console.log('Could not extract PID for port 3001');
      }
    }
    
    console.log('\nPorts should now be available. You can start your server and client:');
    console.log('1. Start server: cd server && node index.js');
    console.log('2. Start client: cd client && npm run dev');
    
  } catch (error) {
    console.error('Error fixing port conflict:', error);
  }
}

fixPortConflict();