-- Tabela N:N entre modelos de nota e cooperativas (modelo liberado p/ várias cooperativas)
CREATE TABLE public.modelo_nota_cooperativas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  modelo_nota_id uuid NOT NULL REFERENCES public.modelos_nota(id) ON DELETE CASCADE,
  cooperativa_id uuid NOT NULL REFERENCES public.cooperativas(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (modelo_nota_id, cooperativa_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelo_nota_cooperativas TO anon, authenticated;
GRANT ALL ON public.modelo_nota_cooperativas TO service_role;

ALTER TABLE public.modelo_nota_cooperativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open access modelo_nota_cooperativas"
  ON public.modelo_nota_cooperativas
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Compatibilidade: liberar cada modelo existente para a cooperativa atual
INSERT INTO public.modelo_nota_cooperativas (modelo_nota_id, cooperativa_id)
SELECT id, cooperativa_id
FROM public.modelos_nota
WHERE cooperativa_id IS NOT NULL
ON CONFLICT (modelo_nota_id, cooperativa_id) DO NOTHING;

-- cooperativa_id deixa de ser obrigatório (mantido apenas como legado)
ALTER TABLE public.modelos_nota ALTER COLUMN cooperativa_id DROP NOT NULL;