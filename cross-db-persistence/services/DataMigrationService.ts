import { DatabaseFactory, DatabaseType, DatabaseConfig } from '../database/DatabaseFactory';
import { DataExportService } from './DataExportService';
import { DataImportService } from './DataImportService';

export interface MigrationOptions {
  userId: string;
  sourceConfig: DatabaseConfig;
  targetConfig: DatabaseConfig;
  backupPath?: string;
  validateAfterMigration?: boolean;
}

export interface MigrationResult {
  success: boolean;
  recordsMigrated: number;
  backupPath?: string;
  errors: string[];
  warnings: string[];
  duration: number;
}

export class DataMigrationService {
  async migrateUserData(options: MigrationOptions): Promise<MigrationResult> {
    const startTime = Date.now();
    console.log(`🚀 Starting migration for user ${options.userId}`);
    console.log(`📤 Source: ${options.sourceConfig.type}`);
    console.log(`📥 Target: ${options.targetConfig.type}`);

    const result: MigrationResult = {
      success: false,
      recordsMigrated: 0,
      errors: [],
      warnings: [],
      duration: 0
    };

    try {
      // Step 1: Export data from source database
      console.log('📤 Step 1: Exporting data from source database...');
      const sourceDb = await DatabaseFactory.createAdapter(options.sourceConfig);
      const exportService = new DataExportService(sourceDb);
      const exportData = await exportService.exportUserData(options.userId);

      // Step 2: Create backup if requested
      if (options.backupPath) {
        console.log('💾 Step 2: Creating backup...');
        result.backupPath = await exportService.exportToFile(options.userId, options.backupPath);
        result.warnings.push(`Backup created at: ${result.backupPath}`);
      }

      // Step 3: Import data to target database
      console.log('📥 Step 3: Importing data to target database...');
      const targetDb = await DatabaseFactory.createAdapter(options.targetConfig);
      const importService = new DataImportService(targetDb);
      
      const importResult = await importService.importUserData(exportData, {
        overwriteExisting: true,
        skipValidation: false
      });

      if (!importResult.success) {
        result.errors = importResult.errors;
        return result;
      }

      result.recordsMigrated = importResult.recordsImported;
      result.warnings.push(...importResult.warnings);

      // Step 4: Validate migration if requested
      if (options.validateAfterMigration) {
        console.log('✅ Step 4: Validating migration...');
        const validationResult = await this.validateMigration(
          options.userId,
          options.sourceConfig,
          options.targetConfig
        );
        
        if (!validationResult.success) {
          result.errors.push(...validationResult.errors);
          return result;
        }
        
        result.warnings.push('Migration validation passed');
      }

      result.success = true;
      result.duration = Date.now() - startTime;
      
      console.log(`✅ Migration completed successfully in ${result.duration}ms`);
      console.log(`📊 Records migrated: ${result.recordsMigrated}`);

    } catch (error) {
      console.error('❌ Migration failed:', error);
      result.errors.push(`Migration failed: ${error.message}`);
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  async validateMigration(
    userId: string,
    sourceConfig: DatabaseConfig,
    targetConfig: DatabaseConfig
  ): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      const sourceDb = await DatabaseFactory.createAdapter(sourceConfig);
      const targetDb = await DatabaseFactory.createAdapter(targetConfig);

      // Compare user data
      const [sourceUser, targetUser] = await Promise.all([
        sourceDb.users.findById(userId),
        targetDb.users.findById(userId)
      ]);

      if (!sourceUser || !targetUser) {
        errors.push('User not found in source or target database');
        return { success: false, errors };
      }

      if (sourceUser.email !== targetUser.email || sourceUser.name !== targetUser.name) {
        errors.push('User data mismatch between source and target');
      }

      // Compare posts count
      const [sourcePosts, targetPosts] = await Promise.all([
        sourceDb.posts.findAll(userId),
        targetDb.posts.findAll(userId)
      ]);

      if (sourcePosts.length !== targetPosts.length) {
        errors.push(`Posts count mismatch: source=${sourcePosts.length}, target=${targetPosts.length}`);
      }

      // Compare social accounts count
      const [sourceSocialAccounts, targetSocialAccounts] = await Promise.all([
        sourceDb.socialAccounts.findAll(userId),
        targetDb.socialAccounts.findAll(userId)
      ]);

      if (sourceSocialAccounts.length !== targetSocialAccounts.length) {
        errors.push(`Social accounts count mismatch: source=${sourceSocialAccounts.length}, target=${targetSocialAccounts.length}`);
      }

      return { success: errors.length === 0, errors };

    } catch (error) {
      errors.push(`Validation failed: ${error.message}`);
      return { success: false, errors };
    }
  }

  async quickMigrate(
    userId: string,
    fromType: DatabaseType,
    toType: DatabaseType
  ): Promise<MigrationResult> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `./migration-backup-${userId}-${timestamp}.json`;

    return this.migrateUserData({
      userId,
      sourceConfig: { type: fromType },
      targetConfig: { type: toType },
      backupPath,
      validateAfterMigration: true
    });
  }
}