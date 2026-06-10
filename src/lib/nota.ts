import type { ModeloNota } from "./types";
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
  produto: { descricao: string; ncm: string; cst: string; unidade: string };
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

function buildVars(n: Nota, r: ResolveResult): Record<string, string> {
  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Placeholder de revisão manual quando o dado não existe em nenhuma origem.
  const ph = (v: string | null | undefined) => {
    const t = (v ?? "").toString().trim();
    return t ? t : "####";
  };
  const exped = r.expedicaoRow;
  // Nome/CNPJ/IE: cadastro do armazém primeiro; se ausente, dados da linha de EXPEDIÇÃO do GRL019.
  const armazemNome = r.armazem?.razao_social || exped?.nomeRazaoSocial || "";
  const armazemCnpj = r.armazem?.cnpj_cpf || exped?.cpfCnpj || "";
  const armazemIe = r.armazem?.inscricao_estadual || exped?.ie || "";
  // Endereço/Município/UF: preferir cadastro; cair para a expedição quando o cadastro não tiver.
  const armazemEndereco = r.armazem?.endereco || exped?.endereco || "";
  const armazemMunicipio = r.armazem?.municipio || exped?.municipio || "";
  const armazemUf = r.armazem?.uf || exped?.estado || "";
  return {
    contrato: ph(r.searchedRow.contrato),
    contrato_vinculado: ph(r.searchedRow.contratoVinculado),
    contrato_cliente: ph(r.searchedRow.contratoCliente),
    produtor_nome: ph(n.emitente.nome),
    produtor_cpf_cnpj: ph(n.emitente.cpfCnpj),
    produtor_ie: ph(n.emitente.ie),
    cooperativa_nome: ph(r.cooperativa?.razao_social),
    cooperativa_cnpj: ph(r.cooperativa?.cnpj),
    cooperativa_ie: ph(r.cooperativa?.inscricao_estadual),
    armazem_nome: ph(armazemNome),
    armazem_cnpj: ph(armazemCnpj),
    armazem_ie: ph(armazemIe),
    armazem_endereco: ph(armazemEndereco),
    armazem_municipio: ph(armazemMunicipio),
    armazem_uf: ph(armazemUf),
    produto: ph(n.produto.descricao),
    ncm: ph(n.produto.ncm),
    quantidade: fmt(n.quantidade),
    valor_unitario: fmt(n.valorUnitario),
    valor_total: fmt(n.valorTotal),
    placa_cavalo: "########",
    cnd_cooperativa_numero: "###########",
    cnd_cooperativa_codigo_autenticacao: "##########",
    cnd_cooperativa_vencimento: "##/##/####",
    cnd_produtor_numero: "###########",
    cnd_produtor_codigo_autenticacao: "##########",
    cnd_produtor_vencimento: "##/##/####",
  };
}

export function renderTemplate(template: string, vars: Record<string, string>): string {
  return (template || "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => {
    const v = vars[key.toLowerCase()];
    // Nunca deixa a variável crua no texto: dado ausente vira placeholder de revisão manual.
    return v != null ? v : "####";
  });
}


export function hasPendingPlaceholders(text: string): boolean {
  return /#{2,}|\{\{[a-z_]+\}\}/i.test(text);
}

export function buildNota(r: ResolveResult, which: CfopModelo, modelo: ModeloNota): Nota {
  const rec = r.recebimentoRow ?? r.searchedRow;
  const precoSaca = rec.precoUnitIcms || 0;
  const valorUnitario = precoSaca / SACA_KG;
  const quantidade = QUANTIDADE_PADRAO;
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

  let destinatario: NotaParty = { ...EMPTY_PARTY };
  if (which === "5923") {
    if (r.armazem) {
      destinatario = {
        nome: r.armazem.razao_social,
        cpfCnpj: r.armazem.cnpj_cpf ?? "",
        ie: r.armazem.inscricao_estadual ?? "",
        endereco: r.armazem.endereco ?? "",
        bairro: r.armazem.bairro ?? "",
        municipio: r.armazem.municipio ?? "",
        uf: r.armazem.uf ?? "",
        cep: r.armazem.cep ?? "",
      };
    } else if (r.expedicaoRow) {
      destinatario = {
        nome: r.expedicaoRow.nomeRazaoSocial,
        cpfCnpj: r.expedicaoRow.cpfCnpj,
        ie: r.expedicaoRow.ie,
        endereco: r.expedicaoRow.endereco,
        bairro: "",
        municipio: r.expedicaoRow.municipio,
        uf: r.expedicaoRow.estado,
        cep: "",
      };
    }
  } else if (r.cooperativa) {
    destinatario = {
      nome: r.cooperativa.razao_social,
      cpfCnpj: r.cooperativa.cnpj ?? "",
      ie: r.cooperativa.inscricao_estadual ?? "",
      endereco: r.cooperativa.endereco ?? "",
      bairro: r.cooperativa.bairro ?? "",
      municipio: r.cooperativa.municipio ?? "",
      uf: r.cooperativa.uf ?? "",
      cep: r.cooperativa.cep ?? "",
    };
  }

  const nota: Nota = {
    cfop: modelo.cfop,
    nomeModelo: modelo.nome_modelo,
    naturezaOperacao: modelo.natureza_operacao ?? "",
    emitente,
    destinatario,
    produto: {
      descricao: r.produto?.descricao ?? rec.descItem,
      ncm: r.produto?.ncm ?? "",
      cst: cstIcmsPdf,
      unidade: r.produto?.unidade ?? "KG",
    },
    quantidade,
    valorUnitario,
    valorTotal: quantidade * valorUnitario,
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
