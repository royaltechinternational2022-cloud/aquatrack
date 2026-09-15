export function formatMoney(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
}

export function formatLiters(liters: number): string {
  return `${liters.toLocaleString("en-LK", { maximumFractionDigits: 1 })} L`;
}

// The owner views the dashboard from Norway; employees operate on the ground
// in Sri Lanka. Business-day boundaries and report periods always stay on
// Sri Lanka time (see src/lib/tz.ts) — only the clock display splits here.
const ADMIN_DISPLAY_TIMEZONE = "Europe/Oslo";
const EMPLOYEE_DISPLAY_TIMEZONE = "Asia/Colombo";

export function formatAdminDateTime(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium", timeStyle: "short" }
): string {
  return new Date(date).toLocaleString("en-LK", { ...opts, timeZone: ADMIN_DISPLAY_TIMEZONE });
}

export function formatAdminDate(
  date: string | Date,
  opts: Intl.DateTimeFormatOptions = { dateStyle: "medium" }
): string {
  return new Date(date).toLocaleDateString("en-LK", { ...opts, timeZone: ADMIN_DISPLAY_TIMEZONE });
}

export function formatEmployeeTime(date: string | Date): string {
  return new Date(date).toLocaleTimeString("en-LK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: EMPLOYEE_DISPLAY_TIMEZONE,
  });
}

export function paymentLabel(method: string): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "CARD":
      return "Card";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    default:
      return "Other";
  }
}
