const express = require('express');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

// Create router
const router = express.Router();

// Get database connection from environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for some hosted PostgreSQL services
  }
});

// Create users table if it doesn't exist
router.use(async (req, res, next) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        createdat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table check completed');
    next();
  } catch (error) {
    console.error('Error creating users table:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log('Register request received:', { name, email });
    
    // Check if user already exists
    const userCheck = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userCheck.rows.length > 0) {
      console.log('User already exists:', email);
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user into database with timestamps
    const now = new Date().toISOString();
    const result = await pool.query(
      'INSERT INTO users (name, email, password, createdat, updatedat) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email',
      [name, email, hashedPassword, now, now]
    );
    
    // Set session
    req.session.userId = result.rows[0].id;
    
    console.log('User registered successfully:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Login request received:', { email });
    
    // Find user by email
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    console.log('User found in database:', { id: user.id, email: user.email });
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    console.log('Password validation result:', validPassword);
    
    if (!validPassword) {
      console.log('Invalid password for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.userId = user.id;
    console.log('Session set with userId:', user.id);
    
    // Don't send password back
    delete user.password;
    
    console.log('User logged in successfully:', user);
    res.json(user);
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user endpoint
router.get('/me', async (req, res) => {
  try {
    const userId = req.session.userId;
    console.log('Get current user request, session userId:', userId);
    
    if (!userId) {
      console.log('No user in session');
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    // Find user by id
    const result = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      console.log('User not found for id:', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('Current user found:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  console.log('Logout request received');
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Failed to logout' });
    }
    
    console.log('User logged out successfully');
    res.json({ success: true });
  });
});

module.exports = router;