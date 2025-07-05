const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const auth = require('./middleware/auth');
const { WebClient } = require('@slack/web-api');

// Get database path from environment
const dbPath = process.env.DB_PATH || './data.sqlite';

// Initialize SQLite database connection
let db;

// Function to send Slack notification
async function sendSlackNotification(userId, post) {
  try {
    // Get user's Slack settings
    const slackSettings = await db.get(
      'SELECT * FROM slack_settings WHERE userId = ? AND isActive = 1', 
      userId
    );
    
    if (!slackSettings) {
      console.log('No active Slack settings found for user:', userId);
      return;
    }
    
    const slack = new WebClient(slackSettings.botToken);
    
    // Format the scheduled time
    const scheduledDate = new Date(post.scheduledTime);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Create message using Slack's markdown format
    const message = `📅 *New post scheduled*\n\n` +
      `*Platform:* ${post.platform}\n` +
      `*Scheduled for:* ${formattedDate}\n` +
      `*Content:* ${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}\n` +
      `*Status:* ${post.status}`;
    
    // Send message to Slack - use your direct message channel
    let channelToUse = slackSettings.channelId;
    
    // If using placeholder, use your #social channel
    if (channelToUse === 'DM_PLACEHOLDER') {
      channelToUse = 'C08PUPJ15LJ'; // Your #social channel
      console.log('Using #social channel: C08PUPJ15LJ');
    }
    
    // Send message to Slack
    console.log(`Sending message to channel: ${channelToUse}`);
    await slack.chat.postMessage({
      channel: channelToUse,
      text: message,
      mrkdwn: true
    });
    
    console.log('✅ Slack notification sent for post:', post.id);
  } catch (error) {
    console.error('❌ Slack notification failed:', error.message);
    throw error;
  }
}

(async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established for posts routes');
    
    // Create posts table if it doesn't exist
    await db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        scheduledTime TEXT NOT NULL,
        status TEXT NOT NULL,
        media TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
    console.log('Posts table ready');
  } catch (error) {
    console.error('Error setting up SQLite for posts:', error);
  }
})();

// Get all posts - protected by auth middleware
router.get('/', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const userId = req.user.id;
    const posts = await db.all('SELECT * FROM posts WHERE userId = ? ORDER BY scheduledTime DESC', userId);
    
    // Parse media JSON if it exists
    const formattedPosts = posts.map(post => {
      if (post.media && typeof post.media === 'string') {
        try {
          post.media = JSON.parse(post.media);
        } catch (e) {
          console.error('Error parsing media JSON:', e);
        }
      }
      return post;
    });
    
    res.json(formattedPosts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post - protected by auth middleware
router.post('/', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const { content, platform, scheduledTime, status, media } = req.body;
    const userId = req.user.id;
    const now = new Date().toISOString();
    
    console.log('Creating post:', { content, platform, scheduledTime, status });
    
    // Stringify media if it exists
    const mediaJson = media ? JSON.stringify(media) : null;
    
    const result = await db.run(
      `INSERT INTO posts (userId, platform, content, scheduledTime, status, media, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, platform, content, scheduledTime, status, mediaJson, now, now]
    );
    
    const newPost = await db.get('SELECT * FROM posts WHERE id = ?', result.lastID);
    
    // Parse media JSON if it exists
    if (newPost.media && typeof newPost.media === 'string') {
      try {
        newPost.media = JSON.parse(newPost.media);
      } catch (e) {
        console.error('Error parsing media JSON:', e);
      }
    }
    
    // Send Slack notification if configured
    try {
      await sendSlackNotification(userId, newPost);
    } catch (error) {
      console.error('Failed to send Slack notification:', error);
      // Don't fail the post creation if Slack fails
    }
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get a specific post - protected by auth middleware
router.get('/:id', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const { id } = req.params;
    const userId = req.user.id;
    
    const post = await db.get('SELECT * FROM posts WHERE id = ? AND userId = ?', [id, userId]);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Parse media JSON if it exists
    if (post.media && typeof post.media === 'string') {
      try {
        post.media = JSON.parse(post.media);
      } catch (e) {
        console.error('Error parsing media JSON:', e);
      }
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Update a post - protected by auth middleware
router.put('/:id', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const { id } = req.params;
    const userId = req.user.id;
    const { content, platform, scheduledTime, status, media } = req.body;
    const now = new Date().toISOString();
    
    // Check if post exists and belongs to user
    const existingPost = await db.get('SELECT * FROM posts WHERE id = ? AND userId = ?', [id, userId]);
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Prepare update fields
    const updates = [];
    const values = [];
    
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    
    if (platform !== undefined) {
      updates.push('platform = ?');
      values.push(platform);
    }
    
    if (scheduledTime !== undefined) {
      updates.push('scheduledTime = ?');
      values.push(scheduledTime);
    }
    
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    
    if (media !== undefined) {
      updates.push('media = ?');
      values.push(JSON.stringify(media));
    }
    
    // Always update the updatedAt field
    updates.push('updatedAt = ?');
    values.push(now);
    
    // Add id and userId to values array
    values.push(id);
    values.push(userId);
    
    // Execute update
    await db.run(
      `UPDATE posts SET ${updates.join(', ')} WHERE id = ? AND userId = ?`,
      ...values
    );
    
    // Get updated post
    const updatedPost = await db.get('SELECT * FROM posts WHERE id = ?', id);
    
    // Parse media JSON if it exists
    if (updatedPost.media && typeof updatedPost.media === 'string') {
      try {
        updatedPost.media = JSON.parse(updatedPost.media);
      } catch (e) {
        console.error('Error parsing media JSON:', e);
      }
    }
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post - protected by auth middleware
router.delete('/:id', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if post exists and belongs to user
    const existingPost = await db.get('SELECT * FROM posts WHERE id = ? AND userId = ?', [id, userId]);
    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Delete post
    await db.run('DELETE FROM posts WHERE id = ? AND userId = ?', [id, userId]);
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;