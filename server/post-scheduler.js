const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { notifyPostPublished, notifyPostFailed } = require('./notification-service');

const dbPath = process.env.DB_PATH || './data.sqlite';
let db;

// Initialize database
async function initializeDb() {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
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
    
    // Get posts that should be published now
    const postsToPublish = await db.all(`
      SELECT * FROM posts 
      WHERE scheduledTime <= ? 
      AND (status = 'scheduled' OR status = 'ready') 
      AND status != 'published' 
      AND status != 'failed'
    `, [now]);
    
    // Only log if we found posts or if it's been a while since our last "no posts" message
    if (postsToPublish.length > 0) {
      console.log(`📅 Found ${postsToPublish.length} post(s) to publish`);
      
      for (const post of postsToPublish) {
        await publishPost(post);
      }
    } else {
      const currentTime = Date.now();
      if (currentTime - lastNoPostsLog >= NO_POSTS_LOG_INTERVAL) {
        console.log('📅 No posts scheduled for publishing at this time');
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
    
    if (success) {
      // Update post status to published
      await db.run(
        'UPDATE posts SET status = ?, updatedAt = ? WHERE id = ?',
        ['published', new Date().toISOString(), post.id]
      );
      
      // Send success notifications
      await notifyPostPublished(post.userId, post);
      
      console.log(`✅ Post ${post.id} published successfully`);
    } else {
      // Mark as failed
      await db.run(
        'UPDATE posts SET status = ?, errorMessage = ?, updatedAt = ? WHERE id = ?',
        ['failed', 'Failed to publish to social media platform', new Date().toISOString(), post.id]
      );
      
      // Send failure notifications
      await notifyPostFailed(post.userId, post, 'Failed to publish to social media platform');
      
      console.log(`❌ Post ${post.id} failed to publish`);
    }
    
  } catch (error) {
    console.error(`❌ Error publishing post ${post.id}:`, error);
    
    // Mark as failed
    await db.run(
      'UPDATE posts SET status = ?, errorMessage = ?, updatedAt = ? WHERE id = ?',
      ['failed', error.message, new Date().toISOString(), post.id]
    );
    
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