// Database adapter interface
// This file defines the interface for database operations
// Implementations can be created for different database systems

export interface SocialAccount {
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

export interface User {
  id?: number | string;
  email: string;
  name: string;
  password: string; // Hashed password
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreference {
  id?: number | string;
  userId: string;
  emailDigest: boolean;
  emailPostPublished: boolean;
  emailPostFailed: boolean;
  browserNotifications: boolean;
  updatedAt: string;
}

export interface DatabaseAdapter {
  // Social accounts
  socialAccounts: {
    findAll: (userId: string) => Promise<SocialAccount[]>;
    findByPlatform: (userId: string, platform: string) => Promise<SocialAccount | null>;
    create: (account: SocialAccount) => Promise<SocialAccount>;
    update: (account: Partial<SocialAccount>) => Promise<SocialAccount>;
    upsert: (account: SocialAccount) => Promise<SocialAccount>;
    delete: (userId: string, platform: string) => Promise<void>;
  };
  
  // Posts
  posts: {
    findAll: (userId: string) => Promise<Post[]>;
    findById: (id: number | string) => Promise<Post | null>;
    create: (post: Post) => Promise<Post>;
    update: (post: Partial<Post>) => Promise<Post>;
    delete: (id: number | string) => Promise<void>;
  };
  
  // Users
  users: {
    findByEmail: (email: string) => Promise<User | null>;
    findById: (id: number | string) => Promise<User | null>;
    create: (user: User) => Promise<User>;
    update: (user: Partial<User>) => Promise<User>;
    delete: (id: number | string) => Promise<void>;
  };
  
  // Notification preferences
  notificationPreferences: {
    findByUserId: (userId: string) => Promise<NotificationPreference | null>;
    create: (preference: NotificationPreference) => Promise<NotificationPreference>;
    update: (preference: Partial<NotificationPreference>) => Promise<NotificationPreference>;
  };
  
  // Database initialization
  initialize: () => Promise<void>;
}