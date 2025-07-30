const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function addSlackMessageColumn() {
  try {
    const db = await open({
      filename: './data.sqlite',
      driver: sqlite3.Database
    });

    // Add slackMessageTs column if it doesn't exist
    await db.exec(`
      ALTER TABLE posts ADD COLUMN slackMessageTs TEXT;
    `).catch(err => {
      if (!err.message.includes('duplicate column')) {
        throw err;
      }
    });

    console.log('✅ Successfully added slackMessageTs column to posts table');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

addSlackMessageColumn();
