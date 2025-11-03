import { EventEmitter } from 'events';
import { DatabaseAdapter } from '../../server/db-adapter';
import { DatabaseFactory, DatabaseType } from '../database/DatabaseFactory';
import { DatabaseConfigManager } from '../config/DatabaseConfig';

// Helper function to convert snake_case keys to camelCase
function keysToCamel(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(keysToCamel);
  }
  
  const camelObj: any = {};
  Object.keys(obj).forEach(key => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    camelObj[camelKey] = keysToCamel(obj[key]);
  });
  
  return camelObj;
}

export interface SyncEvent {
  operation: 'create' | 'update' | 'delete';
  table: string;
  id: string | number;
  data?: any;
  userId?: string;
}

class RealTimeSyncService {
  private static instance: RealTimeSyncService;
  private isEnabled = false;
  private primaryType: DatabaseType | null = null;
  private secondaryType: DatabaseType | null = null;
  private secondaryDb: DatabaseAdapter | null = null;
  public eventEmitter = new EventEmitter();

  private constructor() {
    this.isEnabled = process.env.ENABLE_REAL_TIME_SYNC === 'true';
    if (this.isEnabled) {
      this.initialize();
    }
  }

  public static getInstance(): RealTimeSyncService {
    if (!RealTimeSyncService.instance) {
      RealTimeSyncService.instance = new RealTimeSyncService();
    }
    return RealTimeSyncService.instance;
  }

  private async initialize(): Promise<void> {
    console.log('🔄 Initializing Real-Time Sync Service...');
    const config = DatabaseConfigManager.getRuntimeConfig();
    this.primaryType = config.currentType;

    // Bidirectional sync: determine secondary database
    if (this.primaryType === 'postgres') {
      this.secondaryType = 'sqlite';
    } else if (this.primaryType === 'sqlite') {
      this.secondaryType = 'postgres';
    } else {
      console.log('⚠️ Real-time sync requires either PostgreSQL or SQLite as primary database.');
      this.isEnabled = false;
      return;
    }

    // Check if secondary database connection is available
    if (this.secondaryType === 'postgres' && !process.env.DATABASE_URL) {
      console.log('ℹ️ PostgreSQL connection not available for sync (DATABASE_URL not set)');
      this.isEnabled = false;
      return;
    }

    try {
      this.secondaryDb = await DatabaseFactory.createAdapter({ type: this.secondaryType });
      this.eventEmitter.on('dataChange', this.handleDataChange.bind(this));
      console.log(`✅ Real-Time Sync enabled: ${this.primaryType} -> ${this.secondaryType}`);
    } catch (error) {
      console.log(`ℹ️ Secondary database (${this.secondaryType}) not available for sync`);
      this.isEnabled = false;
    }
  }

  private async handleDataChange(event: SyncEvent): Promise<void> {
    if (!this.isEnabled || !this.secondaryDb) return;

    console.log(`[SYNC] Received event: ${event.operation} on ${event.table} for id ${event.id}`);

    // Convert data based on target database type
    let processedData = event.data;
    if (this.secondaryType === 'sqlite' && event.data) {
      // Convert snake_case to camelCase for SQLite
      processedData = keysToCamel(event.data);
    } else if (this.secondaryType === 'postgres' && event.data) {
      // Keep snake_case for PostgreSQL or convert if needed
      processedData = event.data;
    }

    try {
      switch (event.operation) {
        case 'create':
          await this.secondaryDb.replicateCreate(event.table, processedData);
          break;
        case 'update':
          await this.secondaryDb.replicateUpdate(event.table, event.id, processedData);
          break;
        case 'delete':
          await this.secondaryDb.replicateDelete(event.table, event.id);
          break;
      }
      console.log(`[SYNC] ✅ Successfully replicated ${event.operation} on ${event.table} for id ${event.id}`);
    } catch (error) {
      console.error(`[SYNC] ❌ Failed to replicate operation:`, error);
      // In a production system, you'd add this to a retry queue.
    }
  }

  public emitChange(event: SyncEvent): void {
    if (!this.isEnabled) return;
    this.eventEmitter.emit('dataChange', event);
  }
}

// Export a singleton instance
export const syncService = RealTimeSyncService.getInstance();

/**
 * NOTE: This is a simplified implementation to demonstrate the concept.
 * A production-ready system would require:
 * - A robust queueing system (like RabbitMQ or a database table) to prevent lost events.
 * - More generic replication methods on the DatabaseAdapter.
 * - Comprehensive conflict resolution and error handling logic.
 */