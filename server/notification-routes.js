const express = require('express');
const router = express.Router();
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const auth = require('./middleware/auth');

// Get database path from environment
const dbPath = process.env.DB_PATH || './data.sqlite';

// Initialize SQLite database connection
let db;

(async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('SQLite connection established for notification routes');
  } catch (error) {
    console.error('Error setting up SQLite for notifications:', error);
  }
})();

// GET /api/notifications - Get user's notification preferences
router.get('/', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const userId = req.user.id;
    
    let preferences = await db.get(
      'SELECT * FROM notification_preferences WHERE userId = ?',
      [userId]
    );
    
    // If no preferences exist, create default ones
    if (!preferences) {
      const now = new Date().toISOString();
      await db.run(
        `INSERT INTO notification_preferences 
         (userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, 0, 0, 0, 1, now]
      );
      
      preferences = await db.get(
        'SELECT * FROM notification_preferences WHERE userId = ?',
        [userId]
      );
    }
    
    // Convert SQLite boolean integers to actual booleans
    const formattedPreferences = {
      ...preferences,
      emailDigest: !!preferences.emailDigest,
      emailPostPublished: !!preferences.emailPostPublished,
      emailPostFailed: !!preferences.emailPostFailed,
      browserNotifications: !!preferences.browserNotifications
    };
    
    res.json(formattedPreferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// POST /api/notifications - Update user's notification preferences
router.post('/', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const userId = req.user.id;
    const { emailDigest, emailPostPublished, emailPostFailed, browserNotifications } = req.body;
    const now = new Date().toISOString();
    
    console.log('🔧 Saving notification preferences for user:', userId, {
      emailDigest, emailPostPublished, emailPostFailed, browserNotifications
    });
    
    // Update or insert preferences
    await db.run(
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
    const updatedPreferences = await db.get(
      'SELECT * FROM notification_preferences WHERE userId = ?',
      [userId]
    );
    
    // Convert SQLite boolean integers to actual booleans
    const formattedPreferences = {
      ...updatedPreferences,
      emailDigest: !!updatedPreferences.emailDigest,
      emailPostPublished: !!updatedPreferences.emailPostPublished,
      emailPostFailed: !!updatedPreferences.emailPostFailed,
      browserNotifications: !!updatedPreferences.browserNotifications
    };
    
    res.json(formattedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

module.exports = router;