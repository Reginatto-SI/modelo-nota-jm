import * as XLSX from "xlsx";

export type Rft006Situacao =
  | "pronto"
  | "cfop_nao_elegivel"
  | "cfops_mistos"
  | "emitente_inconsistente"
  | "dados_obrigatorios_ausentes";

export type Rft006DiagnosticCode =
  | "arquivo_sem_abas"
  | "arquivo_sem_dados"
  | "cabecalho_nao_identificado"
  | "coluna_obrigatoria_ausente"
  | "coluna_cfop_numerico_nao_identificada"
  | "nota_ausente"
  | "cfop_invalido"
  | "cfop_nao_elegivel"
  | "cfops_mistos"
  | "emitente_inconsistente"
  | "dados_obrigatorios_ausentes";

export interface Rft006Diagnostic {
  code: Rft006DiagnosticCode;
  message: string;
  severity: "error" | "warning";
  nota?: string;
  rowNumbers?: number[];
  columns?: string[];
}

export interface Rft006Item {
  descricao: string;
  ncm: string;
  unidade: string;
  quantidade: number | null;
  pesoLiquido: number | null;
  quantidadeOriginal: number | null;
  valorUnitario: number | null;
  valorTotal: number | null;
  valorDesconto: number | null;
  valorLiquido: number | null;
}

export interface Rft006Emitente {
  razaoSocial: string;
  cnpj: string;
  ie: string;
  municipio: string;
  clifor: string;
}

export interface Rft006Row {
  rowNumber: number;
  nota: string;
  contPed: string;
  cfop: string;
  cfopOriginal: unknown;
  elegivel: boolean;
  emitente: Rft006Emitente;
  item: Rft006Item;
  raw: Record<string, unknown>;
}

export interface Rft006NotaGroup {
  nota: string;
  emitente: Rft006Emitente;
  items: Rft006Item[];
  rows: Rft006Row[];
  situacao: Rft006Situacao;
  diagnostics: Rft006Diagnostic[];
}

export interface Rft006ImportDiagnostics {
  fileName: string;
  sheetName: string | null;
  headerRow: number | null;
  foundColumns: string[];
  recognizedColumns: string[];
  cfopColumn: number | null;
  diagnostics: Rft006Diagnostic[];
}

export interface Rft006Report {
  fileName: string;
  importedAt: string;
  sheetName: string;
  headerRow: number;
  rows: Rft006Row[];
  notas: Rft006NotaGroup[];
  diagnostics: Rft006Diagnostic[];
}

export interface ParseRft006Result {
  report?: Rft006Report;
  diagnostics: Rft006ImportDiagnostics;
  error?: string;
}

type ColumnKey =
  | "nota"
  | "contPed"
  | "descricao"
  | "pesoLiquido"
  | "unidade"
  | "quantidade"
  | "valorUnitario"
  | "valorTotal"
  | "valorDesconto"
  | "valorLiquido"
  | "cnpj"
  | "ie"
  | "razaoSocial"
  | "ncm"
  | "clifor"
  | "municipio";

const COLUMN_LABELS: Record<ColumnKey, string> = {
  nota: "Nota",
  contPed: "Cont/Ped",
  descricao: "Descricao",
  pesoLiquido: "Ps.Liq",
  unidade: "UN",
  quantidade: "Qtde",
  valorUnitario: "Vl.Unit",
  valorTotal: "Vl.Total",
  valorDesconto: "Vl.Dsct",
  valorLiquido: "Vl.Liq.",
  cnpj: "CNPJ",
  ie: "IE",
  razaoSocial: "Razão Social",
  ncm: "NCM ITEM",
  clifor: "Clifor",
  municipio: "Municipio",
};

