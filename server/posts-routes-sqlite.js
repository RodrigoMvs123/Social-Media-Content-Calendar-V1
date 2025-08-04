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

// Function to delete Slack notification
async function deleteSlackNotification(userId, post) {
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
    
    // Determine channel
    let channelToUse = slackSettings.channelId;
    if (channelToUse === 'DM_PLACEHOLDER') {
      channelToUse = 'C08PUPJ15LJ'; // Your #social channel
    }
    
    // Delete scheduled message if exists
    if (post.slackScheduledTs) {
      try {
        await slack.chat.delete({
          channel: channelToUse,
          ts: post.slackScheduledTs
        });
        console.log('✅ Slack scheduled message deleted:', post.slackScheduledTs);
      } catch (error) {
        console.log('⚠️ Failed to delete scheduled message (may already be gone):', error.message);
      }
    }
    
    // Delete published message if exists
    if (post.slackMessageTs) {
      try {
        await slack.chat.delete({
          channel: channelToUse,
          ts: post.slackMessageTs
        });
        console.log('✅ Slack published message deleted:', post.slackMessageTs);
      } catch (error) {
        console.log('⚠️ Failed to delete published message (may not exist):', error.message);
      }
    }
    
    if (!post.slackScheduledTs && !post.slackMessageTs) {
      console.log('No Slack message timestamps found for post:', post.id);
    }
    
  } catch (error) {
    console.error('❌ Failed to delete Slack messages:', error.message);
    // Don't throw error - post deletion should still succeed
  }
}

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
    
    // Format the scheduled time in 24-hour format in São Paulo timezone
    const scheduledDate = new Date(post.scheduledTime);
    const formattedScheduledTime = scheduledDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    }) + ' at ' + scheduledDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo'
    });
    
    // Format current time (when post was created) in São Paulo timezone
    const createdDate = new Date();
    const formattedCreatedTime = createdDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Sao_Paulo'
    }) + ' at ' + createdDate.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'America/Sao_Paulo'
    });
    
    // Create message using Slack's markdown format
    const statusDisplay = post.status === 'ready' ? 'Ready to Publish' : post.status;
    const message = `📅 *New post scheduled*\n\n` +
      `*Platform:* ${post.platform}\n` +
      `*Created at:* ${formattedCreatedTime}\n` +
      `*Scheduled for:* ${formattedScheduledTime}\n` +
      `*Content:* ${post.content}\n` +
      `*Status:* ${statusDisplay}`;
    
    // Send message to Slack - use your direct message channel
    let channelToUse = slackSettings.channelId;
    
    // If using placeholder, use your #social channel
    if (channelToUse === 'DM_PLACEHOLDER') {
      channelToUse = 'C08PUPJ15LJ'; // Your #social channel
      console.log('Using #social channel: C08PUPJ15LJ');
    }
    
    // Prepare message payload
    const messagePayload = {
      channel: channelToUse,
      text: message,
      mrkdwn: true
    };
    
    // Add image if media exists
    console.log('Post has media:', !!post.media, '- Media count:', post.media?.length || 0);
    
    if (post.media && Array.isArray(post.media) && post.media.length > 0) {
      const mediaItem = post.media[0];
      const mediaUrl = mediaItem.url;
      const mediaType = mediaItem.type || 'image'; // default to image if type not specified
      
      if (mediaUrl && mediaUrl.startsWith('blob:')) {
        console.log(`Blob URL detected for ${mediaType} - cannot send to Slack directly`);
        // Add appropriate media indicator
        if (mediaType === 'video') {
          messagePayload.text += '\n\n🎥 *Video attached* (View video in Social Media Content Calendar dashboard)';
        } else {
          messagePayload.text += '\n\n📷 *Image attached* (View image in Social Media Content Calendar dashboard)';
        }
      } else if (mediaUrl && (mediaUrl.startsWith('http') || mediaUrl.startsWith('https')) && !mediaUrl.startsWith('data:')) {
        // Only use HTTP/HTTPS URLs (not data URLs) for Slack attachments
        if (mediaType === 'video') {
          // Slack doesn't support video attachments directly, so add text indicator
          messagePayload.text += `\n\n🎥 *Video attached*: ${mediaUrl}`;
          console.log('Adding video link to Slack message');
        } else {
          // Image attachment
          messagePayload.attachments = [{
            fallback: 'Post image',
            image_url: mediaUrl,
            color: '#36a64f'
          }];
          console.log('Adding image to Slack message');
        }
      } else {
        console.log(`${mediaType} not suitable for Slack (data URL or invalid)`);
        if (mediaType === 'video') {
          messagePayload.text += '\n\n🎥 *Video attached* (View video in Social Media Content Calendar dashboard)';
        } else {
          messagePayload.text += '\n\n📷 *Image attached* (View image in Social Media Content Calendar dashboard)';
        }
      }
    } else {
      console.log('No media data found in post');
    }
    
    // Send message to Slack
    console.log(`Sending message to channel: ${channelToUse}`);
    // Create clean payload for logging (without potential base64 data)
    const logPayload = {
      channel: messagePayload.channel,
      text: messagePayload.text.substring(0, 200) + '...',
      hasAttachments: !!messagePayload.attachments
    };
    console.log('Slack payload (truncated):', logPayload);
    const result = await slack.chat.postMessage(messagePayload);
    
    // Store the Slack message timestamp for future deletion
    if (result.ok && result.ts) {
      // Store as scheduled timestamp (will be updated to published timestamp later)
      await db.run(
        'UPDATE posts SET slackScheduledTs = ? WHERE id = ?',
        [result.ts, post.id]
      );
      console.log('✅ Slack scheduled notification sent and timestamp stored:', result.ts);
    }
    
    console.log('✅ Slack notification sent for post:', post.id, '- Content length:', post.content.length, '- Has media:', !!post.media);
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
    
    // Send notifications based on status
    try {
      if (status === 'published') {
        // Send notifications for published posts
        await sendSlackNotification(userId, newPost);
        const { notifyPostPublished } = require('./notification-service');
        await notifyPostPublished(userId, newPost);
      } else if (status === 'ready' || status === 'draft') {
        // Check if scheduled notifications are enabled before sending
        const slackSettings = await db.get(
          'SELECT slackScheduled FROM slack_settings WHERE userId = ? AND isActive = 1', 
          userId
        );
        
        console.log('🔔 Checking scheduled notification preference:', {
          userId,
          slackScheduled: slackSettings?.slackScheduled,
          willSend: !!(slackSettings && slackSettings.slackScheduled)
        });
        
        if (slackSettings && slackSettings.slackScheduled) {
          console.log('✅ Sending scheduled notification');
          await sendSlackNotification(userId, newPost);
        } else {
          console.log('❌ Skipping scheduled notification (disabled)');
        }
      }
      
    } catch (error) {
      console.error('Failed to send notifications:', error);
      // Don't fail the post creation if notifications fail
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
    
    // Delete Slack notification if it exists
    console.log('🗑️ Attempting to delete Slack notification for post:', existingPost.id, 'with timestamp:', existingPost.slackMessageTs);
    try {
      await deleteSlackNotification(userId, existingPost);
    } catch (error) {
      console.error('Failed to delete Slack notification:', error);
      // Don't fail the post deletion if Slack deletion fails
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