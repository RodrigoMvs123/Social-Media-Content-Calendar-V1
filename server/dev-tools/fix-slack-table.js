const dotenv = require('dotenv');
dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

async function fixSlackTable() {
  console.log(`🔧 Fixing slack_settings table for ${dbType.toUpperCase()}...`);
  
  if (dbType === 'postgres') {
    const { Pool } = require('pg');
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
      const client = await db.connect();
      console.log('✅ PostgreSQL connected');
      
      // Check if table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'slack_settings'
        );
      `);
      
      if (!tableCheck.rows[0].exists) {
        console.log('❌ slack_settings table does not exist, creating...');
        
        // Create the table
        await client.query(`
          CREATE TABLE slack_settings (
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
        console.log('✅ slack_settings table created');
      } else {
        console.log('✅ slack_settings table exists');
        
        // Check columns
        const columns = await client.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'slack_settings'
        `);
        
        const columnNames = columns.rows.map(r => r.column_name);
        console.log('📋 Existing columns:', columnNames);
        
        // Add missing columns if needed
        const requiredColumns = ['slackscheduled', 'slackpublished', 'slackfailed'];
        for (const col of requiredColumns) {
          if (!columnNames.includes(col)) {
            console.log(`➕ Adding missing column: ${col}`);
            await client.query(`ALTER TABLE slack_settings ADD COLUMN ${col} BOOLEAN DEFAULT true`);
          }
        }
      }
      
      // Insert test record for user 1 if not exists
      const userCheck = await client.query('SELECT id FROM slack_settings WHERE userid = $1', [1]);
      if (userCheck.rows.length === 0) {
        console.log('➕ Creating test record for user 1...');
        await client.query(`
          INSERT INTO slack_settings (userid, slackscheduled, slackpublished, slackfailed)
          VALUES ($1, $2, $3, $4)
        `, [1, true, true, true]);
        console.log('✅ Test record created');
      } else {
        console.log('✅ User 1 record exists');
      }
      
      client.release();
      await db.end();
      console.log('🎉 Database setup complete!');
      
    } catch (error) {
      console.error('❌ Database error:', error.message);
    }
  } else {
    console.log('SQLite mode - table should be created automatically');
  }
}

fixSlackTable().catch(console.error);