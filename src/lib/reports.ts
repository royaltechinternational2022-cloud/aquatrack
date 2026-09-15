import { getPeriodRange, getPreviousPeriodRange, formatBusiness, type Period } from "@/lib/tz";
import {
  getSummary,
  getPaymentBreakdown,
  getEmployeeBreakdown,
  getDailySeries,
  findExtremeDays,
  growthPercent,
  type Summary,
} from "@/lib/stats";

const money = (n: number) => `Rs. ${n.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
const liters = (n: number) => `${n.toLocaleString("en-LK", { maximumFractionDigits: 1 })} L`;

export interface ReportData {
  period: Period;
  periodLabel: string;
  reportPeriodKey: string;
  summary: Summary;
  previousSummary: Summary;
  litersGrowthPct: number | null;
  revenueGrowthPct: number | null;
  paymentBreakdown: Record<string, number>;
  employeeBreakdown: Awaited<ReturnType<typeof getEmployeeBreakdown>>;
  dailySeries: Awaited<ReturnType<typeof getDailySeries>>;
  bestDay: Awaited<ReturnType<typeof findExtremeDays>>["best"];
  worstDay: Awaited<ReturnType<typeof findExtremeDays>>["worst"];
  avgLitersPerDay: number;
  avgRevenuePerDay: number;
}

export async function buildReport(period: Period, reference: Date = new Date()): Promise<ReportData> {
  const range = getPeriodRange(period, reference);
  const prevRange = getPreviousPeriodRange(period, reference);

  const [summary, previousSummary, paymentBreakdown, employeeBreakdown, dailySeries] = await Promise.all([
    getSummary(range.start, range.end),
    getSummary(prevRange.start, prevRange.end),
    getPaymentBreakdown(range.start, range.end),
    getEmployeeBreakdown(range.start, range.end),
    getDailySeries(range.start, range.end),
  ]);

  const { best, worst } = findExtremeDays(dailySeries);
  const activeDays = dailySeries.length || 1;

  const reportPeriodKey =
    period === "today"
      ? formatBusiness(range.start, "yyyy-MM-dd")
      : period === "week"
      ? formatBusiness(range.start, "RRRR-'W'II")
      : period === "month"
      ? formatBusiness(range.start, "yyyy-MM")
      : formatBusiness(range.start, "yyyy");

  return {
    period,
    periodLabel: range.label,
    reportPeriodKey,
    summary,
    previousSummary,
    litersGrowthPct: growthPercent(summary.liters, previousSummary.liters),
    revenueGrowthPct: growthPercent(summary.revenue, previousSummary.revenue),
    paymentBreakdown,
    employeeBreakdown,
    dailySeries,
    bestDay: best,
    worstDay: worst,
    avgLitersPerDay: summary.liters / activeDays,
    avgRevenuePerDay: summary.revenue / activeDays,
  };
}

function growthLine(pct: number | null): string {
  if (pct === null) return "";
  const sign = pct >= 0 ? "+" : "";
  const color = pct >= 0 ? "#059669" : "#dc2626";
  return `<span style="color:${color};font-weight:600;">${sign}${pct.toFixed(1)}%</span>`;
}

export interface MeterDiscrepancyForEmail {
  isBigDeviation: boolean;
  deviationPct: number | null;
  thresholdPct: number;
  meterLiters: number | null;
  expectedRevenue: number | null;
  actualRevenue: number;
}

export function renderReportEmailHtml(
  title: string,
  data: ReportData,
  meterDiscrepancy?: MeterDiscrepancyForEmail | null
): string {
  const employeeRows = data.employeeBreakdown
    .map(
      (e) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;">${e.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${liters(e.liters)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(e.revenue)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${e.transactions}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;max-width:600px;margin:0 auto;color:#0f172a;">
    <div style="background:linear-gradient(135deg,#0891b2,#0e7490);padding:24px;border-radius:12px 12px 0 0;">
      <h1 style="color:white;margin:0;font-size:20px;">${title}</h1>
      <p style="color:#cffafe;margin:4px 0 0;font-size:14px;">${data.periodLabel}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px;">
      ${
        meterDiscrepancy?.isBigDeviation
          ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-weight:700;color:#b91c1c;font-size:14px;">⚠ Avvik mellom vannmåler og registrert salg</p>
              <p style="margin:0;font-size:13px;color:#7f1d1d;">
                Målerdifferanse: ${liters(meterDiscrepancy.meterLiters ?? 0)} (forventet ${money(
              meterDiscrepancy.expectedRevenue ?? 0
            )}) vs. registrert salg ${money(meterDiscrepancy.actualRevenue)} —
                ${meterDiscrepancy.deviationPct?.toFixed(0)}% avvik (terskel ${meterDiscrepancy.thresholdPct}%).
              </p>
            </div>`
          : ""
      }
      <div style="display:flex;gap:12px;margin-bottom:24px;">
        <div style="flex:1;background:#f0fdff;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#0e7490;">${liters(data.summary.liters)}</div>
          <div style="font-size:12px;color:#64748b;">Water Sold</div>
        </div>
        <div style="flex:1;background:#f0fdff;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#0e7490;">${money(data.summary.revenue)}</div>
          <div style="font-size:12px;color:#64748b;">Revenue</div>
        </div>
        <div style="flex:1;background:#f0fdff;border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:22px;font-weight:700;color:#0e7490;">${data.summary.transactions}</div>
          <div style="font-size:12px;color:#64748b;">Transactions</div>
        </div>
      </div>

      <p style="font-size:14px;color:#334155;">
        Previous period: ${liters(data.previousSummary.liters)} / ${money(data.previousSummary.revenue)}<br/>
        Growth: ${growthLine(data.revenueGrowthPct)}
      </p>

      <h3 style="font-size:14px;color:#334155;margin-top:24px;">Payment Breakdown</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        ${Object.entries(data.paymentBreakdown)
          .map(
            ([method, amount]) => `
          <tr>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;">${method.replace("_", " ")}</td>
            <td style="padding:6px 12px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(amount)}</td>
          </tr>`
          )
          .join("")}
      </table>

      <h3 style="font-size:14px;color:#334155;margin-top:24px;">Employee Breakdown</h3>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #e5e7eb;">Employee</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Liters</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Revenue</th>
          <th style="padding:8px 12px;text-align:right;border-bottom:2px solid #e5e7eb;">Txns</th>
        </tr>
        ${employeeRows || `<tr><td colspan="4" style="padding:8px 12px;color:#94a3b8;">No sales recorded</td></tr>`}
      </table>

      ${
        data.bestDay
          ? `<p style="font-size:13px;color:#64748b;margin-top:24px;">Best day: ${data.bestDay.label} (${money(
              data.bestDay.revenue
            )}) · Lowest day: ${data.worstDay?.label ?? "-"} (${money(data.worstDay?.revenue ?? 0)})</p>`
          : ""
      }

      <p style="font-size:12px;color:#94a3b8;margin-top:24px;">Generated automatically by Water Sales Management System · Asia/Colombo</p>
    </div>
  </div>`;
}
