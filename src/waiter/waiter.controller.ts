import { Controller, Post, Body, UseGuards, Param, Get, NotFoundException } from '@nestjs/common';
import { WaiterService } from './waiter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User as PrismaUser } from '@prisma/client'; // Renamed User to PrismaUser to avoid conflict
import { CreateOrderDto } from './dto/create-order.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { User } from '../auth/decorators/user.decorator'; // Corrected import to use User decorator

@Controller('waiter')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WaiterController {
  constructor(private readonly waiterService: WaiterService) {}

  @Post('order')
  @Roles(Role.WAITER)
  async createOrder(@Body() createOrderDto: CreateOrderDto, @User() user: PrismaUser) { // Use PrismaUser type
    return this.waiterService.createOrder(createOrderDto, user);
  }

  @Post('order/:id/pay')
  @Roles(Role.WAITER)
  async processPayment(
    @Param('id') orderId: string,
    @Body() processPaymentDto: ProcessPaymentDto,
    @User() user: PrismaUser, // Use PrismaUser type
  ) {
    return this.waiterService.processPayment(orderId, processPaymentDto, user);
  }

  @Get('order/:id/receipt')
  @Roles(Role.WAITER)
  async getReceipt(@Param('id') orderId: string, @User() user: PrismaUser) { // Use PrismaUser type
    const receipt = await this.waiterService.getOrderForReceipt(orderId, user);
    if (!receipt) {
      throw new NotFoundException(`Receipt for order ID "${orderId}" not found or not accessible.`);
    }
    // In a real application, you might format this data or generate a PDF.
    // For now, we return the order data suitable for a receipt.
    return receipt;
  }

  @Get('orders')
  @Roles(Role.WAITER)
  async getMyOrders(@User() user: PrismaUser) { // Use PrismaUser type
    return this.waiterService.findAllOrdersByWaiter(user);
  }

  @Get('order/:id')
  @Roles(Role.WAITER)
  async getMyOrderDetails(@Param('id') orderId: string, @User() user: PrismaUser) { // Use PrismaUser type
    const order = await this.waiterService.getOrderDetails(orderId, user);
    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found or not accessible.`);
    }
    return order;
  }
}
