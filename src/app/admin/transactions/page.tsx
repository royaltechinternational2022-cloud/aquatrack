"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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

export default function TransactionsPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [period, setPeriod] = useState("today");
  const [employeeId, setEmployeeId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [search, setSearch] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const pageSize = 20;

  useEffect(() => {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees.filter((e: { role: string }) => e.role === "EMPLOYEE")));
  }, []);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (period) params.set("period", period);
    if (employeeId) params.set("employeeId", employeeId);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);
    if (search) params.set("search", search);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));

    fetch(`/api/sales?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setSales(d.sales);
        setTotal(d.total);
      });
  }, [period, employeeId, paymentMethod, search, page]);

  useEffect(() => {
    setPage(1);
  }, [period, employeeId, paymentMethod, search]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="px-5 py-6 max-w-3xl mx-auto w-full space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Transactions</h1>
        <p className="text-slate-300 text-xs">Times shown in Norway time</p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by transaction ID (e.g. WS1054)"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500"
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
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
          onChange={(e) => setEmployeeId(e.target.value)}
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
          onChange={(e) => setPaymentMethod(e.target.value)}
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
            className="block rounded-2xl bg-white border border-slate-100 shadow-sm p-4"
          >
            <div className="flex items-center justify-between">
              <div>
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
              <div className="text-right">
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
