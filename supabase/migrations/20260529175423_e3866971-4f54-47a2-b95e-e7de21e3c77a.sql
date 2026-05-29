-- updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Cooperativas
CREATE TABLE public.cooperativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_grl019 text NOT NULL,
  razao_social text NOT NULL,
  cnpj text,
  inscricao_estadual text,
  endereco text,
  bairro text,
  cep text,
  municipio text,
  uf text,
  telefone text,
  email text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cooperativas TO anon, authenticated;
GRANT ALL ON public.cooperativas TO service_role;
ALTER TABLE public.cooperativas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access cooperativas" ON public.cooperativas FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_cooperativas_updated BEFORE UPDATE ON public.cooperativas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Armazéns / Destinatários
CREATE TABLE public.armazens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social text NOT NULL,
  cnpj_cpf text,
  inscricao_estadual text,
  endereco text,
  bairro text,
  cep text,
  municipio text,
  uf text,
  telefone text,
  tipo text NOT NULL DEFAULT 'armazem',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.armazens TO anon, authenticated;
GRANT ALL ON public.armazens TO service_role;
ALTER TABLE public.armazens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access armazens" ON public.armazens FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_armazens_updated BEFORE UPDATE ON public.armazens FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Produtos
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_produto text NOT NULL,
  descricao text NOT NULL,
  ncm text,
  cst_icms text,
  unidade text DEFAULT 'KG',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.produtos TO anon, authenticated;
GRANT ALL ON public.produtos TO service_role;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access produtos" ON public.produtos FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_produtos_updated BEFORE UPDATE ON public.produtos FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Modelos de Nota
CREATE TABLE public.modelos_nota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperativa_id uuid NOT NULL REFERENCES public.cooperativas(id) ON DELETE CASCADE,
  cfop text NOT NULL,
  nome_modelo text NOT NULL,
  natureza_operacao text,
  tipo_destinatario text NOT NULL DEFAULT 'cooperativa',
  dados_adicionais_template text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.modelos_nota TO anon, authenticated;
GRANT ALL ON public.modelos_nota TO service_role;
ALTER TABLE public.modelos_nota ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access modelos_nota" ON public.modelos_nota FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_modelos_nota_updated BEFORE UPDATE ON public.modelos_nota FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tipos de Contrato
CREATE TABLE public.tipos_contrato (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cooperativa_id uuid NOT NULL REFERENCES public.cooperativas(id) ON DELETE CASCADE,
  codigo_contrato text NOT NULL,
  descricao_contrato text,
  tp_faturamento text,
  cfop text,
  modelo_nota_id uuid REFERENCES public.modelos_nota(id) ON DELETE SET NULL,
  exige_contrato_vinculado boolean NOT NULL DEFAULT false,
  gera_operacao_casada boolean NOT NULL DEFAULT false,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tipos_contrato TO anon, authenticated;
GRANT ALL ON public.tipos_contrato TO service_role;
ALTER TABLE public.tipos_contrato ENABLE ROW LEVEL SECURITY;
CREATE POLICY "open access tipos_contrato" ON public.tipos_contrato FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER trg_tipos_contrato_updated BEFORE UPDATE ON public.tipos_contrato FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();