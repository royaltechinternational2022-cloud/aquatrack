"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import MeterReadingGate from "@/components/MeterReadingGate";

export default function EmployeeShell({
  name,
  needsOpeningReading,
  children,
}: {
  name: string;
  needsOpeningReading: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingEndDay, setCheckingEndDay] = useState(false);
  const [showClosingGate, setShowClosingGate] = useState(false);

  async function finishLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  // Plain logout: no meter prompt. Employees may log in/out several times a
  // day (lunch, a dropped session) without being asked for a closing reading
  // each time — that's now a deliberate, separate action below.
  async function handleLogoutClick() {
    await finishLogout();
  }

  // "End Day": the deliberate end-of-day action. Only this prompts for
  // the closing meter reading (skipped if someone already recorded it today).
  async function handleEndDayClick() {
    setCheckingEndDay(true);
    try {
      const res = await fetch("/api/meter-readings");
      const data = await res.json();
      if (!data.closing) {
        setShowClosingGate(true);
        setCheckingEndDay(false);
        return;
      }
    } catch {
      // If we can't check, don't block ending the day on a connection hiccup.
    }
    setCheckingEndDay(false);
    await finishLogout();
  }

  if (needsOpeningReading) {
    return <MeterReadingGate type="OPENING" onDone={() => router.refresh()} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {showClosingGate && <MeterReadingGate type="CLOSING" onDone={finishLogout} />}

      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-10 gap-2">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 leading-none">Signed in as</p>
          <p className="font-semibold text-slate-800 leading-tight truncate">{name}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleEndDayClick}
            disabled={checkingEndDay}
            className="text-xs font-semibold text-amber-700 bg-amber-50 px-3 py-2 rounded-xl hover:bg-amber-100 disabled:opacity-50"
          >
            End Day
          </button>
          <button
            onClick={handleLogoutClick}
            aria-label="Log out"
            className="text-sm font-medium text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100"
          >
            Log Out
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col">{children}</main>

      <nav className="sticky bottom-0 bg-white border-t border-slate-100 flex safe-area-bottom">
        <Link
          href="/employee"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium ${
            pathname === "/employee" ? "text-cyan-600" : "text-slate-400"
          }`}
        >
          <PlusIcon active={pathname === "/employee"} />
          New Sale
        </Link>
        <Link
          href="/employee/history"
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium ${
            pathname === "/employee/history" ? "text-cyan-600" : "text-slate-400"
          }`}
        >
          <ListIcon active={pathname === "/employee/history"} />
          History
        </Link>
      </nav>
    </div>
  );
}

function PlusIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke={active ? "#0891b2" : "#94a3b8"} strokeWidth="1.6" />
      <path d="M12 8v8M8 12h8" stroke={active ? "#0891b2" : "#94a3b8"} strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M4 6h16M4 12h16M4 18h10"
        stroke={active ? "#0891b2" : "#94a3b8"}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
