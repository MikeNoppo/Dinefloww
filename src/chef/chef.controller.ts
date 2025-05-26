import { Controller, Get, Param, Patch, Body, UseGuards, NotFoundException } from '@nestjs/common';
import { ChefService } from './chef.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('chef')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChefController {
  constructor(private readonly chefService: ChefService) {}

  @Get('orders')
  @Roles(Role.CHEF)
  async findAllOrdersForChef() {
    return this.chefService.findAllOrdersForChef();
  }

  @Get('order/:id')
  @Roles(Role.CHEF)
  async findOneOrder(@Param('id') id: string) {
    const order = await this.chefService.findOneOrder(id);
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
  }

  @Patch('order/:id/status')
  @Roles(Role.CHEF)
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
  ) {
    return this.chefService.updateOrderStatus(id, updateOrderStatusDto);
  }
}
