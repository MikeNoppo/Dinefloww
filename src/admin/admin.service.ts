import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { MenuItem } from '@prisma/client';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private prismaClient = new PrismaClient();

  async createUser(createUserDto: CreateUserDto) {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    try {
      return await this.prismaClient.user.create({
        data: {
          username: createUserDto.username,
          password: hashedPassword,
          role: createUserDto.role,
          name: createUserDto.name,
        },
      });
    } catch (error) {
      if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
        throw new ConflictException('Username already exists.');
      }
      throw error;
    }
  }

  async createMenuItem(createMenuItemDto: CreateMenuItemDto): Promise<MenuItem> {
    return this.prisma.menuItem.create({
      data: createMenuItemDto,
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
