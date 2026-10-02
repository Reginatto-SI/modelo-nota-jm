import { describe, expect, it } from "vitest";
import type { Rft006NotaGroup, Rft006Report, Rft006Situacao } from "./rft006";
import { RFT006_SITUACOES, summarizeRft006 } from "./rft006View";

function nota(situacao: Rft006Situacao): Rft006NotaGroup {
  return { nota: situacao, situacao, emitente: { razaoSocial: "", cnpj: "", ie: "", municipio: "", clifor: "" }, items: [], rows: [], diagnostics: [] };
}

describe("apresentação do RFT006", () => {
  it("mantém os rótulos visuais alinhados às classificações do parser", () => {
    expect(Object.keys(RFT006_SITUACOES)).toEqual([
      "pronto", "cfop_nao_elegivel", "cfops_mistos", "emitente_inconsistente", "dados_obrigatorios_ausentes",
    ]);
    expect(RFT006_SITUACOES.cfops_mistos.label).toBe("CFOPs mistos");
  });

  it("resume prontas, não elegíveis e inconsistências sem criar regra fiscal", () => {
    const notas = [nota("pronto"), nota("cfop_nao_elegivel"), nota("cfops_mistos"), nota("emitente_inconsistente")];
    const report = { rows: [{}, {}, {}], notas, diagnostics: [{}, {}] } as unknown as Rft006Report;

    expect(summarizeRft006(report)).toEqual({ linhas: 3, notas: 4, prontas: 1, naoElegiveis: 1, inconsistentes: 2, diagnosticos: 2 });
  });
});
