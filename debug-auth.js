// Debug script to capture authentication logs
// Run this in browser console before testing signup

console.log('🔧 AUTH DEBUG SCRIPT STARTED');

// Store original console.log
const originalLog = console.log;

// Array to store all logs
window.authLogs = [];

// Override console.log to capture logs
console.log = function(...args) {
  // Store the log
  window.authLogs.push({
    timestamp: new Date().toISOString(),
    args: args
  });
  
  // Call original console.log
  originalLog.apply(console, args);
};

// Function to get filtered logs
window.getAuthLogs = function() {
  const relevantLogs = window.authLogs.filter(log => {
    const logStr = JSON.stringify(log.args).toLowerCase();
    return logStr.includes('auth') || 
           logStr.includes('signup') || 
           logStr.includes('register') || 
           logStr.includes('login') || 
           logStr.includes('🚀') || 
           logStr.includes('🔍') || 
           logStr.includes('protected route') ||
           logStr.includes('attempting');
  });
  
  console.log('=== AUTHENTICATION DEBUG LOGS ===');
  relevantLogs.forEach(log => {
    console.log(`[${log.timestamp}]`, ...log.args);
  });
  
  return relevantLogs;
};

// Function to clear logs
window.clearAuthLogs = function() {
  window.authLogs = [];
  console.log('🔧 Auth logs cleared');
};

console.log('🔧 Debug script ready. After testing signup, run: getAuthLogs()');