const jwt = require('jsonwebtoken');

// Get JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || '9d16c4f7cdddbbc7c9b3d204b3ef540abc47a5d36a6c93502fba3cd9f1815cce';

// Authentication middleware
function auth(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Add user data to request
    req.user = decoded;
    
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = auth;