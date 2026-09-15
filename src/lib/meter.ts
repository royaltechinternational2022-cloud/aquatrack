import { prisma } from "@/lib/db";
import { getAppSettings } from "@/lib/pricing";
import { businessDateKeyToRange } from "@/lib/tz";

export interface MeterDiscrepancy {
  businessDate: string;
  opening: { reading: number; recordedBy: string } | null;
  closing: { reading: number; recordedBy: string } | null;
  meterLiters: number | null; // (closing - opening) reading, converted m³ -> L
  actualRevenue: number;
  referencePricePerLiter: number;
  expectedRevenue: number | null; // meterLiters * referencePricePerLiter
  deviationPct: number | null; // |actual - expected| / expected * 100
  thresholdPct: number;
  isBigDeviation: boolean;
}

/**
 * Sanity-checks the day's water meter against recorded sales: liters implied
 * by the meter (at a reference price/L) vs. actual revenue collected. A big
 * gap suggests a leak, an uncounted giveaway, or missing/incorrect sales.
 */
export async function getMeterDiscrepancy(businessDate: string): Promise<MeterDiscrepancy> {
  const range = businessDateKeyToRange(businessDate);

  const [readings, settings, salesAgg] = await Promise.all([
    prisma.meterReading.findMany({
      where: { businessDate },
      include: { recordedBy: { select: { name: true } } },
    }),
    getAppSettings(),
    prisma.sale.aggregate({
      where: { transactionDate: { gte: range.start, lte: range.end } },
      _sum: { amount: true },
    }),
  ]);

  const opening = readings.find((r) => r.type === "OPENING") ?? null;
  const closing = readings.find((r) => r.type === "CLOSING") ?? null;

  const meterLiters = opening && closing ? (closing.reading - opening.reading) * 1000 : null;
  const referencePricePerLiter = settings.meterReferencePricePerLiter;
  const thresholdPct = settings.meterDiscrepancyThresholdPct;
  const expectedRevenue = meterLiters !== null ? meterLiters * referencePricePerLiter : null;
  const actualRevenue = salesAgg._sum.amount ?? 0;

  let deviationPct: number | null = null;
  if (expectedRevenue !== null && expectedRevenue > 0) {
    deviationPct = (Math.abs(actualRevenue - expectedRevenue) / expectedRevenue) * 100;
  }

  return {
    businessDate,
    opening: opening ? { reading: opening.reading, recordedBy: opening.recordedBy.name } : null,
    closing: closing ? { reading: closing.reading, recordedBy: closing.recordedBy.name } : null,
    meterLiters,
    actualRevenue,
    referencePricePerLiter,
    expectedRevenue,
    deviationPct,
    thresholdPct,
    isBigDeviation: deviationPct !== null && deviationPct > thresholdPct,
  };
}
