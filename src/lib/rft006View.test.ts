import { describe, expect, it } from "vitest";
import type { Rft006NotaGroup, Rft006Report, Rft006Situacao } from "./rft006";
import { RFT006_SITUACOES, sortRft006Notas, summarizeRft006 } from "./rft006View";

function nota(situacao: Rft006Situacao): Rft006NotaGroup {
  return { nota: situacao, situacao, emitente: { razaoSocial: "", cnpj: "", ie: "", municipio: "", clifor: "" }, items: [], rows: [], diagnostics: [] };
}

function sortable(notaNumero: string, razaoSocial: string): Rft006NotaGroup {
  return {
    nota: notaNumero,
    situacao: "pronto",
    emitente: { razaoSocial, cnpj: "", ie: "", municipio: "", clifor: "" },
    items: [],
    rows: [],
    diagnostics: [],
  };
}

describe("apresentação do RFT006", () => {
  it("mantém os rótulos visuais alinhados às classificações do parser", () => {
    expect(Object.keys(RFT006_SITUACOES)).toEqual([
      "pronto", "cfop_nao_elegivel", "cfops_mistos", "emitente_inconsistente", "dados_obrigatorios_ausentes",
    ]);
    expect(RFT006_SITUACOES.cfops_mistos.label).toBe("CFOPs mistos");
  });

  it("ordena Nota numericamente crescente e decrescente sem mutar a lista original", () => {
    const original = [sortable("418", "B"), sortable("39", "C"), sortable("403", "A")];

    expect(sortRft006Notas(original, { key: "nota", direction: "asc" }).map((item) => item.nota)).toEqual(["39", "403", "418"]);
    expect(sortRft006Notas(original, { key: "nota", direction: "desc" }).map((item) => item.nota)).toEqual(["418", "403", "39"]);
    expect(original.map((item) => item.nota)).toEqual(["418", "39", "403"]);
  });

  it("ordena Razão Social em pt-BR e usa a Nota como desempate", () => {
    const notas = [sortable("403", "Érico"), sortable("418", "ALFREDO"), sortable("394", "Alfredo")];

    expect(sortRft006Notas(notas, { key: "razaoSocial", direction: "asc" }).map((item) => item.nota)).toEqual(["394", "418", "403"]);
    expect(sortRft006Notas(notas, { key: "razaoSocial", direction: "desc" }).map((item) => item.nota)).toEqual(["403", "418", "394"]);
  });

  it("sem ordenação preserva a ordem atual dos registros", () => {
    const notas = [sortable("418", "B"), sortable("394", "A")];
    expect(sortRft006Notas(notas, null).map((item) => item.nota)).toEqual(["418", "394"]);
  });

  it("resume prontas, não elegíveis e inconsistências sem criar regra fiscal", () => {
    const notas = [nota("pronto"), nota("cfop_nao_elegivel"), nota("cfops_mistos"), nota("emitente_inconsistente")];
    const report = { rows: [{}, {}, {}], notas, diagnostics: [{}, {}] } as unknown as Rft006Report;

    expect(summarizeRft006(report)).toEqual({ linhas: 3, notas: 4, prontas: 1, naoElegiveis: 1, inconsistentes: 2, diagnosticos: 2 });
  });
});
