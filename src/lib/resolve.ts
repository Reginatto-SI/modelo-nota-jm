import type {
  Armazem,
  Cooperativa,
  Grl019Report,
  Grl019Row,
  ModeloNota,
  Produto,
  TipoContrato,
} from "./types";
import { findVinculado } from "./grl019";

export const SACA_KG = 60;
export const QUANTIDADE_PADRAO = 30000;

export interface CadastrosBundle {
  cooperativas: Cooperativa[];
  armazens: Armazem[];
  produtos: Produto[];
  modelos: ModeloNota[];
  tipos: TipoContrato[];
}

export interface ResolveResult {
  searchedRow: Grl019Row;
  recebimentoRow?: Grl019Row;
  expedicaoRow?: Grl019Row;
  cooperativa?: Cooperativa;
  tipoContrato?: TipoContrato;
  modelo?: ModeloNota;
  modelo5923?: ModeloNota;
  produto?: Produto;
  armazem?: Armazem;
  armazemPorNome?: boolean; // matched by name, needs validation
  cfop?: string;
  warnings: string[];
  errors: string[];
  podeGerar: boolean;
  ofereceCasada: boolean; // 5118 + gera_operacao_casada -> ask 5118 or 5118+5923
  expedicaoComoVinculo5923: boolean;
  expedicaoVinculadaRecebimento: boolean;
  contratoRecebimentoVinculado?: string;
  parametrizacaoSuspeitaExpedicao5923: boolean;
}

function digits(s: string) {
  return (s || "").replace(/\D/g, "");
}

function norm(s: string | null | undefined) {
  return (s ?? "").trim().toLowerCase();
}

function sameText(a: string | null | undefined, b: string | null | undefined) {
  return norm(a) === norm(b);
}

function coopDisplayName(cooperativa?: Cooperativa, fallback?: string) {
  return cooperativa?.nome_grl019 || cooperativa?.razao_social || fallback || "cooperativa";
}

function findModeloAtivo(
  modelos: ModeloNota[],
  cooperativaId: string,
  cfop: string,
  modeloId?: string | null,
) {
  if (modeloId) {
    return modelos.find((m) => m.id === modeloId && m.cooperativa_id === cooperativaId && m.ativo);
  }

  return modelos.find((m) => m.cooperativa_id === cooperativaId && m.cfop === cfop && m.ativo);
}

function findTiposAtivos(tipos: TipoContrato[], cooperativaId: string, row: Grl019Row) {
  return tipos.filter(
    (t) =>
      t.ativo &&
      t.cooperativa_id === cooperativaId &&
      sameText(t.codigo_contrato, row.codContrato) &&
      sameText(t.tp_faturamento, row.tpFaturamento),
  );
}

