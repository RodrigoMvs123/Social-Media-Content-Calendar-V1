import { SocialMediaAccount } from './types';

// Mock OAuth implementation
// In a real application, this would use the OAuth protocol for each platform

interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scope: string[];
  authUrl: string;
}

const oauthConfigs: Record<string, OAuthConfig> = {
  Twitter: {
    clientId: 'twitter-client-id',
    redirectUri: window.location.origin + '/oauth/callback',
    scope: ['tweet.read', 'tweet.write', 'users.read'],
    authUrl: 'https://twitter.com/i/oauth2/authorize'
  },
  LinkedIn: {
    clientId: 'linkedin-client-id',
    redirectUri: window.location.origin + '/oauth/callback',
    scope: ['r_liteprofile', 'r_emailaddress', 'w_member_social'],
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization'
  },
  Instagram: {
    clientId: 'instagram-client-id',
    redirectUri: window.location.origin + '/oauth/callback',
    scope: ['user_profile', 'user_media'],
    authUrl: 'https://api.instagram.com/oauth/authorize'
  },
  Facebook: {
    clientId: 'facebook-client-id',
    redirectUri: window.location.origin + '/oauth/callback',
    scope: ['public_profile', 'pages_show_list', 'pages_manage_posts'],
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth'
  }
};

// Initiate OAuth flow
export const initiateOAuth = (platform: string): void => {
  const config = oauthConfigs[platform];
  if (!config) return;

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope.join(' '),
    response_type: 'code',
    state: platform
  });

  // In a real app, this would redirect to the actual OAuth provider
  // For demo purposes, we'll just log the URL and use our mock implementation
  console.log(`OAuth URL: ${config.authUrl}?${params.toString()}`);
  
  // Mock the OAuth flow by opening a popup window
  const width = 600;
  const height = 700;
  const left = window.innerWidth / 2 - width / 2;
  const top = window.innerHeight / 2 - height / 2;
  
  window.open(
    `/oauth-mock.html?platform=${platform}`,
    `Connect to ${platform}`,
    `width=${width},height=${height},left=${left},top=${top}`
  );
};

// Handle OAuth callback
export const handleOAuthCallback = async (code: string, state: string): Promise<SocialMediaAccount> => {
  // In a real app, this would exchange the code for an access token
  // For demo purposes, we'll just return a mock account
  return {
    id: Math.floor(Math.random() * 1000),
    platform: state,
    username: `user_${Math.floor(Math.random() * 1000)}`,
    connected: true,
    connectedAt: new Date().toISOString(),
    accessToken: `mock_token_${Math.random().toString(36).substring(2)}`,
    tokenExpiry: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  };
};

// Check if token is valid
export const isTokenValid = (account: SocialMediaAccount): boolean => {
  if (!account.accessToken || !account.tokenExpiry) return false;
  return new Date(account.tokenExpiry) > new Date();
};

// Refresh token
export const refreshToken = async (account: SocialMediaAccount): Promise<SocialMediaAccount> => {
  // In a real app, this would use the refresh token to get a new access token
  return {
    ...account,
    accessToken: `refreshed_token_${Math.random().toString(36).substring(2)}`,
    tokenExpiry: new Date(Date.now() + 3600000).toISOString() // 1 hour from now
  };
};