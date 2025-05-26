import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [AuthModule, AdminModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
