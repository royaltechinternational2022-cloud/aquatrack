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
  const [checkingClosing, setCheckingClosing] = useState(false);
  const [showClosingGate, setShowClosingGate] = useState(false);

  async function finishLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  async function handleLogoutClick() {
    setCheckingClosing(true);
    try {
      const res = await fetch("/api/meter-readings");
      const data = await res.json();
      if (!data.closing) {
        setShowClosingGate(true);
        setCheckingClosing(false);
        return;
      }
    } catch {
      // If we can't check, don't block logout on a connection hiccup.
    }
    setCheckingClosing(false);
    await finishLogout();
  }

  if (needsOpeningReading) {
    return <MeterReadingGate type="OPENING" onDone={() => router.refresh()} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {showClosingGate && <MeterReadingGate type="CLOSING" onDone={finishLogout} />}

      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div>
          <p className="text-xs text-slate-400 leading-none">Signed in as</p>
          <p className="font-semibold text-slate-800 leading-tight">{name}</p>
        </div>
        <button
          onClick={handleLogoutClick}
          disabled={checkingClosing}
          aria-label="Log out"
          className="text-sm font-medium text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100 disabled:opacity-50"
        >
          Log Out
        </button>
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
