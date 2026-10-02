import type { Armazem } from "./types";
import type { NotaParty } from "./nota";
import type { Database } from "@/integrations/supabase/types";

export interface Rft006ConfigValues {
  destinatarioId: string | null;
  cfop: string;
  naturezaOperacao: string;
  cst: string;
  dadosAdicionaisTemplate: string;
}

export type Rft006ConfigRecord = Database["public"]["Tables"]["configuracao_rft006"]["Row"];

export interface AppliedRft006Config extends Rft006ConfigValues {
  destinatario: NotaParty | null;
  destinatarioNeedsReselection: boolean;
}

export const EMPTY_RFT006_CONFIG: AppliedRft006Config = {
  destinatarioId: null,
  destinatario: null,
  destinatarioNeedsReselection: false,
  cfop: "",
  naturezaOperacao: "",
  cst: "",
  dadosAdicionaisTemplate: "",
};

export function armazemToNotaParty(item: Armazem): NotaParty {
  return {
    nome: item.razao_social,
    cpfCnpj: item.cnpj_cpf ?? "",
    ie: item.inscricao_estadual ?? "",
    endereco: item.endereco ?? "",
    bairro: item.bairro ?? "",
    cep: item.cep ?? "",
    municipio: item.municipio ?? "",
    uf: item.uf ?? "",
  };
}

// Resolve sempre pelo ID atual do cadastro, sem manter um snapshot de endereço na configuração.
export function applyRft006Config(config: Rft006ConfigRecord, armazens: Armazem[]): AppliedRft006Config {
  const selected = config.destinatario_id
    ? armazens.find((item) => item.id === config.destinatario_id && item.ativo !== false)
    : undefined;

  return {
    destinatarioId: selected?.id ?? null,
    destinatario: selected ? armazemToNotaParty(selected) : null,
    destinatarioNeedsReselection: Boolean(config.destinatario_id && !selected),
    cfop: config.cfop,
    naturezaOperacao: config.natureza_operacao,
    cst: config.cst,
    dadosAdicionaisTemplate: config.dados_adicionais_template ?? "",
  };
}

// A ausência ou falha de leitura do padrão libera uma geração vazia para preenchimento manual.
export function initializeRft006Config(
  config: Rft006ConfigRecord | null | undefined,
  armazens: Armazem[],
): AppliedRft006Config {
  return config ? applyRft006Config(config, armazens) : { ...EMPTY_RFT006_CONFIG };
}

// O payload conserva o template informado, inclusive placeholders, e só é usado na ação explícita de salvar.
export function buildRft006ConfigPayload(values: Rft006ConfigValues) {
  return {
    singleton: true as const,
    destinatario_id: values.destinatarioId,
    cfop: values.cfop,
    natureza_operacao: values.naturezaOperacao,
    cst: values.cst,
    dados_adicionais_template: values.dadosAdicionaisTemplate || null,
  };
}
