"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatLiters } from "@/lib/format";
import Link from "next/link";

type Period = "today" | "week" | "month" | "year";

const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "TODAY" },
  { key: "week", label: "WEEK" },
  { key: "month", label: "MONTH" },
  { key: "year", label: "YEAR" },
];

interface StatsResponse {
  periodLabel: string;
  current: { liters: number; revenue: number; transactions: number };
  previous: { liters: number; revenue: number; transactions: number };
  litersGrowthPct: number | null;
  revenueGrowthPct: number | null;
}

interface SeriesPoint {
  label: string;
  liters: number;
  revenue: number;
}

interface EmployeeRow {
  employeeId: string;
  name: string;
  liters: number;
  revenue: number;
  transactions: number;
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState<Period>("today");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [metric, setMetric] = useState<"liters" | "revenue">("liters");

  useEffect(() => {
    setStats(null);
    Promise.all([
      fetch(`/api/stats?period=${period}`).then((r) => r.json()),
      fetch(`/api/stats/series?period=${period}`).then((r) => r.json()),
      fetch(`/api/stats/employees?period=${period}`).then((r) => r.json()),
    ]).then(([s, sr, emp]) => {
      setStats(s);
      setSeries(sr.series);
      setEmployees(emp.breakdown);
    });
  }, [period]);

  return (
    <div className="px-5 py-6 max-w-2xl mx-auto w-full space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-slate-400 text-sm">{stats?.periodLabel ?? " "}</p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`py-2.5 rounded-xl text-xs font-bold tracking-wide transition ${
              period === p.key ? "bg-cyan-600 text-white" : "bg-white text-slate-500 border border-slate-100"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard emoji="💧" value={stats ? formatLiters(stats.current.liters) : "—"} label="Water Sold" />
        <StatCard emoji="💰" value={stats ? formatMoney(stats.current.revenue) : "—"} label="Revenue" />
        <StatCard emoji="🧾" value={stats ? String(stats.current.transactions) : "—"} label="Transactions" />
      </div>

      {stats && (
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 text-sm">
          <p className="text-slate-400">
            Previous period: {formatLiters(stats.previous.liters)} · {formatMoney(stats.previous.revenue)}
          </p>
          <p className="mt-1">
            Growth:{" "}
            <GrowthBadge pct={stats.revenueGrowthPct} />
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-700 text-sm">{metric === "liters" ? "Water Sold" : "Revenue"}</h2>
          <div className="flex gap-1 bg-slate-100 rounded-full p-1">
            <button
              onClick={() => setMetric("liters")}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                metric === "liters" ? "bg-white shadow text-cyan-700" : "text-slate-400"
              }`}
            >
              Liters
            </button>
            <button
              onClick={() => setMetric("revenue")}
              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                metric === "revenue" ? "bg-white shadow text-cyan-700" : "text-slate-400"
              }`}
            >
              Revenue
            </button>
          </div>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ left: -20 }}>
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value: number) => (metric === "liters" ? formatLiters(value) : formatMoney(value))}
                contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
              />
              <Bar dataKey={metric} radius={[6, 6, 0, 0]} fill="#0891b2" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-slate-700 text-sm">Employee Performance</h2>
          <Link href="/admin/employees" className="text-xs text-cyan-600 font-semibold">
            View all
          </Link>
        </div>
        <div className="space-y-3">
          {employees.length === 0 && <p className="text-slate-400 text-sm">No sales yet.</p>}
          {employees.map((e) => (
            <div key={e.employeeId} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-700 text-sm">{e.name}</p>
                <p className="text-xs text-slate-400">{e.transactions} transactions</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-800 text-sm">{formatMoney(e.revenue)}</p>
                <p className="text-xs text-slate-400">{formatLiters(e.liters)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-3 text-center">
      <div className="text-xl mb-1">{emoji}</div>
      <div className="text-base font-extrabold text-slate-800 leading-tight break-words">{value}</div>
      <div className="text-[11px] text-slate-400 mt-0.5">{label}</div>
    </div>
  );
}

function GrowthBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-slate-400">—</span>;
  const positive = pct >= 0;
  return (
    <span className={`font-bold ${positive ? "text-emerald-600" : "text-red-500"}`}>
      {positive ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}
