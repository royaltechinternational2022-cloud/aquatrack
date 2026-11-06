"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAdminDateTime } from "@/lib/format";

export interface EmailLog {
  id: string;
  reportType: string;
  reportPeriod: string;
  recipient: string;
  status: string;
  sentAt: string | null;
  retryCount?: number;
  errorMessage: string | null;
  createdAt: string;
}

interface ReportSettings {
  recipientEmails: string[];
  dailyEnabled: boolean;
  dailyTime: string;
  weeklyEnabled: boolean;
  weeklyDay: string;
  monthlyEnabled: boolean;
}

const FILTERS = [
  { key: "ALL", label: "All" },
  { key: "SENT", label: "Delivered" },
  { key: "FAILED", label: "Failed" },
];

const COLLAPSED_ROWS = 6;

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

export function EmailDeliveryCard({ logs }: { logs: EmailLog[] }) {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [filter, setFilter] = useState("ALL");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch("/api/report-settings")
      .then((r) => r.json())
      .then((d) => setSettings(d.settings));
  }, []);

  const delivered = logs.filter((l) => l.status === "SENT");
  const failedCount = logs.length - delivered.length;
  const lastDelivered = delivered.find((l) => l.sentAt)?.sentAt ?? null;

  const anyEnabled = !!settings && (settings.dailyEnabled || settings.weeklyEnabled || settings.monthlyEnabled);
  const hasRecipients = !!settings && settings.recipientEmails.length > 0;
  const isActive = anyEnabled && hasRecipients;

  const filtered = filter === "ALL" ? logs : logs.filter((l) => l.status === filter);
  const visible = expanded ? filtered : filtered.slice(0, COLLAPSED_ROWS);

  const schedule = settings
    ? [
        { label: "Daily", enabled: settings.dailyEnabled, detail: `Every day at ${settings.dailyTime}` },
        {
          label: "Weekly",
          enabled: settings.weeklyEnabled,
          detail: `${settings.weeklyDay}s at ${settings.dailyTime}`,
        },
        {
          label: "Monthly",
          enabled: settings.monthlyEnabled,
          detail: `Last day of the month at ${settings.dailyTime}`,
        },
      ]
    : [];

  return (
    <section className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
      <header className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-slate-700 text-sm">Automatic Email Delivery</h2>
            {settings && (
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                }`}
              >
                {isActive ? "Active" : "Paused"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">Scheduled sales reports sent to your recipients by email</p>
        </div>
        <Link
          href="/admin/settings"
          className="shrink-0 text-xs font-semibold text-slate-600 border border-slate-200 rounded-full px-3 py-1.5"
        >
          Manage
        </Link>
      </header>

      {settings && !hasRecipients && (
        <p className="px-5 py-3 text-sm text-amber-700 bg-amber-50 border-b border-amber-100">
          No recipients are set, so no reports will be sent. Add one under Manage.
        </p>
      )}

      <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100 text-center">
        <div className="py-4 px-2">
          <p className="text-lg font-extrabold text-emerald-600">{delivered.length}</p>
          <p className="text-[11px] text-slate-400">Delivered</p>
        </div>
        <div className="py-4 px-2">
          <p className={`text-lg font-extrabold ${failedCount > 0 ? "text-red-600" : "text-slate-300"}`}>{failedCount}</p>
          <p className="text-[11px] text-slate-400">Failed</p>
        </div>
        <div className="py-4 px-2">
          <p className="text-xs font-bold text-slate-700 min-h-7 flex items-center justify-center">
            {lastDelivered ? formatAdminDateTime(lastDelivered) : "None yet"}
          </p>
          <p className="text-[11px] text-slate-400">Last Delivered</p>
        </div>
      </div>

      {settings && (
        <div className="p-5 border-b border-slate-100 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Schedule (Sri Lanka time)</h3>
          <ul className="space-y-2">
            {schedule.map((item) => (
              <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className={item.enabled ? "text-slate-700" : "text-slate-400"}>
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-slate-400"> · {item.detail}</span>
                </span>
                <span className={`text-xs font-semibold ${item.enabled ? "text-emerald-600" : "text-slate-400"}`}>
                  {item.enabled ? "On" : "Off"}
                </span>
              </li>
            ))}
          </ul>
          {hasRecipients && (
            <p className="text-xs text-slate-500 break-words">
              <span className="font-semibold">Recipients:</span> {settings.recipientEmails.join(", ")}
            </p>
          )}
        </div>
      )}

      <div className="p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Delivery History</h3>
          <div className="flex gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  filter === f.key ? "bg-slate-800 text-white" : "text-slate-500"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="text-slate-400 text-sm py-6 text-center">
            {logs.length === 0 ? "No report emails have been sent yet." : "No emails match this filter."}
          </p>
        )}

        <ul className="divide-y divide-slate-100">
          {visible.map((log) => (
            <li key={log.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {titleCase(log.reportType)} Report
                    <span className="font-normal text-slate-400"> · {log.reportPeriod}</span>
                  </p>
                  <p className="text-xs text-slate-500 truncate">{log.recipient}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {formatAdminDateTime(log.sentAt ?? log.createdAt)}
                    {log.retryCount ? ` · ${log.retryCount} ${log.retryCount === 1 ? "retry" : "retries"}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    log.status === "SENT" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {log.status === "SENT" ? "Delivered" : "Failed"}
                </span>
              </div>
              {log.status !== "SENT" && log.errorMessage && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 break-words">{log.errorMessage}</p>
              )}
            </li>
          ))}
        </ul>

        {filtered.length > COLLAPSED_ROWS && (
          <button onClick={() => setExpanded((v) => !v)} className="w-full text-xs font-semibold text-cyan-700 pt-1">
            {expanded ? "Show less" : `Show all ${filtered.length}`}
          </button>
        )}
        <p className="text-[11px] text-slate-400">Delivery times shown in Norway time. Showing the latest 50 emails.</p>
      </div>
    </section>
  );
}
