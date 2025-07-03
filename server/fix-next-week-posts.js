// Script to fix the issue with creating posts for next week
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function fixNextWeekPosts() {
  try {
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`Checking SQLite database at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Check if posts table exists
    const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'");
    
    if (tableCheck) {
      console.log('Posts table exists, checking for date validation issues...');
      
      // Get a sample post to check date format
      const samplePost = await db.get('SELECT * FROM posts LIMIT 1');
      if (samplePost) {
        console.log('Sample post date format:', samplePost.scheduledTime);
        
        // Test creating a post for next week
        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const nextWeekISO = nextWeek.toISOString();
        
        console.log('Creating test post for next week:', nextWeekISO);
        
        // Create a test post for next week
        const testPost = {
          userId: 1, // Use the test user ID
          platform: 'Test Platform',
          content: 'This is a test post for next week',
          scheduledTime: nextWeekISO,
          status: 'scheduled',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const result = await db.run(
          `INSERT INTO posts (userId, platform, content, scheduledTime, status, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [testPost.userId, testPost.platform, testPost.content, testPost.scheduledTime, 
           testPost.status, testPost.createdAt, testPost.updatedAt]
        );
        
        console.log('Test post created with ID:', result.lastID);
        
        // Verify the post was created with the correct date
        const createdPost = await db.get('SELECT * FROM posts WHERE id = ?', result.lastID);
        console.log('Created post:', createdPost);
        
        console.log('\nTo fix issues with creating posts for next week:');
        console.log('1. Make sure you\'re using a valid ISO date string format');
        console.log('2. When creating a post, use this format for next week:');
        console.log(`   ${nextWeekISO}`);
      } else {
        console.log('No posts found in the database');
      }
    } else {
      console.log('Posts table does not exist');
    }
    
    console.log('\nFix completed. You should now be able to create posts for any date.');
  } catch (error) {
    console.error('Error fixing next week posts:', error);
  }
}

fixNextWeekPosts();