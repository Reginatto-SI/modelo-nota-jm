// Domain types for Modelo de Nota JM

export interface Cooperativa {
  id: string;
  nome_grl019: string;
  razao_social: string;
  cnpj: string | null;
  inscricao_estadual: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Armazem {
  id: string;
  razao_social: string;
  cnpj_cpf: string | null;
  inscricao_estadual: string | null;
  endereco: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
  telefone: string | null;
  tipo: string;
  origem_cadastro: "manual" | "grl019" | string | null;
  ultima_sincronizacao_grl019: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Produto {
  id: string;
  codigo_produto: string;
  descricao: string;
  ncm: string | null;
  cst_icms: string | null;
  unidade: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export type TipoDestinatario = "cooperativa" | "armazem_destinatario";

export interface ModeloNota {
  id: string;
  // Legado: cooperativa única. Mantido por compatibilidade; a liberação passa a ser N:N via cooperativa_ids.
  cooperativa_id: string | null;
  cfop: string;
  nome_modelo: string;
  natureza_operacao: string | null;
  tipo_destinatario: TipoDestinatario;
  tipo_frete_padrao: string | null;
  cst_icms_padrao: string | null;
  dados_adicionais_template: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  // Cooperativas liberadas para usar este modelo (tabela modelo_nota_cooperativas).
  cooperativa_ids?: string[];
}

export interface TipoContrato {
  id: string;
  cooperativa_id: string;
  codigo_contrato: string;
  descricao_contrato: string | null;
  tp_faturamento: string | null;
  cfop: string | null;
  modelo_nota_id: string | null;
  exige_contrato_vinculado: boolean;
  gera_operacao_casada: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

// GRL019 normalized row
export interface Grl019Row {
  contrato: string;
  contratoVinculado: string;
  contratoCliente: string;
  empresa: string;
  tpFaturamento: string;
  codContrato: string;
  descContrato: string;
  nomeRazaoSocial: string;
  cpfCnpj: string;
  ie: string;
  endereco: string;
  municipio: string;
  estado: string;
  codItem: string;
  descItem: string;
  precoUnitIcms: number;
  tpFrete: string;
  observacao: string;
  _raw: Record<string, unknown>;
}

export interface Grl019Report {
  fileName: string;
  importedAt: string;
  rows: Grl019Row[];
  empresas: string[];
  sheetName?: string;
  headerRow?: number;
  missingRecommendedColumns?: string[];
}
