const express = require('express');
const router = express.Router();
const { Pool } = require('pg');

// Get database connection from environment
let pool;

// Only initialize PostgreSQL pool if not using SQLite
if (process.env.DB_TYPE !== 'sqlite') {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL || process.env.DB_URL,
    ssl: { rejectUnauthorized: false }
  });
  console.log('Connecting to PostgreSQL using environment variables');
} else {
  console.log('Using SQLite - skipping PostgreSQL connection');
}

// Check if posts table exists and has the right structure
(async () => {
  // Skip PostgreSQL initialization if using SQLite
  if (process.env.DB_TYPE === 'sqlite') {
    return;
  }
  
  try {
    // First check if the table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'posts'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      // Create the table if it doesn't exist
      console.log('Creating posts table...');
      await pool.query(`
        CREATE TABLE posts (
          id SERIAL PRIMARY KEY,
          userid INTEGER NOT NULL,
          platform VARCHAR(50) NOT NULL,
          content TEXT NOT NULL,
          scheduledtime TIMESTAMP NOT NULL,
          status VARCHAR(20) NOT NULL,
          media JSONB,
          createdat TIMESTAMP NOT NULL,
          updatedat TIMESTAMP NOT NULL
        )
      `);
      console.log('Posts table created successfully');
    } else {
      // Check if media column exists
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'posts' AND column_name = 'media'
        );
      `);
      
      const mediaColumnExists = columnCheck.rows[0].exists;
      
      if (!mediaColumnExists) {
        // Add media column if it doesn't exist
        console.log('Adding media column to posts table...');
        await pool.query(`ALTER TABLE posts ADD COLUMN media JSONB;`);
        console.log('Media column added successfully');
      }
    }
  } catch (error) {
    console.error('Error setting up posts table:', error);
  }
})();

// Get all posts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM posts ORDER BY scheduledtime DESC');
    
    // Transform database column names to camelCase for frontend
    const posts = result.rows.map(row => ({
      id: row.id,
      userId: row.userid,
      platform: row.platform,
      content: row.content,
      scheduledTime: row.scheduledtime,
      status: row.status,
      media: row.media,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));
    
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
router.post('/', async (req, res) => {
  try {
    const { content, platform, scheduledTime, status, media } = req.body;
    const userId = req.user?.id || 1; // Default to user 1 if not authenticated
    
    console.log('Creating post:', { content, platform, scheduledTime, status });
    
    // Check if media column exists
    let includeMedia = false;
    try {
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'posts' AND column_name = 'media'
        );
      `);
      includeMedia = columnCheck.rows[0].exists;
    } catch (err) {
      console.error('Error checking for media column:', err);
    }
    
    let result;
    if (includeMedia) {
      // If media column exists, include it in the query
      result = await pool.query(
        'INSERT INTO posts (userid, platform, content, scheduledtime, status, media, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW()) RETURNING *',
        [userId, platform, content, scheduledTime, status, media ? JSON.stringify(media) : null]
      );
    } else {
      // If media column doesn't exist, exclude it from the query
      result = await pool.query(
        'INSERT INTO posts (userid, platform, content, scheduledtime, status, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *',
        [userId, platform, content, scheduledTime, status]
      );
    }
    
    // Transform to camelCase for frontend
    const post = {
      id: result.rows[0].id,
      userId: result.rows[0].userid,
      platform: result.rows[0].platform,
      content: result.rows[0].content,
      scheduledTime: result.rows[0].scheduledtime,
      status: result.rows[0].status,
      media: result.rows[0].media,
      createdAt: result.rows[0].createdat,
      updatedAt: result.rows[0].updatedat
    };
    
    // Send scheduled notification if post is scheduled
    if (status === 'scheduled') {
      try {
        const { notifyPostScheduled } = require('./notification-service');
        await notifyPostScheduled(userId, post);
      } catch (notifyError) {
        console.error('Error sending scheduled notification:', notifyError);
      }
    }
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Get a specific post
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM posts WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Transform to camelCase for frontend
    const post = {
      id: result.rows[0].id,
      userId: result.rows[0].userid,
      platform: result.rows[0].platform,
      content: result.rows[0].content,
      scheduledTime: result.rows[0].scheduledtime,
      status: result.rows[0].status,
      media: result.rows[0].media,
      createdAt: result.rows[0].createdat,
      updatedAt: result.rows[0].updatedat
    };
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

// Update a post
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, platform, scheduledTime, status, media } = req.body;
    
    // Check if media column exists
    let includeMedia = false;
    try {
      const columnCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'posts' AND column_name = 'media'
        );
      `);
      includeMedia = columnCheck.rows[0].exists;
    } catch (err) {
      console.error('Error checking for media column:', err);
    }
    
    let result;
    if (includeMedia) {
      // If media column exists, include it in the query
      result = await pool.query(
        `UPDATE posts 
         SET content = COALESCE($1, content), 
             platform = COALESCE($2, platform), 
             scheduledtime = COALESCE($3, scheduledtime), 
             status = COALESCE($4, status), 
             media = COALESCE($5, media),
             updatedat = NOW() 
         WHERE id = $6 
         RETURNING *`,
        [content, platform, scheduledTime, status, media ? JSON.stringify(media) : null, id]
      );
    } else {
      // If media column doesn't exist, exclude it from the query
      result = await pool.query(
        `UPDATE posts 
         SET content = COALESCE($1, content), 
             platform = COALESCE($2, platform), 
             scheduledtime = COALESCE($3, scheduledtime), 
             status = COALESCE($4, status),
             updatedat = NOW() 
         WHERE id = $5 
         RETURNING *`,
        [content, platform, scheduledTime, status, id]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Transform to camelCase for frontend
    const post = {
      id: result.rows[0].id,
      userId: result.rows[0].userid,
      platform: result.rows[0].platform,
      content: result.rows[0].content,
      scheduledTime: result.rows[0].scheduledtime,
      status: result.rows[0].status,
      media: result.rows[0].media,
      createdAt: result.rows[0].createdat,
      updatedAt: result.rows[0].updatedat
    };
    
    res.json(post);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM posts WHERE id = $1 RETURNING *', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;