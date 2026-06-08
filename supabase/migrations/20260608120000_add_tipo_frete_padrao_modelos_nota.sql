-- Adiciona o tipo de frete padrão por modelo sem criar cadastro separado.
ALTER TABLE public.modelos_nota
  ADD COLUMN tipo_frete_padrao text;

ALTER TABLE public.modelos_nota
  ADD CONSTRAINT modelos_nota_tipo_frete_padrao_check
  CHECK (
    tipo_frete_padrao IS NULL OR tipo_frete_padrao IN (
      '0 - Por conta do Emitente',
      '1 - Por conta do Destinatário/Remetente',
      '2 - Por conta de Terceiros',
      '3 - Transporte próprio por conta do Remetente',
      '4 - Transporte próprio por conta do Destinatário',
      '9 - Sem cobrança de frete'
    )
  );
