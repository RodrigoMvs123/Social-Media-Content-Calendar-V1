const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const auth = require('./middleware/auth');

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

// SQLite helper function
async function getDb() {
  return await open({
    filename: process.env.DB_PATH || './data.sqlite',
    driver: sqlite3.Database
  });
}

if (dbType === 'postgres') {
  // PostgreSQL connection
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  console.log('✅ Notification routes using PostgreSQL');
} else {
  console.log('✅ Notification routes using SQLite');
}

// GET /api/notifications - Get user's notification preferences
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    let preferences;
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      preferences = await database.get(
        'SELECT * FROM notification_preferences WHERE userId = ?',
        [userId]
      );
      
      // If no preferences exist, create default ones
      if (!preferences) {
        const now = new Date().toISOString();
        await database.run(
          `INSERT INTO notification_preferences 
           (userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [userId, 0, 0, 0, 1, now]
        );
        
        preferences = await database.get(
          'SELECT * FROM notification_preferences WHERE userId = ?',
          [userId]
        );
      }
      await database.close();
      
      // Convert SQLite boolean integers to actual booleans
      const formattedPreferences = {
        ...preferences,
        emailDigest: !!preferences.emailDigest,
        emailPostPublished: !!preferences.emailPostPublished,
        emailPostFailed: !!preferences.emailPostFailed,
        browserNotifications: !!preferences.browserNotifications
      };
      
      res.json(formattedPreferences);
    } else {
      const result = await db.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );
      preferences = result.rows[0];
      
      // If no preferences exist, create default ones
      if (!preferences) {
        await db.query(
          `INSERT INTO notification_preferences 
           (user_id, email_digest, email_post_published, email_post_failed, browser_notifications, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [parseInt(userId), false, false, false, true]
        );
        
        const newResult = await db.query(
          'SELECT * FROM notification_preferences WHERE user_id = $1',
          [userId]
        );
        preferences = newResult.rows[0];
      }
      
      // Map PostgreSQL columns to camelCase
      const formattedPreferences = {
        userId: preferences.user_id,
        emailDigest: preferences.email_digest,
        emailPostPublished: preferences.email_post_published,
        emailPostFailed: preferences.email_post_failed,
        browserNotifications: preferences.browser_notifications,
        updatedAt: preferences.updated_at
      };
      
      res.json(formattedPreferences);
    }
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// POST /api/notifications - Update user's notification preferences
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { emailDigest, emailPostPublished, emailPostFailed, browserNotifications } = req.body;
    
    console.log('🔧 Saving notification preferences for user:', userId, {
      emailDigest, emailPostPublished, emailPostFailed, browserNotifications
    });
    
    if (dbType === 'sqlite') {
      const database = await getDb();
      const now = new Date().toISOString();
      
      // Update or insert preferences
      await database.run(
        `INSERT OR REPLACE INTO notification_preferences 
         (userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          userId,
          emailDigest ? 1 : 0,
          emailPostPublished ? 1 : 0,
          emailPostFailed ? 1 : 0,
          browserNotifications ? 1 : 0,
          now
        ]
      );
      
      // Get updated preferences
      const updatedPreferences = await database.get(
        'SELECT * FROM notification_preferences WHERE userId = ?',
        [userId]
      );
      await database.close();
      
      // Convert SQLite boolean integers to actual booleans
      const formattedPreferences = {
        ...updatedPreferences,
        emailDigest: !!updatedPreferences.emailDigest,
        emailPostPublished: !!updatedPreferences.emailPostPublished,
        emailPostFailed: !!updatedPreferences.emailPostFailed,
        browserNotifications: !!updatedPreferences.browserNotifications
      };
      
      res.json(formattedPreferences);
    } else {
      // PostgreSQL upsert
      await db.query(
        `INSERT INTO notification_preferences 
         (user_id, email_digest, email_post_published, email_post_failed, browser_notifications, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE SET
           email_digest = EXCLUDED.email_digest,
           email_post_published = EXCLUDED.email_post_published,
           email_post_failed = EXCLUDED.email_post_failed,
           browser_notifications = EXCLUDED.browser_notifications,
           updated_at = NOW()`,
        [userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications]
      );
      
      // Get updated preferences
      const result = await db.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1',
        [userId]
      );
      const updatedPreferences = result.rows[0];
      
      // Map PostgreSQL columns to camelCase
      const formattedPreferences = {
        userId: updatedPreferences.user_id,
        emailDigest: updatedPreferences.email_digest,
        emailPostPublished: updatedPreferences.email_post_published,
        emailPostFailed: updatedPreferences.email_post_failed,
        browserNotifications: updatedPreferences.browser_notifications,
        updatedAt: updatedPreferences.updated_at
      };
      
      res.json(formattedPreferences);
    }
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

module.exports = router;