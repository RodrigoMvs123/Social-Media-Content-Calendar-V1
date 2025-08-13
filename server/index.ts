import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { Pool } from 'pg';
import { SQLiteAdapter } from './sqlite-db';
import { findFreePort } from './utils/port-finder';
import { startPostScheduler } from './post-scheduler';

// Route imports
import mediaRoutes from './media-routes';
import authRoutesSqlite from './auth-routes-sqlite';
import postsRoutesSqlite from './posts-routes-sqlite';
import analyticsRoutesSqlite from './analytics-routes-sqlite';
import slackRoutes from './slack-routes';
import notificationRoutes from './notification-routes';
const oauthRoutes = require('./oauth-routes');
const SocialMediaAPI = require('./social-media-api');
const { createSocialAccountsTable } = require('./create-social-accounts-table');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

// Use DB_TYPE from environment variables
let dbType = process.env.DB_TYPE || 'sqlite';
let dbAdapter;

if (dbType === 'sqlite') {
  console.log('Using SQLite database adapter');
  dbAdapter = new SQLiteAdapter(process.env.DB_PATH || './data.sqlite');
  dbAdapter.initialize().then(async () => {
    console.log('SQLite database initialized successfully');
    // Initialize social accounts table
    await createSocialAccountsTable();
  }).catch(err => {
    console.error('Failed to initialize SQLite database:', err);
  });
} else {
  console.log('Using PostgreSQL database adapter');
  const dbConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  };
  const pool = new Pool(dbConfig);
}

console.log('Database configuration (final):', [
  `DB_TYPE: ${dbType}`,
  `DB_PATH: ${dbType === 'sqlite' ? (process.env.DB_PATH || './data.sqlite') : 'N/A'}`
]);

