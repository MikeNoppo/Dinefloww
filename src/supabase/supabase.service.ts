import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase URL and Anon Key must be provided in .env');
    }

    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async uploadFile(file: Express.Multer.File, bucket: string, path?: string): Promise<string> {
    const filePath = path ? `${path}/${file.originalname}` : file.originalname;
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true,
      });

    if (error) {
      throw new Error(`Supabase storage error: ${error.message}`);
    }

    // Construct the public URL manually
    // Note: This might need adjustment based on your Supabase storage settings (e.g., if RLS is enabled or if it's a private bucket)
    const publicUrl = `${this.configService.get<string>('SUPABASE_URL')}/storage/v1/object/public/${bucket}/${data.path}`;
    return publicUrl;
  }

  async testBucketConnection(bucket: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase.storage.from(bucket).list();
      if (error) {
        console.error('Error connecting to bucket:', error.message);
        throw new Error(`Supabase storage error while listing files: ${error.message}`);
      }
      console.log(`Successfully connected to bucket "${bucket}". Files:`, data);
      return true;
    } catch (err) {
      console.error('Failed to connect or list files from bucket:', err);
      return false;
    }
  }
}
