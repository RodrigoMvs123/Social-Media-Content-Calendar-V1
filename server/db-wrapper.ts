import { DatabaseAdapter } from './db-adapter';
import { SQLiteAdapter } from './sqlite-db';
import { PostgresAdapter } from './postgres-db';
import { validateEnv } from './validateEnv';
import path from 'path';
import dotenv from 'dotenv';

// Force reload environment variables to ensure we get the latest values
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Get database type from environment variables
const dbType = process.env.DB_TYPE || 'sqlite';
const dbPath = process.env.DB_PATH || './data.sqlite';
const dbUrl = process.env.DATABASE_URL;

// Log database configuration
console.log(`Database configuration (final):`);
console.log(`- DB_TYPE: ${dbType}`);
if (dbType.toLowerCase() === 'postgres') {
  console.log(`- DATABASE_URL: ${dbUrl ? 'Set (hidden)' : 'Not set'}`);
} else {
  console.log(`- DB_PATH: ${dbPath}`);
}

// Create database adapter based on configuration
let dbAdapter: DatabaseAdapter;

// Force PostgreSQL if DATABASE_URL is set
if (dbUrl && dbType.toLowerCase() === 'postgres') {
  console.log('Using PostgreSQL database adapter');
  dbAdapter = new PostgresAdapter();
} else {
  console.log('Using SQLite database adapter (fallback)');
  dbAdapter = new SQLiteAdapter(dbPath);
}

// Initialize database
const initializeDb = async () => {
  try {
    await dbAdapter.initialize();
    console.log(`Database (${dbType}) initialized successfully`);
  } catch (error) {
    console.error('Failed to initialize database:', error);
    console.error('Error details:', error);
    
    // If PostgreSQL fails, fall back to SQLite
    if (dbType.toLowerCase() === 'postgres') {
      console.log('Falling back to SQLite database');
      dbAdapter = new SQLiteAdapter(dbPath);
      await dbAdapter.initialize();
      console.log('SQLite database initialized successfully as fallback');
    } else {
      process.exit(1);
    }
  }
};

// Export the database adapter
export const db = dbAdapter;
export const initDb = initializeDb;