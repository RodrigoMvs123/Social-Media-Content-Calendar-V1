const { WebClient } = require('@slack/web-api');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

const dbPath = process.env.DB_PATH || './data.sqlite';
let db;

// Initialize database
(async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  } catch (error) {
    console.error('Error setting up notification service DB:', error);
  }
})();

// Get user preferences and email
async function getUserNotificationSettings(userId) {
  try {
    const user = await db.get('SELECT email FROM users WHERE id = ?', [userId]);
    const preferences = await db.get('SELECT * FROM notification_preferences WHERE userId = ?', [userId]);
    const slackSettings = await db.get('SELECT * FROM slack_settings WHERE userId = ? AND isActive = 1', [userId]);
    
    console.log('🔍 Slack settings for notifications:', {
      userId,
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
    if (!slackSettings) return null;
    
    const slack = new WebClient(slackSettings.botToken);
    let channelToUse = slackSettings.channelId;
    
    if (channelToUse === 'DM_PLACEHOLDER') {
      channelToUse = 'C08PUPJ15LJ'; // Your #social channel
    }
    
    const result = await slack.chat.postMessage({
      channel: channelToUse,
      text: message,
      mrkdwn: true
    });
    
    return result;
    
    console.log('✅ Slack notification sent');
  } catch (error) {
    console.error('❌ Slack notification failed:', error.message);
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
      if (result && result.ts && db) {
        await db.run(
          'UPDATE posts SET slackMessageTs = ? WHERE id = ?',
          [result.ts, post.id]
        );
        
        // Also store in slack_message_timestamps table for bidirectional sync
        await db.run(
          `INSERT OR REPLACE INTO slack_message_timestamps 
           (postId, slackTimestamp, messageType) VALUES (?, ?, ?)`,
          [post.id, result.ts, 'published']
        );
        
        console.log('📝 Updated Slack message timestamp for published post:', result.ts);
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

module.exports = {
  notifyPostPublished,
  notifyPostFailed,
  getUserNotificationSettings
};