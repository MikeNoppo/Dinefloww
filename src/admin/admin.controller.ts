import { Controller, Post, Body, UseGuards, Get, Param, Patch, Delete } from '@nestjs/common';
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
}
