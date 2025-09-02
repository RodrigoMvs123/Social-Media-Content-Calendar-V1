// Simple test to verify Slack webhook connectivity
const express = require('express');
const app = express();

app.use(express.json());

// Test endpoint that Slack should be able to reach
app.post('/api/slack/events', (req, res) => {
  console.log('🔥 WEBHOOK TEST RECEIVED!');
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Handle URL verification
  if (req.body.type === 'url_verification') {
    console.log('✅ URL Verification Challenge:', req.body.challenge);
    return res.json({ challenge: req.body.challenge });
  }
  
  res.status(200).send('OK');
});

// Test GET endpoint
app.get('/api/slack/events', (req, res) => {
  res.json({
    message: 'Slack webhook endpoint is ready',
    timestamp: new Date().toISOString(),
    instructions: [
      '1. Go to api.slack.com/apps',
      '2. Select your app',
      '3. Event Subscriptions → Enable',
      '4. Request URL: https://social-media-content-calendar-v1.onrender.com/api/slack/events',
      '5. Subscribe to: message.channels, message.groups',
      '6. Save and reinstall app'
    ]
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🧪 Slack webhook test server running on port ${PORT}`);
  console.log(`🔗 Test URL: http://localhost:${PORT}/api/slack/events`);
});

module.exports = app;