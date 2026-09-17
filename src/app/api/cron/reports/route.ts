import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildReport, renderReportEmailHtml } from "@/lib/reports";
import { sendReportEmail } from "@/lib/email";
import { formatBusiness, getBusinessDateKey } from "@/lib/tz";
import { getMeterDiscrepancy } from "@/lib/meter";
import { addDays } from "date-fns";

/**
 * Shared logic, invoked either by Vercel Cron (GET, see vercel.json) or
 * manually/by an external scheduler (POST). Idempotent: sendReportEmail
 * skips any (reportType, reportPeriod, recipient) that already has a SENT
 * log, so calling this too often just no-ops after the first successful
 * send per period, and a failed send is retried on the next invocation.
 */
async function runReportCheck() {
  const settings = await prisma.reportSettings.findUnique({ where: { id: "singleton" } });
  if (!settings) return { checked: [], reason: "No report settings configured" };

  const recipients = (JSON.parse(settings.recipientEmails) as string[]).filter(Boolean);
  if (recipients.length === 0) return { checked: [], reason: "No recipients configured" };

  const now = new Date();
  const currentHHmm = formatBusiness(now, "HH:mm");
  const pastScheduledTime = currentHHmm >= settings.dailyTime;
  const results: string[] = [];

  if (settings.dailyEnabled && pastScheduledTime) {
    const report = await buildReport("today");
    const meterDiscrepancy = await getMeterDiscrepancy(getBusinessDateKey(now));
    await sendReportEmail({
      reportType: "DAILY",
      reportPeriod: report.reportPeriodKey,
      recipients,
      subject: `Daily Water Sales Report – ${report.periodLabel}${meterDiscrepancy.isBigDeviation ? " ⚠ DEVIATION" : ""}`,
      html: renderReportEmailHtml("Daily Water Sales Report", report, meterDiscrepancy),
    });
    results.push(`DAILY:${report.reportPeriodKey}`);
  }

  const todayName = formatBusiness(now, "EEEE");
  if (settings.weeklyEnabled && todayName === settings.weeklyDay && pastScheduledTime) {
    const report = await buildReport("week");
    await sendReportEmail({
      reportType: "WEEKLY",
      reportPeriod: report.reportPeriodKey,
      recipients,
      subject: `Weekly Water Sales Report – ${report.periodLabel}`,
      html: renderReportEmailHtml("Weekly Water Sales Report", report),
    });
    results.push(`WEEKLY:${report.reportPeriodKey}`);
  }

  const isLastDayOfMonth = formatBusiness(addDays(now, 1), "d") === "1";
  if (settings.monthlyEnabled && isLastDayOfMonth && pastScheduledTime) {
    const report = await buildReport("month");
    await sendReportEmail({
      reportType: "MONTHLY",
      reportPeriod: report.reportPeriodKey,
      recipients,
      subject: `Monthly Water Sales Report – ${report.periodLabel}`,
      html: renderReportEmailHtml("Monthly Water Sales Report", report),
    });
    results.push(`MONTHLY:${report.reportPeriodKey}`);
  }

  return { checked: results, timezone: settings.timezone, now: currentHHmm };
}

/** Vercel Cron invokes this automatically (see vercel.json) with a Bearer token. */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runReportCheck());
}

/** Manual/external trigger (e.g. a different scheduler, or testing via curl). */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runReportCheck());
}
