const { Pool } = require('pg');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

class SimpleSyncService {
  constructor() {
    this.isEnabled = process.env.ENABLE_REAL_TIME_SYNC === 'true';
    this.currentDbType = process.env.DB_TYPE || 'sqlite';
    this.targetDbType = this.currentDbType === 'sqlite' ? 'postgres' : 'sqlite';
    
    if (this.isEnabled) {
      this.initializeTargetDb();
    }
  }
  
  async initializeTargetDb() {
    try {
      if (this.targetDbType === 'postgres') {
        if (!process.env.DATABASE_URL) {
          console.log(`ℹ️ Simple sync disabled: PostgreSQL connection not available (DATABASE_URL not set)`);
          this.isEnabled = false;
          return;
        }
        this.targetDb = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
      } else {
        this.targetDb = await open({
          filename: process.env.DB_PATH || './data.sqlite',
          driver: sqlite3.Database
        });
      }
      console.log(`✅ Simple sync initialized: ${this.currentDbType} -> ${this.targetDbType}`);
    } catch (error) {
      console.log(`ℹ️ Simple sync disabled: ${this.targetDbType} database not available`);
      this.isEnabled = false;
    }
  }
  
  async syncPost(operation, postData) {
    if (!this.isEnabled || !this.targetDb) return;
    
    console.log(`[SIMPLE-SYNC] ${operation} post ${postData.id} to ${this.targetDbType}`);
    
    try {
      if (operation === 'create') {
        await this.createPost(postData);
      } else if (operation === 'update') {
        await this.updatePost(postData);
      } else if (operation === 'delete') {
        await this.deletePost(postData.id);
      }
      console.log(`[SIMPLE-SYNC] ✅ Successfully synced ${operation} for post ${postData.id}`);
    } catch (error) {
      console.error(`[SIMPLE-SYNC] ❌ Failed to sync ${operation}:`, error.message);
    }
  }
  
  async createPost(postData) {
    if (this.targetDbType === 'postgres') {
      // Convert camelCase to snake_case for PostgreSQL
      await this.targetDb.query(`
        INSERT INTO posts (id, userid, platform, content, scheduledtime, status, createdat, updatedat, media, slackmessagets)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO UPDATE SET
          userid = EXCLUDED.userid,
          platform = EXCLUDED.platform,
          content = EXCLUDED.content,
          scheduledtime = EXCLUDED.scheduledtime,
          status = EXCLUDED.status,
          updatedat = EXCLUDED.updatedat,
          media = EXCLUDED.media
      `, [
        postData.id,
        postData.userId,
        postData.platform,
        postData.content,
        postData.scheduledTime,
        postData.status,
        postData.createdAt,
        postData.updatedAt,
        postData.media ? JSON.stringify(postData.media) : null,
        postData.slackMessageTs || null
      ]);
    } else {
      // SQLite with camelCase
      await this.targetDb.run(`
        INSERT OR REPLACE INTO posts (id, userId, platform, content, scheduledTime, status, createdAt, updatedAt, media, slackMessageTs)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        postData.id,
        postData.userId,
        postData.platform,
        postData.content,
        postData.scheduledTime,
        postData.status,
        postData.createdAt,
        postData.updatedAt,
        postData.media ? JSON.stringify(postData.media) : null,
        postData.slackMessageTs || null
      ]);
    }
  }
  
  async updatePost(postData) {
    if (this.targetDbType === 'postgres') {
      await this.targetDb.query(`
        UPDATE posts SET
          userid = $2,
          platform = $3,
          content = $4,
          scheduledtime = $5,
          status = $6,
          updatedat = $7,
          media = $8
        WHERE id = $1
      `, [
        postData.id,
        postData.userId,
        postData.platform,
        postData.content,
        postData.scheduledTime,
        postData.status,
        postData.updatedAt,
        postData.media ? JSON.stringify(postData.media) : null
      ]);
    } else {
      await this.targetDb.run(`
        UPDATE posts SET
          userId = ?,
          platform = ?,
          content = ?,
          scheduledTime = ?,
          status = ?,
          updatedAt = ?,
          media = ?
        WHERE id = ?
      `, [
        postData.userId,
        postData.platform,
        postData.content,
        postData.scheduledTime,
        postData.status,
        postData.updatedAt,
        postData.media ? JSON.stringify(postData.media) : null,
        postData.id
      ]);
    }
  }
  
  async deletePost(postId) {
    if (this.targetDbType === 'postgres') {
      await this.targetDb.query('DELETE FROM posts WHERE id = $1', [postId]);
    } else {
      await this.targetDb.run('DELETE FROM posts WHERE id = ?', [postId]);
    }
  }
}

// Export singleton instance
const simpleSyncService = new SimpleSyncService();
module.exports = { simpleSyncService };