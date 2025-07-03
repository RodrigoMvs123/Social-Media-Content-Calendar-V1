import express from 'express';
import { db } from './db-wrapper';
import bcrypt from 'bcryptjs';
import { generateContent, generateIdeas } from './ai';

const router = express.Router();

// AI Routes
router.post('/ai/generate', async (req, res) => {
  try {
    const { prompt, platform } = req.body;
    console.log(`[AI Generate] Received request for platform: ${platform}, prompt: ${prompt.substring(0, 30)}...`);
    
    const content = await generateContent(prompt, platform);
    console.log(`[AI Generate] Successfully generated content (${content.length} chars)`);
    
    res.json({ content });
  } catch (error) {
    console.error('[AI Generate] Error generating content:', error);
    res.status(500).json({ error: 'Failed to generate content' });
  }
});

router.post('/ai/ideas', async (req, res) => {
  try {
    const { topic } = req.body;
    console.log(`[AI Ideas] Received request for topic: ${topic}`);
    
    const ideas = await generateIdeas(topic);
    console.log(`[AI Ideas] Successfully generated ${ideas.length} ideas`);
    
    res.json({ ideas });
  } catch (error) {
    console.error('[AI Ideas] Error generating ideas:', error);
    res.status(500).json({ error: 'Failed to generate ideas' });
  }
});

// Social Media Accounts Routes
router.get('/social-accounts', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    const accounts = await db.socialAccounts.findAll(userId);
    res.json(accounts);
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    res.status(500).json({ error: 'Failed to fetch social accounts' });
  }
});

router.get('/social-accounts/:platform', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    const { platform } = req.params;
    const account = await db.socialAccounts.findByPlatform(userId, platform);
    
    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }
    
    res.json(account);
  } catch (error) {
    console.error('Error fetching social account:', error);
    res.status(500).json({ error: 'Failed to fetch social account' });
  }
});

router.delete('/social-accounts/:platform', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    const { platform } = req.params;
    
    await db.socialAccounts.update({
      userId,
      platform,
      connected: false
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    res.status(500).json({ error: 'Failed to disconnect account' });
  }
});

