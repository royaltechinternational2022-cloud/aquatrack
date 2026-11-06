import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { getSession, hashPassword } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const employee = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      status: true,
      employeeCode: true,
      createdAt: true,
      lastLoginAt: true,
      _count: { select: { sales: true, meterReadings: true } },
    },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ employee });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  username: z
    .string()
    .min(3)
    .regex(/^[a-z0-9._-]+$/i, "Letters, numbers, dots, dashes and underscores only")
    .optional(),
  email: z.string().email().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
  newPassword: z.string().min(6).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update", details: parsed.error.flatten() }, { status: 400 });
  }
  const { newPassword, email, username, ...rest } = parsed.data;

  if (rest.status === "DISABLED") {
    const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "ADMIN") {
      return NextResponse.json({ error: "Admin accounts cannot be disabled" }, { status: 400 });
    }
  }

  const data: Record<string, unknown> = { ...rest };
  if (username !== undefined) data.username = username.toLowerCase();
  if (email !== undefined) data.email = email || null;
  if (newPassword) data.passwordHash = await hashPassword(newPassword);

  let employee;
  try {
    employee = await prisma.user.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    throw err;
  }

  return NextResponse.json({
    employee: {
      id: employee.id,
      name: employee.name,
      username: employee.username,
      role: employee.role,
      status: employee.status,
      employeeCode: employee.employeeCode,
    },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can remove employees" }, { status: 403 });
  }
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, _count: { select: { sales: true, meterReadings: true } } },
  });
  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "ADMIN") {
    return NextResponse.json({ error: "Admin accounts cannot be removed" }, { status: 400 });
  }

  // Sales feed past revenue reports, so losing them must be asked for explicitly.
  const { sales, meterReadings } = user._count;
  const deleteHistory = new URL(req.url).searchParams.get("deleteHistory") === "true";
  if ((sales > 0 || meterReadings > 0) && !deleteHistory) {
    return NextResponse.json(
      { error: "This employee has sales or meter readings", sales, meterReadings },
      { status: 409 }
    );
  }

  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { OR: [{ changedById: id }, { transaction: { employeeId: id } }] } }),
    prisma.sale.deleteMany({ where: { employeeId: id } }),
    prisma.meterReading.deleteMany({ where: { recordedById: id } }),
    prisma.user.delete({ where: { id } }),
  ]);

  return NextResponse.json({ removed: true });
}
