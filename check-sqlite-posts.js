const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'server', 'data.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('📊 SQLite Posts:');
console.log('================');

db.all(`
  SELECT 
    id, 
    content, 
    platform, 
    status,
    datetime(scheduledTime/1000, 'unixepoch') as scheduled_time,
    userId,
    slackMessageTs
  FROM posts 
  ORDER BY id DESC
`, (err, rows) => {
  if (err) {
    console.error('❌ Error:', err);
  } else {
    console.table(rows);
    console.log(`\n📈 Total posts in SQLite: ${rows.length}`);
  }
  db.close();
});