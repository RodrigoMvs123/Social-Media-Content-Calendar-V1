const express = require('express');
const { WebClient } = require('@slack/web-api');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const jwt = require('jsonwebtoken');

const router = express.Router();

// Add CORS headers for all Slack routes
router.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Get database connection
async function getDb() {
  return await open({
    filename: process.env.DB_PATH || './data.sqlite',
    driver: sqlite3.Database
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
    console.log('Token verified:', decoded);
    console.log('Setting userId to:', req.userId);
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

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
    const db = await getDb();
    const settings = await db.get(
      'SELECT botToken, channelId, channelName, isActive FROM slack_settings WHERE userId = ?',
      [req.userId]
    );
    
    if (!settings) {
      return res.json({ configured: false });
    }

    res.json({
      configured: true,
      channelId: settings.channelId,
      channelName: settings.channelName,
      isActive: settings.isActive,
      hasToken: !!settings.botToken
    });
  } catch (error) {
    console.error('Error fetching Slack settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
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

    const db = await getDb();
    const now = new Date().toISOString();

    // Upsert settings
    await db.run(`
      INSERT OR REPLACE INTO slack_settings 
      (userId, botToken, channelId, channelName, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `, [req.userId, botToken, channelId, channelName, now, now]);

    res.json({ success: true, message: 'Slack settings saved successfully' });
  } catch (error) {
    console.error('Error saving Slack settings:', error);
    res.status(400).json({ error: 'Invalid bot token or failed to save settings' });
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
    const db = await getDb();
    const settings = await db.get(
      'SELECT botToken, channelId, isActive FROM slack_settings WHERE userId = ?',
      [req.userId]
    );

    if (!settings) {
      return res.json({
        connected: false,
        tokenConfigured: false,
        channelConfigured: false
      });
    }

    res.json({
      connected: settings.isActive && !!settings.botToken && !!settings.channelId,
      tokenConfigured: !!settings.botToken,
      channelConfigured: !!settings.channelId
    });
  } catch (error) {
    console.error('Error checking Slack status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

module.exports = router;