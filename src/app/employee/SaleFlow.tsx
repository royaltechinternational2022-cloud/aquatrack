"use client";

import { useEffect, useState } from "react";
import NumericKeypad from "@/components/NumericKeypad";
import { formatMoney, formatLiters, paymentLabel } from "@/lib/format";

const QUICK_LITERS = [5, 10, 20, 50, 100];
const ALL_PAYMENT_METHODS = ["CASH", "CARD", "BANK_TRANSFER", "OTHER"] as const;

type Step = "liters" | "customLiters" | "amount" | "payment" | "confirm" | "warning" | "saving" | "done";

interface Settings {
  pricingMode: "MANUAL" | "PER_LITER" | "PRODUCT";
  pricePerLiter: number | null;
  enabledPaymentMethods: string[];
}

export default function SaleFlow() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [step, setStep] = useState<Step>("liters");
  const [liters, setLiters] = useState<number | null>(null);
  const [customLitersInput, setCustomLitersInput] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string>("");
  const [warning, setWarning] = useState<{ reason?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSale, setLastSale] = useState<{ liters: number; amount: number; transactionNumber: string } | null>(
    null
  );

  useEffect(() => {
    Promise.all([
      fetch("/api/pricing-settings").then((r) => r.json()),
      fetch("/api/app-settings").then((r) => r.json()),
    ]).then(([pricing, app]) => {
      setSettings({
        pricingMode: pricing.setting.pricingMode,
        pricePerLiter: pricing.setting.pricePerLiter,
        enabledPaymentMethods: app.settings.enabledPaymentMethods,
      });
    });
  }, []);

  function resetForNewSale() {
    setStep("liters");
    setLiters(null);
    setCustomLitersInput("");
    setIsFree(false);
    setAmountInput("");
    setAmount(null);
    setPaymentMethod(null);
    setRequestId("");
    setWarning(null);
    setError(null);
  }

  const enabledMethods = settings
    ? ALL_PAYMENT_METHODS.filter((m) => settings.enabledPaymentMethods.includes(m))
    : [];

  /** Once liters + amount are both known, either auto-pick the sole payment method or ask for one. */
  function advanceAfterAmountKnown() {
    if (enabledMethods.length === 1) {
      setPaymentMethod(enabledMethods[0]);
      setStep("confirm");
    } else {
      setStep("payment");
    }
  }

  function chooseLiters(value: number) {
    setLiters(value);
    proceedAfterLiters(value);
  }

  function proceedAfterLiters(value: number) {
    if (isFree) {
      setAmount(0);
      advanceAfterAmountKnown();
    } else if (settings?.pricingMode === "PER_LITER" && settings.pricePerLiter) {
      setAmount(Number((value * settings.pricePerLiter).toFixed(2)));
      advanceAfterAmountKnown();
    } else {
      setAmountInput("");
      setStep("amount");
    }
  }

  function confirmCustomLiters() {
    const value = parseFloat(customLitersInput);
    if (!value || value <= 0) return;
    setLiters(value);
    proceedAfterLiters(value);
  }

  function confirmAmount() {
    const value = parseFloat(amountInput);
    if (!value || value <= 0) return;
    setAmount(value);
    advanceAfterAmountKnown();
  }

  function choosePayment(method: string) {
    setPaymentMethod(method);
    setStep("confirm");
  }

  async function submitSale(confirmedOverride = false) {
    if (!liters || amount === null || !paymentMethod) return;
    const id = requestId || crypto.randomUUID();
    if (!requestId) setRequestId(id);

    setStep("saving");
    setError(null);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: id,
          liters,
          ...(isFree ? { isFree: true } : { amount }),
          paymentMethod,
          confirmedOverride,
        }),
      });
      const data = await res.json();

      if (res.status === 409 && data.warning) {
        setWarning({ reason: data.reason });
        setStep("warning");
        return;
      }

      if (!res.ok) {
        setError(data.error ?? "Could not save the sale. Please try again.");
        setStep("confirm");
        return;
      }

      setLastSale({
        liters: data.sale.liters,
        amount: data.sale.amount,
        transactionNumber: data.sale.transactionNumber,
      });
      setStep("done");
    } catch {
      setError("Connection lost. Nothing was recorded — check your connection and try again.");
      setStep("confirm");
    }
  }

  if (!settings) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-5 py-6 max-w-md mx-auto w-full">
      {step === "liters" && (
        <StepLiters
          onQuick={chooseLiters}
          onCustom={() => setStep("customLiters")}
          isFree={isFree}
          onToggleFree={() => setIsFree((v) => !v)}
        />
      )}

      {step === "customLiters" && (
        <StepKeypad
          title="ENTER LITERS"
          unit="L"
          value={customLitersInput}
          onChange={setCustomLitersInput}
          onBack={() => setStep("liters")}
          onConfirm={confirmCustomLiters}
          confirmDisabled={!customLitersInput || parseFloat(customLitersInput) <= 0}
        />
      )}

      {step === "amount" && liters !== null && (
        <StepKeypad
          title="ENTER AMOUNT"
          unit="Rs."
          unitFirst
          value={amountInput}
          onChange={setAmountInput}
          onBack={() => setStep("liters")}
          onConfirm={confirmAmount}
          confirmDisabled={!amountInput || parseFloat(amountInput) <= 0}
          subtitle={`${formatLiters(liters)}`}
        />
      )}

      {step === "payment" && (
        <StepPayment
          methods={enabledMethods}
          onChoose={choosePayment}
          onBack={() => setStep(isFree || settings.pricingMode === "PER_LITER" ? "liters" : "amount")}
        />
      )}

      {step === "confirm" && liters !== null && amount !== null && paymentMethod && (
        <StepConfirm
          liters={liters}
          amount={amount}
          paymentMethod={paymentMethod}
          error={error}
          onEdit={() => setStep("liters")}
          onConfirm={() => submitSale(false)}
        />
      )}

      {step === "warning" && liters !== null && amount !== null && (
        <StepWarning
          liters={liters}
          amount={amount}
          reason={warning?.reason}
          onGoBack={() => setStep(isFree || settings.pricingMode === "PER_LITER" ? "liters" : "amount")}
          onConfirmAnyway={() => submitSale(true)}
        />
      )}

      {step === "saving" && <StepSaving />}

      {step === "done" && lastSale && <StepDone sale={lastSale} onNewSale={resetForNewSale} />}
    </div>
  );
}

