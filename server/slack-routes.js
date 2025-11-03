const express = require('express');
const { WebClient } = require('@slack/web-api');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Encryption setup
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
if (!ENCRYPTION_KEY) {
  console.warn('Warning: ENCRYPTION_KEY is not set. Using a default key for development. This is not secure for production.');
}
const algorithm = 'aes-256-cbc';
const key = crypto.createHash('sha256').update(String(ENCRYPTION_KEY)).digest('base64').substr(0, 32);

const encrypt = (text) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
};

const decrypt = (hash) => {
  const [iv, encrypted] = hash.split(':');
  const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(iv, 'hex'));
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encrypted, 'hex')), decipher.final()]);
  return decrypted.toString();
};

// Note: RTM API requires user tokens, not bot tokens
// We'll use webhook events instead for real-time message deletion detection
console.log('ℹ️ Using webhook events for Slack message deletion detection');

const router = express.Router();

// Add CORS headers for all Slack routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

// SQLite helper function
async function getDb() {
  return await open({
    filename: process.env.DB_PATH || './data.sqlite',
    driver: sqlite3.Database
  });
}

if (dbType === 'postgres') {
  // PostgreSQL connection
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('✅ Slack routes using PostgreSQL');
} else {
  console.log('✅ Slack routes using SQLite');
}

// Middleware to get user ID from token
const getUserId = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Handle both userId and id from JWT token
    req.userId = decoded.userId || decoded.id;
    console.log('🔧 Authenticated user ID:', req.userId);
    next();
  } catch (error) {
    console.error('🔧 JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// POST /api/slack/channels - Get channels for bot token
router.post('/channels', getUserId, async (req, res) => {
  try {
    const { botToken } = req.body;
    
    if (!botToken || typeof botToken !== 'string') {
      return res.status(400).json({ 
        error: 'Bot token is required' 
      });
    }

    const slack = new WebClient(botToken.trim());
    
    // Get channels list
    const channelsResult = await slack.conversations.list({
      types: 'public_channel,private_channel'
    });
    
    const channels = channelsResult.channels.map(channel => ({
      id: channel.id,
      name: `#${channel.name}`,
      is_private: channel.is_private
    }));
    
    res.json({ channels });
  } catch (error) {
    console.error('Error fetching channels:', error.message);
    res.status(400).json({ 
      error: 'Failed to fetch channels. Please check your bot token.' 
    });
  }
});

// POST /api/slack/validate - Validate bot token and get basic info
router.post('/validate', getUserId, async (req, res) => {
  try {
    const { botToken } = req.body;
    
    console.log('Validating bot token:', botToken ? `${botToken.substring(0, 10)}...` : 'undefined');
    
    if (!botToken || typeof botToken !== 'string') {
      return res.status(400).json({ 
        valid: false, 
        error: 'Bot token is required and must be a string' 
      });
    }

    // Check if token starts with xoxb-
    if (!botToken.startsWith('xoxb-')) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Bot token must start with "xoxb-"' 
      });
    }

    const slack = new WebClient(botToken.trim());
    
    // Test authentication
    const authTest = await slack.auth.test();
    console.log('Auth test successful for:', authTest.team);
    
    res.json({
      valid: true,
      botInfo: {
        user: authTest.user,
        user_id: authTest.user_id,
        team: authTest.team,
        team_id: authTest.team_id,
        url: authTest.url
      }
    });
  } catch (error) {
    console.error('Error validating bot token:', error.message);
    
    let errorMessage = 'Invalid bot token';
    if (error.data && error.data.error) {
      switch (error.data.error) {
        case 'invalid_auth':
          errorMessage = 'Invalid bot token. Please check your token.';
          break;
        case 'account_inactive':
          errorMessage = 'Slack account is inactive.';
          break;
        case 'token_revoked':
          errorMessage = 'Bot token has been revoked.';
          break;
        default:
          errorMessage = `Slack API error: ${error.data.error}`;
      }
    }
    
    res.status(400).json({ 
      valid: false, 
      error: errorMessage
    });
  }
});

