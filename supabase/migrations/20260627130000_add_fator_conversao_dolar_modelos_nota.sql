ALTER TABLE public.modelos_nota
  ADD COLUMN IF NOT EXISTS fator_conversao_dolar numeric;

COMMENT ON COLUMN public.modelos_nota.fator_conversao_dolar IS
  'Fator configurável para converter preço da saca em dólar do GRL019 antes do cálculo por KG.';
