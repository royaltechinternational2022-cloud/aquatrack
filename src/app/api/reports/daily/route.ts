import { NextRequest, NextResponse } from "next/server";
import { buildReport } from "@/lib/reports";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date");
  const reference = dateParam ? new Date(dateParam) : new Date();
  const report = await buildReport("today", reference);
  return NextResponse.json({ report });
}
