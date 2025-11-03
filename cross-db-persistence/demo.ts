#!/usr/bin/env ts-node

/**
 * Cross-Database Persistence Demo Script
 * 
 * This script demonstrates the key features of the cross-database persistence system:
 * 1. Database factory with fallback support
 * 2. Data export/import functionality
 * 3. Complete migration workflow
 * 4. Configuration management
 */

import { DatabaseFactory, DatabaseType } from './database/DatabaseFactory';
import { DataExportService } from './services/DataExportService';
import { DataImportService } from './services/DataImportService';
import { DataMigrationService } from './services/DataMigrationService';
import { DatabaseConfigManager } from './config/DatabaseConfig';

async function runDemo() {
  console.log('🚀 Cross-Database Persistence System Demo');
  console.log('==========================================\n');

  try {
    // 1. Show available database types
    console.log('📋 Step 1: Check Available Databases');
    console.log('------------------------------------');
    const availableTypes = DatabaseConfigManager.getAvailableDatabaseTypes();
    const runtimeConfig = DatabaseConfigManager.getRuntimeConfig();
    
    console.log(`Available types: ${availableTypes.join(', ')}`);
    console.log(`Current default: ${runtimeConfig.currentType}`);
    console.log(`Can switch: ${runtimeConfig.canSwitch}`);
    console.log(`Fallback enabled: ${runtimeConfig.fallbackEnabled}\n`);

    // 2. Test database connections
    console.log('🔌 Step 2: Test Database Connections');
    console.log('------------------------------------');
    
    for (const dbType of availableTypes) {
      const isAvailable = await DatabaseConfigManager.isDatabaseTypeAvailable(dbType);
      console.log(`${dbType}: ${isAvailable ? '✅ Available' : '❌ Not Available'}`);
    }
    console.log('');

    // 3. Demonstrate database factory
    console.log('🏭 Step 3: Database Factory Demo');
    console.log('--------------------------------');
    
    const sqliteDb = await DatabaseFactory.getInstance({ type: 'sqlite' });
    console.log('✅ SQLite adapter created');
    
    // Try PostgreSQL if available
    if (availableTypes.includes('postgres')) {
      try {
        const postgresDb = await DatabaseFactory.getInstance({ type: 'postgres' });
        console.log('✅ PostgreSQL adapter created');
      } catch (error) {
        console.log('⚠️  PostgreSQL adapter failed (expected if not configured)');
      }
    }
    console.log('');

    // 4. Demonstrate user preferences
    console.log('👤 Step 4: User Preferences Demo');
    console.log('--------------------------------');
    
    const testUserId = 'demo-user-123';
    
    // Set user preference
    DatabaseConfigManager.setUserPreference(testUserId, 'sqlite');
    console.log(`Set preference for ${testUserId}: sqlite`);
    
    // Get user configuration
    const userConfig = DatabaseConfigManager.getConfigForUser(testUserId);
    console.log(`User config: ${JSON.stringify(userConfig, null, 2)}`);
    console.log('');

    // 5. Demonstrate export functionality (mock data)
    console.log('📤 Step 5: Data Export Demo');
    console.log('---------------------------');
    
    const exportService = new DataExportService(sqliteDb);
    
    // Create mock export data structure
    const mockExportData = {
      userId: testUserId,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      data: {
        user: {
          id: testUserId,
          name: 'Demo User',
          email: 'demo@example.com',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        posts: [
          {
            id: 1,
            userId: testUserId,
            platform: 'twitter',
            content: 'Demo post content',
            scheduledTime: new Date(Date.now() + 86400000).toISOString(),
            status: 'scheduled',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }
        ],
        socialAccounts: [],
        notificationPreferences: {
          userId: testUserId,
          emailDigest: true,
          emailPostPublished: true,
          emailPostFailed: true,
          browserNotifications: false,
          updatedAt: new Date().toISOString()
        }
      },
      metadata: {
        totalRecords: 3,
        checksum: 'demo-checksum-123'
      }
    };
    
    console.log('✅ Mock export data created');
    console.log(`Records: ${mockExportData.metadata.totalRecords}`);
    console.log(`User: ${mockExportData.data.user.name}`);
    console.log(`Posts: ${mockExportData.data.posts.length}`);
    console.log('');

    // 6. Demonstrate import functionality
    console.log('📥 Step 6: Data Import Demo');
    console.log('---------------------------');
    
    const importService = new DataImportService(sqliteDb);
    
    console.log('✅ Import service initialized');
    console.log('Note: Actual import would require real database operations');
    console.log('');

    // 7. Demonstrate migration service
    console.log('🔄 Step 7: Migration Service Demo');
    console.log('---------------------------------');
    
    const migrationService = new DataMigrationService();
    
    console.log('✅ Migration service initialized');
    console.log('Available migration methods:');
    console.log('  - migrateUserData(): Full migration with options');
    console.log('  - quickMigrate(): Simple migration between database types');
    console.log('  - validateMigration(): Verify migration success');
    console.log('');

    // 8. Show configuration summary
    console.log('⚙️  Step 8: Configuration Summary');
    console.log('---------------------------------');
    
    const config = DatabaseConfigManager.getRuntimeConfig();
    console.log('Runtime Configuration:');
    console.log(`  Current Type: ${config.currentType}`);
    console.log(`  Available Types: ${config.availableTypes.join(', ')}`);
    console.log(`  Can Switch: ${config.canSwitch}`);
    console.log(`  Fallback Enabled: ${config.fallbackEnabled}`);
    console.log('');

    console.log('✅ Demo completed successfully!');
    console.log('\n🎯 Next Steps:');
    console.log('1. Configure your database environment variables');
    console.log('2. Create a user account in your application');
    console.log('3. Use the CLI tool for actual migrations:');
    console.log('   node cross-db-persistence/utils/MigrationCLI.ts --help');
    console.log('4. Integrate the services into your application');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check your environment variables (.env file)');
    console.log('2. Ensure database connections are properly configured');
    console.log('3. Verify that required dependencies are installed');
  }
}

// Run the demo
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo };