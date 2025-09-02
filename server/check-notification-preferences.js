const dotenv = require('dotenv');
dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

async function checkNotificationPreferences() {
  console.log(`🔍 Checking notification preferences in ${dbType.toUpperCase()}...`);
  
  if (dbType === 'postgres') {
    const { Pool } = require('pg');
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
      const client = await db.connect();
      console.log('✅ PostgreSQL connected');
      
      // Check if slack_settings table exists and its structure
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'slack_settings'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('✅ slack_settings table exists');
        
        // Show table structure
        const structResult = await client.query(`
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns 
          WHERE table_name = 'slack_settings' 
          ORDER BY ordinal_position
        `);
        
        console.log('📋 Table structure:');
        structResult.rows.forEach(col => {
          console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
        });
        
        // Check current data
        const dataResult = await client.query('SELECT * FROM slack_settings');
        console.log(`📊 Current records: ${dataResult.rows.length}`);
        
        if (dataResult.rows.length > 0) {
          console.log('📄 Sample record:');
          const sample = dataResult.rows[0];
          Object.keys(sample).forEach(key => {
            console.log(`   - ${key}: ${sample[key]}`);
          });
        }
        
        // Check specifically for notification preference columns
        const notifCols = ['slackscheduled', 'slackpublished', 'slackfailed'];
        const existingCols = structResult.rows.map(r => r.column_name);
        
        console.log('🔔 Notification preference columns:');
        notifCols.forEach(col => {
          const exists = existingCols.includes(col);
          console.log(`   - ${col}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
        });
        
      } else {
        console.log('❌ slack_settings table does NOT exist');
      }
      
      client.release();
      await db.end();
      
    } catch (error) {
      console.error('❌ Database error:', error.message);
    }
  } else {
    console.log('SQLite mode - checking local database...');
    const fs = require('fs');
    const dbPath = process.env.DB_PATH || './data.sqlite';
    
    if (fs.existsSync(dbPath)) {
      console.log(`✅ SQLite file exists: ${dbPath}`);
      
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      try {
        const db = await open({
          filename: dbPath,
          driver: sqlite3.Database
        });
        
        // Check if slack_settings table exists
        const tableInfo = await db.all("SELECT name FROM sqlite_master WHERE type='table' AND name='slack_settings'");
        
        if (tableInfo.length > 0) {
          console.log('✅ slack_settings table exists');
          
          // Show table structure
          const pragma = await db.all("PRAGMA table_info(slack_settings)");
          console.log('📋 Table structure:');
          pragma.forEach(col => {
            console.log(`   - ${col.name}: ${col.type} (nullable: ${col.notnull === 0}, default: ${col.dflt_value})`);
          });
          
          // Check current data
          const data = await db.all('SELECT * FROM slack_settings');
          console.log(`📊 Current records: ${data.length}`);
          
          if (data.length > 0) {
            console.log('📄 Sample record:');
            const sample = data[0];
            Object.keys(sample).forEach(key => {
              console.log(`   - ${key}: ${sample[key]}`);
            });
          }
          
        } else {
          console.log('❌ slack_settings table does NOT exist');
        }
        
        await db.close();
        
      } catch (error) {
        console.error('❌ SQLite error:', error.message);
      }
    } else {
      console.log(`❌ SQLite file does NOT exist: ${dbPath}`);
    }
  }
}

checkNotificationPreferences().catch(console.error);