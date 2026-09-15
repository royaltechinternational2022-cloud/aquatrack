import { NextRequest, NextResponse } from "next/server";
import { buildReport } from "@/lib/reports";
import { getBusinessDateKey } from "@/lib/tz";
import { getMeterDiscrepancy } from "@/lib/meter";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const reference = dateParam ? new Date(dateParam) : new Date();
  const report = await buildReport("today", reference);
  const meterDiscrepancy = await getMeterDiscrepancy(getBusinessDateKey(reference));

  return NextResponse.json({ report, meterDiscrepancy });
}
