// Script to fix SQLite schema issues
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

async function fixSQLiteSchema() {
  try {
    const dbPath = process.env.DB_PATH || './data.sqlite';
    console.log(`Fixing SQLite schema at: ${dbPath}`);
    
    // Open database connection
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    console.log('SQLite connection established');
    
    // Check if posts table exists
    const tableCheck = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='posts'");
    
    if (tableCheck) {
      console.log('Posts table exists, checking columns...');
      
      // Get column info
      const columns = await db.all("PRAGMA table_info(posts)");
      const columnNames = columns.map(col => col.name);
      
      console.log('Current columns:', columnNames);
      
      // Check if media column exists
      if (!columnNames.includes('media')) {
        console.log('Adding media column to posts table...');
        await db.exec('ALTER TABLE posts ADD COLUMN media TEXT');
        console.log('Media column added successfully');
      } else {
        console.log('Media column already exists');
      }
      
      // Check for other required columns with correct casing
      const requiredColumns = [
        'id', 'userId', 'platform', 'content', 
        'scheduledTime', 'status', 'createdAt', 'updatedAt'
      ];
      
      // Check for case-sensitive column names
      for (const column of requiredColumns) {
        if (!columnNames.includes(column)) {
          const lowerCaseMatch = columnNames.find(
            col => col.toLowerCase() === column.toLowerCase()
          );
          
          if (lowerCaseMatch) {
            console.log(`Column case mismatch: ${lowerCaseMatch} should be ${column}`);
          } else {
            console.log(`Missing column: ${column}`);
          }
        }
      }
      
      // Create a new table with correct schema if needed
      if (columnNames.some(col => col !== col.toLowerCase() && requiredColumns.map(c => c.toLowerCase()).includes(col.toLowerCase()))) {
        console.log('Recreating posts table with correct column names...');
        
        // Backup existing data
        await db.exec('CREATE TABLE posts_backup AS SELECT * FROM posts');
        console.log('Backed up existing posts data');
        
        // Drop existing table
        await db.exec('DROP TABLE posts');
        console.log('Dropped old posts table');
        
        // Create new table with correct column names
        await db.exec(`
          CREATE TABLE posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT NOT NULL,
            platform TEXT NOT NULL,
            content TEXT NOT NULL,
            scheduledTime TEXT NOT NULL,
            status TEXT NOT NULL,
            media TEXT,
            createdAt TEXT NOT NULL,
            updatedAt TEXT NOT NULL
          )
        `);
        console.log('Created new posts table with correct schema');
        
        // Try to restore data with column mapping
        try {
          const backupColumns = await db.all("PRAGMA table_info(posts_backup)");
          const backupColumnNames = backupColumns.map(col => col.name);
          
          // Map old column names to new ones
          const columnMap = {};
          for (const oldCol of backupColumnNames) {
            const newCol = requiredColumns.find(c => c.toLowerCase() === oldCol.toLowerCase());
            if (newCol) columnMap[oldCol] = newCol;
          }
          
          // Build INSERT statement with column mapping
          const sourceColumns = Object.keys(columnMap).join(', ');
          const targetColumns = Object.values(columnMap).join(', ');
          
          await db.exec(`INSERT INTO posts (${targetColumns}) SELECT ${sourceColumns} FROM posts_backup`);
          console.log('Restored data to new table');
        } catch (error) {
          console.error('Error restoring data:', error);
        }
      }
    } else {
      console.log('Posts table does not exist, creating it...');
      
      // Create posts table with correct schema
      await db.exec(`
        CREATE TABLE posts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          platform TEXT NOT NULL,
          content TEXT NOT NULL,
          scheduledTime TEXT NOT NULL,
          status TEXT NOT NULL,
          media TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )
      `);
      console.log('Created posts table with correct schema');
    }
    
    console.log('SQLite schema fix completed');
  } catch (error) {
    console.error('Error fixing SQLite schema:', error);
  }
}

fixSQLiteSchema();