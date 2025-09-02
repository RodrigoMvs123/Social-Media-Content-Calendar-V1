# Social Media Integration Setup Guide

## What You Need

The user only needs to:
1. **Create developer apps** on each platform (requires personal/business accounts)
2. **Copy credentials** to `.env` files
3. **Set callback URLs** in developer portals
4. **Run the app** - OAuth integration works automatically!

## Platform Requirements & Setup

### 1. X (Twitter)
- **Developer Portal**: https://developer.twitter.com/
- **Credentials needed**:
  ```
  TWITTER_CLIENT_ID=your_client_id
  TWITTER_CLIENT_SECRET=your_client_secret
  ```
- **Callback URL**: `http://localhost:3001/api/oauth/callback/twitter`

### 2. LinkedIn
- **Developer Portal**: https://developer.linkedin.com/
- **Credentials needed**:
  ```
  LINKEDIN_CLIENT_ID=your_client_id
  LINKEDIN_CLIENT_SECRET=your_client_secret
  ```
- **Callback URL**: `http://localhost:3001/api/oauth/callback/linkedin`

### 3. Facebook
- **Developer Portal**: https://developers.facebook.com/
- **Credentials needed**:
  ```
  FACEBOOK_CLIENT_ID=your_app_id
  FACEBOOK_CLIENT_SECRET=your_app_secret
  ```
- **Callback URL**: `http://localhost:3001/api/oauth/callback/facebook`

### 4. Instagram - **Business Account Required**
- **Requirements**: Instagram Business account + Facebook app
- **Setup**: Add Instagram Basic Display to Facebook app
- **Credentials needed**:
  ```
  INSTAGRAM_CLIENT_ID=your_app_id
  INSTAGRAM_CLIENT_SECRET=your_app_secret
  ```
- **Callback URL**: `http://localhost:3001/api/oauth/callback/instagram`

## User Setup Steps

### Step 1: Create Environment Files

**First:** Copy the example files to create your environment files (run in PowerShell/Bash):
```bash
cp .env.example .env
cp .env.example server/.env
```

**Second:** Open both `.env` files and replace the placeholders with your actual credentials.

### Step 2: Add Your Credentials
In **both** `.env` files (root and server), add your platform credentials:

```env
# X (Twitter)
TWITTER_CLIENT_ID=your_twitter_client_id
TWITTER_CLIENT_SECRET=your_twitter_client_secret

# LinkedIn
LINKEDIN_CLIENT_ID=your_linkedin_client_id
LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret

# Facebook
FACEBOOK_CLIENT_ID=your_facebook_app_id
FACEBOOK_CLIENT_SECRET=your_facebook_app_secret

# Instagram
INSTAGRAM_CLIENT_ID=your_instagram_app_id
INSTAGRAM_CLIENT_SECRET=your_instagram_app_secret
```

### Step 3: Run the App
```bash
npm run dev
```

### Step 4: Connect Your Accounts
1. Go to **Social Media** section
2. Click **"Connect with [Platform]"**
3. Authenticate with your personal accounts
4. Start creating and publishing posts!

## What Happens Automatically

✅ **OAuth Flow**: Complete authentication with real platforms

✅ **Token Storage**: Secure token management in database

✅ **Real Publishing**: Posts go to your actual social media accounts

✅ **Media Upload**: Photos and videos upload to platforms

✅ **Status Tracking**: See if posts published successfully

✅ **Error Handling**: Clear error messages if something fails

