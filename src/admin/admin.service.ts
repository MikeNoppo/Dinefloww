import { Injectable, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role, User, status } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { WaiterService } from '../waiter/waiter.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waiterService: WaiterService,
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
      }      throw error;
    }
  }

  async getDashboardStats() {
    // Total Revenue
    const totalRevenueResult = await this.prisma.order.aggregate({
      _sum: { totalAmount: true },
    });
    const totalRevenue = totalRevenueResult._sum.totalAmount || 0;

    // Total Orders
    const totalOrders = await this.prisma.order.count();

    // Active Tables (Occupied)
    const activeTables = await this.prisma.table.count({ where: { status: 'Occupied' } });
    const totalTables = await this.prisma.table.count();

    // Staff Members
    const staffRoles: Role[] = [Role.WAITER, Role.CHEF];
    const staffMembers = await this.prisma.user.count({ where: { role: { in: staffRoles } } });

    // Recent Orders (limit 4)
    const allOrders = await this.waiterService.findAllOrders();
    const recentOrders = allOrders.slice(0, 4).map(order => ({
      ...order,
      totalAmount: typeof order.totalAmount === 'object' && order.totalAmount !== null && typeof order.totalAmount.toNumber === 'function'
        ? order.totalAmount.toNumber()
        : order.totalAmount,
    }));

    return {
      totalRevenue,
      totalOrders,
      activeTables,
      totalTables,
      staffMembers,
      recentOrders,
    };
  }
}
