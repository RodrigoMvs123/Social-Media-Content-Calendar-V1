// Simple script to test SQLite database connection
const dotenv = require('dotenv');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Load environment variables
dotenv.config();

async function testSQLiteConnection() {
  try {
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`Testing SQLite connection to: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established successfully');
    
    // Test creating a table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS test_table (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL
      )
    `);
    console.log('Test table created successfully');
    
    // Test inserting data
    const result = await db.run(
      'INSERT INTO test_table (name, created_at) VALUES (?, ?)',
      'Test Entry', new Date().toISOString()
    );
    console.log(`Test data inserted with ID: ${result.lastID}`);
    
    // Test querying data
    const row = await db.get('SELECT * FROM test_table WHERE id = ?', result.lastID);
    console.log('Retrieved test data:', row);
    
    console.log('All SQLite operations completed successfully!');
  } catch (error) {
    console.error('Error testing SQLite connection:', error);
  }
}

testSQLiteConnection();