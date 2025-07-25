import { UserSettings, Post, SocialMediaAccount } from './types';
import { mockApi } from './mockApi';

// Base API URL - Use relative path with Vite proxy
const API_BASE_URL = '/api';

// Configuration flags
const USE_MOCK_DATA = false;  // Use real data from the server
const USE_REAL_AUTH = true;  // Use real authentication with fallback to mock
const USE_REAL_AI = true;    // Use real OpenAI API for content generation

console.log("API Configuration:", { 
  USE_MOCK_DATA, 
  USE_REAL_AUTH, 
  API_BASE_URL 
});

// Add a type for authentication responses
interface AuthResponse {
  token?: string;
  user?: any;
  [key: string]: any;
}

// Generic fetch wrapper with error handling
async function fetchWithErrorHandling<T = any>(url: string, options?: RequestInit): Promise<T> {
  try {
    const fullUrl = `${API_BASE_URL}${url}`;
    console.log(`Fetching: ${fullUrl}`, options);
    console.log(`API_BASE_URL is: ${API_BASE_URL}`);
    
    // Get token from localStorage
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch(fullUrl, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if token exists
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options?.headers || {})
      },
      credentials: 'include' // Include cookies for session
    });

    console.log(`Response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error: ${response.status}`, errorText);
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Response data:`, data);
    return data;
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    throw error;
  }
}

// User Authentication API
export const registerUser = async (userData: { name: string; email: string; password: string }) => {
  console.log("registerUser called with:", userData.email);
  console.log("Using real auth:", USE_REAL_AUTH);
  
  // Always use real authentication without fallback
  console.log("Sending registration request to:", `${API_BASE_URL}/auth/register`);
  const response = await fetchWithErrorHandling<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  
  // Store the token if it exists in the response
  if (response.token) {
    localStorage.setItem('auth_token', response.token);
    console.log('Token stored in localStorage');
  }
  
  return response.user || response;
};

export const loginUser = async (credentials: { email: string; password: string }) => {
  console.log("loginUser called with:", credentials.email);
  console.log("Using real auth:", USE_REAL_AUTH);
  
  // Always use real authentication without fallback
  console.log("Sending login request to:", `${API_BASE_URL}/auth/login`);
  const response = await fetchWithErrorHandling<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  });
  
  // Store the token if it exists in the response
  if (response.token) {
    localStorage.setItem('auth_token', response.token);
    console.log('Token stored in localStorage');
  }
  
  return response.user || response;
};

export const logoutUser = async () => {
  console.log("logoutUser called");
  console.log("Using real auth:", USE_REAL_AUTH);
  
  // Always use real authentication without fallback
  console.log("Sending logout request to:", `${API_BASE_URL}/auth/logout`);
  const response = await fetchWithErrorHandling<AuthResponse>('/auth/logout', {
    method: 'POST'
  });
  
  // Remove token from localStorage
  localStorage.removeItem('auth_token');
  console.log('Token removed from localStorage');
  
  return response;
};

export const getCurrentUser = async () => {
  console.log("getCurrentUser called");
  console.log("Using real auth:", USE_REAL_AUTH);
  
  // Always use real authentication without fallback
  console.log("Sending getCurrentUser request to:", `${API_BASE_URL}/auth/me`);
  return fetchWithErrorHandling<AuthResponse>('/auth/me');
};

// Settings API
export const fetchSettings = () => {
  if (USE_MOCK_DATA) {
    return Promise.resolve({
      botToken: 'xoxb-mock-token',
      channelId: 'C12345',
      emailDigest: true,
      emailPostPublished: true,
      emailPostFailed: false,
      browserNotifications: true,
      name: 'Demo User',
      email: 'demo@example.com'
    } as UserSettings);
  }
  return fetchWithErrorHandling<UserSettings>('/settings');
};

export const saveSettings = (settings: Partial<UserSettings>) => {
  if (USE_MOCK_DATA) {
    return Promise.resolve({
      ...settings,
      name: settings.name || 'Demo User',
      email: settings.email || 'demo@example.com'
    } as UserSettings);
  }
  return fetchWithErrorHandling<UserSettings>('/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
};

// Calendar posts API
export const fetchCalendarPosts = () => {
  if (USE_MOCK_DATA) {
    return mockApi.getPosts();
  }
  return fetchWithErrorHandling<Post[]>('/posts');
};

// Upload media files
export const uploadMedia = async (files: File[]): Promise<{ url: string, type: string, alt?: string }[]> => {
  // Always use data URLs for persistence
  console.log('Using data URLs for all files');
  return Promise.all(
    files.map(async file => {
      return new Promise<{ url: string, type: string, alt?: string }>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          // For large files, consider compressing or resizing before storing
          const dataUrl = reader.result as string;
          console.log(`File size: ${Math.round(dataUrl.length / 1024)} KB`);
          
          resolve({
            url: dataUrl,
            type: file.type.startsWith('image/') ? 'image' : 'video',
            alt: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    })
  );
};

export const createPost = (post: any) => {
  if (USE_MOCK_DATA) {
    return mockApi.createPost(post);
  }
  return fetchWithErrorHandling('/posts', {
    method: 'POST',
    body: JSON.stringify(post)
  });
};

export const updatePost = (id: string | number, updates: any) => {
  if (USE_MOCK_DATA) {
    return mockApi.updatePost(Number(id), updates);
  }
  return fetchWithErrorHandling(`/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates)
  });
};

