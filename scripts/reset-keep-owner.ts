/**
 * Clears business data and keeps one admin account plus app settings.
 *
 * Removes: every other user, all sales, audit logs, meter readings, email logs.
 * Keeps:   the named admin, AppSettings, ReportSettings, PricingSetting.
 *
 * Without --confirm it changes nothing and only prints what would be removed.
 *
 *   npx tsx --env-file=.env.live scripts/reset-keep-owner.ts
 *   npx tsx --env-file=.env.live scripts/reset-keep-owner.ts --keep=owner
 *   npx tsx --env-file=.env.live scripts/reset-keep-owner.ts --keep=owner --confirm
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function describeTarget() {
  try {
    const url = new URL(process.env.DATABASE_URL ?? "");
    return `${url.hostname}${url.pathname}`;
  } catch {
    return "(DATABASE_URL is missing or invalid)";
  }
}

async function main() {
  const args = process.argv.slice(2);
  const keep = args.find((a) => a.startsWith("--keep="))?.slice("--keep=".length).toLowerCase();
  const confirm = args.includes("--confirm");

  console.log(`Database: ${describeTarget()}\n`);

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, name: true, role: true },
  });
  console.log("Users:");
  for (const u of users) console.log(`  ${u.role.padEnd(8)} ${u.username} (${u.name})`);

  const counts = {
    sales: await prisma.sale.count(),
    auditLogs: await prisma.auditLog.count(),
    meterReadings: await prisma.meterReading.count(),
    emailLogs: await prisma.emailLog.count(),
  };
  console.log("\nRecords:", counts);

  if (!keep) {
    console.log("\nNothing changed. Choose the admin to keep with --keep=<username>.");
    return;
  }

  const owner = users.find((u) => u.username === keep);
  if (!owner || owner.role !== "ADMIN") {
    console.error(`\nNothing changed: "${keep}" is not an admin account in this database.`);
    process.exitCode = 1;
    return;
  }

  const removeCount = users.length - 1;
  console.log(`\nKeeps ${owner.username}. Removes ${removeCount} other user(s) and all records listed above.`);

  if (!confirm) {
    console.log("Nothing changed. Back up the database, then add --confirm to run this.");
    return;
  }

  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.sale.deleteMany(),
    prisma.meterReading.deleteMany(),
    prisma.emailLog.deleteMany(),
    prisma.pricingSetting.updateMany({ data: { updatedById: owner.id } }),
    prisma.user.deleteMany({ where: { id: { not: owner.id } } }),
  ]);

  console.log(`Done. Only ${owner.username} remains.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
