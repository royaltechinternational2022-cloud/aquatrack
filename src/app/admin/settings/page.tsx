"use client";

import { useEffect, useState } from "react";

const ALL_PAYMENT_METHODS = [
  { key: "CASH", label: "Cash" },
  { key: "CARD", label: "Card" },
  { key: "BANK_TRANSFER", label: "Bank Transfer" },
  { key: "OTHER", label: "Other" },
];

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function SettingsPage() {
  return (
    <div className="px-5 py-6 max-w-lg mx-auto w-full space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Settings</h1>
      <PricingSection />
      <PaymentMethodsSection />
      <MeterAlertSection />
      <ReportSettingsSection />
    </div>
  );
}

function SaveButton({ saving, saved }: { saving: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="w-full rounded-xl bg-cyan-600 text-white text-sm font-semibold py-3 disabled:opacity-60"
    >
      {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
    </button>
  );
}

function PricingSection() {
  const [mode, setMode] = useState("MANUAL");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/pricing-settings")
      .then((r) => r.json())
      .then((d) => {
        setMode(d.setting.pricingMode);
        setPricePerLiter(d.setting.pricePerLiter ? String(d.setting.pricePerLiter) : "");
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/pricing-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pricingMode: mode,
        pricePerLiter: mode === "PER_LITER" ? parseFloat(pricePerLiter) : undefined,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-slate-700 text-sm">Pricing Mode</h2>
      <div className="space-y-2">
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <input type="radio" checked={mode === "MANUAL"} onChange={() => setMode("MANUAL")} />
          <div>
            <p className="font-semibold text-slate-700">Manual Pricing</p>
            <p className="text-xs text-slate-400">Employee enters liters and amount</p>
          </div>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <input type="radio" checked={mode === "PER_LITER"} onChange={() => setMode("PER_LITER")} />
          <div>
            <p className="font-semibold text-slate-700">Fixed Price Per Liter</p>
            <p className="text-xs text-slate-400">Amount is calculated automatically</p>
          </div>
        </label>
      </div>

      {mode === "PER_LITER" && (
        <div>
          <label className="block text-xs text-slate-400 mb-1">Price per liter (Rs.)</label>
          <input
            type="number"
            step="0.01"
            required
            value={pricePerLiter}
            onChange={(e) => setPricePerLiter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
        </div>
      )}

      <SaveButton saving={saving} saved={saved} />
    </form>
  );
}

function PaymentMethodsSection() {
  const [enabled, setEnabled] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/app-settings")
      .then((r) => r.json())
      .then((d) => setEnabled(d.settings.enabledPaymentMethods));
  }, []);

  function toggle(key: string) {
    setEnabled((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/app-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabledPaymentMethods: enabled }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-slate-700 text-sm">Payment Methods</h2>
      <div className="grid grid-cols-2 gap-2">
        {ALL_PAYMENT_METHODS.map((m) => (
          <label key={m.key} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
            <input type="checkbox" checked={enabled.includes(m.key)} onChange={() => toggle(m.key)} />
            {m.label}
          </label>
        ))}
      </div>
      <SaveButton saving={saving} saved={saved} />
    </form>
  );
}

function MeterAlertSection() {
  const [referencePrice, setReferencePrice] = useState("4");
  const [thresholdPct, setThresholdPct] = useState("15");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/app-settings")
      .then((r) => r.json())
      .then((d) => {
        setReferencePrice(String(d.settings.meterReferencePricePerLiter));
        setThresholdPct(String(d.settings.meterDiscrepancyThresholdPct));
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/app-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meterReferencePricePerLiter: parseFloat(referencePrice),
        meterDiscrepancyThresholdPct: parseFloat(thresholdPct),
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-slate-700 text-sm">Vannmåler-varsel</h2>
      <p className="text-xs text-slate-400">
        Sammenligner målerdifferanse (til referansepris) mot registrert salg hver dag. Ved stort avvik får eier
        varsel i den daglige e-postrapporten.
      </p>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Referansepris per liter (Rs.)</label>
        <input
          type="number"
          step="0.01"
          required
          value={referencePrice}
          onChange={(e) => setReferencePrice(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Varsle ved avvik større enn (%)</label>
        <input
          type="number"
          step="1"
          required
          value={thresholdPct}
          onChange={(e) => setThresholdPct(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>
      <SaveButton saving={saving} saved={saved} />
    </form>
  );
}

function ReportSettingsSection() {
  const [recipients, setRecipients] = useState("");
  const [dailyEnabled, setDailyEnabled] = useState(true);
  const [dailyTime, setDailyTime] = useState("22:00");
  const [weeklyEnabled, setWeeklyEnabled] = useState(true);
  const [weeklyDay, setWeeklyDay] = useState("Sunday");
  const [monthlyEnabled, setMonthlyEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/report-settings")
      .then((r) => r.json())
      .then((d) => {
        setRecipients((d.settings.recipientEmails as string[]).join(", "));
        setDailyEnabled(d.settings.dailyEnabled);
        setDailyTime(d.settings.dailyTime);
        setWeeklyEnabled(d.settings.weeklyEnabled);
        setWeeklyDay(d.settings.weeklyDay);
        setMonthlyEnabled(d.settings.monthlyEnabled);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await fetch("/api/report-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientEmails: recipients
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        dailyEnabled,
        dailyTime,
        weeklyEnabled,
        weeklyDay,
        monthlyEnabled,
      }),
    });
    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={save} className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-4">
      <h2 className="font-bold text-slate-700 text-sm">Email Reports</h2>

      <div>
        <label className="block text-xs text-slate-400 mb-1">Recipient emails (comma separated)</label>
        <input
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          placeholder="owner@gmail.com"
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>

      <label className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Daily Report</span>
        <input type="checkbox" checked={dailyEnabled} onChange={(e) => setDailyEnabled(e.target.checked)} />
      </label>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Daily send time</label>
        <input
          type="time"
          value={dailyTime}
          onChange={(e) => setDailyTime(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />
      </div>

      <label className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Weekly Report</span>
        <input type="checkbox" checked={weeklyEnabled} onChange={(e) => setWeeklyEnabled(e.target.checked)} />
      </label>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Weekly send day</label>
        <select
          value={weeklyDay}
          onChange={(e) => setWeeklyDay(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        >
          {WEEKDAYS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      <label className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">Monthly Report</span>
        <input type="checkbox" checked={monthlyEnabled} onChange={(e) => setMonthlyEnabled(e.target.checked)} />
      </label>

      <p className="text-xs text-slate-400">Timezone: Asia/Colombo</p>

      <SaveButton saving={saving} saved={saved} />
    </form>
  );
}
