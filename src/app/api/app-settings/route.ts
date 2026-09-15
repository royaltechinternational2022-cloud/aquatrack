import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/pricing";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json({
    settings: { ...settings, enabledPaymentMethods: JSON.parse(settings.enabledPaymentMethods) as string[] },
  });
}

const schema = z.object({
  enabledPaymentMethods: z.array(z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"])).min(1).optional(),
  meterReferencePricePerLiter: z.number().positive().optional(),
  meterDiscrepancyThresholdPct: z.number().positive().optional(),
});

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid settings", details: parsed.error.flatten() }, { status: 400 });
  }

  await getAppSettings();
  const { enabledPaymentMethods, ...rest } = parsed.data;
  const settings = await prisma.appSettings.update({
    where: { id: "singleton" },
    data: {
      ...rest,
      ...(enabledPaymentMethods ? { enabledPaymentMethods: JSON.stringify(enabledPaymentMethods) } : {}),
    },
  });

  return NextResponse.json({
    settings: { ...settings, enabledPaymentMethods: JSON.parse(settings.enabledPaymentMethods) as string[] },
  });
}
