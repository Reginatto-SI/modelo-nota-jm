import type { NotaParty } from "./nota";
import type { Rft006GenerationConfig } from "./rft006Nota";

// Padrão operacional temporário e centralizado do fluxo individual; não persiste nem altera cadastros.
export const RFT006_FIXED_RECIPIENT: NotaParty = {
  nome: "BIOAGRO - ASSOCIACAO BIOLOGICA DE PRODUTORES DO MT",
  cpfCnpj: "66.730.143/0001-67",
  ie: "14.195.657-7",
  endereco: "AV P MT-249",
  bairro: "CIDADE BELA",
  cep: "78456-333",
  municipio: "NOVA MUTUM",
  uf: "MT",
};

export const RFT006_FIXED_DEFAULTS = {
  destinatario: RFT006_FIXED_RECIPIENT,
  cfop: "5949",
  cst: "51",
  naturezaOperacao: "REMESSA SIMBÓLICA P/ INDUSTRIALIZAÇÃO",
  dadosAdicionaisTemplate:
    "ICMS DIFERIDO NOS TERMOS DO ARTIGO 29 DO ANEXO VII DO RICMS/MT.PROCON/MT - AV. GEN. RAMIRO DE NORONHA, Nº 294 - 1º ANDAR, JARDIM CUIABÁ, CUIABÁ- MT, CEP: 78043-180 REF NOTA {{nota_referencia}}",
} as const;

// Entrega uma cópia isolada para que revisão e geração direta nunca alterem os defaults compartilhados.
export function getRft006FixedGenerationConfig(): Rft006GenerationConfig {
  return {
    destinatario: { ...RFT006_FIXED_DEFAULTS.destinatario },
    cfop: RFT006_FIXED_DEFAULTS.cfop,
    cst: RFT006_FIXED_DEFAULTS.cst,
    naturezaOperacao: RFT006_FIXED_DEFAULTS.naturezaOperacao,
    dadosAdicionais: RFT006_FIXED_DEFAULTS.dadosAdicionaisTemplate,
  };
}
