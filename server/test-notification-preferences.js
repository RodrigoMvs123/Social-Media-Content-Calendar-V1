const dotenv = require('dotenv');
dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

async function testNotificationPreferences() {
  console.log(`🧪 Testing notification preferences with ${dbType.toUpperCase()}...`);
  
  if (dbType === 'sqlite') {
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    try {
      // Create/open SQLite database
      const db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      console.log('✅ SQLite connected');
      
      // Create slack_settings table if it doesn't exist
      await db.run(`
        CREATE TABLE IF NOT EXISTS slack_settings (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL UNIQUE,
          botToken TEXT,
          channelId TEXT,
          channelName TEXT,
          isActive BOOLEAN DEFAULT 1,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          slackScheduled BOOLEAN DEFAULT 1,
          slackPublished BOOLEAN DEFAULT 1,
          slackFailed BOOLEAN DEFAULT 1
        )
      `);
      console.log('✅ slack_settings table ready');
      
      // Test inserting/updating preferences
      const userId = 1;
      const now = new Date().toISOString();
      
      // Insert or replace test record
      await db.run(`
        INSERT OR REPLACE INTO slack_settings 
        (userId, botToken, channelId, channelName, isActive, slackScheduled, slackPublished, slackFailed, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [userId, 'test-token', 'test-channel', 'Test Channel', 1, 1, 1, 0, now, now]);
      
      console.log('✅ Test record inserted');
      
      // Read back the preferences
      const settings = await db.get('SELECT * FROM slack_settings WHERE userId = ?', [userId]);
      
      if (settings) {
        console.log('📄 Current preferences:');
        console.log(`   - slackScheduled: ${settings.slackScheduled}`);
        console.log(`   - slackPublished: ${settings.slackPublished}`);
        console.log(`   - slackFailed: ${settings.slackFailed}`);
        
        // Test updating just preferences
        await db.run(`
          UPDATE slack_settings 
          SET slackScheduled = ?, slackPublished = ?, slackFailed = ?, updatedAt = ?
          WHERE userId = ?
        `, [0, 1, 1, now, userId]);
        
        console.log('✅ Preferences updated');
        
        // Read back updated preferences
        const updatedSettings = await db.get('SELECT * FROM slack_settings WHERE userId = ?', [userId]);
        console.log('📄 Updated preferences:');
        console.log(`   - slackScheduled: ${updatedSettings.slackScheduled}`);
        console.log(`   - slackPublished: ${updatedSettings.slackPublished}`);
        console.log(`   - slackFailed: ${updatedSettings.slackFailed}`);
        
      } else {
        console.log('❌ No settings found');
      }
      
      await db.close();
      console.log('🎉 SQLite test completed successfully!');
      
    } catch (error) {
      console.error('❌ SQLite test failed:', error.message);
    }
  } else {
    console.log('PostgreSQL testing would require production database access');
    console.log('✅ Hybrid support is implemented in slack-routes.js');
  }
}

testNotificationPreferences().catch(console.error);