// GET /api/slack/validate - Validate bot token and get basic info (fallback)
router.get('/validate', getUserId, async (req, res) => {
  try {
    const { botToken } = req.query;
    
    console.log('Validating bot token:', botToken ? `${botToken.substring(0, 10)}...` : 'undefined');
    
    if (!botToken || typeof botToken !== 'string') {
      return res.status(400).json({ 
        valid: false, 
        error: 'Bot token is required and must be a string' 
      });
    }

    // Check if token starts with xoxb-
    if (!botToken.startsWith('xoxb-')) {
      return res.status(400).json({ 
        valid: false, 
        error: 'Bot token must start with "xoxb-"' 
      });
    }

    const slack = new WebClient(botToken.trim());
    
    // Test authentication
    const authTest = await slack.auth.test();
    console.log('Auth test successful for:', authTest.team);
    
    res.json({
      valid: true,
      botInfo: {
        user: authTest.user,
        user_id: authTest.user_id,
        team: authTest.team,
        team_id: authTest.team_id,
        url: authTest.url
      }
    });
  } catch (error) {
    console.error('Error validating bot token:', error.message);
    
    let errorMessage = 'Invalid bot token';
    if (error.data && error.data.error) {
      switch (error.data.error) {
        case 'invalid_auth':
          errorMessage = 'Invalid bot token. Please check your token.';
          break;
        case 'account_inactive':
          errorMessage = 'Slack account is inactive.';
          break;
        case 'token_revoked':
          errorMessage = 'Bot token has been revoked.';
          break;
        default:
          errorMessage = `Slack API error: ${error.data.error}`;
      }
    }
    
    res.status(400).json({ 
      valid: false, 
      error: errorMessage
    });
  }
});

// GET /api/slack/channels - Get available channels for user's bot token
router.get('/channels', getUserId, async (req, res) => {
  try {
    const { botToken } = req.query;
    
    if (!botToken) {
      return res.status(400).json({ error: 'Bot token is required' });
    }

    const slack = new WebClient(botToken);
    
    // Test authentication first
    const authTest = await slack.auth.test();
    console.log('Bot info:', authTest);
    
    const availableChannels = [];
    
    try {
      // Get bot's own user info to create DM
      const botInfo = await slack.users.info({ user: authTest.user_id });
      
      // Try to open DM channel with any user (we'll use the bot's own ID)
      const dmChannel = await slack.conversations.open({
        users: authTest.user_id
      });
      
      availableChannels.push({
        id: dmChannel.channel.id,
        name: 'Direct Messages',
        type: 'dm'
      });
      
      console.log('DM channel created:', dmChannel.channel.id);
    } catch (dmError) {
      console.log('Could not create DM channel:', dmError.message);
      
      // Alternative: Add a generic DM option that users can try
      availableChannels.push({
        id: 'DM_PLACEHOLDER',
        name: 'Direct Messages (Manual Setup Required)',
        type: 'dm'
      });
    }

    try {
      // Get all channels (not just ones bot is member of)
      const channels = await slack.conversations.list({
        types: 'public_channel,private_channel',
        exclude_archived: true,
        limit: 100
      });
      
      console.log(`Found ${channels.channels.length} total channels`);
      
      // Add all channels (user can invite bot later)
      channels.channels.forEach(channel => {
        availableChannels.push({
          id: channel.id,
          name: `#${channel.name}${channel.is_member ? '' : ' (invite bot first)'}`,
          type: 'channel'
        });
      });
      
      console.log(`Added ${channels.channels.length} channels to list`);
    } catch (channelError) {
      console.log('Could not fetch channels:', channelError.message);
    }

    console.log(`Total available channels: ${availableChannels.length}`);
    
    // Always return channels, even if empty
    res.json({ 
      channels: availableChannels,
      message: availableChannels.length === 0 
        ? 'Bot token is valid. You may need to invite the bot to channels or create a DM.'
        : `Found ${availableChannels.length} available destinations.`
    });
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    res.status(400).json({ 
      error: 'Invalid bot token or Slack API error',
      details: error.message
    });
  }
});

