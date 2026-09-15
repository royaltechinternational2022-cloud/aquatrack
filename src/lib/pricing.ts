import { prisma } from "@/lib/db";

export interface PriceCheckResult {
  flagged: boolean;
  reason?: string;
  expectedRatePerLiter?: number;
}

/**
 * V1 uses manual pricing, so employees can mistype an amount (e.g. an extra
 * zero). Compare the submitted rate (amount / liters) against the recent
 * average rate; flag if it falls outside the configured tolerance band so the
 * employee can double check before confirming.
 */
export async function checkPriceAnomaly(liters: number, amount: number): Promise<PriceCheckResult> {
  if (liters <= 0) return { flagged: false };

  const settings = await getAppSettings();
  const rate = amount / liters;

  const recent = await prisma.sale.findMany({
    where: { status: "COMPLETED" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { liters: true, amount: true },
  });

  if (recent.length < 5) {
    // Not enough history yet to judge — don't block early transactions.
    return { flagged: false };
  }

  const totalLiters = recent.reduce((sum, s) => sum + s.liters, 0);
  const totalAmount = recent.reduce((sum, s) => sum + s.amount, 0);
  const expectedRate = totalLiters > 0 ? totalAmount / totalLiters : 0;

  if (expectedRate <= 0) return { flagged: false };

  const lowerBound = expectedRate * settings.priceAlertLowerRatio;
  const upperBound = expectedRate * settings.priceAlertUpperRatio;

  if (rate < lowerBound || rate > upperBound) {
    return {
      flagged: true,
      reason: `This amount works out to Rs. ${rate.toFixed(2)}/L, but recent sales average about Rs. ${expectedRate.toFixed(
        2
      )}/L.`,
      expectedRatePerLiter: expectedRate,
    };
  }

  return { flagged: false, expectedRatePerLiter: expectedRate };
}

export async function getActivePricingSetting() {
  return prisma.pricingSetting.findFirst({ orderBy: { activeFrom: "desc" } });
}

export async function getAppSettings() {
  let settings = await prisma.appSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) {
    settings = await prisma.appSettings.create({ data: { id: "singleton" } });
  }
  return settings;
}
