import { NextRequest, NextResponse } from "next/server";
import { getPeriodRange } from "@/lib/tz";
import { getSummary, getEmployeeBreakdown, getMonthlySeries } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const reference = yearParam ? new Date(Number(yearParam), 5, 15) : new Date();

  const range = getPeriodRange("year", reference);
  const [summary, employeeBreakdown, monthlySeries] = await Promise.all([
    getSummary(range.start, range.end),
    getEmployeeBreakdown(range.start, range.end),
    getMonthlySeries(range.start, range.end),
  ]);

  const monthsWithData = monthlySeries.filter((m) => m.transactions > 0).length || 1;

  return NextResponse.json({
    report: {
      periodLabel: range.label,
      summary,
      employeeBreakdown,
      monthlySeries,
      avgMonthlyRevenue: summary.revenue / monthsWithData,
    },
  });
}
