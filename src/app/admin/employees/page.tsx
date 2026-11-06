"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatAdminDateTime } from "@/lib/format";
import { RemoveEmployeeDialog, type RemovableEmployee } from "./RemoveEmployeeDialog";

interface Employee extends RemovableEmployee {
  role: string;
  email: string | null;
  employeeCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

const STATUS_FILTERS = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "DISABLED", label: "Disabled" },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [removing, setRemoving] = useState<Employee | null>(null);

  function load() {
    fetch("/api/employees")
      .then((r) => r.json())
      .then((d) => setEmployees(d.employees));
  }

  useEffect(load, []);

  async function addEmployee(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, username, email, password, role: "EMPLOYEE" }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not add employee");
      return;
    }
    setName("");
    setUsername("");
    setEmail("");
    setPassword("");
    setShowForm(false);
    load();
  }

  async function setStatus(emp: Employee, status: "ACTIVE" | "DISABLED") {
    await fetch(`/api/employees/${emp.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  const staff = employees.filter((e) => e.role === "EMPLOYEE");
  const activeCount = staff.filter((e) => e.status === "ACTIVE").length;
  const query = search.trim().toLowerCase();
  const visible = employees.filter(
    (e) =>
      (statusFilter === "ALL" || e.status === statusFilter) &&
      (!query ||
        e.name.toLowerCase().includes(query) ||
        e.username.includes(query) ||
        (e.employeeCode ?? "").toLowerCase().includes(query))
  );

  return (
    <div className="px-5 py-6 max-w-lg mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Team</h1>
          <p className="text-slate-400 text-xs mt-0.5">
            {activeCount} active · {staff.length - activeCount} disabled
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-sm font-semibold text-white bg-cyan-600 rounded-full px-4 py-2"
        >
          {showForm ? "Cancel" : "+ Add Employee"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={addEmployee} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Username</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoCapitalize="none"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoCapitalize="none"
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Temporary password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-cyan-600 text-white text-sm font-semibold py-3 disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add Employee"}
          </button>
        </form>
      )}

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, username, or code"
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-500"
      />

      <div className="flex gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatusFilter(f.key)}
            className={`px-3.5 py-2 rounded-full text-xs font-semibold ${
              statusFilter === f.key ? "bg-cyan-600 text-white" : "bg-white border border-slate-200 text-slate-500"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length === 0 && <p className="text-slate-400 text-sm py-8 text-center">No team members found.</p>}
        {visible.map((emp) => (
          <div key={emp.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm">
            <Link href={`/admin/employees/${emp.id}`} className="block p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-800 text-sm">
                    {emp.name}{" "}
                    {emp.role === "ADMIN" && (
                      <span className="ml-1 text-[10px] font-semibold text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">
                        ADMIN
                      </span>
                    )}
                    {emp.status === "DISABLED" && (
                      <span className="ml-1 text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        DISABLED
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    @{emp.username} {emp.employeeCode ? `· ${emp.employeeCode}` : ""}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Last login: {emp.lastLoginAt ? formatAdminDateTime(emp.lastLoginAt) : "Never"}
                  </p>
                </div>
                <span className="text-slate-300">›</span>
              </div>
            </Link>
            {emp.role === "EMPLOYEE" && (
              <div className="flex border-t border-slate-100 text-xs font-semibold">
                <Link href={`/admin/employees/${emp.id}`} className="flex-1 py-2.5 text-center text-slate-600">
                  Edit
                </Link>
                <button
                  onClick={() => setStatus(emp, emp.status === "ACTIVE" ? "DISABLED" : "ACTIVE")}
                  className="flex-1 py-2.5 border-l border-slate-100 text-slate-600"
                >
                  {emp.status === "ACTIVE" ? "Disable" : "Enable"}
                </button>
                <button onClick={() => setRemoving(emp)} className="flex-1 py-2.5 border-l border-slate-100 text-red-600">
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {removing && (
        <RemoveEmployeeDialog
          employee={removing}
          onClose={() => setRemoving(null)}
          onChanged={() => {
            setRemoving(null);
            load();
          }}
        />
      )}
    </div>
  );
}
