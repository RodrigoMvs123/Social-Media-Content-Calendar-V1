#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, 'server', '.env');

function switchToPostgres() {
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/^DB_TYPE=sqlite/m, 'DB_TYPE=postgres');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Switched to PostgreSQL');
}

function switchToSQLite() {
  let envContent = fs.readFileSync(envPath, 'utf8');
  envContent = envContent.replace(/^DB_TYPE=postgres/m, 'DB_TYPE=sqlite');
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Switched to SQLite');
}

const command = process.argv[2];
if (command === 'postgres') {
  switchToPostgres();
} else if (command === 'sqlite') {
  switchToSQLite();
} else {
  console.log('Usage: node test-database-switch.js [postgres|sqlite]');
}