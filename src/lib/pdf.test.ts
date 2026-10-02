import { describe, expect, it } from "vitest";
import { buildPdfDocument, buildRft006PageLabel, buildRft006ProductRows, pdfDataUri } from "./pdf";
import { buildRft006Nota } from "./rft006Nota";
import type { Rft006NotaGroup } from "./rft006";
import type { Nota } from "./nota";

const notaGenerica: Nota = {
  cfop: "5120",
  nomeModelo: "Modelo 5120",
  naturezaOperacao: "Venda de produção do estabelecimento",
  emitente: {
    nome: "Produtor Teste",
    cpfCnpj: "11111111111",
    ie: "ISENTO",
    endereco: "Rua A",
    bairro: "",
    municipio: "Sorriso",
    uf: "MT",
    cep: "",
  },
  destinatario: {
    nome: "Destinatário Parametrizado",
    cpfCnpj: "22222222000122",
    ie: "IE-DEST",
    endereco: "Rua Destino",
    bairro: "",
    municipio: "Sorriso",
    uf: "MT",
    cep: "",
  },
  produto: {
    codigo: "SOJA",
    descricao: "Soja",
    ncm: "12019000",
    cst: "090",
    unidade: "KG",
  },
  quantidade: 45000,
  valorUnitario: 2,
  valorTotal: 90000,
  dataEmissao: "2026-07-07",
  dataSaida: "2026-07-07",
  horaSaida: "",
  tpFrete: "9 - Sem cobrança de frete",
  placaVeiculo: "",
  transportador: "",
  dadosAdicionais: "CFOP 5120 NAT Venda de produção do estabelecimento CST 090",
  observacao: "",
};

describe("pdfDataUri", () => {
  it("gera PDF com CFOP genérico parametrizado sem depender dos modelos originais", () => {
    const dataUri = pdfDataUri([notaGenerica]);

    expect(dataUri).toMatch(/^data:application\/pdf/);
  });

  it("mantém o GRL019 no renderer singular e em uma página", () => {
    expect(notaGenerica.sourceType).not.toBe("rft006");
    expect(buildPdfDocument([notaGenerica]).getNumberOfPages()).toBe(1);
  });

  it("monta todas as linhas RFT006 com dados e valores preservados", () => {
    const nota = rft006Nota(2);
    expect(buildRft006ProductRows(nota)).toEqual([
      ["Produto 1", "12019001", "040", "5102", "KG", "10,00", "R$ 5,123456", "R$ 51,23", "R$ 1,23", "R$ 50,00"],
      ["Produto 2", "12019002", "040", "5102", "SC", "11,00", "R$ 6,123456", "R$ 61,23", "R$ 2,23", "R$ 59,00"],
    ]);
  });

  it("pagina muitos itens RFT006 sem perder as linhas finais", () => {
    const nota = rft006Nota(90);
    const rows = buildRft006ProductRows(nota);
    const doc = buildPdfDocument([nota]);
    const pageCount = doc.getNumberOfPages();
    const pageStreams = (doc.internal as unknown as { pages: string[][] }).pages.slice(1).map((page) => page.join("\n"));

    expect(pageCount).toBeGreaterThan(1);
    expect(rows).toHaveLength(90);
    expect(rows[0][0]).toBe("Produto 1");
    expect(rows.at(-1)?.[0]).toBe("Produto 90");
    expect(pageStreams.join("\n")).toContain("Produto 90");
    expect(pageStreams[0]).toContain(buildRft006PageLabel(1, pageCount));
    expect(pageStreams.at(-1)).toContain(buildRft006PageLabel(pageCount, pageCount));
    expect(pageStreams.join("\n")).not.toContain("FOLHA: 1 de 1");
  });
});

function rft006Nota(itemCount: number): Nota {
  const items = Array.from({ length: itemCount }, (_, index) => ({
    descricao: `Produto ${index + 1}`,
    ncm: `120190${String(index + 1).padStart(2, "0")}`,
    unidade: index === 1 ? "SC" : "KG",
    quantidade: 10 + index,
    pesoLiquido: 10 + index,
    quantidadeOriginal: 1,
    valorUnitario: 5.123456 + index,
    valorTotal: 51.23 + index * 10,
    valorDesconto: 1.23 + index,
    valorLiquido: 50 + index * 9,
  }));
  const group: Rft006NotaGroup = {
    nota: "REF-55", situacao: "pronto", diagnostics: [], rows: [], items,
    emitente: { razaoSocial: "Agricultor", cnpj: "11", ie: "", municipio: "Sorriso", clifor: "1" },
  };
  return buildRft006Nota(group, {
    destinatario: notaGenerica.destinatario,
    cfop: "5102",
    cst: "040",
    naturezaOperacao: "Venda",
    dadosAdicionais: "Dados adicionais finais da Nota {{nota_referencia}}",
  });
}
