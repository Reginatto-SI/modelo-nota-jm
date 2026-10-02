// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { nfeXmlFixture as fixture } from "../test/nfeXmlFixture";
import { buildNotaFromNfeXml, generateNfeXmlBatch, processNfeXmlBatch } from "./nfeXmlBatch";

describe("modelo e lote XML NF-e", () => {
  it("usa o builder/defaults RFT006 e preserva produtor, itens e valores líquidos", () => {
    const parsed = processNfeXmlBatch([{ name: "nota.xml", xml: fixture({ second: true }) }])[0];
    expect(parsed.status).toBe("ready");
    expect(parsed.nfe?.itens).toHaveLength(2);
    const nota = buildNotaFromNfeXml(parsed.nfe!);
    expect(nota).toMatchObject({ sourceType: "rft006", notaReferencia: "417", cfop: "5949", cst: "41", emitente: parsed.nfe?.produtor, valorLiquido: 97 });
    expect(nota.destinatario.nome).toContain("BIOAGRO");
    expect(nota.dadosAdicionais).toContain("REF NOTA 417");
    expect(nota.itens).toHaveLength(2);
    expect(nota.itens?.[0].valorUnitario).toBe(5); // bruto fica apenas interno; o renderer calcula líquido/quantidade.
    expect(nota.produto.cst).toBe("41");
  });

  it("seleciona prontos, impede inválidos e detecta duplicidade pela chave", () => {
    const entries = processNfeXmlBatch([{ name: "a.xml", xml: fixture() }, { name: "b.xml", xml: fixture() }, { name: "c.xml", xml: "ruim" }]);
    expect(entries.map(({ status, selected }) => ({ status, selected }))).toEqual([
      { status: "ready", selected: true }, { status: "duplicate", selected: false }, { status: "invalidXml", selected: false },
    ]);
  });

  it("gera cada PDF, continua após falha e não navega", async () => {
    const entries = processNfeXmlBatch([1, 2, 3].map((number) => ({ name: `${number}.xml`, xml: fixture({ key: `5126105726090600016255001000000417100000001${number}` }) })));
    const generate = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error("download")).mockResolvedValueOnce(undefined);
    expect(await generateNfeXmlBatch(entries, generate)).toEqual({ generated: 2, failed: 1 });
    expect(generate).toHaveBeenCalledTimes(3);
    expect(window.location.pathname).not.toBe("/preview");
  });
});
