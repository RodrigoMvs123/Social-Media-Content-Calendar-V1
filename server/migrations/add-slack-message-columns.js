const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function addSlackColumns() {
  try {
    const db = await open({
      filename: './data.sqlite',
      driver: sqlite3.Database
    });

    // Check if columns exist before adding them
    const postsTableInfo = await db.all("PRAGMA table_info(posts)");
    const existingColumns = postsTableInfo.map(col => col.name);
    
    if (!existingColumns.includes('slackMessageTs')) {
      await db.exec('ALTER TABLE posts ADD COLUMN slackMessageTs TEXT;');
    }
    if (!existingColumns.includes('slackScheduledTs')) {
      await db.exec('ALTER TABLE posts ADD COLUMN slackScheduledTs TEXT;');
    }

    // Update notification_preferences table to include email preferences
    await db.exec(`
      CREATE TABLE IF NOT EXISTS temp_notification_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT NOT NULL UNIQUE,
        emailDigest BOOLEAN NOT NULL DEFAULT 0,
        emailPostPublished BOOLEAN NOT NULL DEFAULT 0,
        emailPostFailed BOOLEAN NOT NULL DEFAULT 0,
        browserNotifications BOOLEAN NOT NULL DEFAULT 1,
        updatedAt TEXT NOT NULL
      );

      INSERT INTO temp_notification_preferences (userId, browserNotifications, updatedAt)
      SELECT userId, browserNotifications, updatedAt FROM notification_preferences;

      DROP TABLE notification_preferences;

      ALTER TABLE temp_notification_preferences RENAME TO notification_preferences;
    `);

    console.log('✅ Successfully added Slack message columns and updated notification preferences schema');
  } catch (error) {
    console.error('❌ Error updating schema:', error);
    process.exit(1);
  }
}

addSlackColumns();
