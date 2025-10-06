const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

// Decryption function for Slack tokens
const decrypt = (hash) => {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.createHash('sha256').update(String(process.env.ENCRYPTION_KEY)).digest('base64').substr(0, 32);
    const [iv, encrypted] = hash.split(':');
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('Decryption error:', error.message);
    return hash; // Return original if decryption fails
  }
};

// Middleware to get user ID from token
const getUserId = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    // Default to user ID 1 for demo purposes
    req.userId = 1;
    console.log('🔧 No token provided, using default user ID: 1');
    next();
    return;
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.userId = decoded.userId || decoded.id || 1;
    console.log('🔧 Authenticated user ID:', req.userId);
    next();
  } catch (error) {
    console.error('🔧 JWT verification failed:', error.message);
    req.userId = 1; // Fallback to default user
    next();
  }
};

// Apply getUserId middleware to all routes
router.use(getUserId);

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

// SQLite helper function
async function getDb() {
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');
  return await open({
    filename: process.env.DB_PATH || './data.sqlite',
    driver: sqlite3.Database
  });
}

if (dbType === 'sqlite') {
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');
  
  // Initialize SQLite database
  (async () => {
    try {
      db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      console.log('✅ SQLite connected for posts');
    } catch (error) {
      console.error('❌ SQLite connection failed:', error);
    }
  })();
} else {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('✅ PostgreSQL connected for posts');
  
  // Create posts table if it doesn't exist
  (async () => {
    try {
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
      console.log('✅ Posts table ready');
    } catch (error) {
      console.error('❌ Error creating posts table:', error);
    }
  })();
}

// Table initialization handled by init-database.js or index.js

