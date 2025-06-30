// User settings interface
export interface UserSettings {
  botToken: string;
  channelId: string;
  emailDigest: boolean;
  emailPostPublished: boolean;
  emailPostFailed: boolean;
  browserNotifications: boolean;
  slackPostScheduled: boolean;
  slackPostPublished: boolean;
  slackPostFailed: boolean;
  name: string;
  email: string;
  notificationEmail?: string;
}

// Post interface
export interface Post {
  id: number;
  userId: string;
  platform: string;
  content: string;
  scheduledTime: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  media?: {
    url: string;
    type: string;
    alt?: string;
  }[];
}

// Filter options interface
export interface FilterOptions {
  platform: string;
  dateRange: string;
  status: string;
  searchQuery: string;
}

// Social media account interface
export interface SocialMediaAccount {
  id: number;
  userId: string;
  platform: string;
  username: string;
  connected: boolean;
  connectedAt: string;
  accessToken?: string;
  tokenExpiry?: string;
}

export type PostsGroupedByDate = {
  date: string;
  title: string;
  posts: Post[];
};