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
    const { SQLiteAdapter } = require('./sqlite-db');
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`🔍 SQLite DB Path: ${dbPath}`);
    const sqliteAdapter = new SQLiteAdapter(dbPath);

    try {
      await sqliteAdapter.initialize();
      console.log('✅ SQLite tables created');

      if (fs.existsSync(dbPath)) {
        const stats = fs.statSync(dbPath);
        console.log(`✅ SQLite DB file exists at ${dbPath}, size: ${stats.size} bytes`);
      } else {
        console.log(`❌ SQLite DB file DOES NOT exist at ${dbPath}`);
      }

      // Insert default user if not exists
      const userCheck = await sqliteAdapter.users.findByEmail('demo@example.com');
      if (!userCheck) {
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash('demo123', 10);
        await sqliteAdapter.users.create({
          email: 'demo@example.com',
          name: 'Demo User',
          password: hashedPassword,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Default user created');
      } else {
        console.log('✅ Default user exists');
      }
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