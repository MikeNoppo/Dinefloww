import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Import PrismaModule
import { SupabaseModule } from '../supabase/supabase.module'; // Import SupabaseModule

@Module({
  imports: [PrismaModule, SupabaseModule], 
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
