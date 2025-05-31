import { Controller, Post, Body, UseGuards, Param, Get, NotFoundException, Patch } from '@nestjs/common';
import { WaiterService } from './waiter.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, User as PrismaUser } from '@prisma/client'; 
import { CreateOrderDto } from './dto/create-order.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { User } from '../auth/decorators/user.decorator'; 

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
    return receipt;
  }

  @Get('orders')
  @Roles(Role.WAITER)
  async getAllOrders() {
    return this.waiterService.findAllOrders();
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

  @Patch('order/:id/status')
  @Roles(Role.WAITER)
  async updateOrderStatusByWaiter(
    @Param('id') orderId: string,
    @Body('action') action: 'send_to_kitchen' | 'served' | 'proceed_payment',
    @User() user: PrismaUser,
  ) {
    return this.waiterService.updateOrderStatusByWaiter(orderId, action, user);
  }

  @Get('tables')
  @Roles(Role.WAITER)
  async getAllTables() {
    return this.waiterService.getAllTables();
  }

  @Post('table')
  @Roles(Role.WAITER)
  async createTable(@Body('tableNumber') tableNumber: number, @Body('status') status?: string) {
    return this.waiterService.createTable(tableNumber, status);
  }

  @Get('table/:tableNumber')
  @Roles(Role.WAITER)
  async getTableDetails(@Param('tableNumber') tableNumber: string) {
    const num = parseInt(tableNumber, 10);
    if (isNaN(num)) {
      throw new NotFoundException('Invalid table number');
    }
    return this.waiterService.getTableDetails(num);
  }

  @Get('dashboard-stats')
  @Roles(Role.WAITER)
  async getDashboardStats(@User() user: PrismaUser) {
  return this.waiterService.getWaiterDashboardStats(user);
  }

  @Patch('order/:id/complete-payment')
  @Roles(Role.WAITER)
  async completePayment(
    @Param('id') orderId: string,
    @Body('paymentOption') paymentOption: 'CASH' | 'CARD' | 'QRIS',
    @User() user: PrismaUser,
  ) {
    return this.waiterService.completePayment(orderId, paymentOption, user);
  }

}