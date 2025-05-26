import { Controller, Post, Body, UseGuards, Get, Param, Patch, Delete, Req } from '@nestjs/common'; 
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
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
  updateUserRole(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto) {
    return this.adminService.updateUserRole(id, updateUserRoleDto);
  }

  @Delete('user/:id')
  @Roles(Role.ADMIN)
  removeUser(@Param('id') id: string, @UserDecorator('id') currentUserId: string) { // Use User decorator to get current user's ID
    return this.adminService.removeUser(id, currentUserId); // Pass current user's ID
  }

  
  // ----------------------------------------------------------------------------------------------------------------
  // MENU MANAGEMENT
  @Post('menu-item')
  @Roles(Role.ADMIN)
  createMenuItem(@Body() createMenuItemDto: CreateMenuItemDto) {
    return this.adminService.createMenuItem(createMenuItemDto);
  }

  @Get('menu-items')
  @Roles(Role.ADMIN)
  findAllMenuItems() {
    return this.adminService.findAllMenuItems();
  }

  @Get('menu-item/:id')
  @Roles(Role.ADMIN)
  findOneMenuItem(@Param('id') id: string) {
    return this.adminService.findOneMenuItem(id);
  }

  @Patch('menu-item/:id')
  @Roles(Role.ADMIN)
  updateMenuItem(@Param('id') id: string, @Body() updateMenuItemDto: UpdateMenuItemDto) {
    return this.adminService.updateMenuItem(id, updateMenuItemDto);
  }

  @Delete('menu-item/:id')
  @Roles(Role.ADMIN)
  removeMenuItem(@Param('id') id: string) {
    return this.adminService.removeMenuItem(id);
  }
}
