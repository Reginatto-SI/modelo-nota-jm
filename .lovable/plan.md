# Modelos de Nota reutilizáveis por várias cooperativas

## Objetivo
Permitir que um mesmo Modelo de Nota seja liberado para uma ou mais cooperativas (N:N), modernizar o modal de cadastro com abas e garantir que a busca/geração só use modelos liberados para a cooperativa do GRL019.

## Situação atual (investigação)
- `modelos_nota.cooperativa_id` (NOT NULL) amarra cada modelo a UMA cooperativa.
- `resolve.ts > findModeloAtivo` filtra modelos por `m.cooperativa_id === cooperativaId`.
- `tipos_contrato.cooperativa_id` continua por cooperativa (não muda).
- A tela `ModelosNota.tsx` usa o componente genérico `CrudPage` (sem abas, campo único "Cooperativa").

## Banco de dados (migração)
1. Criar tabela N:N:
```text
modelo_nota_cooperativas
- id uuid PK
- modelo_nota_id uuid -> modelos_nota(id) ON DELETE CASCADE
- cooperativa_id uuid -> cooperativas(id) ON DELETE CASCADE
- created_at timestamptz default now()
- UNIQUE (modelo_nota_id, cooperativa_id)
```
2. GRANTs (authenticated + service_role; anon select para manter padrão das tabelas atuais que são `open access`), habilitar RLS com policy `open access` igual às demais tabelas do projeto.
3. **Compatibilidade:** popular a nova tabela a partir do `cooperativa_id` atual de cada modelo (INSERT ... SELECT). Tornar `modelos_nota.cooperativa_id` NULLABLE (deixa de ser obrigatório), sem removê-lo — modelos antigos continuam válidos.

## Backend de dados no app (`src/lib/db.ts`)
- `useModelos` passa a buscar também os vínculos e anexar `cooperativa_ids: string[]` em cada modelo (uma query extra em `modelo_nota_cooperativas`, agrupada em memória).
- `useSaveModelo` passa a salvar o modelo e sincronizar os vínculos da tabela N:N (apaga os vínculos antigos do modelo e insere os selecionados) numa única operação do hook. Mantém invalidação de cache.

## Tipos (`src/lib/types.ts`)
- `ModeloNota.cooperativa_id` vira `string | null`.
- Adicionar `cooperativa_ids?: string[]` em `ModeloNota`.

## Tela `ModelosNota.tsx` (modal em abas)
Substituir o uso do `CrudPage` genérico por um modal próprio nesta tela, **reutilizando** os primitivos já existentes (`Dialog`, `Tabs`, `Checkbox`, `Input`, `Textarea`, `Select`, `Switch`, `Table`, `Button`). A listagem/tabela e busca continuam no mesmo estilo.

Modal com 3 abas:
- **Aba 1 — Dados do Modelo:** CFOP, Tipo de destinatário, Nome do modelo, Natureza da operação, Tipo de frete padrão, CST ICMS padrão, Status.
- **Aba 2 — Cooperativas liberadas:** lista de cooperativas ativas com checkbox + "Selecionar todas". Validação: exigir ≥ 1 selecionada.
- **Aba 3 — Dados adicionais:** textarea do template + lista das variáveis disponíveis.

Validações ao salvar: CFOP obrigatório, Nome obrigatório, ≥1 cooperativa liberada (com toast/erro claro e foco na aba correspondente).

## Grid de modelos
Colunas: CFOP · Modelo · **Cooperativas liberadas** · Destinatário · Frete padrão · CST ICMS · Status · Ações.
Resumo de cooperativas liberadas:
- "Todas" quando o modelo cobrir todas as cooperativas ativas;
- nomes quando forem poucas (até ~2-3);
- "N cooperativas" quando forem muitas.

## Regras de geração (`src/lib/resolve.ts`)
- `findModeloAtivo` passa a considerar modelo liberado quando `cooperativaId` estiver em `modelo.cooperativa_ids` (com fallback ao antigo `cooperativa_id` para qualquer registro legado não migrado), além de `ativo` e CFOP/modeloId.
- Se o tipo de contrato apontar para um modelo **não liberado** para a cooperativa do GRL019, bloquear a geração e exibir mensagem clara (modelo existe mas não está liberado para a cooperativa X).
- Mesmo tratamento aplicado ao modelo 5923 da operação casada.

## Escopo / cuidados
- Sem refatorar arquitetura nem alterar regras fiscais (5118/5923, CFOP, GRL019) já existentes.
- `tipos_contrato` continua por cooperativa, sem mudanças.
- Mudanças comentadas nos pontos alterados.
- Testes: ajustar `resolve.test.ts` para cobrir modelo liberado vs. não liberado; rodar a suíte.

## Entregáveis
- Migração da tabela N:N + dados migrados.
- Modal em abas + grid atualizada.
- Geração filtrada por liberação.
- Resumo técnico das alterações.
