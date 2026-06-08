// Opções fixas de frete da NF-e, sem cadastro ou dependência de banco de dados.
export const TIPO_FRETE_OPTIONS = [
  "0 - Por conta do Emitente",
  "1 - Por conta do Destinatário/Remetente",
  "2 - Por conta de Terceiros",
  "3 - Transporte próprio por conta do Remetente",
  "4 - Transporte próprio por conta do Destinatário",
  "9 - Sem cobrança de frete",
] as const;

export const TIPO_FRETE_DEFAULT = "1 - Por conta do Destinatário/Remetente";

export type TipoFrete = (typeof TIPO_FRETE_OPTIONS)[number];

export function normalizeTipoFrete(value?: string | null): TipoFrete {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return TIPO_FRETE_DEFAULT;

  const byCodeOrLabel = TIPO_FRETE_OPTIONS.find(
    (option) => option.startsWith(normalized) || option.toLowerCase() === normalized,
  );
  if (byCodeOrLabel) return byCodeOrLabel;

  // Mantém compatibilidade com descrições legadas importadas do GRL019.
  if (["não paga frete", "nao paga frete", "sem cobranca de frete", "sem cobrança de frete"].includes(normalized)) {
    return "9 - Sem cobrança de frete";
  }

  // Fallback fiscal solicitado quando o modelo não tem tipo de frete padrão cadastrado.
  return TIPO_FRETE_DEFAULT;
}
