const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function debugPostsAPI() {
  try {
    console.log('🔍 Debugging Posts API...');
    
    // Check SQLite database
    const sqliteDb = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    // Check User 2's posts
    const posts = await sqliteDb.all('SELECT * FROM posts WHERE userId = "2" ORDER BY id');
    console.log(`📋 Found ${posts.length} posts for User 2 in SQLite:`);
    
    posts.forEach(post => {
      console.log(`- Post ${post.id}: [${post.platform}] "${post.content.substring(0, 40)}..." (Status: ${post.status})`);
    });
    
    // Test JWT token generation for User 2
    const testToken = jwt.sign(
      { userId: 2, id: 2, email: 'rodrigomvsoares@gmail.com' },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    console.log('\n🔑 Test JWT Token for User 2:');
    console.log(testToken.substring(0, 50) + '...');
    
    // Verify token
    try {
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'fallback-secret');
      console.log('✅ Token verification successful:', { userId: decoded.userId, id: decoded.id });
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
    }
    
    await sqliteDb.close();
    
    console.log('\n💡 To test in browser:');
    console.log('1. Open browser console');
    console.log('2. Set token: localStorage.setItem("auth_token", "' + testToken + '")');
    console.log('3. Refresh the calendar page');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugPostsAPI();