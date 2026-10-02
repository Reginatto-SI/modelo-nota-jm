import type { Nota, NotaParty, NotaRft006Item } from "./nota";
import { renderTemplate } from "./nota";
import type { Rft006NotaGroup } from "./rft006";

export interface Rft006GenerationConfig {
  destinatario: NotaParty;
  cfop: string;
  naturezaOperacao: string;
  cst: string;
  dadosAdicionais: string;
}

const emptyParty: NotaParty = { nome: "", cpfCnpj: "", ie: "", endereco: "", bairro: "", municipio: "", uf: "", cep: "" };

export function getRft006Totals(itens: NotaRft006Item[]) {
  return itens.reduce((totals, item) => ({
    valorBruto: totals.valorBruto + item.valorBruto,
    valorDesconto: totals.valorDesconto + item.desconto,
    valorLiquido: totals.valorLiquido + item.valorLiquido,
  }), { valorBruto: 0, valorDesconto: 0, valorLiquido: 0 });
}

const format = (value: number) => value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const address = (party: NotaParty) => [party.endereco, party.bairro, party.cep && `CEP ${party.cep}`, party.municipio, party.uf].filter(Boolean).join(", ");

export function buildRft006Variables(nota: Nota): Record<string, string> {
  const totals = getRft006Totals(nota.itens ?? []);
  return {
    emitente_nome: nota.emitente.nome,
    emitente_cpf_cnpj: nota.emitente.cpfCnpj,
    emitente_ie: nota.emitente.ie,
    emitente_municipio: nota.emitente.municipio,
    destinatario_nome: nota.destinatario.nome,
    destinatario_razao_social: nota.destinatario.nome,
    destinatario_cnpj: nota.destinatario.cpfCnpj,
    destinatario_ie: nota.destinatario.ie,
    destinatario_endereco_completo: address(nota.destinatario),
    nota_referencia: nota.notaReferencia ?? "",
    cfop: nota.cfop,
    cst: nota.cst ?? "",
    natureza_operacao: nota.naturezaOperacao,
    valor_total: format(totals.valorBruto),
    valor_desconto: format(totals.valorDesconto),
    valor_liquido: format(totals.valorLiquido),
  };
}

export function buildRft006Nota(group: Rft006NotaGroup, config: Rft006GenerationConfig): Nota {
  const itens: NotaRft006Item[] = group.items.map((item) => ({
    descricao: item.descricao,
    ncm: item.ncm,
    unidade: item.unidade,
    quantidade: item.quantidade ?? 0,
    valorUnitario: item.valorUnitario ?? 0,
    valorBruto: item.valorTotal ?? 0,
    desconto: item.valorDesconto ?? 0,
    valorLiquido: item.valorLiquido ?? 0,
  }));
  const first = itens[0];
  const totals = getRft006Totals(itens);
  const nota: Nota = {
    sourceType: "rft006",
    notaReferencia: group.nota,
    cfop: config.cfop.trim(),
    cst: config.cst.trim(),
    nomeModelo: `Modelo avulso RFT006 — Nota ${group.nota}`,
    naturezaOperacao: config.naturezaOperacao.trim(),
    emitente: { ...emptyParty, nome: group.emitente.razaoSocial, cpfCnpj: group.emitente.cnpj, ie: group.emitente.ie, municipio: group.emitente.municipio },
    destinatario: { ...config.destinatario },
    // Espelho do primeiro item apenas para compatibilidade estrutural; o fluxo RFT006 usa `itens`.
    produto: { codigo: "", descricao: first?.descricao ?? "", ncm: first?.ncm ?? "", cst: config.cst.trim(), unidade: first?.unidade ?? "" },
    itens,
    quantidade: itens.reduce((sum, item) => sum + item.quantidade, 0),
    valorUnitario: first?.valorUnitario ?? 0,
    valorTotal: totals.valorBruto,
    valorDesconto: totals.valorDesconto,
    valorLiquido: totals.valorLiquido,
    dadosAdicionaisTemplate: config.dadosAdicionais,
    dadosAdicionaisManualOverride: false,
    dataEmissao: new Date().toISOString().slice(0, 10), dataSaida: new Date().toISOString().slice(0, 10), horaSaida: "",
    // O RFT006 não possui regra aprovada para frete; o valor permanece neutro.
    tpFrete: "", placaVeiculo: "", transportador: "", observacao: "", dadosAdicionais: "",
  };
  nota.dadosAdicionais = renderTemplate(config.dadosAdicionais, buildRft006Variables(nota));
  return nota;
}