// GET /api/slack/settings - Get user's Slack settings
router.get('/settings', getUserId, async (req, res) => {
  try {
    let settings;
    console.log('GET /api/slack/settings - userId:', req.userId);
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      settings = await database.get(
        'SELECT botToken, channelId, channelName, isActive, slackScheduled, slackPublished, slackFailed FROM slack_settings WHERE userId = ?',
        [req.userId]
      );
      console.log('GET /api/slack/settings - SQLite query result:', settings);
      await database.close();
    } else {
      const result = await db.query(
        'SELECT bot_token, channel_id, channel_name, is_active, slack_scheduled, slack_published, slack_failed FROM slack_settings WHERE user_id = $1',
        [req.userId]
      );
      settings = result.rows[0];
      
      // Map PostgreSQL columns to camelCase
      if (settings) {
        settings = {
          botToken: settings.bot_token,
          channelId: settings.channel_id,
          channelName: settings.channel_name,
          isActive: settings.is_active,
          slackScheduled: settings.slack_scheduled,
          slackPublished: settings.slack_published,
          slackFailed: settings.slack_failed
        };
      }
      console.log('GET /api/slack/settings - PostgreSQL query result:', settings);
    }
    
    if (!settings) {
      console.log('GET /api/slack/settings - No settings found for user:', req.userId);
      return res.json({ 
        configured: false,
        slackScheduled: false,
        slackPublished: false,
        slackFailed: false
      });
    }

    console.log('GET /api/slack/settings - Settings found:', settings);
    res.json({
      configured: true,
      channelId: settings.channelId,
      channelName: settings.channelName,
      isActive: settings.isActive,
      hasToken: !!settings.botToken,
      slackScheduled: settings.slackScheduled ?? false,
      slackPublished: settings.slackPublished ?? false,
      slackFailed: settings.slackFailed ?? false
    });
  } catch (error) {
    console.error('Error fetching Slack settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// DELETE /api/slack/disconnect - Disconnect Slack integration
router.delete('/disconnect', getUserId, async (req, res) => {
  try {
    if (dbType === 'sqlite') {
      const database = await getDb();
      await database.run(
        'DELETE FROM slack_settings WHERE userId = ?',
        [req.userId]
      );
    } else {
      await db.query(
        'DELETE FROM slack_settings WHERE user_id = $1',
        [req.userId]
      );
    }
    
    console.log(`Slack integration disconnected for user: ${req.userId}`);
    
    res.json({ 
      success: true, 
      message: 'Slack integration disconnected successfully' 
    });
  } catch (error) {
    console.error('Error disconnecting Slack:', error.message);
    res.status(500).json({ 
      error: 'Failed to disconnect Slack integration' 
    });
  }
});

// POST /api/slack/settings - Save user's Slack settings
router.post('/settings', getUserId, async (req, res) => {
  try {
    const { botToken, channelId, channelName } = req.body;

    if (!botToken || !channelId) {
      return res.status(400).json({ error: 'Bot token and channel ID are required' });
    }

    // Test the bot token
    const slack = new WebClient(botToken);
    await slack.auth.test();

    const now = new Date().toISOString();

    const encryptedBotToken = encrypt(botToken);

    if (dbType === 'sqlite') {
      const database = await getDb();
      // Upsert settings with default notification preferences (false by default)
      await database.run(`
        INSERT OR REPLACE INTO slack_settings 
        (userId, botToken, channelId, channelName, isActive, slackScheduled, slackPublished, slackFailed, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 1, 0, 0, 0, ?, ?)
      `, [req.userId, encryptedBotToken, channelId, channelName, now, now]);
      await database.close();
    } else {
      // Use ON CONFLICT for PostgreSQL
      await db.query(`
        INSERT INTO slack_settings 
        (user_id, bot_token, channel_id, channel_name, is_active, slack_scheduled, slack_published, slack_failed, created_at, updated_at)
        VALUES ($1, $2, $3, $4, true, false, false, false, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          bot_token = EXCLUDED.bot_token,
          channel_id = EXCLUDED.channel_id,
          channel_name = EXCLUDED.channel_name,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at
      `, [req.userId, encryptedBotToken, channelId, channelName, now, now]);
    }

    res.json({ success: true, message: 'Slack settings saved successfully' });
  } catch (error) {
    console.error('Error saving Slack settings:', error);
    res.status(400).json({ error: 'Invalid bot token or failed to save settings' });
  }
});

// POST /api/slack/preferences - Update Slack notification preferences
router.post('/preferences', getUserId, async (req, res) => {
  try {
    console.log('🔧 SLACK PREFERENCES REQUEST RECEIVED!');
    console.log('🔧 Request body:', req.body);
    console.log('🔧 User ID:', req.userId);
    console.log('🔧 Database type:', dbType);
    
    const { slackScheduled, slackPublished, slackFailed } = req.body;
    
    console.log('🔧 Updating Slack preferences for user:', req.userId, {
      slackScheduled,
      slackPublished, 
      slackFailed
    });
    
    const now = new Date().toISOString();
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      
      // Check if record exists
      const existing = await database.get(
        'SELECT * FROM slack_settings WHERE userId = ?',
        [req.userId]
      );
      
      if (existing) {
        // Update existing record, preserving botToken and channelId
        const result = await database.run(`
          UPDATE slack_settings 
          SET slackScheduled = ?, slackPublished = ?, slackFailed = ?, updatedAt = ?
          WHERE userId = ?
        `, [slackScheduled, slackPublished, slackFailed, now, req.userId]);
        console.log('🔧 SQLite update result:', { changes: result.changes });
      } else {
        // Create new record with default Slack configuration
        const botToken = process.env.SLACK_BOT_TOKEN;
        const channelId = process.env.SLACK_CHANNEL_ID;
        
        if (!botToken || !channelId) {
          console.log('⚠️ No environment Slack configuration found');
          return res.status(400).json({ error: 'Slack not configured in environment' });
        }
        
        const result = await database.run(`
          INSERT INTO slack_settings 
          (userId, botToken, channelId, channelName, slackScheduled, slackPublished, slackFailed, isActive, createdAt, updatedAt)
          VALUES (?, ?, ?, '#social', ?, ?, ?, 1, ?, ?)
        `, [req.userId, botToken, channelId, slackScheduled ?? true, slackPublished ?? true, slackFailed ?? true, now, now]);
        console.log('🔧 SQLite insert result:', { lastID: result.lastID });
        console.log('✅ Auto-configured Slack for user:', req.userId);
      }
      

      await database.close();
      
    } else {
      // PostgreSQL - auto-configure with environment variables for new users
      const botToken = process.env.SLACK_BOT_TOKEN;
      const channelId = process.env.SLACK_CHANNEL_ID;
      
      if (!botToken || !channelId) {
        console.log('⚠️ No environment Slack configuration found');
        return res.status(400).json({ error: 'Slack not configured in environment' });
      }
      
      const result = await db.query(`
        INSERT INTO slack_settings (user_id, bot_token, channel_id, channel_name, slack_scheduled, slack_published, slack_failed, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, '#social', $4, $5, $6, true, $7, $8)
        ON CONFLICT (user_id) DO UPDATE SET
          slack_scheduled = EXCLUDED.slack_scheduled,
          slack_published = EXCLUDED.slack_published,
          slack_failed = EXCLUDED.slack_failed,
          updated_at = EXCLUDED.updated_at
      `, [req.userId, botToken, channelId, slackScheduled ?? true, slackPublished ?? true, slackFailed ?? true, now, now]);
      
      console.log('🔧 Auto-configured Slack for user:', req.userId);
      console.log('✅ PostgreSQL upsert result:', { rowCount: result.rowCount });
    }
    
    console.log('✅ Slack preferences updated successfully');
    res.json({ success: true, message: 'Slack notification preferences updated successfully' });
  } catch (error) {
    console.error('❌ Error updating Slack preferences:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update preferences', details: error.message });
  }
});

// POST /api/slack/test-notification - Test notification with environment settings
router.post('/test-notification', async (req, res) => {
  try {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;
    
    if (!botToken || !channelId) {
      return res.status(400).json({ error: 'Slack not configured in environment' });
    }
    
    const { WebClient } = require('@slack/web-api');
    const slack = new WebClient(botToken);
    
    const message = `🧪 *Test Notification*\n\n` +
      `*Platform:* Test Platform\n` +
      `*Content:* This is a test notification from the Social Media Calendar\n` +
      `*Time:* ${new Date().toISOString()}`;
    
    const result = await slack.chat.postMessage({
      channel: channelId,
      text: message,
      mrkdwn: true
    });
    
    res.json({ 
      success: true, 
      message: 'Test notification sent!',
      timestamp: result.ts
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(400).json({ error: 'Failed to send test notification', details: error.message });
  }
});

// POST /api/slack/test - Test Slack connection
router.post('/test', getUserId, async (req, res) => {
  try {
    let settings;
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      settings = await database.get(
        'SELECT botToken, channelId, channelName FROM slack_settings WHERE userId = ?',
        [req.userId]
      );
    } else {
      const result = await db.query(
        'SELECT bot_token, channel_id, channel_name FROM slack_settings WHERE user_id = $1',
        [req.userId]
      );
      settings = result.rows[0];
      
      if (settings) {
        settings = {
          botToken: settings.bot_token,
          channelId: settings.channel_id,
          channelName: settings.channel_name
        };
      }
    }

    if (!settings) {
      return res.status(400).json({ error: 'No Slack settings found' });
    }

    const decryptedBotToken = decrypt(settings.botToken);

    const slack = new WebClient(decryptedBotToken);
    
    // Send test message
    await slack.chat.postMessage({
      channel: settings.channelId,
      text: '🎉 Test message from Social Media Calendar App! Your Slack integration is working correctly.'
    });

    res.json({ success: true, message: 'Test message sent successfully!' });
  } catch (error) {
    console.error('Error sending test message:', error);
    res.status(400).json({ error: 'Failed to send test message' });
  }
});

// GET /api/slack/events - Test endpoint to verify webhook is reachable
router.get('/events', (req, res) => {
  console.log('🔍 Slack events endpoint test accessed');
  console.log('🔍 Headers:', req.headers);
  res.json({ 
    message: 'Slack events endpoint is reachable',
    timestamp: new Date().toISOString(),
    url: req.originalUrl,
    status: 'ready_for_slack_events',
    webhook_url: 'https://social-media-content-calendar-v1.onrender.com/api/slack/events',
    database_type: dbType,
    test_instructions: [
      '1. Go to api.slack.com/apps',
      '2. Select your app',
      '3. Event Subscriptions → Request URL',
      '4. Enter: https://social-media-content-calendar-v1.onrender.com/api/slack/events',
      '5. Should show ✅ Verified',
      '6. If not verified, check server logs for errors'
    ]
  });
});

// GET /api/slack/debug-settings - Debug endpoint to check Slack settings
router.get('/debug-settings', async (req, res) => {
  try {
    let settings = [];
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      settings = await database.all('SELECT * FROM slack_settings');
      await database.close();
    } else {
      const result = await db.query('SELECT * FROM slack_settings');
      settings = result.rows;
    }
    
    res.json({
      database_type: dbType,
      total_settings: settings.length,
      settings: settings
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/slack/debug - Debug endpoint to check posts with Slack timestamps
router.get('/debug', async (req, res) => {
  try {
    let posts = [];
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      posts = await database.all(
        'SELECT id, content, platform, slackMessageTs FROM posts WHERE slackMessageTs IS NOT NULL LIMIT 10'
      );
      await database.close();
    } else {
      const result = await db.query(
        'SELECT id, content, platform, slackmessagets FROM posts WHERE slackmessagets IS NOT NULL LIMIT 10'
      );
      posts = result.rows.map(row => ({
        id: row.id,
        content: row.content,
        platform: row.platform,
        slackMessageTs: row.slackmessagets
      }));
    }
    
    res.json({
      database_type: dbType,
      posts_with_slack_timestamps: posts.length,
      posts: posts
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/slack/events - Handle Slack events (bidirectional sync)
router.post('/events', async (req, res) => {
  try {
    console.log('📨 SLACK WEBHOOK RECEIVED!');
    console.log('📨 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📨 Body:', JSON.stringify(req.body, null, 2));
    
    const { type, challenge, event } = req.body;
    
    // Handle URL verification challenge
    if (type === 'url_verification') {
      console.log('✅ URL VERIFICATION CHALLENGE RECEIVED:', challenge);
      return res.json({ challenge });
    }
    
    // Handle message events
    if (type === 'event_callback' && event) {
      console.log('📨 Slack event received:', event.type, event.subtype || 'no subtype');
      console.log('📨 Full event data:', JSON.stringify(event, null, 2));
      
      // Handle message deletion
      if (event.type === 'message' && event.subtype === 'message_deleted') {
        console.log('🗑️ REAL-TIME: Message deleted in Slack, timestamp:', event.deleted_ts);
        
        try {
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
          
          console.log(`🗑️ REAL-TIME: Deleted ${deletedCount} post(s) from database`);
          
        } catch (deleteError) {
          console.error('❌ REAL-TIME deletion error:', deleteError);
        }
      } else {
        console.log('🔕 Ignoring event:', event.type, event.subtype || 'no subtype');
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ Slack events error:', error);
    res.status(500).send('Error');
  }
});

// GET /api/slack/status - Get connection status (no auth required for debugging)
router.get('/status', async (req, res) => {
  const userId = 1; // Default user for debugging
  try {
    console.log(`Checking Slack status for user: ${userId}`);
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    let settings;
    if (dbType === 'sqlite') {
      const database = await getDb(); // Use getDb() for SQLite
      settings = await database.get(
        'SELECT botToken, channelId, isActive FROM slack_settings WHERE userId = ?',
        [userId]
      );
      await database.close(); // Close the database connection
    } else {
      const result = await db.query(
        'SELECT bot_token, channel_id, is_active FROM slack_settings WHERE user_id = $1',
        [userId]
      );
      settings = result.rows[0];
      // Map PostgreSQL columns to camelCase
      if (settings) {
        settings = {
          botToken: settings.bot_token,
          channelId: settings.channel_id,
          isActive: settings.is_active,
        };
      }
    }

    if (!settings) {
      console.log(`No Slack settings found for user: ${userId}`);
      return res.json({
        connected: false,
        tokenConfigured: false,
        channelConfigured: false
      });
    }

    const status = {
      connected: settings.isActive && !!settings.botToken && !!settings.channelId,
      tokenConfigured: !!settings.botToken,
      channelConfigured: !!settings.channelId
    };
    
    console.log(`Slack status for user ${userId}:`, status);
    res.json(status);
  } catch (error) {
    console.error('Error checking Slack status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;