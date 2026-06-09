ALTER TABLE public.armazens
ADD COLUMN IF NOT EXISTS origem_cadastro text NOT NULL DEFAULT 'manual';

COMMENT ON COLUMN public.armazens.origem_cadastro IS 'Origem do cadastro global de armazém/destinatário: manual ou grl019.';
