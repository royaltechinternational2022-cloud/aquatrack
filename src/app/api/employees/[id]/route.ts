import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

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
    },
  });
  if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ employee });
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
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
  const { newPassword, email, ...rest } = parsed.data;

  const data: Record<string, unknown> = { ...rest };
  if (email !== undefined) data.email = email || null;
  if (newPassword) data.passwordHash = await hashPassword(newPassword);

  const employee = await prisma.user.update({ where: { id }, data });

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
