require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool using the DATABASE_URL from .env
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some hosted PostgreSQL services
  }
});

async function testConnection() {
  try {
    // Attempt to connect and run a simple query
    const client = await pool.connect();
    console.log('Successfully connected to PostgreSQL database!');
    
    // Run a simple query to test the connection
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Database time:', result.rows[0].current_time);
    
    // Release the client back to the pool
    client.release();
    
    // Close the pool
    await pool.end();
    
    return true;
  } catch (error) {
    console.error('Error connecting to the database:', error.message);
    return false;
  }
}

// Run the test
testConnection()
  .then(success => {
    if (success) {
      console.log('Database connection test completed successfully.');
    } else {
      console.log('Database connection test failed.');
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });