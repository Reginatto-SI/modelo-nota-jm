import type { Rft006NotaGroup, Rft006Report, Rft006Situacao } from "./rft006";

export const RFT006_SITUACOES: Record<Rft006Situacao, { label: string; tone: "success" | "warning" | "error" }> = {
  pronto: { label: "Pronto", tone: "success" },
  cfop_nao_elegivel: { label: "CFOP não elegível", tone: "warning" },
  cfops_mistos: { label: "CFOPs mistos", tone: "error" },
  emitente_inconsistente: { label: "Dados do emitente inconsistentes", tone: "error" },
  dados_obrigatorios_ausentes: { label: "Dado obrigatório ausente", tone: "error" },
};

export type Rft006ItemsFilter = "todos" | "um" | "mais_de_um";

export interface Rft006Filters {
  search: string;
  minValue: string;
  maxValue: string;
  situacao: Rft006Situacao | "todas";
  items: Rft006ItemsFilter;
}

export const EMPTY_RFT006_FILTERS: Rft006Filters = {
  search: "",
  minValue: "",
  maxValue: "",
  situacao: "todas",
  items: "todos",
};

// A mesma soma alimenta a exibição e os limites do filtro, evitando divergência visual.
export function getRft006NotaLiquidTotal(nota: Rft006NotaGroup): number {
  return nota.items.reduce((total, item) => total + (item.valorLiquido ?? 0), 0);
}

export function parseRft006CurrencyFilter(value: string): number | null {
  const normalized = value.trim().replace(/R\$/gi, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRft006Search(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
}

export function filterRft006Notas(notas: Rft006NotaGroup[], filters: Rft006Filters): Rft006NotaGroup[] {
  const search = normalizeRft006Search(filters.search.trim());
  const minValue = parseRft006CurrencyFilter(filters.minValue);
  const maxValue = parseRft006CurrencyFilter(filters.maxValue);

  return notas.filter((nota) => {
    const searchable = [nota.nota, nota.emitente.razaoSocial, nota.emitente.cnpj, nota.emitente.ie];
    if (search && !searchable.some((value) => normalizeRft006Search(value).includes(search))) return false;
    const liquidTotal = getRft006NotaLiquidTotal(nota);
    if (minValue !== null && liquidTotal < minValue) return false;
    if (maxValue !== null && liquidTotal > maxValue) return false;
    if (filters.situacao !== "todas" && nota.situacao !== filters.situacao) return false;
    if (filters.items === "um" && nota.items.length !== 1) return false;
    if (filters.items === "mais_de_um" && nota.items.length <= 1) return false;
    return true;
  });
}

export function summarizeRft006(report: Rft006Report) {
  const pronto = report.notas.filter((nota) => nota.situacao === "pronto").length;
  const naoElegivel = report.notas.filter((nota) => nota.situacao === "cfop_nao_elegivel").length;
  return {
    linhas: report.rows.length,
    notas: report.notas.length,
    prontas: pronto,
    naoElegiveis: naoElegivel,
    inconsistentes: report.notas.length - pronto - naoElegivel,
    diagnosticos: report.diagnostics.length,
  };
}
