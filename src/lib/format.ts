export function formatMoney(amount: number): string {
  return `Rs. ${amount.toLocaleString("en-LK", { maximumFractionDigits: 2 })}`;
}

export function formatLiters(liters: number): string {
  return `${liters.toLocaleString("en-LK", { maximumFractionDigits: 1 })} L`;
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