function StepLiters({
  onQuick,
  onCustom,
  isFree,
  onToggleFree,
}: {
  onQuick: (v: number) => void;
  onCustom: () => void;
  isFree: boolean;
  onToggleFree: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-start justify-between mb-1">
        <h1 className="text-xl font-bold text-slate-800">New Sale</h1>
        <button
          onClick={onToggleFree}
          className={`shrink-0 px-3.5 py-2 rounded-full text-sm font-bold transition ${
            isFree ? "bg-amber-500 text-white" : "bg-white border border-slate-200 text-slate-500"
          }`}
        >
          🎁 FREE
        </button>
      </div>
      <p className="text-slate-400 text-sm mb-6">
        {isFree ? "This sale will be recorded as free — select liters" : "Select liters"}
      </p>
      <div className="grid grid-cols-2 gap-3">
        {QUICK_LITERS.map((v) => (
          <button
            key={v}
            onClick={() => onQuick(v)}
            className="h-28 rounded-3xl bg-white shadow-sm border border-slate-100 active:scale-[0.97] transition flex flex-col items-center justify-center"
          >
            <span className="text-3xl font-extrabold text-cyan-700">{v}</span>
            <span className="text-sm text-slate-400 font-medium mt-0.5">Liters</span>
          </button>
        ))}
        <button
          onClick={onCustom}
          className="h-28 rounded-3xl bg-cyan-600 active:scale-[0.97] transition flex flex-col items-center justify-center"
        >
          <span className="text-xl font-bold text-white">CUSTOM</span>
          <span className="text-xs text-cyan-100 mt-0.5">Enter manually</span>
        </button>
      </div>
    </div>
  );
}

