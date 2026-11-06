"use client";

import { useEffect, useState, use as usePromise } from "react";
import { useRouter } from "next/navigation";
import { formatMoney, formatLiters, formatAdminDate, formatAdminDateTime } from "@/lib/format";
import { RemoveEmployeeDialog } from "../RemoveEmployeeDialog";

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
  _count: { sales: number; meterReadings: number };
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
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [detailsMsg, setDetailsMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [openForm, setOpenForm] = useState<"details" | "password" | null>(null);

  function toggleForm(form: "details" | "password") {
    setDetailsMsg(null);
    setResetMsg(null);
    setNewPassword("");
    if (employee) {
      setEditName(employee.name);
      setEditUsername(employee.username);
      setEditEmail(employee.email ?? "");
    }
    setOpenForm((current) => (current === form ? null : form));
  }

  function returnToTeam() {
    // Back keeps the list's filters; a directly opened link has nothing to go back to.
    if (window.history.length > 1) router.back();
    else router.push("/admin/employees");
  }

  function load() {
    fetch(`/api/employees/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setEmployee(d.employee);
        setEditName(d.employee.name);
        setEditUsername(d.employee.username);
        setEditEmail(d.employee.email ?? "");
      });
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

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    setDetailsMsg(null);
    setSavingDetails(true);
    const res = await fetch(`/api/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, username: editUsername, email: editEmail }),
    });
    setSavingDetails(false);
    if (res.ok) {
      setDetailsMsg({ ok: true, text: "Details saved." });
      load();
    } else {
      const data = await res.json().catch(() => null);
      setDetailsMsg({ ok: false, text: data?.error ?? "Could not save details." });
    }
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
        <DetailRow label="Email" value={employee.email ?? "Not set"} />
        <DetailRow label="Status" value={employee.status} />
        <DetailRow label="Created" value={formatAdminDate(employee.createdAt)} />
        <DetailRow
          label="Last Login"
          value={employee.lastLoginAt ? formatAdminDateTime(employee.lastLoginAt) : "Never"}
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

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Manage Account</h2>
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm divide-y divide-slate-100 overflow-hidden">
          <ActionRow label="Edit Details" expanded={openForm === "details"} onClick={() => toggleForm("details")} />
          {openForm === "details" && (
            <form onSubmit={saveDetails} className="p-4 space-y-3 bg-slate-50">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Full name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  minLength={2}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Username</label>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  minLength={3}
                  autoCapitalize="none"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  autoCapitalize="none"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                />
              </div>
              {detailsMsg && (
                <p className={`text-sm ${detailsMsg.ok ? "text-emerald-600" : "text-red-600"}`}>{detailsMsg.text}</p>
              )}
              <button
                type="submit"
                disabled={savingDetails}
                className="w-full rounded-xl bg-cyan-600 text-white text-sm font-semibold py-3 disabled:opacity-60"
              >
                {savingDetails ? "Saving…" : "Save Details"}
              </button>
            </form>
          )}

          <ActionRow label="Reset Password" expanded={openForm === "password"} onClick={() => toggleForm("password")} />
          {openForm === "password" && (
            <form onSubmit={resetPassword} className="p-4 space-y-3 bg-slate-50">
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="New password"
                autoCapitalize="none"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              />
              {resetMsg && <p className="text-sm text-slate-500">{resetMsg}</p>}
              <button type="submit" className="w-full rounded-xl bg-slate-800 text-white text-sm font-semibold py-3">
                Set New Password
              </button>
            </form>
          )}

          {employee.role === "EMPLOYEE" && (
            <>
              <button
                onClick={toggleStatus}
                className={`w-full text-left px-4 py-3.5 text-sm font-semibold ${
                  employee.status === "ACTIVE" ? "text-slate-700" : "text-emerald-700"
                }`}
              >
                {employee.status === "ACTIVE" ? "Disable Account" : "Re-enable Account"}
              </button>
              <button
                onClick={() => setRemoving(true)}
                className="w-full text-left px-4 py-3.5 text-sm font-semibold text-red-600"
              >
                Remove Employee
              </button>
            </>
          )}
        </div>
      </section>

      {removing && (
        <RemoveEmployeeDialog
          employee={employee}
          onClose={() => setRemoving(false)}
          onChanged={(result) => {
            setRemoving(false);
            if (result === "removed") returnToTeam();
            else load();
          }}
        />
      )}
    </div>
  );
}

function ActionRow({ label, expanded, onClick }: { label: string; expanded: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className="w-full flex items-center justify-between px-4 py-3.5 text-sm font-semibold text-slate-700"
    >
      {label}
      <span className={`text-slate-300 transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden="true">
        ›
      </span>
    </button>
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
