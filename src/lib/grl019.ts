import * as XLSX from "xlsx";
import type { Grl019Report, Grl019Row } from "./types";

// Canonical header -> list of normalized aliases
const COLUMN_MAP: Record<keyof Omit<Grl019Row, "_raw">, string[]> = {
  contrato: ["contrato"],
  contratoVinculado: ["contratovinculado"],
  empresa: ["empresa"],
  tpFaturamento: ["tpfaturamento", "tipofaturamento"],
  codContrato: ["codcontrato", "codigocontrato"],
  descContrato: ["desccontrato", "descricaocontrato"],
  nomeRazaoSocial: ["nomerazaosocial", "nomerazao", "razaosocial"],
  cpfCnpj: ["cpfcnpj"],
  ie: ["ie", "inscricaoestadual"],
  endereco: ["endereco"],
  municipio: ["municipio"],
  estado: ["estado", "uf"],
  codItem: ["coditem", "codigoitem"],
  descItem: ["descitem", "descricaoitem"],
  precoUnitIcms: ["precounitcicms", "precounitariocicms", "precounitc icms", "precounit"],
  tpFrete: ["tpfrete", "tipofrete"],
  observacao: ["observacao", "observacoes", "obs"],
};

// columns that MUST be present for a valid GRL019
const REQUIRED: (keyof typeof COLUMN_MAP)[] = [
  "contrato",
  "contratoVinculado",
  "empresa",
  "tpFaturamento",
  "codContrato",
  "descContrato",
  "nomeRazaoSocial",
  "cpfCnpj",
  "codItem",
  "descItem",
  "precoUnitIcms",
];

function normalizeHeader(h: string): string {
  return h
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function toNumber(v: unknown): number {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return v;
  const s = v.toString().trim().replace(/\./g, "").replace(",", ".").replace(/[^0-9.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v == null) return "";
  return v.toString().trim();
}

export interface ParseResult {
  report?: Grl019Report;
  missingColumns: string[];
  error?: string;
}

export async function parseGrl019(file: File): Promise<ParseResult> {
  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

    if (rawRows.length === 0) {
      return { missingColumns: [], error: "O arquivo não contém linhas de dados." };
    }

    // Build header -> canonical key resolution from first row keys
    const headerKeys = Object.keys(rawRows[0]);
    const resolved: Partial<Record<keyof typeof COLUMN_MAP, string>> = {};
    for (const headerKey of headerKeys) {
      const norm = normalizeHeader(headerKey);
      for (const [canonical, aliases] of Object.entries(COLUMN_MAP)) {
        if (aliases.some((a) => norm === normalizeHeader(a) || norm.startsWith(normalizeHeader(a)))) {
          if (!resolved[canonical as keyof typeof COLUMN_MAP]) {
            resolved[canonical as keyof typeof COLUMN_MAP] = headerKey;
          }
        }
      }
    }

    const missingColumns = REQUIRED.filter((k) => !resolved[k]).map((k) => k);
    if (missingColumns.length > 0) {
      return { missingColumns };
    }

    const g = (raw: Record<string, unknown>, key: keyof typeof COLUMN_MAP) => {
      const hk = resolved[key];
      return hk ? raw[hk] : "";
    };

    const rows: Grl019Row[] = rawRows
      .map((raw) => ({
        contrato: str(g(raw, "contrato")),
        contratoVinculado: str(g(raw, "contratoVinculado")),
        empresa: str(g(raw, "empresa")),
        tpFaturamento: str(g(raw, "tpFaturamento")).toUpperCase(),
        codContrato: str(g(raw, "codContrato")),
        descContrato: str(g(raw, "descContrato")),
        nomeRazaoSocial: str(g(raw, "nomeRazaoSocial")),
        cpfCnpj: str(g(raw, "cpfCnpj")),
        ie: str(g(raw, "ie")),
        endereco: str(g(raw, "endereco")),
        municipio: str(g(raw, "municipio")),
        estado: str(g(raw, "estado")),
        codItem: str(g(raw, "codItem")),
        descItem: str(g(raw, "descItem")),
        precoUnitIcms: toNumber(g(raw, "precoUnitIcms")),
        tpFrete: str(g(raw, "tpFrete")),
        observacao: str(g(raw, "observacao")),
        _raw: raw,
      }))
      .filter((r) => r.contrato !== "");

    const empresas = Array.from(new Set(rows.map((r) => r.empresa).filter(Boolean)));

    return {
      missingColumns: [],
      report: {
        fileName: file.name,
        importedAt: new Date().toISOString(),
        rows,
        empresas,
      },
    };
  } catch (e) {
    return { missingColumns: [], error: e instanceof Error ? e.message : "Falha ao ler o arquivo." };
  }
}

// Find the linked contract row within the same report
export function findVinculado(report: Grl019Report, row: Grl019Row): Grl019Row | undefined {
  if (!row.contratoVinculado) return undefined;
  return report.rows.find((r) => r.contrato === row.contratoVinculado);
}

export interface ReportSummary {
  totalLinhas: number;
  recebimento: number;
  expedicao: number;
  vinculoLocalizado: number;
  vinculoAusente: number;
}

export function summarize(report: Grl019Report): ReportSummary {
  let recebimento = 0;
  let expedicao = 0;
  let vinculoLocalizado = 0;
  let vinculoAusente = 0;
  const ids = new Set(report.rows.map((r) => r.contrato));
  for (const r of report.rows) {
    if (r.tpFaturamento.includes("RECEB")) recebimento++;
    if (r.tpFaturamento.includes("EXPED")) expedicao++;
    if (r.contratoVinculado) {
      if (ids.has(r.contratoVinculado)) vinculoLocalizado++;
      else vinculoAusente++;
    }
  }
  return { totalLinhas: report.rows.length, recebimento, expedicao, vinculoLocalizado, vinculoAusente };
}
