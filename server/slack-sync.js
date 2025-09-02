const { WebClient } = require('@slack/web-api');

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

async function getDb() {
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');
  return await open({
    filename: process.env.DB_PATH || './data.sqlite',
    driver: sqlite3.Database
  });
}

if (dbType === 'postgres') {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

async function syncSlackDeletions() {
  try {
    // Get posts with Slack timestamps
    let posts = [];
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      posts = await database.all('SELECT id, slackMessageTs FROM posts WHERE slackMessageTs IS NOT NULL');
      await database.close();
    } else {
      const result = await db.query('SELECT id, slackmessagets FROM posts WHERE slackmessagets IS NOT NULL');
      posts = result.rows.map(row => ({ id: row.id, slackMessageTs: row.slackmessagets }));
    }

    if (posts.length === 0) return;

    // Get Slack settings
    let slackSettings;
    if (dbType === 'sqlite') {
      const database = await getDb();
      slackSettings = await database.get('SELECT botToken, channelId FROM slack_settings WHERE userId = 1');
      await database.close();
    } else {
      const result = await db.query('SELECT bottoken, channelid FROM slack_settings WHERE userid = 1');
      slackSettings = result.rows[0];
      if (slackSettings) {
        slackSettings = { botToken: slackSettings.bottoken, channelId: slackSettings.channelid };
      }
    }

    if (!slackSettings || !slackSettings.botToken) return;

    const slack = new WebClient(slackSettings.botToken);

    // Check each post's Slack message
    for (const post of posts) {
      try {
        await slack.conversations.history({
          channel: slackSettings.channelId,
          latest: post.slackMessageTs,
          limit: 1,
          inclusive: true
        });
      } catch (error) {
        if (error.data && error.data.error === 'message_not_found') {
          // Message was deleted, remove post
          console.log(`🗑️ Slack message deleted, removing post ${post.id}`);
          
          if (dbType === 'sqlite') {
            const database = await getDb();
            await database.run('DELETE FROM posts WHERE id = ?', [post.id]);
            await database.close();
          } else {
            await db.query('DELETE FROM posts WHERE id = $1', [post.id]);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Slack sync error:', error.message);
  }
}

// Run sync every 30 seconds
setInterval(syncSlackDeletions, 30000);

module.exports = { syncSlackDeletions };