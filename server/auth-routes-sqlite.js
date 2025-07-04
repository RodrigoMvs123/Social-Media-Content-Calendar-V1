const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Create router
const router = express.Router();

// Get database path and JWT secret from environment
const dbPath = process.env.DB_PATH || './data.sqlite';
const JWT_SECRET = process.env.JWT_SECRET || '9d16c4f7cdddbbc7c9b3d204b3ef540abc47a5d36a6c93502fba3cd9f1815cce';

// Initialize SQLite database connection
let db;
(async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established for auth routes');
    
    // Create users table if it doesn't exist
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
    console.log('Users table ready');
    
    // Create test user if none exists
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCount.count === 0) {
      const hashedPassword = await bcrypt.hash('password', 10);
      const now = new Date().toISOString();
      await db.run(
        'INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        ['Test User', 'test@example.com', hashedPassword, now, now]
      );
      console.log('Created default test user: test@example.com / password');
    }
  } catch (error) {
    console.error('Error setting up SQLite for auth:', error);
  }
})();

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const { name, email, password } = req.body;
    console.log('Register request received:', { name, email });
    
    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', email);
    
    if (existingUser) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user into database with timestamps
    const now = new Date().toISOString();
    const result = await db.run(
      'INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, now, now]
    );
    
    const newUser = await db.get('SELECT id, name, email FROM users WHERE id = ?', result.lastID);
    
    console.log('User registered successfully:', newUser);
    res.status(201).json({
      user: newUser,
      message: 'User registered successfully. Please log in with your credentials.'
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const { email, password } = req.body;
    console.log('Login request received:', { email });
    
    // Find user by email
    const user = await db.get('SELECT * FROM users WHERE email = ?', email);
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log('User found in database:', { id: user.id, email: user.email });
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', validPassword);
    
    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Generate JWT token
    const token = generateToken(user);
    
    // Don't send password back
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email
    };
    
    console.log('User logged in successfully:', userResponse);
    res.json({
      user: userResponse,
      token
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Token verified:', decoded);
      
      // Find user by id
      const user = await db.get('SELECT id, name, email FROM users WHERE id = ?', decoded.id);
      
      if (!user) {
        console.log('User not found for id:', decoded.id);
        return res.status(404).json({ error: 'User not found' });
      }
      
      console.log('Current user found:', user);
      res.json(user);
    } catch (err) {
      console.error('Token verification failed:', err);
      return res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint (client-side only with JWT)
router.post('/logout', (req, res) => {
  console.log('Logout request received (JWT - handled client-side)');
  res.json({ success: true });
});

module.exports = router;