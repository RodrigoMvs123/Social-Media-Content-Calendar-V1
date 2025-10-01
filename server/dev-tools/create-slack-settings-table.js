const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlit');

db.serialize(() => {
  db.run('CREATE TABLE slack_settings (id INTEGER PRIMARY KEY, user_id INTEGER, channel_id TEXT, channel_name TEXT, bot_token TEXT)', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Table slack_settings created.");
    }
  });
});

db.close();