// OpenAI API key check
const openaiApiKey = process.env.OPENAI_API_KEY;
console.log(`OpenAI API Key status: ${openaiApiKey ? 'FOUND' : 'NOT FOUND'}`);

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from the uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
if (dbType === 'sqlite') {
  console.log('Using SQLite with JWT authentication');
  app.use('/api/auth', authRoutesSqlite);
  app.use('/api/posts', postsRoutesSqlite);
  app.use('/api/analytics', analyticsRoutesSqlite);
  app.use('/api/slack', slackRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/oauth', oauthRoutes);
} else {
  const authRoutesPostgres = require('./auth-routes');
  const postsRoutes = require('./posts-routes');
  app.use('/api/auth', authRoutesPostgres);
  app.use('/api/posts', postsRoutes);
}
app.use('/api/media', mediaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Social media publishing endpoint
app.post('/api/social/publish', async (req, res) => {
  try {
    const { postId, userId, platform, content, media } = req.body;
    
    if (!userId || !platform || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Get database connection
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    const db = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    const socialAPI = new SocialMediaAPI(db);
    const mediaUrls = media ? media.map(m => m.url) : [];
    
    console.log(`📤 Publishing post ${postId} to ${platform}`);
    const result = await socialAPI.publishPost(userId, platform, content, mediaUrls);
    
    if (result.success) {
      // Update post status to published
      await db.run(
        'UPDATE posts SET status = ?, publishedAt = ?, externalId = ? WHERE id = ?',
        ['published', new Date().toISOString(), result.id, postId]
      );
      console.log(`✅ Post ${postId} published successfully to ${platform}`);
    } else {
      // Update post status to failed
      await db.run(
        'UPDATE posts SET status = ?, errorMessage = ? WHERE id = ?',
        ['failed', result.error, postId]
      );
      console.log(`❌ Post ${postId} failed to publish to ${platform}: ${result.error}`);
    }
    
    await db.close();
    res.json(result);
  } catch (error) {
    console.error('Publishing error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get connected social media accounts
app.get('/api/social/accounts', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId || decoded.id;
    
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    const db = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    const accounts = await db.all(
      'SELECT platform, username, connected, connectedAt FROM social_accounts WHERE userId = ? AND connected = 1',
      [userId]
    );
    
    await db.close();
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    res.status(500).json({ error: 'Failed to fetch accounts' });
  }
});

// Slack Events API webhook endpoint
app.post('/api/slack/events', async (req, res) => {
  try {
    console.log('🔔 Slack webhook called');
    console.log('Event type:', req.body.type);
    
    const event = req.body;
    
    // Handle URL verification challenge
    if (event.type === 'url_verification') {
      console.log('✅ Slack URL verification challenge:', event.challenge);
      return res.json({ challenge: event.challenge });
    }
    
    // Log event_callback events (minimal logging)
    if (event.type === 'event_callback') {
      console.log('📋 Event callback:', event.event?.type, event.event?.subtype || 'no-subtype');
    }
    
    // Verify Slack signature for actual events (not for challenge)
    const signature = req.headers['x-slack-signature'];
    const timestamp = req.headers['x-slack-request-timestamp'];
    const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
    
    if (event.type === 'event_callback') {
      if (!slackSigningSecret) {
        console.error('❌ SLACK_SIGNING_SECRET not configured');
        return res.status(500).json({ error: 'Slack signing secret not configured' });
      }
      
      // Simple timestamp check (within 5 minutes)
      const currentTime = Math.floor(Date.now() / 1000);
      if (Math.abs(currentTime - timestamp) > 300) {
        console.log('❌ Slack event timestamp too old');
        return res.status(400).json({ error: 'Request timestamp too old' });
      }
      
      console.log('🔔 Slack event received:', event.type);
      
      // Handle message deletion events
      if (event.event.type === 'message' && event.event.subtype === 'message_deleted') {
        console.log('🗑️ Message deleted in Slack:', event.event.deleted_ts);
        await handleSlackMessageDeletion(event.event);
      } else if (event.event.type === 'message') {
        console.log('📝 Other message event - subtype:', event.event.subtype || 'none');
      }
    }
    
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('❌ Error handling Slack event:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle Slack message deletion
async function handleSlackMessageDeletion(event) {
  try {
    const deletedTimestamp = event.deleted_ts;
    console.log('🔍 Looking for post with Slack timestamp:', deletedTimestamp);
    
    // Get database connection
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    const dbPath = process.env.DB_PATH || './data.sqlite';
    
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    // Find the post associated with this Slack message
    const query = `
      SELECT p.id, p.userId, p.content, p.platform 
      FROM posts p 
      JOIN slack_message_timestamps smt ON p.id = smt.postId 
      WHERE smt.slackTimestamp = ?
    `;
    
    const post = await db.get(query, [deletedTimestamp]);
    
    if (!post) {
      console.log('⚠️ No post found for deleted Slack message:', deletedTimestamp);
      await db.close();
      return;
    }
    
    console.log('🎯 Found post to delete:', post.id, post.content.substring(0, 50) + '...');
    
    // Delete the post from the database
    await db.run('DELETE FROM posts WHERE id = ?', [post.id]);
    console.log('✅ Post deleted from webapp due to Slack message deletion:', post.id);
    
    // Also clean up the slack_message_timestamps entry
    await db.run('DELETE FROM slack_message_timestamps WHERE postId = ?', [post.id]);
    console.log('🧹 Cleaned up Slack timestamp for post:', post.id);
    
    await db.close();
  } catch (error) {
    console.error('❌ Error in handleSlackMessageDeletion:', error);
  }
}

// Serve test page
app.get('/slack-test', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Slack Preferences Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .container { max-width: 500px; margin: 0 auto; }
        .checkbox-group { margin: 10px 0; }
        button { padding: 10px 20px; margin: 10px 0; background: #007cba; color: white; border: none; cursor: pointer; }
        button:hover { background: #005a87; }
        .status { margin: 10px 0; padding: 10px; background: #f0f0f0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Slack Notification Preferences</h1>
        
        <div class="checkbox-group">
            <label>
                <input type="checkbox" id="scheduled" checked> When a post is scheduled
            </label>
        </div>
        
        <div class="checkbox-group">
            <label>
                <input type="checkbox" id="published" checked> When a post is published
            </label>
        </div>
        
        <div class="checkbox-group">
            <label>
                <input type="checkbox" id="failed" checked> When a post fails to publish
            </label>
        </div>
        
        <button onclick="savePreferences()">Save Preferences</button>
        <button onclick="loadPreferences()">Load Current Settings</button>
        
        <div id="status" class="status"></div>
    </div>

    <script>
        const token = localStorage.getItem('auth_token');
        
        async function savePreferences() {
            const scheduled = document.getElementById('scheduled').checked;
            const published = document.getElementById('published').checked;
            const failed = document.getElementById('failed').checked;
            
            console.log('Saving:', { scheduled, published, failed });
            document.getElementById('status').innerHTML = 'Saving...';
            
            try {
                const response = await fetch('/api/slack/preferences', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                    },
                    body: JSON.stringify({
                        slackScheduled: scheduled,
                        slackPublished: published,
                        slackFailed: failed
                    })
                });
                
                const result = await response.json();
                console.log('Result:', result);
                
                if (response.ok) {
                    document.getElementById('status').innerHTML = '✅ Settings saved successfully!';
                } else {
                    document.getElementById('status').innerHTML = '❌ Error: ' + result.error;
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('status').innerHTML = '❌ Network error';
            }
        }
        
        async function loadPreferences() {
            document.getElementById('status').innerHTML = 'Loading...';
            
            try {
                const response = await fetch('/api/slack/settings', {
                    headers: {
                        'Authorization': \`Bearer \${token}\`
                    }
                });
                
                const result = await response.json();
                console.log('Current settings:', result);
                
                if (response.ok && result.configured) {
                    document.getElementById('scheduled').checked = result.slackScheduled ?? true;
                    document.getElementById('published').checked = result.slackPublished ?? true;
                    document.getElementById('failed').checked = result.slackFailed ?? true;
                    document.getElementById('status').innerHTML = '✅ Settings loaded';
                } else {
                    document.getElementById('status').innerHTML = '❌ No settings found';
                }
            } catch (error) {
                console.error('Error:', error);
                document.getElementById('status').innerHTML = '❌ Network error';
            }
        }
        
        // Load settings on page load
        if (token) {
            loadPreferences();
        } else {
            document.getElementById('status').innerHTML = '❌ No auth token found. Please login first.';
        }
    </script>
</body>
</html>`);
});

// Start post scheduler
startPostScheduler();

// Start server with automatic port finding
async function startServer() {
  try {
    const availablePort = await findFreePort(port);
    app.listen(availablePort, () => {
      console.log(`Server running on port ${availablePort}`);
      console.log(`\n🔗 For Slack Events Webhook, use: http://localhost:${availablePort}/api/slack/events`);
      console.log(`📝 With ngrok: ngrok http ${availablePort}, then use the ngrok URL + /api/slack/events\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
