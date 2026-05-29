import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Nota, NotaParty } from "./nota";

const BRL = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const BLUE: [number, number, number] = [235, 240, 247];
const BORDER: [number, number, number] = [28, 31, 36];
const RED: [number, number, number] = [205, 30, 38];
const WARN: [number, number, number] = [255, 250, 238];
const ACCESS_KEY_PLACEHOLDER = "____ ____ ____ ____ ____ ____ ____ ____ ____ ____ ____";

const ORIENTATIVE_TITLE = "MODELO ORIENTATIVO - SEM VALIDADE FISCAL";
const ORIENTATIVE_TEXT =
  "Este documento é um modelo orientativo para emissão da Nota Fiscal pelo produtor rural. Não possui validade fiscal como NF-e.";
const FOOTER_TEXT = "Gerado por JM Assessoria e Contabilidade MT - www.jmassessoriamt.com.br";

type ProdutoPdf = Nota["produto"] & {
  codigo?: string | null;
  codigoProduto?: string | null;
  codigo_produto?: string | null;
  codItem?: string | null;
  cst_icms?: string | null;
};

type DrawContext = {
  margin: number;
  pageWidth: number;
  pageHeight: number;
  contentWidth: number;
  footerTop: number;
};

function valueOrDash(value?: string | number | null) {
  if (value == null) return "-";
  const text = String(value).trim();
  return text ? text : "-";
}

function getProdutoCodigo(produto: ProdutoPdf) {
  // Não inventa código de produto: usa código real se a nota passar esse dado; caso contrário, exibe placeholder.
  return valueOrDash(produto.codigo ?? produto.codigoProduto ?? produto.codigo_produto ?? produto.codItem);
}

function getProdutoCst(produto: ProdutoPdf) {
  // O cadastro usa cst_icms e buildNota normaliza para produto.cst; este fallback evita vazio se a origem vier direta.
  return valueOrDash(produto.cst_icms ?? produto.cst);
}

function setBaseStyle(doc: jsPDF) {
  doc.setFont("helvetica", "normal");
  doc.setLineWidth(0.18);
  doc.setDrawColor(...BORDER);
  doc.setTextColor(20, 24, 32);
}

