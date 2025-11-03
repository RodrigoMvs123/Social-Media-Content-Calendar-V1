require('dotenv').config();
const { Pool } = require('pg');

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some hosted PostgreSQL services
  }
});

// Function to query users
async function queryUsers() {
  try {
    // Connect to the database
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Query all users
    const result = await client.query('SELECT id, content, platform, user_id FROM posts');
    console.log('Users in database:');
    console.table(result.rows);
    
    // Release the client back to the pool
    client.release();
  } catch (error) {
    console.error('Error querying users:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the query
queryUsers().catch(console.error);