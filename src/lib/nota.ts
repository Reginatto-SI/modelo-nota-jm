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
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
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
  return {
    contrato: r.searchedRow.contrato,
    contrato_vinculado: r.searchedRow.contratoVinculado,
    produtor_nome: n.emitente.nome,
    produtor_cpf_cnpj: n.emitente.cpfCnpj,
    produtor_ie: n.emitente.ie,
    cooperativa_nome: r.cooperativa?.razao_social ?? "",
    cooperativa_cnpj: r.cooperativa?.cnpj ?? "",
    cooperativa_ie: r.cooperativa?.inscricao_estadual ?? "",
    armazem_nome: r.armazem?.razao_social ?? "",
    armazem_cnpj: r.armazem?.cnpj_cpf ?? "",
    armazem_ie: r.armazem?.inscricao_estadual ?? "",
    produto: n.produto.descricao,
    ncm: n.produto.ncm,
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
    return v != null ? v : `{{${key}}}`;
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
      cst: r.produto?.cst_icms ?? "",
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
  };

  nota.dadosAdicionais = renderTemplate(modelo.dados_adicionais_template ?? "", buildVars(nota, r));
  return nota;
}
