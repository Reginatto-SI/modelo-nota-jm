import * as XLSX from "xlsx";
import type { Grl019Report, Grl019Row, ReportSource } from "./types";

type Grl019ColumnKey = keyof Omit<Grl019Row, "_raw">;

export const COLUMN_LABELS: Record<Grl019ColumnKey, string> = {
  contrato: "CONTRATO",
  contratoVinculado: "CONTRATO VINCULADO",
  contratoCliente: "CONTRATO CLIENTE",
  empresa: "EMPRESA",
  tpFaturamento: "TP FATURAMENTO",
  codContrato: "COD.CONTRATO",
  descContrato: "DESC.CONTRATO",
  nomeRazaoSocial: "NOME/RAZÃO SOCIAL",
  cpfCnpj: "CPF/CNPJ",
  ie: "I.E.",
  endereco: "ENDEREÇO",
  municipio: "MUNICÍPIO",
  estado: "ESTADO",
  codItem: "COD.ITEM",
  descItem: "DESC.ITEM",
  precoUnitIcms: "PREÇO UNIT. C/ICMS",
  moeda: "MOEDA",
  tpFrete: "TP FRETE",
  observacao: "OBSERVAÇÃO",
};

// Canonical header -> list of normalized aliases
const COLUMN_MAP: Record<Grl019ColumnKey, string[]> = {
  contrato: ["contrato"],
  contratoVinculado: ["contratovinculado"],
  contratoCliente: ["contratocliente"],
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
  precoUnitIcms: ["precounitcicms", "precounitariocicms", "precounit"],
  moeda: ["moeda"],
  tpFrete: ["tpfrete", "tipofrete"],
  observacao: ["observacao", "observacoes", "obs"],
};