function StepKeypad({
  title,
  unit,
  unitFirst,
  value,
  onChange,
  onBack,
  onConfirm,
  confirmDisabled,
  subtitle,
}: {
  title: string;
  unit: string;
  unitFirst?: boolean;
  value: string;
  onChange: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
  confirmDisabled: boolean;
  subtitle?: string;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <button onClick={onBack} className="self-start text-slate-400 text-sm font-medium mb-4">
        ‹ Back
      </button>
      <p className="text-slate-400 text-sm font-medium tracking-wide mb-1">{title}</p>
      {subtitle && <p className="text-slate-500 text-sm mb-2">{subtitle}</p>}
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm px-6 py-8 mb-6 text-center">
        <span className="text-4xl font-extrabold text-slate-800 tabular-nums">
          {unitFirst && <span className="text-2xl text-slate-400 mr-2">{unit}</span>}
          {value || "0"}
          {!unitFirst && <span className="text-2xl text-slate-400 ml-2">{unit}</span>}
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-end gap-6">
        <NumericKeypad value={value} onChange={onChange} />
        <button
          onClick={onConfirm}
          disabled={confirmDisabled}
          className="w-full rounded-2xl bg-cyan-600 disabled:opacity-40 text-white text-lg font-semibold py-4 active:scale-[0.98] transition"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function StepPayment({
  methods,
  onChoose,
  onBack,
}: {
  methods: readonly string[];
  onChoose: (m: string) => void;
  onBack: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <button onClick={onBack} className="self-start text-slate-400 text-sm font-medium mb-4">
        ‹ Back
      </button>
      <h2 className="text-xl font-bold text-slate-800 mb-6">Payment Method</h2>
      <div className="grid grid-cols-2 gap-3">
        {methods.map((m) => (
          <button
            key={m}
            onClick={() => onChoose(m)}
            className="h-24 rounded-3xl bg-white shadow-sm border border-slate-100 active:scale-[0.97] transition flex items-center justify-center"
          >
            <span className="text-lg font-bold text-slate-700">{paymentLabel(m)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function StepConfirm({
  liters,
  amount,
  paymentMethod,
  error,
  onEdit,
  onConfirm,
}: {
  liters: number;
  amount: number;
  paymentMethod: string;
  error: string | null;
  onEdit: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <h2 className="text-xl font-bold text-slate-800 mb-6">Confirm Sale</h2>
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 mb-6 space-y-4">
        <Row label="Liters" value={formatLiters(liters)} big />
        <Row label="Amount" value={amount === 0 ? "FREE" : formatMoney(amount)} big />
        <Row label="Payment" value={paymentLabel(paymentMethod)} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-4">{error}</p>}

      <div className="flex-1 flex flex-col justify-end gap-3">
        <button
          onClick={onConfirm}
          className="w-full rounded-2xl bg-cyan-600 text-white text-lg font-bold py-4 active:scale-[0.98] transition"
        >
          CONFIRM SALE
        </button>
        <button
          onClick={onEdit}
          className="w-full rounded-2xl bg-slate-100 text-slate-600 text-base font-semibold py-3.5 active:scale-[0.98] transition"
        >
          EDIT
        </button>
      </div>
    </div>
  );
}

function StepWarning({
  liters,
  amount,
  reason,
  onGoBack,
  onConfirmAnyway,
}: {
  liters: number;
  amount: number;
  reason?: string;
  onGoBack: () => void;
  onConfirmAnyway: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="rounded-3xl bg-amber-50 border border-amber-200 p-6 mb-6 text-center">
        <div className="text-3xl mb-2">⚠️</div>
        <h2 className="text-lg font-bold text-amber-800 mb-1">CHECK AMOUNT</h2>
        <p className="text-sm text-amber-700">{reason ?? "This amount looks unusual for this many liters."}</p>
      </div>
      <div className="rounded-3xl bg-white border border-slate-100 shadow-sm p-6 mb-6 space-y-4">
        <Row label="Liters" value={formatLiters(liters)} big />
        <Row label="Amount" value={formatMoney(amount)} big />
      </div>
      <div className="flex-1 flex flex-col justify-end gap-3">
        <button
          onClick={onGoBack}
          className="w-full rounded-2xl bg-slate-100 text-slate-700 text-base font-semibold py-3.5 active:scale-[0.98] transition"
        >
          GO BACK
        </button>
        <button
          onClick={onConfirmAnyway}
          className="w-full rounded-2xl bg-amber-500 text-white text-lg font-bold py-4 active:scale-[0.98] transition"
        >
          CONFIRM ANYWAY
        </button>
      </div>
    </div>
  );
}

function StepSaving() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-full border-4 border-cyan-200 border-t-cyan-600 animate-spin" />
      <p className="text-slate-500 font-medium">SAVING…</p>
    </div>
  );
}

function StepDone({
  sale,
  onNewSale,
}: {
  sale: { liters: number; amount: number; transactionNumber: string };
  onNewSale: () => void;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-2">
        <span className="text-emerald-600 text-3xl">✓</span>
      </div>
      <h2 className="text-xl font-bold text-slate-800">SALE RECORDED</h2>
      <p className="text-3xl font-extrabold text-cyan-700 mt-2">{formatLiters(sale.liters)}</p>
      <p className="text-2xl font-bold text-slate-700">{sale.amount === 0 ? "FREE" : formatMoney(sale.amount)}</p>
      <p className="text-xs text-slate-400 mt-1">#{sale.transactionNumber}</p>

      <button
        onClick={onNewSale}
        className="mt-10 w-full max-w-xs rounded-2xl bg-cyan-600 text-white text-lg font-bold py-4 active:scale-[0.98] transition"
      >
        NEW SALE
      </button>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-sm font-medium">{label}</span>
      <span className={big ? "text-2xl font-extrabold text-slate-800" : "text-base font-semibold text-slate-700"}>
        {value}
      </span>
    </div>
  );
}
