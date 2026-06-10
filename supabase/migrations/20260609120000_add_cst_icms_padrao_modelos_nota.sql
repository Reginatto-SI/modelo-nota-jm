-- Permite parametrizar a CST ICMS exibida no PDF por modelo/CFOP.
ALTER TABLE public.modelos_nota
  ADD COLUMN cst_icms_padrao text;