export function updateRft006Nota(nota: Nota, patch: Partial<Nota>, manualDadosAdicionais = false): Nota {
  if (nota.sourceType !== "rft006") return { ...nota, ...patch };

  const next: Nota = { ...nota, ...patch };
  if (patch.itens) {
    // Totais continuam sendo apenas a soma dos valores conscientemente editados nos itens.
    const totals = getRft006Totals(patch.itens);
    next.quantidade = patch.itens.reduce((sum, item) => sum + item.quantidade, 0);
    next.valorTotal = totals.valorBruto;
    next.valorDesconto = totals.valorDesconto;
    next.valorLiquido = totals.valorLiquido;
  }
  if (patch.cst != null) next.produto = { ...next.produto, cst: patch.cst };

  if (manualDadosAdicionais) {
    next.dadosAdicionaisManualOverride = true;
    return next;
  }
  if (!next.dadosAdicionaisManualOverride) {
    next.dadosAdicionais = renderTemplate(next.dadosAdicionaisTemplate ?? "", buildRft006Variables(next));
  }
  return next;
}

export function validateRft006Nota(nota: Nota): string[] {
  if (nota.sourceType !== "rft006") return [];
  const errors: string[] = [];
  if (!nota.emitente.nome.trim() || !nota.emitente.cpfCnpj.trim()) errors.push("Informe razão social e CPF/CNPJ do emitente.");
  if (!nota.destinatario.nome.trim() || !nota.destinatario.cpfCnpj.trim()) errors.push("Selecione um destinatário válido.");
  if (!nota.cfop.trim()) errors.push("Informe o CFOP.");
  if (!(nota.cst ?? "").trim()) errors.push("Informe o CST.");
  if (!nota.naturezaOperacao.trim()) errors.push("Informe a natureza da operação.");
  if (!nota.itens?.length) errors.push("Inclua pelo menos um item.");
  nota.itens?.forEach((item, index) => {
    const prefix = `Item ${index + 1}:`;
    if (!item.descricao.trim()) errors.push(`${prefix} informe a descrição.`);
    if (!item.ncm.trim()) errors.push(`${prefix} informe o NCM.`);
    if (!item.unidade.trim()) errors.push(`${prefix} informe a unidade.`);
    if (!(item.quantidade > 0)) errors.push(`${prefix} a quantidade deve ser maior que zero.`);
    if (![item.valorUnitario, item.valorBruto, item.desconto, item.valorLiquido].every(Number.isFinite)) errors.push(`${prefix} informe valores válidos.`);
  });
  if (/{{[^}]+}}|#{2,}/.test(nota.dadosAdicionais)) errors.push("Revise os placeholders pendentes nos dados adicionais.");
  return errors;
}

export const getPreviewReturnPath = (notas: Nota[]) => notas.some((nota) => nota.sourceType === "rft006") ? "/rft006" : "/pesquisa";

function sanitizeFileNamePart(value: string | undefined) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\/\\:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[ .-]+|[ .-]+$/g, "");
}

export function buildRft006PdfFileName(nota: Nota) {
  // Nome próprio do fluxo: não consulta contratos nem metadados exclusivos do GRL019.
  const referencia = sanitizeFileNamePart(nota.notaReferencia) || "sem referência";
  const emitente = sanitizeFileNamePart(nota.emitente.nome) || "emitente";
  return `Modelo RFT006 - Nota ${referencia} - ${emitente}.pdf`;
}

export function generateValidatedRft006Pdf(
  nota: Nota,
  generate: (notas: Nota[], fileName: string) => void,
) {
  const error = validateRft006Nota(nota)[0];
  if (error) return error;
  generate([nota], buildRft006PdfFileName(nota));
  return null;
}
