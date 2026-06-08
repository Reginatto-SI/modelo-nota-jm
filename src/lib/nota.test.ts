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
});