function drawFooter(doc: jsPDF, ctx: DrawContext) {
  const y = ctx.pageHeight - 24;
  doc.setDrawColor(205, 190, 150);
  doc.setFillColor(...WARN);
  doc.rect(ctx.margin, y + 2, ctx.contentWidth, 9, "FD");
  doc.setTextColor(100, 75, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.3);
  doc.text(ORIENTATIVE_TITLE, ctx.margin + 2, y + 5.4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.text(doc.splitTextToSize(ORIENTATIVE_TEXT, ctx.contentWidth - 58), ctx.margin + 2, y + 8.8);

  doc.setTextColor(95, 105, 120);
  doc.setFontSize(7);
  doc.text(`${FOOTER_TEXT} | ${ORIENTATIVE_TITLE}`, ctx.pageWidth / 2, ctx.pageHeight - 7.5, {
    align: "center",
  });
  setBaseStyle(doc);
}

function addPage(doc: jsPDF, ctx: DrawContext) {
  drawFooter(doc, ctx);
  doc.addPage();
  setBaseStyle(doc);
  return ctx.margin;
}

function ensureSpace(doc: jsPDF, ctx: DrawContext, y: number, needed: number) {
  if (y + needed <= ctx.footerTop) return y;
  return addPage(doc, ctx);
}

function drawSectionTitle(doc: jsPDF, ctx: DrawContext, title: string, x: number, y: number, w: number) {
  doc.setFillColor(...BLUE);
  doc.rect(x, y, w, 4.4, "F");
  doc.setDrawColor(...BORDER);
  doc.rect(x, y, w, 4.4);
  doc.setTextColor(18, 24, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.4);
  doc.text(title, x + 1.1, y + 3.1);
  setBaseStyle(doc);
}

function fitText(doc: jsPDF, text: string, width: number, maxLines = 2) {
  const lines = doc.splitTextToSize(valueOrDash(text), Math.max(2, width));
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  const last = visible[maxLines - 1];
  visible[maxLines - 1] = last.length > 3 ? `${last.slice(0, -3)}...` : last;
  return visible;
}

function drawField(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  w: number,
  h = 10,
  options: { bold?: boolean; align?: "left" | "center" | "right"; maxLines?: number; valueColor?: [number, number, number] } = {},
) {
  doc.setDrawColor(...BORDER);
  doc.rect(x, y, w, h);
  doc.setTextColor(55, 58, 64);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.4);
  doc.text(label.toUpperCase(), x + 1.1, y + 2.6);

  doc.setTextColor(...(options.valueColor ?? [18, 24, 35]));
  doc.setFont("helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(options.bold ? 7.2 : 6.8);
  const lines = fitText(doc, value, w - 2.2, options.maxLines ?? 2);
  const textX = options.align === "right" ? x + w - 1.2 : options.align === "center" ? x + w / 2 : x + 1.1;
  doc.text(lines, textX, y + 6.1, { align: options.align ?? "left" });
  setBaseStyle(doc);
}

function drawPartyBlock(
  doc: jsPDF,
  ctx: DrawContext,
  title: string,
  party: NotaParty,
  x: number,
  y: number,
  w: number,
) {
  // Bloco DANFE orientativo: campos em grade compacta para se aproximar dos modelos de nota usados como referência.
  drawSectionTitle(doc, ctx, title, x, y, w);
  const bodyY = y + 4.4;
  const rowH = 9.2;
  drawField(doc, "Nome / Razão Social", party.nome, x, bodyY, w * 0.55, rowH, { bold: true, valueColor: RED });
  drawField(doc, "CPF / CNPJ", party.cpfCnpj, x + w * 0.55, bodyY, w * 0.22, rowH, { bold: true, valueColor: RED });
  drawField(doc, "Inscrição Estadual", party.ie, x + w * 0.77, bodyY, w * 0.23, rowH, { bold: true, valueColor: RED });

  drawField(doc, "Endereço", party.endereco, x, bodyY + rowH, w * 0.45, rowH, { bold: true, valueColor: RED });
  drawField(doc, "Bairro", party.bairro, x + w * 0.45, bodyY + rowH, w * 0.2, rowH, { bold: true, valueColor: RED });
  drawField(doc, "Município", party.municipio, x + w * 0.65, bodyY + rowH, w * 0.25, rowH, { bold: true, valueColor: RED });
  drawField(doc, "UF", party.uf, x + w * 0.9, bodyY + rowH, w * 0.1, rowH, { bold: true, align: "center", valueColor: RED });
  return y + 4.4 + rowH * 2;
}

function drawExampleBarcode(doc: jsPDF, x: number, y: number, w: number, h: number) {
  // Código de barras meramente visual para aproximar do DANFE legado, sem representar uma chave fiscal válida.
  const pattern = [1, 1, 2, 1, 3, 1, 1, 2, 2, 1, 4, 1, 1, 1, 3, 2, 1, 2, 4, 1, 2, 1, 1, 3, 3, 1, 1, 2, 2, 2, 4, 1, 1, 1, 2, 3, 1, 2];
  const unit = w / pattern.reduce((sum, n) => sum + n, 0);
  let cursor = x;
  doc.setFillColor(0, 0, 0);
  pattern.forEach((bar, index) => {
    const barW = bar * unit;
    if (index % 2 === 0) doc.rect(cursor, y, barW, h, "F");
    cursor += barW;
  });
}

function drawHeaderAndDanfe(doc: jsPDF, ctx: DrawContext, nota: Nota) {
  let y = ctx.margin;
  const receiptH = 10;
  const mainH = 30;
  const leftW = ctx.contentWidth * 0.51;
  const danfeW = ctx.contentWidth * 0.12;
  const rightW = ctx.contentWidth - leftW - danfeW;

  doc.setDrawColor(...BORDER);
  doc.rect(ctx.margin, y, ctx.contentWidth, receiptH);
  doc.line(ctx.margin, y + receiptH / 2, ctx.margin + ctx.contentWidth, y + receiptH / 2);
  doc.line(ctx.margin + ctx.contentWidth * 0.86, y, ctx.margin + ctx.contentWidth * 0.86, y + receiptH);
  doc.setTextColor(18, 24, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.text("RECEBEMOS OS PRODUTOS/SERVIÇOS CONSTANTES NA NOTA FISCAL INDICADA ABAIXO", ctx.margin + 1.2, y + 3.2);
  doc.text("DATA DE RECEBIMENTO", ctx.margin + 16, y + 8.1);
  doc.text("IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR", ctx.margin + 66, y + 8.1);
  doc.text("NF-e Nº:", ctx.margin + ctx.contentWidth * 0.86 + 1, y + 3.2);
  doc.text("SÉRIE:", ctx.margin + ctx.contentWidth * 0.86 + 1, y + 8.1);

  y += receiptH;
  const leftX = ctx.margin;
  const danfeX = leftX + leftW;
  const rightX = danfeX + danfeW;

  doc.rect(leftX, y, leftW, mainH);
  doc.rect(danfeX, y, danfeW, mainH);
  doc.rect(rightX, y, rightW, mainH);

  doc.setTextColor(...RED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.4);
  doc.text(valueOrDash(nota.emitente.nome), leftX + leftW / 2, y + 12, { align: "center" });
  doc.setFontSize(6.8);
  doc.text(fitText(doc, nota.emitente.endereco, leftW - 12, 1), leftX + leftW / 2, y + 20, { align: "center" });
  doc.text(`${valueOrDash(nota.emitente.municipio)} - ${valueOrDash(nota.emitente.uf)}`, leftX + leftW / 2, y + 24, {
    align: "center",
  });

  doc.setTextColor(18, 24, 35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("DANFE", danfeX + danfeW / 2, y + 4.6, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(4.9);
  doc.text(["DOCUMENTO AUXILIAR", "DA NOTA FISCAL", "ELETRÔNICA"], danfeX + danfeW / 2, y + 8.2, {
    align: "center",
  });
  doc.text("0 - Entrada", danfeX + danfeW / 2, y + 16.6, { align: "center" });
  doc.text("1 - Saída", danfeX + danfeW / 2, y + 20, { align: "center" });
  doc.text("Nº 000.000.000", danfeX + danfeW / 2, y + 23.5, { align: "center" });
  doc.text("SÉRIE: ____", danfeX + danfeW / 2, y + 26.5, { align: "center" });
  doc.text("FOLHA: 1 de 1", danfeX + danfeW / 2, y + 29, { align: "center" });

  drawExampleBarcode(doc, rightX + 2.3, y + 1.2, rightW - 4.6, 8.8);
  doc.line(rightX, y + 11, rightX + rightW, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.2);
  doc.setTextColor(18, 24, 35);
  doc.text("CHAVE DE ACESSO (PREENCHER APÓS EMISSÃO DA NF-e)", rightX + 2, y + 14.2);
  doc.setTextColor(...RED);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text(ACCESS_KEY_PLACEHOLDER, rightX + rightW / 2, y + 18.5, { align: "center" });
  doc.setTextColor(18, 24, 35);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5.1);
  doc.text("Consulta de autenticidade apenas no emissor oficial do produtor rural.", rightX + rightW / 2, y + 24, {
    align: "center",
  });
  doc.text(ORIENTATIVE_TITLE, rightX + rightW / 2, y + 28, { align: "center" });

  return y + mainH + 1.6;
}
function drawNatureza(doc: jsPDF, ctx: DrawContext, nota: Nota, y: number) {
  drawSectionTitle(doc, ctx, "NATUREZA DA OPERAÇÃO", ctx.margin, y, ctx.contentWidth);
  y += 4.4;
  drawField(
    doc,
    "Modelo / Natureza cadastrada",
    `${valueOrDash(nota.nomeModelo)} — ${valueOrDash(nota.naturezaOperacao)}`,
    ctx.margin,
    y,
    ctx.contentWidth * 0.82,
    10,
    { bold: true, valueColor: RED },
  );
  drawField(doc, "CFOP", nota.cfop, ctx.margin + ctx.contentWidth * 0.82, y, ctx.contentWidth * 0.18, 10, {
    bold: true,
    align: "center",
    valueColor: RED,
  });
  return y + 10.6;
}

function drawProductTable(doc: jsPDF, ctx: DrawContext, nota: Nota, y: number) {
  drawSectionTitle(doc, ctx, "DADOS DO PRODUTO / SERVIÇO", ctx.margin, y, ctx.contentWidth);
  y += 4.4;
  autoTable(doc, {
    startY: y,
    margin: { left: ctx.margin, right: ctx.margin, bottom: ctx.pageHeight - ctx.footerTop + 2 },
    tableWidth: ctx.contentWidth,
    theme: "grid",
    head: [[
      "COD. PROD",
      "PRODUTO / SERVIÇO",
      "NCM/SH",
      "CST",
      "CFOP",
      "UNID",
      "QUANT.",
      "VALOR UNITÁRIO",
      "VALOR TOTAL",
      "B.CALC ICMS",
      "VALOR ICMS",
      "VALOR IPI",
    ]],
    body: [[
      getProdutoCodigo(nota.produto),
      valueOrDash(nota.produto.descricao),
      valueOrDash(nota.produto.ncm),
      getProdutoCst(nota.produto),
      valueOrDash(nota.cfop),
      valueOrDash(nota.produto.unidade),
      NUM(nota.quantidade),
      BRL(nota.valorUnitario),
      BRL(nota.valorTotal),
      "0,00",
      "0,00",
      "0,00",
    ]],
    styles: {
      font: "helvetica",
      fontSize: 5.7,
      cellPadding: 1.15,
      lineColor: BORDER,
      lineWidth: 0.18,
      textColor: [18, 24, 35],
      valign: "top",
    },
    headStyles: {
      fillColor: BLUE,
      textColor: [18, 24, 35],
      fontStyle: "bold",
      halign: "center",
      fontSize: 5.1,
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index <= 8) {
        data.cell.styles.textColor = RED;
        data.cell.styles.fontStyle = "bold";
      }
    },
    columnStyles: {
      0: { cellWidth: 12 },
      1: { cellWidth: 38 },
      2: { cellWidth: 14 },
      3: { cellWidth: 10 },
      4: { cellWidth: 11 },
      5: { cellWidth: 9 },
      6: { cellWidth: 16, halign: "right" },
      7: { cellWidth: 18, halign: "right" },
      8: { cellWidth: 18, halign: "right" },
      9: { cellWidth: 15, halign: "right" },
      10: { cellWidth: 13, halign: "right" },
      11: { cellWidth: 13, halign: "right" },
    },
    didDrawPage: () => drawFooter(doc, ctx),
  });
  return ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? y + 14) + 2;
}

function drawTaxBlock(doc: jsPDF, ctx: DrawContext, nota: Nota, y: number) {
  y = ensureSpace(doc, ctx, y, 27);
  drawSectionTitle(doc, ctx, "CÁLCULO DO IMPOSTO", ctx.margin, y, ctx.contentWidth);
  y += 4.4;
  const w = ctx.contentWidth / 5;
  const h = 9.6;
  drawField(doc, "Base de cálculo ICMS", "0,00", ctx.margin, y, w, h, { align: "right" });
  drawField(doc, "Valor do ICMS", "0,00", ctx.margin + w, y, w, h, { align: "right" });
  drawField(doc, "Base cálculo ICMS ST", "0,00", ctx.margin + w * 2, y, w, h, { align: "right" });
  drawField(doc, "Valor ICMS ST", "0,00", ctx.margin + w * 3, y, w, h, { align: "right" });
  drawField(doc, "Valor total produtos", BRL(nota.valorTotal), ctx.margin + w * 4, y, w, h, {
    bold: true,
    align: "right",
    valueColor: RED,
  });
  y += h;
  drawField(doc, "Valor do frete", "0,00", ctx.margin, y, w, h, { align: "right" });
  drawField(doc, "Valor do seguro", "0,00", ctx.margin + w, y, w, h, { align: "right" });
  drawField(doc, "Desconto", "0,00", ctx.margin + w * 2, y, w, h, { align: "right" });
  drawField(doc, "Outras despesas", "0,00", ctx.margin + w * 3, y, w, h, { align: "right" });
  drawField(doc, "Valor total da nota", BRL(nota.valorTotal), ctx.margin + w * 4, y, w, h, {
    bold: true,
    align: "right",
    valueColor: RED,
  });
  return y + h + 1.8;
}

function drawTransportBlock(doc: jsPDF, ctx: DrawContext, nota: Nota, y: number) {
  y = ensureSpace(doc, ctx, y, 27);
  drawSectionTitle(doc, ctx, "TRANSPORTADOR / VOLUMES TRANSPORTADOS", ctx.margin, y, ctx.contentWidth);
  y += 4.4;
  const h = 9.4;
  const w = ctx.contentWidth;
  drawField(doc, "Razão social", nota.transportador, ctx.margin, y, w * 0.38, h, { valueColor: RED });
  drawField(doc, "Frete por conta", nota.tpFrete, ctx.margin + w * 0.38, y, w * 0.17, h, { bold: true, valueColor: RED });
  drawField(doc, "Código ANTT", "-", ctx.margin + w * 0.55, y, w * 0.14, h);
  drawField(doc, "Placa do veículo", nota.placaVeiculo, ctx.margin + w * 0.69, y, w * 0.16, h, { valueColor: RED });
  drawField(doc, "UF", "-", ctx.margin + w * 0.85, y, w * 0.05, h, { align: "center" });
  drawField(doc, "CNPJ / CPF", "-", ctx.margin + w * 0.9, y, w * 0.1, h);
  y += h;
  drawField(doc, "Quantidade", "-", ctx.margin, y, w * 0.16, h);
  drawField(doc, "Espécie", "-", ctx.margin + w * 0.16, y, w * 0.18, h);
  drawField(doc, "Marca", "-", ctx.margin + w * 0.34, y, w * 0.2, h);
  drawField(doc, "Peso bruto", "-", ctx.margin + w * 0.54, y, w * 0.23, h);
  drawField(doc, "Peso líquido", "-", ctx.margin + w * 0.77, y, w * 0.23, h);
  return y + h + 1.8;
}

function drawAdditionalData(doc: jsPDF, ctx: DrawContext, nota: Nota, y: number) {
  y = ensureSpace(doc, ctx, y, 36);
  const leftW = ctx.contentWidth * 0.68;
  const rightW = ctx.contentWidth - leftW;
  const titleH = 4.4;
  const minBodyH = 29;
  const text = valueOrDash(
    nota.observacao ? `${nota.dadosAdicionais || "-"}\n\nObservação: ${nota.observacao}` : nota.dadosAdicionais,
  );
  const lines = doc.splitTextToSize(text, leftW - 4);
  let index = 0;
  let currentY = y;

  // Dados adicionais podem atravessar páginas; cada página recebe novo quadro para evitar corte ou sobreposição.
  while (index < lines.length || index === 0) {
    currentY = ensureSpace(doc, ctx, currentY, titleH + minBodyH);
    const availableBodyH = ctx.footerTop - currentY - titleH;
    const maxLines = Math.max(1, Math.floor((availableBodyH - 4) / 3.45));
    const pageLines = lines.slice(index, index + maxLines);
    const bodyH = Math.max(minBodyH, pageLines.length * 3.45 + 4);

    drawSectionTitle(doc, ctx, "DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES", ctx.margin, currentY, leftW);
    drawSectionTitle(doc, ctx, "RESERVADO AO FISCO", ctx.margin + leftW, currentY, rightW);
    doc.setDrawColor(...BORDER);
    doc.rect(ctx.margin, currentY + titleH, leftW, bodyH);
    doc.rect(ctx.margin + leftW, currentY + titleH, rightW, bodyH);
    doc.setTextColor(...RED);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.0);
    doc.text(pageLines, ctx.margin + 2, currentY + titleH + 4.2);
    setBaseStyle(doc);

    index += pageLines.length;
    currentY += titleH + bodyH + 2;
    if (index < lines.length) currentY = addPage(doc, ctx);
    else break;
  }

  return currentY;
}

