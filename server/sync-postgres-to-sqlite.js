const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
require('dotenv').config();

async function syncPostgresToSqlite() {
  try {
    console.log('🔄 Syncing posts from PostgreSQL to SQLite...');
    
    // Connect to PostgreSQL
    const postgresDb = new Pool({
      connectionString: 'postgresql://social_media_content_calendar_v1_gb1j_user:YWKH33BfX7mTsOfUaC9EuyBHOrhKmjSn@dpg-d448nnemcj7s73bvup4g-a.virginia-postgres.render.com/social_media_content_calendar_v1_gb1j?sslmode=require',
      ssl: { rejectUnauthorized: false }
    });
    
    // Connect to SQLite
    const sqliteDb = await open({
      filename: process.env.DB_PATH || './data.sqlite',
      driver: sqlite3.Database
    });
    
    // Get all posts from PostgreSQL
    const result = await postgresDb.query('SELECT * FROM posts ORDER BY id');
    const postgresPosts = result.rows;
    console.log(`📋 Found ${postgresPosts.length} posts in PostgreSQL`);
    
    if (postgresPosts.length === 0) {
      console.log('ℹ️ No posts to sync');
      return;
    }
    
    let syncedCount = 0;
    
    for (const post of postgresPosts) {
      try {
        // Check if post already exists in SQLite
        const existingPost = await sqliteDb.get('SELECT id FROM posts WHERE id = ?', [post.id]);
        
        if (existingPost) {
          console.log(`⏭️ Post ${post.id} already exists in SQLite, skipping`);
          continue;
        }
        
        // Insert post into SQLite with proper column mapping (PostgreSQL snake_case to SQLite camelCase)
        await sqliteDb.run(`
          INSERT INTO posts (id, userId, platform, content, scheduledTime, status, createdAt, updatedAt, media, slackMessageTs)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          post.id,
          post.userid,
          post.platform,
          post.content,
          post.scheduledtime,
          post.status,
          post.createdat,
          post.updatedat,
          post.media,
          post.slackmessagets
        ]);
        
        syncedCount++;
        console.log(`✅ Synced post ${post.id}: "${post.content.substring(0, 50)}..."`);
        
      } catch (error) {
        console.error(`❌ Failed to sync post ${post.id}:`, error.message);
      }
    }
    
    console.log(`🎉 Sync completed! ${syncedCount} posts synced to SQLite`);
    
    await sqliteDb.close();
    await postgresDb.end();
    
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

syncPostgresToSqlite();