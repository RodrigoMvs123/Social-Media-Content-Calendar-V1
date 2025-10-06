const { WebClient } = require('@slack/web-api');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

if (dbType === 'sqlite') {
  const dbPath = process.env.DB_PATH || './data.sqlite';
  // Initialize SQLite database
  (async () => {
    try {
      db = await open({
        filename: dbPath,
        driver: sqlite3.Database
      });
    } catch (error) {
      console.error('Error setting up notification service SQLite DB:', error);
    }
  })();
} else {
  // PostgreSQL connection
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Get user preferences and email
async function getUserNotificationSettings(userId) {
  try {
    let user, preferences, slackSettings;
    
    if (dbType === 'sqlite') {
      user = await db.get('SELECT email FROM users WHERE id = ?', [userId]);
      preferences = await db.get('SELECT * FROM notification_preferences WHERE userId = ?', [userId]);
      slackSettings = await db.get('SELECT * FROM slack_settings WHERE userId = ? AND isActive = 1', [userId]);
    } else {
      // PostgreSQL queries
      const userResult = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
      user = userResult.rows[0];
      
      // Check if notification_preferences table exists, if not skip it
      try {
        const prefsResult = await db.query('SELECT * FROM notification_preferences WHERE userid = $1', [userId]);
        preferences = prefsResult.rows[0];
      } catch (error) {
        console.log('📋 notification_preferences table not found, skipping');
        preferences = {};
      }
      
      const slackResult = await db.query('SELECT * FROM slack_settings WHERE userid = $1 AND isactive = true', [userId]);
      const rawSlackSettings = slackResult.rows[0];
      
      // Map PostgreSQL lowercase columns to camelCase
      if (rawSlackSettings) {
        slackSettings = {
          botToken: rawSlackSettings.bottoken,
          channelId: rawSlackSettings.channelid,
          channelName: rawSlackSettings.channelname,
          isActive: rawSlackSettings.isactive,
          slackScheduled: rawSlackSettings.slackscheduled,
          slackPublished: rawSlackSettings.slackpublished,
          slackFailed: rawSlackSettings.slackfailed
        };
      }
    }
    
    console.log('🔍 Slack settings for notifications:', {
      userId,
      hasSlackSettings: !!slackSettings,
      botToken: slackSettings?.botToken ? 'Present' : 'Missing',
      channelId: slackSettings?.channelId || 'Missing',
      channelName: slackSettings?.channelName || 'Missing',
      slackScheduled: slackSettings?.slackScheduled,
      slackPublished: slackSettings?.slackPublished,
      slackFailed: slackSettings?.slackFailed
    });
    
    return {
      email: user?.email,
      preferences: preferences || {},
      slackSettings: slackSettings
    };
  } catch (error) {
    console.error('Error getting user notification settings:', error);
    return { email: null, preferences: {}, slackSettings: null };
  }
}

// Send Slack notification
async function sendSlackNotification(slackSettings, message) {
  try {
    const botToken = process.env.SLACK_BOT_TOKEN;
    const channelId = slackSettings?.channelId || process.env.SLACK_CHANNEL_ID;
    
    if (!botToken || !channelId) {
      console.log('❌ Missing Slack configuration:', { 
        hasToken: !!botToken, 
        hasChannel: !!channelId 
      });
      return null;
    }
    
    console.log('📤 Sending Slack notification to channel:', channelId);
    console.log('📝 Message:', message);
    
    const slack = new WebClient(botToken);
    
    const result = await slack.chat.postMessage({
      channel: channelId,
      text: message,
      mrkdwn: true
    });
    
    console.log('✅ Slack notification sent successfully:', result.ts);
    return result;
  } catch (error) {
    console.error('❌ Slack notification failed:', error.message);
    console.error('❌ Error details:', error.data || error);
    return null;
  }
}

// Notification functions
async function notifyPostPublished(userId, post) {
  try {
    const settings = await getUserNotificationSettings(userId);
    
    
    
    
    
    // Slack notification - only if enabled
    console.log('🔔 Checking published notification preference:', {
      hasSlackSettings: !!settings.slackSettings,
      slackPublished: settings.slackSettings?.slackPublished,
      willSend: !!(settings.slackSettings && settings.slackSettings.slackPublished)
    });
    
    if (settings.slackSettings && settings.slackSettings.slackPublished) {
      const publishedDate = new Date();
      const formattedPublishedTime = publishedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
      }) + ' at ' + publishedDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Sao_Paulo'
      });
      
      const message = `🎉 *Post Published Successfully*\n\n` +
        `*Platform:* ${post.platform}\n` +
        `*Content:* ${post.content}\n` +
        `*Published at:* ${formattedPublishedTime}`;
      
      const result = await sendSlackNotification(settings.slackSettings, message);
      
      // Update the slackMessageTs with the new published message timestamp
      if (result && result.ts) {
        try {
          if (dbType === 'sqlite') {
            await db.run(
              'UPDATE posts SET slackMessageTs = ? WHERE id = ?',
              [result.ts, post.id]
            );
          } else {
            // PostgreSQL - add column if it doesn't exist, then update
            try {
              await db.query(
                'ALTER TABLE posts ADD COLUMN IF NOT EXISTS slackmessagets TEXT'
              );
            } catch (alterError) {
              // Column might already exist
            }
            
            await db.query(
              'UPDATE posts SET slackmessagets = $1 WHERE id = $2',
              [result.ts, post.id]
            );
          }
          console.log('📝 Updated Slack message timestamp for published post:', result.ts);
        } catch (updateError) {
          console.log('📝 Could not update Slack timestamp:', updateError.message);
        }
      }
    } else {
      console.log('❌ Skipping published notification (disabled)');
    }
    
    // Browser notification would be handled on frontend
    console.log('✅ Post published notifications sent for user:', userId);
  } catch (error) {
    console.error('❌ Failed to send post published notifications:', error);
  }
}

