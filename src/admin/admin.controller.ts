import { Controller, Post, Body, UseGuards, Get, Param, Patch, Delete, Req, UploadedFile, UseInterceptors, ParseFilePipe, MaxFileSizeValidator, FileTypeValidator } from '@nestjs/common'; 
import { FileInterceptor } from '@nestjs/platform-express'; // Added FileInterceptor
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
  updateUserRole(@Param('id') id: string, @Body() updateUserRoleDto: UpdateUserRoleDto, @UserDecorator('id') currentUserId: string) {
    return this.adminService.updateUserRole(id, updateUserRoleDto, currentUserId);
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
  @UseInterceptors(FileInterceptor('imageFile')) // Added FileInterceptor for image upload
  async createMenuItem(
    @Body() createMenuItemDto: CreateMenuItemDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // new MaxFileSizeValidator({ maxSize: 1024 * 1024 * 5 }), // Example: 5MB limit
          // new FileTypeValidator({ fileType: 'image/(jpeg|png|jpg)' }), // Example: only jpeg/png
        ],
        fileIsRequired: false, // Make file optional
      }),
    )
    imageFile?: Express.Multer.File, // Make imageFile optional
  ) {
    return this.adminService.createMenuItem(createMenuItemDto, imageFile);
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
