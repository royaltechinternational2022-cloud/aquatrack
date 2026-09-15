"use client";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

export default function NumericKeypad({
  value,
  onChange,
  maxLength = 8,
}: {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
}) {
  function press(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (key === "." && value.includes(".")) return;
    if (value.length >= maxLength) return;
    onChange(value + key);
  }

  return (
    <div className="grid grid-cols-3 gap-2.5 w-full max-w-sm mx-auto">
      {KEYS.map((key) => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          className="h-16 rounded-2xl bg-slate-100 active:bg-slate-200 text-2xl font-semibold text-slate-800 flex items-center justify-center select-none"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
