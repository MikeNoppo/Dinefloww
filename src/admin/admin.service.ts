import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common'; // Added ForbiddenException
import { Role, User, status } from '@prisma/client'; // Changed Status to status
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MenuItem } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { SupabaseService } from '../supabase/supabase.service'; // Added SupabaseService

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supabaseService: SupabaseService, // Inject SupabaseService
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
      // Define a bucket name, e.g., 'menu-item-images'
      // You might want to make this configurable
      const bucket = 'menu-images'; 
      imageUrl = await this.supabaseService.uploadFile(imageFile, bucket);
    }

    return this.prisma.menuItem.create({
      data: {
        name: createMenuItemDto.name,
        category: createMenuItemDto.category,
        price: createMenuItemDto.price,
        description: createMenuItemDto.description,
        status: createMenuItemDto.MenuStatus,
        imageUrl: imageUrl, // Save the imageUrl
      },
    });
  }

  async findAllMenuItems(): Promise<MenuItem[]> {
    return this.prisma.menuItem.findMany();
  }

  async findOneMenuItem(id: string): Promise<MenuItem | null> {
    return this.prisma.menuItem.findUnique({
      where: { id },
    });
  }

  async updateMenuItem(id: string, updateMenuItemDto: UpdateMenuItemDto): Promise<MenuItem> {
    return this.prisma.menuItem.update({
      where: { id },
      data: updateMenuItemDto,
    });
  }

  async removeMenuItem(id: string): Promise<MenuItem> {
    return this.prisma.menuItem.delete({
      where: { id },
    });
  }
}
