const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function resetDatabase() {
  try {
    const db = await open({
      filename: './data.sqlite',
      driver: sqlite3.Database
    });

    // Drop existing tables
    await db.exec(`
      DROP TABLE IF EXISTS notification_preferences_new;
      DROP TABLE IF EXISTS notification_preferences;
      DROP TABLE IF EXISTS posts;
      DROP TABLE IF EXISTS social_accounts;
      DROP TABLE IF EXISTS users;
      DROP TABLE IF EXISTS slack_settings;
    `);

    // Create tables with correct schema
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
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        browserNotifications BOOLEAN NOT NULL DEFAULT 1,
        updatedAt TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS slack_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        botToken TEXT,
        channelId TEXT,
        channelName TEXT,
        isActive BOOLEAN NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);

    console.log('✅ Successfully reset database schema');
  } catch (error) {
    console.error('❌ Reset failed:', error);
  }
}

resetDatabase();
