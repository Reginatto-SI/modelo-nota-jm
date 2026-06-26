-- Permite sugerir uma quantidade inicial por modelo/CFOP sem travar a edição na prévia.
ALTER TABLE public.modelos_nota
  ADD COLUMN IF NOT EXISTS quantidade_padrao numeric;

COMMENT ON COLUMN public.modelos_nota.quantidade_padrao IS
  'Quantidade inicial sugerida em KG para a prévia do modelo de nota. O usuário pode editar antes de gerar o PDF.';
