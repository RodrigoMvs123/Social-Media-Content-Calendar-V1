const dotenv = require('dotenv');
dotenv.config();

const dbType = process.env.DB_TYPE || 'sqlite';

async function debugSlackSync() {
  console.log('🔍 Debugging Slack bidirectional sync...');
  
  if (dbType === 'postgres') {
    const { Pool } = require('pg');
    const db = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    try {
      // Check if slackmessagets column exists
      const columnCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'posts' AND column_name = 'slackmessagets'
      `);
      
      console.log('📋 slackmessagets column exists:', columnCheck.rows.length > 0);
      
      if (columnCheck.rows.length === 0) {
        console.log('➕ Adding slackmessagets column...');
        await db.query('ALTER TABLE posts ADD COLUMN slackmessagets TEXT');
        console.log('✅ Column added');
      }
      
      // Check current posts and their Slack timestamps
      const posts = await db.query('SELECT id, content, platform, slackmessagets FROM posts LIMIT 5');
      console.log('📄 Recent posts with Slack timestamps:');
      posts.rows.forEach(post => {
        console.log(`   - Post ${post.id}: "${post.content}" (${post.platform}) - Slack TS: ${post.slackmessagets || 'None'}`);
      });
      
      await db.end();
    } catch (error) {
      console.error('❌ PostgreSQL error:', error.message);
    }
  } else {
    console.log('SQLite mode - checking local database...');
    const sqlite3 = require('sqlite3');
    const { open } = require('sqlite');
    
    try {
      const db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      // Check table structure
      const pragma = await db.all("PRAGMA table_info(posts)");
      const hasSlackTs = pragma.some(col => col.name === 'slackMessageTs');
      
      console.log('📋 slackMessageTs column exists:', hasSlackTs);
      
      if (!hasSlackTs) {
        console.log('➕ Adding slackMessageTs column...');
        await db.run('ALTER TABLE posts ADD COLUMN slackMessageTs TEXT');
        console.log('✅ Column added');
      }
      
      // Check current posts
      const posts = await db.all('SELECT id, content, platform, slackMessageTs FROM posts LIMIT 5');
      console.log('📄 Recent posts with Slack timestamps:');
      posts.forEach(post => {
        console.log(`   - Post ${post.id}: "${post.content}" (${post.platform}) - Slack TS: ${post.slackMessageTs || 'None'}`);
      });
      
      await db.close();
    } catch (error) {
      console.error('❌ SQLite error:', error.message);
    }
  }
}

debugSlackSync().catch(console.error);