const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

async function syncExistingPosts() {
  try {
    console.log('🔄 Syncing existing posts from SQLite to PostgreSQL...');
    
    // Connect to SQLite
    const sqliteDb = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    // Connect to PostgreSQL
    const postgresDb = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Get all posts from SQLite
    const sqlitePosts = await sqliteDb.all('SELECT * FROM posts');
    console.log(`📋 Found ${sqlitePosts.length} posts in SQLite`);
    
    if (sqlitePosts.length === 0) {
      console.log('ℹ️ No posts to sync');
      return;
    }
    
    let syncedCount = 0;
    
    for (const post of sqlitePosts) {
      try {
        // Check if post already exists in PostgreSQL
        const existingPost = await postgresDb.query('SELECT id FROM posts WHERE id = $1', [post.id]);
        
        if (existingPost.rows.length > 0) {
          console.log(`⏭️ Post ${post.id} already exists in PostgreSQL, skipping`);
          continue;
        }
        
        // Insert post into PostgreSQL with proper column mapping
        await postgresDb.query(`
          INSERT INTO posts (id, userid, platform, content, scheduledtime, status, createdat, updatedat, media, slackmessagets)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
          post.id,
          post.userId,
          post.platform,
          post.content,
          post.scheduledTime,
          post.status,
          post.createdAt,
          post.updatedAt,
          post.media,
          post.slackMessageTs
        ]);
        
        syncedCount++;
        console.log(`✅ Synced post ${post.id}: "${post.content.substring(0, 50)}..."`);
        
      } catch (error) {
        console.error(`❌ Failed to sync post ${post.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Sync completed! ${syncedCount} posts synced to PostgreSQL`);
    
    await sqliteDb.close();
    await postgresDb.end();
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

syncExistingPosts();