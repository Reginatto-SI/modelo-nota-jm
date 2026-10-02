import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { parseRft006 } from "./rft006";

const HEADERS = [
  "Nota",
  "Cont/Ped",
  "C.F.O",
  "C.F.O",
  "Descricao",
  "Ps.Liq",
  "UN",
  "Qtde",
  "Vl.Unit",
  "Vl.Total",
  "Vl.Dsct",
  "Vl.Liq.",
  "CNPJ",
  "IE",
  "Razão Social",
  "NCM ITEM",
  "Clifor",
  "Municipio",
];

function row(overrides: Partial<Record<(typeof HEADERS)[number] | "cfop" | "cfoDescricao", unknown>> = {}) {
  const values: Record<string, unknown> = {
    Nota: "100",
    "Cont/Ped": "PED-1",
    cfoDescricao: "VENDA DE MERCADORIA",
    cfop: 5102,
    Descricao: "SOJA",
    "Ps.Liq": 1000,
    UN: "KG",
    Qtde: 10,
    "Vl.Unit": 2.5,
    "Vl.Total": 2500,
    "Vl.Dsct": 25,
    "Vl.Liq.": 2475,
    CNPJ: "12.345.678/0001-90",
    IE: "123456",
    "Razão Social": "AGRICULTOR A",
    "NCM ITEM": "12019000",
    Clifor: "CLI-1",
    Municipio: "CUIABA",
    ...overrides,
  };
  return HEADERS.map((header, index) => header === "C.F.O"
    ? (index === 2 ? values.cfoDescricao : values.cfop)
    : values[header]);
}

function makeFile(rows: unknown[][], name = "rft006.xlsx") {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "RFT6");
  const data = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new File([data], name, { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function parseRows(...rows: unknown[][]) {
  return parseRft006(makeFile([["Relatório de faturamento RFT6"], HEADERS, ...rows]));
}

describe("parseRft006", () => {
  it.each([
    [5102, "5102"],
    [6102, "6102"],
    ["5102", "5102"],
    ["6.102", "6102"],
  ])("normaliza CFOP %s e o considera elegível", async (input: number | string, normalized: string) => {
    const result = await parseRows(row({ cfop: input }));

    expect(result.error).toBeUndefined();
    expect(result.report?.rows[0]).toMatchObject({ cfop: normalized, elegivel: true });
    expect(result.report?.notas[0].situacao).toBe("pronto");
  });

  it("classifica CFOP 1102 como não elegível sem usar Cont/Ped", async () => {
    const result = await parseRows(row({ cfop: 1102, "Cont/Ped": "QUALQUER VALOR" }));

    expect(result.report?.rows[0].elegivel).toBe(false);
    expect(result.report?.notas[0].situacao).toBe("cfop_nao_elegivel");
  });

  it("localiza a coluna numérica quando existem dois cabeçalhos C.F.O", async () => {
    const result = await parseRows(row({ cfoDescricao: "5102 - VENDA", cfop: 6102 }));

    expect(result.diagnostics.cfopColumn).toBe(3);
    expect(result.report?.rows[0].cfop).toBe("6102");
    expect(result.report?.rows[0].raw).toMatchObject({ "C.F.O": "5102 - VENDA", "C.F.O [2]": 6102 });
  });

  it("agrupa múltiplos itens da mesma Nota", async () => {
    const result = await parseRows(
      row({ Nota: "100", Descricao: "SOJA" }),
      row({ Nota: "100", Descricao: "MILHO", "NCM ITEM": "10059010" }),
    );

    expect(result.report?.notas).toHaveLength(1);
    expect(result.report?.notas[0].items.map((item) => item.descricao)).toEqual(["SOJA", "MILHO"]);
  });

  it("mantém duas Notas do mesmo agricultor separadas", async () => {
    const result = await parseRows(row({ Nota: "100" }), row({ Nota: "101" }));

    expect(result.report?.notas.map((note) => note.nota)).toEqual(["100", "101"]);
  });

  it("marca como inconsistente uma Nota com CFOPs mistos", async () => {
    const result = await parseRows(row({ Nota: "100", cfop: 5102 }), row({ Nota: "100", cfop: 1102 }));

    expect(result.report?.notas[0].situacao).toBe("cfops_mistos");
    expect(result.report?.notas[0].diagnostics.map((item) => item.code)).toContain("cfops_mistos");
    expect(result.report?.notas[0].rows).toHaveLength(2);
  });

  it("marca emitente conflitante pelo conjunto CNPJ e IE", async () => {
    const result = await parseRows(row({ Nota: "100" }), row({ Nota: "100", IE: "OUTRA-IE" }));

    expect(result.report?.notas[0].situacao).toBe("emitente_inconsistente");
    expect(result.report?.notas[0].diagnostics.map((item) => item.code)).toContain("emitente_inconsistente");
  });

  it("não invalida a Nota somente por IE ausente", async () => {
    const result = await parseRows(row({ IE: "" }));

    expect(result.report?.notas[0].situacao).toBe("pronto");
  });

  it("prioriza Ps.Liq maior que zero e mantém a Qtde original", async () => {
    const result = await parseRows(row({ "Ps.Liq": 1250.75, Qtde: 20 }));

    expect(result.report?.rows[0].item).toMatchObject({
      quantidade: 1250.75,
      pesoLiquido: 1250.75,
      quantidadeOriginal: 20,
    });
  });

  it.each([0, "", -1])("usa Qtde quando Ps.Liq é %s", async (pesoLiquido: number | string) => {
    const result = await parseRows(row({ "Ps.Liq": pesoLiquido, Qtde: 35 }));

    expect(result.report?.rows[0].item.quantidade).toBe(35);
  });

  it("preserva valores unitário, bruto, desconto e líquido sem recalcular", async () => {
    const result = await parseRows(row({
      "Vl.Unit": 9.876543,
      "Vl.Total": 1234.56,
      "Vl.Dsct": 34.56,
      "Vl.Liq.": 1200,
    }));

    expect(result.report?.rows[0].item).toMatchObject({
      valorUnitario: 9.876543,
      valorTotal: 1234.56,
      valorDesconto: 34.56,
      valorLiquido: 1200,
    });
  });

  it("ignora linhas vazias e o rodapé TOTAL GERAL sem gerar nota_ausente", async () => {
    const totalGeral = HEADERS.map((header, index) => {
      if (index === 0) return "TOTAL GERAL --->";
      const totals: Record<string, number> = {
        "Ps.Liq": 1000,
        Qtde: 10,
        "Vl.Total": 2500,
        "Vl.Dsct": 25,
        "Vl.Liq.": 2475,
      };
      return totals[header] ?? "";
    });
    const result = await parseRft006(makeFile([
      ["Relatório de faturamento RFT6"],
      HEADERS,
      row({ Nota: "100" }),
      [],
      ["", "", ""],
      totalGeral,
    ]));

    expect(result.report?.rows).toHaveLength(1);
    expect(result.report?.notas.map((note) => note.nota)).toEqual(["100"]);
    expect(result.report?.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain("nota_ausente");
  });

  it("mantém linha de detalhe malformada sem Nota para diagnóstico", async () => {
    const result = await parseRows(row({ Nota: "", Descricao: "ITEM SEM NOTA" }));

    expect(result.report?.rows).toHaveLength(1);
    expect(result.report?.diagnostics.map((diagnostic) => diagnostic.code)).toContain("nota_ausente");
  });
});
