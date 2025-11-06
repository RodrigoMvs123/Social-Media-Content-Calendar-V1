const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Create router
const router = express.Router();

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-key';

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET not found in environment, using fallback');
}

// Initialize database based on type
(async () => {
  try {
    if (dbType === 'sqlite') {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      console.log('✅ SQLite connected for auth routes');
      
      // Create users table
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        );
      `);
      console.log('✅ Users table ready');
      
    } else {
      const { Pool } = require('pg');
      db = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      console.log('✅ PostgreSQL connected for auth routes');
      
      // Create users table
      await db.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Users table ready');
    }
  } catch (error) {
    console.error('❌ Error setting up auth database:', error);
  }
})();

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    if (!db) {
      console.error('❌ Database not initialized for register');
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const { name, email, password } = req.body;
    console.log('Register request received:', { name, email });
    
    // Check if user already exists
    let existingUser;
    if (dbType === 'sqlite') {
      existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);
    } else {
      const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
      existingUser = result.rows[0];
    }
    
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert user
    let newUser;
    const now = new Date().toISOString();
    
    if (dbType === 'sqlite') {
      const result = await db.run(
        'INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, now, now]
      );
      newUser = await db.get('SELECT id, name, email FROM users WHERE id = ?', result.lastID);
    } else {
      const result = await db.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email',
        [name, email, hashedPassword]
      );
      newUser = result.rows[0];
    }
    
    // Generate token
    const token = generateToken(newUser);
    
    console.log('User registered successfully:', newUser);
    res.status(201).json({
      success: true,
      user: newUser,
      token
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Registration error' });
  }
});

// Import Universal Authentication Service
const { CrossDatabaseAuthService } = require('./services/CrossDatabaseAuthService');
const universalAuth = new CrossDatabaseAuthService();

// Login endpoint with Universal Authentication
router.post('/login', async (req, res) => {
  try {
    if (!JWT_SECRET) {
      console.error('❌ JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const { email, password } = req.body;
    console.log('🔍 Universal login request:', { email });
    
    // Use Universal Authentication
    const authResult = await universalAuth.authenticateUser(email, password);
    
    if (authResult.success) {
      // Generate token
      const token = generateToken(authResult.user);
      
      console.log(`✅ Universal login successful: ${email} (${authResult.source}${authResult.migrated ? ' - migrated' : ''})`);
      
      res.json({
        success: true,
        user: authResult.user,
        token,
        source: authResult.source,
        migrated: authResult.migrated,
        message: authResult.message
      });
    } else {
      console.log(`❌ Universal login failed: ${email} - ${authResult.error}`);
      res.status(401).json({ error: authResult.error });
    }
  } catch (error) {
    console.error('❌ Universal login error:', error);
    res.status(500).json({ error: 'Authentication error' });
  }
});

// Get current user endpoint (for token verification)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.userId;
    
    // Get user from database
    let user;
    if (dbType === 'sqlite') {
      user = await db.get('SELECT id, name, email FROM users WHERE id = ?', userId);
    } else {
      const result = await db.query('SELECT id, name, email FROM users WHERE id = $1', [userId]);
      user = result.rows[0];
    }
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;