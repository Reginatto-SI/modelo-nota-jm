import type { Grl019Row } from "./types";

export function normalizeTpFaturamento(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function isRecebimentoTpFaturamento(value: unknown) {
  const normalized = normalizeTpFaturamento(value);
  return normalized === "RECEBIMENTO" || normalized === "ENTRADA" || normalized.includes("RECEB");
}

export function isExpedicaoTpFaturamento(value: unknown) {
  const normalized = normalizeTpFaturamento(value);
  return normalized === "EXPEDICAO" || normalized === "SAIDA" || normalized.includes("EXPED");
}

export function sameTpFaturamento(a: unknown, b: unknown) {
  // Compara primeiro pela classificação de negócio para aceitar equivalências como ENTRADA/RECEBIMENTO e SAÍDA/EXPEDIÇÃO.
  if (isRecebimentoTpFaturamento(a) && isRecebimentoTpFaturamento(b)) return true;
  if (isExpedicaoTpFaturamento(a) && isExpedicaoTpFaturamento(b)) return true;
  return normalizeTpFaturamento(a) === normalizeTpFaturamento(b);
}

export function isRecebimentoContrato(row: Pick<Grl019Row, "tpFaturamento">) {
  return isRecebimentoTpFaturamento(row.tpFaturamento);
}

export function isExpedicaoContrato(row: Pick<Grl019Row, "tpFaturamento">) {
  return isExpedicaoTpFaturamento(row.tpFaturamento);
}
