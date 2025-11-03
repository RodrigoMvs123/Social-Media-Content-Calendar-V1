# Cross-Database Persistence System

This folder contains the implementation of the cross-database persistence system that allows users to seamlessly migrate their data between SQLite and PostgreSQL databases.

## 📁 Folder Structure

```
cross-db-persistence/
├── database/
│   └── DatabaseFactory.ts          # Database adapter factory with fallback support
├── services/
│   ├── DataExportService.ts        # Export user data to portable format
│   ├── DataImportService.ts        # Import user data from portable format
│   └── DataMigrationService.ts     # Orchestrate complete migration process
├── config/
│   └── DatabaseConfig.ts           # User preferences and configuration management
├── utils/
│   └── MigrationCLI.ts            # Command-line interface for migrations
└── README.md                       # This file
```

## 🚀 Quick Start

### 1. Basic Migration (Programmatic)

```typescript
import { DataMigrationService } from './services/DataMigrationService';

const migrationService = new DataMigrationService();

// Migrate user from SQLite to PostgreSQL
const result = await migrationService.quickMigrate(
  'user123',
  'sqlite',
  'postgres'
);

if (result.success) {
  console.log(`✅ Migrated ${result.recordsMigrated} records`);
} else {
  console.error('❌ Migration failed:', result.errors);
}
```

### 2. Command Line Migration

```bash
# Navigate to the project root
cd /workspaces/Social-Media-Content-Calendar-V1

# Run migration via CLI
node cross-db-persistence/utils/MigrationCLI.ts \
  --user-id user123 \
  --from sqlite \
  --to postgres \
  --backup \
  --validate

# List available databases
node cross-db-persistence/utils/MigrationCLI.ts --list
```

### 3. Export/Import Data

```typescript
import { DataExportService } from './services/DataExportService';
import { DataImportService } from './services/DataImportService';
import { DatabaseFactory } from './database/DatabaseFactory';

// Export user data
const sourceDb = await DatabaseFactory.getInstance({ type: 'sqlite' });
const exportService = new DataExportService(sourceDb);
const exportData = await exportService.exportUserData('user123');

// Save to file
await exportService.exportToFile('user123', './backup.json');

// Import to different database
const targetDb = await DatabaseFactory.getInstance({ type: 'postgres' });
const importService = new DataImportService(targetDb);
const result = await importService.importUserData(exportData);
```

## 🔧 Configuration

### Environment Variables

```bash
# Database configuration
DB_TYPE=sqlite                    # Default database type
DATABASE_URL=postgresql://...     # PostgreSQL connection string
DB_PATH=./data.sqlite            # SQLite database path

# Migration settings
ENABLE_DB_FALLBACK=true          # Enable automatic fallback
ENABLE_CROSS_DB_PERSISTENCE=true # Enable cross-database features
MIGRATION_BATCH_SIZE=1000        # Batch size for large migrations
EXPORT_ENCRYPTION_KEY=your_key   # Encryption key for exports
```

### User Preferences

```typescript
import { DatabaseConfigManager } from './config/DatabaseConfig';

// Set user's preferred database
DatabaseConfigManager.setUserPreference('user123', 'postgres');

// Get user's configuration
const config = DatabaseConfigManager.getConfigForUser('user123');

// Check available databases
const available = DatabaseConfigManager.getAvailableDatabaseTypes();
```

## 📊 Data Format

### Export Data Structure

```json
{
  "userId": "user123",
  "exportDate": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0",
  "data": {
    "user": {
      "id": "user123",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z"
    },
    "posts": [
      {
        "id": 1,
        "userId": "user123",
        "platform": "twitter",
        "content": "Hello world!",
        "scheduledTime": "2024-01-16T09:00:00.000Z",
        "status": "scheduled",
        "createdAt": "2024-01-15T10:30:00.000Z",
        "updatedAt": "2024-01-15T10:30:00.000Z"
      }
    ],
    "socialAccounts": [
      {
        "id": 1,
        "userId": "user123",
        "platform": "twitter",
        "username": "johndoe",
        "accessToken": "[ENCRYPTED]",
        "connected": true,
        "connectedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "notificationPreferences": {
      "userId": "user123",
      "emailDigest": true,
      "emailPostPublished": true,
      "emailPostFailed": true,
      "browserNotifications": false,
      "updatedAt": "2024-01-15T10:30:00.000Z"
    }
  },
  "metadata": {
    "totalRecords": 4,
    "checksum": "a1b2c3d4e5f6g7h8"
  }
}
```

