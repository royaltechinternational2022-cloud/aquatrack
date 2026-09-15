import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const employees = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
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
  return NextResponse.json({ employees });
}

const createSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-z0-9._-]+$/i, "Letters, numbers, dots, dashes and underscores only"),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "EMPLOYEE"]).default("EMPLOYEE"),
});

function generateEmployeeCode(count: number) {
  return `EMP${String(count + 1).padStart(3, "0")}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid employee data", details: parsed.error.flatten() }, { status: 400 });
  }
  const { name, username, email, password, role } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { username: username.toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
  }

  const count = await prisma.user.count({ where: { role: "EMPLOYEE" } });
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      username: username.toLowerCase(),
      email: email || null,
      passwordHash,
      role,
      employeeCode: role === "EMPLOYEE" ? generateEmployeeCode(count) : null,
    },
  });

  return NextResponse.json({
    employee: { id: user.id, name: user.name, username: user.username, role: user.role, employeeCode: user.employeeCode },
  });
}
