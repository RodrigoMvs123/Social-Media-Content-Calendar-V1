// Script to create a test user in SQLite
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function createTestUser() {
  try {
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`Creating test user in SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Create users table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    console.log('Users table ready');
    
    // Check if test user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', 'test@example.com');
    
    if (existingUser) {
      console.log('Test user already exists:', { id: existingUser.id, email: existingUser.email });
      console.log('You can log in with:');
      console.log('Email: test@example.com');
      console.log('Password: password');
      return;
    }
    
    // Create test user
    const hashedPassword = await bcrypt.hash('password', 10);
    const now = new Date().toISOString();
    
    const result = await db.run(
      'INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      ['Test User', 'test@example.com', hashedPassword, now, now]
    );
    
    const newUser = await db.get('SELECT id, name, email FROM users WHERE id = ?', result.lastID);
    
    console.log('Test user created successfully:', newUser);
    console.log('You can log in with:');
    console.log('Email: test@example.com');
    console.log('Password: password');
  } catch (error) {
    console.error('Error creating test user:', error);
  }
}

createTestUser();