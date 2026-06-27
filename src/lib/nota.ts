import type { Armazem, Cooperativa, Grl019Row, ModeloNota } from "./types";
import { normalizeTipoFrete } from "./tipoFrete";
import { QUANTIDADE_PADRAO, SACA_KG, type ResolveResult } from "./resolve";

export type CfopModelo = "5118" | "5923" | "5132" | "5133";

export interface NotaParty {
  nome: string;
  cpfCnpj: string;
  ie: string;
  endereco: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
}

export interface NotaPdfFileNameMeta {
  contrato: string;
  contratoVinculado: string;
  contratoCliente: string;
  produtorNome: string;
}

export interface Nota {
  cfop: string;
  nomeModelo: string;
  naturezaOperacao: string;
  emitente: NotaParty;
  destinatario: NotaParty;
  produto: { codigo: string; descricao: string; ncm: string; cst: string; unidade: string };
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  dataEmissao: string;
  dataSaida: string;
  horaSaida: string;
  tpFrete: string;
  placaVeiculo: string;
  transportador: string;
  dadosAdicionais: string;
  observacao: string;
  pdfFileNameMeta?: NotaPdfFileNameMeta;
  requiresManualValorUnitario?: boolean;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function cleanFileNameField(value: unknown) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\/\\:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[ .-]+|[ .-]+$/g, "");
}

function sanitizePdfFileName(value: string) {
  const sanitized = value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\/\\:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[ .-]+|[ .-]+$/g, "");

  return `${sanitized || "modelo-nota-jm"}.pdf`;
}

export function buildNotaPdfFileName(nota: Nota) {
  const cfop = cleanFileNameField(nota.cfop);
  const meta = nota.pdfFileNameMeta;
  const contrato = cleanFileNameField(meta?.contrato);
  const contratoVinculado = cleanFileNameField(meta?.contratoVinculado);
  const contratoCliente = cleanFileNameField(meta?.contratoCliente);
  const produtorNome = cleanFileNameField(meta?.produtorNome || nota.emitente.nome);
  const contratos = [contrato, contratoVinculado].filter(Boolean).join("-");
  const segments = [cfop, "CONFIRMAÇÃO DE NEGÓCIO", contratos].filter(Boolean);

  if (contratoCliente) segments.push("CONTRATO", contratoCliente);

  const baseName = `${segments.join(" ")}${produtorNome ? ` - ${produtorNome}` : ""}`;
  return sanitizePdfFileName(baseName);
}


export const TEMPLATE_VARIABLE_GROUPS: { grupo: string; itens: string[] }[] = [
  { grupo: "Contrato", itens: ["{{contrato}}", "{{contrato_vinculado}}", "{{contrato_cliente}}", "{{confirmacao_negocio}}"] },
  {
    grupo: "Produtor",
    itens: [
      "{{produtor_nome}}",
      "{{produtor_cpf_cnpj}}",
      "{{produtor_ie}}",
      "{{produtor_endereco}}",
      "{{produtor_municipio}}",
      "{{produtor_uf}}",
    ],
  },
  {
    grupo: "Cooperativa",
    itens: [
      "{{cooperativa_nome}}",
      "{{cooperativa_razao_social}}",
      "{{cooperativa_cnpj}}",
      "{{cooperativa_ie}}",
      "{{cooperativa_endereco}}",
      "{{cooperativa_bairro}}",
      "{{cooperativa_cep}}",
      "{{cooperativa_municipio}}",
      "{{cooperativa_uf}}",
      "{{cooperativa_telefone}}",
      "{{cooperativa_endereco_completo}}",
    ],
  },
  {
    grupo: "Destinatário final / armazém",
    itens: [
      "{{armazem_nome}}",
      "{{armazem_razao_social}}",
      "{{armazem_cnpj}}",
      "{{armazem_ie}}",
      "{{armazem_endereco}}",
      "{{armazem_bairro}}",
      "{{armazem_cep}}",
      "{{armazem_municipio}}",
      "{{armazem_uf}}",
      "{{armazem_telefone}}",
      "{{armazem_endereco_completo}}",
      "{{destinatario_final_nome}}",
      "{{destinatario_final_cnpj}}",
      "{{destinatario_final_ie}}",
      "{{destinatario_final_endereco}}",
      "{{destinatario_final_endereco_completo}}",
      "{{destinatario_final_municipio}}",
      "{{destinatario_final_uf}}",
    ],
  },
  {
    grupo: "Produto / modelo fiscal",
    itens: [
      "{{produto_codigo}}",
      "{{produto_descricao}}",
      "{{produto}}",
      "{{ncm}}",
      "{{cst}}",
      "{{cfop}}",
      "{{unidade}}",
      "{{quantidade}}",
      "{{valor_unitario}}",
      "{{valor_total}}",
      "{{natureza_operacao}}",
    ],
  },
  { grupo: "Transporte", itens: ["{{placa_cavalo}}", "{{motorista_nome}}", "{{motorista_cpf}}", "{{nf_referenciada}}"] },
  {
    grupo: "CNDs / retenções",
    itens: [
      "{{cnd_cooperativa_numero}}",
      "{{cnd_cooperativa_codigo_autenticacao}}",
      "{{cnd_cooperativa_vencimento}}",
      "{{cnd_produtor_numero}}",
      "{{cnd_produtor_codigo_autenticacao}}",
      "{{cnd_produtor_vencimento}}",
      "{{cnd_destinatario_numero}}",
      "{{cnd_destinatario_codigo_autenticacao}}",
      "{{cnd_destinatario_vencimento}}",
      "{{funrural_valor}}",
      "{{funrural_base}}",
      "{{retencao_valor}}",
      "{{retencao_base}}",
    ],
  },
];

