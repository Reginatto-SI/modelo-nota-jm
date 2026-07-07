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
import { isExpedicaoContrato, isRecebimentoContrato, sameTpFaturamento } from "./tpFaturamento";

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
  armazemPorNome?: boolean; // legado: não usar razão social como chave principal
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

export function normalizeContractCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function sameText(a: string | null | undefined, b: string | null | undefined) {
  return norm(a) === norm(b);
}

function sameContractCode(a: unknown, b: unknown) {
  return normalizeContractCode(a) === normalizeContractCode(b);
}

function coopDisplayName(cooperativa?: Cooperativa, fallback?: string) {
  return cooperativa?.nome_grl019 || cooperativa?.razao_social || fallback || "cooperativa";
}

function isTipoContrato5923Isolado(tipoContrato: TipoContrato, modelo?: ModeloNota) {
  return (
    tipoContrato.cfop?.trim() === "5923" &&
    modelo?.tipo_destinatario === "armazem_destinatario" &&
    !tipoContrato.exige_contrato_vinculado &&
    !tipoContrato.gera_operacao_casada
  );
}

function contextoEmpresaModelo(tipoContrato: TipoContrato, modelo: ModeloNota | undefined, cooperativa?: Cooperativa) {
  // No 5923 isolado, o cadastro técnico de cooperativas/empresas pode representar empresa/armazém final.
  if (isTipoContrato5923Isolado(tipoContrato, modelo)) {
    return {
      nome: coopDisplayName(cooperativa, "empresa do GRL019"),
      entidade: "empresa/armazém",
      origem: "empresa do GRL019",
    };
  }

  return {
    nome: coopDisplayName(cooperativa),
    entidade: "cooperativa",
    origem: "cooperativa do GRL019",
  };
}

// Identifica o 5923 principal fora do fluxo casado 5118 + 5923.
export function isModelo5923Isolado(res: Pick<ResolveResult, "cfop" | "modelo" | "tipoContrato">) {
  return (
    res.cfop === "5923" &&
    res.modelo?.cfop === "5923" &&
    res.modelo?.tipo_destinatario === "armazem_destinatario" &&
    Boolean(res.tipoContrato) &&
    !res.tipoContrato?.exige_contrato_vinculado &&
    !res.tipoContrato?.gera_operacao_casada
  );
}

// Um modelo está liberado para a cooperativa quando ela consta em cooperativa_ids
// (relacionamento N:N). Fallback ao campo legado cooperativa_id para registros antigos.
function modeloLiberadoPara(modelo: ModeloNota, cooperativaId: string) {
  const liberadas = modelo.cooperativa_ids;
  if (liberadas && liberadas.length > 0) return liberadas.includes(cooperativaId);
  return modelo.cooperativa_id === cooperativaId;
}

function findModeloAtivo(
  modelos: ModeloNota[],
  cooperativaId: string,
  cfop: string,
  modeloId?: string | null,
) {
  if (modeloId) {
    return modelos.find((m) => m.id === modeloId && m.ativo && modeloLiberadoPara(m, cooperativaId));
  }

  return modelos.find((m) => m.cfop === cfop && m.ativo && modeloLiberadoPara(m, cooperativaId));
}

// Modelo existe e está ativo, mas pode não estar liberado para a cooperativa do GRL019.
function findModeloPorId(modelos: ModeloNota[], modeloId?: string | null) {
  if (!modeloId) return undefined;
  return modelos.find((m) => m.id === modeloId);
}

