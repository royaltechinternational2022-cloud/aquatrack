import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, name: true, employeeCode: true } },
      auditLogs: { include: { changedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!sale) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role === "EMPLOYEE" && sale.employeeId !== session.sub) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ sale });
}

const correctionSchema = z.object({
  liters: z.number().positive().optional(),
  amount: z.number().positive().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]).optional(),
  reason: z.string().min(3, "A reason is required for every correction"),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Only admins can correct transactions" }, { status: 403 });
  }
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = correctionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid correction", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.sale.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { reason, ...changes } = parsed.data;
  if (Object.keys(changes).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const oldValues = {
    liters: existing.liters,
    amount: existing.amount,
    paymentMethod: existing.paymentMethod,
  };
  const newValues = { ...oldValues, ...changes };

  const [sale] = await prisma.$transaction([
    prisma.sale.update({
      where: { id },
      data: { ...changes, status: "CORRECTED" },
    }),
    prisma.auditLog.create({
      data: {
        transactionId: id,
        changedById: session.sub,
        oldValues: JSON.stringify(oldValues),
        newValues: JSON.stringify(newValues),
        reason,
      },
    }),
  ]);

  return NextResponse.json({ sale });
}
