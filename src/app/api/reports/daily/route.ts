import { NextRequest, NextResponse } from "next/server";
import { buildReport } from "@/lib/reports";
import { prisma } from "@/lib/db";
import { getBusinessDateKey } from "@/lib/tz";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const reference = dateParam ? new Date(dateParam) : new Date();
  const report = await buildReport("today", reference);

  const businessDate = getBusinessDateKey(reference);
  const meterReadings = await prisma.meterReading.findMany({
    where: { businessDate },
    include: { recordedBy: { select: { name: true } } },
  });
  const opening = meterReadings.find((r) => r.type === "OPENING") ?? null;
  const closing = meterReadings.find((r) => r.type === "CLOSING") ?? null;

  return NextResponse.json({
    report,
    meterReadings: {
      opening,
      closing,
      meterDifference: opening && closing ? closing.reading - opening.reading : null,
    },
  });
}
