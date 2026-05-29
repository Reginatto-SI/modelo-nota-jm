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
  podeGerar: boolean;
  ofereceCasada: boolean; // 5118 -> ask 5118 or 5118+5923
}

function digits(s: string) {
  return (s || "").replace(/\D/g, "");
}

export function resolveContrato(
  report: Grl019Report,
  searchedRow: Grl019Row,
  cad: CadastrosBundle,
): ResolveResult {
  const warnings: string[] = [];

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

  // cooperativa by EMPRESA
  const empresa = searchedRow.empresa.trim().toLowerCase();
  const cooperativa = cad.cooperativas.find((c) => c.nome_grl019.trim().toLowerCase() === empresa);
  if (!cooperativa) {
    warnings.push(`Cooperativa "${searchedRow.empresa}" não está cadastrada.`);
  }

  // tipo de contrato by codigo + cooperativa
  let tipoContrato: TipoContrato | undefined;
  if (cooperativa) {
    tipoContrato = cad.tipos.find(
      (t) => t.cooperativa_id === cooperativa.id && t.codigo_contrato.trim() === searchedRow.codContrato.trim(),
    );
    if (!tipoContrato) {
      warnings.push(
        `Tipo de contrato código "${searchedRow.codContrato}" não está parametrizado para esta cooperativa.`,
      );
    }
  }

  // modelo from tipo (CFOP comes from parametrization, NOT from GRL019 description)
  let modelo: ModeloNota | undefined;
  if (tipoContrato) {
    modelo = cad.modelos.find((m) => m.id === tipoContrato!.modelo_nota_id);
    if (!modelo) {
      warnings.push("O tipo de contrato não possui modelo de nota vinculado.");
    }
  }

  const cfop = modelo?.cfop;
  const ofereceCasada = cfop === "5118";

  // model 5923 (operação casada) for the same cooperativa
  let modelo5923: ModeloNota | undefined;
  if (ofereceCasada && cooperativa) {
    modelo5923 = cad.modelos.find((m) => m.cooperativa_id === cooperativa.id && m.cfop === "5923");
  }

  // produto by COD.ITEM
  const produto = cad.produtos.find(
    (p) => p.codigo_produto.trim() === searchedRow.codItem.trim(),
  );
  if (!produto) {
    warnings.push(`Produto código "${searchedRow.codItem}" não está cadastrado.`);
  } else if (!produto.ncm || !produto.cst_icms) {
    warnings.push("Produto cadastrado sem NCM ou CST.");
  }

  // armazém (only needed for 5923) — by CPF/CNPJ of expedição row, fallback by name
  let armazem: Armazem | undefined;
  let armazemPorNome = false;
  if (ofereceCasada && expedicaoRow) {
    const exped = expedicaoRow;
    const cnpj = digits(exped.cpfCnpj);
    if (cnpj) {
      armazem = cad.armazens.find((a) => digits(a.cnpj_cpf || "") === cnpj);
    }
    if (!armazem && exped.nomeRazaoSocial) {
      armazem = cad.armazens.find(
        (a) => a.razao_social.trim().toLowerCase() === exped.nomeRazaoSocial.trim().toLowerCase(),
      );
      if (armazem) {
        armazemPorNome = true;
        warnings.push("Armazém/destinatário localizado por NOME (não por CPF/CNPJ). Valide os dados.");
      }
    }
    if (!armazem) {
      warnings.push("Armazém/destinatário do contrato de expedição não está cadastrado.");
    }
  }

  const podeGerar = Boolean(cooperativa && tipoContrato && modelo && produto && produto?.ncm && produto?.cst_icms);

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
    podeGerar,
    ofereceCasada,
  };
}
