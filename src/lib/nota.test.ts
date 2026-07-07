import { describe, expect, it } from "vitest";
import { buildNota, buildNotaPdfFileName, calculateCurrencyValues, calculateValorUnitarioKg, isMoedaDolar, normalizeMoeda, syncPlacaCavaloPlaceholder } from "./nota";
import { TIPO_FRETE_DEFAULT } from "./tipoFrete";
import { formatCurrencyBR, formatUnitValueBR, parseCurrencyBR, parseDecimalBR } from "./numberFormat";
import type { Cooperativa, Grl019Row, ModeloNota, Produto } from "./types";
import type { ResolveResult } from "./resolve";

const row: Grl019Row = {
  contrato: "C-1",
  contratoVinculado: "",
  contratoCliente: "4700015227",
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
  moeda: "R$",
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

  it("prioriza o preço da saca do GRL019 para calcular valor unitário por KG", () => {
    const nota = buildNota(resolveResult(), "5118", modeloBase);

    expect(nota.quantidade).toBe(30000);
    expect(nota.valorUnitario).toBe(2);
    expect(nota.valorTotal).toBe(60000);
  });

  it("converte preço da saca em dólar pelo fator configurado antes de calcular por KG", () => {
    const dolarRow = { ...row, precoUnitIcms: 12, moeda: "US$" };
    const nota = buildNota({ ...resolveResult(), searchedRow: dolarRow, recebimentoRow: dolarRow, warnings: [] }, "5118", {
      ...modeloBase,
      fator_conversao_dolar: 4,
    });

    expect(nota.valorUnitario).toBe(0.8);
    expect(nota.valorTotal).toBe(24000);
  });

  it("usa fallback centralizado quando o contrato é dólar sem fator configurado", () => {
    const warnings: string[] = [];
    const dolarRow = { ...row, precoUnitIcms: 12, moeda: "USD" };
    const nota = buildNota({ ...resolveResult(), searchedRow: dolarRow, recebimentoRow: dolarRow, warnings }, "5118", modeloBase);

    expect(nota.valorUnitario).toBe(0.8);
    expect(nota.valorTotal).toBe(24000);
    expect(nota.requiresManualValorUnitario).toBe(false);
    expect(warnings).toContain("Contrato em dólar sem fator de conversão configurado no modelo. O sistema aplicou temporariamente o fator padrão 4,00. Revise antes de gerar o PDF.");
  });

  it("identifica variações simples de moeda em dólar", () => {
    expect(isMoedaDolar("US$")).toBe(true);
    expect(isMoedaDolar("USD")).toBe(true);
    expect(isMoedaDolar("DÓLAR")).toBe(true);
    expect(isMoedaDolar("R$")).toBe(false);
    expect(normalizeMoeda("USD")).toBe("USD");
    expect(normalizeMoeda("DOLAR")).toBe("USD");
    expect(normalizeMoeda("DÓLAR")).toBe("USD");
  });

  it("centraliza cálculo financeiro de real e dólar", () => {
    const real = calculateCurrencyValues({ precoSaca: 7.1, moeda: "R$", quantidadeKg: 30000, fatorDolar: 4 });
    const dolar = calculateCurrencyValues({ precoSaca: 7.1, moeda: "US$", quantidadeKg: 30000, fatorDolar: 4 });

    expect(real?.fatorConversao).toBe(1);
    expect(real?.origemFatorConversao).toBe("não aplicável");
    expect(real?.valorUnitarioKg).toBeCloseTo(7.1 / 60);
    expect(dolar?.fatorConversao).toBe(4);
    expect(dolar?.origemFatorConversao).toBe("modelo");
    expect(dolar?.precoSacaConvertido).toBe(28.4);
    expect(dolar?.valorUnitarioKg).toBeCloseTo(28.4 / 60);
  });

  it("trata relatório antigo sem moeda como real sem quebrar o cálculo", () => {
    const rowSemMoeda = { ...row };
    delete rowSemMoeda.moeda;
    const nota = buildNota({ ...resolveResult(), searchedRow: rowSemMoeda, recebimentoRow: rowSemMoeda, warnings: [] }, "5118", modeloBase);

    expect(nota.valorUnitario).toBe(2);
    expect(nota.valorTotal).toBe(60000);
  });

  it("usa valor unitário padrão para sugerir o total inicial", () => {
    const nota = buildNota(resolveResult(), "5118", {
      ...modeloBase,
      quantidade_padrao: 30000,
      valor_unitario_padrao: 0.7,
    });

    expect(nota.valorUnitario).toBe(2);
    expect(nota.valorTotal).toBe(60000);
  });

  it("usa valor total padrão para recalcular o unitário inicial", () => {
    const nota = buildNota(resolveResult(), "5118", {
      ...modeloBase,
      quantidade_padrao: 30000,
      valor_total_padrao: 22500,
    });

    expect(nota.valorTotal).toBe(60000);
    expect(nota.valorUnitario).toBe(2);
  });

  it("prioriza valor total padrão quando total e unitário forem informados", () => {
    const nota = buildNota(resolveResult(), "5118", {
      ...modeloBase,
      quantidade_padrao: 30000,
      valor_unitario_padrao: 0.7,
      valor_total_padrao: 22500,
    });

    expect(nota.valorTotal).toBe(60000);
    expect(nota.valorUnitario).toBe(2);
  });


  it("usa valores do modelo apenas como fallback quando o GRL019 não tem preço válido", () => {
    const res = resolveResult();
    res.recebimentoRow = { ...row, precoUnitIcms: 0 };
    const nota = buildNota(res, "5118", {
      ...modeloBase,
      quantidade_padrao: 30000,
      valor_unitario_padrao: 0.7,
      valor_total_padrao: 22500,
    });

    expect(nota.valorUnitario).toBe(0.7);
    expect(nota.valorTotal).toBe(21000);
    expect(res.warnings).toContain("Preço da saca não localizado no GRL019. Valor inicial calculado pelo fallback financeiro do modelo.");
  });

  it("calcula valor unitário por KG a partir do preço da saca", () => {
    expect(calculateValorUnitarioKg(38)).toBeCloseTo(0.6333333333);
  });

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

  it("usa a CST ICMS padrão do modelo quando preenchida", () => {
    const nota = buildNota(resolveResult(), "5118", {
      ...modeloBase,
      cst_icms_padrao: "090",
    });

    expect(nota.produto.cst).toBe("090");
  });

  it("mantém fallback para a CST do produto quando o modelo não tem CST ICMS padrão", () => {
    const nota = buildNota(resolveResult(), "5118", modeloBase);

    expect(nota.produto.cst).toBe("041");
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
      origem_cadastro: "manual",
      ultima_sincronizacao_grl019: null,
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

  it("monta nome padronizado para o PDF com os dados resolvidos", () => {
    const res = resolveResult();
    res.searchedRow = {
      ...row,
      contrato: "334",
      contratoVinculado: "340",
      contratoCliente: "4700025684",
      nomeRazaoSocial: "ARIEL RIGHI",
    };
    res.recebimentoRow = res.searchedRow;
    const nota = buildNota(res, "5118", modeloBase);

    expect(buildNotaPdfFileName(nota)).toBe(
      "5118 - CONFIRMAÇÃO DE NEGÓCIO 334-340 CONTRATO 4700025684 - ARIEL RIGHI.pdf",
    );
  });

  it("omite campos ausentes e sanitiza caracteres inválidos no nome do PDF", () => {
    const res = resolveResult();
    res.searchedRow = {
      ...row,
      contrato: "334/ABC",
      contratoVinculado: "",
      contratoCliente: "4700:025684",
      nomeRazaoSocial: "ARIEL <RIGHI>?",
    };
    res.recebimentoRow = res.searchedRow;
    const nota = buildNota(res, "5923", { ...modeloBase, cfop: "5923", nome_modelo: "Modelo 5923" });

    expect(buildNotaPdfFileName(nota)).toBe(
      "5923 - CONFIRMAÇÃO DE NEGÓCIO 334-ABC CONTRATO 4700-025684 - ARIEL -RIGHI.pdf",
    );
    expect(buildNotaPdfFileName(nota)).not.toMatch(/[\/\\:*?"<>|]/);
    expect(buildNotaPdfFileName(nota)).not.toContain("undefined");
    expect(buildNotaPdfFileName(nota)).not.toContain("null");
  });

  it("monta 5118 com destinatário cooperativa, CST do modelo e fallback de quantidade", () => {
    const res = resolveResult();
    const nota = buildNota(res, "5118", {
      ...modeloBase,
      cst_icms_padrao: "51",
      dados_adicionais_template:
        "CONF {{confirmacao_negocio}} CONTRATO {{contrato}} ENTREGA {{destinatario_final_nome}} CND {{cnd_produtor_numero}}",
    });

    expect(nota.cfop).toBe("5118");
    expect(nota.produto.cst).toBe("51");
    expect(nota.destinatario.nome).toBe("Cooperativa");
    expect(nota.quantidade).toBe(30000);
    expect(nota.dadosAdicionais).toContain("CONF C-1 CONTRATO C-1");
    expect(nota.dadosAdicionais).toContain("###########");
  });

  it("monta 5923 com destinatário final por tipo_destinatario e dados completos de template", () => {
    const res = resolveResult();
    res.expedicaoRow = {
      ...row,
      contrato: "C-2",
      contratoVinculado: "C-1",
      tpFaturamento: "EXPEDIÇÃO",
      nomeRazaoSocial: "CARGILL AGRICOLA S A",
      cpfCnpj: "60000000000100",
      ie: "IE-CARGILL",
      endereco: "Rodovia MT 010",
      municipio: "Sorriso",
      estado: "MT",
    };
    const nota = buildNota(res, "5923", {
      ...modeloBase,
      cfop: "5923",
      nome_modelo: "Modelo 5923",
      tipo_destinatario: "armazem_destinatario",
      cst_icms_padrao: "41",
      dados_adicionais_template:
        "REF {{nf_referenciada}} COOP {{cooperativa_razao_social}} DEST {{destinatario_final_nome}} CND {{cnd_destinatario_numero}}",
    });

    expect(nota.cfop).toBe("5923");
    expect(nota.produto.cst).toBe("41");
    expect(nota.destinatario.nome).toBe("CARGILL AGRICOLA S A");
    expect(nota.destinatario.nome).not.toBe("Cooperativa");
    expect(nota.dadosAdicionais).toContain("REF #####");
    expect(nota.dadosAdicionais).toContain("COOP Cooperativa");
    expect(nota.dadosAdicionais).toContain("CND ###########");
  });

  it("monta 5132 sozinho com destinatário cooperativa, quantidade parametrizada e contrato com zeros", () => {
    const res = resolveResult();
    res.searchedRow = { ...row, contrato: "0000431969", contratoVinculado: "" };
    res.recebimentoRow = res.searchedRow;
    res.expedicaoRow = {
      ...row,
      contrato: "EXP-1",
      tpFaturamento: "EXPEDIÇÃO",
      nomeRazaoSocial: "COFCO INTERNATIONAL BRASIL S A",
      cpfCnpj: "11111111000191",
      ie: "IE-COFCO",
      endereco: "Estrada Rural",
      municipio: "Rondonópolis",
      estado: "MT",
    };
    const nota = buildNota(res, "5132", {
      ...modeloBase,
      cfop: "5132",
      nome_modelo: "Modelo 5132",
      cst_icms_padrao: "51",
      quantidade_padrao: 600000,
      dados_adicionais_template:
        "CONF {{confirmacao_negocio}} CONTRATO {{contrato}} ENTREGA {{destinatario_final_nome}} VALOR {{retencao_valor}}",
    });

    expect(nota.cfop).toBe("5132");
    expect(nota.produto.cst).toBe("51");
    expect(nota.destinatario.nome).toBe("Cooperativa");
    expect(nota.quantidade).toBe(600000);
    expect(nota.dadosAdicionais).toContain("CONF 0000431969 CONTRATO 0000431969");
    expect(nota.dadosAdicionais).toContain("COFCO INTERNATIONAL BRASIL S A");
    expect(buildNotaPdfFileName(nota)).toContain("0000431969");
  });

  it("monta modelo simples de CFOP genérico usando parametrização do modelo", () => {
    const res = resolveResult();
    res.expedicaoRow = {
      ...row,
      contrato: "EXP-5120",
      tpFaturamento: "EXPEDIÇÃO",
      nomeRazaoSocial: "DESTINATARIO FINAL LTDA",
      cpfCnpj: "22222222000122",
      ie: "IE-DEST",
      endereco: "Rua Destino",
      municipio: "Sorriso",
      estado: "MT",
    };
    const nota = buildNota(res, "5120", {
      ...modeloBase,
      cfop: "5120",
      nome_modelo: "Modelo 5120",
      natureza_operacao: "Venda de produção do estabelecimento",
      tipo_destinatario: "armazem_destinatario",
      cst_icms_padrao: "090",
      quantidade_padrao: 45000,
      dados_adicionais_template:
        "CFOP {{cfop}} NAT {{natureza_operacao}} CST {{cst}} DEST {{destinatario_final_nome}}",
    });

    expect(nota.cfop).toBe("5120");
    expect(nota.nomeModelo).toBe("Modelo 5120");
    expect(nota.naturezaOperacao).toBe("Venda de produção do estabelecimento");
    expect(nota.produto.cst).toBe("090");
    expect(nota.destinatario.nome).toBe("DESTINATARIO FINAL LTDA");
    expect(nota.quantidade).toBe(45000);
    expect(nota.dadosAdicionais).toContain("CFOP 5120");
    expect(nota.dadosAdicionais).toContain("NAT Venda de produção do estabelecimento");
  });

  it("mantém fallback por CFOP quando tipo_destinatario está ausente em modelo legado", () => {
    const res = resolveResult();
    res.expedicaoRow = { ...row, nomeRazaoSocial: "DESTINO FINAL", cpfCnpj: "222", tpFaturamento: "EXPEDIÇÃO" };
    const modeloLegado = { ...modeloBase, cfop: "5923", tipo_destinatario: null };

    const nota = buildNota(res, "5923", modeloLegado);

    expect(nota.destinatario.nome).toBe("DESTINO FINAL");
  });


  it("sincroniza somente o placeholder imediato da placa cavalo sem apagar o restante da linha", () => {
    const texto =
      "PLACA CAVALO: ######## CND NUM: 123 COD.AUT: ABC\nPRODUTOR: CND NUM: 456";

    expect(syncPlacaCavaloPlaceholder(texto, "ABC1D23")).toBe(
      "PLACA CAVALO: ABC1D23 CND NUM: 123 COD.AUT: ABC\nPRODUTOR: CND NUM: 456",
    );
  });

  it("sincroniza variável crua da placa cavalo sem alterar textos posteriores", () => {
    const texto = "PLACA CAVALO: {{placa_cavalo}} CND PRODUTOR: ###########";

    expect(syncPlacaCavaloPlaceholder(texto, "XYZ9Z99")).toBe(
      "PLACA CAVALO: XYZ9Z99 CND PRODUTOR: ###########",
    );
  });

  it("atualiza placa já preenchida sem alterar CND na mesma linha", () => {
    const texto = "PLACA CAVALO: ABC1D23 CND NUM: 123";

    expect(syncPlacaCavaloPlaceholder(texto, "XYZ9Z99")).toBe("PLACA CAVALO: XYZ9Z99 CND NUM: 123");
  });

  it("mantém texto intacto quando não existe marcador de placa cavalo", () => {
    const texto = "CND NUM: 123";

    expect(syncPlacaCavaloPlaceholder(texto, "XYZ9Z99")).toBe("CND NUM: 123");
  });

});


describe("formatadores de valores brasileiros", () => {
  it("interpreta decimais e moeda em formato brasileiro", () => {
    expect(parseDecimalBR("0,70")).toBe(0.7);
    expect(parseDecimalBR("1,25")).toBe(1.25);
    expect(parseCurrencyBR("R$ 22.500,00")).toBe(22500);
  });

  it("mantém seis casas visuais para valor unitário e moeda", () => {
    expect(formatUnitValueBR(0.7)).toBe("0,700000");
    expect(formatUnitValueBR(0.6333333333333333)).toBe("0,633333");
    expect(formatCurrencyBR(21000)).toBe("R$ 21.000,00");
  });
});
