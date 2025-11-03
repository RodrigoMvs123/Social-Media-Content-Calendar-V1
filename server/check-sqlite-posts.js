const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

async function checkSqlitePosts() {
  try {
    console.log('🔍 Checking posts in SQLite database...');
    
    const sqliteDb = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    const posts = await sqliteDb.all('SELECT id, platform, content, status, userId FROM posts ORDER BY id');
    
    console.log(`📋 Found ${posts.length} posts in SQLite:`);
    posts.forEach(post => {
      console.log(`- Post ${post.id}: [${post.platform}] "${post.content.substring(0, 40)}..." (User: ${post.userId}, Status: ${post.status})`);
    });
    
    await sqliteDb.close();
    
  } catch (error) {
    console.error('❌ Error checking SQLite:', error.message);
  }
}

checkSqlitePosts();