export function resolveContrato(
  report: Grl019Report,
  searchedRow: Grl019Row,
  cad: CadastrosBundle,
): ResolveResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  // recebimento / expedição pair
  const vinculado = findVinculado(report, searchedRow);
  let recebimentoRow: Grl019Row | undefined;
  let expedicaoRow: Grl019Row | undefined;
  if (searchedRow.tpFaturamento.includes("RECEB")) {
    recebimentoRow = searchedRow;
    expedicaoRow = vinculado?.tpFaturamento.includes("EXPED") ? vinculado : vinculado;
  } else if (searchedRow.tpFaturamento.includes("EXPED")) {
    expedicaoRow = searchedRow;
    recebimentoRow = vinculado?.tpFaturamento.includes("RECEB") ? vinculado : vinculado;
  } else {
    recebimentoRow = searchedRow;
    expedicaoRow = vinculado;
  }

  // cooperativa by EMPRESA from GRL019 against the cadastro field that stores the GRL019 name.
  const empresa = norm(searchedRow.empresa);
  const cooperativa = cad.cooperativas.find((c) => norm(c.nome_grl019) === empresa && c.ativo);
  if (!cooperativa) {
    errors.push(`Cooperativa "${searchedRow.empresa}" não está cadastrada ou ativa.`);
  }

  const isExpedicao = searchedRow.tpFaturamento.includes("EXPED");
  const isExpedicaoVinculadaRecebimento = Boolean(
    isExpedicao && recebimentoRow && recebimentoRow !== searchedRow && recebimentoRow.tpFaturamento.includes("RECEB"),
  );

  // Linha de EXPEDIÇÃO vinculada não é geração principal: a parametrização principal é a do RECEBIMENTO.
  const linhaParametrizacao = isExpedicaoVinculadaRecebimento ? recebimentoRow! : searchedRow;

  // Tipo de contrato must be resolved by cooperativa + COD.CONTRATO + TP FATURAMENTO + active status.
  // Keeping this central prevents the table badge and the Generate action from diverging.
  let tipoContrato: TipoContrato | undefined;
  if (cooperativa) {
    const tiposAtivos = findTiposAtivos(cad.tipos, cooperativa.id, linhaParametrizacao);

    if (tiposAtivos.length > 1) {
      errors.push(
        `Existe mais de uma parametrização ativa para o contrato ${linhaParametrizacao.codContrato} / ${linhaParametrizacao.tpFaturamento} / ${coopDisplayName(cooperativa)}. Revise o cadastro de Tipos de Contrato antes de gerar o modelo.`,
      );
    } else {
      tipoContrato = tiposAtivos[0];
    }

    if (!tipoContrato && tiposAtivos.length === 0) {
      errors.push(
        `Tipo de contrato não parametrizado para ${coopDisplayName(cooperativa)}: código ${linhaParametrizacao.codContrato}, faturamento ${linhaParametrizacao.tpFaturamento}.`,
      );
    }
  }

  // Modelo comes from Tipos de Contrato and is validated against the same cooperativa and active status.
  let modelo: ModeloNota | undefined;
  if (tipoContrato && cooperativa) {
    const cfopParametrizado = tipoContrato.cfop?.trim() || "";
    modelo = findModeloAtivo(cad.modelos, cooperativa.id, cfopParametrizado, tipoContrato.modelo_nota_id);
    if (!modelo) {
      errors.push(
        `Modelo CFOP ${cfopParametrizado || "vinculado"} não encontrado para a cooperativa ${coopDisplayName(cooperativa)}. Verifique se existe um Modelo de Nota ativo com CFOP ${cfopParametrizado || "compatível"} vinculado à mesma cooperativa do GRL019.`,
      );
    } else if (cfopParametrizado && modelo.cfop !== cfopParametrizado) {
      errors.push(
        `O tipo de contrato ${linhaParametrizacao.codContrato} aponta para CFOP ${cfopParametrizado}, mas o modelo vinculado está cadastrado como CFOP ${modelo.cfop}. Revise o cadastro de Tipos de Contrato.`,
      );
      modelo = undefined;
    }
  }

  const cfop = modelo?.cfop;
  const ofereceCasada = cfop === "5118" && Boolean(tipoContrato?.gera_operacao_casada);
  const expedicaoComoVinculo5923 = isExpedicaoVinculadaRecebimento && ofereceCasada;

  let parametrizacaoSuspeitaExpedicao5923 = false;
  if (cooperativa && isExpedicao) {
    const tiposExpedicaoAtivos = findTiposAtivos(cad.tipos, cooperativa.id, searchedRow);
    parametrizacaoSuspeitaExpedicao5923 = tiposExpedicaoAtivos.some((tipo) => {
      const cfopTipo = tipo.cfop?.trim();
      const modeloTipo = findModeloAtivo(cad.modelos, cooperativa.id, cfopTipo || "5923", tipo.modelo_nota_id);
      return cfopTipo === "5923" || modeloTipo?.cfop === "5923";
    });

    if (parametrizacaoSuspeitaExpedicao5923) {
      warnings.push(
        "Parametrização suspeita: o CFOP 5923 deve ser gerado pela operação casada 5118 + 5923, não diretamente pela expedição.",
      );
    }

    if (!isExpedicaoVinculadaRecebimento && cfop === "5923") {
      errors.push(
        "Parametrização suspeita: o CFOP 5923 deve ser gerado pela operação casada 5118 + 5923, não diretamente pela expedição.",
      );
    }
  }

  // model 5923 (operação casada) for the same cooperativa
  let modelo5923: ModeloNota | undefined;
  if (ofereceCasada && cooperativa) {
    modelo5923 = findModeloAtivo(cad.modelos, cooperativa.id, "5923");
    if (!modelo5923) {
      errors.push(
        `O tipo de contrato gera operação casada, mas o modelo CFOP 5923 não está cadastrado ou ativo para a cooperativa ${coopDisplayName(cooperativa)}.`,
      );
    }
  }

  // produto by COD.ITEM
  const produto = cad.produtos.find(
    (p) => p.ativo && p.codigo_produto.trim() === searchedRow.codItem.trim(),
  );
  if (!produto) {
    warnings.push(`Produto código "${searchedRow.codItem}" não está cadastrado ou ativo.`);
  } else if (!produto.ncm || !produto.cst_icms) {
    warnings.push("Produto cadastrado sem NCM ou CST.");
  }

  // armazém/destinatário — sempre que houver linha de expedição vinculada, para preencher
  // as variáveis {{armazem_*}} dos modelos (5118, 5132, 5923). Busca por CPF/CNPJ e cai para nome.
  let armazem: Armazem | undefined;
  let armazemPorNome = false;
  if (expedicaoRow) {
    const exped = expedicaoRow;
    const cnpj = digits(exped.cpfCnpj);
    if (cnpj) {
      armazem = cad.armazens.find((a) => a.ativo && digits(a.cnpj_cpf || "") === cnpj);
    }
    if (!armazem && exped.nomeRazaoSocial) {
      armazem = cad.armazens.find(
        (a) => a.ativo && a.razao_social.trim().toLowerCase() === exped.nomeRazaoSocial.trim().toLowerCase(),
      );
      if (armazem) {
        armazemPorNome = true;
        warnings.push("Armazém/destinatário localizado por NOME (não por CPF/CNPJ). Valide os dados.");
      }
    }
    // Só alerta sobre cadastro ausente quando o armazém é obrigatório (operação casada 5923).
    if (!armazem && ofereceCasada) {
      warnings.push("Armazém/destinatário do contrato de expedição não está cadastrado ou ativo.");
    }
  }

  const podeGerar = Boolean(
    cooperativa &&
      tipoContrato &&
      modelo &&
      produto &&
      produto?.ncm &&
      produto?.cst_icms &&
      errors.length === 0 &&
      !isExpedicaoVinculadaRecebimento,
  );

  return {
    searchedRow,
    recebimentoRow,
    expedicaoRow,
    cooperativa,
    tipoContrato,
    modelo,
    modelo5923,
    produto,
    armazem,
    armazemPorNome,
    cfop,
    warnings,
    errors,
    podeGerar,
    ofereceCasada,
    expedicaoComoVinculo5923,
    expedicaoVinculadaRecebimento: isExpedicaoVinculadaRecebimento,
    contratoRecebimentoVinculado: isExpedicaoVinculadaRecebimento ? recebimentoRow?.contrato : undefined,
    parametrizacaoSuspeitaExpedicao5923,
  };
}
