import type { NotaParty } from "./nota";

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
  cst: "41",
  naturezaOperacao: "REMESSA SIMBÓLICA P/ INDUSTRIALIZAÇÃO",
  dadosAdicionaisTemplate:
    "ICMS NAO INCIDENTE CONFORME PREVISTO NO ARTIGO 29 DO ANEXO VII DO RICMS/MT.\n" +
    "PROCON-MT - TELEFONE: 151 OU (65) 3613-2100 - ENDERECO: AVENIDA HISTORIADOR RUBENS DE MENDONCA, S/N, BAIRRO BAU, CUIABA-MT, CEP 78045-100. REF NOTA {{nota_referencia}}",
} as const;
