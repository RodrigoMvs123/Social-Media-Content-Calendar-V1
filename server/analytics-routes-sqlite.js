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
    
    console.log('SQLite connection established for analytics routes');
  } catch (error) {
    console.error('Error setting up SQLite for analytics:', error);
  }
})();

// Get analytics data - protected by auth middleware
router.get('/', auth, async (req, res) => {
  try {
    if (!db) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const userId = req.user.id;
    
    // Get posts by platform
    const postsByPlatform = await db.all(`
      SELECT platform, COUNT(*) as count 
      FROM posts 
      WHERE userId = ? 
      GROUP BY platform
    `, userId);
    
    // Get posts by status
    const postsByStatus = await db.all(`
      SELECT status, COUNT(*) as count 
      FROM posts 
      WHERE userId = ? 
      GROUP BY status
    `, userId);
    
    // Get posts over time (by month)
    const postsOverTime = await db.all(`
      SELECT 
        substr(scheduledTime, 1, 7) as date, 
        COUNT(*) as count 
      FROM posts 
      WHERE userId = ? 
      GROUP BY substr(scheduledTime, 1, 7)
      ORDER BY date
    `, userId);
    
    // Mock engagement data (since we don't have real engagement metrics)
    const engagementByPlatform = [];
    for (const platform of postsByPlatform) {
      engagementByPlatform.push({
        platform: platform.platform,
        likes: Math.floor(Math.random() * 100) + 20,
        shares: Math.floor(Math.random() * 50) + 10,
        comments: Math.floor(Math.random() * 30) + 5
      });
    }
    
    res.json({
      postsByPlatform,
      postsByStatus,
      postsOverTime,
      engagementByPlatform
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics data' });
  }
});

module.exports = router;