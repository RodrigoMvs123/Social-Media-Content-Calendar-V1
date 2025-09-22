// Script to transfer posts from one user to another
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function transferPosts() {
  const fromUserId = process.argv[2];
  const toUserId = process.argv[3];
  
  if (!fromUserId || !toUserId) {
    console.log('Usage: node transfer-posts.js [fromUserId] [toUserId]');
    console.log('Example: node transfer-posts.js 1 2');
    return;
  }
  
  try {
    const dbPath = './data.sqlite';
    console.log(`Connecting to SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Check if users exist
    const fromUser = await db.get('SELECT * FROM users WHERE id = ?', fromUserId);
    const toUser = await db.get('SELECT * FROM users WHERE id = ?', toUserId);
    
    if (!fromUser) {
      console.log(`User with ID ${fromUserId} not found`);
      return;
    }
    
    if (!toUser) {
      console.log(`User with ID ${toUserId} not found`);
      return;
    }
    
    console.log(`Transferring posts from ${fromUser.email} to ${toUser.email}`);
    
    // Get posts to transfer
    const postsToTransfer = await db.all('SELECT * FROM posts WHERE userId = ?', fromUserId);
    console.log(`Found ${postsToTransfer.length} posts to transfer`);
    
    if (postsToTransfer.length === 0) {
      console.log('No posts to transfer');
      return;
    }
    
    // Transfer posts
    const result = await db.run('UPDATE posts SET userId = ? WHERE userId = ?', [toUserId, fromUserId]);
    console.log(`Transferred ${result.changes} posts successfully`);
    
    // Verify transfer
    const newPosts = await db.all('SELECT * FROM posts WHERE userId = ?', toUserId);
    console.log(`User ${toUser.email} now has ${newPosts.length} posts`);
    
  } catch (error) {
    console.error('Error transferring posts:', error);
  }
}

transferPosts();