const { WebClient } = require('@slack/web-api');
require('dotenv').config();

async function testSlack() {
  try {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;
    
    console.log('Bot Token:', botToken ? `${botToken.substring(0, 10)}...` : 'Missing');
    console.log('Channel ID:', channelId || 'Missing');
    
    if (!botToken || !channelId) {
      console.error('Missing Slack configuration');
      return;
    }
    
    const slack = new WebClient(botToken);
    
    // Test auth
    const authTest = await slack.auth.test();
    console.log('Auth test successful:', authTest.team);
    
    // Send test message
    const result = await slack.chat.postMessage({
      channel: channelId,
      text: '🧪 Test message from Social Media Calendar - Slack integration is working!',
      mrkdwn: true
    });
    
    console.log('✅ Test message sent successfully:', result.ts);
    
  } catch (error) {
    console.error('❌ Slack test failed:', error.message);
    console.error('Error details:', error.data || error);
  }
}

testSlack();