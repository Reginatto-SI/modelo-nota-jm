# Análise 4 — CST por Modelo de Nota e ajuste do grid de produtos no PDF

## 1. Diagnóstico da CST atual

- O cadastro de produtos possui o campo `cst_icms` e a tela de produtos já exibe/edita esse valor.
- O cadastro de Modelos de Nota não possuía campo para CST ICMS por modelo/CFOP.
- Na montagem da nota, a CST enviada ao PDF era sempre normalizada a partir do produto (`r.produto?.cst_icms ?? ""`).
- No PDF, a função de leitura da CST apenas exibia `produto.cst_icms` ou `produto.cst`, sem regra por modelo.
- A CST `041` não estava hardcoded no PDF; ela vinha do cadastro do produto usado nos testes/cadastros. O efeito visual era de CST fixa porque todos os modelos consumiam a mesma CST do produto.

## 2. Arquivos analisados

- `src/pages/cadastros/ModelosNota.tsx` — cadastro e grid de Modelos de Nota.
- `src/pages/cadastros/Produtos.tsx` — cadastro atual da CST ICMS do produto.
- `src/lib/types.ts` — tipos de domínio usados pela aplicação.
- `src/integrations/supabase/types.ts` — tipos gerados/espelhados do Supabase.
- `src/lib/db.ts` — hooks genéricos de listagem e gravação das tabelas.
- `src/lib/resolve.ts` — resolução de cooperativa, tipo, modelo, produto e validação mínima para geração.
- `src/lib/nota.ts` — montagem da estrutura `Nota` usada pelo PDF.
- `src/lib/pdf.ts` — desenho do PDF, incluindo a tabela “DADOS DO PRODUTO / SERVIÇO”.
- `supabase/migrations/20260529175423_e3866971-4f54-47a2-b95e-e7de21e3c77a.sql` — criação inicial de `produtos` e `modelos_nota`.
- `supabase/migrations/20260608120000_add_tipo_frete_padrao_modelos_nota.sql` — padrão existente de migration incremental em `modelos_nota`.

## 3. Origem atual da CST

Antes do ajuste:

```text
PDF -> nota.produto.cst -> produto.cst_icms
```

Ou seja, a origem efetiva era o cadastro do produto. Não existia parametrização por Modelo de Nota/CFOP.

## 4. Alteração implementada

- Criada migration para adicionar `cst_icms_padrao text null` em `public.modelos_nota`.
- Atualizados os tipos `ModeloNota` e os tipos do Supabase para incluir `cst_icms_padrao` em `Row`, `Insert` e `Update`.
- Adicionado no cadastro de Modelos de Nota o campo opcional `CST ICMS padrão` com helper explicando o fallback para produto.
- Adicionada coluna informativa `CST ICMS` no grid de Modelos de Nota.
- Ajustada a montagem da nota para preencher `nota.produto.cst` com a CST do modelo quando informada.
- Ajustada a validação em `resolve.ts` para considerar que a CST exigida para o PDF pode vir do modelo, mantendo NCM no produto.
- Adicionados testes unitários para validar prioridade da CST do modelo e fallback para CST do produto.

## 5. Regra de fallback

Regra aplicada na montagem da nota/PDF:

```text
CST exibida = modelo.cst_icms_padrao preenchida ? modelo.cst_icms_padrao : produto.cst_icms
```

Detalhes:

- Espaços em branco são tratados como vazio via `trim()`.
- Modelo com CST preenchida usa a CST do próprio modelo.
- Modelo sem CST preenchida mantém o comportamento anterior e usa a CST do produto.
- Não houve alteração em NCM, produto, quantidade, valor unitário, valor total, PIS/COFINS ou outras CSTs.
- Não foi hardcodada a CST `041`.

## 6. Ajuste feito na tabela do PDF

- A tabela “DADOS DO PRODUTO / SERVIÇO” usa `tableWidth: ctx.contentWidth`.
- A largura útil do PDF é `192mm` (`A4 210mm - margens 9mm + 9mm`).
- Antes, as larguras fixas das colunas somavam `187mm`, deixando uma sobra visual de aproximadamente `5mm` no canto direito.
- Ajuste mínimo: a última coluna (`VALOR IPI`) passou de `13mm` para `18mm`.
- Com isso, a soma das colunas passou a ser `192mm`, alinhando a borda direita da última coluna com o cabeçalho da seção.
- O conteúdo da tabela foi mantido e não houve mudança no layout geral do PDF.

## 7. Riscos

- Registros existentes terão `cst_icms_padrao` nulo até serem preenchidos manualmente; nesses casos o fallback para produto preserva o comportamento anterior.
- Caso o ambiente Supabase não receba a migration, a tela poderá falhar ao salvar/listar o novo campo.
- A coluna `VALOR IPI` ficou 5mm mais larga; o risco visual é baixo porque a alteração usa exatamente a sobra que já existia na largura útil da tabela.
- A validação agora aceita CST oriunda do modelo para geração, mas continua exigindo produto cadastrado e NCM do produto.

## 8. Checklist de validação

- [ ] Campo `CST ICMS padrão` aparece no cadastro de Modelos de Nota.
- [ ] Modelo com `cst_icms_padrao` preenchido usa essa CST no PDF.
- [ ] Modelo sem `cst_icms_padrao` preenchido usa a CST ICMS do produto.
- [ ] CST `041` não fica fixa em todos os modelos.
- [ ] Modelos 5118, 5923 e 5132 continuam gerando normalmente.
- [ ] PDF individual continua funcionando.
- [ ] Nome padronizado do PDF não foi afetado.
- [ ] Tabela de produtos não deixa espaço branco no canto direito.
- [ ] Layout geral do PDF não foi alterado.
