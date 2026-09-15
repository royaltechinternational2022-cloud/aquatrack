import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("Admin@123", 10);
  const employeePassword = await bcrypt.hash("Employee@123", 10);

  await prisma.user.upsert({
    where: { username: "owner" },
    update: {},
    create: {
      name: "Owner",
      username: "owner",
      role: "ADMIN",
      passwordHash: adminPassword,
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { username: "employee1" },
    update: {},
    create: {
      name: "Employee 1",
      username: "employee1",
      role: "EMPLOYEE",
      employeeCode: "EMP001",
      passwordHash: employeePassword,
      status: "ACTIVE",
    },
  });

  await prisma.user.upsert({
    where: { username: "employee2" },
    update: {},
    create: {
      name: "Employee 2",
      username: "employee2",
      role: "EMPLOYEE",
      employeeCode: "EMP002",
      passwordHash: employeePassword,
      status: "ACTIVE",
    },
  });

  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  await prisma.reportSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "owner" } });
  const existingPricing = await prisma.pricingSetting.findFirst();
  if (!existingPricing) {
    await prisma.pricingSetting.create({
      data: { pricingMode: "MANUAL", updatedById: admin.id },
    });
  }

  console.log("Seed complete.");
  console.log("  Admin login:     owner / Admin@123");
  console.log("  Employee 1 login: employee1 / Employee@123");
  console.log("  Employee 2 login: employee2 / Employee@123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
