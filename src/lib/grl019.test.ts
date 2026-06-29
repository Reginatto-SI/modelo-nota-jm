import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseGrl019 } from "./grl019";

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

function makeFile(rows: unknown[][], name = "grl019.xlsx") {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "GRL019");
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



  it("preserva COD.CONTRATO alfanumérico como texto", async () => {
    const file = makeFile([
      ["Relatório GRL019"],
      ["Filtro"],
      ["Período"],
      ["Empresa"],
      [""],
      HEADERS_BASE,
      ["1", "2", "JM", "RECEBIMENTO", "COE", "CONTRATO C/ORDEM ETANOL", "Cliente", "123", "ITEM", "Produto", 12.5],
    ]);

    const result = await parseGrl019(file);

    expect(result.report?.rows[0].codContrato).toBe("COE");
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
