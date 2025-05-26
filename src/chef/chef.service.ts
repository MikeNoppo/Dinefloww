import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class ChefService {
  constructor(private readonly prisma: PrismaService) {}

  async findAllOrdersForChef(): Promise<Order[]> {
    // Chefs might be interested in orders that are RECEIVED or IN_PROCESS
    return this.prisma.order.findMany({
      where: {
        OR: [
          { status: OrderStatus.RECEIVED },
          { status: OrderStatus.IN_PROCESS },
        ],
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
      orderBy: {
        orderTime: 'asc', // Show oldest orders first
      },
    });
  }

  async findOneOrder(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
  }

  async updateOrderStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const { status } = updateOrderStatusDto;

    // First, check if the order exists
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }

    // Chef can only update to IN_PROCESS or READY
    if (status !== OrderStatus.IN_PROCESS && status !== OrderStatus.READY) {
      throw new NotFoundException(
        'Invalid status. Chef can only update to IN_PROCESS or READY.',
      );
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });
  }
}
