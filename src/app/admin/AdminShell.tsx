"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { href: "/admin", label: "Dashboard", match: (p: string) => p === "/admin" },
  { href: "/admin/transactions", label: "Sales", match: (p: string) => p.startsWith("/admin/transactions") },
  { href: "/admin/employees", label: "Team", match: (p: string) => p.startsWith("/admin/employees") },
  { href: "/admin/reports", label: "Reports", match: (p: string) => p.startsWith("/admin/reports") },
  { href: "/admin/settings", label: "Settings", match: (p: string) => p.startsWith("/admin/settings") },
];

export default function AdminShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 sticky top-0 z-10">
        <div>
          <p className="text-xs text-slate-400 leading-none">Owner</p>
          <p className="font-semibold text-slate-800 leading-tight">{name}</p>
        </div>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-500 px-3 py-2 rounded-xl hover:bg-slate-100"
        >
          Log Out
        </button>
      </header>

      <main className="flex-1 flex flex-col pb-2">{children}</main>

      <nav className="sticky bottom-0 bg-white border-t border-slate-100 flex">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                active ? "text-cyan-600" : "text-slate-400"
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${active ? "bg-cyan-600" : "bg-transparent"}`} />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
