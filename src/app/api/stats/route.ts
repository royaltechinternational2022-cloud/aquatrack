import { NextRequest, NextResponse } from "next/server";
import { getSummary } from "@/lib/stats";
import { getPeriodRange, getPreviousPeriodRange, type Period } from "@/lib/tz";
import { growthPercent } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as Period) || "today";
  const dateParam = searchParams.get("date");
  const reference = dateParam ? new Date(dateParam) : new Date();

  const range = getPeriodRange(period, reference);
  const prevRange = getPreviousPeriodRange(period, reference);

  const [current, previous] = await Promise.all([
    getSummary(range.start, range.end),
    getSummary(prevRange.start, prevRange.end),
  ]);

  return NextResponse.json({
    period,
    periodLabel: range.label,
    range: { start: range.start, end: range.end },
    current,
    previous,
    litersGrowthPct: growthPercent(current.liters, previous.liters),
    revenueGrowthPct: growthPercent(current.revenue, previous.revenue),
  });
}
