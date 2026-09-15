"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Employee {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  employeeCode: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
      body: JSON.stringify({ name, username, password, role: "EMPLOYEE" }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Could not add employee");
      return;
    }
    setName("");
    setUsername("");
    setPassword("");
    setShowForm(false);
    load();
  }

  return (
    <div className="px-5 py-6 max-w-lg mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Team</h1>
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

      <div className="space-y-2">
        {employees.map((emp) => (
          <Link
            key={emp.id}
            href={`/admin/employees/${emp.id}`}
            className="block rounded-2xl bg-white border border-slate-100 shadow-sm p-4"
          >
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
              </div>
              <span className="text-slate-300">›</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
