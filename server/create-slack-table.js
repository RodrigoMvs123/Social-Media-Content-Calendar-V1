const dotenv = require('dotenv');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

dotenv.config();

async function createSlackTable() {
  try {
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`Adding Slack settings table to: ${dbPath}`);
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Create slack_settings table
    await db.exec(`
      CREATE TABLE IF NOT EXISTS slack_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        botToken TEXT NOT NULL,
        channelId TEXT NOT NULL,
        channelName TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    
    console.log('Slack settings table created successfully');
    await db.close();
  } catch (error) {
    console.error('Error creating Slack table:', error);
  }
}

createSlackTable();