async function notifyPostFailed(userId, post, errorMessage) {
  try {
    const settings = await getUserNotificationSettings(userId);
    
    
    
    // Slack notification - only if enabled
    console.log('🔔 Checking failed notification preference:', {
      hasSlackSettings: !!settings.slackSettings,
      slackFailed: settings.slackSettings?.slackFailed,
      willSend: !!(settings.slackSettings && settings.slackSettings.slackFailed)
    });
    
    if (settings.slackSettings && settings.slackSettings.slackFailed) {
      const message = `❌ *Post Failed to Publish*\n\n` +
        `*Platform:* ${post.platform}\n` +
        `*Content:* ${post.content}\n` +
        `*Error:* ${errorMessage}\n` +
        `*Scheduled for:* ${new Date(post.scheduledTime).toLocaleString()}`;
      
      await sendSlackNotification(settings.slackSettings, message);
    } else {
      console.log('❌ Skipping failed notification (disabled)');
    }
    
    console.log('✅ Post failed notifications sent for user:', userId);
  } catch (error) {
    console.error('❌ Failed to send post failed notifications:', error);
  }
}

// Notify when post is scheduled
async function notifyPostScheduled(userId, post) {
  try {
    const settings = await getUserNotificationSettings(userId);
    
    // Slack notification - only if enabled
    console.log('🔔 Checking scheduled notification preference:', {
      hasSlackSettings: !!settings.slackSettings,
      slackScheduled: settings.slackSettings?.slackScheduled,
      willSend: !!(settings.slackSettings && settings.slackSettings.slackScheduled)
    });
    
    if (settings.slackSettings && settings.slackSettings.slackScheduled) {
      const createdDate = new Date(post.createdAt);
      const scheduledDate = new Date(post.scheduledTime);
      
      const formattedCreatedTime = createdDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
      }) + ' at ' + createdDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Sao_Paulo'
      });
      
      const formattedScheduledTime = scheduledDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'America/Sao_Paulo'
      }) + ' at ' + scheduledDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'America/Sao_Paulo'
      });
      
      const message = `📅 *New post scheduled*\n\n` +
        `*Platform:* ${post.platform}\n` +
        `*Created at:* ${formattedCreatedTime}\n` +
        `*Scheduled for:* ${formattedScheduledTime}\n` +
        `*Content:* ${post.content}\n` +
        `*Status:* Ready to Publish`;
      
      const result = await sendSlackNotification(settings.slackSettings, message);
      
      // Store Slack message timestamp for bidirectional sync
      if (result && result.ts) {
        try {
          if (dbType === 'sqlite') {
            await db.run(
              'UPDATE posts SET slackMessageTs = ? WHERE id = ?',
              [result.ts, post.id]
            );
          } else {
            // PostgreSQL - add column if it doesn't exist, then update
            try {
              await db.query(
                'ALTER TABLE posts ADD COLUMN IF NOT EXISTS slackmessagets TEXT'
              );
            } catch (alterError) {
              // Column might already exist
            }
            
            await db.query(
              'UPDATE posts SET slackmessagets = $1 WHERE id = $2',
              [result.ts, post.id]
            );
          }
          console.log('📝 Updated Slack message timestamp for scheduled post:', result.ts);
        } catch (updateError) {
          console.log('📝 Could not update Slack timestamp:', updateError.message);
        }
      }
    } else {
      console.log('❌ Skipping scheduled notification (disabled)');
    }
    
    console.log('✅ Post scheduled notifications sent for user:', userId);
  } catch (error) {
    console.error('❌ Failed to send post scheduled notifications:', error);
  }
}

module.exports = {
  notifyPostPublished,
  notifyPostFailed,
  notifyPostScheduled,
  getUserNotificationSettings
};