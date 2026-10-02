import { describe, expect, it } from "vitest";
import { TIPO_FRETE_DEFAULT, normalizePreviewTipoFrete } from "./tipoFrete";

describe("normalizePreviewTipoFrete", () => {
  it("preserva frete vazio do RFT006", () => {
    expect(normalizePreviewTipoFrete("rft006", "")).toBe("");
  });

  it("mantém o default homologado para GRL019 vazio", () => {
    expect(normalizePreviewTipoFrete("grl019", "")).toBe(TIPO_FRETE_DEFAULT);
  });

  it("normaliza normalmente um frete válido do GRL019", () => {
    expect(normalizePreviewTipoFrete("grl019", "9")).toBe("9 - Sem cobrança de frete");
  });
});
