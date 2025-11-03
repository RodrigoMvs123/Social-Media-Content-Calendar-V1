const bcrypt = require('bcrypt');

async function testDirectAuth() {
  console.log('🧪 Testing Direct Database Access');
  console.log('=================================');
  
  const email = 'rodrigomvsoares@gmail.com';
  const password = '123456789';
  
  try {
    // Test SQLite directly
    console.log('\n📋 Testing SQLite access...');
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    const db = await open({
      filename: './data.sqlite',
      driver: sqlite3.Database
    });
    
    const sqliteUser = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    await db.close();
    
    if (sqliteUser) {
      console.log('✅ User found in SQLite!');
      console.log('👤 User:', { id: sqliteUser.id, email: sqliteUser.email, name: sqliteUser.name });
      
      const isValid = await bcrypt.compare(password, sqliteUser.password);
      console.log('🔑 Password valid:', isValid ? '✅ YES' : '❌ NO');
    } else {
      console.log('❌ User not found in SQLite');
      
      // List all SQLite users
      const db2 = await open({
        filename: './data.sqlite',
        driver: sqlite3.Database
      });
      const allUsers = await db2.all('SELECT id, email, name FROM users');
      console.log('📋 All SQLite users:', allUsers);
      await db2.close();
    }
    
    // Test PostgreSQL directly (if configured)
    console.log('\n📋 Testing PostgreSQL access...');
    if (process.env.DATABASE_URL) {
      const { Pool } = require('pg');
      
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const pgUser = result.rows[0];
        
        if (pgUser) {
          console.log('✅ User found in PostgreSQL!');
          console.log('👤 User:', { id: pgUser.id, email: pgUser.email, name: pgUser.name });
          
          const isValid = await bcrypt.compare(password, pgUser.password);
          console.log('🔑 Password valid:', isValid ? '✅ YES' : '❌ NO');
        } else {
          console.log('❌ User not found in PostgreSQL');
        }
        
        await pool.end();
      } catch (pgError) {
        console.log('⚠️ PostgreSQL connection failed:', pgError.message);
      }
    } else {
      console.log('⚠️ No PostgreSQL URL configured');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testDirectAuth();