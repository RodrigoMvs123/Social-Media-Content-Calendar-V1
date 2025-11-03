const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

async function checkUser2Posts() {
  try {
    console.log('🔍 Checking posts for User 2 (rodrigomvsoares@gmail.com) in SQLite...');
    
    const sqliteDb = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    const posts = await sqliteDb.all('SELECT * FROM posts WHERE userId = "2" ORDER BY id');
    
    console.log(`📋 Found ${posts.length} posts for User 2:`);
    posts.forEach(post => {
      console.log(`- Post ${post.id}: [${post.platform}] "${post.content}" (Status: ${post.status}, Created: ${post.createdAt})`);
    });
    
    await sqliteDb.close();
    
  } catch (error) {
    console.error('❌ Error checking User 2 posts:', error.message);
  }
}

checkUser2Posts();