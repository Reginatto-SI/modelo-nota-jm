import { describe, expect, it } from "vitest";
import { pdfDataUri } from "./pdf";
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
});
