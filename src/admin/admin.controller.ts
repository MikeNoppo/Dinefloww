import { Controller, Post, Body, UseGuards, Get, Param, Patch, Delete } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('user')
  @Roles(Role.ADMIN)
  createUser(@Body() createUserDto: CreateUserDto) {
    return this.adminService.createUser(createUserDto);
  }

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
