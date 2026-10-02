import { describe, expect, it } from "vitest";
import type { NotaParty } from "./nota";
import type { Rft006NotaGroup } from "./rft006";
import { buildRft006Nota, buildRft006PdfFileName, buildRft006Variables, generateValidatedRft006Pdf, getPreviewReturnPath, getRft006Totals, updateRft006Nota, validateRft006Nota } from "./rft006Nota";

const destinatario: NotaParty = { nome: "Associação Destino", cpfCnpj: "22", ie: "IE-2", endereco: "Rua B", bairro: "Centro", municipio: "Cuiabá", uf: "MT", cep: "78000" };
const group: Rft006NotaGroup = {
  nota: "9876", situacao: "pronto", diagnostics: [], rows: [],
  emitente: { razaoSocial: "Agricultor", cnpj: "11", ie: "", municipio: "Sorriso", clifor: "1" },
  items: [
    { descricao: "Soja", ncm: "12019000", unidade: "KG", quantidade: 10, pesoLiquido: 10, quantidadeOriginal: 1, valorUnitario: 5, valorTotal: 50, valorDesconto: 2, valorLiquido: 48 },
    { descricao: "Milho", ncm: "10059010", unidade: "SC", quantidade: 2, pesoLiquido: null, quantidadeOriginal: 2, valorUnitario: 20, valorTotal: 40, valorDesconto: 1, valorLiquido: 39 },
  ],
};

const template = "Nota {{nota_referencia}}; CFOP {{cfop}}; CST {{cst}}; {{natureza_operacao}}; líquido {{valor_liquido}}; {{emitente_nome}}; {{destinatario_nome}}";
const build = () => buildRft006Nota(group, { destinatario, cfop: "5102", cst: "040", naturezaOperacao: "Venda", dadosAdicionais: template });

describe("Nota RFT006", () => {
  it("cria uma única Nota RFT006, preservando referência e múltiplos itens", () => {
    const nota = build();
    expect(nota.sourceType).toBe("rft006");
    expect(nota.notaReferencia).toBe("9876");
    expect(nota.itens).toHaveLength(2);
    expect(nota.produto.descricao).toBe("Soja");
  });

  it("agrega os totais importados sem reinterpretar os itens", () => {
    const nota = build();
    expect(getRft006Totals(nota.itens!)).toEqual({ valorBruto: 90, valorDesconto: 3, valorLiquido: 87 });
    expect(nota.valorTotal).toBe(90);
    expect(nota.valorDesconto).toBe(3);
    expect(nota.valorLiquido).toBe(87);
  });

  it("monta e renderiza variáveis próprias do RFT006", () => {
    const nota = build();
    expect(buildRft006Variables(nota)).toMatchObject({ emitente_nome: "Agricultor", destinatario_nome: "Associação Destino", nota_referencia: "9876", cfop: "5102", cst: "040", valor_total: "90,00", valor_desconto: "3,00", valor_liquido: "87,00" });
    expect(nota.dadosAdicionais).toContain("líquido 87,00");
  });

  it("atualiza totais e texto renderizado antes do override manual", () => {
    const nota = build();
    const itens = nota.itens!.map((item, index) => index === 0 ? { ...item, valorLiquido: 100, valorBruto: 110, desconto: 10 } : item);
    const updated = updateRft006Nota(nota, { itens });
    expect(updated.valorLiquido).toBe(139);
    expect(updated.dadosAdicionais).toContain("líquido 139,00");
  });

  it("atualiza destinatário e campos fiscais no template antes do override", () => {
    const initial = build();
    const nota = updateRft006Nota(initial, {
      destinatario: { ...destinatario, nome: "Novo Destino" },
      notaReferencia: "NF-2",
      cfop: "6102",
      cst: "060",
      naturezaOperacao: "Remessa",
      emitente: { ...initial.emitente, nome: "Novo Emitente" },
    });
    expect(nota.dadosAdicionais).toBe("Nota NF-2; CFOP 6102; CST 060; Remessa; líquido 87,00; Novo Emitente; Novo Destino");
  });

  it("preserva o texto manual depois do override", () => {
    const manual = updateRft006Nota(build(), { dadosAdicionais: "Texto revisado pelo usuário" }, true);
    const updated = updateRft006Nota(manual, { destinatario: { ...destinatario, nome: "Outro destino" }, cfop: "6108" });
    expect(updated.dadosAdicionaisManualOverride).toBe(true);
    expect(updated.dadosAdicionais).toBe("Texto revisado pelo usuário");
  });

  it("não inventa tipo de frete para RFT006", () => {
    expect(build().tpFrete).toBe("");
  });

  it("valida os obrigatórios sem exigir IE", () => {
    expect(validateRft006Nota(build())).toEqual([]);
  });

  it("preserva integralmente o destinatário manual ao montar a Nota", () => {
    const manual: NotaParty = { nome: "Destino manual", cpfCnpj: "12345678901", ie: "", endereco: "Estrada 1", bairro: "Rural", cep: "78000-000", municipio: "Cuiabá", uf: "MT" };
    const nota = buildRft006Nota(group, { destinatario: manual, cfop: "5102", cst: "040", naturezaOperacao: "Venda", dadosAdicionais: template });

    expect(nota.destinatario).toEqual(manual);
    expect(validateRft006Nota(nota)).toEqual([]);
  });

  it("define retorno próprio para RFT006", () => {
    const nota = build();
    expect(getPreviewReturnPath([nota])).toBe("/rft006");
  });

  it("usa nome próprio sanitizado sem metadados de contrato", () => {
    const nota = { ...build(), notaReferencia: "98/76", emitente: { ...build().emitente, nome: "Agricultor: Teste" } };
    expect(buildRft006PdfFileName(nota)).toBe("Modelo RFT006 - Nota 98-76 - Agricultor- Teste.pdf");
  });

  it("bloqueia nota inválida antes de chamar o gerador", () => {
    const calls: unknown[] = [];
    const error = generateValidatedRft006Pdf({ ...build(), cfop: "" }, (...args) => calls.push(args));
    expect(error).toBe("Informe o CFOP.");
    expect(calls).toHaveLength(0);
  });

  it("envia nota válida ao gerador com o nome RFT006", () => {
    const calls: unknown[][] = [];
    expect(generateValidatedRft006Pdf(build(), (...args) => calls.push(args))).toBeNull();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toEqual([build()]);
    expect(calls[0][1]).toBe("Modelo RFT006 - Nota 9876 - Agricultor.pdf");
  });

  it("mantém a estrutura singular compatível para GRL019", () => {
    const nota = { ...build(), sourceType: "grl019" as const, itens: undefined, tpFrete: "9 - Sem cobrança de frete" };
    const updated = updateRft006Nota(nota, { cfop: "5118" });
    expect(nota.produto.descricao).toBe("Soja");
    expect(getPreviewReturnPath([nota])).toBe("/pesquisa");
    expect(updated.tpFrete).toBe("9 - Sem cobrança de frete");
    expect(updated.cfop).toBe("5118");
  });
});
