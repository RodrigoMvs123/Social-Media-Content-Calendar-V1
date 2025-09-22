// Script to check posts for different users
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function checkUserPosts() {
  try {
    const dbPath = './data.sqlite';
    console.log(`Connecting to SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Get all users
    const users = await db.all('SELECT * FROM users');
    console.log('\n=== Users in database ===');
    users.forEach(user => {
      console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);
    });
    
    // Get all posts
    const posts = await db.all('SELECT * FROM posts ORDER BY userId, scheduledTime');
    console.log(`\n=== Posts in database (${posts.length} total) ===`);
    
    // Group posts by user
    const postsByUser = {};
    posts.forEach(post => {
      if (!postsByUser[post.userId]) {
        postsByUser[post.userId] = [];
      }
      postsByUser[post.userId].push(post);
    });
    
    // Display posts by user
    Object.keys(postsByUser).forEach(userId => {
      const user = users.find(u => u.id == userId);
      console.log(`\nUser ${userId} (${user ? user.email : 'Unknown'}): ${postsByUser[userId].length} posts`);
      
      postsByUser[userId].forEach(post => {
        console.log(`  - ID: ${post.id}, Content: "${post.content.substring(0, 30)}...", Date: ${post.scheduledTime}`);
      });
    });
    
    console.log('\n=== Solution ===');
    console.log('Option 1: Transfer posts from user 1 to user 2:');
    console.log('  node transfer-posts.js 1 2');
    console.log('Option 2: Log in as the original user (test@example.com)');
    
  } catch (error) {
    console.error('Error checking user posts:', error);
  }
}

checkUserPosts();