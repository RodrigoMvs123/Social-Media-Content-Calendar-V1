const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data.sqlit');

db.serialize(() => {
  db.run('ALTER TABLE slack_settings ADD COLUMN slackScheduled BOOLEAN', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Column slackScheduled added to slack_settings table.");
    }
  });

  db.run('ALTER TABLE slack_settings ADD COLUMN slackPublished BOOLEAN', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Column slackPublished added to slack_settings table.");
    }
  });

  db.run('ALTER TABLE slack_settings ADD COLUMN slackFailed BOOLEAN', (err) => {
    if (err) {
      console.error(err.message);
    } else {
      console.log("Column slackFailed added to slack_settings table.");
    }
  });
});

db.close();