const EMPTY_PARTY: NotaParty = {
  nome: "",
  cpfCnpj: "",
  ie: "",
  endereco: "",
  bairro: "",
  municipio: "",
  uf: "",
  cep: "",
};

function compact(parts: Array<string | null | undefined>, separator = ", ") {
  return parts.map((part) => (part ?? "").toString().trim()).filter(Boolean).join(separator);
}

function toPositiveNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(String(value).replace(",", "."));
  return Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}

export const FATOR_DOLAR_FALLBACK = 4;

export type MoedaNormalizada = "BRL" | "USD" | "UNKNOWN";

export type CurrencyCalcInput = {
  precoSaca: number;
  moeda?: string | null;
  quantidadeKg: number;
  fatorDolar?: number | null;
};

export type OrigemFatorConversao = "modelo" | "fallback" | "não aplicável";

export type CurrencyCalcResult = {
  moedaNormalizada: MoedaNormalizada;
  precoSacaOriginal: number;
  fatorConversao: number;
  origemFatorConversao: OrigemFatorConversao;
  precoSacaConvertido: number;
  valorUnitarioKg: number;
  valorTotal: number;
};

export function normalizeMoeda(moeda: string | null | undefined): MoedaNormalizada {
  const normalized = (moeda ?? "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
  if (["US$", "USD", "DOLAR"].includes(normalized)) return "USD";
  if (!normalized || ["R$", "BRL", "REAL", "REAIS"].includes(normalized)) return "BRL";
  return "UNKNOWN";
}

export function isMoedaDolar(moeda: string | null | undefined): boolean {
  return normalizeMoeda(moeda) === "USD";
}

export function calculateValorUnitarioKg(precoSaca: unknown): number | null {
  const precoSacaValido = toPositiveNumber(precoSaca);
  return precoSacaValido == null ? null : precoSacaValido / SACA_KG;
}

export function calculateCurrencyValues(input: CurrencyCalcInput): CurrencyCalcResult | null {
  const precoSacaOriginal = toPositiveNumber(input.precoSaca);
  const quantidadeKg = toPositiveNumber(input.quantidadeKg);
  if (precoSacaOriginal == null || quantidadeKg == null) return null;

  const moedaNormalizada = normalizeMoeda(input.moeda);
  const fatorDolar = toPositiveNumber(input.fatorDolar);
  const origemFatorConversao: OrigemFatorConversao = moedaNormalizada !== "USD"
    ? "não aplicável"
    : fatorDolar != null ? "modelo" : "fallback";
  // Ponto único do fallback provisório de dólar: evita conversões divergentes entre detalhes, prévia e PDF.
  const fatorConversao = moedaNormalizada === "USD" ? fatorDolar ?? FATOR_DOLAR_FALLBACK : 1;
  const precoSacaConvertido = precoSacaOriginal * fatorConversao;
  const valorUnitarioKg = precoSacaConvertido / SACA_KG;

  return {
    moedaNormalizada,
    precoSacaOriginal,
    fatorConversao,
    origemFatorConversao,
    precoSacaConvertido,
    valorUnitarioKg,
    valorTotal: quantidadeKg * valorUnitarioKg,
  };
}

function partyFromCooperativa(cooperativa?: Cooperativa): NotaParty {
  if (!cooperativa) return { ...EMPTY_PARTY };
  return {
    nome: cooperativa.razao_social,
    cpfCnpj: cooperativa.cnpj ?? "",
    ie: cooperativa.inscricao_estadual ?? "",
    endereco: cooperativa.endereco ?? "",
    bairro: cooperativa.bairro ?? "",
    municipio: cooperativa.municipio ?? "",
    uf: cooperativa.uf ?? "",
    cep: cooperativa.cep ?? "",
  };
}

function partyFromArmazemOrExpedicao(armazem?: Armazem, expedicao?: Grl019Row): NotaParty {
  if (armazem) {
    return {
      nome: armazem.razao_social,
      cpfCnpj: armazem.cnpj_cpf ?? "",
      ie: armazem.inscricao_estadual ?? "",
      endereco: armazem.endereco ?? "",
      bairro: armazem.bairro ?? "",
      municipio: armazem.municipio ?? "",
      uf: armazem.uf ?? "",
      cep: armazem.cep ?? "",
    };
  }

  if (expedicao) {
    return {
      nome: expedicao.nomeRazaoSocial,
      cpfCnpj: expedicao.cpfCnpj,
      ie: expedicao.ie,
      endereco: expedicao.endereco,
      bairro: "",
      municipio: expedicao.municipio,
      uf: expedicao.estado,
      cep: "",
    };
  }

  return { ...EMPTY_PARTY };
}

function resolveTipoDestinatario(modelo: ModeloNota, which: CfopModelo) {
  // Compatibilidade com modelos antigos sem tipo_destinatario persistido: mantém o comportamento legado por CFOP.
  return modelo.tipo_destinatario ?? (which === "5923" ? "armazem_destinatario" : "cooperativa");
}

function buildVars(n: Nota, r: ResolveResult): Record<string, string> {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtUnit = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 6, maximumFractionDigits: 6 });
  const manual = (value: string | null | undefined, placeholder: string) => {
    const text = (value ?? "").toString().trim();
    return text || placeholder;
  };
  // Placeholder de revisão manual quando o dado não existe em nenhuma origem.
  const ph = (v: string | null | undefined) => {
    const t = (v ?? "").toString().trim();
    return t ? t : "####";
  };
  const exped = r.expedicaoRow;
  const armazemNome = r.armazem?.razao_social || exped?.nomeRazaoSocial || "";
  const armazemCnpj = r.armazem?.cnpj_cpf || exped?.cpfCnpj || "";
  const armazemIe = r.armazem?.inscricao_estadual || exped?.ie || "";
  const armazemEndereco = r.armazem?.endereco || exped?.endereco || "";
  const armazemBairro = r.armazem?.bairro || "";
  const armazemCep = r.armazem?.cep || "";
  const armazemMunicipio = r.armazem?.municipio || exped?.municipio || "";
  const armazemUf = r.armazem?.uf || exped?.estado || "";
  const armazemTelefone = r.armazem?.telefone || "";
  const armazemEnderecoCompleto = compact([armazemEndereco, armazemBairro, armazemCep && `CEP ${armazemCep}`, armazemMunicipio, armazemUf]);
  const cooperativaEnderecoCompleto = compact([
    r.cooperativa?.endereco,
    r.cooperativa?.bairro,
    r.cooperativa?.cep && `CEP ${r.cooperativa.cep}`,
    r.cooperativa?.municipio,
    r.cooperativa?.uf,
  ]);
  const contrato = r.searchedRow.contrato;
  const contratoVinculado = r.searchedRow.contratoVinculado;
  const confirmacaoNegocio = compact([contrato, contratoVinculado], "/");

  return {
    contrato: ph(contrato),
    contrato_vinculado: ph(contratoVinculado),
    contrato_cliente: ph(r.searchedRow.contratoCliente),
    confirmacao_negocio: ph(confirmacaoNegocio),
    produtor_nome: ph(n.emitente.nome),
    produtor_cpf_cnpj: ph(n.emitente.cpfCnpj),
    produtor_ie: ph(n.emitente.ie),
    produtor_endereco: ph(n.emitente.endereco),
    produtor_municipio: ph(n.emitente.municipio),
    produtor_uf: ph(n.emitente.uf),
    cooperativa_nome: ph(r.cooperativa?.razao_social),
    cooperativa_razao_social: ph(r.cooperativa?.razao_social),
    cooperativa_cnpj: ph(r.cooperativa?.cnpj),
    cooperativa_ie: ph(r.cooperativa?.inscricao_estadual),
    cooperativa_endereco: ph(r.cooperativa?.endereco),
    cooperativa_bairro: ph(r.cooperativa?.bairro),
    cooperativa_cep: ph(r.cooperativa?.cep),
    cooperativa_municipio: ph(r.cooperativa?.municipio),
    cooperativa_uf: ph(r.cooperativa?.uf),
    cooperativa_telefone: ph(r.cooperativa?.telefone),
    cooperativa_endereco_completo: ph(cooperativaEnderecoCompleto),
    armazem_nome: ph(armazemNome),
    armazem_razao_social: ph(armazemNome),
    armazem_cnpj: ph(armazemCnpj),
    armazem_ie: ph(armazemIe),
    armazem_endereco: ph(armazemEndereco),
    armazem_bairro: ph(armazemBairro),
    armazem_cep: ph(armazemCep),
    armazem_municipio: ph(armazemMunicipio),
    armazem_uf: ph(armazemUf),
    armazem_telefone: ph(armazemTelefone),
    armazem_endereco_completo: ph(armazemEnderecoCompleto),
    destinatario_final_nome: ph(armazemNome),
    destinatario_final_cnpj: ph(armazemCnpj),
    destinatario_final_ie: ph(armazemIe),
    destinatario_final_endereco: ph(armazemEndereco),
    destinatario_final_endereco_completo: ph(armazemEnderecoCompleto),
    destinatario_final_municipio: ph(armazemMunicipio),
    destinatario_final_uf: ph(armazemUf),
    produto_codigo: ph(n.produto.codigo),
    produto_descricao: ph(n.produto.descricao),
    produto: ph(n.produto.descricao),
    ncm: ph(n.produto.ncm),
    cst: ph(n.produto.cst),
    cfop: ph(n.cfop),
    unidade: ph(n.produto.unidade),
    natureza_operacao: ph(n.naturezaOperacao),
    quantidade: fmt(n.quantidade),
    valor_unitario: fmtUnit(n.valorUnitario),
    valor_total: fmt(n.valorTotal),
    placa_cavalo: manual(n.placaVeiculo, "########"),
    motorista_nome: "########",
    motorista_cpf: "###########",
    nf_referenciada: "#####",
    cnd_cooperativa_numero: "###########",
    cnd_cooperativa_codigo_autenticacao: "##########",
    cnd_cooperativa_vencimento: "##/##/####",
    cnd_produtor_numero: "###########",
    cnd_produtor_codigo_autenticacao: "##########",
    cnd_produtor_vencimento: "##/##/####",
    cnd_destinatario_numero: "###########",
    cnd_destinatario_codigo_autenticacao: "##########",
    cnd_destinatario_vencimento: "##/##/####",
    funrural_valor: "R$ ##,##",
    funrural_base: "R$ ##.###,##",
    retencao_valor: "R$ ##,##",
    retencao_base: "R$ ##.###,##",
  };
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return (template || "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const v = vars[key.toLowerCase()];
    // Nunca deixa a variável crua no texto: dado ausente vira placeholder de revisão manual.
    return v != null ? v : "####";
  });
}