## 🔒 Security Features

### Data Sanitization
- Passwords are never exported
- Access tokens are marked as `[ENCRYPTED]` in exports
- Sensitive data is excluded from portable formats

### Data Integrity
- SHA-256 checksums for export validation
- Record count verification
- Post-migration validation options

### Access Control
- User-specific data isolation
- Migration permission validation
- Audit trail for operations

## 🧪 Testing

### Unit Tests
```bash
# Test database factory
npm test cross-db-persistence/database/DatabaseFactory.test.ts

# Test migration services
npm test cross-db-persistence/services/

# Test configuration management
npm test cross-db-persistence/config/
```

### Integration Tests
```bash
# Test complete migration workflow
npm test cross-db-persistence/integration/

# Test CLI functionality
npm test cross-db-persistence/utils/MigrationCLI.test.ts
```

## 📈 Usage Examples

### Scenario 1: Development to Production
```typescript
// Developer wants to move from SQLite to PostgreSQL for production
const result = await migrationService.migrateUserData({
  userId: 'dev-user',
  sourceConfig: { type: 'sqlite', dbPath: './dev.sqlite' },
  targetConfig: { type: 'postgres', connectionString: process.env.PROD_DB_URL },
  backupPath: './migration-backup.json',
  validateAfterMigration: true
});
```

### Scenario 2: Docker Environment Switch
```typescript
// User switches from Docker SQLite to Docker PostgreSQL
const result = await migrationService.quickMigrate(
  'docker-user',
  'sqlite',
  'postgres'
);

// Update user preference
DatabaseConfigManager.setUserPreference('docker-user', 'postgres');
```

### Scenario 3: Data Backup and Restore
```typescript
// Create backup before major changes
const exportService = new DataExportService(currentDb);
await exportService.exportToFile('user123', `./backup-${Date.now()}.json`);

// Restore from backup if needed
const importService = new DataImportService(currentDb);
await importService.importFromFile('./backup-1642234567890.json', {
  overwriteExisting: true
});
```

## 🚨 Error Handling

### Common Issues and Solutions

1. **Database Connection Failed**
   ```
   Error: Failed to initialize postgres: connection refused
   Solution: Check DATABASE_URL and ensure PostgreSQL is running
   ```

2. **User Not Found**
   ```
   Error: User not found: user123
   Solution: Verify user ID exists in source database
   ```

3. **Data Integrity Check Failed**
   ```
   Error: Data integrity check failed - checksum mismatch
   Solution: Re-export data or skip validation if data is known to be good
   ```

4. **Permission Denied**
   ```
   Error: User already exists. Use overwriteExisting option
   Solution: Add overwriteExisting: true to import options
   ```

## 🔄 Migration Workflow

1. **Pre-Migration**
   - Validate source database connection
   - Check target database availability
   - Create backup if requested

2. **Export Phase**
   - Extract user data from source database
   - Sanitize sensitive information
   - Calculate data integrity checksum

3. **Import Phase**
   - Validate export data integrity
   - Import data to target database
   - Handle conflicts and duplicates

4. **Post-Migration**
   - Validate migration success
   - Update user preferences
   - Clean up temporary files

5. **Rollback (if needed)**
   - Restore from backup
   - Reset user preferences
   - Log rollback operation

## 📞 Support

For issues or questions about the cross-database persistence system:

1. Check the error logs for specific error messages
2. Verify environment variables are correctly set
3. Test database connections individually
4. Review the migration logs for detailed information
5. Use the CLI `--list` option to check database availability

## 🔮 Future Enhancements

- **Scheduled Migrations**: Automatic migration based on user preferences
- **Batch User Migration**: Migrate multiple users simultaneously
- **Real-time Sync**: Keep data synchronized across multiple databases
- **Cloud Storage Integration**: Store backups in cloud storage
- **Migration Analytics**: Track migration patterns and performance
- **GUI Interface**: Web-based migration management interface