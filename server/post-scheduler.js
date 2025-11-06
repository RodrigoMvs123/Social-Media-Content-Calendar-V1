const { notifyPostPublished, notifyPostFailed } = require('./notification-service');

// Database setup - hybrid approach (match main server logic)
let dbType = process.env.DB_TYPE;
if (!dbType) {
  dbType = process.env.DATABASE_URL ? 'postgres' : 'sqlite';
}
if (process.env.NODE_ENV === 'production' && !dbType.includes('postgres')) {
  console.log('🔧 SCHEDULER: FORCING PostgreSQL in production');
  dbType = 'postgres';
}
let db;

// Initialize database
async function initializeDb() {
  try {
    if (dbType === 'sqlite') {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      // Ensure posts table exists
      await db.exec(`
        CREATE TABLE IF NOT EXISTS posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          platform TEXT NOT NULL,
          content TEXT NOT NULL,
          scheduledTime TEXT NOT NULL,
          status TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL,
          media TEXT,
          slackMessageTs TEXT
        )
      `);
      
      console.log('✅ Post scheduler connected to SQLite');
    } else {
      const { Pool } = require('pg');
      db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      // Ensure posts table exists
      await db.query(`
        CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          userid INTEGER DEFAULT 1,
          platform VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          scheduledtime TIMESTAMP NOT NULL,
          status VARCHAR(20) DEFAULT 'scheduled',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          publishedat TIMESTAMP,
          media TEXT,
          slackmessagets TEXT
        )
      `);
      
      console.log('✅ Post scheduler connected to PostgreSQL');
    }
    return db;
  } catch (error) {
    console.error('Error setting up post scheduler DB:', error);
    throw error;
  }
}

// Track the last time we logged a check with no posts
let lastNoPostsLog = 0;
const NO_POSTS_LOG_INTERVAL = 5 * 60 * 1000; // Log every 5 minutes if no posts

// Check and publish posts that are ready
async function checkAndPublishPosts() {
  try {
    const now = new Date().toISOString();
    let postsToPublish = [];
    
    if (dbType === 'sqlite') {
      postsToPublish = await db.all(`
        SELECT * FROM posts 
        WHERE scheduledTime <= ? 
        AND (status = 'scheduled' OR status = 'ready') 
        AND status != 'published' 
        AND status != 'failed'
      `, [now]);
    } else {
      const result = await db.query(`
        SELECT * FROM posts 
        WHERE scheduledtime <= $1 
        AND (status = 'scheduled' OR status = 'ready') 
        AND status != 'published' 
        AND status != 'failed'
      `, [now]);
      
      // Map PostgreSQL columns to camelCase
      postsToPublish = result.rows.map(row => ({
        id: row.id,
        userId: row.userid,
        platform: row.platform,
        content: row.content,
        scheduledTime: row.scheduledtime,
        status: row.status,
        media: row.media,
        createdAt: row.createdat,
        updatedAt: row.updatedat
      }));
    }
    
    if (postsToPublish.length > 0) {
      console.log(`📅 Found ${postsToPublish.length} post(s) to publish`);
      
      for (const post of postsToPublish) {
        await publishPost(post);
      }
    } else {
      const currentTime = Date.now();
      if (currentTime - lastNoPostsLog >= NO_POSTS_LOG_INTERVAL) {
        console.log('🔍 No posts ready to publish');
        lastNoPostsLog = currentTime;
      }
    }
    
  } catch (error) {
    console.error('❌ Error in post scheduler:', error);
  }
}

// Publish a single post
async function publishPost(post) {
  try {
    console.log(`🚀 Publishing post ${post.id} for ${post.platform}`);
    
    // Parse media if it exists
    if (post.media && typeof post.media === 'string') {
      try {
        post.media = JSON.parse(post.media);
      } catch (e) {
        console.error('Error parsing media JSON:', e);
      }
    }
    
    // Simulate publishing to social media platform
    // In real implementation, this would call actual social media APIs
    const success = await simulatePublishToSocialMedia(post);
    
    const now = new Date().toISOString();
    
    if (success) {
      // Update post status to published
      if (dbType === 'sqlite') {
        await db.run(
          'UPDATE posts SET status = ?, updatedAt = ? WHERE id = ?',
          ['published', now, post.id]
        );
      } else {
        await db.query(
          'UPDATE posts SET status = $1, updatedat = $2 WHERE id = $3',
          ['published', now, post.id]
        );
      }
      
      // Send success notifications
      await notifyPostPublished(post.userId, post);
      
      console.log(`✅ Post ${post.id} published successfully`);
    } else {
      // Mark as failed
      if (dbType === 'sqlite') {
        await db.run(
          'UPDATE posts SET status = ?, updatedAt = ? WHERE id = ?',
          ['failed', now, post.id]
        );
      } else {
        await db.query(
          'UPDATE posts SET status = $1, updatedat = $2 WHERE id = $3',
          ['failed', now, post.id]
        );
      }
      
      // Send failure notifications
      await notifyPostFailed(post.userId, post, 'Failed to publish to social media platform');
      
      console.log(`❌ Post ${post.id} failed to publish`);
    }
    
  } catch (error) {
    console.error(`❌ Error publishing post ${post.id}:`, error);
    
    // Mark as failed
    const now = new Date().toISOString();
    if (dbType === 'sqlite') {
      await db.run(
        'UPDATE posts SET status = ?, updatedAt = ? WHERE id = ?',
        ['failed', now, post.id]
      );
    } else {
      await db.query(
        'UPDATE posts SET status = $1, updatedat = $2 WHERE id = $3',
        ['failed', now, post.id]
      );
    }
    
    // Send failure notifications
    await notifyPostFailed(post.userId, post, error.message);
  }
}

// Simulate publishing to social media (replace with real API calls)
async function simulatePublishToSocialMedia(post) {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Simulate 95% success rate (5% failure for testing)
  return Math.random() > 0.05;
}

let isChecking = false;
let schedulerStartTime = 0;

// Start the scheduler (runs every minute)
async function startPostScheduler() {
  try {
    await initializeDb();
    schedulerStartTime = Date.now();
    console.log('📅 Post scheduler initialized successfully');
    
    // Run immediately but don't await
    runSchedulerCheck();
    
    // Then run every minute
    setInterval(runSchedulerCheck, 60 * 1000); // 60 seconds
  } catch (error) {
    console.error('❌ Failed to start post scheduler:', error);
  }
}

async function runSchedulerCheck() {
  // Prevent multiple simultaneous checks
  if (isChecking) {
    return;
  }
  
  try {
    isChecking = true;
    await checkAndPublishPosts();
  } catch (error) {
    console.error('❌ Error checking posts:', error);
  } finally {
    isChecking = false;
  }
}

module.exports = {
  startPostScheduler,
  checkAndPublishPosts
};