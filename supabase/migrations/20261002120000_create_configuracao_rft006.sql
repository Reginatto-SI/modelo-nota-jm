-- Configuração global e única usada como ponto de partida no fluxo RFT006.
CREATE TABLE public.configuracao_rft006 (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  destinatario_id uuid REFERENCES public.armazens(id) ON DELETE SET NULL,
  cfop text NOT NULL,
  natureza_operacao text NOT NULL,
  cst text NOT NULL,
  dados_adicionais_template text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracao_rft006 TO anon, authenticated;
GRANT ALL ON public.configuracao_rft006 TO service_role;

ALTER TABLE public.configuracao_rft006 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open access configuracao_rft006"
  ON public.configuracao_rft006
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER trg_configuracao_rft006_updated
  BEFORE UPDATE ON public.configuracao_rft006
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

