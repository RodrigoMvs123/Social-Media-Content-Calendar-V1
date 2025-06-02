import { DatabaseAdapter } from './db-adapter';
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

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
  async users = {
    create: async (user: any) => {
      const { name, email, password, createdAt, updatedAt } = user;
      const result = await this.pool.query(
        'INSERT INTO users (name, email, password, created_at, updated_at) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, password, createdAt, updatedAt]
      );
      return result.rows[0];
    },

    findByEmail: async (email: string) => {
      const result = await this.pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return result.rows[0];
    },

    findById: async (id: string) => {
      const result = await this.pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    },

    update: async (user: any) => {
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
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${valueIndex - 1} RETURNING *`,
        values
      );
      return result.rows[0];
    }
  };

  // Posts
  async posts = {
    create: async (post: any) => {
      const { userId, content, platform, scheduledTime, status, createdAt, updatedAt } = post;
      const result = await this.pool.query(
        'INSERT INTO posts (user_id, content, platform, scheduled_time, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [userId, content, platform, scheduledTime, status || 'scheduled', createdAt, updatedAt]
      );
      return result.rows[0];
    },

    findAll: async (userId: string) => {
      const result = await this.pool.query('SELECT * FROM posts WHERE user_id = $1 ORDER BY scheduled_time', [userId]);
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
        `UPDATE posts SET ${fields.join(', ')} WHERE id = $${valueIndex - 1} RETURNING *`,
        values
      );
      return result.rows[0];
    },

    delete: async (id: string) => {
      await this.pool.query('DELETE FROM posts WHERE id = $1', [id]);
      return { success: true };
    }
  };

  // Social Accounts
  async socialAccounts = {
    create: async (account: any) => {
      const { userId, platform, username, accessToken, refreshToken, tokenExpiry, profileData, connected, connectedAt } = account;
      const result = await this.pool.query(
        'INSERT INTO social_accounts (user_id, platform, username, access_token, refresh_token, token_expiry, profile_data, connected, connected_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [userId, platform, username, accessToken, refreshToken, tokenExpiry, profileData, connected, connectedAt]
      );
      return result.rows[0];
    },

    findAll: async (userId: string) => {
      const result = await this.pool.query('SELECT * FROM social_accounts WHERE user_id = $1', [userId]);
      return result.rows;
    },

    findByPlatform: async (userId: string, platform: string) => {
      const result = await this.pool.query('SELECT * FROM social_accounts WHERE user_id = $1 AND platform = $2', [userId, platform]);
      return result.rows[0];
    },

    update: async (account: any) => {
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

      if (fields.length === 0) {
        // No fields to update
        const existingAccount = await this.socialAccounts.findByPlatform(userId, platform);
        return existingAccount;
      }

      values.push(userId);
      values.push(platform);

      const result = await this.pool.query(
        `UPDATE social_accounts SET ${fields.join(', ')} WHERE user_id = $${valueIndex} AND platform = $${valueIndex + 1} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        // Account doesn't exist, create it
        return this.socialAccounts.create(account);
      }

      return result.rows[0];
    }
  };

  // Notification Preferences
  async notificationPreferences = {
    create: async (preferences: any) => {
      const { userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt } = preferences;
      const result = await this.pool.query(
        'INSERT INTO notification_preferences (user_id, email_digest, email_post_published, email_post_failed, browser_notifications, updated_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [userId, emailDigest, emailPostPublished, emailPostFailed, browserNotifications, updatedAt]
      );
      return result.rows[0];
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
        `UPDATE notification_preferences SET ${fields.join(', ')} WHERE user_id = $${valueIndex - 1} RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        // Preferences don't exist, create them
        return this.notificationPreferences.create(preferences);
      }

      return result.rows[0];
    }
  };
}