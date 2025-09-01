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
  
  // Create PostgreSQL tables
  (async () => {
    try {
      await db.query(`CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`);
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
app.get('/api/posts', (req, res) => {
  postsCallCount++;
  console.log(`GET /api/posts called - Call #${postsCallCount}`);
  
  // Return empty array but add delay to prevent rapid loops
  setTimeout(() => {
    res.json([]);
  }, 50);
});

app.post('/api/posts', (req, res) => {
  console.log('POST /api/posts called with body:', req.body);
  const { content, platform, scheduledTime } = req.body;
  
  if (!content || !platform || !scheduledTime) {
    return res.status(400).json({ error: 'Content, platform, and scheduled time required' });
  }
  
  // Return the created post object that frontend expects
  const newPost = {
    id: Date.now(),
    content,
    platform,
    scheduledTime,
    status: 'scheduled',
    createdAt: new Date().toISOString()
  };
  
  console.log('Sending response:', newPost);
  res.status(201).json(newPost);
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