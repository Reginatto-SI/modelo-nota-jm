import type { Rft006Report, Rft006Situacao } from "./rft006";

export const RFT006_SITUACOES: Record<Rft006Situacao, { label: string; tone: "success" | "warning" | "error" }> = {
  pronto: { label: "Pronto", tone: "success" },
  cfop_nao_elegivel: { label: "CFOP não elegível", tone: "warning" },
  cfops_mistos: { label: "CFOPs mistos", tone: "error" },
  emitente_inconsistente: { label: "Emitente inconsistente", tone: "error" },
  dados_obrigatorios_ausentes: { label: "Dados obrigatórios ausentes", tone: "error" },
};

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
