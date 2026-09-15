import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";

export async function GET() {
  const setting = await prisma.pricingSetting.findFirst({ orderBy: { activeFrom: "desc" } });
  return NextResponse.json({
    setting: setting ?? { pricingMode: "MANUAL", pricePerLiter: null, currency: "LKR" },
  });
}

const schema = z.object({
  pricingMode: z.enum(["MANUAL", "PER_LITER", "PRODUCT"]),
  pricePerLiter: z.number().positive().optional(),
});

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid pricing settings", details: parsed.error.flatten() }, { status: 400 });
  }
  if (parsed.data.pricingMode === "PER_LITER" && !parsed.data.pricePerLiter) {
    return NextResponse.json({ error: "Price per liter is required for fixed pricing" }, { status: 400 });
  }

  const setting = await prisma.pricingSetting.create({
    data: {
      pricingMode: parsed.data.pricingMode,
      pricePerLiter: parsed.data.pricePerLiter,
      updatedById: session.sub,
    },
  });

  return NextResponse.json({ setting });
}
