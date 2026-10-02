import { describe, expect, it } from "vitest";
import type { Rft006Item, Rft006NotaGroup, Rft006Situacao } from "./rft006";
import { EMPTY_RFT006_FILTERS, filterRft006Notas, getRft006NotaLiquidTotal, type Rft006Filters } from "./rft006View";

function nota(nota: string, razaoSocial: string, cnpj: string, ie: string, values: number[], situacao: Rft006Situacao = "pronto"): Rft006NotaGroup {
  const items = values.map((valorLiquido) => ({ valorLiquido } as Rft006Item));
  return { nota, emitente: { razaoSocial, cnpj, ie, municipio: "", clifor: "" }, items, situacao, rows: [], diagnostics: [] };
}

const notas = [
  nota("418", "Alfredo da Silva", "123.456.789-01", "IE-9988", [6_000, 4_000]),
  nota("900", "Cooperativa Norte", "12.345.678/0001-90", "445566", [50_000], "cfop_nao_elegivel"),
  nota("1200", "Fazenda Sul", "98.765.432/0001-10", "778899", [75_000]),
];

const filter = (patch: Partial<Rft006Filters>) => filterRft006Notas(notas, { ...EMPTY_RFT006_FILTERS, ...patch });
const ids = (result: Rft006NotaGroup[]) => result.map((item) => item.nota);

describe("filtros das Notas RFT006", () => {
  it("filtra por número da Nota", () => expect(ids(filter({ search: "418" }))).toEqual(["418"]));
  it("aceita pesquisa parcial", () => expect(ids(filter({ search: "operativa nor" }))).toEqual(["900"]));
  it("filtra por razão social sem diferenciar maiúsculas", () => expect(ids(filter({ search: "ALFREDO" }))).toEqual(["418"]));
  it("localiza CPF formatado com busca sem pontuação", () => expect(ids(filter({ search: "12345678901" }))).toEqual(["418"]));
  it("filtra por IE", () => expect(ids(filter({ search: "9988" }))).toEqual(["418"]));
  it("aplica valor mínimo em formato simples", () => expect(ids(filter({ minValue: "50000" }))).toEqual(["900", "1200"]));
  it("aplica valor máximo em formato brasileiro", () => expect(ids(filter({ maxValue: "50.000,00" }))).toEqual(["418", "900"]));
  it("combina os valores mínimo e máximo", () => expect(ids(filter({ minValue: "10.000,00", maxValue: "50.000,00" }))).toEqual(["418", "900"]));
  it("filtra por situação", () => expect(ids(filter({ situacao: "cfop_nao_elegivel" }))).toEqual(["900"]));
  it("filtra Notas de um item", () => expect(ids(filter({ items: "um" }))).toEqual(["900", "1200"]));
  it("filtra Notas com mais de um item", () => expect(ids(filter({ items: "mais_de_um" }))).toEqual(["418"]));
  it("combina pesquisa, valores, situação e itens", () => expect(ids(filter({ search: "cooperativa", minValue: "40.000,00", maxValue: "60.000,00", situacao: "cfop_nao_elegivel", items: "um" }))).toEqual(["900"]));
  it("filtros limpos retornam todas as Notas", () => expect(filter({})).toEqual(notas));
  it("usa no filtro o mesmo total líquido disponibilizado para exibição", () => {
    expect(getRft006NotaLiquidTotal(notas[0])).toBe(10_000);
    expect(ids(filter({ minValue: "10.000,00", maxValue: "10.000,00" }))).toEqual(["418"]);
  });
});
