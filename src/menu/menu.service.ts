import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { MenuItem } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { MenuStatus } from '@prisma/client';

@Injectable()
export class MenuService {
  constructor(private readonly prisma: PrismaService) {}  async createMenuItem(createMenuItemDto: CreateMenuItemDto, imageFile?: Express.Multer.File): Promise<MenuItem> {
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
    }    // Convert availableForOrdering to MenuStatus
    let isAvailable = false;
    if (typeof createMenuItemDto.availableForOrdering === 'string') {
      isAvailable = createMenuItemDto.availableForOrdering === 'true';
    } else if (typeof createMenuItemDto.availableForOrdering === 'boolean') {
      isAvailable = createMenuItemDto.availableForOrdering;
    }    
    const menuStatus = isAvailable ? MenuStatus.AVAILABLE : MenuStatus.UNAVAILABLE;

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
          }        } catch (err) {
          // Failed to delete old image, but continue with upload
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
    }    // Convert availableForOrdering to MenuStatus if present
    let status = menuItem.status;
    if (typeof (updateMenuItemDto as any).availableForOrdering !== 'undefined') {
      const availableValue = (updateMenuItemDto as any).availableForOrdering;
      
      // Handle both string and boolean values
      let isAvailable = false;
      if (typeof availableValue === 'string') {
        isAvailable = availableValue === 'true';
      } else if (typeof availableValue === 'boolean') {
        isAvailable = availableValue;
      }
      
      status = isAvailable ? MenuStatus.AVAILABLE : MenuStatus.UNAVAILABLE;
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
        try {          // Validate imageUrl format
          if (typeof menuItem.imageUrl !== 'string' || !menuItem.imageUrl.includes('/uploads/menu-images/')) {
            // Invalid image URL format, skip deletion
          } else {
            // Extract filename from the imageUrl (e.g., "/uploads/menu-images/filename.jpg" -> "filename.jpg")
            const filename = path.basename(menuItem.imageUrl);
              // Validate filename
            if (!filename || filename === '.' || filename === '..') {
              // Invalid filename, skip deletion
            } else {
              const imagePath = path.join(process.cwd(), 'public', 'uploads', 'menu-images', filename);
              
              // Additional security check to ensure we're only deleting files in the correct directory
              const normalizedPath = path.normalize(imagePath);
              const expectedDir = path.normalize(path.join(process.cwd(), 'public', 'uploads', 'menu-images'));
                if (!normalizedPath.startsWith(expectedDir)) {
                // Security violation: skip deletion
              } else {
                // Check if file exists before attempting to delete
                if (fs.existsSync(imagePath)) {
                  // Check if it's a file (not a directory)
                  const stats = fs.statSync(imagePath);                  if (stats.isFile()) {
                    fs.unlinkSync(imagePath);
                    imageDeleted = true;
                  } else {
                    // Path is not a file
                  }
                } else {
                  // Image file not found
                }
              }
            }
          }        } catch (fileError) {
          // File deletion error but don't stop the deletion process
        }
      }      // Delete the menu item from database
      const deletedMenuItem = await this.prisma.menuItem.delete({
        where: { id: id.trim() },
      });

      return deletedMenuItem;

    } catch (error) {
      // Handle specific Prisma errors
      if (error.code === 'P2025') {
        throw new NotFoundException(`Menu item with ID ${id} not found.`);
      }
        // Handle database connection errors
      if (error.code === 'P1001') {
        throw new Error('Database connection failed. Please try again later.');
      }

      // Handle foreign key constraint errors (if menu item is referenced elsewhere)
      if (error.code === 'P2003') {
        throw new ConflictException('Cannot delete menu item as it is referenced by existing orders. Please contact administrator.');
      }      // Handle transaction errors
      if (error.code === 'P2034') {
        throw new Error('Transaction conflict occurred. Please try again.');
      }

      // Re-throw NotFoundException and ConflictException as-is
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }

      // For any other unexpected errors, throw a generic error message
      throw new Error('An unexpected error occurred while deleting the menu item. Please try again or contact support.');
    }
  }
}
