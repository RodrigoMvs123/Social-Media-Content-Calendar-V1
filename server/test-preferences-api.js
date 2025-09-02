const express = require('express');
const dotenv = require('dotenv');
dotenv.config();

// Test the preferences API endpoints
async function testPreferencesAPI() {
  console.log('🧪 Testing notification preferences API...');
  
  // Simulate the API calls that the frontend makes
  const testUserId = 1;
  
  // Mock request/response objects
  const mockReq = {
    userId: testUserId,
    body: {
      slackScheduled: true,
      slackPublished: false,
      slackFailed: true
    }
  };
  
  const mockRes = {
    json: (data) => {
      console.log('📤 Response:', JSON.stringify(data, null, 2));
      return mockRes;
    },
    status: (code) => {
      console.log(`📊 Status: ${code}`);
      return mockRes;
    }
  };
  
  // Test with SQLite
  process.env.DB_TYPE = 'sqlite';
  
  try {
    // Import the slack routes to test the functions
    const slackRoutes = require('./slack-routes');
    
    console.log('✅ Slack routes loaded');
    console.log('🔧 The preferences endpoint should be working');
    console.log('🔧 Frontend should call: POST /api/slack/preferences');
    console.log('🔧 With body:', JSON.stringify(mockReq.body, null, 2));
    
    // Check if the database has the right structure
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    const db = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    // Check table structure
    const pragma = await db.all("PRAGMA table_info(slack_settings)");
    console.log('📋 Current table structure:');
    pragma.forEach(col => {
      console.log(`   - ${col.name}: ${col.type}`);
    });
    
    // Check if notification columns exist
    const notifCols = ['slackScheduled', 'slackPublished', 'slackFailed'];
    const existingCols = pragma.map(p => p.name);
    
    console.log('🔔 Notification columns status:');
    notifCols.forEach(col => {
      const exists = existingCols.includes(col);
      console.log(`   - ${col}: ${exists ? '✅' : '❌'}`);
    });
    
    await db.close();
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPreferencesAPI().catch(console.error);