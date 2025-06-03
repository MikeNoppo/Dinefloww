import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { PrismaModule } from '../prisma/prisma.module'; 
import { WaiterModule } from '../waiter/waiter.module';
import { WaiterService } from '../waiter/waiter.service';

@Module({
  imports: [PrismaModule, WaiterModule], 
  controllers: [AdminController],
  providers: [AdminService, WaiterService],
})
export class AdminModule {}