router.post('/social-accounts/:platform/refresh', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    const { platform } = req.params;
    
    const account = await db.socialAccounts.findByPlatform(userId, platform);
    
    if (!account || !account.refreshToken) {
      return res.status(404).json({ error: 'Account not found or no refresh token available' });
    }
    
    // In a real implementation, this would call the OAuth provider to refresh the token
    // For demo purposes, we'll just generate a new mock token
    const newToken = `refreshed_token_${Math.random().toString(36).substring(2)}`;
    const expiresIn = 3600; // 1 hour
    
    const updatedAccount = await db.socialAccounts.update({
      userId,
      platform,
      accessToken: newToken,
      tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString()
    });
    
    res.json({
      accessToken: newToken,
      tokenExpiry: new Date(Date.now() + expiresIn * 1000).toISOString()
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// Posts Routes
router.get('/posts', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    const posts = await db.posts.findAll(userId);
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

router.get('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const post = await db.posts.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
});

router.post('/posts', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    const post = req.body;
    
    // Validate required fields
    if (!post.content || !post.platform || !post.scheduledTime) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if the user has a connected account for this platform
    const account = await db.socialAccounts.findByPlatform(userId, post.platform);
    
    if (!account || !account.connected) {
      return res.status(400).json({ error: `No connected ${post.platform} account found` });
    }
    
    // Create the post
    const now = new Date().toISOString();
    const newPost = await db.posts.create({
      ...post,
      userId,
      createdAt: now,
      updatedAt: now
    });
    
    res.status(201).json(newPost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

router.put('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const post = await db.posts.findById(id);
    
    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    // Update the post
    const updatedPost = await db.posts.update({
      id,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    res.json(updatedPost);
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

router.delete('/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.posts.delete(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

// User Routes
router.post('/users/register', async (req, res) => {
  try {
    const { email, name, password } = req.body;
    
    // Validate required fields
    if (!email || !name || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Check if user already exists
    const existingUser = await db.users.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const now = new Date().toISOString();
    const user = await db.users.create({
      email,
      name,
      password: hashedPassword,
      createdAt: now,
      updatedAt: now
    });
    
    // Create default notification preferences
    await db.notificationPreferences.create({
      userId: user.id as string,
      emailDigest: true,
      emailPostPublished: true,
      emailPostFailed: true,
      browserNotifications: false,
      updatedAt: now
    });
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

router.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Find user
    const user = await db.users.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Set session
    req.session.userId = user.id as string;
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to log in' });
  }
});

router.get('/users/me', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const user = await db.users.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

router.put('/users/me', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { name, email, currentPassword, newPassword } = req.body;
    const updates: any = {};
    
    if (name) updates.name = name;
    if (email) updates.email = email;
    
    // If changing password, verify current password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required' });
      }
      
      const user = await db.users.findById(userId);
      
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
      
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      updates.password = await bcrypt.hash(newPassword, 10);
    }
    
    // Update user
    const updatedUser = await db.users.update({
      id: userId,
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    // Don't return the password
    const { password: _, ...userWithoutPassword } = updatedUser;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

router.post('/users/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error logging out:', err);
      return res.status(500).json({ error: 'Failed to log out' });
    }
    
    res.json({ success: true });
  });
});

// Notification Preferences Routes
router.get('/notification-preferences', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const preferences = await db.notificationPreferences.findByUserId(userId);
    
    if (!preferences) {
      return res.status(404).json({ error: 'Notification preferences not found' });
    }
    
    res.json(preferences);
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

router.put('/notification-preferences', async (req, res) => {
  try {
    const userId = req.session.userId;
    
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const { emailDigest, emailPostPublished, emailPostFailed, browserNotifications } = req.body;
    
    // Update preferences
    const updatedPreferences = await db.notificationPreferences.update({
      userId,
      emailDigest,
      emailPostPublished,
      emailPostFailed,
      browserNotifications,
      updatedAt: new Date().toISOString()
    });
    
    res.json(updatedPreferences);
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Settings Routes
router.get('/settings', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    
    // Get user settings from database
    const user = await db.users.findById(userId);
    const notificationPrefs = await db.notificationPreferences.findByUserId(userId);
    const slackSettings = await db.socialAccounts.findByPlatform(userId, 'slack');
    
    // Combine settings
    const settings = {
      name: user?.name || 'Demo User',
      email: user?.email || 'user@example.com',
      emailDigest: notificationPrefs?.emailDigest || true,
      emailPostPublished: notificationPrefs?.emailPostPublished || true,
      emailPostFailed: notificationPrefs?.emailPostFailed || true,
      browserNotifications: notificationPrefs?.browserNotifications || false,
      botToken: slackSettings?.accessToken || '',
      channelId: slackSettings?.profileData || '',
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.post('/settings', async (req, res) => {
  try {
    const userId = req.session.userId || 'demo-user';
    const settings = req.body;
    
    // Update user profile if provided
    if (settings.name || settings.email) {
      await db.users.update({
        id: userId,
        name: settings.name,
        email: settings.email,
        updatedAt: new Date().toISOString(),
      });
    }
    
    // Update notification preferences if provided
    if (settings.emailDigest !== undefined || 
        settings.emailPostPublished !== undefined || 
        settings.emailPostFailed !== undefined || 
        settings.browserNotifications !== undefined) {
      
      const existingPrefs = await db.notificationPreferences.findByUserId(userId);
      
      if (existingPrefs) {
        await db.notificationPreferences.update({
          userId,
          emailDigest: settings.emailDigest !== undefined ? settings.emailDigest : existingPrefs.emailDigest,
          emailPostPublished: settings.emailPostPublished !== undefined ? settings.emailPostPublished : existingPrefs.emailPostPublished,
          emailPostFailed: settings.emailPostFailed !== undefined ? settings.emailPostFailed : existingPrefs.emailPostFailed,
          browserNotifications: settings.browserNotifications !== undefined ? settings.browserNotifications : existingPrefs.browserNotifications,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.notificationPreferences.create({
          userId,
          emailDigest: settings.emailDigest !== undefined ? settings.emailDigest : true,
          emailPostPublished: settings.emailPostPublished !== undefined ? settings.emailPostPublished : true,
          emailPostFailed: settings.emailPostFailed !== undefined ? settings.emailPostFailed : true,
          browserNotifications: settings.browserNotifications !== undefined ? settings.browserNotifications : false,
          updatedAt: new Date().toISOString(),
        });
      }
    }
    
    // Update Slack settings if provided
    if (settings.botToken || settings.channelId) {
      const existingAccount = await db.socialAccounts.findByPlatform(userId, 'slack');
      
      if (existingAccount) {
        await db.socialAccounts.update({
          userId,
          platform: 'slack',
          accessToken: settings.botToken || existingAccount.accessToken,
          profileData: settings.channelId || existingAccount.profileData,
        });
      } else if (settings.botToken) {
        await db.socialAccounts.create({
          userId,
          platform: 'slack',
          username: 'slack-bot',
          accessToken: settings.botToken,
          profileData: settings.channelId || '',
          connected: true,
          connectedAt: new Date().toISOString(),
        });
      }
    }
    
    res.json({ success: true, ...settings });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;