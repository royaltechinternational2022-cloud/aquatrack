import { NextRequest, NextResponse } from "next/server";
import { getDailySeries, getHourlySeries, getMonthlySeries } from "@/lib/stats";
import { getPeriodRange, type Period } from "@/lib/tz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = (searchParams.get("period") as Period) || "today";
  const granularity = searchParams.get("granularity") || (period === "today" ? "hour" : period === "year" ? "month" : "day");

  const range = getPeriodRange(period);

  let series;
  if (granularity === "hour") {
    series = await getHourlySeries(range.start, range.end);
  } else if (granularity === "month") {
    series = await getMonthlySeries(range.start, range.end);
  } else {
    series = await getDailySeries(range.start, range.end);
  }

  return NextResponse.json({ period, granularity, series });
}
