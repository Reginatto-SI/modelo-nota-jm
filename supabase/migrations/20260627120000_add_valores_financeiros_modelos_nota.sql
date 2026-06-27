ALTER TABLE public.modelos_nota
  ADD COLUMN IF NOT EXISTS valor_unitario_padrao numeric,
  ADD COLUMN IF NOT EXISTS valor_total_padrao numeric;

COMMENT ON COLUMN public.modelos_nota.valor_unitario_padrao IS
  'Valor unitário inicial sugerido em R$/KG para a prévia do modelo de nota. O usuário pode editar antes de gerar o PDF.';

COMMENT ON COLUMN public.modelos_nota.valor_total_padrao IS
  'Valor total inicial sugerido para a prévia do modelo de nota. Quando informado, recalcula o valor unitário com base na quantidade.';
