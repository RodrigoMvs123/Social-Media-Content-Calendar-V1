import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DatabaseAdapter, SocialAccount, Post, User, NotificationPreference } from './db-adapter';
import { syncService } from '../cross-db-persistence/services/RealTimeSyncService';

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
        publishedAt TEXT,
        media TEXT,
        slackMessageTs TEXT
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
        emailDigest BOOLEAN DEFAULT 1,
        emailPostPublished BOOLEAN DEFAULT 1,
        emailPostFailed BOOLEAN DEFAULT 1,
        browserNotifications BOOLEAN NOT NULL DEFAULT 0,
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
        updatedAt TEXT NOT NULL,
        slackScheduled BOOLEAN DEFAULT 1,
        slackPublished BOOLEAN DEFAULT 1,
        slackFailed BOOLEAN DEFAULT 1
      );
      
      CREATE TABLE IF NOT EXISTS slack_message_timestamps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        postId INTEGER NOT NULL,
        slackTimestamp TEXT NOT NULL,
        messageType TEXT NOT NULL DEFAULT 'scheduled',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (postId) REFERENCES posts (id) ON DELETE CASCADE,
        UNIQUE(postId, messageType)
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
      
      const newAccount = { ...account, id: result.lastID };
      syncService.emitChange({
        operation: 'create',
        table: 'social_accounts',
        id: newAccount.id,
        data: newAccount,
        userId: newAccount.userId,
      });
      return newAccount;
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
        return this.socialAccounts.findByPlatform(account.userId, account.platform) as Promise<SocialAccount>;
      }
      
      values.push(account.userId, account.platform);
      
      await this.db.run(
        `UPDATE social_accounts SET ${fields.join(', ')} WHERE userId = ? AND platform = ?`,
        ...values
      );
      
      const updatedAccount = await this.socialAccounts.findByPlatform(account.userId, account.platform) as SocialAccount;
      syncService.emitChange({
        operation: 'update',
        table: 'social_accounts',
        id: updatedAccount.id,
        data: updatedAccount,
        userId: updatedAccount.userId,
      });
      return updatedAccount;
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
      const accountToDelete = await this.socialAccounts.findByPlatform(userId, platform);
      if(accountToDelete){
        await this.db.run(
          'DELETE FROM social_accounts WHERE userId = ? AND platform = ?',
          userId, platform
        );
        syncService.emitChange({
          operation: 'delete',
          table: 'social_accounts',
          id: accountToDelete.id,
          userId: userId,
        });
      }
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
      
      const newPost = { ...post, id: result.lastID };
      syncService.emitChange({
        operation: 'create',
        table: 'posts',
        id: newPost.id,
        data: newPost,
        userId: newPost.userId,
      });
      return newPost;
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
      
      const updatedPost = await this.posts.findById(post.id) as Post;
      syncService.emitChange({
        operation: 'update',
        table: 'posts',
        id: updatedPost.id,
        data: updatedPost,
        userId: updatedPost.userId,
      });
      return updatedPost;
    },
    
    delete: async (id: number | string): Promise<void> => {
      if (!this.db) throw new Error('Database not initialized');
      const postToDelete = await this.posts.findById(id);
      if(postToDelete){
        await this.db.run('DELETE FROM posts WHERE id = ?', id);
        syncService.emitChange({
          operation: 'delete',
          table: 'posts',
          id: id,
          userId: postToDelete.userId,
        });
      }
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
      
      const newUser = { ...user, id: result.lastID };
      syncService.emitChange({
        operation: 'create',
        table: 'users',
        id: newUser.id,
        data: newUser,
      });
      return newUser;
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
      
      const updatedUser = await this.users.findById(user.id) as User;
      syncService.emitChange({
        operation: 'update',
        table: 'users',
        id: updatedUser.id,
        data: updatedUser,
      });
      return updatedUser;
    },
    
    delete: async (id: number | string): Promise<void> => {
      if (!this.db) throw new Error('Database not initialized');
      const userToDelete = await this.users.findById(id);
      if(userToDelete){
        await this.db.run('DELETE FROM users WHERE id = ?', id);
        syncService.emitChange({
          operation: 'delete',
          table: 'users',
          id: id,
        });
      }
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
      
      const newPreference = { ...preference, id: result.lastID };
      syncService.emitChange({
        operation: 'create',
        table: 'notification_preferences',
        id: newPreference.id,
        data: newPreference,
        userId: newPreference.userId,
      });
      return newPreference;
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
      
      const updatedPreference = await this.notificationPreferences.findByUserId(preference.userId) as NotificationPreference;
      syncService.emitChange({
        operation: 'update',
        table: 'notification_preferences',
        id: updatedPreference.id,
        data: updatedPreference,
        userId: updatedPreference.userId,
      });
      return updatedPreference;
    }
  };

  async replicateCreate(table: string, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map(() => '?').join(',');
    const query = `INSERT OR REPLACE INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;
    const result = await this.db.run(query, ...values);
    return { ...data, id: result.lastID };
  }

  async replicateUpdate(table: string, id: string | number, data: any): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    const columns = Object.keys(data).filter(k => k !== 'id');
    const values = columns.map(k => data[k]);
    const setClause = columns.map(col => `${col} = ?`).join(',');
    const query = `UPDATE ${table} SET ${setClause} WHERE id = ?`;
    const result = await this.db.run(query, ...values, id);
    if (result.changes === 0) {
      return this.replicateCreate(table, { id, ...data });
    }
    return this.db.get(`SELECT * FROM ${table} WHERE id = ?`, id);
  }

  async replicateDelete(table: string, id: string | number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    const query = `DELETE FROM ${table} WHERE id = ?`;
    await this.db.run(query, id);
  }
}