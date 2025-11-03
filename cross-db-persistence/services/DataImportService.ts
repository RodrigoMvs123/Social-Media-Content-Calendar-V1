import { DatabaseAdapter } from '../../server/db-adapter';
import { UserDataExport } from './DataExportService';

export interface ImportResult {
  success: boolean;
  recordsImported: number;
  errors: string[];
  warnings: string[];
}

export class DataImportService {
  constructor(private db: DatabaseAdapter) {}

  async importUserData(exportData: UserDataExport, options: {
    overwriteExisting?: boolean;
    skipValidation?: boolean;
  } = {}): Promise<ImportResult> {
    console.log(`📥 Starting data import for user: ${exportData.userId}`);
    
    const result: ImportResult = {
      success: false,
      recordsImported: 0,
      errors: [],
      warnings: []
    };

    try {
      // Validate export data
      if (!options.skipValidation) {
        const validationErrors = this.validateExportData(exportData);
        if (validationErrors.length > 0) {
          result.errors = validationErrors;
          return result;
        }
      }

      // Check if user already exists
      const existingUser = await this.db.users.findById(exportData.userId);
      if (existingUser && !options.overwriteExisting) {
        result.errors.push('User already exists. Use overwriteExisting option to replace.');
        return result;
      }

      // Import user data
      await this.importUser(exportData.data.user, existingUser, result);
      
      // Import posts
      await this.importPosts(exportData.data.posts, result);
      
      // Import social accounts
      await this.importSocialAccounts(exportData.data.socialAccounts, result);
      
      // Import notification preferences
      await this.importNotificationPreferences(exportData.data.notificationPreferences, result);

      result.success = true;
      console.log(`✅ Data import completed: ${result.recordsImported} records imported`);

    } catch (error) {
      console.error('❌ Data import failed:', error);
      result.errors.push(`Import failed: ${error.message}`);
    }

    return result;
  }

  async importFromFile(filePath: string, options?: {
    overwriteExisting?: boolean;
    skipValidation?: boolean;
  }): Promise<ImportResult> {
    const fs = await import('fs/promises');
    
    try {
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const exportData: UserDataExport = JSON.parse(fileContent);
      
      console.log(`📁 Loading export from: ${filePath}`);
      return await this.importUserData(exportData, options);
      
    } catch (error) {
      return {
        success: false,
        recordsImported: 0,
        errors: [`Failed to read import file: ${error.message}`],
        warnings: []
      };
    }
  }

  private validateExportData(exportData: UserDataExport): string[] {
    const errors: string[] = [];

    if (!exportData.userId) {
      errors.push('Missing userId in export data');
    }

    if (!exportData.data) {
      errors.push('Missing data section in export');
    }

    if (!exportData.data?.user) {
      errors.push('Missing user data in export');
    }

    if (!exportData.version) {
      errors.push('Missing version in export data');
    }

    // Validate checksum if present
    if (exportData.metadata?.checksum) {
      const crypto = require('crypto');
      const dataString = JSON.stringify(exportData.data);
      const calculatedChecksum = crypto.createHash('sha256').update(dataString).digest('hex').substring(0, 16);
      
      if (calculatedChecksum !== exportData.metadata.checksum) {
        errors.push('Data integrity check failed - checksum mismatch');
      }
    }

    return errors;
  }

  private async importUser(userData: any, existingUser: any, result: ImportResult): Promise<void> {
    try {
      if (existingUser) {
        await this.db.users.update({
          id: userData.id,
          name: userData.name,
          email: userData.email,
          updatedAt: new Date().toISOString()
        });
        result.warnings.push('User updated (password not changed)');
      } else {
        // Remove ID to let the target database auto-generate it
        const { id, ...userDataWithoutId } = userData;
        
        // Map PostgreSQL column names to SQLite format
        const mappedUser = {
          name: userDataWithoutId.name,
          email: userDataWithoutId.email,
          password: 'TEMP_PASSWORD_NEEDS_RESET',
          createdAt: userDataWithoutId.createdat || userDataWithoutId.createdAt || new Date().toISOString(),
          updatedAt: userDataWithoutId.updatedat || userDataWithoutId.updatedAt || new Date().toISOString()
        };
        
        await this.db.users.create(mappedUser);
        result.warnings.push('User created with temporary password - password reset required');
      }
      result.recordsImported++;
    } catch (error) {
      result.errors.push(`Failed to import user: ${error.message}`);
    }
  }

  private async importPosts(posts: any[], result: ImportResult): Promise<void> {
    for (const post of posts) {
      try {
        // Remove ID to let the target database auto-generate it
        const { id, ...postData } = post;
        
        // Map PostgreSQL column names to SQLite format
        const mappedPost = {
          userId: postData.userid || postData.userId,
          platform: postData.platform,
          content: postData.content,
          scheduledTime: postData.scheduledtime || postData.scheduledTime,
          status: postData.status,
          createdAt: postData.createdat || postData.createdAt || new Date().toISOString(),
          updatedAt: postData.updatedat || postData.updatedAt || new Date().toISOString(),
          publishedAt: postData.publishedat || postData.publishedAt,
          media: postData.media,
          slackMessageTs: postData.slackmessagets || postData.slackMessageTs
        };
        
        await this.db.posts.create(mappedPost);
        result.recordsImported++;
      } catch (error) {
        result.errors.push(`Failed to import post ${post.id}: ${error.message}`);
      }
    }
  }

  private async importSocialAccounts(accounts: any[], result: ImportResult): Promise<void> {
    for (const account of accounts) {
      try {
        // Skip accounts with encrypted tokens
        if (account.accessToken === '[ENCRYPTED]') {
          result.warnings.push(`Social account ${account.platform} skipped - tokens need to be reconnected`);
          continue;
        }

        await this.db.socialAccounts.create({
          ...account,
          connectedAt: account.connectedAt || new Date().toISOString()
        });
        result.recordsImported++;
      } catch (error) {
        result.errors.push(`Failed to import social account ${account.platform}: ${error.message}`);
      }
    }
  }

  private async importNotificationPreferences(preferences: any, result: ImportResult): Promise<void> {
    try {
      await this.db.notificationPreferences.update({
        ...preferences,
        updatedAt: new Date().toISOString()
      });
      result.recordsImported++;
    } catch (error) {
      result.errors.push(`Failed to import notification preferences: ${error.message}`);
    }
  }
}