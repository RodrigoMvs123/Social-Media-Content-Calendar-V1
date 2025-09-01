const express = require('express');
const { WebClient } = require('@slack/web-api');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');

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

if (dbType === 'sqlite') {
  // SQLite connection
  async function getDb() {
    return await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
  }
} else {
  // PostgreSQL connection
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
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
    next();
  } catch (error) {
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

    res.json({ channels: availableChannels });
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
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      settings = await database.get(
        'SELECT botToken, channelId, channelName, isActive, slackScheduled, slackPublished, slackFailed FROM slack_settings WHERE userId = ?',
        [req.userId]
      );
    } else {
      const result = await db.query(
        'SELECT bottoken, channelid, channelname, isactive, slackscheduled, slackpublished, slackfailed FROM slack_settings WHERE userid = $1',
        [req.userId]
      );
      settings = result.rows[0];
      
      // Map PostgreSQL lowercase columns to camelCase
      if (settings) {
        settings = {
          botToken: settings.bottoken,
          channelId: settings.channelid,
          channelName: settings.channelname,
          isActive: settings.isactive,
          slackScheduled: settings.slackscheduled,
          slackPublished: settings.slackpublished,
          slackFailed: settings.slackfailed
        };
      }
    }
    
    if (!settings) {
      return res.json({ configured: false });
    }

    res.json({
      configured: true,
      channelId: settings.channelId,
      channelName: settings.channelName,
      isActive: settings.isActive,
      hasToken: !!settings.botToken,
      slackScheduled: settings.slackScheduled ?? true,
      slackPublished: settings.slackPublished ?? true,
      slackFailed: settings.slackFailed ?? true
    });
  } catch (error) {
    console.error('Error fetching Slack settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// DELETE /api/slack/disconnect - Disconnect Slack integration
router.delete('/disconnect', getUserId, async (req, res) => {
  try {
    const db = await getDb();
    
    // Delete user's Slack settings
    const result = await db.run(
      'DELETE FROM slack_settings WHERE userId = ?',
      [req.userId]
    );
    
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

    if (dbType === 'sqlite') {
      const database = await getDb();
      // Upsert settings with default notification preferences
      await database.run(`
        INSERT OR REPLACE INTO slack_settings 
        (userId, botToken, channelId, channelName, isActive, slackScheduled, slackPublished, slackFailed, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, 1, 1, 1, 1, ?, ?)
      `, [req.userId, botToken, channelId, channelName, now, now]);
    } else {
      // First try to update existing record
      const updateResult = await db.query(`
        UPDATE slack_settings 
        SET bottoken = $2, channelid = $3, channelname = $4, isactive = $5, updatedat = $6
        WHERE userid = $1
      `, [req.userId, botToken, channelId, channelName, true, now]);
      
      // If no rows updated, insert new record
      if (updateResult.rowCount === 0) {
        await db.query(`
          INSERT INTO slack_settings 
          (userid, bottoken, channelid, channelname, isactive, slackscheduled, slackpublished, slackfailed, createdat, updatedat)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [req.userId, botToken, channelId, channelName, true, true, true, true, now, now]);
      }
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
    
    const { slackScheduled, slackPublished, slackFailed } = req.body;
    
    console.log('🔧 Updating Slack preferences for user:', req.userId, {
      slackScheduled,
      slackPublished, 
      slackFailed
    });
    
    const db = await getDb();
    const now = new Date().toISOString();
    
    // Update notification preferences
    const result = await db.run(`
      UPDATE slack_settings 
      SET slackScheduled = ?, slackPublished = ?, slackFailed = ?, updatedAt = ?
      WHERE userId = ?
    `, [slackScheduled, slackPublished, slackFailed, now, req.userId]);
    
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Slack settings not found. Please configure Slack integration first.' });
    }
    
    console.log('✅ Slack preferences updated successfully');
    res.json({ success: true, message: 'Slack notification preferences updated successfully' });
  } catch (error) {
    console.error('Error updating Slack preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// POST /api/slack/test - Test Slack connection
router.post('/test', getUserId, async (req, res) => {
  try {
    const db = await getDb();
    const settings = await db.get(
      'SELECT botToken, channelId, channelName FROM slack_settings WHERE userId = ?',
      [req.userId]
    );

    if (!settings) {
      return res.status(400).json({ error: 'No Slack settings found' });
    }

    const slack = new WebClient(settings.botToken);
    
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

// GET /api/slack/status - Get connection status
router.get('/status', getUserId, async (req, res) => {
  try {
    console.log(`Checking Slack status for user: ${req.userId}`);
    
    // Add cache control headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    const result = await db.query(
      'SELECT bottoken, channelid, isactive FROM slack_settings WHERE userid = $1',
      [req.userId]
    );
    
    const settings = result.rows[0];

    if (!settings) {
      console.log(`No Slack settings found for user: ${req.userId}`);
      return res.json({
        connected: false,
        tokenConfigured: false,
        channelConfigured: false
      });
    }

    const status = {
      connected: settings.isactive && !!settings.bottoken && !!settings.channelid,
      tokenConfigured: !!settings.bottoken,
      channelConfigured: !!settings.channelid
    };
    
    console.log(`Slack status for user ${req.userId}:`, status);
    res.json(status);
  } catch (error) {
    console.error('Error checking Slack status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;