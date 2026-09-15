"use client";

import { useEffect, useState } from "react";
import { formatMoney, formatLiters, paymentLabel } from "@/lib/format";

type Tab = "daily" | "weekly" | "monthly" | "yearly";

const TABS: { key: Tab; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

interface EmployeeRow {
  employeeId: string;
  name: string;
  liters: number;
  revenue: number;
  transactions: number;
}

interface Report {
  periodLabel: string;
  summary: { liters: number; revenue: number; transactions: number };
  previousSummary?: { liters: number; revenue: number; transactions: number };
  revenueGrowthPct?: number | null;
  paymentBreakdown?: Record<string, number>;
  employeeBreakdown: EmployeeRow[];
  bestDay?: { label: string; revenue: number } | null;
  worstDay?: { label: string; revenue: number } | null;
  avgLitersPerDay?: number;
  avgRevenuePerDay?: number;
  avgMonthlyRevenue?: number;
  monthlySeries?: { label: string; liters: number; revenue: number; transactions: number }[];
}

interface EmailLog {
  id: string;
  reportType: string;
  reportPeriod: string;
  recipient: string;
  status: string;
  sentAt: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<Tab>("daily");
  const [report, setReport] = useState<Report | null>(null);
  const [logs, setLogs] = useState<EmailLog[]>([]);

  useEffect(() => {
    setReport(null);
    fetch(`/api/reports/${tab}`)
      .then((r) => r.json())
      .then((d) => setReport(d.report));
  }, [tab]);

  useEffect(() => {
    fetch("/api/email-logs")
      .then((r) => r.json())
      .then((d) => setLogs(d.logs));
  }, []);

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto w-full space-y-5">
      <h1 className="text-xl font-bold text-slate-800">Reports</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
              tab === t.key ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-500"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!report && <p className="text-slate-400 text-sm">Loading…</p>}

      {report && (
        <>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <p className="text-slate-400 text-sm mb-3">{report.periodLabel}</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-extrabold text-cyan-700">{formatLiters(report.summary.liters)}</p>
                <p className="text-[11px] text-slate-400">Water Sold</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-cyan-700">{formatMoney(report.summary.revenue)}</p>
                <p className="text-[11px] text-slate-400">Revenue</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-cyan-700">{report.summary.transactions}</p>
                <p className="text-[11px] text-slate-400">Transactions</p>
              </div>
            </div>

            {report.previousSummary && (
              <p className="text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">
                Previous period: {formatLiters(report.previousSummary.liters)} · {formatMoney(report.previousSummary.revenue)}
                {typeof report.revenueGrowthPct === "number" && (
                  <span className={`ml-2 font-bold ${report.revenueGrowthPct >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {report.revenueGrowthPct >= 0 ? "+" : ""}
                    {report.revenueGrowthPct.toFixed(1)}%
                  </span>
                )}
              </p>
            )}

            {report.avgMonthlyRevenue !== undefined && (
              <p className="text-sm text-slate-500 mt-2">Average Monthly Revenue: {formatMoney(report.avgMonthlyRevenue)}</p>
            )}
            {report.avgRevenuePerDay !== undefined && (
              <p className="text-sm text-slate-500 mt-2">
                Avg / day: {formatLiters(report.avgLitersPerDay ?? 0)} · {formatMoney(report.avgRevenuePerDay)}
              </p>
            )}
            {report.bestDay && (
              <p className="text-sm text-slate-500 mt-2">
                Best day: {report.bestDay.label} ({formatMoney(report.bestDay.revenue)}) · Lowest:{" "}
                {report.worstDay?.label} ({formatMoney(report.worstDay?.revenue ?? 0)})
              </p>
            )}
          </div>

          {report.paymentBreakdown && (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-700 text-sm mb-3">Payment Breakdown</h2>
              <div className="space-y-2">
                {Object.entries(report.paymentBreakdown).map(([method, amount]) => (
                  <div key={method} className="flex justify-between text-sm">
                    <span className="text-slate-500">{paymentLabel(method)}</span>
                    <span className="font-semibold text-slate-800">{formatMoney(amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.monthlySeries && (
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
              <h2 className="font-bold text-slate-700 text-sm mb-3">Monthly Breakdown</h2>
              <div className="space-y-2">
                {report.monthlySeries.map((m) => (
                  <div key={m.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{m.label}</span>
                    <span className="font-semibold text-slate-800">
                      {formatLiters(m.liters)} · {formatMoney(m.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
            <h2 className="font-bold text-slate-700 text-sm mb-3">Employee Breakdown</h2>
            <div className="space-y-3">
              {report.employeeBreakdown.length === 0 && <p className="text-slate-400 text-sm">No sales.</p>}
              {report.employeeBreakdown.map((e) => (
                <div key={e.employeeId} className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">{e.name}</span>
                  <span className="text-slate-800 font-semibold">
                    {formatLiters(e.liters)} · {formatMoney(e.revenue)} · {e.transactions} txns
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5">
        <h2 className="font-bold text-slate-700 text-sm mb-3">Automatic Email Delivery</h2>
        {logs.length === 0 && <p className="text-slate-400 text-sm">No report emails sent yet.</p>}
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-center justify-between text-xs">
              <span className="text-slate-500">
                {log.reportType} · {log.reportPeriod} · {log.recipient}
              </span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full ${
                  log.status === "SENT" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                }`}
              >
                {log.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
