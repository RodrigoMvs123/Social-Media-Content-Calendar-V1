const { WebClient } = require('@slack/web-api');
const { sendEmailNotification, emailTemplates } = require('./email-service');
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
    if (!slackSettings) return;
    
    const slack = new WebClient(slackSettings.botToken);
    let channelToUse = slackSettings.channelId;
    
    if (channelToUse === 'DM_PLACEHOLDER') {
      channelToUse = 'C08PUPJ15LJ'; // Your #social channel
    }
    
    await slack.chat.postMessage({
      channel: channelToUse,
      text: message,
      mrkdwn: true
    });
    
    console.log('✅ Slack notification sent');
  } catch (error) {
    console.error('❌ Slack notification failed:', error.message);
  }
}

// Notification functions
async function notifyPostPublished(userId, post) {
  try {
    const settings = await getUserNotificationSettings(userId);
    console.log('📧 Email notification check:', {
      hasEmail: !!settings.email,
      emailEnabled: !!settings.preferences.emailPostPublished,
      email: settings.email
    });
    
    // Email notification
    if (settings.preferences.emailPostPublished && settings.email) {
      console.log('📧 Sending email notification...');
      await sendEmailNotification(
        settings.email,
        '🎉 Post Published Successfully',
        emailTemplates.postPublished(post)
      );
    } else {
      console.log('📧 Email notification skipped - not enabled or no email');
    }
    
    // Slack notification
    if (settings.slackSettings) {
      const message = `🎉 *Post Published Successfully*\n\n` +
        `*Platform:* ${post.platform}\n` +
        `*Content:* ${post.content}\n` +
        `*Published at:* ${new Date().toLocaleString()}`;
      
      await sendSlackNotification(settings.slackSettings, message);
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
    
    // Email notification
    if (settings.preferences.emailPostFailed && settings.email) {
      await sendEmailNotification(
        settings.email,
        '❌ Post Failed to Publish',
        emailTemplates.postFailed(post, errorMessage)
      );
    }
    
    // Slack notification
    if (settings.slackSettings) {
      const message = `❌ *Post Failed to Publish*\n\n` +
        `*Platform:* ${post.platform}\n` +
        `*Content:* ${post.content}\n` +
        `*Error:* ${errorMessage}\n` +
        `*Scheduled for:* ${new Date(post.scheduledTime).toLocaleString()}`;
      
      await sendSlackNotification(settings.slackSettings, message);
    }
    
    console.log('✅ Post failed notifications sent for user:', userId);
  } catch (error) {
    console.error('❌ Failed to send post failed notifications:', error);
  }
}

async function sendDailyDigest() {
  try {
    // Get all users with email digest enabled
    const users = await db.all(`
      SELECT u.id, u.email, np.emailDigest 
      FROM users u 
      JOIN notification_preferences np ON u.id = np.userId 
      WHERE np.emailDigest = 1
    `);
    
    for (const user of users) {
      // Get today's posts for this user
      const today = new Date();
      const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
      
      const todaysPosts = await db.all(`
        SELECT * FROM posts 
        WHERE userId = ? AND scheduledTime BETWEEN ? AND ?
        ORDER BY scheduledTime ASC
      `, [user.id, startOfDay, endOfDay]);
      
      if (todaysPosts.length > 0) {
        await sendEmailNotification(
          user.email,
          '📅 Daily Digest - Your Scheduled Posts',
          emailTemplates.dailyDigest(todaysPosts)
        );
      }
    }
    
    console.log('✅ Daily digest sent to all users');
  } catch (error) {
    console.error('❌ Failed to send daily digest:', error);
  }
}

module.exports = {
  notifyPostPublished,
  notifyPostFailed,
  sendDailyDigest,
  getUserNotificationSettings
};