const COLUMN_ALIASES: Record<ColumnKey, string[]> = {
  nota: ["nota"],
  contPed: ["contped"],
  descricao: ["descricao"],
  pesoLiquido: ["psliq", "pesoliquido"],
  unidade: ["un", "unidade"],
  quantidade: ["qtde", "quantidade"],
  valorUnitario: ["vlunit", "valorunitario"],
  valorTotal: ["vltotal", "valortotal"],
  valorDesconto: ["vldsct", "valordesconto", "desconto"],
  valorLiquido: ["vlliq", "valorliquido"],
  cnpj: ["cnpj", "cpfcnpj"],
  ie: ["ie", "inscricaoestadual"],
  razaoSocial: ["razaosocial"],
  ncm: ["ncmitem", "ncm"],
  clifor: ["clifor"],
  municipio: ["municipio"],
};

// IE é deliberadamente opcional nesta primeira versão.
const REQUIRED_COLUMNS: ColumnKey[] = [
  "nota",
  "descricao",
  "pesoLiquido",
  "unidade",
  "quantidade",
  "valorUnitario",
  "valorTotal",
  "valorDesconto",
  "valorLiquido",
  "cnpj",
  "razaoSocial",
  "ncm",
];

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function text(value: unknown): string {
  return value == null ? "" : String(value).trim();
}

function decimal(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const source = String(value).trim().replace(/[^0-9,.-]/g, "");
  if (!source) return null;
  const normalized = source.includes(",")
    ? source.replace(/\./g, "").replace(",", ".")
    : source;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeRft006Cfop(value: unknown): string {
  if (value == null || value === "") return "";
  const source = typeof value === "number" && Number.isInteger(value) ? String(value) : String(value).trim();
  const digits = source.replace(/\D/g, "");
  return digits.length === 4 ? digits : "";
}

export function isRft006CfopEligible(cfop: string): boolean {
  return cfop.startsWith("5") || cfop.startsWith("6");
}

function isPureCfopCell(value: unknown): boolean {
  if (typeof value === "number") return Number.isInteger(value) && normalizeRft006Cfop(value) !== "";
  return /^\s*\d(?:[\s.]?\d){3}\s*$/.test(String(value ?? "")) && normalizeRft006Cfop(value) !== "";
}

function resolveRegularHeaders(row: unknown[]): Partial<Record<ColumnKey, number>> {
  const resolved: Partial<Record<ColumnKey, number>> = {};
  row.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized || normalized === "cfo" || normalized === "cfop") return;
    for (const key of Object.keys(COLUMN_ALIASES) as ColumnKey[]) {
      if (resolved[key] == null && COLUMN_ALIASES[key].includes(normalized)) resolved[key] = index;
    }
  });
  return resolved;
}

function cfopCandidates(row: unknown[]): number[] {
  return row.flatMap((header, index) => {
    const normalized = normalizeHeader(header);
    return normalized === "cfo" || normalized === "cfop" ? [index] : [];
  });
}

interface HeaderMatch {
  rowIndex: number;
  resolved: Partial<Record<ColumnKey, number>>;
  cfopCandidates: number[];
  score: number;
}

function findHeaderRow(rows: unknown[][]): HeaderMatch | null {
  let best: HeaderMatch | null = null;
  rows.forEach((row, rowIndex) => {
    const resolved = resolveRegularHeaders(row);
    const candidates = cfopCandidates(row);
    const score = Object.keys(resolved).length + (candidates.length ? 2 : 0);
    if (resolved.nota == null || candidates.length === 0) return;
    if (!best || score > best.score) best = { rowIndex, resolved, cfopCandidates: candidates, score };
  });
  return best as HeaderMatch | null;
}

function resolveNumericCfopColumn(rows: unknown[][], candidates: number[]): number | null {
  let best: { index: number; pure: number; normalized: number } | null = null;
  for (const index of candidates) {
    let pure = 0;
    let normalized = 0;
    for (const row of rows) {
      if (normalizeRft006Cfop(row[index])) normalized += 1;
      if (isPureCfopCell(row[index])) pure += 1;
    }
    // Prioriza conteúdo exclusivamente numérico. Em empate, a última ocorrência mantém
    // o comportamento esperado do RFT006, cujo CFOP numérico sucede a descrição de operação.
    if (!best || pure > best.pure || (pure === best.pure && normalized >= best.normalized)) {
      best = { index, pure, normalized };
    }
  }
  return best && best.pure > 0 ? best.index : null;
}

