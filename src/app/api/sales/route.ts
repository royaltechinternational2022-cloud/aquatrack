import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateTransactionNumber } from "@/lib/transaction";
import { checkPriceAnomaly, getActivePricingSetting } from "@/lib/pricing";
import { getPeriodRange, type Period } from "@/lib/tz";

const createSchema = z.object({
  requestId: z.string().min(1),
  liters: z.number().positive(),
  amount: z.number().positive().optional(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  confirmedOverride: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid sale data", details: parsed.error.flatten() }, { status: 400 });
  }
  const { requestId, liters, paymentMethod, confirmedOverride } = parsed.data;

  // Idempotency: if this requestId was already submitted, return the existing sale.
  const existing = await prisma.sale.findUnique({ where: { requestId } });
  if (existing) {
    return NextResponse.json({ sale: existing, idempotent: true });
  }

  const pricingSetting = await getActivePricingSetting();
  const pricingMode = pricingSetting?.pricingMode ?? "MANUAL";

  let amount: number;
  if (pricingMode === "PER_LITER" && pricingSetting?.pricePerLiter) {
    amount = Number((liters * pricingSetting.pricePerLiter).toFixed(2));
  } else {
    if (!parsed.data.amount) {
      return NextResponse.json({ error: "Amount is required for manual pricing" }, { status: 400 });
    }
    amount = parsed.data.amount;
  }

  let flagged = false;
  let flagReason: string | undefined;
  if (pricingMode === "MANUAL") {
    const check = await checkPriceAnomaly(liters, amount);
    if (check.flagged && !confirmedOverride) {
      return NextResponse.json(
        { warning: true, reason: check.reason, expectedRatePerLiter: check.expectedRatePerLiter },
        { status: 409 }
      );
    }
    flagged = check.flagged ?? false;
    flagReason = check.reason;
  }

  // Retry a couple of times in case of a transaction-number race between employees.
  for (let attempt = 0; attempt < 5; attempt++) {
    const transactionNumber = await generateTransactionNumber();
    try {
      const sale = await prisma.sale.create({
        data: {
          transactionNumber,
          requestId,
          employeeId: session.sub,
          liters,
          amount,
          paymentMethod,
          pricingMode,
          flagged,
          flagReason,
        },
      });
      return NextResponse.json({ sale });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const target = (err.meta?.target as string[] | undefined) ?? [];
        if (target.includes("requestId")) {
          const race = await prisma.sale.findUnique({ where: { requestId } });
          if (race) return NextResponse.json({ sale: race, idempotent: true });
        }
        // transactionNumber collision — loop and try the next number
        continue;
      }
      throw err;
    }
  }

  return NextResponse.json({ error: "Could not allocate a transaction number, please retry" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") as Period | null;
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");
  const employeeIdParam = searchParams.get("employeeId");
  const paymentMethod = searchParams.get("paymentMethod");
  const search = searchParams.get("search");
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 25)));

  const where: Prisma.SaleWhereInput = {};

  if (startParam || endParam) {
    where.transactionDate = {
      ...(startParam ? { gte: new Date(startParam) } : {}),
      ...(endParam ? { lte: new Date(endParam) } : {}),
    };
  } else if (period) {
    const range = getPeriodRange(period);
    where.transactionDate = { gte: range.start, lte: range.end };
  }

  if (paymentMethod) {
    where.paymentMethod = paymentMethod as Prisma.EnumPaymentMethodFilter["equals"];
  }

  if (search) {
    where.transactionNumber = { contains: search };
  }

  // Employees may only ever see their own sales, regardless of query params.
  if (session.role === "EMPLOYEE") {
    where.employeeId = session.sub;
  } else if (employeeIdParam) {
    where.employeeId = employeeIdParam;
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      orderBy: { transactionDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { employee: { select: { id: true, name: true, employeeCode: true } } },
    }),
    prisma.sale.count({ where }),
  ]);

  return NextResponse.json({ sales, total, page, pageSize });
}
