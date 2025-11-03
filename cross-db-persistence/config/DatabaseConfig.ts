import { DatabaseType, DatabaseConfig } from '../database/DatabaseFactory';

export class DatabaseConfigManager {
  private static userPreferences: Map<string, DatabaseType> = new Map();

  /**
   * Get user's preferred database type
   */
  static getUserPreference(userId: string): DatabaseType | null {
    return this.userPreferences.get(userId) || null;
  }

  /**
   * Set user's preferred database type
   */
  static setUserPreference(userId: string, dbType: DatabaseType): void {
    this.userPreferences.set(userId, dbType);
    console.log(`📝 User ${userId} preference set to: ${dbType}`);
  }

  /**
   * Get database configuration for user
   */
  static getConfigForUser(userId: string): DatabaseConfig {
    const preferredType = this.getUserPreference(userId) || this.getDefaultDatabaseType();
    
    return {
      type: preferredType,
      connectionString: process.env.DATABASE_URL,
      dbPath: process.env.DB_PATH || './data.sqlite',
      fallbackType: preferredType === 'postgres' ? 'sqlite' : undefined
    };
  }

  /**
   * Get default database type from environment
   */
  static getDefaultDatabaseType(): DatabaseType {
    const envType = process.env.DB_TYPE?.toLowerCase();
    
    if (envType === 'postgres' || envType === 'postgresql') {
      return 'postgres';
    }
    
    return 'sqlite'; // Default fallback
  }

  /**
   * Get available database types based on environment
   */
  static getAvailableDatabaseTypes(): DatabaseType[] {
    const available: DatabaseType[] = ['sqlite']; // SQLite is always available
    
    // Check if PostgreSQL is configured
    if (process.env.DATABASE_URL) {
      available.push('postgres');
    }
    
    return available;
  }

  /**
   * Test if database type is available
   */
  static async isDatabaseTypeAvailable(dbType: DatabaseType): Promise<boolean> {
    try {
      const { DatabaseFactory } = await import('../database/DatabaseFactory');
      
      const config: DatabaseConfig = {
        type: dbType,
        connectionString: process.env.DATABASE_URL,
        dbPath: process.env.DB_PATH || './data.sqlite'
      };
      
      return await DatabaseFactory.testConnection(config);
    } catch (error) {
      console.error(`Database type ${dbType} not available:`, error);
      return false;
    }
  }

  /**
   * Get runtime database configuration
   */
  static getRuntimeConfig(): {
    currentType: DatabaseType;
    availableTypes: DatabaseType[];
    canSwitch: boolean;
    fallbackEnabled: boolean;
  } {
    const currentType = this.getDefaultDatabaseType();
    const availableTypes = this.getAvailableDatabaseTypes();
    
    return {
      currentType,
      availableTypes,
      canSwitch: availableTypes.length > 1,
      fallbackEnabled: process.env.ENABLE_DB_FALLBACK === 'true'
    };
  }

  /**
   * Validate database configuration
   */
  static validateConfig(config: DatabaseConfig): string[] {
    const errors: string[] = [];

    if (!config.type) {
      errors.push('Database type is required');
    }

    if (config.type === 'postgres' && !config.connectionString && !process.env.DATABASE_URL) {
      errors.push('PostgreSQL connection string is required');
    }

    if (config.type === 'sqlite' && config.dbPath && !config.dbPath.endsWith('.sqlite')) {
      errors.push('SQLite database path should end with .sqlite');
    }

    return errors;
  }

  /**
   * Load user preferences from storage (localStorage simulation)
   */
  static loadUserPreferences(): void {
    // In a real implementation, this would load from a persistent store
    // For now, we'll use environment variables or defaults
    console.log('📚 Loading user database preferences...');
    
    // Example: Load from environment variable
    const defaultUsers = process.env.DEFAULT_USER_DB_PREFERENCES;
    if (defaultUsers) {
      try {
        const preferences = JSON.parse(defaultUsers);
        Object.entries(preferences).forEach(([userId, dbType]) => {
          this.setUserPreference(userId, dbType as DatabaseType);
        });
      } catch (error) {
        console.error('Failed to parse user preferences:', error);
      }
    }
  }

  /**
   * Save user preferences to storage
   */
  static saveUserPreferences(): void {
    // In a real implementation, this would save to a persistent store
    console.log('💾 Saving user database preferences...');
    
    const preferences: Record<string, DatabaseType> = {};
    this.userPreferences.forEach((dbType, userId) => {
      preferences[userId] = dbType;
    });
    
    console.log('Current preferences:', preferences);
  }
}