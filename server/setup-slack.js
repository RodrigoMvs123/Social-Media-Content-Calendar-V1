const { Pool } = require('pg');
require('dotenv').config();

async function setupSlackForUser() {
  const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    const userId = 2; // Current user ID from logs
    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelId = process.env.SLACK_CHANNEL_ID;
    
    console.log('Setting up Slack for user:', userId);
    console.log('Bot Token:', botToken ? 'Present' : 'Missing');
    console.log('Channel ID:', channelId || 'Missing');
    
    if (!botToken || !channelId) {
      console.error('Missing Slack environment variables');
      return;
    }
    
    // Insert or update Slack settings
    const result = await db.query(`
      INSERT INTO slack_settings (user_id, bot_token, channel_id, channel_name, is_active, slack_scheduled, slack_published, slack_failed, created_at, updated_at)
      VALUES ($1, $2, $3, '#social', true, true, true, true, NOW(), NOW())
      ON CONFLICT (user_id) DO UPDATE SET
        bot_token = EXCLUDED.bot_token,
        channel_id = EXCLUDED.channel_id,
        channel_name = EXCLUDED.channel_name,
        is_active = EXCLUDED.is_active,
        slack_scheduled = EXCLUDED.slack_scheduled,
        slack_published = EXCLUDED.slack_published,
        slack_failed = EXCLUDED.slack_failed,
        updated_at = EXCLUDED.updated_at
    `, [userId, botToken, channelId]);
    
    console.log('✅ Slack settings configured for user:', userId);
    
    // Verify the settings
    const checkResult = await db.query('SELECT * FROM slack_settings WHERE user_id = $1', [userId]);
    console.log('✅ Verified settings:', {
      hasSettings: checkResult.rows.length > 0,
      isActive: checkResult.rows[0]?.is_active,
      hasToken: !!checkResult.rows[0]?.bot_token,
      hasChannel: !!checkResult.rows[0]?.channel_id,
      slackScheduled: checkResult.rows[0]?.slack_scheduled,
      slackPublished: checkResult.rows[0]?.slack_published,
      slackFailed: checkResult.rows[0]?.slack_failed
    });
    
    await db.end();
  } catch (error) {
    console.error('❌ Error setting up Slack:', error.message);
    process.exit(1);
  }
}

setupSlackForUser();