export function syncPlacaCavaloPlaceholder(text: string, placa: string): string {
  const placaSegura = placa.trim() || "########";
  // Troca somente o token imediato após "PLACA CAVALO:" (placeholder ou placa) e preserva o restante da linha.
  return text.replace(
    /(PLACA CAVALO:\s*)(########|\{\{\s*placa_cavalo\s*\}\}|[A-Z]{3}-?\d[A-Z0-9]\d{2})/i,
    `$1${placaSegura}`,
  );
}

export function getPendingPlaceholders(text: string): string[] {
  const matches = text.match(/##\/##\/####|R\$\s*#+(?:[.,]#+)*|#{2,}|\{\{\s*[a-z_]+\s*\}\}/gi) ?? [];
  return Array.from(new Set(matches.map((match) => match.trim())));
}

export function hasPendingPlaceholders(text: string): boolean {
  return getPendingPlaceholders(text).length > 0;
}

const MENSAGEM_FALLBACK_DOLAR = "Contrato em dólar sem fator de conversão configurado no modelo. O sistema aplicou temporariamente o fator padrão 4,00. Revise antes de gerar o PDF.";

function addWarningOnce(warnings: string[], warning: string) {
  if (!warnings.includes(warning)) warnings.push(warning);
}

export function buildNota(r: ResolveResult, which: CfopModelo, modelo: ModeloNota): Nota {
  const rec = r.recebimentoRow ?? r.searchedRow;
  const precoSaca = toPositiveNumber(rec.precoUnitIcms);
  const quantidade = toPositiveNumber(modelo.quantidade_padrao) ?? QUANTIDADE_PADRAO;
  const currencyCalc = calculateCurrencyValues({
    precoSaca: precoSaca ?? 0,
    moeda: rec.moeda,
    quantidadeKg: quantidade,
    fatorDolar: modelo.fator_conversao_dolar,
  });
  const valorUnitarioGrl019 = currencyCalc?.valorUnitarioKg ?? null;
  const valorTotalPadrao = toPositiveNumber(modelo.valor_total_padrao);
  const valorUnitarioPadrao = toPositiveNumber(modelo.valor_unitario_padrao);
  // Prioridade financeira: preço da saca do GRL019 sempre prevalece; valores do modelo são apenas fallback.
  const valorUnitario = valorUnitarioGrl019 ?? valorUnitarioPadrao ?? (valorTotalPadrao != null ? valorTotalPadrao / quantidade : 0);
  const valorTotal = quantidade * valorUnitario;
  if (currencyCalc?.origemFatorConversao === "fallback") {
    addWarningOnce(r.warnings, MENSAGEM_FALLBACK_DOLAR);
  }
  if (valorUnitarioGrl019 == null) {
    addWarningOnce(r.warnings,
      valorUnitario > 0
        ? "Preço da saca não localizado no GRL019. Valor inicial calculado pelo fallback financeiro do modelo."
        : "Preço da saca não localizado no GRL019. Informe o valor unitário manualmente antes de gerar o PDF.",
    );
  }
  // CST exibida no PDF: prioridade para o Modelo de Nota/CFOP; se vazio, mantém o fallback do produto.
  const cstIcmsPdf = modelo.cst_icms_padrao?.trim() || r.produto?.cst_icms?.trim() || "";

  const emitente: NotaParty = {
    nome: rec.nomeRazaoSocial,
    cpfCnpj: rec.cpfCnpj,
    ie: rec.ie,
    endereco: rec.endereco,
    bairro: "",
    municipio: rec.municipio,
    uf: rec.estado,
    cep: "",
  };

  const tipoDestinatario = resolveTipoDestinatario(modelo, which);
  const destinatario = tipoDestinatario === "armazem_destinatario"
    ? partyFromArmazemOrExpedicao(r.armazem, r.expedicaoRow)
    : partyFromCooperativa(r.cooperativa);

  const nota: Nota = {
    cfop: modelo.cfop,
    nomeModelo: modelo.nome_modelo,
    naturezaOperacao: modelo.natureza_operacao ?? "",
    emitente,
    destinatario,
    produto: {
      codigo: r.produto?.codigo_produto ?? rec.codItem,
      descricao: r.produto?.descricao ?? rec.descItem,
      ncm: r.produto?.ncm ?? "",
      cst: cstIcmsPdf,
      unidade: r.produto?.unidade ?? "KG",
    },
    quantidade,
    valorUnitario,
    valorTotal,
    dataEmissao: todayISO(),
    dataSaida: todayISO(),
    horaSaida: "",
    // O frete inicial vem do modelo; se ausente, aplica o fallback solicitado.
    tpFrete: normalizeTipoFrete(modelo.tipo_frete_padrao),
    placaVeiculo: "",
    transportador: "",
    dadosAdicionais: "",
    observacao: rec.observacao,
    // Metadados vindos da mesma resolução usada no modelo/prévia para nomear o PDF sem criar fonte paralela.
    requiresManualValorUnitario: valorUnitario <= 0,
    pdfFileNameMeta: {
      contrato: r.searchedRow.contrato,
      contratoVinculado: r.searchedRow.contratoVinculado,
      contratoCliente: r.searchedRow.contratoCliente,
      produtorNome: emitente.nome,
    },
  };

  nota.dadosAdicionais = renderTemplate(modelo.dados_adicionais_template ?? "", buildVars(nota, r));
  return nota;
}
