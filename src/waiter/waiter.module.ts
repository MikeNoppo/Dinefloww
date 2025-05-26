import { Module } from '@nestjs/common';
import { WaiterService } from './waiter.service';
import { WaiterController } from './waiter.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [WaiterController],
  providers: [WaiterService],
})
export class WaiterModule {}
