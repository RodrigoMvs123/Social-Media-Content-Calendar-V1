const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function testSlackDatabase() {
  try {
    const db = await open({
      filename: './data.sqlite',
      driver: sqlite3.Database
    });
    
    // Check if slack_settings table exists
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='slack_settings'");
    console.log('Slack settings table exists:', !!tableExists);
    
    // Check current data
    const settings = await db.all('SELECT * FROM slack_settings');
    console.log('Current slack settings:', settings);
    
    // Test insert
    const testUserId = 'test-user-123';
    await db.run(`
      INSERT OR REPLACE INTO slack_settings 
      (userId, botToken, channelId, channelName, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `, [testUserId, 'test-token', 'test-channel', 'Test Channel', new Date().toISOString(), new Date().toISOString()]);
    
    console.log('Test insert successful');
    
    // Verify insert
    const testRecord = await db.get('SELECT * FROM slack_settings WHERE userId = ?', [testUserId]);
    console.log('Test record:', testRecord);
    
    await db.close();
  } catch (error) {
    console.error('Database test error:', error);
  }
}

testSlackDatabase();