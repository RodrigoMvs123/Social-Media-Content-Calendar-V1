const dotenv = require('dotenv');
dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

async function checkDatabase() {
  console.log(`🔍 Checking ${dbType.toUpperCase()} database...`);
  
  if (dbType === 'postgres') {
    const { Pool } = require('pg');
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
      // Test connection
      const client = await db.connect();
      console.log('✅ PostgreSQL connection successful');
      
      // Check tables
      const tables = ['users', 'posts', 'slack_settings'];
      
      for (const table of tables) {
        try {
          const result = await client.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.tables 
              WHERE table_name = $1
            );
          `, [table]);
          
          if (result.rows[0].exists) {
            console.log(`✅ Table '${table}' exists`);
            
            // Get row count
            const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
            console.log(`   - Rows: ${countResult.rows[0].count}`);
            
            // Show table structure
            const structResult = await client.query(`
              SELECT column_name, data_type, is_nullable 
              FROM information_schema.columns 
              WHERE table_name = $1 
              ORDER BY ordinal_position
            `, [table]);
            
            console.log(`   - Columns:`, structResult.rows.map(r => `${r.column_name}(${r.data_type})`).join(', '));
          } else {
            console.log(`❌ Table '${table}' does NOT exist`);
          }
        } catch (err) {
          console.log(`❌ Error checking table '${table}':`, err.message);
        }
      }
      
      client.release();
      await db.end();
      
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
    }
  } else {
    console.log('SQLite mode - checking local database file...');
    const fs = require('fs');
    const dbPath = process.env.DB_PATH || './data.sqlite';
    
    if (fs.existsSync(dbPath)) {
      console.log(`✅ SQLite file exists: ${dbPath}`);
      const stats = fs.statSync(dbPath);
      console.log(`   - Size: ${stats.size} bytes`);
    } else {
      console.log(`❌ SQLite file does NOT exist: ${dbPath}`);
    }
  }
}

checkDatabase().catch(console.error);