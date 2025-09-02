// Simple script to test PostgreSQL connection
require('dotenv').config();
const { Pool } = require('pg');

// Get the connection string from environment variables
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

console.log('Attempting to connect to PostgreSQL database...');

// Create a new pool using the connection string with SSL required
const pool = new Pool({ 
  connectionString,
  ssl: {
    rejectUnauthorized: false // Required for some cloud database providers
  }
});

// Test the connection
pool.query('SELECT NOW() as current_time')
  .then(res => {
    console.log('✅ Successfully connected to PostgreSQL database!');
    console.log(`Server time: ${res.rows[0].current_time}`);
    pool.end();
  })
  .catch(err => {
    console.error('❌ Failed to connect to PostgreSQL database:');
    console.error(err.message);
    pool.end();
  });