function rawRecord(headers: unknown[], row: unknown[]): Record<string, unknown> {
  const counts = new Map<string, number>();
  return Object.fromEntries(headers.map((header, index) => {
    const base = text(header) || `COLUNA ${index + 1}`;
    const occurrence = (counts.get(base) ?? 0) + 1;
    counts.set(base, occurrence);
    return [occurrence === 1 ? base : `${base} [${occurrence}]`, row[index]];
  }));
}

function isRft006DetailRow(
  row: unknown[],
  resolved: Partial<Record<ColumnKey, number>>,
  cfopColumn: number,
): boolean {
  const value = (key: ColumnKey) => resolved[key] == null ? "" : text(row[resolved[key]]);
  const operationalValues = [
    value("nota"),
    text(row[cfopColumn]),
    value("razaoSocial"),
    value("cnpj"),
    value("descricao"),
    value("ncm"),
    value("unidade"),
  ];
  const isTotalGeral = (cell: unknown) => normalizeHeader(cell).startsWith("totalgeral");

  // Rodapés do RFT006 podem trazer apenas o rótulo TOTAL GERAL e valores
  // agregados. Uma linha real malformada continua entrando se tiver qualquer
  // identificador ou conteúdo de item, mesmo quando a Nota estiver ausente.
  if (row.some(isTotalGeral)) {
    return operationalValues.some((field) => field && !isTotalGeral(field));
  }
  return operationalValues.some(Boolean);
}

function sameIdentity(a: Rft006Emitente, b: Rft006Emitente): boolean {
  const normalizeDocument = (value: string) => value.replace(/\D/g, "");
  const sameDocument = normalizeDocument(a.cnpj) === normalizeDocument(b.cnpj);
  const aIe = a.ie.trim().toLowerCase();
  const bIe = b.ie.trim().toLowerCase();
  // A ausência de IE não invalida a Nota nesta versão; só há conflito quando
  // duas inscrições efetivamente informadas divergem.
  return sameDocument && (!aIe || !bIe || aIe === bIe);
}

function missingImportedData(row: Rft006Row): string[] {
  const missing: string[] = [];
  if (!row.emitente.razaoSocial) missing.push("Razão Social");
  if (!row.emitente.cnpj) missing.push("CNPJ");
  if (!row.item.descricao) missing.push("Descricao");
  if (!row.item.ncm) missing.push("NCM ITEM");
  if (!row.item.unidade) missing.push("UN");
  if (row.item.quantidade == null || row.item.quantidade <= 0) missing.push("Ps.Liq/Qtde");
  if (row.item.valorUnitario == null) missing.push("Vl.Unit");
  if (row.item.valorTotal == null) missing.push("Vl.Total");
  if (row.item.valorDesconto == null) missing.push("Vl.Dsct");
  if (row.item.valorLiquido == null) missing.push("Vl.Liq.");
  return Array.from(new Set(missing));
}

function groupRows(rows: Rft006Row[]): { notas: Rft006NotaGroup[]; diagnostics: Rft006Diagnostic[] } {
  const groups = new Map<string, Rft006Row[]>();
  const diagnostics: Rft006Diagnostic[] = [];

  for (const row of rows) {
    if (!row.nota) {
      diagnostics.push({
        code: "nota_ausente",
        message: `Linha ${row.rowNumber}: Nota não informada.`,
        severity: "error",
        rowNumbers: [row.rowNumber],
      });
      continue;
    }
    const current = groups.get(row.nota) ?? [];
    current.push(row);
    groups.set(row.nota, current);
  }

  const notas = Array.from(groups, ([nota, noteRows]): Rft006NotaGroup => {
    const noteDiagnostics: Rft006Diagnostic[] = [];
    const eligibleCount = noteRows.filter((row) => row.elegivel).length;
    const invalidCfopRows = noteRows.filter((row) => !row.cfop);
    const nonEligibleRows = noteRows.filter((row) => row.cfop && !row.elegivel);
    const mixedCfops = eligibleCount > 0 && eligibleCount < noteRows.length;
    const emitenteInconsistente = noteRows.some((row) => !sameIdentity(noteRows[0].emitente, row.emitente));
    const missing = Array.from(new Set(noteRows.flatMap(missingImportedData)));

    if (invalidCfopRows.length) noteDiagnostics.push({
      code: "cfop_invalido",
      message: `Nota ${nota}: há CFOP ausente ou inválido.`,
      severity: "error",
      nota,
      rowNumbers: invalidCfopRows.map((row) => row.rowNumber),
    });
    if (mixedCfops) noteDiagnostics.push({
      code: "cfops_mistos",
      message: `Nota ${nota}: há linhas com CFOPs elegíveis e não elegíveis.`,
      severity: "error",
      nota,
      rowNumbers: noteRows.map((row) => row.rowNumber),
    });
    if (!mixedCfops && eligibleCount === 0) noteDiagnostics.push({
      code: "cfop_nao_elegivel",
      message: `Nota ${nota}: nenhuma linha possui CFOP iniciado em 5 ou 6.`,
      severity: "warning",
      nota,
      rowNumbers: nonEligibleRows.map((row) => row.rowNumber),
    });
    if (emitenteInconsistente) noteDiagnostics.push({
      code: "emitente_inconsistente",
      message: `Nota ${nota}: CNPJ/CPF ou IE do emitente diverge entre as linhas.`,
      severity: "error",
      nota,
      rowNumbers: noteRows.map((row) => row.rowNumber),
    });
    if (missing.length) noteDiagnostics.push({
      code: "dados_obrigatorios_ausentes",
      message: `Nota ${nota}: dados obrigatórios ausentes (${missing.join(", ")}).`,
      severity: "error",
      nota,
      rowNumbers: noteRows.filter((row) => missingImportedData(row).length > 0).map((row) => row.rowNumber),
      columns: missing,
    });

    const situacao: Rft006Situacao = mixedCfops
      ? "cfops_mistos"
      : emitenteInconsistente
        ? "emitente_inconsistente"
        : missing.length
          ? "dados_obrigatorios_ausentes"
          : eligibleCount === 0
            ? "cfop_nao_elegivel"
            : "pronto";

    diagnostics.push(...noteDiagnostics);
    return {
      nota,
      emitente: noteRows[0].emitente,
      items: noteRows.map((row) => row.item),
      rows: noteRows,
      situacao,
      diagnostics: noteDiagnostics,
    };
  });

  return { notas, diagnostics };
}

export async function parseRft006(file: File): Promise<ParseRft006Result> {
  const baseDiagnostics: Rft006ImportDiagnostics = {
    fileName: file.name,
    sheetName: null,
    headerRow: null,
    foundColumns: [],
    recognizedColumns: [],
    cfopColumn: null,
    diagnostics: [],
  };

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellText: true, cellDates: false });
    const sheetName = workbook.SheetNames[0];
    const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
    if (!sheet) {
      const diagnostic: Rft006Diagnostic = { code: "arquivo_sem_abas", message: "O arquivo RFT006 não contém abas.", severity: "error" };
      return { diagnostics: { ...baseDiagnostics, diagnostics: [diagnostic] }, error: diagnostic.message };
    }

    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", blankrows: false, raw: true }) as unknown[][];
    if (matrix.length === 0) {
      const diagnostic: Rft006Diagnostic = { code: "arquivo_sem_dados", message: "O arquivo RFT006 não contém linhas de dados.", severity: "error" };
      return { diagnostics: { ...baseDiagnostics, sheetName, diagnostics: [diagnostic] }, error: diagnostic.message };
    }

    const header = findHeaderRow(matrix);
    if (!header) {
      const diagnostic: Rft006Diagnostic = { code: "cabecalho_nao_identificado", message: "Cabeçalho do RFT006 não identificado.", severity: "error" };
      return { diagnostics: { ...baseDiagnostics, sheetName, diagnostics: [diagnostic] }, error: diagnostic.message };
    }

    const headers = matrix[header.rowIndex];
    const nonEmptyRows = matrix.slice(header.rowIndex + 1).filter((row) => row.some((cell) => text(cell)));
    const cfopColumn = resolveNumericCfopColumn(nonEmptyRows, header.cfopCandidates);
    const foundColumns = headers.map(text).filter(Boolean);
    const recognizedColumns = (Object.keys(header.resolved) as ColumnKey[]).map((key) => COLUMN_LABELS[key]);
    const importDiagnostics: Rft006Diagnostic[] = [];
    const missingColumns = REQUIRED_COLUMNS.filter((key) => header.resolved[key] == null).map((key) => COLUMN_LABELS[key]);

    if (missingColumns.length) importDiagnostics.push({
      code: "coluna_obrigatoria_ausente",
      message: `Colunas obrigatórias ausentes no RFT006: ${missingColumns.join(", ")}.`,
      severity: "error",
      columns: missingColumns,
    });
    if (cfopColumn == null) importDiagnostics.push({
      code: "coluna_cfop_numerico_nao_identificada",
      message: "Não foi possível identificar a coluna numérica de CFOP do RFT006.",
      severity: "error",
    });

    const diagnostics: Rft006ImportDiagnostics = {
      ...baseDiagnostics,
      sheetName,
      headerRow: header.rowIndex + 1,
      foundColumns,
      recognizedColumns,
      cfopColumn,
      diagnostics: importDiagnostics,
    };
    if (importDiagnostics.length) return { diagnostics, error: importDiagnostics.map((item) => item.message).join(" ") };

    const dataRows = nonEmptyRows.filter((row) => isRft006DetailRow(row, header.resolved, cfopColumn as number));

    const get = (row: unknown[], key: ColumnKey) => {
      const index = header.resolved[key];
      return index == null ? "" : row[index];
    };
    const rows: Rft006Row[] = dataRows.map((row, index) => {
      const pesoLiquido = decimal(get(row, "pesoLiquido"));
      const quantidadeOriginal = decimal(get(row, "quantidade"));
      const cfopOriginal = row[cfopColumn as number];
      const cfop = normalizeRft006Cfop(cfopOriginal);
      return {
        rowNumber: header.rowIndex + index + 2,
        nota: text(get(row, "nota")),
        contPed: text(get(row, "contPed")),
        cfop,
        cfopOriginal,
        elegivel: isRft006CfopEligible(cfop),
        emitente: {
          razaoSocial: text(get(row, "razaoSocial")),
          cnpj: text(get(row, "cnpj")),
          ie: text(get(row, "ie")),
          municipio: text(get(row, "municipio")),
          clifor: text(get(row, "clifor")),
        },
        item: {
          descricao: text(get(row, "descricao")),
          ncm: text(get(row, "ncm")),
          unidade: text(get(row, "unidade")),
          quantidade: pesoLiquido != null && pesoLiquido > 0 ? pesoLiquido : quantidadeOriginal,
          pesoLiquido,
          quantidadeOriginal,
          valorUnitario: decimal(get(row, "valorUnitario")),
          valorTotal: decimal(get(row, "valorTotal")),
          valorDesconto: decimal(get(row, "valorDesconto")),
          valorLiquido: decimal(get(row, "valorLiquido")),
        },
        raw: rawRecord(headers, row),
      };
    });
    const grouped = groupRows(rows);
    diagnostics.diagnostics = grouped.diagnostics;

    return {
      diagnostics,
      report: {
        fileName: file.name,
        importedAt: new Date().toISOString(),
        sheetName,
        headerRow: header.rowIndex + 1,
        rows,
        notas: grouped.notas,
        diagnostics: grouped.diagnostics,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao ler o arquivo RFT006.";
    return { diagnostics: { ...baseDiagnostics, diagnostics: [] }, error: message };
  }
}
