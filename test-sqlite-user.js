const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcrypt');

async function testSQLiteUser() {
  console.log('🧪 Testing SQLite User Access');
  console.log('=============================');
  
  try {
    // Open SQLite database
    const db = await open({
      filename: './data.sqlite',
      driver: sqlite3.Database
    });
    
    console.log('✅ SQLite database opened');
    
    // Find user
    const user = await db.get('SELECT * FROM users WHERE email = ?', ['rodrigomvsoares@gmail.com']);
    
    if (user) {
      console.log('✅ User found in SQLite!');
      console.log('👤 User ID:', user.id);
      console.log('📧 Email:', user.email);
      console.log('👤 Name:', user.name);
      console.log('🔐 Password Hash:', user.password.substring(0, 20) + '...');
      
      // Test password
      const isValid = await bcrypt.compare('123456789', user.password);
      console.log('🔑 Password valid:', isValid ? '✅ YES' : '❌ NO');
      
    } else {
      console.log('❌ User not found in SQLite');
      
      // List all users
      const allUsers = await db.all('SELECT id, email, name FROM users');
      console.log('📋 All users in SQLite:', allUsers);
    }
    
    await db.close();
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

testSQLiteUser();