import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DatabaseAdapter, SocialAccount, Post } from './db-adapter';

// SQLite implementation of the database adapter
export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database | null = null;
  private dbPath: string;
  
  constructor(dbPath: string = './data.sqlite') {
    this.dbPath = dbPath;
  }
  
  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });
    
    // Create tables if they don't exist
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        platform TEXT NOT NULL,
        username TEXT NOT NULL,
        accessToken TEXT NOT NULL,
        refreshToken TEXT,
        tokenExpiry TEXT,
        connected BOOLEAN NOT NULL DEFAULT 1,
        connectedAt TEXT NOT NULL,
        profileData TEXT,
        UNIQUE(userId, platform)
      );
      
      CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL,
        platform TEXT NOT NULL,
        content TEXT NOT NULL,
        scheduledTime TEXT NOT NULL,
        status TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
    `);
  }
  
  socialAccounts = {
    findAll: async (userId: string): Promise<SocialAccount[]> => {
      if (!this.db) throw new Error('Database not initialized');
      return this.db.all<SocialAccount[]>(
        'SELECT * FROM social_accounts WHERE userId = ?',
        userId
      );
    },
    
    findByPlatform: async (userId: string, platform: string): Promise<SocialAccount | null> => {
      if (!this.db) throw new Error('Database not initialized');
      return this.db.get<SocialAccount>(
        'SELECT * FROM social_accounts WHERE userId = ? AND platform = ?',
        userId, platform
      );
    },
    
    create: async (account: SocialAccount): Promise<SocialAccount> => {
      if (!this.db) throw new Error('Database not initialized');
      const result = await this.db.run(
        `INSERT INTO social_accounts 
         (userId, platform, username, accessToken, refreshToken, tokenExpiry, connected, connectedAt, profileData)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        account.userId, account.platform, account.username, account.accessToken,
        account.refreshToken, account.tokenExpiry, account.connected ? 1 : 0,
        account.connectedAt, account.profileData
      );
      
      return { ...account, id: result.lastID };
    },
    
    update: async (account: Partial<SocialAccount>): Promise<SocialAccount> => {
      if (!this.db) throw new Error('Database not initialized');
      if (!account.userId || !account.platform) {
        throw new Error('userId and platform are required for update');
      }
      
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.entries(account).forEach(([key, value]) => {
        if (key !== 'userId' && key !== 'platform' && key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      if (fields.length === 0) {
        throw new Error('No fields to update');
      }
      
      values.push(account.userId, account.platform);
      
      await this.db.run(
        `UPDATE social_accounts SET ${fields.join(', ')} WHERE userId = ? AND platform = ?`,
        ...values
      );
      
      return this.socialAccounts.findByPlatform(account.userId, account.platform) as Promise<SocialAccount>;
    },
    
    upsert: async (account: SocialAccount): Promise<SocialAccount> => {
      if (!this.db) throw new Error('Database not initialized');
      
      const existing = await this.socialAccounts.findByPlatform(account.userId, account.platform);
      
      if (existing) {
        return this.socialAccounts.update(account);
      } else {
        return this.socialAccounts.create(account);
      }
    },
    
    delete: async (userId: string, platform: string): Promise<void> => {
      if (!this.db) throw new Error('Database not initialized');
      await this.db.run(
        'DELETE FROM social_accounts WHERE userId = ? AND platform = ?',
        userId, platform
      );
    }
  };
  
  posts = {
    findAll: async (userId: string): Promise<Post[]> => {
      if (!this.db) throw new Error('Database not initialized');
      return this.db.all<Post[]>(
        'SELECT * FROM posts WHERE userId = ? ORDER BY scheduledTime ASC',
        userId
      );
    },
    
    findById: async (id: number | string): Promise<Post | null> => {
      if (!this.db) throw new Error('Database not initialized');
      return this.db.get<Post>(
        'SELECT * FROM posts WHERE id = ?',
        id
      );
    },
    
    create: async (post: Post): Promise<Post> => {
      if (!this.db) throw new Error('Database not initialized');
      const now = new Date().toISOString();
      
      const result = await this.db.run(
        `INSERT INTO posts 
         (userId, platform, content, scheduledTime, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        post.userId, post.platform, post.content, post.scheduledTime,
        post.status, post.createdAt || now, post.updatedAt || now
      );
      
      return { ...post, id: result.lastID };
    },
    
    update: async (post: Partial<Post>): Promise<Post> => {
      if (!this.db) throw new Error('Database not initialized');
      if (!post.id) {
        throw new Error('Post ID is required for update');
      }
      
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.entries(post).forEach(([key, value]) => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      // Always update the updatedAt field
      fields.push('updatedAt = ?');
      values.push(new Date().toISOString());
      
      values.push(post.id);
      
      await this.db.run(
        `UPDATE posts SET ${fields.join(', ')} WHERE id = ?`,
        ...values
      );
      
      return this.posts.findById(post.id) as Promise<Post>;
    },
    
    delete: async (id: number | string): Promise<void> => {
      if (!this.db) throw new Error('Database not initialized');
      await this.db.run('DELETE FROM posts WHERE id = ?', id);
    }
  };
}