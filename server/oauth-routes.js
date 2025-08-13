const express = require('express');
const router = express.Router();

// Check if OAuth is configured for a platform
router.get('/check/:platform', (req, res) => {
  const { platform } = req.params;
  let clientId = '';
  
  switch(platform) {
    case 'twitter':
      clientId = process.env.TWITTER_CLIENT_ID;
      break;
    case 'linkedin':
      clientId = process.env.LINKEDIN_CLIENT_ID;
      break;
    case 'facebook':
      clientId = process.env.FACEBOOK_CLIENT_ID;
      break;
    case 'instagram':
      clientId = process.env.INSTAGRAM_CLIENT_ID;
      break;
  }
  
  res.json({ configured: !!clientId });
});

// OAuth initiation routes
router.get('/twitter', (req, res) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/callback/twitter`;
  
  if (!clientId) {
    return res.send(`
      <html>
        <head>
          <title>X (Twitter) OAuth Setup</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding-top: 80px; }
            .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 32px; max-width: 500px; width: 100%; }
            .icon { width: 24px; height: 24px; margin-right: 8px; vertical-align: middle; }
            h2 { color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 700; display: flex; align-items: center; }
            p { color: #6b7280; margin: 16px 0; line-height: 1.5; }
            ol { color: #374151; margin: 16px 0; padding-left: 20px; }
            li { margin: 8px 0; }
            .btn { display: inline-block; background: #1DA1F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 16px 8px 16px 0; }
            .btn:hover { background: #0d8bd9; }
            .back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
            .back-link:hover { color: #374151; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>
              <svg class="icon" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              X (Twitter) OAuth Setup Required
            </h2>
            <p>To connect your X (Twitter) account, you need to:</p>
            <ol>
              <li>Create a developer app on X (Twitter)</li>
              <li>Get your OAuth credentials (Client ID and Secret)</li>
              <li>Add them to your .env files</li>
              <li>Restart the application</li>
            </ol>
            <a href="https://developer.twitter.com/" target="_blank" class="btn">Go to X Developer Portal</a>
            <br>
            <a href="javascript:history.back()" class="back-link">← Back to Social Media Connections</a>
          </div>
        </body>
      </html>
    `);
  }
  
  const userId = 'demo_user';
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read&state=${userId}`;
  
  res.redirect(authUrl);
});

router.get('/linkedin', (req, res) => {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/callback/linkedin`;
  
  if (!clientId) {
    return res.send(`
      <html>
        <head>
          <title>LinkedIn OAuth Setup</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding-top: 80px; }
            .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 32px; max-width: 500px; width: 100%; }
            .icon { width: 24px; height: 24px; margin-right: 8px; vertical-align: middle; }
            h2 { color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 700; display: flex; align-items: center; }
            p { color: #6b7280; margin: 16px 0; line-height: 1.5; }
            ol { color: #374151; margin: 16px 0; padding-left: 20px; }
            li { margin: 8px 0; }
            .btn { display: inline-block; background: #0077B5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 16px 8px 16px 0; }
            .btn:hover { background: #005885; }
            .back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
            .back-link:hover { color: #374151; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>
              <svg class="icon" fill="#0077B5" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn OAuth Setup Required
            </h2>
            <p>To connect your LinkedIn account, you need to:</p>
            <ol>
              <li>Create a developer app on LinkedIn</li>
              <li>Get your OAuth credentials (Client ID and Secret)</li>
              <li>Add them to your .env files</li>
              <li>Restart the application</li>
            </ol>
            <a href="https://developer.linkedin.com/" target="_blank" class="btn">Go to LinkedIn Developer Portal</a>
            <br>
            <a href="javascript:history.back()" class="back-link">← Back to Social Media Connections</a>
          </div>
        </body>
      </html>
    `);
  }
  
  const userId = 'demo_user';
  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=w_member_social&state=${userId}`;
  
  res.redirect(authUrl);
});

router.get('/facebook', (req, res) => {
  const clientId = process.env.FACEBOOK_CLIENT_ID;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/callback/facebook`;
  
  if (!clientId) {
    return res.send(`
      <html>
        <head>
          <title>Facebook OAuth Setup</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding-top: 80px; }
            .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 32px; max-width: 500px; width: 100%; }
            .icon { width: 24px; height: 24px; margin-right: 8px; vertical-align: middle; }
            h2 { color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 700; display: flex; align-items: center; }
            p { color: #6b7280; margin: 16px 0; line-height: 1.5; }
            ol { color: #374151; margin: 16px 0; padding-left: 20px; }
            li { margin: 8px 0; }
            .btn { display: inline-block; background: #1877F2; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 16px 8px 16px 0; }
            .btn:hover { background: #166fe5; }
            .back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
            .back-link:hover { color: #374151; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>
              <svg class="icon" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              Facebook OAuth Setup Required
            </h2>
            <p>To connect your Facebook account, you need to:</p>
            <ol>
              <li>Create a developer app on Facebook</li>
              <li>Get your OAuth credentials (Client ID and Secret)</li>
              <li>Add them to your .env files</li>
              <li>Restart the application</li>
            </ol>
            <a href="https://developers.facebook.com/" target="_blank" class="btn">Go to Facebook Developer Portal</a>
            <br>
            <a href="javascript:history.back()" class="back-link">← Back to Social Media Connections</a>
          </div>
        </body>
      </html>
    `);
  }
  
  const userId = 'demo_user';
  const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=pages_manage_posts,pages_read_engagement&state=${userId}`;
  
  res.redirect(authUrl);
});

router.get('/instagram', (req, res) => {
  const clientId = process.env.INSTAGRAM_CLIENT_ID;
  const redirectUri = `${req.protocol}://${req.get('host')}/api/oauth/callback/instagram`;
  
  if (!clientId) {
    return res.send(`
      <html>
        <head>
          <title>Instagram OAuth Setup</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f9fafb; min-height: 100vh; display: flex; align-items: flex-start; justify-content: center; padding-top: 80px; }
            .card { background: white; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 32px; max-width: 500px; width: 100%; }
            .icon { width: 24px; height: 24px; margin-right: 8px; vertical-align: middle; }
            h2 { color: #111827; margin: 0 0 16px 0; font-size: 24px; font-weight: 700; display: flex; align-items: center; }
            p { color: #6b7280; margin: 16px 0; line-height: 1.5; }
            ol { color: #374151; margin: 16px 0; padding-left: 20px; }
            li { margin: 8px 0; }
            .btn { display: inline-block; background: #E4405F; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 500; margin: 16px 8px 16px 0; }
            .btn:hover { background: #d73652; }
            .back-link { color: #6b7280; text-decoration: none; font-size: 14px; }
            .back-link:hover { color: #374151; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>
              <svg class="icon" fill="#E4405F" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              Instagram OAuth Setup Required
            </h2>
            <p>To connect your Instagram account, you need to:</p>
            <ol>
              <li>Create a developer app on Instagram</li>
              <li>Get your OAuth credentials (Client ID and Secret)</li>
              <li>Add them to your .env files</li>
              <li>Restart the application</li>
            </ol>
            <a href="https://developers.facebook.com/" target="_blank" class="btn">Go to Instagram Developer Portal</a>
            <br>
            <a href="javascript:history.back()" class="back-link">← Back to Social Media Connections</a>
          </div>
        </body>
      </html>
    `);
  }
  
  const userId = 'demo_user';
  const authUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user_profile,user_media&response_type=code&state=${userId}`;
  
  res.redirect(authUrl);
});

// OAuth callback routes
router.get('/callback/twitter', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;
    
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=access_denied`);
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${req.protocol}://${req.get('host')}/api/oauth/callback/twitter`
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      // Get user info
      const userResponse = await fetch('https://api.twitter.com/2/users/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      const userData = await userResponse.json();
      
      // Save to database
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      const db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      await db.run(`
        INSERT OR REPLACE INTO social_accounts 
        (userId, platform, username, accessToken, refreshToken, tokenExpiry, connected, connectedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        'X',
        userData.data?.username || 'twitter_user',
        tokenData.access_token,
        tokenData.refresh_token,
        new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        1,
        new Date().toISOString()
      ]);
      
      await db.close();
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?success=twitter`);
    } else {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error('Twitter OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=oauth_error`);
  }
});

router.get('/callback/linkedin', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;
    
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=access_denied`);
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${req.protocol}://${req.get('host')}/api/oauth/callback/linkedin`,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      // Get user info
      const userResponse = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
      
      const userData = await userResponse.json();
      
      // Save to database
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      const db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      await db.run(`
        INSERT OR REPLACE INTO social_accounts 
        (userId, platform, username, accessToken, tokenExpiry, connected, connectedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        'LinkedIn',
        userData.localizedFirstName || 'linkedin_user',
        tokenData.access_token,
        new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        1,
        new Date().toISOString()
      ]);
      
      await db.close();
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?success=linkedin`);
    } else {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=oauth_error`);
  }
});

router.get('/callback/facebook', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;
    
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=access_denied`);
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${process.env.FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent(`${req.protocol}://${req.get('host')}/api/oauth/callback/facebook`)}&client_secret=${process.env.FACEBOOK_CLIENT_SECRET}&code=${code}`);
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      // Get user info
      const userResponse = await fetch(`https://graph.facebook.com/me?access_token=${tokenData.access_token}`);
      const userData = await userResponse.json();
      
      // Save to database
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      const db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      await db.run(`
        INSERT OR REPLACE INTO social_accounts 
        (userId, platform, username, accessToken, tokenExpiry, connected, connectedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        userId,
        'Facebook',
        userData.name || 'facebook_user',
        tokenData.access_token,
        new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        1,
        new Date().toISOString()
      ]);
      
      await db.close();
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?success=facebook`);
    } else {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=oauth_error`);
  }
});

router.get('/callback/instagram', async (req, res) => {
  try {
    const { code, state } = req.query;
    const userId = state;
    
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=access_denied`);
    }
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.INSTAGRAM_CLIENT_ID,
        client_secret: process.env.INSTAGRAM_CLIENT_SECRET,
        grant_type: 'authorization_code',
        redirect_uri: `${req.protocol}://${req.get('host')}/api/oauth/callback/instagram`,
        code
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (tokenData.access_token) {
      // Save to database
      const sqlite3 = require('sqlite3');
      const { open } = require('sqlite');
      const db = await open({
        filename: process.env.DB_PATH || './data.sqlite',
        driver: sqlite3.Database
      });
      
      await db.run(`
        INSERT OR REPLACE INTO social_accounts 
        (userId, platform, username, accessToken, connected, connectedAt)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        userId,
        'Instagram',
        tokenData.user?.username || 'instagram_user',
        tokenData.access_token,
        1,
        new Date().toISOString()
      ]);
      
      await db.close();
      
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?success=instagram`);
    } else {
      res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error('Instagram OAuth error:', error);
    res.redirect(`${process.env.CLIENT_URL || 'http://localhost:3000'}/connect?error=oauth_error`);
  }
});

module.exports = router;