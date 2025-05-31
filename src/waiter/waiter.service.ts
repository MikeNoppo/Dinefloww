import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Order, OrderStatus, Prisma, User, MenuStatus } from '@prisma/client'; 

@Injectable()
export class WaiterService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(createOrderDto: CreateOrderDto, waiter: User): Promise<Order> {
    const { tableId, items } = createOrderDto;
    const waiterId = waiter.id;

    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });
    if (!table) {
      throw new NotFoundException(`Table with ID "${tableId}" not found.`);
    }
    // Consider adding table status check if needed (e.g., table.status === 'Available')

    let totalAmount = new Prisma.Decimal(0);
    const orderItemsCreateInput: Prisma.OrderItemCreateWithoutOrderInput[] = [];

    for (const itemDto of items) {
      const menuItem = await this.prisma.menuItem.findUnique({
        where: { id: itemDto.menuItemId },
      });
      if (!menuItem) {
        throw new NotFoundException(`MenuItem with ID "${itemDto.menuItemId}" not found.`);
      }
      if (menuItem.status !== MenuStatus.AVAILABLE) { 
        throw new BadRequestException(`MenuItem "${menuItem.name}" is currently not available.`);
      }
      const itemPrice = menuItem.price.mul(itemDto.quantity);
      totalAmount = totalAmount.add(itemPrice);
      orderItemsCreateInput.push({
        quantity: itemDto.quantity,
        priceAtOrder: menuItem.price,
        notes: itemDto.notes,
        menuItem: { // Correct way to connect to an existing MenuItem
          connect: { id: itemDto.menuItemId },
        },
      });
    }

    return this.prisma.order.create({
      data: {
        tableId,
        waiterId,
        totalAmount,
        status: OrderStatus.RECEIVED,
        orderItems: {
          create: orderItemsCreateInput,
        },
      },
      include: {
        orderItems: { include: { menuItem: { select: { name: true } } } },
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
      },
    });
  }

  async processPayment(orderId: string, processPaymentDto: ProcessPaymentDto, waiter: User): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    if (order.isPaid) {
      throw new BadRequestException('Order has already been paid.');
    }

    // Optional: Check if the waiter processing payment is the one who created the order
    if (order.waiterId !== waiter.id) {
      throw new ForbiddenException('You are not authorized to process payment for this order.');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        isPaid: true,
        paymentOption: processPaymentDto.paymentOption,
        paymentTime: new Date(),
        status: OrderStatus.DELIVERED, // Or COMPLETED, adjust as per your defined flow
      },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
        orderItems: { include: { menuItem: { select: { name: true, price: true } } } },
      }
    });
  }

  async getOrderForReceipt(orderId: string, waiter: User): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
        orderItems: {
          include: {
            menuItem: { select: { name: true, price: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    if (order.waiterId !== waiter.id) {
      throw new ForbiddenException('You are not authorized to view this receipt.');
    }
    return order;
  }

  async findAllOrdersByWaiter(waiter: User): Promise<Order[]> {
    return this.prisma.order.findMany({
      where: { waiterId: waiter.id },
      include: {
        table: true,
        orderItems: { include: { menuItem: { select: { name: true } } } },
      },
      orderBy: { orderTime: 'desc' },
    });
  }

  async getOrderDetails(orderId: string, waiter: User): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        table: true,
        waiter: { select: { id: true, name: true, username: true } },
        orderItems: {
          include: {
            menuItem: { select: { id: true, name: true, price: true, category: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID "${orderId}" not found.`);
    }

    if (order.waiterId !== waiter.id) {
      throw new ForbiddenException('You are not authorized to view this order.');
    }
    return order;
  }

  async createTable(tableNumber: number, status: string = 'Available') {
    // Cek apakah tableNumber sudah ada
    const existing = await this.prisma.table.findUnique({ where: { tableNumber } });
    if (existing) {
      throw new BadRequestException(`Table number ${tableNumber} already exists.`);
    }
    return this.prisma.table.create({
      data: { tableNumber, status },
    });
  }

  async getAllTables() {
    return this.prisma.table.findMany({
      orderBy: { tableNumber: 'asc' },
    });
  }


  async getTableDetails(tableNumber: number) {
    // Cari table berdasarkan nomor meja
    const table = await this.prisma.table.findUnique({
      where: { tableNumber },
    });
    if (!table) {
      throw new NotFoundException(`Table number ${tableNumber} not found.`);
    }
    // Cari order aktif (status selain DELIVERED) untuk table ini
    const activeOrder = await this.prisma.order.findFirst({
      where: {
        tableId: table.id,
        status: { not: OrderStatus.DELIVERED },
      },
      orderBy: { orderTime: 'desc' },
      include: {
        orderItems: { include: { menuItem: { select: { name: true, price: true } } } },
        waiter: { select: { id: true, name: true, username: true } },
      },
    });
    return {
      ...table,
      activeOrder,
    };
  }
}
