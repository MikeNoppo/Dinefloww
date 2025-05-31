import { Controller, Post, Body, UseGuards, Get, Param, Patch, Delete, UploadedFile, UseInterceptors, ParseFilePipe, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MenuService } from './menu.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // Admin endpoints for menu management
  @Post('item')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('imageFile'))
  async createMenuItem(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [],
        fileIsRequired: false,
      }),
    )
    imageFile?: Express.Multer.File,
  ) {
    return this.menuService.createMenuItem(createMenuItemDto, imageFile);
  }

  @Get('items')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  findAllMenuItems() {
    return this.menuService.findAllMenuItems();
  }

  @Get('item/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async findOneMenuItem(@Param('id') id: string) {
    const menuItem = await this.menuService.findOneMenuItem(id);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found.`);
    }
    return menuItem;
  }

  @Patch('item/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @UseInterceptors(FileInterceptor('imageFile'))
  async updateMenuItem(
    @Param('id') id: string,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [],
        fileIsRequired: false,
      }),
    )
    imageFile?: Express.Multer.File,
  ) {
    return this.menuService.updateMenuItem(id, updateMenuItemDto, imageFile);
  }

  @Delete('item/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeMenuItem(@Param('id') id: string) {
    return this.menuService.removeMenuItem(id);
  }

  // Public endpoints for viewing menu (can be accessed by waiters, chefs, etc.)
  @Get('public/items')
  async getPublicMenuItems() {
    return this.menuService.findAllMenuItems();
  }

  @Get('public/item/:id')
  async getPublicMenuItem(@Param('id') id: string) {
    const menuItem = await this.menuService.findOneMenuItem(id);
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found.`);
    }
    return menuItem;
  }
}
