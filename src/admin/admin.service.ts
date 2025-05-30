import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common'; // Added ForbiddenException
import { Role, User, status } from '@prisma/client'; // Changed Status to status
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MenuItem } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { MenuStatus } from '@prisma/client'; 

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    try {
      return await this.prisma.user.create({
        data: {
          username: createUserDto.username,
          password: hashedPassword,
          role: createUserDto.role,
          name: createUserDto.name,
          status: status.INACTIVE,
        },
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        throw new ConflictException('Username already exists.');
      }
      throw error;
    }
  }

  async findAllUsers(): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany();
    return users.map(({ password, ...user }) => user);
  }

  async findOneUser(id: string): Promise<Omit<User, 'password'> | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    const { password, ...result } = user;
    return result;
  }

  async updateUserRole(id: string, updateUserRoleDto: UpdateUserRoleDto, currentUserId: string): Promise<Omit<User, 'password'>> {
    if (id === currentUserId) {
      throw new ForbiddenException('Admins cannot change their own role.');
    }
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: { role: updateUserRoleDto.role },
      });
      const { password, ...result } = updatedUser;
      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      throw error;
    }
  }

  async removeUser(id: string, currentUserId: string): Promise<Omit<User, 'password'>> {
    if (id === currentUserId) {
      throw new ForbiddenException('Admins cannot delete their own account.');
    }
    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id },
      });
      const { password, ...result } = deletedUser;
      return result;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      throw error;
    }
  }

  async createMenuItem(createMenuItemDto: CreateMenuItemDto, imageFile?: Express.Multer.File): Promise<MenuItem> {
    let imageUrl: string | undefined = undefined;
    if (imageFile) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'menu-images');
      // Ensure the upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      // Generate a unique filename (e.g., timestamp-originalName)
      const uniqueFileName = `${Date.now()}-${imageFile.originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, uniqueFileName);

      // Save the file
      fs.writeFileSync(filePath, imageFile.buffer);

      // Set the imageUrl to be stored in the database (web-accessible path)
      // Assuming your static assets are served from a 'public' directory and accessible via '/uploads' route
      imageUrl = `/uploads/menu-images/${uniqueFileName}`;
    }

    // Convert availableForOrdering to MenuStatus
    const menuStatus = createMenuItemDto.availableForOrdering ? MenuStatus.AVAILABLE : MenuStatus.UNAVAILABLE;

    try {
      return await this.prisma.menuItem.create({
        data: {
          name: createMenuItemDto.name,
          category: createMenuItemDto.category,
          price: createMenuItemDto.price,
          description: createMenuItemDto.description,
          status: menuStatus, 
          imageUrl: imageUrl, 
        },
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new ConflictException('Menu item with this name already exists. Please use a unique name.');
      }
      throw error;
    }
  }

  async findAllMenuItems(): Promise<MenuItem[]> {
    return this.prisma.menuItem.findMany();
  }

  async findOneMenuItem(id: string): Promise<MenuItem | null> {
    return this.prisma.menuItem.findUnique({
      where: { id },
    });
  }  async updateMenuItem(id: string, updateMenuItemDto: UpdateMenuItemDto, imageFile?: Express.Multer.File): Promise<MenuItem> {
    // Fetch the current menu item
    const menuItem = await this.prisma.menuItem.findUnique({ where: { id } });
    if (!menuItem) {
      throw new NotFoundException(`Menu item with ID ${id} not found.`);
    }

    let imageUrl = menuItem.imageUrl;

    // If a new image is uploaded, delete the old image and save the new one
    if (imageFile) {
      // Delete old image if exists
      if (menuItem.imageUrl) {
        try {
          const oldFilename = path.basename(menuItem.imageUrl);
          const oldImagePath = path.join(process.cwd(), 'public', 'uploads', 'menu-images', oldFilename);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        } catch (err) {
          console.error('Failed to delete old image:', err.message);
        }
      }
      // Save new image
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'menu-images');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const uniqueFileName = `${Date.now()}-${imageFile.originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadDir, uniqueFileName);
      fs.writeFileSync(filePath, imageFile.buffer);
      imageUrl = `/uploads/menu-images/${uniqueFileName}`;
    }

    // Convert availableForOrdering to MenuStatus if present
    let status = menuItem.status;
    if (typeof (updateMenuItemDto as any).availableForOrdering !== 'undefined') {
      status = (updateMenuItemDto as any).availableForOrdering ? MenuStatus.AVAILABLE : MenuStatus.UNAVAILABLE;
    }

    // Prepare update data
    const updateData: any = {
      ...updateMenuItemDto,
      imageUrl,
      status,
    };
    // Remove availableForOrdering if present
    delete updateData.availableForOrdering;

    try {
      return await this.prisma.menuItem.update({
        where: { id },
        data: updateData,
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('name')) {
        throw new ConflictException('Menu item with this name already exists. Please use a unique name.');
      }
      throw error;
    }
  }
  async removeMenuItem(id: string): Promise<MenuItem> {
    // Validate input parameter
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new NotFoundException('Invalid menu item ID provided.');
    }

    let menuItem: MenuItem | null = null;
    let imageDeleted = false;

    try {
      // First, fetch the menu item to get the image URL
      menuItem = await this.prisma.menuItem.findUnique({
        where: { id: id.trim() },
      });

      if (!menuItem) {
        throw new NotFoundException(`Menu item with ID ${id} not found.`);
      }

      // Delete the associated image file if it exists
      if (menuItem.imageUrl) {
        try {
          // Validate imageUrl format
          if (typeof menuItem.imageUrl !== 'string' || !menuItem.imageUrl.includes('/uploads/menu-images/')) {
            console.warn(`Invalid image URL format for menu item ${id}: ${menuItem.imageUrl}`);
          } else {
            // Extract filename from the imageUrl (e.g., "/uploads/menu-images/filename.jpg" -> "filename.jpg")
            const filename = path.basename(menuItem.imageUrl);
            
            // Validate filename
            if (!filename || filename === '.' || filename === '..') {
              console.warn(`Invalid filename extracted from URL: ${menuItem.imageUrl}`);
            } else {
              const imagePath = path.join(process.cwd(), 'public', 'uploads', 'menu-images', filename);
              
              // Additional security check to ensure we're only deleting files in the correct directory
              const normalizedPath = path.normalize(imagePath);
              const expectedDir = path.normalize(path.join(process.cwd(), 'public', 'uploads', 'menu-images'));
              
              if (!normalizedPath.startsWith(expectedDir)) {
                console.error(`Security violation: Attempted to delete file outside of uploads directory: ${normalizedPath}`);
              } else {
                // Check if file exists before attempting to delete
                if (fs.existsSync(imagePath)) {
                  // Check if it's a file (not a directory)
                  const stats = fs.statSync(imagePath);
                  if (stats.isFile()) {
                    fs.unlinkSync(imagePath);
                    imageDeleted = true;
                    console.log(`Successfully deleted image file: ${filename}`);
                  } else {
                    console.warn(`Path is not a file: ${imagePath}`);
                  }
                } else {
                  console.warn(`Image file not found: ${filename} at path: ${imagePath}`);
                }
              }
            }
          }
        } catch (fileError) {
          // Log detailed file deletion error but don't stop the deletion process
          console.error(`Failed to delete image file for menu item ${id}:`, {
            error: fileError.message,
            imageUrl: menuItem.imageUrl,
            stack: fileError.stack
          });
        }
      }

      // Delete the menu item from database
      const deletedMenuItem = await this.prisma.menuItem.delete({
        where: { id: id.trim() },
      });

      // Log successful deletion
      console.log(`Menu item deleted successfully:`, {
        id: deletedMenuItem.id,
        name: deletedMenuItem.name,
        imageDeleted: imageDeleted,
        hadImage: !!menuItem.imageUrl
      });

      return deletedMenuItem;

    } catch (error) {
      // Handle specific Prisma errors
      if (error.code === 'P2025') {
        throw new NotFoundException(`Menu item with ID ${id} not found.`);
      }
      
      // Handle database connection errors
      if (error.code === 'P1001') {
        console.error('Database connection error during menu item deletion:', error.message);
        throw new Error('Database connection failed. Please try again later.');
      }

      // Handle foreign key constraint errors (if menu item is referenced elsewhere)
      if (error.code === 'P2003') {
        console.error('Foreign key constraint error during menu item deletion:', error.message);
        throw new ConflictException('Cannot delete menu item as it is referenced by existing orders. Please contact administrator.');
      }

      // Handle transaction errors
      if (error.code === 'P2034') {
        console.error('Transaction conflict during menu item deletion:', error.message);
        throw new Error('Transaction conflict occurred. Please try again.');
      }

      // Log unexpected errors with full context
      console.error('Unexpected error during menu item deletion:', {
        menuItemId: id,
        errorCode: error.code,
        errorMessage: error.message,
        stack: error.stack,
        menuItemFound: !!menuItem,
        imageUrl: menuItem?.imageUrl
      });

      // Re-throw NotFoundException and ConflictException as-is
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      // For any other unexpected errors, throw a generic error message
      throw new Error('An unexpected error occurred while deleting the menu item. Please try again or contact support.');
    }
  }
}
