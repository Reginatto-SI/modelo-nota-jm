export function parseDecimalBR(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  if (!/^-?\d*(\.\d*)?$/.test(normalized) || normalized === "" || normalized === "-" || normalized === ".") {
    return null;
  }
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDecimalBR(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function parseCurrencyBR(value: string): number | null {
  return parseDecimalBR(value);
}

export function formatCurrencyBR(value: number): string {
  if (!Number.isFinite(value)) return "";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatUnitValueBR(value: number): string {
  if (!Number.isFinite(value)) return "";
  const decimals = Math.min(8, Math.max(2, neededDecimals(value, 8)));
  return formatDecimalBR(value, decimals);
}

function neededDecimals(value: number, maxDecimals: number): number {
  const fixed = value.toFixed(maxDecimals);
  const [, decimal = ""] = fixed.split(".");
  return decimal.replace(/0+$/, "").length;
}
