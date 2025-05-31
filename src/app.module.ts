import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';
import { ChefModule } from './chef/chef.module';
import { WaiterModule } from './waiter/waiter.module';
import { MenuModule } from './menu/menu.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    AdminModule,
    PrismaModule,
    ChefModule,
    WaiterModule,
    MenuModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
