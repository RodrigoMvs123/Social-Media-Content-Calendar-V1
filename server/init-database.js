const dotenv = require('dotenv');
dotenv.config();

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
          media TEXT
        )
      `);
      console.log('✅ Posts table ready');
      
      // Create slack_settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS slack_settings (
          id SERIAL PRIMARY KEY,
          userid INTEGER NOT NULL UNIQUE,
          bottoken TEXT,
          channelid TEXT,
          channelname TEXT,
          isactive BOOLEAN DEFAULT true,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          slackscheduled BOOLEAN DEFAULT true,
          slackpublished BOOLEAN DEFAULT true,
          slackfailed BOOLEAN DEFAULT true
        )
      `);
      console.log('✅ Slack settings table ready');
      
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
    const sqlite3 = require('sqlite3').verbose();
    const dbPath = process.env.DB_PATH || './data.sqlite';
    const db = new sqlite3.Database(dbPath);
    
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);
      
      db.run(`CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER DEFAULT 1,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        scheduledTime DATETIME NOT NULL,
        status TEXT DEFAULT 'scheduled',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        publishedAt DATETIME,
        media TEXT
      )`);
      
      db.run(`CREATE TABLE IF NOT EXISTS slack_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL UNIQUE,
        botToken TEXT,
        channelId TEXT,
        channelName TEXT,
        isActive BOOLEAN DEFAULT 1,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        slackScheduled BOOLEAN DEFAULT 1,
        slackPublished BOOLEAN DEFAULT 1,
        slackFailed BOOLEAN DEFAULT 1
      )`);
      
      console.log('✅ SQLite tables created');
    });
    
    db.close();
    console.log('🎉 SQLite database initialization complete!');
  }
}

if (require.main === module) {
  initializeDatabase().catch(console.error);
}

module.exports = { initializeDatabase };