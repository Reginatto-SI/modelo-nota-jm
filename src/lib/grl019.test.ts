import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseGrl019 } from "./grl019";

const REQUIRED_HEADERS = [
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
      REQUIRED_HEADERS,
      ["1", "2", "JM", "RECEBIMENTO", "10", "Soja", "Cliente", "123", "ITEM", "Produto", 12.5],
    ]);

    const result = await parseGrl019(file);

    expect(result.missingColumns).toEqual([]);
    expect(result.report?.headerRow).toBe(6);
    expect(result.report?.rows).toHaveLength(1);
  });

  it("retorna diagnóstico com nomes reais quando falta coluna obrigatória", async () => {
    const headersWithoutEmpresa = REQUIRED_HEADERS.filter((header) => header !== "EMPRESA");
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
