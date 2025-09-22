// Script to set up SQLite database with all required tables
const dotenv = require('dotenv');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Load environment variables
dotenv.config();

async function setupSQLiteDatabase() {
  try {
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`Setting up SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established successfully');
    
    // Create users table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    console.log('Users table created successfully');
    
    // Create posts table with media support
    await db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        scheduledTime TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        media TEXT
      );
    `);
    console.log('Posts table created successfully');
    
    // Create social_accounts table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        accessToken TEXT NOT NULL,
        refreshToken TEXT,
        tokenExpiry TEXT,
        connected BOOLEAN NOT NULL DEFAULT 1,
        connectedAt TEXT NOT NULL,
        profileData TEXT,
        UNIQUE(userId, platform)
      );
    `);
    console.log('Social accounts table created successfully');
    
    // Create notification_preferences table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        emailDigest BOOLEAN NOT NULL DEFAULT 0,
        emailPostPublished BOOLEAN NOT NULL DEFAULT 0,
        emailPostFailed BOOLEAN NOT NULL DEFAULT 0,
        browserNotifications BOOLEAN NOT NULL DEFAULT 1,
        updatedAt TEXT NOT NULL
      );
    `);
    console.log('Notification preferences table created successfully');
    
    // Create a test user if none exists
    const userExists = await db.get('SELECT COUNT(*) as count FROM users');
    if (userExists.count === 0) {
      await db.run(
        `INSERT INTO users (email, name, password, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        'test@example.com', 'Test User', '$2b$10$3JqKK.XyJYjTjkSRsYDesO7u/W8OzYOXOZFEJxf1mJzigQVwQxEFW', // password: password
        new Date().toISOString(), new Date().toISOString()
      );
      console.log('Test user created successfully');
    }
    
    console.log('SQLite database setup completed successfully!');
  } catch (error) {
    console.error('Error setting up SQLite database:', error);
  }
}

setupSQLiteDatabase();