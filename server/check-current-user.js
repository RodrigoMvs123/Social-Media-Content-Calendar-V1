const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

async function checkCurrentUser() {
  try {
    console.log('👤 Checking users in SQLite database...');
    
    const sqliteDb = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    const users = await sqliteDb.all('SELECT id, email, name FROM users ORDER BY id');
    
    console.log(`📋 Found ${users.length} users in SQLite:`);
    users.forEach(user => {
      console.log(`- User ${user.id}: ${user.email} (${user.name})`);
    });
    
    console.log('\n📊 Posts by user:');
    const postsByUser = await sqliteDb.all('SELECT userId, COUNT(*) as count FROM posts GROUP BY userId ORDER BY userId');
    postsByUser.forEach(row => {
      console.log(`- User ${row.userId}: ${row.count} posts`);
    });
    
    await sqliteDb.close();
    
  } catch (error) {
    console.error('❌ Error checking users:', error.message);
  }
}

checkCurrentUser();