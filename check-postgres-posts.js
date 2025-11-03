const { Client } = require('pg');
require('dotenv').config({ path: './server/.env' });

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('render.com') ? { rejectUnauthorized: false } : false
});

async function checkPosts() {
  try {
    await client.connect();
    console.log('📊 PostgreSQL Posts:');
    console.log('====================');
    
    const result = await client.query(`
      SELECT 
        id, 
        content, 
        platform, 
        status,
        to_char(scheduledtime, 'YYYY-MM-DD HH24:MI:SS') as scheduled_time,
        userid,
        slackmessagets
      FROM posts 
      ORDER BY id DESC
    `);
    
    console.table(result.rows);
    console.log(`\n📈 Total posts in PostgreSQL: ${result.rows.length}`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await client.end();
  }
}

checkPosts();