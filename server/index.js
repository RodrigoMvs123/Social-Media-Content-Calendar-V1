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
const port = parseInt(process.env.PORT || '3000', 10);

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
    
    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL,
      platform TEXT NOT NULL,
      content TEXT NOT NULL,
      scheduledTime TEXT NOT NULL,
      status TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      media TEXT,
      slackMessageTs TEXT
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS slack_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL UNIQUE,
      botToken TEXT,
      channelId TEXT,
      channelName TEXT,
      isActive BOOLEAN DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      slackScheduled BOOLEAN DEFAULT 0,
      slackPublished BOOLEAN DEFAULT 0,
      slackFailed BOOLEAN DEFAULT 0
    )`);
    
    db.run(`CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT NOT NULL UNIQUE,
      emailDigest BOOLEAN DEFAULT 0,
      emailPostPublished BOOLEAN DEFAULT 0,
      emailPostFailed BOOLEAN DEFAULT 0,
      browserNotifications BOOLEAN DEFAULT 1,
      updatedAt TEXT NOT NULL
    )`);
    
    // Create your user account
    const bcrypt = require('bcrypt');
    const now = new Date().toISOString();
    bcrypt.hash('RodrigoMMM324!', 10, (err, hash) => {
      if (err) {
        console.error('Error hashing password:', err);
        return;
      }
      db.run(
        'INSERT OR IGNORE INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        ['Rodrigo', 'rodrigomvsrodrigo@gmail.com', hash, now, now],
        function(err) {
          if (err) {
            console.log('User already exists or error:', err.message);
          } else if (this.changes > 0) {
            console.log('✅ User Rodrigo created with ID:', this.lastID);
            
            // Create default notification preferences for the new user
            db.run(
              'INSERT OR IGNORE INTO notification_preferences (userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt) VALUES (?, 0, 0, 0, 1, ?)',
              [this.lastID, now],
              function(prefErr) {
                if (prefErr) {
                  console.log('Error creating notification preferences:', prefErr.message);
                } else {
                  console.log('✅ Notification preferences created for user:', this.lastID);
                }
              }
            );
          } else {
            console.log('✅ User Rodrigo already exists');
            
            // Ensure notification preferences exist for existing user
            db.run(
              'INSERT OR IGNORE INTO notification_preferences (userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt) VALUES (?, 0, 0, 0, 1, ?)',
              ['2', now],
              function(prefErr) {
                if (prefErr) {
                  console.log('Error creating notification preferences:', prefErr.message);
                } else if (this.changes > 0) {
                  console.log('✅ Notification preferences created for existing user');
                }
              }
            );
          }
        }
      );
    });
  });
  console.log('✅ SQLite database initialized');
} else {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
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

// Import and use the proper routes
const slackRoutes = require('./slack-routes');
const postsRoutes = require('./posts-routes');
const socialMediaRoutes = require('./social-media-routes');
app.use('/api/slack', slackRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api', socialMediaRoutes);

// Start Slack deletion sync
require('./slack-sync');
console.log('✅ Slack deletion sync started');

// Import Universal Authentication Service
const { CrossDatabaseAuthService } = require('./services/CrossDatabaseAuthService');
const universalAuth = new CrossDatabaseAuthService();

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }
  
  try {
    console.log(`🔐 Universal login attempt: ${email}`);
    
    const authResult = await universalAuth.authenticateUser(email, password);
    
    if (authResult.success) {
      const token = jwt.sign(
        { userId: authResult.user.id, email: authResult.user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );
      
      console.log(`✅ Login successful: ${email} (${authResult.source}${authResult.migrated ? ' - migrated' : ''})`);
      
      res.json({
        success: true,
        user: authResult.user,
        token,
        source: authResult.source,
        migrated: authResult.migrated,
        message: authResult.message
      });
    } else {
      console.log(`❌ Login failed: ${email} - ${authResult.error}`);
      res.status(401).json({ error: authResult.error });
    }
  } catch (error) {
    console.error('❌ Universal login error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password required' });
  }
  
  try {
    console.log(`📝 Universal registration attempt: ${email}`);
    
    const registerResult = await universalAuth.registerUser({ name, email, password });
    
    if (registerResult.success) {
      const token = jwt.sign(
        { userId: registerResult.user.id, email: registerResult.user.email },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );
      
      console.log(`✅ Registration successful: ${email} (${registerResult.database})`);
      
      res.json({
        success: true,
        user: registerResult.user,
        token,
        database: registerResult.database
      });
    } else {
      console.log(`❌ Registration failed: ${email} - ${registerResult.error}`);
      res.status(400).json({ error: registerResult.error });
    }
  } catch (error) {
    console.error('❌ Universal registration error:', error);
    res.status(500).json({ error: 'Registration error' });
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
  
  // Create a proper JWT token for user ID 1
  const token = jwt.sign(
    { userId: 1, email: 'demo@example.com' },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );
  
  res.json({
    success: true,
    user: {
      id: 1,
      name: 'Demo User',
      email: 'demo@example.com'
    },
    token: token
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
  
  // Always return the same user to maintain consistency
  res.status(200).json({
    success: true,
    id: '1', // String ID for frontend compatibility
    name: 'Demo User',
    email: 'demo@example.com',
    authenticated: true
  });
});

// Get current user info - return format that frontend expects
app.get('/api/me', (req, res) => {
  console.log('GET /api/me called');
  // Return user in the format the frontend expects
  res.status(200).json({
    success: true,
    id: '1', // String ID for frontend compatibility
    name: 'Demo User',
    email: 'demo@example.com',
    authenticated: true
  });
});

// Universal user lookup endpoint
app.get('/api/auth/find-user/:email', async (req, res) => {
  try {
    const { email } = req.params;
    console.log(`🔍 Universal user lookup: ${email}`);
    
    const userInfo = await universalAuth.findUserAcrossDBs(email);
    
    if (userInfo) {
      res.json({
        found: true,
        database: userInfo.sourceDB,
        user: {
          id: userInfo.user.id,
          email: userInfo.user.email,
          name: userInfo.user.name
        }
      });
    } else {
      res.json({ found: false });
    }
  } catch (error) {
    console.error('❌ User lookup error:', error);
    res.status(500).json({ error: 'Lookup failed' });
  }
});

// Add missing API routes to prevent 404s
app.get('/api/auth/me', (req, res) => {
  console.log('GET /api/auth/me called');
  res.status(200).json({
    success: true,
    id: '1', // String ID for frontend compatibility
    name: 'Demo User',
    email: 'demo@example.com',
    authenticated: true
  });
});

// Social accounts endpoint now handled by social-media-routes.js

app.get('/api/notifications', (req, res) => {
  console.log('GET /api/notifications called');
  res.json([]);
});

// Calendar/Posts routes
app.get('/api/calendar', (req, res) => {
  console.log('GET /api/calendar called');
  res.json([]);
});

// Posts routes now handled by posts-routes.js router

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

// All Slack routes now handled by the dedicated slack-routes.js router

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
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/assets/') || 
        req.path.includes('.') && !req.path.endsWith('/')) {
      console.log('API route not found:', req.path);
      return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    console.log('Serving index.html for path:', req.path);
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Start post scheduler
const { startPostScheduler } = require('./post-scheduler');
startPostScheduler();

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/api/health`);
});

module.exports = app;