function findTiposAtivos(tipos: TipoContrato[], cooperativaId: string, row: Grl019Row) {
  return tipos.filter(
    (t) =>
      t.ativo &&
      t.cooperativa_id === cooperativaId &&
      sameContractCode(t.codigo_contrato, row.codContrato) &&
      sameTpFaturamento(t.tp_faturamento, row.tpFaturamento),
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
  if (isRecebimentoContrato(searchedRow)) {
    recebimentoRow = searchedRow;
    expedicaoRow = vinculado && isExpedicaoContrato(vinculado) ? vinculado : vinculado;
  } else if (isExpedicaoContrato(searchedRow)) {
    expedicaoRow = searchedRow;
    recebimentoRow = vinculado && isRecebimentoContrato(vinculado) ? vinculado : vinculado;
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

  const isExpedicao = isExpedicaoContrato(searchedRow);
  const isExpedicaoVinculadaRecebimento = Boolean(
    isExpedicao && recebimentoRow && recebimentoRow !== searchedRow && isRecebimentoContrato(recebimentoRow),
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
      // Se o modelo vinculado existe mas não está liberado para esta cooperativa, avisa de forma clara.
      const modeloVinculado = findModeloPorId(cad.modelos, tipoContrato.modelo_nota_id);
      const contextoModelo = contextoEmpresaModelo(tipoContrato, modeloVinculado, cooperativa);
      if (modeloVinculado && modeloVinculado.ativo && !modeloLiberadoPara(modeloVinculado, cooperativa.id)) {
        errors.push(
          `O modelo "${modeloVinculado.nome_modelo}" (CFOP ${modeloVinculado.cfop}) não está liberado para a ${contextoModelo.entidade} ${contextoModelo.nome}. Libere este modelo para o destinatário do modelo no cadastro de Modelos de Nota.`,
        );
      } else {
        errors.push(
          `Modelo CFOP ${cfopParametrizado || "vinculado"} não encontrado para a ${contextoModelo.entidade} ${contextoModelo.nome}. Verifique se existe um Modelo de Nota ativo com CFOP ${cfopParametrizado || "compatível"} liberado para a mesma ${contextoModelo.origem}.`,
        );
      }
    } else if (cfopParametrizado && modelo.cfop !== cfopParametrizado) {
      errors.push(
        `O tipo de contrato ${linhaParametrizacao.codContrato} aponta para CFOP ${cfopParametrizado}, mas o modelo vinculado está cadastrado como CFOP ${modelo.cfop}. Revise o cadastro de Tipos de Contrato.`,
      );
      modelo = undefined;
    }
  }

  if (tipoContrato?.exige_contrato_vinculado && !vinculado) {
    errors.push(
      `O tipo de contrato ${linhaParametrizacao.codContrato} exige contrato vinculado, mas a coluna CONTRATO VINCULADO não localizou um vínculo válido no GRL019.`,
    );
  }

  const cfop = modelo?.cfop;
  const contratoNumericoSemZeroInicial = /^\d+$/.test(searchedRow.contrato) && !searchedRow.contrato.startsWith("0");
  if (cfop === "5132" && contratoNumericoSemZeroInicial && searchedRow.contrato.length < 10) {
    warnings.push(
      "Contrato do CFOP 5132 parece menor que o formato esperado com zeros à esquerda. O sistema não corrige automaticamente; confira o GRL019 antes de gerar o PDF.",
    );
  }
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
  // A CST exigida para o PDF pode vir do modelo; só cai para o produto quando o modelo não parametriza.
  const hasCstIcmsForPdf = Boolean(modelo?.cst_icms_padrao?.trim() || produto?.cst_icms?.trim());
  if (!produto) {
    warnings.push(`Produto código "${searchedRow.codItem}" não está cadastrado ou ativo.`);
  } else if (!produto.ncm || !hasCstIcmsForPdf) {
    warnings.push("Produto cadastrado sem NCM ou CST.");
  }

  // Armazém/destinatário: a chave lógica é sempre o CPF/CNPJ normalizado da linha de EXPEDIÇÃO.
  // Não usa razão social como fallback de busca, porque o nome pode variar entre relatórios GRL019.
  let armazem: Armazem | undefined;
  const armazemPorNome = false;
  if (expedicaoRow) {
    const exped = expedicaoRow;
    const cnpj = digits(exped.cpfCnpj);
    if (cnpj) {
      armazem = cad.armazens.find((a) => a.ativo && digits(a.cnpj_cpf || "") === cnpj);
    }
    // O 5923 pode seguir com os dados da própria EXPEDIÇÃO quando o cadastro global ainda não existe.
    if (!armazem && ofereceCasada) {
      warnings.push("Destinatário não encontrado no cadastro. Dados utilizados diretamente do GRL019.");
    }
  } else if (ofereceCasada) {
    errors.push("Não foi localizada linha de expedição vinculada para compor o destinatário do CFOP 5923.");
  }

  const podeGerar = Boolean(
    cooperativa &&
      tipoContrato &&
      modelo &&
      produto &&
      produto?.ncm &&
      hasCstIcmsForPdf &&
      errors.length === 0 &&
      !isExpedicao,
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
