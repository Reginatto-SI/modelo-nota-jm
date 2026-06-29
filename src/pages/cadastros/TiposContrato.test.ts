import { describe, expect, it } from "vitest";
import { hasDuplicateTipoContrato } from "./TiposContrato";
import type { TipoContrato } from "@/lib/types";

function tipoContrato(overrides: Partial<TipoContrato> = {}): TipoContrato {
  return {
    id: overrides.id ?? "tipo-1",
    cooperativa_id: "coop-1",
    codigo_contrato: "COE",
    descricao_contrato: "Contrato teste",
    tp_faturamento: "RECEBIMENTO",
    cfop: "5118",
    modelo_nota_id: "modelo-1",
    exige_contrato_vinculado: false,
    gera_operacao_casada: false,
    ativo: true,
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

describe("hasDuplicateTipoContrato", () => {
  it("bloqueia duplicidade por cooperativa, código textual normalizado e TP faturamento", () => {
    const data = [tipoContrato({ codigo_contrato: "COE", modelo_nota_id: "modelo-1" })];

    expect(hasDuplicateTipoContrato(data, {
      cooperativa_id: "coop-1",
      codigo_contrato: " coe ",
      tp_faturamento: "recebimento",
      modelo_nota_id: "modelo-2",
    })).toBe(true);
  });

  it("permite mesmo código na mesma cooperativa quando o TP faturamento é diferente", () => {
    const data = [tipoContrato({ codigo_contrato: "COE", tp_faturamento: "RECEBIMENTO" })];

    expect(hasDuplicateTipoContrato(data, {
      cooperativa_id: "coop-1",
      codigo_contrato: "COE",
      tp_faturamento: "EXPEDIÇÃO",
      modelo_nota_id: "modelo-2",
    })).toBe(false);
  });
});
