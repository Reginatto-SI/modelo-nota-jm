import { describe, expect, it } from "vitest";
import { buildNota } from "./nota";
import { TIPO_FRETE_DEFAULT } from "./tipoFrete";
import type { Cooperativa, Grl019Row, ModeloNota, Produto } from "./types";
import type { ResolveResult } from "./resolve";

const row: Grl019Row = {
  contrato: "C-1",
  contratoVinculado: "",
  empresa: "COOP",
  tpFaturamento: "RECEBIMENTO",
  codContrato: "108",
  descContrato: "Contrato teste",
  nomeRazaoSocial: "Produtor",
  cpfCnpj: "111",
  ie: "ISENTO",
  endereco: "Rua A",
  municipio: "Cidade",
  estado: "UF",
  codItem: "SOJA",
  descItem: "Soja",
  precoUnitIcms: 120,
  tpFrete: "9 - Sem cobrança de frete",
  observacao: "",
  _raw: {},
};

const cooperativa: Cooperativa = {
  id: "coop-1",
  nome_grl019: "COOP",
  razao_social: "Cooperativa",
  cnpj: null,
  inscricao_estadual: null,
  endereco: null,
  bairro: null,
  cep: null,
  municipio: null,
  uf: null,
  telefone: null,
  email: null,
  ativo: true,
  created_at: "",
  updated_at: "",
};

const produto: Produto = {
  id: "produto-1",
  codigo_produto: "SOJA",
  descricao: "Soja",
  ncm: "12019000",
  cst_icms: "041",
  unidade: "KG",
  ativo: true,
  created_at: "",
  updated_at: "",
};

const modeloBase: ModeloNota = {
  id: "modelo-1",
  cooperativa_id: cooperativa.id,
  cfop: "5118",
  nome_modelo: "Modelo 5118",
  natureza_operacao: null,
  tipo_destinatario: "cooperativa",
  tipo_frete_padrao: null,
  dados_adicionais_template: null,
  ativo: true,
  created_at: "",
  updated_at: "",
};

function resolveResult(): ResolveResult {
  return {
    searchedRow: row,
    recebimentoRow: row,
    cooperativa,
    modelo: modeloBase,
    produto,
    cfop: "5118",
    warnings: [],
    errors: [],
    podeGerar: true,
    ofereceCasada: false,
    expedicaoComoVinculo5923: false,
    expedicaoVinculadaRecebimento: false,
    parametrizacaoSuspeitaExpedicao5923: false,
  };
}

describe("buildNota", () => {
  it("usa o tipo de frete padrão configurado no modelo", () => {
    const nota = buildNota(resolveResult(), "5118", {
      ...modeloBase,
      tipo_frete_padrao: "4 - Transporte próprio por conta do Destinatário",
    });

    expect(nota.tpFrete).toBe("4 - Transporte próprio por conta do Destinatário");
  });

  it("usa o fallback solicitado quando o modelo não tem tipo de frete padrão", () => {
    const nota = buildNota(resolveResult(), "5118", modeloBase);

    expect(nota.tpFrete).toBe(TIPO_FRETE_DEFAULT);
  });

  it("substitui as variáveis de armazém pelo cadastro encontrado", () => {
    const res = resolveResult();
    res.armazem = {
      id: "arm-1",
      razao_social: "INPASA AGROINDUSTRIAL S/A",
      cnpj_cpf: "29316596000468",
      inscricao_estadual: "1234567",
      endereco: "Rod BR 163 KM 10",
      bairro: "Zona Rural",
      cep: "78450000",
      municipio: "NOVA MUTUM",
      uf: "MT",
      telefone: null,
      tipo: "armazem",
      ativo: true,
      created_at: "",
      updated_at: "",
    };
    const template =
      "Mercadoria entregue na {{armazem_nome}} CNPJ {{armazem_cnpj}} IE {{armazem_ie}} " +
      "ENDEREÇO: {{armazem_endereco}} {{armazem_municipio}} {{armazem_uf}}";
    const nota = buildNota(res, "5118", { ...modeloBase, dados_adicionais_template: template });

    expect(nota.dadosAdicionais).toContain("INPASA AGROINDUSTRIAL S/A");
    expect(nota.dadosAdicionais).toContain("29316596000468");
    expect(nota.dadosAdicionais).toContain("Rod BR 163 KM 10");
    expect(nota.dadosAdicionais).toContain("NOVA MUTUM");
    expect(nota.dadosAdicionais).toContain("MT");
    expect(nota.dadosAdicionais).not.toContain("{{");
  });

  it("usa dados da expedição quando não há cadastro de armazém e nunca deixa variável crua", () => {
    const res = resolveResult();
    res.expedicaoRow = {
      ...row,
      contrato: "C-2",
      tpFaturamento: "EXPEDICAO",
      nomeRazaoSocial: "ARMAZEM EXPEDICAO LTDA",
      cpfCnpj: "99999999000199",
      ie: "ISENTO",
      endereco: "Av Central 100",
      municipio: "SORRISO",
      estado: "MT",
    };
    const template = "{{armazem_nome}} / {{armazem_municipio}} / {{armazem_uf}} / {{variavel_inexistente}}";
    const nota = buildNota(res, "5118", { ...modeloBase, dados_adicionais_template: template });

    expect(nota.dadosAdicionais).toContain("ARMAZEM EXPEDICAO LTDA");
    expect(nota.dadosAdicionais).toContain("SORRISO");
    expect(nota.dadosAdicionais).toContain("####");
    expect(nota.dadosAdicionais).not.toContain("{{");
  });
});
