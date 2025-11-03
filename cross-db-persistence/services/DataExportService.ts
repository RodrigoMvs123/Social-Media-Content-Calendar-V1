import { DatabaseAdapter } from '../../server/db-adapter';

export interface UserDataExport {
  userId: string;
  exportDate: string;
  version: string;
  data: {
    user: any;
    posts: any[];
    socialAccounts: any[];
    notificationPreferences: any;
    slackSettings?: any;
  };
  metadata: {
    totalRecords: number;
    checksum: string;
  };
}

export class DataExportService {
  constructor(private db: DatabaseAdapter) {}

  async exportUserData(userId: string): Promise<UserDataExport> {
    console.log(`📤 Starting data export for user: ${userId}`);
    
    try {
      // Fetch all user data
      const [user, posts, socialAccounts, notificationPreferences] = await Promise.all([
        this.db.users.findById(userId),
        this.db.posts.findAll(userId),
        this.db.socialAccounts.findAll(userId),
        this.db.notificationPreferences.findByUserId(userId)
      ]);

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      // Create export data structure
      const exportData: UserDataExport = {
        userId,
        exportDate: new Date().toISOString(),
        version: '1.0.0',
        data: {
          user: this.sanitizeUser(user),
          posts: posts.map(post => this.sanitizePost(post)),
          socialAccounts: socialAccounts.map(account => this.sanitizeSocialAccount(account)),
          notificationPreferences: notificationPreferences || this.getDefaultNotificationPreferences(userId)
        },
        metadata: {
          totalRecords: 0,
          checksum: ''
        }
      };

      // Calculate metadata
      exportData.metadata.totalRecords = 
        1 + // user
        exportData.data.posts.length +
        exportData.data.socialAccounts.length +
        1; // notification preferences

      exportData.metadata.checksum = this.calculateChecksum(exportData);

      console.log(`✅ Data export completed: ${exportData.metadata.totalRecords} records`);
      return exportData;

    } catch (error) {
      console.error('❌ Data export failed:', error);
      throw new Error(`Data export failed: ${error.message}`);
    }
  }

  async exportToFile(userId: string, filePath: string): Promise<string> {
    const exportData = await this.exportUserData(userId);
    const fs = await import('fs/promises');
    
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2));
    console.log(`💾 Export saved to: ${filePath}`);
    
    return filePath;
  }

  private sanitizeUser(user: any): any {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  private sanitizePost(post: any): any {
    return {
      ...post,
      media: post.media ? (typeof post.media === 'string' ? JSON.parse(post.media) : post.media) : null
    };
  }

  private sanitizeSocialAccount(account: any): any {
    return {
      ...account,
      accessToken: account.accessToken ? '[ENCRYPTED]' : null,
      refreshToken: account.refreshToken ? '[ENCRYPTED]' : null,
      profileData: account.profileData ? (typeof account.profileData === 'string' ? JSON.parse(account.profileData) : account.profileData) : null
    };
  }

  private getDefaultNotificationPreferences(userId: string): any {
    return {
      userId,
      emailDigest: false,
      emailPostPublished: false,
      emailPostFailed: false,
      browserNotifications: true,
      updatedAt: new Date().toISOString()
    };
  }

  private calculateChecksum(data: UserDataExport): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data.data);
    return crypto.createHash('sha256').update(dataString).digest('hex').substring(0, 16);
  }
}