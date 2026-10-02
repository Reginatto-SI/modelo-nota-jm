import type { NotaParty } from "./nota";

export const VERDENA_CNPJ = "57260906000162";

export const NFE_XML_STATUS = {
  ready: "Pronto",
  invalidXml: "XML inválido",
  unauthorized: "NF-e não autorizada",
  wrongIssuer: "Emitente diferente da VERDENA",
  missingProducer: "Dados do produtor ausentes",
  ineligibleCfop: "CFOP de origem não elegível",
  invalidItem: "Item inválido",
  incompatibleTotal: "Total incompatível",
  duplicate: "Duplicado",
} as const;

export type NfeXmlStatus = keyof typeof NFE_XML_STATUS;

export interface NfeXmlItem {
  descricao: string;
  ncm: string;
  unidade: string;
  quantidade: number;
  valorUnitarioBruto: number;
  valorBruto: number;
  desconto: number;
  valorLiquido: number;
  cfopOrigem: string;
}

export interface ParsedNfeXml {
  chave: string;
  nota: string;
  serie: string;
  produtor: NotaParty;
  itens: NfeXmlItem[];
  totais: { valorBruto: number; desconto: number; valorLiquido: number; vNF: number };
}

export interface NfeXmlParseResult {
  status: NfeXmlStatus;
  nfe?: ParsedNfeXml;
}

const digits = (value: string) => value.replace(/\D/g, "");
const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const close = (a: number, b: number) => Math.abs(a - b) <= 0.01;

function child(parent: Element | null, name: string): Element | null {
  if (!parent) return null;
  return Array.from(parent.children).find((node) => node.localName === name) ?? null;
}

function descendants(parent: Element | Document, name: string): Element[] {
  return Array.from(parent.getElementsByTagNameNS("*", name));
}

const text = (parent: Element | null, name: string) => child(parent, name)?.textContent?.trim() ?? "";
const numeric = (value: string) => value !== "" && Number.isFinite(Number(value)) ? Number(value) : NaN;

function formatDocument(value: string) {
  const raw = digits(value);
  if (raw.length === 11) return raw.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (raw.length === 14) return raw.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return value;
}

function formatCep(value: string) {
  const raw = digits(value);
  return raw.length === 8 ? raw.replace(/(\d{5})(\d{3})/, "$1-$2") : value;
}

/** Interpreta apenas o conteúdo local recebido; nenhuma chamada de rede ou persistência ocorre aqui. */
export function parseNfeXml(xml: string): NfeXmlParseResult {
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (descendants(document, "parsererror").length) return { status: "invalidXml" };

  const nfeProc = document.documentElement.localName === "nfeProc" ? document.documentElement : null;
  const nfe = nfeProc ? child(nfeProc, "NFe") : null;
  const infNFe = child(nfe, "infNFe");
  const ide = child(infNFe, "ide");
  if (!nfeProc || !infNFe || !ide) return { status: "invalidXml" };
  if (text(ide, "mod") !== "55" || text(ide, "tpNF") !== "1") return { status: "unauthorized" };

  const protocol = child(child(nfeProc, "protNFe"), "infProt");
  if (protocol && text(protocol, "cStat") !== "100") return { status: "unauthorized" };

  const emit = child(infNFe, "emit");
  if (digits(text(emit, "CNPJ")) !== VERDENA_CNPJ) return { status: "wrongIssuer" };

  const dest = child(infNFe, "dest");
  const documentValue = text(dest, "CPF") || text(dest, "CNPJ");
  const producerName = text(dest, "xNome");
  if (!producerName || !digits(documentValue)) return { status: "missingProducer" };
  const ender = child(dest, "enderDest");
  const endereco = [text(ender, "xLgr"), text(ender, "nro"), text(ender, "xCpl")].filter(Boolean).join(", ");
  const produtor: NotaParty = {
    nome: producerName,
    cpfCnpj: formatDocument(documentValue),
    ie: text(dest, "IE"),
    endereco,
    bairro: text(ender, "xBairro"),
    municipio: text(ender, "xMun"),
    uf: text(ender, "UF"),
    cep: formatCep(text(ender, "CEP")),
  };

  const itemElements = Array.from(infNFe.children).filter((node) => node.localName === "det");
  if (!itemElements.length) return { status: "invalidItem" };
  const itens: NfeXmlItem[] = [];
  for (const det of itemElements) {
    const prod = child(det, "prod");
    const valorBruto = numeric(text(prod, "vProd"));
    const descontoText = text(prod, "vDesc");
    const item: NfeXmlItem = {
      descricao: text(prod, "xProd"), ncm: text(prod, "NCM"), unidade: text(prod, "uCom"),
      quantidade: numeric(text(prod, "qCom")), valorUnitarioBruto: numeric(text(prod, "vUnCom")),
      valorBruto, desconto: descontoText ? numeric(descontoText) : 0,
      valorLiquido: cents(valorBruto - (descontoText ? numeric(descontoText) : 0)), cfopOrigem: digits(text(prod, "CFOP")),
    };
    if (!item.cfopOrigem.startsWith("5") && !item.cfopOrigem.startsWith("6")) return { status: "ineligibleCfop" };
    if (!item.descricao || !item.ncm || !item.unidade || !(item.quantidade > 0) ||
      ![item.valorUnitarioBruto, item.valorBruto, item.desconto, item.valorLiquido].every(Number.isFinite)) return { status: "invalidItem" };
    itens.push(item);
  }

  const icmsTot = child(child(infNFe, "total"), "ICMSTot");
  const xmlGross = numeric(text(icmsTot, "vProd"));
  const xmlDiscount = numeric(text(icmsTot, "vDesc") || "0");
  const vNF = numeric(text(icmsTot, "vNF"));
  const valorBruto = cents(itens.reduce((sum, item) => sum + item.valorBruto, 0));
  const desconto = cents(itens.reduce((sum, item) => sum + item.desconto, 0));
  const valorLiquido = cents(itens.reduce((sum, item) => sum + item.valorLiquido, 0));
  if (![xmlGross, xmlDiscount, vNF].every(Number.isFinite) || !close(valorBruto, xmlGross) ||
    !close(desconto, xmlDiscount) || !close(valorLiquido, vNF) || !close(vNF, cents(xmlGross - xmlDiscount))) {
    return { status: "incompatibleTotal" };
  }

  const protocolKey = text(protocol, "chNFe");
  const idKey = (infNFe.getAttribute("Id") ?? "").replace(/^NFe/, "");
  const chave = digits(protocolKey || idKey);
  if (!chave) return { status: "invalidXml" };
  return { status: "ready", nfe: { chave, nota: text(ide, "nNF"), serie: text(ide, "serie"), produtor, itens, totais: { valorBruto, desconto, valorLiquido, vNF } } };
}
