#!/usr/bin/env node

import { DataMigrationService } from '../services/DataMigrationService';
import { DatabaseType } from '../database/DatabaseFactory';
import { DatabaseConfigManager } from '../config/DatabaseConfig';

interface CLIOptions {
  userId?: string;
  from?: DatabaseType;
  to?: DatabaseType;
  backup?: boolean;
  validate?: boolean;
  list?: boolean;
  help?: boolean;
}

export class MigrationCLI {
  private migrationService = new DataMigrationService();

  async run(args: string[]): Promise<void> {
    const options = this.parseArgs(args);

    if (options.help) {
      this.showHelp();
      return;
    }

    if (options.list) {
      await this.listAvailableDatabases();
      return;
    }

    if (!options.userId) {
      console.error('❌ User ID is required. Use --user-id <id>');
      process.exit(1);
    }

    if (!options.from || !options.to) {
      console.error('❌ Source and target database types are required. Use --from <type> --to <type>');
      process.exit(1);
    }

    if (options.from === options.to) {
      console.error('❌ Source and target database types must be different');
      process.exit(1);
    }

    await this.performMigration(options);
  }

  private parseArgs(args: string[]): CLIOptions {
    const options: CLIOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const nextArg = args[i + 1];

      switch (arg) {
        case '--user-id':
        case '-u':
          options.userId = nextArg;
          i++;
          break;
        case '--from':
        case '-f':
          options.from = nextArg as DatabaseType;
          i++;
          break;
        case '--to':
        case '-t':
          options.to = nextArg as DatabaseType;
          i++;
          break;
        case '--backup':
        case '-b':
          options.backup = true;
          break;
        case '--validate':
        case '-v':
          options.validate = true;
          break;
        case '--list':
        case '-l':
          options.list = true;
          break;
        case '--help':
        case '-h':
          options.help = true;
          break;
      }
    }

    return options;
  }

  private async performMigration(options: CLIOptions): Promise<void> {
    console.log('🚀 Cross-Database Migration Tool');
    console.log('================================');
    console.log(`👤 User ID: ${options.userId}`);
    console.log(`📤 From: ${options.from}`);
    console.log(`📥 To: ${options.to}`);
    console.log(`💾 Backup: ${options.backup ? 'Yes' : 'No'}`);
    console.log(`✅ Validate: ${options.validate ? 'Yes' : 'No'}`);
    console.log('');

    try {
      const result = await this.migrationService.quickMigrate(
        options.userId!,
        options.from!,
        options.to!
      );

      if (result.success) {
        console.log('✅ Migration completed successfully!');
        console.log(`📊 Records migrated: ${result.recordsMigrated}`);
        console.log(`⏱️  Duration: ${result.duration}ms`);
        
        if (result.backupPath) {
          console.log(`💾 Backup saved: ${result.backupPath}`);
        }

        if (result.warnings.length > 0) {
          console.log('\n⚠️  Warnings:');
          result.warnings.forEach(warning => console.log(`   - ${warning}`));
        }

        // Update user preference
        DatabaseConfigManager.setUserPreference(options.userId!, options.to!);
        
      } else {
        console.log('❌ Migration failed!');
        console.log('\n🚨 Errors:');
        result.errors.forEach(error => console.log(`   - ${error}`));
        process.exit(1);
      }

    } catch (error) {
      console.error('💥 Migration crashed:', error);
      process.exit(1);
    }
  }

  private async listAvailableDatabases(): Promise<void> {
    console.log('📋 Available Database Types');
    console.log('==========================');

    const availableTypes = DatabaseConfigManager.getAvailableDatabaseTypes();
    const runtimeConfig = DatabaseConfigManager.getRuntimeConfig();

    console.log(`Current default: ${runtimeConfig.currentType}`);
    console.log(`Can switch: ${runtimeConfig.canSwitch ? 'Yes' : 'No'}`);
    console.log(`Fallback enabled: ${runtimeConfig.fallbackEnabled ? 'Yes' : 'No'}`);
    console.log('');

    for (const dbType of availableTypes) {
      const isAvailable = await DatabaseConfigManager.isDatabaseTypeAvailable(dbType);
      const status = isAvailable ? '✅' : '❌';
      const current = dbType === runtimeConfig.currentType ? ' (current)' : '';
      
      console.log(`${status} ${dbType}${current}`);
    }
  }

  private showHelp(): void {
    console.log(`
🚀 Cross-Database Migration Tool
===============================

USAGE:
  npm run migrate [OPTIONS]

OPTIONS:
  -u, --user-id <id>     User ID to migrate (required)
  -f, --from <type>      Source database type (sqlite|postgres)
  -t, --to <type>        Target database type (sqlite|postgres)
  -b, --backup           Create backup before migration
  -v, --validate         Validate migration after completion
  -l, --list             List available database types
  -h, --help             Show this help message

EXAMPLES:
  # Migrate user from SQLite to PostgreSQL
  npm run migrate -u user123 -f sqlite -t postgres -b -v

  # List available databases
  npm run migrate --list

  # Quick migration without backup
  npm run migrate -u user456 -f postgres -t sqlite

ENVIRONMENT VARIABLES:
  DB_TYPE                Default database type
  DATABASE_URL           PostgreSQL connection string
  DB_PATH                SQLite database file path
  ENABLE_DB_FALLBACK     Enable automatic fallback (true/false)
`);
  }
}

// CLI entry point
if (require.main === module) {
  const cli = new MigrationCLI();
  cli.run(process.argv.slice(2)).catch(error => {
    console.error('CLI Error:', error);
    process.exit(1);
  });
}