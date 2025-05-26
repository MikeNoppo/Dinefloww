import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChefModule } from './chef/chef.module';
import { WaiterModule } from './waiter/waiter.module';

@Module({
  imports: [AuthModule, AdminModule, PrismaModule, ChefModule, WaiterModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
