import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DatabaseAdapter, SocialAccount, Post, User, NotificationPreference } from './db-adapter';

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
        updatedAt TEXT NOT NULL,
        media TEXT
      );
      
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        emailDigest BOOLEAN NOT NULL DEFAULT 0,
        emailPostPublished BOOLEAN NOT NULL DEFAULT 0,
        emailPostFailed BOOLEAN NOT NULL DEFAULT 0,
        browserNotifications BOOLEAN NOT NULL DEFAULT 1,
        updatedAt TEXT NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS slack_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        botToken TEXT,
        channelId TEXT,
        channelName TEXT,
        isActive BOOLEAN NOT NULL DEFAULT 1,
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
      const result = await this.db.get<SocialAccount>(
        'SELECT * FROM social_accounts WHERE userId = ? AND platform = ?',
        userId, platform
      );
      return result || null;
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
      const posts = await this.db.all<Post[]>(
        'SELECT * FROM posts WHERE userId = ? ORDER BY scheduledTime ASC',
        userId
      );
      
      // Parse media JSON if it exists
      return posts.map(post => {
        if (post.media && typeof post.media === 'string') {
          try {
            return { ...post, media: JSON.parse(post.media) };
          } catch (e) {
            console.error('Error parsing media JSON:', e);
          }
        }
        return post;
      });
    },
    
    findById: async (id: number | string): Promise<Post | null> => {
      if (!this.db) throw new Error('Database not initialized');
      const post = await this.db.get<Post>(
        'SELECT * FROM posts WHERE id = ?',
        id
      );
      
      // Parse media JSON if it exists
      if (post && post.media && typeof post.media === 'string') {
        try {
          post.media = JSON.parse(post.media);
        } catch (e) {
          console.error('Error parsing media JSON:', e);
        }
      }
      
      return post || null;
    },
    
    create: async (post: Post): Promise<Post> => {
      if (!this.db) throw new Error('Database not initialized');
      const now = new Date().toISOString();
      
      // Stringify media if it exists
      const mediaJson = post.media ? JSON.stringify(post.media) : null;
      
      const result = await this.db.run(
        `INSERT INTO posts 
         (userId, platform, content, scheduledTime, status, createdAt, updatedAt, media)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        post.userId, post.platform, post.content, post.scheduledTime,
        post.status, post.createdAt || now, post.updatedAt || now, mediaJson
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
          // Handle media specially
          if (key === 'media' && value) {
            fields.push(`${key} = ?`);
            values.push(JSON.stringify(value));
          } else if (key !== 'media') {
            fields.push(`${key} = ?`);
            values.push(value);
          }
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
  
  users = {
    findByEmail: async (email: string): Promise<User | null> => {
      if (!this.db) throw new Error('Database not initialized');
      const result = await this.db.get<User>(
        'SELECT * FROM users WHERE email = ?',
        email
      );
      return result || null;
    },
    
    findById: async (id: number | string): Promise<User | null> => {
      if (!this.db) throw new Error('Database not initialized');
      const result = await this.db.get<User>(
        'SELECT * FROM users WHERE id = ?',
        id
      );
      return result || null;
    },
    
    create: async (user: User): Promise<User> => {
      if (!this.db) throw new Error('Database not initialized');
      const now = new Date().toISOString();
      
      const result = await this.db.run(
        `INSERT INTO users 
         (email, name, password, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?)`,
        user.email, user.name, user.password, user.createdAt || now, user.updatedAt || now
      );
      
      return { ...user, id: result.lastID };
    },
    
    update: async (user: Partial<User>): Promise<User> => {
      if (!this.db) throw new Error('Database not initialized');
      if (!user.id) {
        throw new Error('User ID is required for update');
      }
      
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.entries(user).forEach(([key, value]) => {
        if (key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      });
      
      // Always update the updatedAt field
      fields.push('updatedAt = ?');
      values.push(new Date().toISOString());
      
      values.push(user.id);
      
      await this.db.run(
        `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        ...values
      );
      
      return this.users.findById(user.id) as Promise<User>;
    },
    
    delete: async (id: number | string): Promise<void> => {
      if (!this.db) throw new Error('Database not initialized');
      await this.db.run('DELETE FROM users WHERE id = ?', id);
    }
  };
  
  notificationPreferences = {
    findByUserId: async (userId: string): Promise<NotificationPreference | null> => {
      if (!this.db) throw new Error('Database not initialized');
      const result = await this.db.get<NotificationPreference>(
        'SELECT * FROM notification_preferences WHERE userId = ?',
        userId
      );
      return result || null;
    },
    
    create: async (preference: NotificationPreference): Promise<NotificationPreference> => {
      if (!this.db) throw new Error('Database not initialized');
      const now = new Date().toISOString();
      
      const result = await this.db.run(
        `INSERT INTO notification_preferences 
         (userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        preference.userId, 
        preference.emailDigest ? 1 : 0, 
        preference.emailPostPublished ? 1 : 0, 
        preference.emailPostFailed ? 1 : 0, 
        preference.browserNotifications ? 1 : 0, 
        preference.updatedAt || now
      );
      
      return { ...preference, id: result.lastID };
    },
    
    update: async (preference: Partial<NotificationPreference>): Promise<NotificationPreference> => {
      if (!this.db) throw new Error('Database not initialized');
      if (!preference.userId) {
        throw new Error('User ID is required for update');
      }
      
      const fields: string[] = [];
      const values: any[] = [];
      
      Object.entries(preference).forEach(([key, value]) => {
        if (key !== 'userId' && key !== 'id') {
          // Convert boolean values to 0/1 for SQLite
          if (typeof value === 'boolean') {
            fields.push(`${key} = ?`);
            values.push(value ? 1 : 0);
          } else {
            fields.push(`${key} = ?`);
            values.push(value);
          }
        }
      });
      
      // Always update the updatedAt field
      fields.push('updatedAt = ?');
      values.push(new Date().toISOString());
      
      values.push(preference.userId);
      
      const existing = await this.notificationPreferences.findByUserId(preference.userId);
      
      if (existing) {
        await this.db.run(
          `UPDATE notification_preferences SET ${fields.join(', ')} WHERE userId = ?`,
          ...values
        );
      } else {
        // Create default preferences if they don't exist
        await this.notificationPreferences.create({
          userId: preference.userId,
          emailDigest: preference.emailDigest || false,
          emailPostPublished: preference.emailPostPublished || false,
          emailPostFailed: preference.emailPostFailed || false,
          browserNotifications: preference.browserNotifications !== undefined ? preference.browserNotifications : true,
          updatedAt: new Date().toISOString()
        });
      }
      
      return this.notificationPreferences.findByUserId(preference.userId) as Promise<NotificationPreference>;
    }
  };
}