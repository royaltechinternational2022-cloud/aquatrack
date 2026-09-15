import { NextRequest, NextResponse } from "next/server";
import { getEmployeeBreakdown } from "@/lib/stats";
import { getPeriodRange, type Period } from "@/lib/tz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") as Period | null;
  const startParam = searchParams.get("start");
  const endParam = searchParams.get("end");

  let start: Date, end: Date;
  if (startParam && endParam) {
    start = new Date(startParam);
    end = new Date(endParam);
  } else {
    const range = getPeriodRange(period || "today");
    start = range.start;
    end = range.end;
  }

  const breakdown = await getEmployeeBreakdown(start, end);
  return NextResponse.json({ breakdown });
}
