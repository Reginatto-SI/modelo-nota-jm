import type { Nota } from "./nota";
import type { Rft006NotaGroup } from "./rft006";
import { getRft006FixedGenerationConfig } from "./rft006FixedDefaults";
import { buildRft006Nota, updateRft006Nota, validateRft006Nota, buildRft006PdfFileName } from "./rft006Nota";
import { parseNfeXml, type NfeXmlParseResult, type ParsedNfeXml } from "./nfeXml";

export interface NfeXmlBatchEntry extends NfeXmlParseResult { id: string; fileName: string; selected: boolean }

export function processNfeXmlBatch(files: { name: string; xml: string }[]): NfeXmlBatchEntry[] {
  const keys = new Set<string>();
  return files.map((file, index) => {
    let result = parseNfeXml(file.xml);
    if (result.nfe && keys.has(result.nfe.chave)) result = { status: "duplicate", nfe: result.nfe };
    else if (result.nfe) keys.add(result.nfe.chave);
    return { ...result, id: `${index}-${file.name}`, fileName: file.name, selected: result.status === "ready" };
  });
}

/** Adapta a origem XML ao builder homologado, preservando o endereço mais completo do produtor. */
export function buildNotaFromNfeXml(source: ParsedNfeXml): Nota {
  const group: Rft006NotaGroup = {
    nota: source.nota, situacao: "pronto", diagnostics: [], rows: [],
    emitente: { razaoSocial: source.produtor.nome, cnpj: source.produtor.cpfCnpj, ie: source.produtor.ie, municipio: source.produtor.municipio, clifor: "" },
    items: source.itens.map((item) => ({ descricao: item.descricao, ncm: item.ncm, unidade: item.unidade, quantidade: item.quantidade,
      quantidadeOriginal: item.quantidade, pesoLiquido: null, valorUnitario: item.valorUnitarioBruto, valorTotal: item.valorBruto,
      valorDesconto: item.desconto, valorLiquido: item.valorLiquido })),
  };
  return updateRft006Nota(buildRft006Nota(group, getRft006FixedGenerationConfig()), { emitente: { ...source.produtor } });
}

export async function generateNfeXmlBatch(
  entries: NfeXmlBatchEntry[],
  generate: (notas: Nota[], fileName: string) => void | Promise<void>,
) {
  let generated = 0;
  let failed = 0;
  for (const entry of entries.filter((item) => item.selected && item.status === "ready" && item.nfe)) {
    try {
      const nota = buildNotaFromNfeXml(entry.nfe!);
      const error = validateRft006Nota(nota)[0];
      if (error) throw new Error(error);
      await generate([nota], buildRft006PdfFileName(nota));
      generated += 1;
    } catch {
      failed += 1;
    }
  }
  return { generated, failed };
}
