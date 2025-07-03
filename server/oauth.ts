import express from 'express';
import fetch from 'node-fetch';
import { URLSearchParams } from 'url';
import dotenv from 'dotenv';
import { db } from './db-wrapper';

dotenv.config();

const router = express.Router();

// OAuth configuration
const oauthConfig = {
  LinkedIn: {
    clientId: process.env.LINKEDIN_CLIENT_ID || '',
    clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_REDIRECT_URI + '/linkedin' || '',
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    tokenUrl: 'https://www.linkedin.com/oauth/v2/accessToken',
    scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    profileUrl: 'https://api.linkedin.com/v2/me'
  },
  Twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || '',
    clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_REDIRECT_URI + '/twitter' || '',
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    tokenUrl: 'https://api.twitter.com/2/oauth2/token',
    scope: ['tweet.read', 'tweet.write', 'users.read'],
    profileUrl: 'https://api.twitter.com/2/users/me'
  },
  Facebook: {
    clientId: process.env.FACEBOOK_CLIENT_ID || '',
    clientSecret: process.env.FACEBOOK_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_REDIRECT_URI + '/facebook' || '',
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v12.0/oauth/access_token',
    scope: ['public_profile', 'pages_show_list', 'pages_manage_posts'],
    profileUrl: 'https://graph.facebook.com/v12.0/me'
  },
  Instagram: {
    clientId: process.env.INSTAGRAM_CLIENT_ID || '',
    clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
    redirectUri: process.env.OAUTH_REDIRECT_URI + '/instagram' || '',
    authUrl: 'https://api.instagram.com/oauth/authorize',
    tokenUrl: 'https://api.instagram.com/oauth/access_token',
    scope: ['user_profile', 'user_media'],
    profileUrl: 'https://graph.instagram.com/me'
  }
};

// Initialize OAuth routes
router.get('/init/:platform', (req, res) => {
  const { platform } = req.params;
  const config = oauthConfig[platform as keyof typeof oauthConfig];
  
  if (!config) {
    return res.status(400).json({ error: 'Invalid platform' });
  }
  
  // Generate a random state for CSRF protection
  const state = Math.random().toString(36).substring(2);
  
  // Store state in session or database
  req.session.oauthState = state;
  req.session.platform = platform;
  
  // Build authorization URL
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(' '),
    response_type: 'code',
    state: state
  });
  
  // Redirect to authorization page
  res.redirect(`${config.authUrl}?${params.toString()}`);
});

// Handle OAuth callbacks
router.get('/callback/:platform', async (req, res) => {
  const { platform } = req.params;
  const { code, state } = req.query;
  const config = oauthConfig[platform as keyof typeof oauthConfig];
  
  // Verify state to prevent CSRF attacks
  if (state !== req.session.oauthState || platform !== req.session.platform) {
    return res.redirect('/connect?error=invalid_state');
  }
  
  if (!config || !code) {
    return res.redirect('/connect?error=invalid_request');
  }
  
  try {
    // Exchange code for access token
    const tokenResponse = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: config.redirectUri,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      return res.redirect('/connect?error=token_error');
    }
    
    // Get user profile
    const profileResponse = await fetch(config.profileUrl, {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`
      }
    });
    
    const profileData = await profileResponse.json();
    
    // Store account in database
    const userId = req.session.userId || 'demo-user';
    const username = profileData.name || profileData.screen_name || profileData.username || 'user';
    
    const account = {
      userId,
      platform,
      username,
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      tokenExpiry: tokenData.expires_in ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString() : null,
      connected: true,
      connectedAt: new Date().toISOString(),
      profileData: JSON.stringify(profileData)
    };
    
    await db.socialAccounts.upsert(account);
    
    // Redirect back to app
    res.redirect(`/connect?success=true&platform=${platform}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect('/connect?error=server_error');
  }
});

// Refresh token
router.post('/refresh/:platform', async (req, res) => {
  const { platform } = req.params;
  const { refreshToken } = req.body;
  const config = oauthConfig[platform as keyof typeof oauthConfig];
  
  if (!config || !refreshToken) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: config.clientId,
        client_secret: config.clientSecret
      })
    });
    
    const data = await response.json();
    
    if (!data.access_token) {
      return res.status(400).json({ error: 'Failed to refresh token' });
    }
    
    // Update token in database
    const userId = req.session.userId || 'demo-user';
    
    await db.socialAccounts.update({
      userId,
      platform,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null
    });
    
    res.json({
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      tokenExpiry: data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Disconnect account
router.post('/disconnect/:platform', async (req, res) => {
  const { platform } = req.params;
  const userId = req.session.userId || 'demo-user';
  
  try {
    await db.socialAccounts.update({
      userId,
      platform,
      connected: false
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;