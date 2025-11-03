import { DatabaseAdapter, SocialAccount, User } from './db-adapter';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { syncService } from '../cross-db-persistence/services/RealTimeSyncService';

// Force reload environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

export class PostgresAdapter implements DatabaseAdapter {
  private pool: Pool;
  private initialized: boolean = false;

  constructor() {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }
    
    console.log('Initializing PostgreSQL connection with URL:', connectionString.substring(0, 20) + '...');
    
    this.pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for some cloud database providers
      }
    });
  }

  async initialize(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      console.log('PostgreSQL connection successful');
      
      // Create tables if they don't exist
      await this.createTables(client);
      
      client.release();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize PostgreSQL:', error);
      throw error;
    }
  }

  private async createTables(client: any): Promise<void> {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );
    `);

    // Create posts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        platform VARCHAR(50) NOT NULL,
        scheduled_time TIMESTAMP NOT NULL,
        status VARCHAR(50) DEFAULT 'scheduled',
        created_at TIMESTAMP NOT NULL,
        updated_at TIMESTAMP NOT NULL
      );
    `);

    // Create social_accounts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS social_accounts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        platform VARCHAR(50) NOT NULL,
        username VARCHAR(255) NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        token_expiry TIMESTAMP,
        profile_data TEXT,
        connected BOOLEAN DEFAULT false,
        connected_at TIMESTAMP,
        UNIQUE(user_id, platform)
      );
    `);

    // Create notification_preferences table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_preferences (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) UNIQUE NOT NULL,
        email_digest BOOLEAN DEFAULT true,
        email_post_published BOOLEAN DEFAULT true,
        email_post_failed BOOLEAN DEFAULT true,
        browser_notifications BOOLEAN DEFAULT false,
        updated_at TIMESTAMP NOT NULL
      );
    `);

    console.log('PostgreSQL tables created successfully');
  }

  // Users
  users = {
    create: async (user: User): Promise<User> => {
      const { name, email, password, createdAt, updatedAt } = user;
      const result = await this.pool.query(
        'INSERT INTO users (name, email, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, password, createdAt, updatedAt]
      );
      const newUser = result.rows[0];
      syncService.emitChange({
        operation: 'create',
        table: 'users',
        id: newUser.id,
        data: newUser,
      });
      return newUser;
    },

    findByEmail: async (email: string): Promise<User | null> => {
      const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    },

    findById: async (id: string): Promise<User | null> => {
      const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    },

    update: async (user: Partial<User>): Promise<User> => {
      const { id, name, email, password, updatedAt } = user;
      const fields = [];
      const values = [];
      let valueIndex = 1;

      if (name) {
        fields.push(`name = $${valueIndex}`);
        values.push(name);
        valueIndex++;
      }

      if (email) {
        fields.push(`email = $${valueIndex}`);
        values.push(email);
        valueIndex++;
      }

      if (password) {
        fields.push(`password = $${valueIndex}`);
        values.push(password);
        valueIndex++;
      }

      fields.push(`updated_at = $${valueIndex}`);
      values.push(updatedAt);
      valueIndex++;

      values.push(id);

      const result = await this.pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${valueIndex} RETURNING *`,
        values
      );
      const updatedUser = result.rows[0];
      syncService.emitChange({
        operation: 'update',
        table: 'users',
        id: updatedUser.id,
        data: updatedUser,
      });
      return updatedUser;
    },

    delete: async (id: string | number): Promise<void> => {
      await this.pool.query('DELETE FROM users WHERE id = $1', [id]);
      syncService.emitChange({
        operation: 'delete',
        table: 'users',
        id: id,
      });
    }
  };

  // Posts
  posts = {
    create: async (post: any) => {
      const { userId, content, platform, scheduledTime, status, createdAt, updatedAt } = post;
      const result = await this.pool.query(
        'INSERT INTO posts (userid, content, platform, scheduledtime, status, createdat, updatedat) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [userId, content, platform, scheduledTime, status || 'scheduled', createdAt, updatedAt]
      );
      const newPost = result.rows[0];
      syncService.emitChange({
        operation: 'create',
        table: 'posts',
        id: newPost.id,
        data: newPost,
        userId: newPost.userid,
      });
      return newPost;
    },

    findAll: async (userId: string) => {
      const result = await this.pool.query('SELECT * FROM posts WHERE userid = $1 ORDER BY scheduledtime', [userId]);
      return result.rows;
    },

    findById: async (id: string) => {
      const result = await this.pool.query('SELECT * FROM posts WHERE id = $1', [id]);
      return result.rows[0];
    },

    update: async (post: any) => {
      const { id, content, platform, scheduledTime, status, updatedAt } = post;
      const fields = [];
      const values = [];
      let valueIndex = 1;

      if (content) {
        fields.push(`content = $${valueIndex}`);
        values.push(content);
        valueIndex++;
      }

      if (platform) {
        fields.push(`platform = $${valueIndex}`);
        values.push(platform);
        valueIndex++;
      }

      if (scheduledTime) {
        fields.push(`scheduled_time = $${valueIndex}`);
        values.push(scheduledTime);
        valueIndex++;
      }

      if (status) {
        fields.push(`status = $${valueIndex}`);
        values.push(status);
        valueIndex++;
      }

      fields.push(`updated_at = $${valueIndex}`);
      values.push(updatedAt);
      valueIndex++;

      values.push(id);

      const result = await this.pool.query(
        `UPDATE posts SET ${fields.join(', ')} WHERE id = $${valueIndex} RETURNING *`,
        values
      );
      const updatedPost = result.rows[0];
      syncService.emitChange({
        operation: 'update',
        table: 'posts',
        id: updatedPost.id,
        data: updatedPost,
        userId: updatedPost.user_id,
      });
      return updatedPost;
    },

    delete: async (id: string): Promise<void> => {
      const result = await this.pool.query('SELECT user_id FROM posts WHERE id = $1', [id]);
      const post = result.rows[0];
      await this.pool.query('DELETE FROM posts WHERE id = $1', [id]);
      syncService.emitChange({
        operation: 'delete',
        table: 'posts',
        id: id,
        userId: post ? post.user_id : undefined,
      });
    }
  };

  // Social Accounts
  socialAccounts = {
    create: async (account: SocialAccount): Promise<SocialAccount> => {
      const { userId, platform, username, accessToken, refreshToken, tokenExpiry, profileData, connected, connectedAt } = account;
      const result = await this.pool.query(
        'INSERT INTO social_accounts (user_id, platform, username, access_token, refresh_token, token_expiry, profile_data, connected, connected_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [userId, platform, username, accessToken, refreshToken, tokenExpiry, profileData, connected, connectedAt]
      );
      const newAccount = result.rows[0];
      syncService.emitChange({
        operation: 'create',
        table: 'social_accounts',
        id: newAccount.id,
        data: newAccount,
        userId: newAccount.user_id,
      });
      return newAccount;
    },

    findAll: async (userId: string): Promise<SocialAccount[]> => {
      const result = await this.pool.query('SELECT * FROM social_accounts WHERE user_id = $1', [userId]);
      return result.rows;
    },

    findByPlatform: async (userId: string, platform: string): Promise<SocialAccount | null> => {
      const result = await this.pool.query('SELECT * FROM social_accounts WHERE user_id = $1 AND platform = $2', [userId, platform]);
      return result.rows[0];
    },

    update: async (account: Partial<SocialAccount>): Promise<SocialAccount> => {
      const { userId, platform, username, accessToken, refreshToken, tokenExpiry, profileData, connected, connectedAt } = account;
      const fields = [];
      const values = [];
      let valueIndex = 1;

      if (username) {
        fields.push(`username = $${valueIndex}`);
        values.push(username);
        valueIndex++;
      }

      if (accessToken !== undefined) {
        fields.push(`access_token = $${valueIndex}`);
        values.push(accessToken);
        valueIndex++;
      }

      if (refreshToken !== undefined) {
        fields.push(`refresh_token = $${valueIndex}`);
        values.push(refreshToken);
        valueIndex++;
      }

      if (tokenExpiry !== undefined) {
        fields.push(`token_expiry = $${valueIndex}`);
        values.push(tokenExpiry);
        valueIndex++;
      }

      if (profileData !== undefined) {
        fields.push(`profile_data = $${valueIndex}`);
        values.push(profileData);
        valueIndex++;
      }

      if (connected !== undefined) {
        fields.push(`connected = $${valueIndex}`);
        values.push(connected);
        valueIndex++;
      }

      if (connectedAt !== undefined) {
        fields.push(`connected_at = $${valueIndex}`);
        values.push(connectedAt);
        valueIndex++;
      }

      if (fields.length === 0 && userId && platform) {
        const existingAccount = await this.socialAccounts.findByPlatform(userId, platform);
        if (existingAccount) {
          return existingAccount;
        }
      }

      values.push(userId);
      values.push(platform);

      const result = await this.pool.query(
        `UPDATE social_accounts SET ${fields.join(', ')} WHERE user_id = $${valueIndex} AND platform = $${valueIndex + 1} RETURNING *`,
        values
      );

      if (result.rows.length === 0 && userId && platform) {
        return this.socialAccounts.create(account as SocialAccount);
      }

      const updatedAccount = result.rows[0];
      syncService.emitChange({
        operation: 'update',
        table: 'social_accounts',
        id: updatedAccount.id,
        data: updatedAccount,
        userId: updatedAccount.user_id,
      });
      return updatedAccount;
    },

    upsert: async (account: SocialAccount): Promise<SocialAccount> => {
        const existing = await this.socialAccounts.findByPlatform(account.userId, account.platform);
        if (existing) {
            return this.socialAccounts.update(account);
        } else {
            return this.socialAccounts.create(account);
        }
    },

    delete: async (userId: string, platform: string): Promise<void> => {
        const accountToDelete = await this.socialAccounts.findByPlatform(userId, platform);
        if(accountToDelete){
            await this.pool.query('DELETE FROM social_accounts WHERE user_id = $1 AND platform = $2', [userId, platform]);
            syncService.emitChange({
                operation: 'delete',
                table: 'social_accounts',
                id: accountToDelete.id,
                userId: userId,
            });
        }
    }
  };

  // Notification Preferences
  notificationPreferences = {
    create: async (preferences: any) => {
      const { userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt } = preferences;
      const result = await this.pool.query(
        'INSERT INTO notification_preferences (user_id, email_digest, email_post_published, email_post_failed, browser_notifications, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt]
      );
      const newPreferences = result.rows[0];
      syncService.emitChange({
        operation: 'create',
        table: 'notification_preferences',
        id: newPreferences.id,
        data: newPreferences,
        userId: newPreferences.user_id,
      });
      return newPreferences;
    },

    findByUserId: async (userId: string) => {
      const result = await this.pool.query('SELECT * FROM notification_preferences WHERE user_id = $1', [userId]);
      return result.rows[0];
    },

    update: async (preferences: any) => {
      const { userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt } = preferences;
      const fields = [];
      const values = [];
      let valueIndex = 1;

      if (emailDigest !== undefined) {
        fields.push(`email_digest = $${valueIndex}`);
        values.push(emailDigest);
        valueIndex++;
      }

      if (emailPostPublished !== undefined) {
        fields.push(`email_post_published = $${valueIndex}`);
        values.push(emailPostPublished);
        valueIndex++;
      }

      if (emailPostFailed !== undefined) {
        fields.push(`email_post_failed = $${valueIndex}`);
        values.push(emailPostFailed);
        valueIndex++;
      }

      if (browserNotifications !== undefined) {
        fields.push(`browser_notifications = $${valueIndex}`);
        values.push(browserNotifications);
        valueIndex++;
      }

      fields.push(`updated_at = $${valueIndex}`);
      values.push(updatedAt);
      valueIndex++;

      values.push(userId);

      const result = await this.pool.query(
        `UPDATE notification_preferences SET ${fields.join(', ')} WHERE user_id = $${valueIndex} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        // Preferences don't exist, create them
        return this.notificationPreferences.create(preferences);
      }

      const updatedPreferences = result.rows[0];
      syncService.emitChange({
        operation: 'update',
        table: 'notification_preferences',
        id: updatedPreferences.id,
        data: updatedPreferences,
        userId: updatedPreferences.user_id,
      });
      return updatedPreferences;
    }
  };

  async replicateCreate(table: string, data: any): Promise<any> {
    // NOTE: This is a simplified generic implementation. It assumes 'id' is the primary key
    // and may not handle all unique constraints correctly for all tables.
    const columns = Object.keys(data);
    const values = Object.values(data);
    const valuePlaceholders = values.map((_, i) => `$${i + 1}`).join(', ');

    // Using ON CONFLICT (id) DO UPDATE to handle cases where the record already exists.
    // This makes the replication more robust.
    const setClause = columns.map(col => `${col} = EXCLUDED.${col}`).join(', ');
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${valuePlaceholders}) ON CONFLICT (id) DO UPDATE SET ${setClause} RETURNING *`;

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error(`[REPLICATE] Error in replicateCreate for table ${table}:`, error);
      // In a real-world scenario, you might want to try an UPDATE if the INSERT fails with a unique constraint violation
      // that is not on the primary key. For now, we just log the error.
      throw error;
    }
  }

  async replicateUpdate(table: string, id: string | number, data: any): Promise<any> {
    // NOTE: This is a simplified generic implementation.
    const columns = Object.keys(data).filter(k => k !== 'id');
    const values = columns.map(k => data[k]);
    const setClause = columns.map((col, i) => `${col} = $${i + 1}`).join(', ');

    const query = `UPDATE ${table} SET ${setClause} WHERE id = $${columns.length + 1} RETURNING *`;
    
    try {
      const result = await this.pool.query(query, [...values, id]);
      if (result.rows.length === 0) {
        // If the update affected 0 rows, it means the record doesn't exist.
        // We should probably create it.
        return this.replicateCreate(table, { id, ...data });
      }
      return result.rows[0];
    } catch (error) {
      console.error(`[REPLICATE] Error in replicateUpdate for table ${table}:`, error);
      throw error;
    }
  }

  async replicateDelete(table: string, id: string | number): Promise<void> {
    // NOTE: This is a simplified generic implementation.
    const query = `DELETE FROM ${table} WHERE id = $1`;
    try {
      await this.pool.query(query, [id]);
    } catch (error) {
      console.error(`[REPLICATE] Error in replicateDelete for table ${table}:`, error);
      throw error;
    }
  }
}