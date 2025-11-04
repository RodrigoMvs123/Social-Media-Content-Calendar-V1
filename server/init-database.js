console.log('### init-database.js started ###');
const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');

const dbType = process.env.DB_TYPE || 'sqlite';

async function initializeDatabase() {
  console.log(`🚀 Initializing ${dbType.toUpperCase()} database...`);
  
  if (dbType === 'postgres') {
    const { Pool } = require('pg');
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
      const client = await db.connect();
      console.log('✅ PostgreSQL connected');
      
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table ready');
      
      // Create posts table
      await client.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          userid INTEGER DEFAULT 1,
          platform VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          scheduledtime TIMESTAMP NOT NULL,
          status VARCHAR(20) DEFAULT 'scheduled',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          publishedat TIMESTAMP,
          media TEXT,
          slackmessagets TEXT
        )
      `);
      
      // Add slackmessagets column if it doesn't exist
      try {
        await client.query(`
          ALTER TABLE posts ADD COLUMN IF NOT EXISTS slackmessagets TEXT
        `);
        console.log('✅ Posts table updated with slackmessagets column');
      } catch (alterError) {
        console.log('ℹ️ slackmessagets column already exists or alter failed:', alterError.message);
      }
      
      console.log('✅ Posts table ready');
      
      // Create slack_settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS slack_settings (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE,
          bot_token TEXT,
          channel_id TEXT,
          channel_name TEXT,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          slack_scheduled BOOLEAN DEFAULT true,
          slack_published BOOLEAN DEFAULT true,
          slack_failed BOOLEAN DEFAULT true
        )
      `);
      console.log('✅ Slack settings table ready');
      
      // Create notification_preferences table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL UNIQUE,
          email_digest BOOLEAN DEFAULT false,
          email_post_published BOOLEAN DEFAULT false,
          email_post_failed BOOLEAN DEFAULT false,
          browser_notifications BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Notification preferences table ready');
      
      // Insert default user if not exists
      const userCheck = await client.query('SELECT id FROM users WHERE email = $1', ['demo@example.com']);
      if (userCheck.rows.length === 0) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('demo123', 10);
        await client.query(
          'INSERT INTO users (name, email, password) VALUES ($1, $2, $3)',
          ['Demo User', 'demo@example.com', hashedPassword]
        );
        console.log('✅ Default user created');
      } else {
        console.log('✅ Default user exists');
      }
      
      client.release();
      await db.end();
      console.log('🎉 Database initialization complete!');
      
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      process.exit(1);
    }
  } else {
    // SQLite initialization
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`🔍 SQLite DB Path: ${dbPath}`);
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });

    try {
      // Create tables with proper schema
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          password TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          platform TEXT NOT NULL,
          content TEXT NOT NULL,
          scheduledTime TEXT NOT NULL,
          status TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          media TEXT,
          slackMessageTs TEXT
        );
        
        CREATE TABLE IF NOT EXISTS notification_preferences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL UNIQUE,
          emailDigest BOOLEAN DEFAULT 0,
          emailPostPublished BOOLEAN DEFAULT 0,
          emailPostFailed BOOLEAN DEFAULT 0,
          browserNotifications BOOLEAN DEFAULT 1,
          updatedAt TEXT NOT NULL
        );
        
        CREATE TABLE IF NOT EXISTS slack_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL UNIQUE,
          botToken TEXT,
          channelId TEXT,
          channelName TEXT,
          isActive BOOLEAN DEFAULT 1,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          slackScheduled BOOLEAN DEFAULT 1,
          slackPublished BOOLEAN DEFAULT 1,
          slackFailed BOOLEAN DEFAULT 1
        );
      `);
      
      // Add missing columns to existing tables
      try {
        await db.exec(`ALTER TABLE users ADD COLUMN updatedAt TEXT;`);
        console.log('✅ Added updatedAt column to users table');
      } catch (e) {
        console.log('ℹ️ updatedAt column already exists in users table');
      }
      
      try {
        await db.exec(`ALTER TABLE slack_settings ADD COLUMN slackScheduled BOOLEAN DEFAULT 1;`);
        await db.exec(`ALTER TABLE slack_settings ADD COLUMN slackPublished BOOLEAN DEFAULT 1;`);
        await db.exec(`ALTER TABLE slack_settings ADD COLUMN slackFailed BOOLEAN DEFAULT 1;`);
        console.log('✅ Added Slack notification columns');
      } catch (e) {
        console.log('ℹ️ Slack notification columns already exist');
      }
      console.log('✅ SQLite tables created');

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log(`✅ SQLite DB file exists at ${dbPath}, size: ${stats.size} bytes`);
      } else {
        console.log(`❌ SQLite DB file DOES NOT exist at ${dbPath}`);
      }

      // Insert default user if not exists
      const userCheck = await db.get('SELECT id FROM users WHERE email = ?', ['demo@example.com']);
      if (!userCheck) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('demo123', 10);
        const now = new Date().toISOString();
        await db.run(
          'INSERT INTO users (email, name, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
          ['demo@example.com', 'Demo User', hashedPassword, now, now]
        );
        console.log('✅ Default user created');
      } else {
        console.log('✅ Default user exists');
      }
      
      await db.close();
      console.log('🎉 SQLite database initialization complete!');
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };