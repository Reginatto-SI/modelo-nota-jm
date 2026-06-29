import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildModeloJmWorkbook, MODELO_JM_SHEET_NAME, parseGrl019, shouldSyncArmazensFromReport } from "./grl019";

const HEADERS_BASE = [
  "CONTRATO",
  "CONTRATO VINCULADO",
  "EMPRESA",
  "TP FATURAMENTO",
  "COD.CONTRATO",
  "DESC.CONTRATO",
  "NOME/RAZÃO SOCIAL",
  "CPF/CNPJ",
  "COD.ITEM",
  "DESC.ITEM",
  "PREÇO UNIT. C/ICMS",
];

const HEADERS_BASE_COM_MOEDA = [...HEADERS_BASE, "MOEDA"];

function makeFile(rows: unknown[][], name = "grl019.xlsx", sheetName = "GRL019") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const data = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new File([data], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

describe("parseGrl019", () => {
  it("detecta cabeçalho do GRL019 na linha 6 e não exige CONTRATO CLIENTE", async () => {
    const file = makeFile([
      ["Relatório GRL019"],
      ["Filtro"],
      ["Período"],
      ["Empresa"],
      [""],
      HEADERS_BASE_COM_MOEDA,
      ["1", "2", "JM", "RECEBIMENTO", "10", "Soja", "Cliente", "123", "ITEM", "Produto", 12.5, "US$"],
    ]);

    const result = await parseGrl019(file);

    expect(result.missingColumns).toEqual([]);
    expect(result.report?.headerRow).toBe(6);
    expect(result.report?.rows).toHaveLength(1);
    expect(result.report?.rows[0].moeda).toBe("US$");
  });


  it("importa GRL019 sem MOEDA porque a coluna é recomendada, não obrigatória", async () => {
    const file = makeFile([
      ["Relatório GRL019"],
      ["Filtro"],
      ["Período"],
      ["Empresa"],
      [""],
      HEADERS_BASE,
      ["1", "2", "JM", "RECEBIMENTO", "10", "Soja", "Cliente", "123", "ITEM", "Produto", 12.5],
    ]);

    const result = await parseGrl019(file);

    expect(result.missingColumns).toEqual([]);
    expect(result.missingRecommendedColumns).toContain("MOEDA");
    expect(result.report?.rows).toHaveLength(1);
    expect(result.report?.rows[0].moeda).toBe("");
  });

  it("gera a planilha Modelo JM com abas de preenchimento, instruções e exemplo", () => {
    const wb = buildModeloJmWorkbook();

    expect(wb.SheetNames).toEqual([MODELO_JM_SHEET_NAME, "Instruções", "Exemplo"]);

    const modeloRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[MODELO_JM_SHEET_NAME], {
      header: 1,
      defval: "",
    });
    const instrucoesRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Instruções"], {
      header: 1,
      defval: "",
    });
    const exemploRows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets["Exemplo"], { header: 1, defval: "" });

    expect(modeloRows).toHaveLength(1);
    expect(modeloRows[0]).toContain("CONTRATO");
    expect(modeloRows[0]).toContain("MOEDA");
    expect(instrucoesRows.flat()).toContain("Não alterar o nome da aba Modelo JM.");
    expect(instrucoesRows.flat()).toContain("Não remover nem renomear os cabeçalhos.");
    expect(exemploRows[1]).toContain("001A");
    expect(exemploRows[1]).toContain("CLI-0001");
  });

  it("não permite pré-cadastro automático de armazéns para Modelo JM", () => {
    expect(
      shouldSyncArmazensFromReport({
        fileName: "modelo.xlsx",
        importedAt: "2026-06-29T00:00:00.000Z",
        rows: [],
        empresas: [],
        source: "modelo_jm",
      }),
    ).toBe(false);

    expect(
      shouldSyncArmazensFromReport({
        fileName: "grl019.xlsx",
        importedAt: "2026-06-29T00:00:00.000Z",
        rows: [],
        empresas: [],
        source: "grl019",
      }),
    ).toBe(true);
  });

  it("importa Modelo JM pela aba própria e preserva identificadores como texto", async () => {
    const headers = [
      "CONTRATO",
      "CONTRATO VINCULADO",
      "EMPRESA",
      "TP FATURAMENTO",
      "COD.CONTRATO",
      "DESC.CONTRATO",
      "NOME/RAZÃO SOCIAL",
      "CPF/CNPJ",
      "I.E.",
      "ENDEREÇO",
      "MUNICÍPIO",
      "ESTADO",
      "COD.ITEM",
      "DESC.ITEM",
      "PREÇO UNIT. C/ICMS",
      "TP FRETE",
      "OBSERVAÇÃO",
      "CONTRATO CLIENTE",
      "MOEDA",
    ];
    const row = [
      "001A",
      "002B",
      "JM",
      "recebimento",
      "0108",
      "Soja",
      "Cliente",
      "123",
      "IE",
      "Rua",
      "Cidade",
      "MT",
      "ITEM",
      "Produto",
      "1.234,56",
      "CIF",
      "Obs",
      "CLI-0001",
      "R$",
    ];
    const file = makeFile([headers, row], "modelo_importacao_jm.xlsx", MODELO_JM_SHEET_NAME);

    const result = await parseGrl019(file);

    expect(result.missingColumns).toEqual([]);
    expect(result.report?.source).toBe("modelo_jm");
    expect(result.report?.sheetName).toBe(MODELO_JM_SHEET_NAME);
    expect(result.report?.headerRow).toBe(1);
    expect(result.report?.rows[0]).toMatchObject({
      contrato: "001A",
      contratoVinculado: "002B",
      codContrato: "0108",
      contratoCliente: "CLI-0001",
      tpFaturamento: "RECEBIMENTO",
    });
    expect(result.report?.rows[0].precoUnitIcms).toBe(1234.56);
  });

  it("retorna mensagem clara quando o Modelo JM não tem colunas obrigatórias", async () => {
    const file = makeFile([["CONTRATO", "EMPRESA"]], "modelo-invalido.xlsx", MODELO_JM_SHEET_NAME);

    const result = await parseGrl019(file);

    expect(result.report).toBeUndefined();
    expect(result.missingColumns).toContain("TP FATURAMENTO");
    expect(result.diagnostics.source).toBe("modelo_jm");
    expect(result.diagnostics.errorMessage).toBe("A planilha importada não possui as colunas obrigatórias para geração dos modelos.");
  });

  it("retorna diagnóstico com nomes reais quando falta coluna obrigatória", async () => {
    const headersWithoutEmpresa = HEADERS_BASE.filter((header) => header !== "EMPRESA");
    const file = makeFile([headersWithoutEmpresa], "invalido.xlsx");

    const result = await parseGrl019(file);

    expect(result.report).toBeUndefined();
    expect(result.missingColumns).toContain("EMPRESA");
    expect(result.diagnostics.fileName).toBe("invalido.xlsx");
    expect(result.diagnostics.foundColumns).toEqual(headersWithoutEmpresa);
    expect(result.diagnostics.recognizedColumns).toContain("CONTRATO");
    expect(result.diagnostics.recognizedColumns).not.toContain("EMPRESA");
  });

  it("mantém colunas encontradas separadas das colunas reconhecidas quando o cabeçalho é inválido", async () => {
    const file = makeFile([["COLUNA QUALQUER", "OUTRA COLUNA"]], "cabecalho-invalido.xlsx");

    const result = await parseGrl019(file);

    expect(result.report).toBeUndefined();
    expect(result.error).toBe("Cabeçalho do GRL019 não identificado.");
    expect(result.diagnostics.foundColumns).toEqual(["COLUNA QUALQUER", "OUTRA COLUNA"]);
    expect(result.diagnostics.recognizedColumns).toEqual([]);
  });
});
