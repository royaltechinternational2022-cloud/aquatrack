"use client";

import { useEffect, useState } from "react";
import { formatMoney, formatLiters, paymentLabel, formatEmployeeTime } from "@/lib/format";

interface Sale {
  id: string;
  transactionNumber: string;
  liters: number;
  amount: number;
  paymentMethod: string;
  status: string;
  transactionDate: string;
}

export default function EmployeeHistoryPage() {
  const [sales, setSales] = useState<Sale[] | null>(null);

  useEffect(() => {
    fetch("/api/sales?period=today&pageSize=50")
      .then((r) => r.json())
      .then((data) => setSales(data.sales));
  }, []);

  return (
    <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
      <h1 className="text-xl font-bold text-slate-800 mb-1">My Sales</h1>
      <p className="text-slate-400 text-sm mb-6">Today</p>

      {sales === null && <p className="text-slate-400 text-sm">Loading…</p>}
      {sales?.length === 0 && <p className="text-slate-400 text-sm">No sales recorded yet today.</p>}

      <div className="space-y-3">
        {sales?.map((sale) => (
          <div key={sale.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{formatLiters(sale.liters)}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                #{sale.transactionNumber} · {paymentLabel(sale.paymentMethod)} ·{" "}
                {formatEmployeeTime(sale.transactionDate)}
              </p>
            </div>
            <p className="font-bold text-cyan-700">{formatMoney(sale.amount)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