// Get all posts
router.get('/', async (req, res) => {
  try {
    let posts = [];
    
    if (dbType === 'sqlite') {
      const rows = await db.all('SELECT * FROM posts ORDER BY scheduledTime DESC');
      posts = rows.map(row => ({
        id: row.id,
        userId: row.userId,
        platform: row.platform,
        content: row.content,
        scheduledTime: row.scheduledTime,
        status: row.status,
        media: row.media ? JSON.parse(row.media) : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        slackMessageTs: row.slackMessageTs
      }));
    } else {
      const result = await db.query('SELECT * FROM posts ORDER BY scheduledtime DESC');
      posts = result.rows.map(row => ({
        id: row.id,
        userId: row.userid,
        platform: row.platform,
        content: row.content,
        scheduledTime: row.scheduledtime,
        status: row.status,
        media: row.media,
        createdAt: row.createdat,
        updatedAt: row.updatedat,
        slackMessageTs: row.slackmessagets
      }));
    }
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
router.post('/', async (req, res) => {
  try {
    const { content, platform, scheduledTime, status, media } = req.body;
    const userId = req.userId;
    const now = new Date().toISOString();
    
    console.log('Creating post:', { content, platform, scheduledTime, status });
    
    let post;
    
    if (dbType === 'sqlite') {
      const result = await db.run(
        'INSERT INTO posts (userId, platform, content, scheduledTime, status, media, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, platform, content, scheduledTime, status || 'scheduled', media ? JSON.stringify(media) : null, now, now]
      );
      
      post = {
        id: result.lastID,
        userId,
        platform,
        content,
        scheduledTime,
        status: status || 'scheduled',
        media,
        createdAt: now,
        updatedAt: now
      };
    } else {
      const result = await db.query(
        'INSERT INTO posts (userid, platform, content, scheduledtime, status, media, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
        [userId, platform, content, scheduledTime, status || 'scheduled', media ? JSON.stringify(media) : null]
      );
      
      post = {
        id: result.rows[0].id,
        userId: result.rows[0].userid,
        platform: result.rows[0].platform,
        content: result.rows[0].content,
        scheduledTime: result.rows[0].scheduledtime,
        status: result.rows[0].status,
        media: result.rows[0].media,
        createdAt: result.rows[0].createdat,
        updatedAt: result.rows[0].updatedat
      };
    }
    
    // Send Slack notification if enabled
    const finalStatus = status || 'scheduled';
    try {
      console.log(`🔔 Post created with ${finalStatus} status, checking Slack notifications...`);
      
      // Get user's Slack settings and preferences
      let slackSettings;
      if (dbType === 'sqlite') {
        const database = await getDb();
        slackSettings = await database.get(
          'SELECT * FROM slack_settings WHERE userId = ? AND isActive = 1',
          [userId]
        );
        await database.close();
      } else {
        const result = await db.query(
          'SELECT * FROM slack_settings WHERE userid = $1 AND isactive = true',
          [userId]
        );
        slackSettings = result.rows[0];
        if (slackSettings) {
          slackSettings = {
            botToken: slackSettings.bottoken,
            channelId: slackSettings.channelid,
            channelName: slackSettings.channelname,
            slackScheduled: slackSettings.slackscheduled,
            slackPublished: slackSettings.slackpublished,
            slackFailed: slackSettings.slackfailed
          };
        }
      }
      
      console.log('🔧 Slack settings found:', {
        hasSettings: !!slackSettings,
        hasToken: !!(slackSettings && slackSettings.botToken),
        hasChannel: !!(slackSettings && slackSettings.channelId),
        slackScheduled: slackSettings?.slackScheduled,
        status: finalStatus
      });
      
      // Send notification based on status and preferences
      if (slackSettings && slackSettings.botToken && slackSettings.channelId) {
        let shouldNotify = false;
        
        if ((finalStatus === 'scheduled' || finalStatus === 'ready') && slackSettings.slackScheduled) {
          shouldNotify = true;
          console.log('✅ Will send scheduled notification');
        } else if (finalStatus === 'published' && slackSettings.slackPublished) {
          shouldNotify = true;
          console.log('✅ Will send published notification');
        }
        
        if (shouldNotify) {
          const { WebClient } = require('@slack/web-api');
          
          // Handle both encrypted user tokens and plain environment tokens
          let actualBotToken = slackSettings.botToken;
          try {
            // Try to decrypt if it looks like an encrypted token
            if (slackSettings.botToken.includes(':')) {
              actualBotToken = decrypt(slackSettings.botToken);
              console.log('🔐 Using decrypted user token');
            } else {
              console.log('🔧 Using environment token');
            }
          } catch (decryptError) {
            console.log('⚠️ Decryption failed, using token as-is:', decryptError.message);
          }
          
          const slack = new WebClient(actualBotToken);
          
          // Format message
          const statusDisplay = finalStatus === 'ready' ? 'Ready to Publish' : finalStatus;
          const scheduledDate = new Date(post.scheduledTime);
          const formattedTime = scheduledDate.toLocaleDateString('en-US', {
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
          
          const message = `📅 *New post ${finalStatus}*\n\n` +
            `*Platform:* ${post.platform}\n` +
            `*Scheduled for:* ${formattedTime}\n` +
            `*Content:* ${post.content}\n` +
            `*Status:* ${statusDisplay}`;
          
          // Send to Slack
          const result = await slack.chat.postMessage({
            channel: slackSettings.channelId,
            text: message,
            mrkdwn: true
          });
          
          console.log('✅ Slack notification sent successfully:', result.ts);
          
          // Store Slack timestamp for future deletion
          if (result.ok && result.ts) {
            if (dbType === 'sqlite') {
              const database = await getDb();
              await database.run(
                'UPDATE posts SET slackMessageTs = ? WHERE id = ?',
                [result.ts, post.id]
              );
              await database.close();
            } else {
              await db.query(
                'UPDATE posts SET slackmessagets = $1 WHERE id = $2',
                [result.ts, post.id]
              );
            }
            console.log('✅ Slack timestamp stored:', result.ts);
          }
        } else {
          console.log('🔕 Slack notifications disabled for this status:', finalStatus);
        }
      } else {
        console.log('🔕 No Slack configuration found');
      }
    } catch (notifyError) {
      console.error('❌ Error sending Slack notification:', notifyError);
    }
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get a specific post
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let post;
    
    if (dbType === 'sqlite') {
      const row = await db.get('SELECT * FROM posts WHERE id = ?', [id]);
      if (!row) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      post = {
        id: row.id,
        userId: row.userId,
        platform: row.platform,
        content: row.content,
        scheduledTime: row.scheduledTime,
        status: row.status,
        media: row.media ? JSON.parse(row.media) : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
      };
    } else {
      const result = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      post = {
        id: result.rows[0].id,
        userId: result.rows[0].userid,
        platform: result.rows[0].platform,
        content: result.rows[0].content,
        scheduledTime: result.rows[0].scheduledtime,
        status: result.rows[0].status,
        media: result.rows[0].media,
        createdAt: result.rows[0].createdat,
        updatedAt: result.rows[0].updatedat
      };
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Update a post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, platform, scheduledTime, status, media } = req.body;
    const now = new Date().toISOString();
    
    let post;
    
    if (dbType === 'sqlite') {
      const result = await db.run(
        `UPDATE posts SET 
         content = COALESCE(?, content), 
         platform = COALESCE(?, platform), 
         scheduledTime = COALESCE(?, scheduledTime), 
         status = COALESCE(?, status), 
         media = COALESCE(?, media),
         updatedAt = ? 
         WHERE id = ?`,
        [content, platform, scheduledTime, status, media ? JSON.stringify(media) : null, now, id]
      );
      
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      // Get updated post
      const updatedRow = await db.get('SELECT * FROM posts WHERE id = ?', [id]);
      post = {
        id: updatedRow.id,
        userId: updatedRow.userId,
        platform: updatedRow.platform,
        content: updatedRow.content,
        scheduledTime: updatedRow.scheduledTime,
        status: updatedRow.status,
        media: updatedRow.media ? JSON.parse(updatedRow.media) : null,
        createdAt: updatedRow.createdAt,
        updatedAt: updatedRow.updatedAt
      };
    } else {
      const result = await db.query(
        `UPDATE posts SET 
         content = COALESCE($1, content), 
         platform = COALESCE($2, platform), 
         scheduledtime = COALESCE($3, scheduledtime), 
         status = COALESCE($4, status), 
         media = COALESCE($5, media),
         updatedat = NOW() 
         WHERE id = $6 
         RETURNING *`,
        [content, platform, scheduledTime, status, media ? JSON.stringify(media) : null, id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      post = {
        id: result.rows[0].id,
        userId: result.rows[0].userid,
        platform: result.rows[0].platform,
        content: result.rows[0].content,
        scheduledTime: result.rows[0].scheduledtime,
        status: result.rows[0].status,
        media: result.rows[0].media,
        createdAt: result.rows[0].createdat,
        updatedAt: result.rows[0].updatedat
      };
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let deletedPost = null;
    
    console.log(`🗑️ Deleting post ${id}...`);
    
    // First get the post to check for Slack message timestamp
    if (dbType === 'sqlite') {
      deletedPost = await db.get('SELECT * FROM posts WHERE id = ?', [id]);
      if (!deletedPost) {
        return res.status(404).json({ error: 'Post not found' });
      }
      
      const result = await db.run('DELETE FROM posts WHERE id = ?', [id]);
      if (result.changes === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
    } else {
      const getResult = await db.query('SELECT * FROM posts WHERE id = $1', [id]);
      if (getResult.rows.length === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
      deletedPost = getResult.rows[0];
      
      const result = await db.query('DELETE FROM posts WHERE id = $1', [id]);
      if (result.rowCount === 0) {
        return res.status(404).json({ error: 'Post not found' });
      }
    }
    
    // Delete corresponding Slack message if it exists
    const slackTs = deletedPost.slackMessageTs || deletedPost.slackmessagets;
    if (slackTs) {
      try {
        console.log('🗑️ Found Slack timestamp, deleting message:', slackTs);
        
        // Get user's Slack settings
        const userId = req.userId || 1;
        let slackSettings;
        
        if (dbType === 'sqlite') {
          const database = await getDb();
          slackSettings = await database.get(
            'SELECT botToken, channelId FROM slack_settings WHERE userId = ?',
            [userId]
          );
          await database.close();
        } else {
          const result = await db.query(
            'SELECT bottoken, channelid FROM slack_settings WHERE userid = $1',
            [userId]
          );
          slackSettings = result.rows[0];
          if (slackSettings) {
            slackSettings = {
              botToken: slackSettings.bottoken,
              channelId: slackSettings.channelid
            };
          }
        }
        
        if (slackSettings && slackSettings.botToken && slackSettings.channelId) {
          const { WebClient } = require('@slack/web-api');
          
          // Handle both encrypted user tokens and plain environment tokens
          let actualBotToken = slackSettings.botToken;
          try {
            if (slackSettings.botToken.includes(':')) {
              actualBotToken = decrypt(slackSettings.botToken);
              console.log('🔐 Using decrypted user token for deletion');
            } else {
              console.log('🔧 Using environment token for deletion');
            }
          } catch (decryptError) {
            console.log('⚠️ Decryption failed, using token as-is:', decryptError.message);
          }
          
          const slack = new WebClient(actualBotToken);
          
          console.log('🗑️ Attempting to delete Slack message from channel:', slackSettings.channelId);
          
          await slack.chat.delete({
            channel: slackSettings.channelId,
            ts: slackTs
          });
          
          console.log('✅ Slack message deleted successfully');
        } else {
          console.log('🔕 No Slack settings found, skipping message deletion');
          console.log('🔕 Settings debug:', {
            hasSettings: !!slackSettings,
            hasToken: !!(slackSettings && slackSettings.botToken),
            hasChannel: !!(slackSettings && slackSettings.channelId),
            userId: userId
          });
        }
      } catch (slackError) {
        console.error('❌ Error deleting Slack message:', slackError.message);
        // Don't fail the post deletion if Slack deletion fails
      }
    } else {
      console.log('🔕 No Slack timestamp found for post, skipping message deletion');
    }
    
    console.log('✅ Post deleted successfully from database');
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// Check for deleted Slack messages and remove corresponding posts
router.post('/sync-slack-deletions', async (req, res) => {
  try {
    console.log('🔄 Checking for deleted Slack messages...');
    
    // Get posts with Slack timestamps
    let posts = [];
    
    if (dbType === 'sqlite') {
      posts = await db.all('SELECT id, slackMessageTs FROM posts WHERE slackMessageTs IS NOT NULL');
    } else {
      const result = await db.query('SELECT id, slackmessagets FROM posts WHERE slackmessagets IS NOT NULL');
      posts = result.rows.map(row => ({ id: row.id, slackMessageTs: row.slackmessagets }));
    }
    
    if (posts.length === 0) {
      return res.json({ message: 'No posts with Slack timestamps found' });
    }
    
    // Get Slack settings
    let slackSettings;
    const userId = req.userId || 1;
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      slackSettings = await database.get(
        'SELECT botToken, channelId FROM slack_settings WHERE userId = ?',
        [userId]
      );
      await database.close();
    } else {
      const result = await db.query(
        'SELECT bottoken, channelid FROM slack_settings WHERE userid = $1',
        [userId]
      );
      slackSettings = result.rows[0];
      if (slackSettings) {
        slackSettings = {
          botToken: slackSettings.bottoken,
          channelId: slackSettings.channelid
        };
      }
    }
    
    if (!slackSettings || !slackSettings.botToken) {
      return res.status(400).json({ error: 'No Slack settings found' });
    }
    
    const { WebClient } = require('@slack/web-api');
    
    // Handle both encrypted user tokens and plain environment tokens
    let actualBotToken = slackSettings.botToken;
    try {
      if (slackSettings.botToken.includes(':')) {
        actualBotToken = decrypt(slackSettings.botToken);
        console.log('🔐 Using decrypted user token for sync');
      } else {
        console.log('🔧 Using environment token for sync');
      }
    } catch (decryptError) {
      console.log('⚠️ Decryption failed, using token as-is:', decryptError.message);
    }
    
    const slack = new WebClient(actualBotToken);
    let deletedCount = 0;
    
    // Check each post's Slack message
    for (const post of posts) {
      try {
        // Try to get the message permalink - if message is deleted, this will fail
        await slack.chat.getPermalink({
          channel: slackSettings.channelId,
          message_ts: post.slackMessageTs
        });
        console.log(`✅ Message ${post.slackMessageTs} exists for post ${post.id}`);
      } catch (error) {
        if (error.data && (error.data.error === 'message_not_found' || error.data.error === 'channel_not_found')) {
          // Message was deleted, remove post
          console.log(`🗑️ Slack message deleted, removing post ${post.id}`);
          
          if (dbType === 'sqlite') {
            await db.run('DELETE FROM posts WHERE id = ?', [post.id]);
          } else {
            await db.query('DELETE FROM posts WHERE id = $1', [post.id]);
          }
          
          deletedCount++;
        } else {
          console.log(`⚠️ Error checking message ${post.slackMessageTs}:`, error.data?.error);
        }
      }
    }
    
    console.log(`✅ Sync complete: ${deletedCount} posts deleted`);
    res.json({ message: `Sync complete: ${deletedCount} posts deleted` });
    
  } catch (error) {
    console.error('❌ Slack sync error:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Slack webhook endpoint for real-time deletion detection
router.post('/slack-webhook', async (req, res) => {
  try {
    const { type, challenge, event } = req.body;
    
    // Handle URL verification
    if (type === 'url_verification') {
      return res.json({ challenge });
    }
    
    // Handle message deletion events
    if (type === 'event_callback' && event && event.type === 'message' && event.subtype === 'message_deleted') {
      console.log('🗑️ Slack webhook: Message deleted, timestamp:', event.deleted_ts);
      
      // Find and delete corresponding post
      let deletedCount = 0;
      
      if (dbType === 'sqlite') {
        const database = await getDb();
        const result = await database.run(
          'DELETE FROM posts WHERE slackMessageTs = ?',
          [event.deleted_ts]
        );
        deletedCount = result.changes;
        await database.close();
      } else {
        const result = await db.query(
          'DELETE FROM posts WHERE slackmessagets = $1',
          [event.deleted_ts]
        );
        deletedCount = result.rowCount;
      }
      
      console.log(`🗑️ Webhook: Deleted ${deletedCount} post(s) from database`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Slack webhook error:', error);
    res.status(500).send('Error');
  }
});

module.exports = router;