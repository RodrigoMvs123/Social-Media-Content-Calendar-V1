const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function createSocialAccountsTable() {
  const db = await open({
    filename: process.env.DB_PATH || './data.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS social_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      platform TEXT NOT NULL,
      username TEXT,
      accessToken TEXT NOT NULL,
      refreshToken TEXT,
      tokenExpiry TEXT,
      connected BOOLEAN DEFAULT 1,
      connectedAt TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(userId, platform)
    );
  `);

  console.log('✅ Social accounts table created/verified');
  await db.close();
}

if (require.main === module) {
  createSocialAccountsTable().catch(console.error);
}

module.exports = { createSocialAccountsTable };