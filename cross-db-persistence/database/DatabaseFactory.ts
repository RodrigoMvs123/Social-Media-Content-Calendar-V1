import { DatabaseAdapter } from '../../server/db-adapter';
import { syncService } from '../services/RealTimeSyncService';

export type DatabaseType = 'sqlite' | 'postgres';

export interface DatabaseConfig {
  type: DatabaseType;
  connectionString?: string;
  dbPath?: string;
  fallbackType?: DatabaseType;
}

export class DatabaseFactory {
  private static instance: DatabaseAdapter | null = null;
  private static currentConfig: DatabaseConfig | null = null;

  static async getInstance(config?: DatabaseConfig): Promise<DatabaseAdapter> {
    if (!this.instance || (config && this.configChanged(config))) {
      this.instance = await this.createAdapter(config);
      this.currentConfig = config || null;

      // Initialize sync service after primary DB is ready
      // syncService.getInstance();
    }
    return this.instance;
  }

  static async createAdapter(config?: DatabaseConfig): Promise<DatabaseAdapter> {
    const dbConfig = config || this.getConfigFromEnv();
    
    try {
      const adapter = await this.tryCreateAdapter(dbConfig.type, dbConfig);
      await adapter.initialize();
      console.log(`✅ Database initialized: ${dbConfig.type}`);
      return adapter;
    } catch (error) {
      console.error(`❌ Failed to initialize ${dbConfig.type}:`, error);
      
      if (dbConfig.fallbackType && dbConfig.fallbackType !== dbConfig.type) {
        console.log(`🔄 Attempting fallback to ${dbConfig.fallbackType}...`);
        try {
          const fallbackAdapter = await this.tryCreateAdapter(dbConfig.fallbackType, dbConfig);
          await fallbackAdapter.initialize();
          console.log(`✅ Fallback database initialized: ${dbConfig.fallbackType}`);
          return fallbackAdapter;
        } catch (fallbackError) {
          console.error(`❌ Fallback database also failed:`, fallbackError);
        }
      }
      
      throw new Error(`Failed to initialize any database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private static async tryCreateAdapter(type: DatabaseType, config: DatabaseConfig): Promise<DatabaseAdapter> {
    switch (type) {
      case 'postgres': {
        if (!config.connectionString && !process.env.DATABASE_URL) {
          throw new Error('PostgreSQL connection string required');
        }
        const { PostgresAdapter } = await import('../../server/postgres-db');
        return new PostgresAdapter();
      }
      case 'sqlite': {
        const dbPath = config.dbPath || process.env.DB_PATH || './data.sqlite';
        const { SQLiteAdapter } = await import('../../server/sqlite-db');
        return new SQLiteAdapter(dbPath);
      }
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  private static getConfigFromEnv(): DatabaseConfig {
    const dbType = (process.env.DB_TYPE || 'sqlite') as DatabaseType;
    
    return {
      type: dbType,
      connectionString: process.env.DATABASE_URL,
      dbPath: process.env.DB_PATH || './data.sqlite',
      fallbackType: dbType === 'postgres' ? 'sqlite' : undefined
    };
  }

  private static configChanged(newConfig: DatabaseConfig): boolean {
    if (!this.currentConfig) return true;
    
    return (
      this.currentConfig.type !== newConfig.type ||
      this.currentConfig.connectionString !== newConfig.connectionString ||
      this.currentConfig.dbPath !== newConfig.dbPath
    );
  }

  static reset(): void {
    this.instance = null;
    this.currentConfig = null;
  }

  static getCurrentType(): DatabaseType | null {
    return this.currentConfig?.type || null;
  }

  static async testConnection(config?: DatabaseConfig): Promise<boolean> {
    try {
      const adapter = await this.createAdapter(config);
      return true;
    } catch (error) {
      console.error('Database connection test failed:', error);
      return false;
    }
  }
}