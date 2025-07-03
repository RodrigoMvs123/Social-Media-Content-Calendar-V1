import { Post, SocialMediaAccount } from './types';

// Mock data for posts
let posts: Post[] = [
  {
    id: 1,
    userId: 'user1',
    platform: 'Twitter',
    content: 'Just launched our new product! Check it out at example.com #launch #product',
    scheduledTime: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 2,
    userId: 'user1',
    platform: 'LinkedIn',
    content: 'Excited to announce our latest feature that will revolutionize how you work. Learn more: example.com/feature',
    scheduledTime: new Date(new Date().getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 3,
    userId: 'user1',
    platform: 'Instagram',
    content: 'Behind the scenes at our office. #worklife #culture',
    scheduledTime: new Date(new Date().getTime() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 4,
    userId: 'user1',
    platform: 'Facebook',
    content: 'We are hiring! Join our team of passionate professionals. Apply now: example.com/careers',
    scheduledTime: new Date(new Date().getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 5,
    userId: 'user1',
    platform: 'Twitter',
    content: 'Thanks to everyone who attended our webinar yesterday! The recording is now available: example.com/webinar',
    scheduledTime: new Date(new Date().getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// Mock data for social media accounts
let socialMediaAccounts: SocialMediaAccount[] = [
  {
    id: 1,
    userId: 'user1',
    platform: 'Twitter',
    username: 'example.user',
    connected: true,
    connectedAt: new Date().toISOString(),
    accessToken: 'mock-token-123',
    tokenExpiry: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  },
  {
    id: 2,
    userId: 'user1',
    platform: 'LinkedIn',
    username: 'example.user',
    connected: true,
    connectedAt: new Date().toISOString(),
    accessToken: 'mock-token-456',
    tokenExpiry: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  },
  {
    id: 3,
    userId: 'user1',
    platform: 'Facebook',
    username: 'example.user.fb',
    connected: true,
    connectedAt: new Date().toISOString(),
    accessToken: 'mock-token-789',
    tokenExpiry: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  },
  {
    id: 4,
    userId: 'user1',
    platform: 'Instagram',
    username: 'example.user.ig',
    connected: true,
    connectedAt: new Date().toISOString(),
    accessToken: 'mock-token-101',
    tokenExpiry: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  },
];

// Mock API functions
export const mockApi = {
  // Posts
  getPosts: () => {
    return Promise.resolve([...posts]);
  },
  
  getPostById: (id: number) => {
    const post = posts.find(p => p.id === id);
    if (!post) {
      return Promise.reject(new Error('Post not found'));
    }
    return Promise.resolve({...post});
  },
  
  createPost: (post: Omit<Post, 'id' | 'createdAt' | 'updatedAt' | 'userId'>) => {
    const newPost = {
      ...post,
      id: posts.length + 1,
      userId: 'user1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as Post;
    posts.push(newPost);
    return Promise.resolve({...newPost});
  },
  
  updatePost: (id: number, updates: Partial<Post>) => {
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) {
      return Promise.reject(new Error('Post not found'));
    }
    
    posts[index] = {
      ...posts[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    return Promise.resolve({...posts[index]});
  },
  
  deletePost: (id: number) => {
    const index = posts.findIndex(p => p.id === id);
    if (index === -1) {
      return Promise.reject(new Error('Post not found'));
    }
    
    const deletedPost = posts[index];
    posts = posts.filter(p => p.id !== id);
    
    return Promise.resolve({...deletedPost});
  },
  
  // Social Media Accounts
  getSocialMediaAccounts: () => {
    return Promise.resolve([...socialMediaAccounts]);
  },
  
  connectSocialMediaAccount: (account: Omit<SocialMediaAccount, 'id'>) => {
    const existingIndex = socialMediaAccounts.findIndex(a => a.platform === account.platform);
    
    if (existingIndex !== -1) {
      // Update existing account
      socialMediaAccounts[existingIndex] = {
        ...socialMediaAccounts[existingIndex],
        ...account,
        connected: true,
        connectedAt: new Date().toISOString(),
      };
      
      return Promise.resolve({...socialMediaAccounts[existingIndex]});
    } else {
      // Create new account
      const newAccount = {
        ...account,
        id: socialMediaAccounts.length + 1,
        userId: 'user1',
        connected: true,
        connectedAt: new Date().toISOString(),
      } as SocialMediaAccount;
      
      socialMediaAccounts.push(newAccount);
      return Promise.resolve({...newAccount});
    }
  },
  
  disconnectSocialMediaAccount: (platform: string) => {
    const index = socialMediaAccounts.findIndex(a => a.platform === platform);
    if (index === -1) {
      return Promise.reject(new Error('Account not found'));
    }
    
    socialMediaAccounts = socialMediaAccounts.filter(a => a.platform !== platform);
    
    return Promise.resolve({ success: true });
  },
  
  // AI Content Generation
  generateAIContent: (prompt: string) => {
    return Promise.resolve({
      content: `Generated content for: ${prompt}\n\nThis is an AI-generated post based on your prompt. It includes relevant information and engaging content that your audience will love. #AIContent #SocialMedia`,
      hashtags: ['#ai', '#generated', '#content']
    });
  },
  
  generateContentIdeas: (topic: string) => {
    return Promise.resolve([
      `10 ways ${topic} can transform your business in 2023`,
      `The ultimate guide to ${topic} for beginners`,
      `How we increased our ROI by 200% using ${topic}`,
      `${topic} best practices that industry leaders swear by`,
      `Common ${topic} mistakes and how to avoid them`
    ]);
  },
  
  // Analytics data for reports
  getAnalyticsData: () => {
    return Promise.resolve({
      postsByPlatform: [
        { platform: 'Twitter', count: 12 },
        { platform: 'LinkedIn', count: 8 },
        { platform: 'Facebook', count: 5 },
        { platform: 'Instagram', count: 7 }
      ],
      postsByStatus: [
        { status: 'published', count: 15 },
        { status: 'scheduled', count: 10 },
        { status: 'draft', count: 3 },
        { status: 'failed', count: 1 }
      ],
      engagementByPlatform: [
        { platform: 'Twitter', likes: 145, shares: 78, comments: 32 },
        { platform: 'LinkedIn', likes: 89, shares: 34, comments: 21 },
        { platform: 'Facebook', likes: 67, shares: 12, comments: 45 },
        { platform: 'Instagram', likes: 234, shares: 0, comments: 56 }
      ],
      postsOverTime: [
        { date: '2023-01', count: 5 },
        { date: '2023-02', count: 7 },
        { date: '2023-03', count: 10 },
        { date: '2023-04', count: 8 },
        { date: '2023-05', count: 12 },
        { date: '2023-06', count: 15 }
      ]
    });
  }
};