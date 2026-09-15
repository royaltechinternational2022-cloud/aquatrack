"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatLiters, paymentLabel, formatAdminDateTime } from "@/lib/format";

interface AuditLog {
  id: string;
  oldValues: string;
  newValues: string;
  reason: string;
  createdAt: string;
  changedBy: { name: string };
}

interface Sale {
  id: string;
  transactionNumber: string;
  liters: number;
  amount: number;
  paymentMethod: string;
  status: string;
  flagged: boolean;
  flagReason: string | null;
  transactionDate: string;
  employee: { name: string; employeeCode: string | null };
  auditLogs: AuditLog[];
}

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [sale, setSale] = useState<Sale | null>(null);
  const [editing, setEditing] = useState(false);
  const [liters, setLiters] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/sales/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setSale(d.sale);
        setLiters(String(d.sale.liters));
        setAmount(String(d.sale.amount));
        setPaymentMethod(d.sale.paymentMethod);
      });
  }

  useEffect(load, [id]);

  async function submitCorrection(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!reason.trim()) {
      setError("Please explain why this transaction is being corrected.");
      return;
    }
    setSaving(true);
    const res = await fetch(`/api/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        liters: parseFloat(liters),
        amount: parseFloat(amount),
        paymentMethod,
        reason,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not save correction");
      return;
    }
    setEditing(false);
    setReason("");
    load();
  }

  if (!sale) {
    return <div className="px-5 py-6 text-slate-400 text-sm">Loading…</div>;
  }

  return (
    <div className="px-5 py-6 max-w-lg mx-auto w-full space-y-5">
      <button onClick={() => router.back()} className="text-slate-400 text-sm font-medium">
        ‹ Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-800">Transaction #{sale.transactionNumber}</h1>
        <p className="text-slate-400 text-sm">
          {formatAdminDateTime(sale.transactionDate, { dateStyle: "full", timeStyle: "short" })}
        </p>
        <p className="text-slate-300 text-xs mt-0.5">Times shown in Norway time</p>
      </div>

      {sale.flagged && (
        <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
          ⚠ Flagged at entry: {sale.flagReason}
        </div>
      )}

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-3">
        <DetailRow label="Liters" value={formatLiters(sale.liters)} />
        <DetailRow label="Amount" value={sale.amount === 0 ? "FREE" : formatMoney(sale.amount)} />
        <DetailRow label="Payment" value={paymentLabel(sale.paymentMethod)} />
        <DetailRow label="Employee" value={`${sale.employee.name}${sale.employee.employeeCode ? ` (${sale.employee.employeeCode})` : ""}`} />
        <DetailRow label="Status" value={sale.status === "CORRECTED" ? "Corrected" : "Completed"} />
      </div>

      {!editing ? (
        <button
          onClick={() => setEditing(true)}
          className="w-full rounded-2xl bg-slate-800 text-white text-sm font-semibold py-3.5"
        >
          Correct This Transaction
        </button>
      ) : (
        <form onSubmit={submitCorrection} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
          <h2 className="font-bold text-slate-700 text-sm">Correct Transaction</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Liters</label>
              <input
                type="number"
                step="0.1"
                value={liters}
                onChange={(e) => setLiters(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Amount (Rs.)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            >
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Reason for correction</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              placeholder="e.g. Incorrect liters entered by employee"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold py-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-cyan-600 text-white text-sm font-semibold py-3 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Correction"}
            </button>
          </div>
        </form>
      )}

      {sale.auditLogs.length > 0 && (
        <div>
          <h2 className="font-bold text-slate-700 text-sm mb-2">Correction History</h2>
          <div className="space-y-2">
            {sale.auditLogs.map((log) => {
              const oldV = JSON.parse(log.oldValues);
              const newV = JSON.parse(log.newValues);
              return (
                <div key={log.id} className="rounded-xl bg-white border border-slate-100 p-4 text-sm">
                  <p className="text-xs text-slate-400 mb-2">
                    {formatAdminDateTime(log.createdAt)} ·{" "}
                    {log.changedBy.name}
                  </p>
                  <p className="text-slate-600">
                    <span className="line-through text-slate-400">
                      {formatLiters(oldV.liters)} / {formatMoney(oldV.amount)}
                    </span>{" "}
                    → <span className="font-semibold">
                      {formatLiters(newV.liters)} / {formatMoney(newV.amount)}
                    </span>
                  </p>
                  <p className="text-slate-500 mt-1 italic">&ldquo;{log.reason}&rdquo;</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-sm">{label}</span>
      <span className="font-semibold text-slate-800 text-sm">{value}</span>
    </div>
  );
}
