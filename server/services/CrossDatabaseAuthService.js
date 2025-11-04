const bcrypt = require('bcrypt');
// Use direct database connections instead of TypeScript modules in production
// const { DatabaseFactory } = require('../../cross-db-persistence/database/DatabaseFactory');
// const { DataMigrationService } = require('../../cross-db-persistence/services/DataMigrationService');

class CrossDatabaseAuthService {
  constructor() {
    // this.migrationService = new DataMigrationService();
  }

  /**
   * Universal authentication that works across both databases
   */
  async authenticateUser(email, password) {
    console.log(`🔍 Universal auth: Searching for user ${email}`);
    
    // Get current database type
    const currentDBType = process.env.DB_TYPE || 'sqlite';
    const otherDBType = currentDBType === 'sqlite' ? 'postgres' : 'sqlite';
    
    console.log(`🔍 Current DB: ${currentDBType}, Other DB: ${otherDBType}`);
    
    try {
      // Try current database first
      let user = await this.findUserInDatabase(currentDBType, email);
      
      if (user) {
        console.log(`✅ User found in current database (${currentDBType})`);
        const isValid = await bcrypt.compare(password, user.password);
        
        if (isValid) {
          return {
            success: true,
            user: this.sanitizeUser(user),
            source: currentDBType,
            migrated: false
          };
        } else {
          return { success: false, error: 'Invalid password' };
        }
      }
      
      // User not found in current DB, try other database
      console.log(`🔍 User not found in ${currentDBType}, checking ${otherDBType}...`);
      
      user = await this.findUserInDatabase(otherDBType, email);
      
      if (user) {
        console.log(`✅ User found in other database (${otherDBType})`);
        const isValid = await bcrypt.compare(password, user.password);
        
        if (isValid) {
          // Auto-migrate user to current database
          console.log(`🔄 Auto-migrating user from ${otherDBType} to ${currentDBType}`);
          
          const migratedUser = await this.autoMigrateUser(user, otherDBType, currentDBType);
          
          return {
            success: true,
            user: this.sanitizeUser(migratedUser),
            source: otherDBType,
            migrated: true,
            message: `User automatically migrated from ${otherDBType} to ${currentDBType}`
          };
        } else {
          return { success: false, error: 'Invalid password' };
        }
      }
      
      // User not found in either database
      console.log(`❌ User ${email} not found in any database`);
      return { success: false, error: 'User not found' };
      
    } catch (error) {
      console.error('❌ Universal auth error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  /**
   * Auto-migrate user from source to target database
   */
  async autoMigrateUser(user, sourceDBType, targetDBType) {
    try {
      console.log(`🔄 Starting simple auto-migration for user ${user.email}`);
      
      // Simple direct user migration - just copy the user
      if (targetDBType === 'postgres') {
        const { Pool } = require('pg');
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        const result = await pool.query(
          'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
          [user.name, user.email, user.password]
        );
        
        await pool.end();
        console.log(`✅ User migrated to PostgreSQL with ID: ${result.rows[0].id}`);
        return result.rows[0];
        
      } else if (targetDBType === 'sqlite') {
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');
        
        const db = await open({
          filename: process.env.DB_PATH || './data.sqlite',
          driver: sqlite3.Database
        });
        
        const result = await db.run(
          'INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
          [user.name, user.email, user.password, new Date().toISOString(), new Date().toISOString()]
        );
        
        const newUser = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
        await db.close();
        
        console.log(`✅ User migrated to SQLite with ID: ${newUser.id}`);
        return newUser;
      }
      
    } catch (error) {
      console.error('❌ Simple auto-migration error:', error);
      // If migration fails, still allow login with original user
      console.log(`⚠️ Migration failed, but allowing login with original user data`);
      return user;
    }
  }

  /**
   * Check if user exists in any database
   */
  async findUserAcrossDBs(email) {
    const databases = ['sqlite', 'postgres'];
    
    for (const dbType of databases) {
      const user = await this.findUserInDatabase(dbType, email);
      
      if (user) {
        return { user: this.sanitizeUser(user), sourceDB: dbType };
      }
    }
    
    return null;
  }

  /**
   * Register user in current database with cross-DB email validation
   */
  async registerUser(userData) {
    const { email, password, name } = userData;
    
    console.log(`📝 Universal registration: ${email}`);
    
    // Check if user already exists in any database
    const existingUser = await this.findUserAcrossDBs(email);
    
    if (existingUser) {
      return {
        success: false,
        error: `User already exists in ${existingUser.sourceDB} database`
      };
    }
    
    // Create user in current database
    const currentDBType = process.env.DB_TYPE || 'sqlite';
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString();
    
    let newUser;
    
    if (currentDBType === 'sqlite') {
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      
      const db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      const result = await db.run(
        'INSERT INTO users (name, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, now, now]
      );
      
      newUser = await db.get('SELECT * FROM users WHERE id = ?', result.lastID);
      await db.close();
    } else if (currentDBType === 'postgres') {
      const { Pool } = require('pg');
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
      });
      
      const result = await pool.query(
        'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
        [name, email, hashedPassword]
      );
      
      newUser = result.rows[0];
      await pool.end();
    }
    
    console.log(`✅ User registered in ${currentDBType}:`, email);
    
    return {
      success: true,
      user: this.sanitizeUser(newUser),
      database: currentDBType
    };
  }

  /**
   * Find user in specific database type
   */
  async findUserInDatabase(dbType, email) {
    try {
      if (dbType === 'sqlite') {
        const sqlite3 = require('sqlite3');
        const { open } = require('sqlite');
        
        const db = await open({
          filename: process.env.DB_PATH || './data.sqlite',
          driver: sqlite3.Database
        });
        
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        await db.close();
        
        return user;
      } else if (dbType === 'postgres') {
        const { Pool } = require('pg');
        
        if (!process.env.DATABASE_URL) {
          console.log(`⚠️ No PostgreSQL URL configured, skipping ${dbType}`);
          return null;
        }
        
        const pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false }
        });
        
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        await pool.end();
        
        return result.rows[0] || null;
      }
    } catch (error) {
      console.log(`⚠️ Could not check ${dbType}:`, error.message);
      return null;
    }
  }

  /**
   * Remove sensitive data from user object
   */
  sanitizeUser(user) {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}

module.exports = { CrossDatabaseAuthService };