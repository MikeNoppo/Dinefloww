import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Order, OrderStatus } from '@prisma/client';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class ChefService {
  constructor(private readonly prisma: PrismaService) {}
  async findAllOrdersForChef(): Promise<Order[]> {
    // Chef can see orders that are IN_QUEUE (pending), IN_PROCESS (cooking), or READY (completed)
    return this.prisma.order.findMany({
      where: {
        OR: [
          { status: OrderStatus.IN_QUEUE }, // Orders sent to kitchen by waiter
          { status: OrderStatus.IN_PROCESS }, // Orders currently being cooked
          { status: OrderStatus.READY }, // Orders ready to be served
        ],
      },
      include: {
        orderItems: {
          include: {
            menuItem: true,
          },
        },
        table: true,
        waiter: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
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

    // Additional validation for status transitions
    if (
      status === OrderStatus.IN_PROCESS &&
      existingOrder.status !== OrderStatus.IN_QUEUE
    ) {
      throw new NotFoundException(
        'Order must be IN_QUEUE to start cooking (IN_PROCESS).',
      );
    }

    if (
      status === OrderStatus.READY &&
      existingOrder.status !== OrderStatus.IN_PROCESS
    ) {
      throw new NotFoundException('Order must be IN_PROCESS to mark as READY.');
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
        waiter: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });
  }
}
