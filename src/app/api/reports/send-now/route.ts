import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { buildReport, renderReportEmailHtml } from "@/lib/reports";
import { sendReportEmail } from "@/lib/email";
import { getBusinessDateKey } from "@/lib/tz";
import { getMeterDiscrepancy } from "@/lib/meter";
import type { Period } from "@/lib/tz";

const REPORT_LABEL: Record<"daily" | "weekly" | "monthly", { title: string; period: Period }> = {
  daily: { title: "Daily Water Sales Report", period: "today" },
  weekly: { title: "Weekly Water Sales Report", period: "week" },
  monthly: { title: "Monthly Water Sales Report", period: "month" },
};

const schema = z.object({ type: z.enum(["daily", "weekly", "monthly"]) });

/** Lets the owner send today's/this week's/this month's report right now, regardless of the scheduled send time. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const settings = await prisma.reportSettings.findUnique({ where: { id: "singleton" } });
  const recipients = settings ? (JSON.parse(settings.recipientEmails) as string[]).filter(Boolean) : [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipient emails configured yet" }, { status: 400 });
  }

  const { title, period } = REPORT_LABEL[parsed.data.type];
  const report = await buildReport(period);
  const reportTypeUpper = parsed.data.type.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY";

  const meterDiscrepancy = parsed.data.type === "daily" ? await getMeterDiscrepancy(getBusinessDateKey()) : null;

  await sendReportEmail({
    reportType: reportTypeUpper,
    reportPeriod: report.reportPeriodKey,
    recipients,
    subject: `${title} – ${report.periodLabel}${meterDiscrepancy?.isBigDeviation ? " ⚠ DEVIATION" : ""}`,
    html: renderReportEmailHtml(title, report, meterDiscrepancy),
    force: true,
  });

  const logs = await prisma.emailLog.findMany({
    where: { reportType: reportTypeUpper, reportPeriod: report.reportPeriodKey },
    orderBy: { createdAt: "desc" },
    take: recipients.length,
  });

  return NextResponse.json({ sent: logs.every((l) => l.status === "SENT"), logs });
}