// Colunas que bloqueiam a importação quando ausentes.
// CONTRATO CLIENTE não é exigida neste projeto porque o fluxo atual não usa essa informação.
const REQUIRED: Grl019ColumnKey[] = [
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

const RECOMMENDED: Grl019ColumnKey[] = ["ie", "endereco", "municipio", "estado", "moeda", "tpFrete", "observacao"];
const HEADER_DETECTION_REQUIRED: Grl019ColumnKey[] = [
  "contrato",
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
const EXPECTED_GRL019_HEADER_ROW = 6;
export const MODELO_JM_SHEET_NAME = "Modelo JM";
const MODELO_JM_FILE_NAME = "modelo_importacao_jm.xlsx";
const MODELO_JM_COLUMN_ORDER: Grl019ColumnKey[] = [
  "contrato",
  "contratoVinculado",
  "empresa",
  "tpFaturamento",
  "codContrato",
  "descContrato",
  "nomeRazaoSocial",
  "cpfCnpj",
  "ie",
  "endereco",
  "municipio",
  "estado",
  "codItem",
  "descItem",
  "precoUnitIcms",
  "tpFrete",
  "observacao",
  "contratoCliente",
  "moeda",
];

export const REQUIRED_COLUMN_LABELS = REQUIRED.map((key) => COLUMN_LABELS[key]);
export const RECOMMENDED_COLUMN_LABELS = RECOMMENDED.map((key) => COLUMN_LABELS[key]);

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

  const raw = v.toString().trim().replace(/[^0-9,.-]/g, "");
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  const normalized = hasComma
    ? raw.replace(/\./g, "").replace(",", ".")
    : hasDot
      ? raw
      : raw.replace(/[^0-9-]/g, "");
  const n = parseFloat(normalized);
  return isNaN(n) ? 0 : n;
}

function str(v: unknown): string {
  if (v == null) return "";
  return v.toString().trim();
}

function matchesColumn(header: string, key: Grl019ColumnKey): boolean {
  const norm = normalizeHeader(header);
  if (!norm) return false;

  return COLUMN_MAP[key].some((alias) => {
    const normalizedAlias = normalizeHeader(alias);
    if (norm === normalizedAlias) return true;

    // Só aceita prefixo para cabeçalhos numéricos/descrições que podem vir com sufixos do relatório.
    // Evita que CONTRATO CLIENTE seja confundido com CONTRATO.
    return ["precoUnitIcms", "codContrato", "descContrato", "codItem", "descItem"].includes(key) &&
      norm.startsWith(normalizedAlias);
  });
}

function resolveHeaders(headerValues: unknown[]): Partial<Record<Grl019ColumnKey, number>> {
  const resolved: Partial<Record<Grl019ColumnKey, number>> = {};

  headerValues.forEach((value, index) => {
    const header = str(value);
    if (!header) return;

    for (const canonical of Object.keys(COLUMN_MAP) as Grl019ColumnKey[]) {
      if (resolved[canonical] == null && matchesColumn(header, canonical)) {
        resolved[canonical] = index;
      }
    }
  });

  return resolved;
}

function getCell(raw: unknown[], index?: number) {
  return index == null ? "" : raw[index];
}

function toColumnLabels(keys: Grl019ColumnKey[]): string[] {
  return keys.map((key) => COLUMN_LABELS[key]);
}

function getRecognizedColumns(resolved: Partial<Record<Grl019ColumnKey, number>>): string[] {
  return (Object.keys(COLUMN_MAP) as Grl019ColumnKey[])
    .filter((key) => resolved[key] != null)
    .map((key) => COLUMN_LABELS[key]);
}

// Prioriza a aba do Modelo JM para permitir arquivos com instruções/abas auxiliares sem criar fluxo paralelo.
function detectReportSource(wb: XLSX.WorkBook): { sheetName: string; source: ReportSource } {
  const modeloJmSheet = wb.SheetNames.find((name) => name.trim().toLowerCase() === MODELO_JM_SHEET_NAME.toLowerCase());
  return modeloJmSheet
    ? { sheetName: modeloJmSheet, source: "modelo_jm" }
    : { sheetName: wb.SheetNames[0] ?? "-", source: "grl019" };
}

function findHeaderRow(rows: unknown[][]) {
  let best: { rowIndex: number; resolved: Partial<Record<Grl019ColumnKey, number>>; score: number } | null = null;

  // O GRL019 costuma trazer textos acima e cabeçalho na linha 6; por isso varremos as linhas
  // procurando as colunas principais, em vez de assumir a primeira linha da planilha.
  rows.forEach((row, rowIndex) => {
    const resolved = resolveHeaders(row);
    const score = HEADER_DETECTION_REQUIRED.filter((key) => resolved[key] != null).length;
    if (score === 0) return;

    const isExpectedLine = rowIndex + 1 === EXPECTED_GRL019_HEADER_ROW;
    const currentIsExpectedLine = best?.rowIndex != null && best.rowIndex + 1 === EXPECTED_GRL019_HEADER_ROW;
    if (!best || score > best.score || (score === best.score && isExpectedLine && !currentIsExpectedLine)) {
      best = { rowIndex, resolved, score };
    }
  });

  return best;
}

export interface ImportDiagnostics {
  fileName: string;
  source: ReportSource | null;
  sheetName: string;
  headerRow: number | null;
  foundColumns: string[];
  foundColumnCount: number;
  recognizedColumns: string[];
  recognizedColumnCount: number;
  requiredColumns: string[];
  recommendedColumns: string[];
  missingColumns: string[];
  missingRecommendedColumns: string[];
  errorMessage?: string;
}

export interface ParseResult {
  report?: Grl019Report;
  missingColumns: string[];
  missingRecommendedColumns: string[];
  diagnostics: ImportDiagnostics;
  error?: string;
}

export async function parseGrl019(file: File): Promise<ParseResult> {
  const baseDiagnostics: ImportDiagnostics = {
    fileName: file.name,
    source: null,
    sheetName: "-",
    headerRow: null,
    foundColumns: [],
    foundColumnCount: 0,
    recognizedColumns: [],
    recognizedColumnCount: 0,
    requiredColumns: REQUIRED_COLUMN_LABELS,
    recommendedColumns: RECOMMENDED_COLUMN_LABELS,
    missingColumns: [],
    missingRecommendedColumns: [],
  };

  try {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array", cellText: true, cellDates: false });
    const { sheetName, source } = detectReportSource(wb);
    const sheet = wb.Sheets[sheetName];

    if (!sheet) {
      const error = "O arquivo não contém abas.";
      return {
        missingColumns: [],
        missingRecommendedColumns: [],
        diagnostics: { ...baseDiagnostics, errorMessage: error },
        error,
      };
    }

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false, raw: false });
    const diagnosticsBase = { ...baseDiagnostics, sheetName, source };

    if (rows.length === 0) {
      return {
        missingColumns: [],
        missingRecommendedColumns: [],
        diagnostics: { ...diagnosticsBase, errorMessage: "O arquivo não contém linhas de dados." },
        error: "O arquivo não contém linhas de dados.",
      };
    }

    const header = findHeaderRow(rows);
    const expectedHeaderRow = rows[EXPECTED_GRL019_HEADER_ROW - 1] ?? [];
    const fallbackHeaderValues = expectedHeaderRow.some((value) => str(value))
      ? expectedHeaderRow
      : rows.find((row) => row.some((value) => str(value))) ?? [];
    const headerValues = header ? rows[header.rowIndex] : fallbackHeaderValues;
    const resolved = header?.resolved ?? {};
    const foundColumns = headerValues.map(str).filter(Boolean);
    const recognizedColumns = getRecognizedColumns(resolved);
    const missingColumnKeys = REQUIRED.filter((key) => resolved[key] == null);
    const missingRecommendedKeys = RECOMMENDED.filter((key) => resolved[key] == null);
    const diagnostics: ImportDiagnostics = {
      ...diagnosticsBase,
      headerRow: header ? header.rowIndex + 1 : null,
      foundColumns,
      foundColumnCount: foundColumns.length,
      recognizedColumns,
      recognizedColumnCount: recognizedColumns.length,
      missingColumns: toColumnLabels(missingColumnKeys),
      missingRecommendedColumns: toColumnLabels(missingRecommendedKeys),
    };

    if (!header) {
      const error = source === "modelo_jm"
        ? "A planilha importada não possui as colunas obrigatórias para geração dos modelos."
        : "Cabeçalho do GRL019 não identificado.";
      return {
        missingColumns: diagnostics.missingColumns,
        missingRecommendedColumns: diagnostics.missingRecommendedColumns,
        diagnostics: { ...diagnostics, errorMessage: error },
        error,
      };
    }

    if (missingColumnKeys.length > 0) {
      const errorMessage = "A planilha importada não possui as colunas obrigatórias para geração dos modelos.";
      return {
        missingColumns: diagnostics.missingColumns,
        missingRecommendedColumns: diagnostics.missingRecommendedColumns,
        diagnostics: { ...diagnostics, errorMessage },
      };
    }

    const dataRows = rows.slice(header.rowIndex + 1);
    const g = (raw: unknown[], key: Grl019ColumnKey) => getCell(raw, resolved[key]);

    const grlRows: Grl019Row[] = dataRows
      .map((raw) => ({
        contrato: str(g(raw, "contrato")),
        contratoVinculado: str(g(raw, "contratoVinculado")),
        contratoCliente: str(g(raw, "contratoCliente")),
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
        moeda: str(g(raw, "moeda")),
        tpFrete: str(g(raw, "tpFrete")),
        observacao: str(g(raw, "observacao")),
        _raw: Object.fromEntries(headerValues.map((headerValue, index) => [str(headerValue) || `COLUNA ${index + 1}`, raw[index]])),
      }))
      .filter((r) => r.contrato !== "");

    const empresas = Array.from(new Set(grlRows.map((r) => r.empresa).filter(Boolean)));

    return {
      missingColumns: [],
      missingRecommendedColumns: diagnostics.missingRecommendedColumns,
      diagnostics,
      report: {
        fileName: file.name,
        importedAt: new Date().toISOString(),
        rows: grlRows,
        empresas,
        sheetName,
        headerRow: diagnostics.headerRow ?? undefined,
        missingRecommendedColumns: diagnostics.missingRecommendedColumns,
        source,
      },
    };
  } catch (e) {
    return {
      missingColumns: [],
      missingRecommendedColumns: [],
      diagnostics: {
        ...baseDiagnostics,
        errorMessage: e instanceof Error ? e.message : "Falha ao ler o arquivo.",
      },
      error: e instanceof Error ? e.message : "Falha ao ler o arquivo.",
    };
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

export function shouldSyncArmazensFromReport(report: Grl019Report): boolean {
  // Pré-cadastro automático depende da semântica dos destinatários de EXPEDIÇÃO do GRL019 Maxicom.
  // No Modelo JM manual, dados incompletos poderiam criar/atualizar destinatários indevidamente.
  return report.source !== "modelo_jm";
}

export function buildModeloJmWorkbook(): XLSX.WorkBook {
  const headers = MODELO_JM_COLUMN_ORDER.map((key) => COLUMN_LABELS[key]);
  const instructions = [
    ["Instruções"],
    ["Não alterar o nome da aba Modelo JM."],
    ["Não remover nem renomear os cabeçalhos."],
    ["Manter contratos como texto para preservar letras e zeros à esquerda."],
    ["Preencher uma linha por contrato."],
    ["Para operação casada, preencher CONTRATO VINCULADO."],
    ["Usar o nome da cooperativa exatamente como cadastrado no sistema."],
    ["Usar TP FATURAMENTO compatível com o fluxo atual, exemplo RECEBIMENTO ou EXPEDIÇÃO."],
    ["Preço unitário deve ser o preço da saca em PREÇO UNIT. C/ICMS."],
  ];
  const example = [
    headers,
    [
      "001A",
      "002B",
      "COOPERATIVA EXEMPLO",
      "RECEBIMENTO",
      "0108",
      "VENDA CONTRA ORDEM",
      "PRODUTOR EXEMPLO",
      "000.000.000-00",
      "ISENTO",
      "ENDEREÇO EXEMPLO",
      "SORRISO",
      "MT",
      "SOJA",
      "SOJA EM GRÃOS",
      "120,00",
      "CIF",
      "EXEMPLO DE OBSERVAÇÃO",
      "CLI-0001",
      "R$",
    ],
  ];

  const wb = XLSX.utils.book_new();
  const modeloSheet = XLSX.utils.aoa_to_sheet([headers]);
  modeloSheet["!cols"] = headers.map((header) => ({ wch: Math.max(header.length + 2, 16) }));
  headers.forEach((_, index) => {
    const column = XLSX.utils.encode_col(index);
    for (let row = 2; row <= 1000; row += 1) {
      const cellAddress = `${column}${row}`;
      // Pré-formata as linhas de preenchimento como texto para proteger contratos com letras e zeros à esquerda.
      const cell = modeloSheet[cellAddress] ?? { t: "s", v: "" };
      cell.z = "@";
      modeloSheet[cellAddress] = cell;
    }
  });
  XLSX.utils.book_append_sheet(wb, modeloSheet, MODELO_JM_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(instructions), "Instruções");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(example), "Exemplo");
  return wb;
}

export function downloadModeloJm(): void {
  XLSX.writeFile(buildModeloJmWorkbook(), MODELO_JM_FILE_NAME, { bookType: "xlsx" });
}
