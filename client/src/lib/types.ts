export interface Post {
  id?: number | string;
  userId: string;
  platform: string;
  content: string;
  scheduledTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface SocialMediaAccount {
  id?: number | string;
  userId: string;
  platform: string;
  username: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenExpiry?: string | null;
  connected: boolean;
  connectedAt: string;
  profileData?: string;
}

export interface FilterOptions {
  platform: string;
  dateRange: string;
  status: string;
  searchQuery: string;
}

export interface UserSettings {
  // Slack settings
  botToken: string;
  channelId: string;
  
  // Notification settings
  emailDigest: boolean;
  emailPostPublished: boolean;
  emailPostFailed: boolean;
  browserNotifications: boolean;
  
  // Account settings
  name: string;
  email: string;
}