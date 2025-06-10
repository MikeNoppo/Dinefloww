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

  async getSalesChartData(days: number = 7) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const salesByDay = await this.prisma.order.groupBy({
      by: ['createdAt'],
      where: {
        isPaid: true,
        paymentTime: {
          gte: startDate,
          lte: endDate,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    // Group by date (day)
    const chartData = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(endDate.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayData = salesByDay.filter(item => {
        const itemDate = new Date(item.createdAt).toISOString().split('T')[0];
        return itemDate === dateStr;
      });

      const totalRevenue = dayData.reduce((sum, item) => {
        const amount = typeof item._sum.totalAmount === 'object' && item._sum.totalAmount !== null && typeof item._sum.totalAmount.toNumber === 'function'
          ? item._sum.totalAmount.toNumber()
          : Number(item._sum.totalAmount) || 0;
        return sum + amount;
      }, 0);

      const totalOrders = dayData.reduce((sum, item) => sum + item._count.id, 0);

      chartData.push({
        date: dateStr,
        day: date.toLocaleDateString('id-ID', { weekday: 'short' }),
        revenue: totalRevenue,
        orders: totalOrders,
      });
    }

    return chartData;
  }

  async getRevenueAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(today.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(today.getDate() - 30);

    // Today's revenue
    const todayRevenue = await this.prisma.order.aggregate({
      where: {
        isPaid: true,
        paymentTime: {
          gte: today,
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    // Yesterday's revenue
    const yesterdayRevenue = await this.prisma.order.aggregate({
      where: {
        isPaid: true,
        paymentTime: {
          gte: yesterday,
          lt: today,
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    // This week's revenue
    const weekRevenue = await this.prisma.order.aggregate({
      where: {
        isPaid: true,
        paymentTime: {
          gte: weekAgo,
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    // This month's revenue
    const monthRevenue = await this.prisma.order.aggregate({
      where: {
        isPaid: true,
        paymentTime: {
          gte: monthAgo,
        },
      },
      _sum: { totalAmount: true },
      _count: { id: true },
    });

    return {
      today: {
        revenue: Number(todayRevenue._sum.totalAmount) || 0,
        orders: todayRevenue._count.id,
      },
      yesterday: {
        revenue: Number(yesterdayRevenue._sum.totalAmount) || 0,
        orders: yesterdayRevenue._count.id,
      },
      week: {
        revenue: Number(weekRevenue._sum.totalAmount) || 0,
        orders: weekRevenue._count.id,
      },
      month: {
        revenue: Number(monthRevenue._sum.totalAmount) || 0,
        orders: monthRevenue._count.id,
      },
    };
  }

  async getPopularMenuItems(limit: number = 10) {
    const popularItems = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const menuItemsData = await Promise.all(
      popularItems.map(async (item) => {
        const menuItem = await this.prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { name: true, price: true, category: true },
        });

        return {
          name: menuItem?.name || 'Unknown',
          category: menuItem?.category || 'Unknown',
          price: Number(menuItem?.price) || 0,
          totalQuantity: item._sum.quantity || 0,
          orderCount: item._count.id,
        };
      })
    );

    return menuItemsData;
  }

  async getOrderStatusDistribution() {
    const statusDistribution = await this.prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    });

    return statusDistribution.map(item => ({
      status: item.status,
      count: item._count.id,
    }));
  }

  async getHourlyOrderAnalytics() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        isPaid: true,
      },
    });

    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour.toString().padStart(2, '0')}:00`,
      orders: 0,
      revenue: 0,
    }));

    orders.forEach(order => {
      const hour = order.createdAt.getHours();
      hourlyData[hour].orders += 1;
      if (order.isPaid) {
        const amount = typeof order.totalAmount === 'object' && order.totalAmount !== null && typeof order.totalAmount.toNumber === 'function'
          ? order.totalAmount.toNumber()
          : Number(order.totalAmount) || 0;
        hourlyData[hour].revenue += amount;
      }
    });

    return hourlyData;
  }

  async getPaymentMethodAnalytics() {
    const paymentMethods = await this.prisma.order.groupBy({
      by: ['paymentOption'],
      where: {
        isPaid: true,
        paymentOption: {
          not: null,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: {
        id: true,
      },
    });

    return paymentMethods.map(method => ({
      method: method.paymentOption,
      revenue: Number(method._sum.totalAmount) || 0,
      count: method._count.id,
    }));
  }

  async getPopularMenuItemsForDashboard(limit: number = 5) {
    const popularItems = await this.prisma.orderItem.groupBy({
      by: ['menuItemId'],
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: limit,
    });

    const menuItemsData = await Promise.all(
      popularItems.map(async (item) => {
        const menuItem = await this.prisma.menuItem.findUnique({
          where: { id: item.menuItemId },
          select: { 
            id: true,
            name: true, 
            price: true, 
            category: true,
            imageUrl: true,
            status: true
          },
        });

        return {
          id: menuItem?.id || item.menuItemId,
          name: menuItem?.name || 'Unknown',
          category: menuItem?.category || 'Unknown',
          price: Number(menuItem?.price) || 0,
          imageUrl: menuItem?.imageUrl || null,
          status: menuItem?.status || 'UNAVAILABLE',
          totalOrders: item._sum.quantity || 0,
          orderCount: item._count.id,
        };
      })
    );

    return menuItemsData;
  }

  async getMenuAnalytics() {
    // Get all menu items with their order statistics
    const allMenuItems = await this.prisma.menuItem.findMany({
      select: {
        id: true,
        name: true,
        category: true,
        price: true,
        status: true,
        imageUrl: true,
        createdAt: true,
      }
    });

    // Get order statistics for each menu item
    const menuStats = await Promise.all(
      allMenuItems.map(async (menuItem) => {
        const orderStats = await this.prisma.orderItem.aggregate({
          where: {
            menuItemId: menuItem.id,
          },
          _sum: {
            quantity: true,
            priceAtOrder: true,
          },
          _count: {
            id: true,
          },
        });

        const totalQuantity = orderStats._sum.quantity || 0;
        const totalRevenue = Number(orderStats._sum.priceAtOrder) || 0;
        const orderCount = orderStats._count.id || 0;

        return {
          ...menuItem,
          price: Number(menuItem.price),
          analytics: {
            totalQuantitySold: totalQuantity,
            totalRevenue: totalRevenue,
            orderCount: orderCount,
            averageOrderSize: orderCount > 0 ? totalQuantity / orderCount : 0,
          }
        };
      })
    );

    // Sort by total quantity sold (most popular first)
    const sortedStats = menuStats.sort((a, b) => 
      b.analytics.totalQuantitySold - a.analytics.totalQuantitySold
    );

    // Calculate category-wise statistics
    const categoryStats = menuStats.reduce((acc, item) => {
      const category = item.category;
      if (!acc[category]) {
        acc[category] = {
          totalItems: 0,
          totalQuantitySold: 0,
          totalRevenue: 0,
          averagePrice: 0,
        };
      }
      
      acc[category].totalItems += 1;
      acc[category].totalQuantitySold += item.analytics.totalQuantitySold;
      acc[category].totalRevenue += item.analytics.totalRevenue;
      acc[category].averagePrice = (acc[category].averagePrice * (acc[category].totalItems - 1) + item.price) / acc[category].totalItems;
      
      return acc;
    }, {});

    return {
      menuItems: sortedStats,
      categoryStats: categoryStats,
      summary: {
        totalMenuItems: allMenuItems.length,
        totalCategoriesWithSales: Object.keys(categoryStats).length,
        totalQuantitySold: menuStats.reduce((sum, item) => sum + item.analytics.totalQuantitySold, 0),
        totalMenuRevenue: menuStats.reduce((sum, item) => sum + item.analytics.totalRevenue, 0),
      }
    };
  }
  // REPORTS & ANALYTICS METHODS
  async getReportsData(timeRange: 'day' | 'week' | 'month' | 'year' = 'day') {
    const { startDate, endDate } = this.getDateRange(timeRange);

    const [totalSalesResult, totalOrdersCount, uniqueTablesCount] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          isPaid: true,
          paymentTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: { tableId: true },
        distinct: ['tableId'],
      }),
    ]);

    const totalSales = Number(totalSalesResult._sum.totalAmount) || 0;
    const orders = totalOrdersCount;
    const customers = uniqueTablesCount.length; // Using unique tables as proxy for customers
    const averageOrder = orders > 0 ? totalSales / orders : 0;

    return {
      summary: {
        totalSales,
        averageOrder: Math.round(averageOrder * 100) / 100,
        orders,
        customers,
      },
      timeRange,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  async getReportsChartData(timeRange: 'day' | 'week' | 'month' | 'year' = 'day') {
    const { startDate, endDate } = this.getDateRange(timeRange);

    let chartData = [];

    if (timeRange === 'day') {
      // Hourly data for today
      const orders = await this.prisma.order.findMany({
        where: {
          isPaid: true,
          paymentTime: {
            gte: startDate,
            lte: endDate,
          },
        },
        select: {
          paymentTime: true,
          totalAmount: true,
        },
      });

      const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
        period: `${hour.toString().padStart(2, '0')}:00`,
        sales: 0,
        orders: 0,
      }));

      orders.forEach(order => {
        const hour = order.paymentTime.getHours();
        const amount = typeof order.totalAmount === 'object' && order.totalAmount !== null && typeof order.totalAmount.toNumber === 'function'
          ? order.totalAmount.toNumber()
          : Number(order.totalAmount) || 0;
        
        hourlyData[hour].sales += amount;
        hourlyData[hour].orders += 1;
      });

      chartData = hourlyData;
    } else if (timeRange === 'week' || timeRange === 'month') {
      // Daily data for week/month
      const days = timeRange === 'week' ? 7 : 30;
      const dailyData = [];

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const nextDate = new Date(date);
        nextDate.setDate(date.getDate() + 1);

        const dayOrders = await this.prisma.order.aggregate({
          where: {
            isPaid: true,
            paymentTime: {
              gte: date,
              lt: nextDate,
            },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        });

        dailyData.push({
          period: date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }),
          date: date.toISOString().split('T')[0],
          sales: Number(dayOrders._sum.totalAmount) || 0,
          orders: dayOrders._count.id,
        });
      }

      chartData = dailyData;
    } else if (timeRange === 'year') {
      // Monthly data for year
      const monthlyData = [];
      const currentYear = new Date().getFullYear();

      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0, 23, 59, 59, 999);

        const monthOrders = await this.prisma.order.aggregate({
          where: {
            isPaid: true,
            paymentTime: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          _sum: { totalAmount: true },
          _count: { id: true },
        });

        monthlyData.push({
          period: monthStart.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }),
          month: `${currentYear}-${(month + 1).toString().padStart(2, '0')}`,
          sales: Number(monthOrders._sum.totalAmount) || 0,
          orders: monthOrders._count.id,
        });
      }

      chartData = monthlyData;
    }

    return {
      chartData,
      timeRange,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
    };
  }

  private getDateRange(timeRange: 'day' | 'week' | 'month' | 'year') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = new Date(now);

    switch (timeRange) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
    }

    return { startDate, endDate };
  }
}
