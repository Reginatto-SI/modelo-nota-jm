import jsPDF from "jspdf";
import type { Nota } from "./nota";

const BRL = (v: number) =>
  "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUM = (v: number) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateBR = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return d && m && y ? `${d}/${m}/${y}` : iso;
};

const NAVY: [number, number, number] = [18, 52, 96];
const LIGHT: [number, number, number] = [235, 240, 247];

function drawNota(doc: jsPDF, nota: Nota) {
  const M = 14;
  const W = doc.internal.pageSize.getWidth();
  const right = W - M;
  let y = M;

  // Header band
  doc.setFillColor(...NAVY);
  doc.rect(M, y, W - 2 * M, 16, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("MODELO DE NOTA JM", M + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Documento orientativo - SEM validade fiscal", M + 4, y + 12);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(`CFOP ${nota.cfop}`, right - 4, y + 9, { align: "right" });
  y += 20;

  doc.setTextColor(0, 0, 0);

  const labelBox = (label: string, value: string, x: number, by: number, w: number, h = 11) => {
    doc.setDrawColor(180, 190, 205);
    doc.rect(x, by, w, h);
    doc.setFontSize(6.5);
    doc.setTextColor(110, 120, 135);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + 1.5, by + 3.3);
    doc.setFontSize(9);
    doc.setTextColor(20, 20, 30);
    doc.setFont("helvetica", "bold");
    doc.text(doc.splitTextToSize(value || "-", w - 3), x + 1.5, by + 8);
    doc.setFont("helvetica", "normal");
  };

  const sectionTitle = (t: string) => {
    doc.setFillColor(...LIGHT);
    doc.rect(M, y, W - 2 * M, 6, "F");
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(t, M + 2, y + 4.2);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    y += 6;
  };

  const full = W - 2 * M;
  // Operation
  labelBox("MODELO / NATUREZA DA OPERAÇÃO", `${nota.nomeModelo} — ${nota.naturezaOperacao}`, M, y, full * 0.7);
  labelBox("CFOP", nota.cfop, M + full * 0.7, y, full * 0.3);
  y += 11;

  // Emitente
  sectionTitle("EMITENTE (PRODUTOR RURAL)");
  labelBox("NOME / RAZÃO SOCIAL", nota.emitente.nome, M, y, full * 0.6);
  labelBox("CPF / CNPJ", nota.emitente.cpfCnpj, M + full * 0.6, y, full * 0.22);
  labelBox("INSCR. ESTADUAL", nota.emitente.ie, M + full * 0.82, y, full * 0.18);
  y += 11;
  labelBox("ENDEREÇO", nota.emitente.endereco, M, y, full * 0.6);
  labelBox("MUNICÍPIO", nota.emitente.municipio, M + full * 0.6, y, full * 0.3);
  labelBox("UF", nota.emitente.uf, M + full * 0.9, y, full * 0.1);
  y += 11;

  // Destinatário
  sectionTitle("DESTINATÁRIO");
  labelBox("NOME / RAZÃO SOCIAL", nota.destinatario.nome, M, y, full * 0.6);
  labelBox("CPF / CNPJ", nota.destinatario.cpfCnpj, M + full * 0.6, y, full * 0.22);
  labelBox("INSCR. ESTADUAL", nota.destinatario.ie, M + full * 0.82, y, full * 0.18);
  y += 11;
  labelBox("ENDEREÇO", nota.destinatario.endereco, M, y, full * 0.6);
  labelBox("MUNICÍPIO", nota.destinatario.municipio, M + full * 0.6, y, full * 0.3);
  labelBox("UF", nota.destinatario.uf, M + full * 0.9, y, full * 0.1);
  y += 11;

  // Produto
  sectionTitle("PRODUTO / SERVIÇO");
  labelBox("DESCRIÇÃO", nota.produto.descricao, M, y, full * 0.46);
  labelBox("NCM", nota.produto.ncm, M + full * 0.46, y, full * 0.14);
  labelBox("CST", nota.produto.cst, M + full * 0.6, y, full * 0.1);
  labelBox("UN", nota.produto.unidade, M + full * 0.7, y, full * 0.08);
  labelBox("QTD", NUM(nota.quantidade), M + full * 0.78, y, full * 0.22);
  y += 11;
  labelBox("VALOR UNITÁRIO (R$/KG)", BRL(nota.valorUnitario), M, y, full * 0.4);
  labelBox("VALOR TOTAL", BRL(nota.valorTotal), M + full * 0.4, y, full * 0.3);
  labelBox("TIPO FRETE", nota.tpFrete, M + full * 0.7, y, full * 0.3);
  y += 11;

  // Datas / transporte
  sectionTitle("EMISSÃO E TRANSPORTE");
  labelBox("DATA EMISSÃO", dateBR(nota.dataEmissao), M, y, full * 0.2);
  labelBox("DATA SAÍDA", dateBR(nota.dataSaida), M + full * 0.2, y, full * 0.2);
  labelBox("HORA SAÍDA", nota.horaSaida, M + full * 0.4, y, full * 0.15);
  labelBox("PLACA", nota.placaVeiculo, M + full * 0.55, y, full * 0.15);
  labelBox("TRANSPORTADOR", nota.transportador, M + full * 0.7, y, full * 0.3);
  y += 11;

  // Dados adicionais
  sectionTitle("DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES");
  const daLines = doc.splitTextToSize(nota.dadosAdicionais || "-", full - 4);
  const daH = Math.max(18, daLines.length * 4 + 4);
  doc.setDrawColor(180, 190, 205);
  doc.rect(M, y, full, daH);
  doc.setFontSize(8);
  doc.text(daLines, M + 2, y + 5);
  y += daH + 2;

  if (nota.observacao) {
    const obsLines = doc.splitTextToSize("Observação: " + nota.observacao, full - 4);
    const obsH = obsLines.length * 4 + 4;
    doc.rect(M, y, full, obsH);
    doc.text(obsLines, M + 2, y + 5);
    y += obsH + 2;
  }

  // Disclaimer
  const H = doc.internal.pageSize.getHeight();
  doc.setFillColor(255, 244, 222);
  doc.rect(M, H - 26, full, 11, "F");
  doc.setTextColor(120, 80, 10);
  doc.setFontSize(7.5);
  doc.text(
    doc.splitTextToSize(
      "Este documento é um modelo orientativo para emissão da Nota Fiscal pelo produtor rural. Não possui validade fiscal como NF-e.",
      full - 4,
    ),
    M + 2,
    H - 21,
  );

  doc.setTextColor(120, 130, 145);
  doc.setFontSize(7);
  doc.text(
    "Gerado por JM Assessoria e Contabilidade MT - www.jmassessoriamt.com.br",
    W / 2,
    H - 10,
    { align: "center" },
  );
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
