const express = require('express');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
dotenv.config();

// Test the actual API endpoints
async function testAPIEndpoints() {
  console.log('🧪 Testing Slack API endpoints...');
  
  // Create a proper JWT token
  const token = jwt.sign(
    { userId: 1, email: 'demo@example.com' },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );
  
  console.log('🔑 Using JWT token:', token.substring(0, 50) + '...');
  
  const baseUrl = 'http://localhost:3001'; // Adjust if different
  
  try {
    // Test 1: Get Slack settings
    console.log('\n📥 Testing GET /api/slack/settings...');
    const settingsResponse = await fetch(`${baseUrl}/api/slack/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', settingsResponse.status);
    const settingsData = await settingsResponse.text();
    console.log('Response:', settingsData);
    
    // Test 2: Save preferences
    console.log('\n📤 Testing POST /api/slack/preferences...');
    const prefsResponse = await fetch(`${baseUrl}/api/slack/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        slackScheduled: true,
        slackPublished: false,
        slackFailed: true
      })
    });
    
    console.log('Status:', prefsResponse.status);
    const prefsData = await prefsResponse.text();
    console.log('Response:', prefsData);
    
    // Test 3: Get settings again to see if saved
    console.log('\n📥 Testing GET /api/slack/settings again...');
    const settingsResponse2 = await fetch(`${baseUrl}/api/slack/settings`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', settingsResponse2.status);
    const settingsData2 = await settingsResponse2.text();
    console.log('Response:', settingsData2);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Only run if server is running
if (process.argv[2] === 'test') {
  testAPIEndpoints().catch(console.error);
} else {
  console.log('Run with: node debug-api-calls.js test');
  console.log('Make sure server is running on localhost:3001');
}