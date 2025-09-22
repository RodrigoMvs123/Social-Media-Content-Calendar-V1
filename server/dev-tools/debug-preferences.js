const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Test the JWT token and user ID resolution
function debugPreferences() {
  console.log('🔍 Debugging notification preferences...');
  
  // Test JWT token creation (like the server does)
  const testToken = jwt.sign(
    { userId: 1, email: 'demo@example.com' },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );
  
  console.log('🔑 Test JWT token:', testToken);
  
  // Test JWT token verification
  try {
    const decoded = jwt.verify(testToken, process.env.JWT_SECRET || 'fallback-secret');
    console.log('✅ JWT decoded:', decoded);
    console.log('👤 User ID from token:', decoded.userId || decoded.id);
  } catch (error) {
    console.error('❌ JWT verification failed:', error.message);
  }
  
  // Test the getUserId middleware logic
  const mockAuthHeader = `Bearer ${testToken}`;
  const token = mockAuthHeader.replace('Bearer ', '');
  
  console.log('🔧 Extracted token:', token);
  
  try {
    const user = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const userId = user.userId || user.id;
    console.log('✅ Resolved user ID:', userId);
  } catch (error) {
    console.error('❌ Token extraction failed:', error.message);
  }
}

debugPreferences();