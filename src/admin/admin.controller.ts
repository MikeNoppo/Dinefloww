import { Controller, Post, Body, UseGuards, Get, Param, Patch, Delete, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { User as UserDecorator } from '../auth/decorators/user.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}


  // USER MANAGEMENT
  @Post('users')
  @Roles(Role.ADMIN)
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

  @Get('users')
  @Roles(Role.ADMIN)
  findAllUsers() {
    return this.adminService.findAllUsers();
  }

  @Get('user/:id')
  @Roles(Role.ADMIN)
  findOneUser(@Param('id') id: string) {
    return this.adminService.findOneUser(id);
  }

  @Patch('user/:id/role')
  @Roles(Role.ADMIN)
  updateUserRole(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto, @UserDecorator('id') currentUserId: string) {
    return this.adminService.updateUserRole(id, updateUserRoleDto, currentUserId);
  }
  @Delete('user/:id')
  @Roles(Role.ADMIN)
  removeUser(@Param('id') id: string, @UserDecorator('id') currentUserId: string) {
    return this.adminService.removeUser(id, currentUserId);
  }

  @Get('dashboard')
  @Roles(Role.ADMIN)
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  // CHART ENDPOINTS
  @Get('charts/sales')
  @Roles(Role.ADMIN)
  async getSalesChart(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days) : 7;
    return this.adminService.getSalesChartData(daysNumber);
  }

  @Get('charts/revenue-analytics')
  @Roles(Role.ADMIN)
  async getRevenueAnalytics() {
    return this.adminService.getRevenueAnalytics();
  }

  @Get('charts/popular-menu')
  @Roles(Role.ADMIN)
  async getPopularMenuItems(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 10;
    return this.adminService.getPopularMenuItems(limitNumber);
  }

  @Get('charts/order-status')
  @Roles(Role.ADMIN)
  async getOrderStatusDistribution() {
    return this.adminService.getOrderStatusDistribution();
  }

  @Get('charts/hourly-orders')
  @Roles(Role.ADMIN)
  async getHourlyOrderAnalytics() {
    return this.adminService.getHourlyOrderAnalytics();
  }

  @Get('charts/payment-methods')
  @Roles(Role.ADMIN)
  async getPaymentMethodAnalytics() {
    return this.adminService.getPaymentMethodAnalytics();
  }

  // DASHBOARD WIDGETS
  @Get('popular-menu-items')
  @Roles(Role.ADMIN)
  async getPopularMenuItemsWidget(@Query('limit') limit?: string) {
    const limitNumber = limit ? parseInt(limit) : 5;
    return this.adminService.getPopularMenuItemsForDashboard(limitNumber);
  }

  @Get('menu-analytics')
  @Roles(Role.ADMIN)
  async getMenuAnalytics() {
    return this.adminService.getMenuAnalytics();
  }

  // REPORTS & ANALYTICS ENDPOINTS
  @Get('reports/summary')
  @Roles(Role.ADMIN)
  async getReportsSummary(@Query('timeRange') timeRange?: 'day' | 'week' | 'month' | 'year') {
    return this.adminService.getReportsData(timeRange || 'day');
  }

  @Get('reports/chart-data')
  @Roles(Role.ADMIN)
  async getReportsChartData(@Query('timeRange') timeRange?: 'day' | 'week' | 'month' | 'year') {
    return this.adminService.getReportsChartData(timeRange || 'day');
  }

}
