"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { formatMoney, formatLiters, paymentLabel, formatAdminDateTime } from "@/lib/format";

interface Sale {
  id: string;
  transactionNumber: string;
  liters: number;
  amount: number;
  paymentMethod: string;
  status: string;
  flagged: boolean;
  transactionDate: string;
  employee: { name: string };
}

interface Employee {
  id: string;
  name: string;
}

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "", label: "All" },
];

function csvCell(value: string | number): string {
  let text = String(value);
  // Stop a spreadsheet from treating text such as an employee name as a formula.
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export default function TransactionsPage() {
  return (
    <Suspense>
      <TransactionsList />
    </Suspense>
  );
}

function TransactionsList() {
  // Filters live in the URL so Back from a transaction returns to the same list.
  const initial = useSearchParams();
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(Math.max(1, Number(initial.get("page")) || 1));
  const [period, setPeriod] = useState(initial.get("period") ?? "today");
  const [employeeId, setEmployeeId] = useState(initial.get("employeeId") ?? "");
  const [paymentMethod, setPaymentMethod] = useState(initial.get("paymentMethod") ?? "");
  const [search, setSearch] = useState(initial.get("search") ?? "");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [exporting, setExporting] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees.filter((e: { role: string }) => e.role === "EMPLOYEE")));
  }, []);

  const buildFilters = useCallback(() => {
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (employeeId) params.set("employeeId", employeeId);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (search) params.set("search", search);
    return params;
  }, [period, employeeId, paymentMethod, search]);

  const load = useCallback(() => {
    const params = buildFilters();
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    fetch(`/api/sales?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setSales(d.sales);
        setTotal(d.total);
        // Deleting the only row on the last page leaves this page empty on return.
        if (d.sales.length === 0 && d.total > 0) setPage(Math.ceil(d.total / pageSize));
      });
  }, [buildFilters, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const params = buildFilters();
    // "All" sends no period to the API, but must stay distinct from the default here.
    if (!period) params.set("period", "");
    if (page > 1) params.set("page", String(page));
    window.history.replaceState(null, "", `?${params.toString()}`);
  }, [buildFilters, period, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function exportCsv() {
    setExporting(true);
    const rows: Sale[] = [];
    for (let p = 1; ; p++) {
      const params = buildFilters();
      params.set("page", String(p));
      params.set("pageSize", "100");
      const data = await fetch(`/api/sales?${params.toString()}`).then((r) => r.json());
      rows.push(...data.sales);
      if (rows.length >= data.total || data.sales.length === 0) break;
    }
    const header = ["Transaction", "Date (Norway time)", "Employee", "Liters", "Amount (Rs.)", "Payment", "Status", "Flagged"];
    const lines = rows.map((s) =>
      [
        s.transactionNumber,
        formatAdminDateTime(s.transactionDate),
        s.employee.name,
        s.liters,
        s.amount,
        paymentLabel(s.paymentMethod),
        s.status === "CORRECTED" ? "Corrected" : "Completed",
        s.flagged ? "Yes" : "No",
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob([[header.map(csvCell).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  return (
    <div className="px-5 py-6 max-w-3xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Transactions</h1>
          <p className="text-slate-400 text-xs">
            {total} found · Times shown in Norway time
          </p>
        </div>
        <button
          onClick={exportCsv}
          disabled={exporting || total === 0}
          className="text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-full px-4 py-2 disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>

      <input
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(1);
        }}
        placeholder="Search by transaction ID (e.g. WS1054)"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => {
              setPeriod(p.key);
              setPage(1);
            }}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold ${
              period === p.key ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-500"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <select
          value={employeeId}
          onChange={(e) => {
            setEmployeeId(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
        <select
          value={paymentMethod}
          onChange={(e) => {
            setPaymentMethod(e.target.value);
            setPage(1);
          }}
          className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
        >
          <option value="">All payments</option>
          <option value="CASH">Cash</option>
          <option value="CARD">Card</option>
          <option value="BANK_TRANSFER">Bank Transfer</option>
          <option value="OTHER">Other</option>
        </select>
      </div>

      <div className="space-y-2">
        {sales.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">No transactions found.</p>}
        {sales.map((sale) => (
          <Link
            key={sale.id}
            href={`/admin/transactions/${sale.id}`}
            className="flex items-center gap-3 rounded-2xl bg-white border border-slate-100 shadow-sm p-4 transition-colors hover:bg-slate-50 active:bg-slate-100"
          >
            <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold text-slate-800 text-sm">
                  #{sale.transactionNumber}
                  {sale.status === "CORRECTED" && (
                    <span className="ml-2 text-[10px] font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      CORRECTED
                    </span>
                  )}
                  {sale.flagged && (
                    <span className="ml-2 text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">
                      FLAGGED
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {sale.employee.name} · {formatAdminDateTime(sale.transactionDate)}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold text-cyan-700">
                  {sale.amount === 0 ? (
                    <span className="text-amber-600">FREE</span>
                  ) : (
                    formatMoney(sale.amount)
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {formatLiters(sale.liters)} · {paymentLabel(sale.paymentMethod)}
                </p>
              </div>
            </div>
            <span className="text-slate-300" aria-hidden="true">›</span>
          </Link>
        ))}
      </div>

      {total > pageSize && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
