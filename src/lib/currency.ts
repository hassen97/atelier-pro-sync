// Currency formatting utilities for Tunisian Dinar (TND)

export const CURRENCY = {
  code: "TND",
  symbol: "DT",
  name: "Dinar Tunisien",
  decimals: 3,
} as const;

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-TN", {
    minimumFractionDigits: CURRENCY.decimals,
    maximumFractionDigits: CURRENCY.decimals,
  }).format(amount) + " " + CURRENCY.symbol;
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1000000) {
    return (amount / 1000000).toFixed(1) + "M " + CURRENCY.symbol;
  }
  if (amount >= 1000) {
    return (amount / 1000).toFixed(1) + "K " + CURRENCY.symbol;
  }
  return formatCurrency(amount);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
}
