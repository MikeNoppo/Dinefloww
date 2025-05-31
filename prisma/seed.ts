import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const saltRounds = 10; // Or your preferred salt rounds
  const hashedPassword = await bcrypt.hash('admin', saltRounds); // Replace 'adminpassword' with a secure password

  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      name: 'Administrator',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`Created admin user: ${adminUser.username}`);

  // Seed 10 tables
  for (let i = 1; i <= 10; i++) {
    await prisma.table.upsert({
      where: { tableNumber: i },
      update: {},
      create: {
        tableNumber: i,
        status: 'Available',
      },
    });
  }
  console.log('Seeded 10 tables.');

  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
