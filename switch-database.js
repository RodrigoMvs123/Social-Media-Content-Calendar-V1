#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const rootEnvPath = path.join(__dirname, '.env');
const serverEnvPath = path.join(__dirname, 'server', '.env');

function updateEnvFile(filePath, toSQLite) {
  let envContent = fs.readFileSync(filePath, 'utf8');
  
  // Only change DB_TYPE - keep all database connections active
  if (toSQLite) {
    envContent = envContent.replace(/^DB_TYPE=postgres/m, 'DB_TYPE=sqlite');
  } else {
    envContent = envContent.replace(/^DB_TYPE=sqlite/m, 'DB_TYPE=postgres');
  }
  
  // Ensure both databases remain connected
  envContent = envContent.replace(/^# DATABASE_URL=/m, 'DATABASE_URL=');
  envContent = envContent.replace(/^ENABLE_REAL_TIME_SYNC=false/m, 'ENABLE_REAL_TIME_SYNC=true');
  
  fs.writeFileSync(filePath, envContent);
}

function switchToSQLite() {
  updateEnvFile(rootEnvPath, true);
  updateEnvFile(serverEnvPath, true);
  console.log('✅ Switched to SQLite primary (both databases remain connected)');
}

function switchToPostgres() {
  updateEnvFile(rootEnvPath, false);
  updateEnvFile(serverEnvPath, false);
  console.log('✅ Switched to PostgreSQL primary (both databases remain connected)');
}

const mode = process.argv[2];
if (mode === 'sqlite') {
  switchToSQLite();
} else if (mode === 'postgres') {
  switchToPostgres();
} else {
  console.log('Usage: node switch-database.js [sqlite|postgres]');
  console.log('This will configure single database mode');
}