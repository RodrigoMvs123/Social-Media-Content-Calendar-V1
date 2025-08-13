const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');

class SocialMediaAPI {
  constructor(db) {
    this.db = db;
  }

  async getAccountTokens(userId, platform) {
    const account = await this.db.get(
      'SELECT accessToken, refreshToken, tokenExpiry FROM social_accounts WHERE userId = ? AND platform = ? AND connected = 1',
      [userId, platform]
    );
    return account;
  }

  // X (Twitter) API v2
  async postToTwitter(userId, content, mediaUrls = []) {
    try {
      const tokens = await this.getAccountTokens(userId, 'X');
      if (!tokens) throw new Error('Twitter account not connected');

      let mediaIds = [];
      
      // Upload media if provided
      for (const mediaUrl of mediaUrls) {
        const mediaId = await this.uploadTwitterMedia(tokens.accessToken, mediaUrl);
        if (mediaId) mediaIds.push(mediaId);
      }

      // Create tweet
      const tweetData = { text: content };
      if (mediaIds.length > 0) {
        tweetData.media = { media_ids: mediaIds };
      }

      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(tweetData)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(`Twitter API error: ${result.detail || result.error}`);
      }

      return { success: true, id: result.data.id, url: `https://twitter.com/user/status/${result.data.id}` };
    } catch (error) {
      console.error('Twitter posting error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadTwitterMedia(accessToken, mediaUrl) {
    try {
      // For data URLs, convert to buffer
      let mediaBuffer;
      if (mediaUrl.startsWith('data:')) {
        const base64Data = mediaUrl.split(',')[1];
        mediaBuffer = Buffer.from(base64Data, 'base64');
      } else {
        // For file URLs, read file
        mediaBuffer = fs.readFileSync(mediaUrl);
      }

      const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: new FormData().append('media', mediaBuffer)
      });

      const result = await response.json();
      return result.media_id_string;
    } catch (error) {
      console.error('Twitter media upload error:', error);
      return null;
    }
  }

  // LinkedIn API
  async postToLinkedIn(userId, content, mediaUrls = []) {
    try {
      const tokens = await this.getAccountTokens(userId, 'LinkedIn');
      if (!tokens) throw new Error('LinkedIn account not connected');

      // Get user profile
      const profileResponse = await fetch('https://api.linkedin.com/v2/people/~', {
        headers: { 'Authorization': `Bearer ${tokens.accessToken}` }
      });
      const profile = await profileResponse.json();

      let mediaAssets = [];
      
      // Upload media if provided
      for (const mediaUrl of mediaUrls) {
        const assetId = await this.uploadLinkedInMedia(tokens.accessToken, mediaUrl);
        if (assetId) mediaAssets.push(assetId);
      }

      // Create post
      const postData = {
        author: `urn:li:person:${profile.id}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: content },
            shareMediaCategory: mediaAssets.length > 0 ? 'IMAGE' : 'NONE'
          }
        },
        visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' }
      };

      if (mediaAssets.length > 0) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = mediaAssets.map(assetId => ({
          status: 'READY',
          media: assetId
        }));
      }

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postData)
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${result.message}`);
      }

      return { success: true, id: result.id };
    } catch (error) {
      console.error('LinkedIn posting error:', error);
      return { success: false, error: error.message };
    }
  }

  async uploadLinkedInMedia(accessToken, mediaUrl) {
    try {
      // Register upload
      const registerResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: 'urn:li:person:me',
            serviceRelationships: [{
              relationshipType: 'OWNER',
              identifier: 'urn:li:userGeneratedContent'
            }]
          }
        })
      });

      const registerResult = await registerResponse.json();
      const uploadUrl = registerResult.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
      const asset = registerResult.value.asset;

      // Upload media
      let mediaBuffer;
      if (mediaUrl.startsWith('data:')) {
        const base64Data = mediaUrl.split(',')[1];
        mediaBuffer = Buffer.from(base64Data, 'base64');
      } else {
        mediaBuffer = fs.readFileSync(mediaUrl);
      }

      await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}` },
        body: mediaBuffer
      });

      return asset;
    } catch (error) {
      console.error('LinkedIn media upload error:', error);
      return null;
    }
  }

  // Facebook API
  async postToFacebook(userId, content, mediaUrls = []) {
    try {
      const tokens = await this.getAccountTokens(userId, 'Facebook');
      if (!tokens) throw new Error('Facebook account not connected');

      // Get user's pages
      const pagesResponse = await fetch(`https://graph.facebook.com/me/accounts?access_token=${tokens.accessToken}`);
      const pagesData = await pagesResponse.json();
      
      if (!pagesData.data || pagesData.data.length === 0) {
        throw new Error('No Facebook pages found');
      }

      const pageId = pagesData.data[0].id;
      const pageToken = pagesData.data[0].access_token;

      if (mediaUrls.length > 0) {
        // Post with media
        const formData = new FormData();
        formData.append('message', content);
        
        // For single image
        if (mediaUrls.length === 1 && mediaUrls[0].startsWith('data:image')) {
          const base64Data = mediaUrls[0].split(',')[1];
          const imageBuffer = Buffer.from(base64Data, 'base64');
          formData.append('source', imageBuffer, { filename: 'image.jpg' });
          
          const response = await fetch(`https://graph.facebook.com/${pageId}/photos`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${pageToken}` },
            body: formData
          });
          
          const result = await response.json();
          return { success: true, id: result.id };
        }
      }

      // Text-only post
      const response = await fetch(`https://graph.facebook.com/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content,
          access_token: pageToken
        })
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(`Facebook API error: ${result.error.message}`);
      }

      return { success: true, id: result.id };
    } catch (error) {
      console.error('Facebook posting error:', error);
      return { success: false, error: error.message };
    }
  }

  // Instagram API
  async postToInstagram(userId, content, mediaUrls = []) {
    try {
      const tokens = await this.getAccountTokens(userId, 'Instagram');
      if (!tokens) throw new Error('Instagram account not connected');

      if (mediaUrls.length === 0) {
        throw new Error('Instagram requires at least one image or video');
      }

      // Get Instagram business account
      const accountResponse = await fetch(`https://graph.facebook.com/me/accounts?access_token=${tokens.accessToken}`);
      const accountData = await accountResponse.json();
      
      const instagramAccount = accountData.data.find(account => account.instagram_business_account);
      if (!instagramAccount) {
        throw new Error('No Instagram business account found');
      }

      const igAccountId = instagramAccount.instagram_business_account.id;

      // Create media container
      const mediaUrl = mediaUrls[0];
      const isVideo = mediaUrl.includes('video') || mediaUrl.includes('.mp4');
      
      const containerData = {
        access_token: tokens.accessToken,
        caption: content
      };

      if (mediaUrl.startsWith('data:')) {
        // For data URLs, we need to upload to a temporary location first
        throw new Error('Instagram requires publicly accessible media URLs');
      } else {
        containerData[isVideo ? 'video_url' : 'image_url'] = mediaUrl;
      }

      const containerResponse = await fetch(`https://graph.facebook.com/${igAccountId}/media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(containerData)
      });

      const containerResult = await containerResponse.json();
      if (containerResult.error) {
        throw new Error(`Instagram container error: ${containerResult.error.message}`);
      }

      // Publish media
      const publishResponse = await fetch(`https://graph.facebook.com/${igAccountId}/media_publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerResult.id,
          access_token: tokens.accessToken
        })
      });

      const publishResult = await publishResponse.json();
      if (publishResult.error) {
        throw new Error(`Instagram publish error: ${publishResult.error.message}`);
      }

      return { success: true, id: publishResult.id };
    } catch (error) {
      console.error('Instagram posting error:', error);
      return { success: false, error: error.message };
    }
  }

  // Main posting method
  async publishPost(userId, platform, content, mediaUrls = []) {
    console.log(`📤 Publishing to ${platform} for user ${userId}`);
    
    switch (platform.toLowerCase()) {
      case 'x':
      case 'twitter':
        return await this.postToTwitter(userId, content, mediaUrls);
      case 'linkedin':
        return await this.postToLinkedIn(userId, content, mediaUrls);
      case 'facebook':
        return await this.postToFacebook(userId, content, mediaUrls);
      case 'instagram':
        return await this.postToInstagram(userId, content, mediaUrls);
      default:
        return { success: false, error: `Unsupported platform: ${platform}` };
    }
  }
}

module.exports = SocialMediaAPI;