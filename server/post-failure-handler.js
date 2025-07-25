const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const { notifyPostFailed } = require('./notification-service');

const dbPath = process.env.DB_PATH || './data.sqlite';
let db;

// Initialize database
(async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  } catch (error) {
    console.error('Error setting up post failure handler DB:', error);
  }
})();

// Mark post as failed and send notifications
async function markPostAsFailed(postId, userId, errorMessage) {
  try {
    // Update post status to failed and add error message
    await db.run(
      'UPDATE posts SET status = ?, errorMessage = ?, updatedAt = ? WHERE id = ? AND userId = ?',
      ['failed', errorMessage, new Date().toISOString(), postId, userId]
    );
    
    // Get the updated post
    const failedPost = await db.get('SELECT * FROM posts WHERE id = ?', [postId]);
    
    if (failedPost) {
      // Parse media if it exists
      if (failedPost.media && typeof failedPost.media === 'string') {
        try {
          failedPost.media = JSON.parse(failedPost.media);
        } catch (e) {
          console.error('Error parsing media JSON:', e);
        }
      }
      
      // Send failure notifications
      await notifyPostFailed(userId, failedPost, errorMessage);
      
      console.log('✅ Post marked as failed and notifications sent:', postId);
    }
    
  } catch (error) {
    console.error('❌ Failed to mark post as failed:', error);
  }
}

module.exports = {
  markPostAsFailed
};