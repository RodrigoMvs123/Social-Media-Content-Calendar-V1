const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function migrate() {
  try {
    const db = await open({
      filename: './data.sqlite',
      driver: sqlite3.Database
    });

    // Create temporary table with new structure
    await db.exec(`
      CREATE TABLE notification_preferences_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        browserNotifications BOOLEAN NOT NULL DEFAULT 1,
        updatedAt TEXT NOT NULL
      );
    `);

    // Copy data from old table to new table
    await db.exec(`
      INSERT INTO notification_preferences_new (userId, browserNotifications, updatedAt)
      SELECT userId, browserNotifications, updatedAt FROM notification_preferences;
    `);

    // Drop old table
    await db.exec('DROP TABLE notification_preferences;');

    // Rename new table to original name
    await db.exec('ALTER TABLE notification_preferences_new RENAME TO notification_preferences;');

    console.log('✅ Successfully migrated notification_preferences table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();