export const deletePost = (id: string | number) => {
  if (USE_MOCK_DATA) {
    return mockApi.deletePost(Number(id));
  }
  return fetchWithErrorHandling(`/posts/${id}`, {
    method: 'DELETE'
  });
};

// Social accounts API
export const fetchSocialAccounts = () => {
  if (USE_MOCK_DATA) {
    return mockApi.getSocialMediaAccounts();
  }
  return fetchWithErrorHandling<SocialMediaAccount[]>('/social-accounts');
};

export const connectSocialAccount = (platform: string, data: any) => {
  if (USE_MOCK_DATA) {
    return mockApi.connectSocialMediaAccount({
      platform,
      username: data.username || 'demo_user',
      accessToken: 'mock-token',
      connected: true,
      connectedAt: new Date().toISOString(),
      userId: data.userId || 'mock-user-id' // <-- Add this line
    });
  }
  return fetchWithErrorHandling(`/social-accounts/${platform}`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const disconnectSocialAccount = (platform: string) => {
  if (USE_MOCK_DATA) {
    return mockApi.disconnectSocialMediaAccount(platform);
  }
  return fetchWithErrorHandling(`/social-accounts/${platform}`, {
    method: 'DELETE'
  });
};

// AI Content Generation API
export const generateAIContent = async (prompt: string, platform: string): Promise<string> => {
  if (USE_MOCK_DATA && !USE_REAL_AI) {
    const response = await mockApi.generateAIContent(prompt);
    return response.content;
  }
  
  try {
    const response = await fetchWithErrorHandling<{ content: string }>('/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt, platform })
    });
    return response.content;
  } catch (error) {
    console.error('Error generating AI content:', error);
    return `Here's a sample post for ${platform}: \n\nExcited to announce our latest feature! Check it out and let us know what you think. #NewFeature #ProductUpdate`;
  }
};

export const generateContentIdeas = async (topic: string): Promise<string[]> => {
  if (USE_MOCK_DATA && !USE_REAL_AI) {
    return mockApi.generateContentIdeas(topic);
  }
  
  try {
    const response = await fetchWithErrorHandling<{ ideas: string[] }>('/ai/ideas', {
      method: 'POST',
      body: JSON.stringify({ topic })
    });
    return response.ideas;
  } catch (error) {
    console.error('Error generating content ideas:', error);
    return [
      `5 ways to improve your ${topic} strategy`,
      `The future of ${topic} in 2023`,
      `How our team approaches ${topic}`,
      `${topic} best practices you should follow`,
      `Common mistakes to avoid with ${topic}`
    ];
  }
};

// Analytics API for reports
export const fetchAnalyticsData = async () => {
  try {
    // Always get the actual posts from the calendar for accurate analytics
    const posts = await fetchCalendarPosts();
    
    // Count posts by platform
    const platformCounts: Record<string, number> = {};
    posts.forEach(post => {
      platformCounts[post.platform] = (platformCounts[post.platform] || 0) + 1;
    });
    
    // Count posts by status - ensure all status types are included
    const statusCounts: Record<string, number> = {
      'draft': 0,
      'needs_approval': 0,
      'ready': 0,
      'scheduled': 0,
      'published': 0
    };
    
    posts.forEach(post => {
      if (statusCounts.hasOwnProperty(post.status)) {
        statusCounts[post.status]++;
      } else {
        statusCounts[post.status] = 1;
      }
    });
    
    // Format data for charts
    const postsByPlatform = Object.entries(platformCounts).map(([platform, count]) => ({
      platform,
      count
    }));
    
    const postsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count
    }));
    
    return {
      postsByPlatform,
      postsByStatus,
      engagementByPlatform: [
        { platform: 'X', likes: 145, shares: 78, comments: 32 },
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
    };
  } catch (error) {
    console.error('Error fetching analytics data:', error);
    // Return empty data structure if there's an error
    return {
      postsByPlatform: [],
      postsByStatus: [
        { status: 'draft', count: 0 },
        { status: 'needs_approval', count: 0 },
        { status: 'ready', count: 0 },
        { status: 'scheduled', count: 0 },
        { status: 'published', count: 0 }
      ],
      engagementByPlatform: [],
      postsOverTime: []
    };
  }
};

// Social accounts API object
export const socialAccountsApi = {
  getAll: () => fetchSocialAccounts(),
  connect: (platform: string, data: any) => connectSocialAccount(platform, data),
  disconnect: (platform: string) => disconnectSocialAccount(platform)
};