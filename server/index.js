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
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from client build in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
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

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Get current user info
app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    let user;
    
    if (dbType === 'sqlite') {
      user = await new Promise((resolve, reject) => {
        db.get('SELECT id, name, email FROM users WHERE id = ?', [req.user.userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    } else {
      const result = await db.query('SELECT id, name, email FROM users WHERE id = $1', [req.user.userId]);
      user = result.rows[0];
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      id: user.id,
      name: user.name,
      email: user.email
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Calendar/Posts routes
app.get('/api/calendar', authenticateToken, (req, res) => {
  res.json([]);
});

app.get('/api/posts', authenticateToken, (req, res) => {
  res.json([]);
});

app.post('/api/posts', authenticateToken, (req, res) => {
  const { content, platform, scheduledTime } = req.body;
  
  if (!content || !platform || !scheduledTime) {
    return res.status(400).json({ error: 'Content, platform, and scheduled time required' });
  }
  
  res.json({ 
    success: true, 
    id: Date.now(),
    message: 'Post created successfully'
  });
});

// Handle React Router (return index.html for non-API routes)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    }
  });
}

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${port}`);
  console.log(`🌐 Health check: http://localhost:${port}/api/health`);
});

module.exports = app;