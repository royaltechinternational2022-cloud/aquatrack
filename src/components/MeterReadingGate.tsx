"use client";

import { useState } from "react";
import NumericKeypad from "@/components/NumericKeypad";

interface MeterReadingGateProps {
  type: "OPENING" | "CLOSING";
  onDone: () => void;
}

const COPY = {
  OPENING: {
    title: "God morgen!",
    subtitle: "Registrer målerstanden på vannmåleren før du starter dagen.",
    label: "ÅPNINGSMÅLING",
    confirm: "START DAGEN",
  },
  CLOSING: {
    title: "Avslutter dagen?",
    subtitle: "Ingen har registrert sluttmåling for i dag ennå. Skriv inn målerstanden før du logger ut.",
    label: "SLUTTMÅLING",
    confirm: "LOGG UT",
  },
};

export default function MeterReadingGate({ type, onDone }: MeterReadingGateProps) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = COPY[type];

  async function submit() {
    const reading = parseFloat(value);
    if (!reading || reading < 0) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/meter-readings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, reading }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Kunne ikke lagre målingen. Prøv igjen.");
        setSaving(false);
        return;
      }
      onDone();
    } catch {
      setError("Ingen forbindelse. Prøv igjen.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col px-5 py-8 overflow-y-auto">
      <div className="max-w-md mx-auto w-full flex-1 flex flex-col">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-3xl bg-cyan-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">💧</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">{copy.title}</h1>
          <p className="text-slate-500 text-sm mt-1.5">{copy.subtitle}</p>
        </div>

        <p className="text-slate-400 text-sm font-medium tracking-wide mb-1 text-center">{copy.label}</p>
        <div className="rounded-3xl bg-white border border-slate-100 shadow-sm px-6 py-8 mb-6 text-center">
          <span className="text-4xl font-extrabold text-slate-800 tabular-nums">
            {value || "0"}
            <span className="text-xl text-slate-400 ml-2">m³</span>
          </span>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4 text-center">{error}</p>}

        <div className="flex-1 flex flex-col justify-end gap-6">
          <NumericKeypad value={value} onChange={setValue} />
          <button
            onClick={submit}
            disabled={!value || parseFloat(value) < 0 || saving}
            className="w-full rounded-2xl bg-cyan-600 disabled:opacity-40 text-white text-lg font-bold py-4 active:scale-[0.98] transition"
          >
            {saving ? "Lagrer…" : copy.confirm}
          </button>
        </div>
      </div>
    </div>
  );
}
