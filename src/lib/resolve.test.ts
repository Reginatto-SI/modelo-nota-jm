import { describe, expect, it } from "vitest";
import { resolveContrato, type CadastrosBundle } from "./resolve";
import type { Armazem, Cooperativa, Grl019Report, Grl019Row, ModeloNota, Produto, TipoContrato } from "./types";

const rowBase: Grl019Row = {
  contrato: "C-1",
  contratoVinculado: "C-2",
  contratoCliente: "",
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
  moeda: "R$",
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
  tipo_frete_padrao: null,
  cst_icms_padrao: null,
  quantidade_padrao: null,
  valor_unitario_padrao: null,
  valor_total_padrao: null,
  fator_conversao_dolar: null,
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


const armazemCadastrado: Armazem = {
  id: "armazem-1",
  razao_social: "Nome cadastrado",
  cnpj_cpf: "222",
  inscricao_estadual: "IE-222",
  endereco: "Rua Expedição",
  bairro: null,
  cep: null,
  municipio: "Cidade Expedição",
  uf: "MT",
  telefone: null,
  tipo: "armazem",
  origem_cadastro: "manual",
  ultima_sincronizacao_grl019: null,
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


  it("permite 5923 isolado quando o tipo não exige vínculo nem operação casada", () => {
    const row5923 = { ...rowBase, contratoVinculado: "0", codContrato: "114" };
    const res = resolveContrato(
      { ...report, rows: [row5923] },
      row5923,
      cadastros({
        modelos: [modelo5118, modelo5923],
        tipos: [
          tipoContrato({
            codigo_contrato: "114",
            cfop: "5923",
            modelo_nota_id: modelo5923.id,
            exige_contrato_vinculado: false,
            gera_operacao_casada: false,
          }),
        ],
      }),
    );

    expect(res.errors).toEqual([]);
    expect(res.modelo?.cfop).toBe("5923");
    expect(res.modelo5923).toBeUndefined();
    expect(res.ofereceCasada).toBe(false);
    expect(res.podeGerar).toBe(true);
  });

  it("trata RECEBIMENTO e ENTRADA como TP FATURAMENTO equivalentes", () => {
    const rowEntrada = { ...rowBase, tpFaturamento: " entrada " };
    const resEntradaComCadastroRecebimento = resolveContrato(
      { ...report, rows: [rowEntrada] },
      rowEntrada,
      cadastros({ tipos: [tipoContrato({ tp_faturamento: "RECEBIMENTO" })] }),
    );
    const resRecebimentoComCadastroEntrada = resolveContrato(
      report,
      rowBase,
      cadastros({ tipos: [tipoContrato({ tp_faturamento: "ENTRADA" })] }),
    );

    expect(resEntradaComCadastroRecebimento.errors).toEqual([]);
    expect(resEntradaComCadastroRecebimento.tipoContrato?.tp_faturamento).toBe("RECEBIMENTO");
    expect(resRecebimentoComCadastroEntrada.errors).toEqual([]);
    expect(resRecebimentoComCadastroEntrada.tipoContrato?.tp_faturamento).toBe("ENTRADA");
  });

  it("trata EXPEDIÇÃO e SAÍDA como TP FATURAMENTO equivalentes", () => {
    const rowSaida = { ...expedicaoRow, tpFaturamento: " saída " };
    const res = resolveContrato(
      { ...report, rows: [rowBase, rowSaida] },
      rowSaida,
      cadastros({
        tipos: [
          tipoContrato({ id: "rec", gera_operacao_casada: true }),
          tipoContrato({ id: "exp", tp_faturamento: "EXPEDIÇÃO", modelo_nota_id: modelo5923.id, cfop: "5923" }),
        ],
      }),
    );

    expect(res.errors).toEqual([]);
    expect(res.expedicaoVinculadaRecebimento).toBe(true);
    expect(res.parametrizacaoSuspeitaExpedicao5923).toBe(true);
    expect(res.podeGerar).toBe(false);
  });

  it("resolve código de contrato alfanumérico sem remover letras", () => {
    const rowAlfanumerica = {
      ...rowBase,
      codContrato: " coe ",
      descContrato: "CONTRATO C/ORDEM ETANOL TRIB PIS/COFINS (CFOP 5120)",
    };
    const res = resolveContrato({ ...report, rows: [rowAlfanumerica] }, rowAlfanumerica, cadastros({
      tipos: [tipoContrato({ codigo_contrato: "COE" })],
    }));

    expect(res.errors).toEqual([]);
    expect(res.tipoContrato?.codigo_contrato).toBe("COE");
    expect(res.podeGerar).toBe(true);
  });

  it("mantém compatibilidade com códigos numéricos comparados como texto", () => {
    const res = resolveContrato(report, { ...rowBase, codContrato: " 108 " }, cadastros({
      tipos: [tipoContrato({ codigo_contrato: "108" })],
    }));

    expect(res.errors).toEqual([]);
    expect(res.tipoContrato?.codigo_contrato).toBe("108");
  });

  it("usa modelo liberado para a cooperativa via N:N (cooperativa_ids)", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      modelos: [{ ...modelo5118, cooperativa_id: null, cooperativa_ids: [cooperativa.id] }, modelo5923],
    }));

    expect(res.errors).toEqual([]);
    expect(res.modelo?.id).toBe("modelo-5118");
  });

  it("bloqueia geração quando o modelo não está liberado para a cooperativa", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      // Modelo existe e ativo, mas liberado apenas para outra cooperativa.
      modelos: [{ ...modelo5118, cooperativa_id: null, cooperativa_ids: ["outra-coop"] }, modelo5923],
    }));

    expect(res.podeGerar).toBe(false);
    expect(res.modelo).toBeUndefined();
    expect(res.errors.some((e) => e.includes("não está liberado para a cooperativa"))).toBe(true);
  });


  it("usa empresa/armazém em mensagem de modelo 5923 isolado não liberado", () => {
    const row5923 = { ...rowBase, contratoVinculado: "0", codContrato: "114" };
    const res = resolveContrato(
      { ...report, rows: [row5923] },
      row5923,
      cadastros({
        modelos: [modelo5118, { ...modelo5923, cooperativa_id: null, cooperativa_ids: ["outra-coop"] }],
        tipos: [
          tipoContrato({
            codigo_contrato: "114",
            cfop: "5923",
            modelo_nota_id: modelo5923.id,
            exige_contrato_vinculado: false,
            gera_operacao_casada: false,
          }),
        ],
      }),
    );

    expect(res.podeGerar).toBe(false);
    expect(res.modelo).toBeUndefined();
    expect(res.errors.some((e) => e.includes("não está liberado para a empresa/armazém"))).toBe(true);
    expect(res.errors.some((e) => e.includes("não está liberado para a cooperativa"))).toBe(false);
  });


  it("aceita CST ICMS do modelo quando o produto não tem CST cadastrada", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      modelos: [{ ...modelo5118, cst_icms_padrao: "090" }, modelo5923],
      produtos: [{ ...produto, cst_icms: null }],
    }));

    expect(res.podeGerar).toBe(true);
    expect(res.warnings).not.toContain("Produto cadastrado sem NCM ou CST.");
  });

  it("resolve modelo simples com CFOP parametrizado fora da lista original", () => {
    const modelo5120: ModeloNota = {
      ...modelo5118,
      id: "modelo-5120",
      cfop: "5120",
      nome_modelo: "Modelo 5120",
      natureza_operacao: "Venda de produção do estabelecimento",
      tipo_destinatario: "cooperativa",
      cst_icms_padrao: "090",
    };
    const res = resolveContrato(report, rowBase, cadastros({
      modelos: [modelo5120, modelo5923],
      produtos: [{ ...produto, cst_icms: null }],
      tipos: [tipoContrato({ cfop: "5120", modelo_nota_id: modelo5120.id })],
    }));

    expect(res.errors).toEqual([]);
    expect(res.cfop).toBe("5120");
    expect(res.modelo?.id).toBe("modelo-5120");
    expect(res.ofereceCasada).toBe(false);
    expect(res.podeGerar).toBe(true);
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

  it("localiza destinatário do 5923 pelo CPF/CNPJ normalizado da expedição", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      armazens: [{ ...armazemCadastrado, cnpj_cpf: "000.000.000-222" }],
      tipos: [tipoContrato({ gera_operacao_casada: true })],
    }));

    expect(res.armazem?.id).toBe("armazem-1");
    expect(res.warnings).not.toContain("Destinatário não encontrado no cadastro. Dados utilizados diretamente do GRL019.");
  });

  it("não usa razão social como chave do destinatário e permite fallback para GRL019", () => {
    const res = resolveContrato(report, rowBase, cadastros({
      armazens: [{ ...armazemCadastrado, cnpj_cpf: "999", razao_social: "Armazém" }],
      tipos: [tipoContrato({ gera_operacao_casada: true })],
    }));

    expect(res.armazem).toBeUndefined();
    expect(res.armazemPorNome).toBe(false);
    expect(res.warnings).toContain("Destinatário não encontrado no cadastro. Dados utilizados diretamente do GRL019.");
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

  it("não oferece operação casada para CFOP 5132 mesmo com modelo 5923 cadastrado", () => {
    const modelo5132: ModeloNota = {
      ...modelo5118,
      id: "modelo-5132",
      cfop: "5132",
      nome_modelo: "Modelo 5132",
      cst_icms_padrao: "51",
    };
    const res = resolveContrato(report, rowBase, cadastros({
      modelos: [modelo5132, modelo5923],
      tipos: [tipoContrato({ cfop: "5132", modelo_nota_id: modelo5132.id, gera_operacao_casada: true })],
    }));

    expect(res.cfop).toBe("5132");
    expect(res.ofereceCasada).toBe(false);
    expect(res.modelo5923).toBeUndefined();
  });

  it("alerta contrato 5132 com suspeita de zeros à esquerda descaracterizados sem corrigir o valor", () => {
    const modelo5132: ModeloNota = {
      ...modelo5118,
      id: "modelo-5132",
      cfop: "5132",
      nome_modelo: "Modelo 5132",
      cst_icms_padrao: "51",
    };
    const row5132 = { ...rowBase, contrato: "431969", contratoVinculado: "" };
    const res = resolveContrato({ ...report, rows: [row5132] }, row5132, cadastros({
      modelos: [modelo5132],
      tipos: [tipoContrato({ cfop: "5132", modelo_nota_id: modelo5132.id })],
    }));

    expect(res.searchedRow.contrato).toBe("431969");
    expect(res.warnings.some((warning) => warning.includes("zeros à esquerda"))).toBe(true);
  });

});
