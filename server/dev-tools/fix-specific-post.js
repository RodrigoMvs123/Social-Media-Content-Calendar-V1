
// Script to fix a specific post's date
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function fixSpecificPost() {
  // Get post ID and new date from command line arguments
  const postId = process.argv[2];
  const newDate = process.argv[3];
  
  if (!postId || !newDate) {
    console.log('Usage: node fix-specific-post.js [postId] [newDate]');
    console.log('Example: node fix-specific-post.js 5 "2025-06-18T12:00:00.000Z"');
    return;
  }
  
  try {
    // Validate the new date
    const date = new Date(newDate);
    if (isNaN(date.getTime())) {
      console.log('Error: Invalid date format');
      return;
    }
    
    const dbPath = './data.sqlite';
    console.log(`Connecting to SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Get the post
    const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);
    
    if (!post) {
      console.log(`Post with ID ${postId} not found`);
      return;
    }
    
    console.log('Current post:');
    console.log(`ID: ${post.id}`);
    console.log(`Content: ${post.content}`);
    console.log(`Platform: ${post.platform}`);
    console.log(`Status: ${post.status}`);
    console.log(`Scheduled Time: ${post.scheduledTime}`);
    
    // Update the post date
    await db.run(
      'UPDATE posts SET scheduledTime = ? WHERE id = ?',
      [newDate, postId]
    );
    
    console.log(`Post ${postId} updated with new date: ${newDate}`);
    
    // Get the updated post
    const updatedPost = await db.get('SELECT * FROM posts WHERE id = ?', postId);
    
    console.log('Updated post:');
    console.log(`ID: ${updatedPost.id}`);
    console.log(`Content: ${updatedPost.content}`);
    console.log(`Platform: ${updatedPost.platform}`);
    console.log(`Status: ${updatedPost.status}`);
    console.log(`Scheduled Time: ${updatedPost.scheduledTime}`);
    
  } catch (error) {
    console.error('Error fixing post date:', error);
  }
}

fixSpecificPost();
