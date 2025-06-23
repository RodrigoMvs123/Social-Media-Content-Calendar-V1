// Script to analyze and fix post dates
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fixPostDates() {
  try {
    const dbPath = './data.sqlite';
    console.log(`Connecting to SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Get all posts
    const posts = await db.all('SELECT * FROM posts ORDER BY scheduledTime');
    console.log(`Found ${posts.length} posts in the database`);
    
    // Analyze each post's date
    for (const post of posts) {
      console.log(`\nPost ID: ${post.id}`);
      console.log(`Content: ${post.content}`);
      console.log(`Platform: ${post.platform}`);
      console.log(`Status: ${post.status}`);
      console.log(`Scheduled Time: ${post.scheduledTime}`);
      
      try {
        // Parse the date to check if it's valid
        const date = new Date(post.scheduledTime);
        console.log(`Parsed date: ${date.toISOString()}`);
        
        // Check if the date is valid
        if (isNaN(date.getTime())) {
          console.log(`ERROR: Invalid date format for post ID ${post.id}`);
        }
      } catch (error) {
        console.log(`ERROR: Could not parse date for post ID ${post.id}: ${error.message}`);
      }
    }
    
    // Ask if user wants to fix any posts
    console.log('\n=== Fix Post Dates ===');
    console.log('To fix a post date, run this command:');
    console.log('node fix-specific-post.js [postId] [newDate]');
    console.log('Example: node fix-specific-post.js 5 "2025-06-18T12:00:00.000Z"');
    
    // Create the fix-specific-post.js script
    const fixScript = `
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
    console.log(\`Connecting to SQLite database at: \${dbPath}\`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Get the post
    const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);
    
    if (!post) {
      console.log(\`Post with ID \${postId} not found\`);
      return;
    }
    
    console.log('Current post:');
    console.log(\`ID: \${post.id}\`);
    console.log(\`Content: \${post.content}\`);
    console.log(\`Platform: \${post.platform}\`);
    console.log(\`Status: \${post.status}\`);
    console.log(\`Scheduled Time: \${post.scheduledTime}\`);
    
    // Update the post date
    await db.run(
      'UPDATE posts SET scheduledTime = ? WHERE id = ?',
      [newDate, postId]
    );
    
    console.log(\`Post \${postId} updated with new date: \${newDate}\`);
    
    // Get the updated post
    const updatedPost = await db.get('SELECT * FROM posts WHERE id = ?', postId);
    
    console.log('Updated post:');
    console.log(\`ID: \${updatedPost.id}\`);
    console.log(\`Content: \${updatedPost.content}\`);
    console.log(\`Platform: \${updatedPost.platform}\`);
    console.log(\`Status: \${updatedPost.status}\`);
    console.log(\`Scheduled Time: \${updatedPost.scheduledTime}\`);
    
  } catch (error) {
    console.error('Error fixing post date:', error);
  }
}

fixSpecificPost();
`;
    
    // Write the fix script to a file
    const fs = require('fs');
    fs.writeFileSync('fix-specific-post.js', fixScript);
    console.log('\nCreated fix-specific-post.js script');
    
  } catch (error) {
    console.error('Error analyzing post dates:', error);
  }
}

fixPostDates();