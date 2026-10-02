import { describe, expect, it } from "vitest";
import { buildRft006Nota } from "./rft006Nota";
import { RFT006_FIXED_DEFAULTS } from "./rft006FixedDefaults";
import type { Rft006NotaGroup } from "./rft006";

const group = (nota: string): Rft006NotaGroup => ({
  nota,
  situacao: "pronto",
  diagnostics: [],
  rows: [],
  emitente: { razaoSocial: "Agricultor", cnpj: "11", ie: "", municipio: "Sorriso", clifor: "1" },
  items: [{ descricao: "Soja", ncm: "12019000", unidade: "KG", quantidade: 4, pesoLiquido: 4, quantidadeOriginal: 4, valorUnitario: 300, valorTotal: 1200, valorDesconto: 190.41, valorLiquido: 1009.59 }],
});

describe("defaults operacionais temporários do RFT006", () => {
  it("define BIOAGRO e os dados fiscais solicitados", () => {
    expect(RFT006_FIXED_DEFAULTS.destinatario).toEqual({
      nome: "BIOAGRO - ASSOCIACAO BIOLOGICA DE PRODUTORES DO MT",
      cpfCnpj: "66.730.143/0001-67",
      ie: "14.195.657-7",
      endereco: "AV P MT-249",
      bairro: "CIDADE BELA",
      cep: "78456-333",
      municipio: "NOVA MUTUM",
      uf: "MT",
    });
    expect(RFT006_FIXED_DEFAULTS.cfop).toBe("5949");
    expect(RFT006_FIXED_DEFAULTS.cst).toBe("41");
    expect(RFT006_FIXED_DEFAULTS.naturezaOperacao).toBe("REMESSA SIMBÓLICA P/ INDUSTRIALIZAÇÃO");
    expect(RFT006_FIXED_DEFAULTS.dadosAdicionaisTemplate).toContain("REF NOTA {{nota_referencia}}");
  });

  it.each(["418", "394", "403"])("renderiza somente a referência atual %s", (referencia) => {
    const nota = buildRft006Nota(group(referencia), {
      destinatario: { ...RFT006_FIXED_DEFAULTS.destinatario },
      cfop: RFT006_FIXED_DEFAULTS.cfop,
      cst: RFT006_FIXED_DEFAULTS.cst,
      naturezaOperacao: RFT006_FIXED_DEFAULTS.naturezaOperacao,
      dadosAdicionais: RFT006_FIXED_DEFAULTS.dadosAdicionaisTemplate,
    });

    expect(nota.dadosAdicionais).toContain(`REF NOTA ${referencia}`);
    expect(nota.dadosAdicionais).not.toContain("{{nota_referencia}}");
    if (referencia !== "418") expect(nota.dadosAdicionais).not.toContain("REF NOTA 418");
  });
});
