const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
require('dotenv').config({ path: './server/.env' });

// Check SQLite user
const dbPath = './server/data.sqlite';
const db = new sqlite3.Database(dbPath);

console.log('👤 Current User Status:');
console.log('======================');

db.get(`SELECT id, name, email FROM users WHERE id = 2`, (err, row) => {
  if (err) {
    console.error('❌ SQLite Error:', err);
  } else if (row) {
    console.log('✅ SQLite - User ID 2:', row);
  } else {
    console.log('❌ SQLite - User ID 2 not found');
  }
  
  // Check PostgreSQL user
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
  });
  
  client.connect().then(() => {
    return client.query(`SELECT id, name, email FROM users WHERE id = 2`);
  }).then(result => {
    if (result.rows.length > 0) {
      console.log('✅ PostgreSQL - User ID 2:', result.rows[0]);
    } else {
      console.log('❌ PostgreSQL - User ID 2 not found');
    }
    
    console.log('\n📊 Database Configuration:');
    console.log('Primary DB:', process.env.DB_TYPE);
    console.log('Sync Enabled:', process.env.ENABLE_REAL_TIME_SYNC);
    
    client.end();
    db.close();
  }).catch(err => {
    console.error('❌ PostgreSQL Error:', err.message);
    db.close();
  });
});