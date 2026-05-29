import { describe, expect, it } from "vitest";
import { resolveContrato, type CadastrosBundle } from "./resolve";
import type { Cooperativa, Grl019Report, Grl019Row, ModeloNota, Produto, TipoContrato } from "./types";

const rowBase: Grl019Row = {
  contrato: "C-1",
  contratoVinculado: "C-2",
  empresa: "COAFORTE",
  tpFaturamento: "RECEBIMENTO",
  codContrato: "108",
  descContrato: "Contrato teste",
  nomeRazaoSocial: "Produtor",
  cpfCnpj: "111",
  ie: "",
  endereco: "Rua A",
  municipio: "Cidade",
  estado: "UF",
  codItem: "SOJA",
  descItem: "Soja",
  precoUnitIcms: 120,
  tpFrete: "",
  observacao: "",
  _raw: {},
};

const expedicaoRow: Grl019Row = {
  ...rowBase,
  contrato: "C-2",
  contratoVinculado: "C-1",
  tpFaturamento: "EXPEDIÇÃO",
  nomeRazaoSocial: "Armazém",
  cpfCnpj: "222",
};

const report: Grl019Report = {
  fileName: "teste.xlsx",
  importedAt: "2026-05-29T00:00:00.000Z",
  rows: [rowBase, expedicaoRow],
  empresas: ["COAFORTE"],
};

const cooperativa: Cooperativa = {
  id: "coop-1",
  nome_grl019: "COAFORTE",
  razao_social: "Cooperativa COAFORTE",
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

const modelo5118: ModeloNota = {
  id: "modelo-5118",
  cooperativa_id: cooperativa.id,
  cfop: "5118",
  nome_modelo: "Modelo 5118",
  natureza_operacao: null,
  tipo_destinatario: "cooperativa",
  dados_adicionais_template: null,
  ativo: true,
  created_at: "",
  updated_at: "",
};

const modelo5923: ModeloNota = {
  ...modelo5118,
  id: "modelo-5923",
  cfop: "5923",
  nome_modelo: "Modelo 5923",
  tipo_destinatario: "armazem_destinatario",
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

function tipoContrato(overrides: Partial<TipoContrato> = {}): TipoContrato {
  return {
    id: overrides.id ?? "tipo-1",
    cooperativa_id: cooperativa.id,
    codigo_contrato: "108",
    descricao_contrato: null,
    tp_faturamento: "RECEBIMENTO",
    cfop: "5118",
    modelo_nota_id: modelo5118.id,
    exige_contrato_vinculado: false,
    gera_operacao_casada: false,
    ativo: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function cadastros(overrides: Partial<CadastrosBundle> = {}): CadastrosBundle {
  return {
    cooperativas: [cooperativa],
    armazens: [],
    produtos: [produto],
    modelos: [modelo5118, modelo5923],
    tipos: [tipoContrato()],
    ...overrides,
  };
}

describe("resolveContrato", () => {
  it("resolve tipo por cooperativa, código e TP FATURAMENTO ativo", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      modelos: [modelo5118, modelo5923],
      tipos: [
        tipoContrato({ id: "exp", tp_faturamento: "EXPEDIÇÃO", modelo_nota_id: modelo5923.id, cfop: "5923" }),
        tipoContrato({ id: "rec" }),
      ],
    }));

    expect(res.errors).toEqual([]);
    expect(res.modelo?.cfop).toBe("5118");
  });

  it("bloqueia duplicidade ativa para mesma cooperativa, código e TP FATURAMENTO", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      tipos: [tipoContrato({ id: "a" }), tipoContrato({ id: "b" })],
    }));

    expect(res.podeGerar).toBe(false);
    expect(res.errors[0]).toContain("Existe mais de uma parametrização ativa para o contrato 108 / RECEBIMENTO / COAFORTE");
    expect(res.cfop).toBeUndefined();
  });

  it("valida modelo ativo da mesma cooperativa para operação casada 5118 + 5923", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      modelos: [modelo5118, { ...modelo5923, ativo: false }],
      tipos: [tipoContrato({ gera_operacao_casada: true })],
    }));

    expect(res.ofereceCasada).toBe(true);
    expect(res.podeGerar).toBe(false);
    expect(res.errors).toContain("O tipo de contrato gera operação casada, mas o modelo CFOP 5923 não está cadastrado ou ativo para a cooperativa COAFORTE.");
  });

  it("trata EXPEDIÇÃO vinculada como vínculo do 5923 sem permitir geração direta", () => {
    const res = resolveContrato(report, expedicaoRow, cadastros({
      tipos: [
        tipoContrato({ id: "rec", gera_operacao_casada: true }),
        tipoContrato({
          id: "exp",
          tp_faturamento: "EXPEDIÇÃO",
          modelo_nota_id: modelo5923.id,
          cfop: "5923",
        }),
      ],
    }));

    expect(res.errors).toEqual([]);
    expect(res.expedicaoVinculadaRecebimento).toBe(true);
    expect(res.expedicaoComoVinculo5923).toBe(true);
    expect(res.contratoRecebimentoVinculado).toBe("C-1");
    expect(res.parametrizacaoSuspeitaExpedicao5923).toBe(true);
    expect(res.podeGerar).toBe(false);
    expect(res.cfop).toBe("5118");
  });

  it("bloqueia geração direta de EXPEDIÇÃO parametrizada como CFOP 5923 sem recebimento vinculado", () => {
    const expedicaoSemRecebimento = { ...expedicaoRow, contratoVinculado: "" };
    const res = resolveContrato(
      { ...report, rows: [expedicaoSemRecebimento] },
      expedicaoSemRecebimento,
      cadastros({
        tipos: [
          tipoContrato({
            id: "exp",
            tp_faturamento: "EXPEDIÇÃO",
            modelo_nota_id: modelo5923.id,
            cfop: "5923",
          }),
        ],
      }),
    );

    expect(res.expedicaoComoVinculo5923).toBe(false);
    expect(res.podeGerar).toBe(false);
    expect(res.errors).toContain(
      "Parametrização suspeita: o CFOP 5923 deve ser gerado pela operação casada 5118 + 5923, não diretamente pela expedição.",
    );
  });
});
