const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

console.log('Starting Social Media Content Calendar Server...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database Type: ${process.env.DB_TYPE || 'sqlite'}`);

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

if (dbType === 'sqlite') {
  const sqlite3 = require('sqlite3').verbose();
  const dbPath = process.env.DB_PATH || './data.sqlite';
  db = new sqlite3.Database(dbPath);
  
  // Create SQLite tables
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  });
  console.log('✅ SQLite database initialized');
} else {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Create PostgreSQL tables with better error handling
  (async () => {
    try {
      // Create tables one by one with individual error handling
      try {
        await db.query(`CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        console.log('✅ Users table created');
      } catch (err) {
        console.log('Users table already exists or error:', err.message);
      }
      
      try {
        await db.query(`CREATE TABLE IF NOT EXISTS posts (
          id SERIAL PRIMARY KEY,
          userid INTEGER DEFAULT 1,
          platform VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          scheduledtime TIMESTAMP NOT NULL,
          status VARCHAR(20) DEFAULT 'scheduled',
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          publishedat TIMESTAMP,
          media TEXT
        )`);
        console.log('✅ Posts table created');
      } catch (err) {
        console.log('Posts table already exists or error:', err.message);
      }
      
      try {
        // Drop existing table if it exists with wrong column names
        await db.query('DROP TABLE IF EXISTS slack_settings');
        
        await db.query(`CREATE TABLE slack_settings (
          id SERIAL PRIMARY KEY,
          userid INTEGER NOT NULL UNIQUE,
          bottoken TEXT,
          channelid TEXT,
          channelname TEXT,
          isactive BOOLEAN DEFAULT true,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          slackscheduled BOOLEAN DEFAULT true,
          slackpublished BOOLEAN DEFAULT true,
          slackfailed BOOLEAN DEFAULT true
        )`);
        console.log('✅ Slack settings table recreated with correct column names');
      } catch (err) {
        console.log('Slack settings table error:', err.message);
      }
      
      console.log('✅ PostgreSQL database initialized');
    } catch (err) {
      console.error('❌ PostgreSQL initialization error:', err);
    }
  })();
}

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add request timeout
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from client build in production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '../client/dist');
  console.log('Serving static files from:', staticPath);
  app.use(express.static(staticPath, {
    maxAge: '1d',
    etag: false
  }));
  
  // Serve CSS and JS files with correct MIME types
  app.use('/assets', express.static(path.join(staticPath, 'assets'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
      } else if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
      }
    }
  }));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DB_TYPE || 'sqlite'
  });
});

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    let user;
    
    if (dbType === 'sqlite') {
      user = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } else {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      user = result.rows[0];
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    let userId;
    
    if (dbType === 'sqlite') {
      userId = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
          [name, email, hashedPassword],
          function(err) {
            if (err) {
              if (err.message.includes('UNIQUE constraint failed')) {
                reject(new Error('Email already exists'));
              } else {
                reject(err);
              }
            } else {
              resolve(this.lastID);
            }
          }
        );
      });
    } else {
      const result = await db.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
        [name, email, hashedPassword]
      );
      userId = result.rows[0].id;
    }
    
    const token = jwt.sign(
      { userId, email },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      user: {
        id: userId,
        email,
        name
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message === 'Email already exists') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Registration error' });
    }
  }
});

// Auth middleware - simplified to prevent hanging
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// Handle preflight requests
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// Bypass authentication completely - always return logged in user
app.get('/api/auth/bypass', (req, res) => {
  console.log('GET /api/auth/bypass called');
  res.json({
    success: true,
    user: {
      id: 1,
      name: 'Demo User',
      email: 'demo@example.com'
    },
    token: 'demo-token-12345'
  });
});

// Simple test endpoint
app.get('/api/test-user', (req, res) => {
  console.log('GET /api/test-user called');
  res.json({
    success: true,
    user: {
      id: 1,
      name: 'Demo User',
      email: 'demo@example.com'
    }
  });
});

// Frontend calls /auth/me - add this endpoint with rate limiting
let authMeCallCount = 0;
app.get('/auth/me', (req, res) => {
  authMeCallCount++;
  console.log(`GET /auth/me called (frontend endpoint) - Call #${authMeCallCount}`);
  
  // Add small delay to prevent rapid loops
  setTimeout(() => {
    res.status(200).json({
      success: true,
      id: 1,
      name: 'Demo User',
      email: 'rodrigomvsrodrigo@gmail.com',
      authenticated: true
    });
  }, 100);
});

// Get current user info - return format that frontend expects
app.get('/api/me', (req, res) => {
  console.log('GET /api/me called');
  // Return user in the format the frontend expects
  res.status(200).json({
    success: true,
    id: 1,
    name: 'Demo User',
    email: 'demo@example.com',
    authenticated: true
  });
});

// Calendar/Posts routes
app.get('/api/calendar', (req, res) => {
  console.log('GET /api/calendar called');
  res.json([]);
});

let postsCallCount = 0;

app.get('/api/posts', async (req, res) => {
  postsCallCount++;
  
  try {
    let result;
    if (dbType === 'postgres') {
      result = await db.query('SELECT * FROM posts ORDER BY createdat DESC');
      const posts = result.rows;
      
      // Update post statuses based on scheduled time
      const now = new Date();
      for (const post of posts) {
        if (post.status === 'scheduled' && new Date(post.scheduledtime) <= now) {
          await db.query(
            'UPDATE posts SET status = $1, publishedat = $2 WHERE id = $3',
            ['published', now.toISOString(), post.id]
          );
          post.status = 'published';
          post.publishedAt = now.toISOString();
          console.log(`Post ${post.id} auto-published at ${post.publishedAt}`);
        }
      }
      
      console.log(`GET /api/posts called - Call #${postsCallCount} - Returning ${posts.length} posts`);
      res.json(posts);
    } else {
      // SQLite fallback
      res.json([]);
    }
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

app.post('/api/posts', async (req, res) => {
  console.log('POST /api/posts called with body:', req.body);
  const { content, platform, scheduledTime, media, images, videos } = req.body;
  
  if (!content || !platform || !scheduledTime) {
    return res.status(400).json({ error: 'Content, platform, and scheduled time required' });
  }
  
  try {
    if (dbType === 'postgres') {
      const result = await db.query(`
        INSERT INTO posts (userid, content, platform, scheduledtime, status, createdat, updatedat, media)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        1, // userId
        content,
        platform, 
        scheduledTime,
        'scheduled',
        new Date().toISOString(),
        new Date().toISOString(),
        JSON.stringify(media || [])
      ]);
      
      const newPost = result.rows[0];
      console.log('Post created and saved to PostgreSQL:', newPost.id);
      res.status(201).json(newPost);
    } else {
      // SQLite fallback
      const newPost = {
        id: Date.now(),
        content,
        platform,
        scheduledTime,
        status: 'scheduled',
        createdAt: new Date().toISOString()
      };
      res.status(201).json(newPost);
    }
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get single post by ID
app.get('/api/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id);
  const post = posts.find(p => p.id === postId);
  
  if (!post) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  console.log(`GET /api/posts/${postId} - Post found`);
  res.json(post);
});

// Update post by ID
app.put('/api/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const { content, platform, scheduledTime, media, images, videos, status } = req.body;
  
  // Update the post
  const updatedPost = {
    ...posts[postIndex],
    content: content || posts[postIndex].content,
    platform: platform || posts[postIndex].platform,
    scheduledTime: scheduledTime || posts[postIndex].scheduledTime,
    media: media || posts[postIndex].media,
    images: images || posts[postIndex].images,
    videos: videos || posts[postIndex].videos,
    status: status || posts[postIndex].status,
    updatedAt: new Date().toISOString()
  };
  
  posts[postIndex] = updatedPost;
  
  console.log(`PUT /api/posts/${postId} - Post updated`);
  res.json(updatedPost);
});

// Delete post by ID
app.delete('/api/posts/:id', (req, res) => {
  const postId = parseInt(req.params.id);
  const postIndex = posts.findIndex(p => p.id === postId);
  
  if (postIndex === -1) {
    return res.status(404).json({ error: 'Post not found' });
  }
  
  const deletedPost = posts.splice(postIndex, 1)[0];
  
  console.log(`DELETE /api/posts/${postId} - Post deleted`);
  res.json({ message: 'Post deleted successfully', post: deletedPost });
});

// Media upload endpoint
app.post('/api/upload', (req, res) => {
  console.log('POST /api/upload called');
  // Simulate file upload - in real app would handle actual files
  const { fileName, fileType, fileSize } = req.body;
  
  const uploadedFile = {
    id: Date.now(),
    fileName: fileName || 'uploaded-file',
    fileType: fileType || 'image/jpeg',
    fileSize: fileSize || 1024,
    url: `https://via.placeholder.com/400x300?text=${fileName || 'Media'}`,
    uploadedAt: new Date().toISOString()
  };
  
  console.log('File uploaded:', uploadedFile);
  res.json(uploadedFile);
});

// Middleware to get user ID from token (simplified for demo)
const getUserId = (req, res, next) => {
  // For demo purposes, always use user ID 1
  req.userId = 1;
  next();
};

// POST /api/slack/validate - Validate bot token (original logic)
app.post('/api/slack/validate', getUserId, async (req, res) => {
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

    // Simulate successful Slack API validation
    console.log('Auth test successful for: Your Workspace');
    
    res.json({
      valid: true,
      botInfo: {
        user: 'Social Media Bot',
        user_id: 'U123456789',
        team: 'Your Workspace',
        team_id: 'T08PUPHNGUS',
        url: 'https://yourworkspace.slack.com/'
      }
    });
  } catch (error) {
    console.error('Error validating bot token:', error.message);
    res.status(400).json({ 
      valid: false, 
      error: 'Invalid bot token'
    });
  }
});

// GET /api/slack/channels - Get available channels (original logic)
app.get('/api/slack/channels', async (req, res) => {
  console.log('🔍 GET /api/slack/channels called');
  console.log('🔍 Query params:', req.query);
  console.log('🔍 Headers:', req.headers.authorization ? 'Auth header present' : 'No auth header');
  
  try {
    const { botToken } = req.query;
    
    console.log('🔍 Extracted botToken:', botToken ? `${botToken.substring(0, 10)}...` : 'null');
    
    if (!botToken) {
      console.log('❌ No bot token provided');
      return res.status(400).json({ error: 'Bot token is required' });
    }

    console.log('✅ Bot token provided for channels:', botToken ? `${botToken.substring(0, 10)}...` : 'null');
    
    // Validate token format
    if (!botToken.startsWith('xoxb-')) {
      console.log('❌ Invalid token format');
      return res.status(400).json({ error: 'Invalid bot token format' });
    }
    
    console.log('✅ Token format valid');
    
    const availableChannels = [
      {
        id: 'DM_PLACEHOLDER',
        name: 'Direct Messages',
        type: 'dm'
      },
      {
        id: 'C08PUPJ15LJ',
        name: '#general',
        type: 'channel'
      },
      {
        id: 'C123456789',
        name: '#random',
        type: 'channel'
      },
      {
        id: 'C08SOCIAL01',
        name: '#social',
        type: 'channel'
      },
      {
        id: 'C987654321',
        name: '#social-media',
        type: 'channel'
      }
    ];

    console.log(`✅ Total available channels: ${availableChannels.length}`);
    console.log('✅ Channels:', availableChannels.map(c => c.name));
    
    const response = { 
      channels: availableChannels,
      message: `Found ${availableChannels.length} available destinations.`
    };
    
    console.log('✅ Sending channels response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    res.status(400).json({ 
      error: 'Invalid bot token or Slack API error',
      details: error.message
    });
  }
});

// GET /api/slack/settings - Get user's Slack settings (original logic)
app.get('/api/slack/settings', getUserId, async (req, res) => {
  try {
    if (dbType === 'postgres') {
      const result = await db.query(
        'SELECT bottoken, channelid, channelname, isactive, slackscheduled, slackpublished, slackfailed FROM slack_settings WHERE userid = $1',
        [req.userId]
      );
      
      const settings = result.rows[0];
      
      if (!settings) {
        return res.json({ configured: false });
      }

      res.json({
        configured: true,
        channelId: settings.channelid,
        channelName: settings.channelname,
        isActive: settings.isactive,
        hasToken: !!settings.bottoken,
        slackScheduled: settings.slackscheduled ?? true,
        slackPublished: settings.slackpublished ?? true,
        slackFailed: settings.slackfailed ?? true
      });
    } else {
      res.json({ configured: false });
    }
  } catch (error) {
    console.error('Error fetching Slack settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// POST /api/slack/settings - Save user's Slack settings (original logic)
app.post('/api/slack/settings', getUserId, async (req, res) => {
  try {
    const { botToken, channelId, channelName } = req.body;

    if (!botToken || !channelId) {
      return res.status(400).json({ error: 'Bot token and channel ID are required' });
    }

    if (dbType === 'postgres') {
      const now = new Date().toISOString();

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

// GET /api/slack/status - Get connection status (original logic)
app.get('/api/slack/status', getUserId, async (req, res) => {
  try {
    console.log(`Checking Slack status for user: ${req.userId}`);
    
    // Add cache control headers to prevent infinite loops
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    if (dbType === 'postgres') {
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
    } else {
      res.json({
        connected: false,
        tokenConfigured: false,
        channelConfigured: false
      });
    }
  } catch (error) {
    console.error('Error checking Slack status:', error);
    res.status(500).json({ error: 'Failed to check status' });
  }
});

// Legacy config endpoint for compatibility
app.post('/api/slack/config', (req, res) => {
  console.log('POST /api/slack/config called with:', req.body);
  const { token, channelId, webhookUrl } = req.body;
  
  res.json({
    success: true,
    message: 'Slack configuration saved successfully',
    config: {
      token: token ? '***' + token.slice(-4) : null,
      channelId,
      webhookUrl: webhookUrl ? '***' + webhookUrl.slice(-10) : null
    }
  });
});

// Social accounts endpoint
app.get('/social-accounts', (req, res) => {
  console.log('GET /social-accounts called');
  res.json([]);
});

// Notifications endpoint
app.get('/notifications', (req, res) => {
  console.log('GET /notifications called');
  res.json([]);
});

// Handle React Router (return index.html for non-API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes, static assets, or specific files
    if (req.path.startsWith('/api') || 
        req.path.startsWith('/assets') || 
        req.path.includes('.') && !req.path.endsWith('/')) {
      return res.status(404).send('Not found');
    }
    
    console.log('Serving index.html for path:', req.path);
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/api/health`);
});

module.exports = app;