function drawNota(doc: jsPDF, nota: Nota) {
  const ctx: DrawContext = {
    margin: 9,
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    contentWidth: doc.internal.pageSize.getWidth() - 18,
    footerTop: doc.internal.pageSize.getHeight() - 28,
  };
  setBaseStyle(doc);

  let y = drawHeaderAndDanfe(doc, ctx, nota);
  y = drawNatureza(doc, ctx, nota, y);
  y = ensureSpace(doc, ctx, y, 53);
  y = drawPartyBlock(doc, ctx, "EMITENTE (PRODUTOR RURAL)", nota.emitente, ctx.margin, y, ctx.contentWidth);
  y += 1.6;
  y = drawPartyBlock(doc, ctx, "DESTINATÁRIO / REMETENTE", nota.destinatario, ctx.margin, y, ctx.contentWidth);
  y += 1.8;
  y = drawProductTable(doc, ctx, nota, y);
  y = drawTaxBlock(doc, ctx, nota, y);
  y = drawTransportBlock(doc, ctx, nota, y);
  drawAdditionalData(doc, ctx, nota, y);
  drawFooter(doc, ctx);
}

export function generatePdf(notas: Nota[], fileName = "modelo-nota-jm.pdf") {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  notas.forEach((n, i) => {
    if (i > 0) doc.addPage();
    drawNota(doc, n);
  });
  doc.save(fileName);
}

export function pdfDataUri(notas: Nota[]): string {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  notas.forEach((n, i) => {
    if (i > 0) doc.addPage();
    drawNota(doc, n);
  });
  return doc.output("datauristring");
}
