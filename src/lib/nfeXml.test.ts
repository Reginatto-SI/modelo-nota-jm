// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { parseNfeXml } from "./nfeXml";
import { nfeXmlFixture as fixture } from "../test/nfeXmlFixture";

describe("parser de XML NF-e", () => {
  it("lê NF-e 55 autorizada, identificação, produtor, endereço e item", () => {
    const result = parseNfeXml(fixture());
    expect(result.status).toBe("ready");
    expect(result.nfe).toMatchObject({ nota: "417", serie: "1", chave: "51261057260906000162550010000004171000000010", produtor: { nome: "Produtor Sintético", cpfCnpj: "123.456.789-01", ie: "12345", endereco: "Estrada Rural, 10, Lote 2", bairro: "Zona Rural", municipio: "Sorriso", uf: "MT", cep: "78890-000" } });
    expect(result.nfe?.itens[0]).toMatchObject({ quantidade: 10, unidade: "KG", ncm: "12019000", valorBruto: 50, desconto: 1, valorLiquido: 49, cfopOrigem: "5102" });
    expect(result.nfe?.totais.valorLiquido).toBe(49);
  });

  it("aceita destinatário CNPJ, IE ausente, vDesc ausente e CFOP 6102", () => {
    const xml = fixture({ recipientTag: "CNPJ", ie: false, cfop: "6102" }).replace(/<vDesc>1.00<\/vDesc>/g, "").replace("<vDesc>1.00</vDesc><vNF>", "<vDesc>0.00</vDesc><vNF>").replace("<vNF>49.00", "<vNF>50.00");
    const result = parseNfeXml(xml);
    expect(result.status).toBe("ready");
    expect(result.nfe?.produtor).toMatchObject({ cpfCnpj: "12.345.678/0001-99", ie: "" });
    expect(result.nfe?.itens[0].desconto).toBe(0);
  });

  it("preserva vários itens e seus totais consistentes", () => {
    const result = parseNfeXml(fixture({ second: true }));
    expect(result.status).toBe("ready");
    expect(result.nfe?.itens).toHaveLength(2);
    expect(result.nfe?.totais).toMatchObject({ valorBruto: 100, desconto: 3, valorLiquido: 97, vNF: 97 });
  });
  it.each([
    ["outro emitente", fixture({ issuer: "00000000000000" }), "wrongIssuer"],
    ["não autorizada", fixture({ status: "110" }), "unauthorized"],
    ["CFOP inelegível", fixture({ cfop: "1102" }), "ineligibleCfop"],
    ["total divergente", fixture({ total: "48.00" }), "incompatibleTotal"],
    ["malformado", "<nfeProc><NFe>", "invalidXml"],
  ])("bloqueia %s", (_name, xml, status) => expect(parseNfeXml(xml).status).toBe(status));
});
