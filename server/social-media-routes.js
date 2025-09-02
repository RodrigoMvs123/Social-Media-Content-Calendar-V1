const express = require('express');
const router = express.Router();

// Database setup - hybrid approach
const dbType = process.env.DB_TYPE || 'sqlite';
let db;

if (dbType === 'sqlite') {
  const sqlite3 = require('sqlite3');
  const { open } = require('sqlite');
  
  // Initialize SQLite database
  (async () => {
    try {
      db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      // Create social_accounts table
      await db.run(`
        CREATE TABLE IF NOT EXISTS social_accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          platform VARCHAR(50) NOT NULL,
          accountId TEXT,
          username TEXT,
          accessToken TEXT,
          refreshToken TEXT,
          connected BOOLEAN DEFAULT 1,
          connectedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(userId, platform)
        )
      `);
      console.log('✅ SQLite social_accounts table ready');
    } catch (error) {
      console.error('❌ SQLite social_accounts setup failed:', error);
    }
  })();
} else {
  const { Pool } = require('pg');
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Create PostgreSQL table
  (async () => {
    try {
      await db.query(`
        CREATE TABLE IF NOT EXISTS social_accounts (
          id SERIAL PRIMARY KEY,
          userid INTEGER NOT NULL,
          platform VARCHAR(50) NOT NULL,
          accountid TEXT,
          username TEXT,
          accesstoken TEXT,
          refreshtoken TEXT,
          connected BOOLEAN DEFAULT true,
          connectedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updatedat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(userid, platform)
        )
      `);
      console.log('✅ PostgreSQL social_accounts table ready');
    } catch (error) {
      console.error('❌ PostgreSQL social_accounts setup failed:', error);
    }
  })();
}

// OAuth initiation routes
router.get('/oauth/:platform', (req, res) => {
  const { platform } = req.params;
  
  console.log(`🔗 OAuth initiation for ${platform}`);
  
  // Get the server URL for callbacks (as per README configuration)
  const serverUrl = process.env.NODE_ENV === 'production' 
    ? (process.env.CLIENT_URL || 'https://yourdomain.com')
    : 'http://localhost:3001';
  
  const clientUrls = {
    twitter: `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${process.env.TWITTER_CLIENT_ID}&redirect_uri=${encodeURIComponent(serverUrl)}/api/oauth/callback/twitter&scope=tweet.read%20tweet.write%20users.read&state=state&code_challenge=challenge&code_challenge_method=plain`,
    linkedin: `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${process.env.LINKEDIN_CLIENT_ID}&redirect_uri=${encodeURIComponent(serverUrl)}/api/oauth/callback/linkedin&scope=r_liteprofile%20r_emailaddress%20w_member_social`,
    facebook: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(serverUrl)}/api/oauth/callback/facebook&scope=pages_manage_posts,pages_read_engagement&response_type=code`,
    instagram: `https://api.instagram.com/oauth/authorize?client_id=${process.env.INSTAGRAM_CLIENT_ID}&redirect_uri=${encodeURIComponent(serverUrl)}/api/oauth/callback/instagram&scope=user_profile,user_media&response_type=code`
  };
  
  const authUrl = clientUrls[platform];
  
  if (!authUrl) {
    return res.status(400).json({ error: `Unsupported platform: ${platform}` });
  }
  
  // Check if required credentials exist
  const credentialMap = {
    twitter: process.env.TWITTER_CLIENT_ID,
    linkedin: process.env.LINKEDIN_CLIENT_ID,
    facebook: process.env.FACEBOOK_CLIENT_ID,
    instagram: process.env.INSTAGRAM_CLIENT_ID
  };
  
  if (!credentialMap[platform]) {
    console.log(`❌ Missing credentials for ${platform}`);
    return res.status(400).json({ 
      error: `${platform.toUpperCase()}_CLIENT_ID not configured. Please add it to your .env file.`,
      platform,
      required: `${platform.toUpperCase()}_CLIENT_ID`
    });
  }
  
  console.log(`🚀 Redirecting to ${platform} OAuth:`, authUrl);
  res.redirect(authUrl);
});

// OAuth callback routes
router.get('/oauth/callback/:platform', async (req, res) => {
  const { platform } = req.params;
  const { code, error } = req.query;
  
  console.log(`📥 OAuth callback for ${platform}:`, { code: code ? 'Present' : 'Missing', error });
  
  if (error) {
    console.error(`❌ OAuth error for ${platform}:`, error);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=${encodeURIComponent(error)}`);
  }
  
  if (!code) {
    console.error(`❌ No authorization code for ${platform}`);
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=no_code`);
  }
  
  try {
    // For now, simulate successful connection
    // In production, you would exchange the code for access tokens
    const mockConnection = {
      platform,
      accountId: `mock_${platform}_${Date.now()}`,
      username: `user_${platform}`,
      accessToken: `mock_token_${Date.now()}`,
      connected: true,
      connectedAt: new Date().toISOString()
    };
    
    console.log(`✅ Mock connection created for ${platform}:`, mockConnection);
    
    // Redirect back to connect page with success
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?success=${platform}`);
    
  } catch (error) {
    console.error(`❌ OAuth callback error for ${platform}:`, error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=callback_failed`);
  }
});

// Get connected accounts (both /accounts and /social-accounts for compatibility)
router.get('/accounts', async (req, res) => {
  await getConnectedAccounts(req, res);
});

router.get('/social-accounts', async (req, res) => {
  await getConnectedAccounts(req, res);
});

async function getConnectedAccounts(req, res) {
  try {
    const userId = 1; // Default user for now
    let accounts = [];
    
    if (dbType === 'sqlite') {
      accounts = await db.all('SELECT * FROM social_accounts WHERE userId = ? AND connected = 1', [userId]);
    } else {
      const result = await db.query('SELECT * FROM social_accounts WHERE userid = $1 AND connected = true', [userId]);
      accounts = result.rows.map(row => ({
        id: row.id,
        userId: row.userid,
        platform: row.platform,
        accountId: row.accountid,
        username: row.username,
        connected: row.connected,
        connectedAt: row.connectedat,
        updatedAt: row.updatedat
      }));
    }
    
    console.log(`📋 Found ${accounts.length} connected accounts for user ${userId}`);
    res.json(accounts);
  } catch (error) {
    console.error('❌ Error fetching social accounts:', error);
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
}

module.exports = router;