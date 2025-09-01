const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const port = parseInt(process.env.PORT || '3001', 10);

console.log('Starting Social Media Content Calendar Server...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Database Type: ${process.env.DB_TYPE || 'sqlite'}`);

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

// Basic route for testing
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running!' });
});

// Authentication routes
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  // Simple mock authentication for now
  if (email && password) {
    res.json({
      success: true,
      user: {
        id: 1,
        email: email,
        name: 'Demo User'
      },
      token: 'demo-jwt-token'
    });
  } else {
    res.status(400).json({ error: 'Email and password required' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { name, email, password } = req.body;
  
  if (name && email && password) {
    res.json({
      success: true,
      user: {
        id: 1,
        email: email,
        name: name
      },
      token: 'demo-jwt-token'
    });
  } else {
    res.status(400).json({ error: 'Name, email and password required' });
  }
});

// Calendar/Posts routes
app.get('/api/calendar', (req, res) => {
  res.json([]);
});

app.get('/api/posts', (req, res) => {
  res.json([]);
});

app.post('/api/posts', (req, res) => {
  res.json({ success: true, id: Date.now() });
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