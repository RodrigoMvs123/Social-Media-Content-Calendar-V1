const { Pool } = require('pg');
require('dotenv').config();

async function setupDatabase() {
  // In production on Render, always use PostgreSQL
  const dbType = process.env.NODE_ENV === 'production' ? 'postgres' : (process.env.DB_TYPE || 'sqlite');
  
  if (dbType === 'sqlite') {
    console.log('Using SQLite - no setup needed');
    return;
  }
  
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found - skipping database setup');
    return;
  }
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  try {
    console.log('Setting up PostgreSQL database...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        userId INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        platform VARCHAR(50) NOT NULL,
        scheduledTime TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        media JSONB,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        publishedAt TIMESTAMP,
        externalId VARCHAR(255),
        errorMessage TEXT
      )
    `);
    
    // Create social_accounts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id SERIAL PRIMARY KEY,
        userId INTEGER REFERENCES users(id),
        platform VARCHAR(50) NOT NULL,
        username VARCHAR(255),
        accessToken TEXT,
        refreshToken TEXT,
        connected BOOLEAN DEFAULT false,
        connectedAt TIMESTAMP,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId, platform)
      )
    `);
    
    // Create slack_settings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slack_settings (
        id SERIAL PRIMARY KEY,
        userId INTEGER REFERENCES users(id),
        botToken VARCHAR(255),
        channelId VARCHAR(255),
        webhookUrl VARCHAR(255),
        slackScheduled BOOLEAN DEFAULT true,
        slackPublished BOOLEAN DEFAULT true,
        slackFailed BOOLEAN DEFAULT true,
        configured BOOLEAN DEFAULT false,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(userId)
      )
    `);
    
    // Create slack_message_timestamps table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS slack_message_timestamps (
        id SERIAL PRIMARY KEY,
        postId INTEGER REFERENCES posts(id),
        slackTimestamp VARCHAR(255) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(postId)
      )
    `);
    
    console.log('✅ Database setup completed successfully');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();