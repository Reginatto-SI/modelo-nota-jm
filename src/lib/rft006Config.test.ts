import { describe, expect, it } from "vitest";
import { applyRft006Config, buildRft006ConfigPayload, canSaveRft006Default, initializeRft006Config, isValidRft006Recipient, selectRegisteredRft006Recipient, startManualRft006Recipient, type Rft006ConfigRecord } from "./rft006Config";
import type { Armazem } from "./types";

const config: Rft006ConfigRecord = {
  singleton: true,
  destinatario_id: "destino-a",
  cfop: "5901",
  natureza_operacao: "Remessa",
  cst: "040",
  dados_adicionais_template: "Ref. {{nota_referencia}} - Valor {{valor_liquido}}",
  created_at: "2026-10-02T00:00:00.000Z",
  updated_at: "2026-10-02T00:00:00.000Z",
};

const armazem = (id: string, ativo = true): Armazem => ({
  id,
  ativo,
  razao_social: `Destinatário ${id}`,
  cnpj_cpf: "123",
  inscricao_estadual: "456",
  endereco: "Rua atualizada",
  bairro: "Centro",
  cep: "00000-000",
  municipio: "Cidade",
  uf: "PR",
  telefone: null,
  tipo: "outro",
  origem_cadastro: "manual",
  ultima_sincronizacao_grl019: null,
  created_at: config.created_at,
  updated_at: config.updated_at,
});

describe("configuração padrão do RFT006", () => {
  it("inicia o modo manual sem manter ID ou dados do cadastro anterior", () => {
    const result = startManualRft006Recipient();

    expect(result.destinatarioId).toBeNull();
    expect(result.destinatario).toEqual({ nome: "", cpfCnpj: "", ie: "", endereco: "", bairro: "", cep: "", municipio: "", uf: "" });
  });

  it("aceita destinatário manual com nome e CPF/CNPJ sem exigir ID", () => {
    const manual = { ...startManualRft006Recipient().destinatario!, nome: "Destino avulso", cpfCnpj: "12345678901" };

    expect(isValidRft006Recipient(manual)).toBe(true);
    expect(startManualRft006Recipient().destinatarioId).toBeNull();
    expect(canSaveRft006Default(null)).toBe(false);
  });

  it("restaura ID e todos os dados ao selecionar novamente um cadastro", () => {
    const party = { nome: "Cadastrado", cpfCnpj: "99", ie: "1", endereco: "Rua", bairro: "Centro", cep: "1", municipio: "Cidade", uf: "MT" };

    expect(selectRegisteredRft006Recipient("destino-c", party)).toEqual({ destinatarioId: "destino-c", destinatario: party });
    expect(canSaveRft006Default("destino-c")).toBe(true);
  });

  it("libera o formulário vazio quando não há configuração ou a leitura não retorna dados", () => {
    expect(initializeRft006Config(null, [armazem("destino-a")])).toEqual({
      destinatarioId: null,
      destinatario: null,
      destinatarioNeedsReselection: false,
      cfop: "",
      naturezaOperacao: "",
      cst: "",
      dadosAdicionaisTemplate: "",
    });
  });

  it("aplica os campos fiscais e resolve o destinatário ativo pelo ID", () => {
    const result = applyRft006Config(config, [armazem("outro"), armazem("destino-a")]);

    expect(result).toMatchObject({
      destinatarioId: "destino-a",
      destinatario: { nome: "Destinatário destino-a", endereco: "Rua atualizada" },
      destinatarioNeedsReselection: false,
      cfop: "5901",
      naturezaOperacao: "Remessa",
      cst: "040",
      dadosAdicionaisTemplate: "Ref. {{nota_referencia}} - Valor {{valor_liquido}}",
    });
  });

  it.each([
    ["inexistente", [armazem("outro")]],
    ["inativo", [armazem("destino-a", false), armazem("outro")]],
  ])("não substitui destinatário %s por outro cadastro", (_case, armazens) => {
    const result = applyRft006Config(config, armazens);

    expect(result.destinatario).toBeNull();
    expect(result.destinatarioId).toBeNull();
    expect(result.destinatarioNeedsReselection).toBe(true);
    expect(result.cfop).toBe("5901");
  });

  it("monta o payload singleton e preserva os placeholders do template", () => {
    const payload = buildRft006ConfigPayload({
      destinatarioId: "destino-b",
      cfop: "5902",
      naturezaOperacao: "Outra natureza",
      cst: "041",
      dadosAdicionaisTemplate: config.dados_adicionais_template ?? "",
    });

    expect(payload).toEqual({
      singleton: true,
      destinatario_id: "destino-b",
      cfop: "5902",
      natureza_operacao: "Outra natureza",
      cst: "041",
      dados_adicionais_template: "Ref. {{nota_referencia}} - Valor {{valor_liquido}}",
    });

    // O mesmo formato persistido volta a ser aplicável sem perder campos ou placeholders.
    expect(applyRft006Config({ ...config, ...payload, updated_at: config.updated_at }, [armazem("destino-b")]))
      .toMatchObject({
        destinatarioId: "destino-b",
        cfop: "5902",
        naturezaOperacao: "Outra natureza",
        cst: "041",
        dadosAdicionaisTemplate: "Ref. {{nota_referencia}} - Valor {{valor_liquido}}",
      });
  });
});
