import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private supabase: SupabaseClient;
  private supabaseUrl: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!this.supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase configuration. Please set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file',
      );
    }

    this.supabase = createClient(this.supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Get a Supabase client authenticated with a user's JWT token
   * This is needed for RLS policies that check auth.uid()
   */
  getClientWithAuth(accessToken: string): SupabaseClient {
    return createClient(
      this.supabaseUrl,
      this.configService.get<string>('SUPABASE_ANON_KEY'),
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      },
    );
  }

  // Helper methods for common operations
  from(table: string) {
    return this.supabase.from(table);
  }

  auth() {
    return this.supabase.auth;
  }

  storage() {
    return this.supabase.storage;
  }
}
