import { Module } from '@nestjs/common';
import { ChefService } from './chef.service';
import { ChefController } from './chef.controller';

@Module({
  controllers: [ChefController],
  providers: [ChefService],
})
export class ChefModule {}
