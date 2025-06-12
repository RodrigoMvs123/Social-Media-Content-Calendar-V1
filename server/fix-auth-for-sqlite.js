// Script to create a test user and fix authentication for SQLite
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function fixAuthForSQLite() {
  try {
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`Setting up authentication for SQLite at: ${dbPath}`);
    
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
    
    // Create test user if none exists
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        ['Test User', 'test@example.com', hashedPassword, now, now]
      );
      console.log('Created default test user: test@example.com / password');
    } else {
      console.log('Users already exist in the database');
    }
    
    // Generate a JWT token for the test user
    const testUser = await db.get('SELECT id, name, email FROM users WHERE email = ?', 'test@example.com');
    if (testUser) {
      const JWT_SECRET = process.env.JWT_SECRET || '9d16c4f7cdddbbc7c9b3d204b3ef540abc47a5d36a6c93502fba3cd9f1815cce';
      const token = jwt.sign(
        { id: testUser.id, email: testUser.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );
      
      console.log('\n=== Authentication Information ===');
      console.log('Test user created successfully:', testUser);
      console.log('\nJWT Token (for manual testing):');
      console.log(token);
      console.log('\nTo use this token in your browser:');
      console.log('1. Open browser developer tools (F12)');
      console.log('2. Go to Console tab');
      console.log('3. Run this command:');
      console.log(`   localStorage.setItem('token', '${token}')`);
      console.log('4. Refresh the page');
    }
    
    console.log('\nSQLite authentication setup completed');
  } catch (error) {
    console.error('Error setting up authentication:', error);
  }
}

fixAuthForSQLite();