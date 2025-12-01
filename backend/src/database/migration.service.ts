import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MigrationService implements OnModuleInit {
  private readonly logger = new Logger(MigrationService.name);

  constructor(
    private supabaseService: SupabaseService,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    const autoMigrate =
      this.configService.get<string>('AUTO_MIGRATE') === 'true';

    if (autoMigrate) {
      this.logger.log('Auto-migration enabled, running migrations...');
      await this.runMigrations();
    } else {
      this.logger.log(
        'Auto-migration disabled. Use SUPABASE CLI: npm run db:push',
      );
    }
  }

  async runMigrations() {
    try {
      const migrationsDir = path.join(__dirname, '../../supabase/migrations');
      if (!fs.existsSync(migrationsDir)) {
        this.logger.warn(`Migrations directory not found: ${migrationsDir}`);
        return;
      }

      const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort();

      this.logger.log(`Found ${migrationFiles.length} migration files`);

      for (const file of migrationFiles) {
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        this.logger.log(`Running migration: ${file}`);

        // Check if migration has already been run
        const { data: existing } = await this.supabaseService
          .from('schema_migrations')
          .select('version')
          .eq('version', file.replace('.sql', ''))
          .single();

        if (existing) {
          this.logger.log(`Migration ${file} already applied, skipping`);
          continue;
        }

        const { error } = await this.supabaseService
          .getClient()
          .rpc('exec_sql', {
            sql_query: sql,
          });

        if (error) {
          // If exec_sql doesn't exist, try direct execution
          // Note: This requires the service role key for raw SQL execution
          this.logger.warn(
            `Could not run migration via RPC. Please use Supabase CLI: npm run db:push`,
          );
          this.logger.warn(`Migration file: ${file}`);
          continue;
        }

        // Record migration
        await this.supabaseService.from('schema_migrations').insert({
          version: file.replace('.sql', ''),
          name: file,
        });

        this.logger.log(`✓ Migration ${file} completed`);
      }
    } catch (error) {
      this.logger.error('Error running migrations:', error);
      this.logger.warn('Please run migrations manually using: npm run db:push');
    }
  }
}
