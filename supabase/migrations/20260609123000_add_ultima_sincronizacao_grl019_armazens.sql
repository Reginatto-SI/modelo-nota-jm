ALTER TABLE public.armazens
ADD COLUMN IF NOT EXISTS ultima_sincronizacao_grl019 timestamptz;

COMMENT ON COLUMN public.armazens.ultima_sincronizacao_grl019 IS 'Data/hora da última criação ou enriquecimento automático deste armazém/destinatário a partir do GRL019.';
