"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatLiters } from "@/lib/format";

interface Employee {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  employeeCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface Perf {
  liters: number;
  revenue: number;
  transactions: number;
}

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = usePromise(params);
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [filter, setFilter] = useState("today");
  const [perf, setPerf] = useState<Perf>({ liters: 0, revenue: 0, transactions: 0 });
  const [newPassword, setNewPassword] = useState("");
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  function load() {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((d) => setEmployee(d.employee));
  }

  useEffect(load, [id]);

  useEffect(() => {
    fetch(`/api/stats/employees?period=${filter}`)
      .then((r) => r.json())
      .then((d) => {
        const row = d.breakdown.find((b: { employeeId: string }) => b.employeeId === id);
        setPerf(row ?? { liters: 0, revenue: 0, transactions: 0 });
      });
  }, [id, filter]);

  async function toggleStatus() {
    if (!employee) return;
    const nextStatus = employee.status === "ACTIVE" ? "DISABLED" : "ACTIVE";
    await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    load();
  }

  async function resetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg(null);
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });
    if (res.ok) {
      setResetMsg("Password updated.");
      setNewPassword("");
    } else {
      setResetMsg("Could not update password.");
    }
  }

  if (!employee) return <div className="px-5 py-6 text-slate-400 text-sm">Loading…</div>;

  return (
    <div className="px-5 py-6 max-w-lg mx-auto w-full space-y-5">
      <button onClick={() => router.back()} className="text-slate-400 text-sm font-medium">
        ‹ Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-slate-800">{employee.name}</h1>
        <p className="text-slate-400 text-sm">
          @{employee.username} {employee.employeeCode ? `· ${employee.employeeCode}` : ""}
        </p>
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-2 text-sm">
        <DetailRow label="Role" value={employee.role} />
        <DetailRow label="Status" value={employee.status} />
        <DetailRow label="Created" value={new Date(employee.createdAt).toLocaleDateString("en-LK")} />
        <DetailRow
          label="Last Login"
          value={employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString("en-LK") : "Never"}
        />
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold ${
              filter === f.key ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-lg font-extrabold text-cyan-700">{formatLiters(perf.liters)}</p>
          <p className="text-[11px] text-slate-400">Liters Sold</p>
        </div>
        <div>
          <p className="text-lg font-extrabold text-cyan-700">{formatMoney(perf.revenue)}</p>
          <p className="text-[11px] text-slate-400">Revenue</p>
        </div>
        <div>
          <p className="text-lg font-extrabold text-cyan-700">{perf.transactions}</p>
          <p className="text-[11px] text-slate-400">Transactions</p>
        </div>
      </div>

      {employee.role === "EMPLOYEE" && (
        <button
          onClick={toggleStatus}
          className={`w-full rounded-2xl text-sm font-semibold py-3.5 ${
            employee.status === "ACTIVE" ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {employee.status === "ACTIVE" ? "Disable Account" : "Re-enable Account"}
        </button>
      )}

      <form onSubmit={resetPassword} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-3">
        <h2 className="font-bold text-slate-700 text-sm">Reset Password</h2>
        <input
          type="text"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={6}
          placeholder="New password"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
        {resetMsg && <p className="text-sm text-slate-500">{resetMsg}</p>}
        <button type="submit" className="w-full rounded-xl bg-slate-800 text-white text-sm font-semibold py-3">
          Set New Password
        </button>
      </form>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
