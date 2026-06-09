# Análise 1 — Cadastros de Armazéns/Destinatários com pré-cadastro a partir do GRL019

## 1. Diagnóstico do funcionamento atual

- Não há diretórios `public/PRD` nem `docs/PRD` disponíveis no repositório neste ambiente. A validação foi feita contra os documentos técnicos existentes em `docs/Analises`, especialmente as análises anteriores de amarração dos modelos e da regra CFOP 5923.
- A rota `/cadastros/armazens` já existe e usa o componente genérico `CrudPage`, dentro do `Layout` padrão da aplicação.
- Antes do ajuste, a tela funcionava essencialmente como CRUD manual de armazéns/destinatários, com campos fiscais/endereço básicos e sem indicador de origem ou pendência.
- A tabela `armazens` armazenava razão social, CPF/CNPJ, I.E., endereço, bairro, CEP, município, UF, telefone, tipo e status ativo.
- A importação do GRL019 salvava o relatório completo apenas no IndexedDB do navegador via `ReportContext`, sem persistir o arquivo completo no banco.
- O parser do GRL019 já reconhecia os campos úteis para destinatário: `NOME/RAZÃO SOCIAL`, `CPF/CNPJ`, `I.E.`, `ENDEREÇO`, `MUNICÍPIO` e `ESTADO`.
- O modelo 5923 já possuía fallback para usar dados da linha de expedição quando o armazém não existia no cadastro, porém a resolução ainda tentava localizar armazém também por razão social. Isso contrariava a regra desejada de nunca usar razão social como chave principal.
- A geração não bloqueava exclusivamente por falta de cadastro do armazém; ela podia seguir com warnings e usar dados do GRL019, desde que os demais dados essenciais do fluxo estivessem resolvidos.

## 2. Arquivos analisados

- `src/App.tsx`
- `src/context/ReportContext.tsx`
- `src/pages/Importar.tsx`
- `src/pages/Pesquisa.tsx`
- `src/pages/Preview.tsx`
- `src/pages/cadastros/Armazens.tsx`
- `src/components/cadastro/CrudPage.tsx`
- `src/lib/db.ts`
- `src/lib/grl019.ts`
- `src/lib/resolve.ts`
- `src/lib/nota.ts`
- `src/lib/types.ts`
- `src/integrations/supabase/types.ts`
- `supabase/migrations/20260529175423_e3866971-4f54-47a2-b95e-e7de21e3c77a.sql`
- `supabase/migrations/20260608120000_add_tipo_frete_padrao_modelos_nota.sql`
- `docs/Analises/analise-1-amarracao-modelos-nota.md`
- `docs/Analises/analise-2-regra-cfop-5923-expedicao.md`
- `docs/Analises/analise-3-layout-pdf-danfe-orientativo.md`
- `public/GRL019 Modelo - Cooperativa COAFORTE.xlsx`

## 3. Como o GRL019 é importado hoje

1. A tela `src/pages/Importar.tsx` recebe arquivo `.xlsx/.xls`.
2. O parser `parseGrl019`, em `src/lib/grl019.ts`, lê a primeira aba, detecta o cabeçalho e normaliza as linhas para `Grl019Report`.
3. O relatório completo é persistido pelo `ReportContext` em IndexedDB, usando `src/lib/idb.ts`.
4. A tela informa explicitamente que o relatório fica apenas no navegador e não é enviado integralmente ao banco.
5. A massa real `public/GRL019 Modelo - Cooperativa COAFORTE.xlsx` foi inspecionada diretamente como arquivo XLSX: o cabeçalho está na linha 6, há colunas de destinatário/endereço/I.E. e foram identificadas 1.515 linhas de `EXPEDIÇÃO`, 1.468 linhas de `RECEBIMENTO` e 75 CPF/CNPJ únicos nas linhas de expedição.

## 4. Como os armazéns são cadastrados hoje

- A tabela `public.armazens` é criada na migration inicial com RLS habilitado e política aberta já existente no projeto.
- O CRUD usa os hooks `useArmazens`, `useSaveArmazem` e `useDeleteArmazem`, todos baseados no helper genérico de Supabase em `src/lib/db.ts`.
- Antes deste ajuste, não havia campo de origem do cadastro nem cálculo visual de completude.
- O cadastro manual continua usando o mesmo CRUD e agora cria registros com `origem_cadastro = manual` por padrão.

## 5. Como o modelo 5923 busca o destinatário hoje

- A geração começa em `src/pages/Pesquisa.tsx`, chamando `resolveContrato(report, row, cad)`.
- A resolução identifica par recebimento/expedição com `findVinculado`.
- Para operação casada 5118 + 5923, a linha de expedição vinculada alimenta o destinatário do 5923.
- Após o ajuste, o armazém/destinatário é buscado somente por CPF/CNPJ normalizado da expedição, comparando apenas números.
- Se houver cadastro global ativo, `buildNota` usa os dados do cadastro.
- Se não houver cadastro, `buildNota` usa os dados disponíveis diretamente na linha de expedição do GRL019 e a prévia recebe o alerta não bloqueante: `Destinatário não encontrado no cadastro. Dados utilizados diretamente do GRL019.`

## 6. Riscos encontrados

- Não existe índice único físico para CPF/CNPJ normalizado em `armazens`. Criar esse índice agora poderia falhar em bases que já tenham duplicidades manuais históricas, então o ajuste mínimo ficou na deduplicação lógica durante a importação.
- O campo `tipo` é `NOT NULL` e não há enum formal. Como o GRL019 não permite inferir tipo com segurança, novos pré-cadastros entram como `outro` para sinalizar pendência operacional, sem criar arquitetura paralela.
- A importação automática depende da migration `origem_cadastro` estar aplicada. Sem essa coluna no banco, a sincronização do pré-cadastro pode falhar, mas o GRL019 ainda será importado no IndexedDB e a tela exibirá toast de erro específico.
- O ambiente não tinha dependências instaladas e o `npm install` falhou por `403 Forbidden` ao buscar `@supabase/supabase-js`; portanto testes automatizados não puderam ser executados localmente.

## 7. Proposta de ajuste mínimo aplicada

1. Adicionar `origem_cadastro` à tabela `armazens`, com padrão `manual`.
2. Ao salvar um GRL019 importado, percorrer as linhas de `EXPEDIÇÃO` e montar candidatos de armazém/destinatário por CPF/CNPJ normalizado.
3. Para cada CPF/CNPJ:
   - criar registro quando não existir;
   - não duplicar quando já existir;
   - atualizar apenas campos vazios no cadastro existente;
   - nunca sobrescrever dado já preenchido manualmente.
4. Manter o GRL019 completo somente no IndexedDB; persistir no banco apenas o cadastro resumido de armazéns/destinatários.
5. Remover a busca de destinatário por razão social na resolução do 5923.
6. Melhorar a grid de `/cadastros/armazens` com origem, situação dos dados e município/UF.
7. Calcular visualmente `Completo` vs. `Dados pendentes` sem criar coluna física `dados_completos`.

## 8. Campos que já existem

Na tabela `armazens` já existiam:

- `id`
- `razao_social`
- `cnpj_cpf`
- `inscricao_estadual`
- `endereco`
- `bairro`
- `cep`
- `municipio`
- `uf`
- `telefone`
- `tipo`
- `ativo`
- `created_at`
- `updated_at`

## 9. Campos criados ou avaliados

### Criado

- `origem_cadastro text not null default 'manual'`
  - Valores usados no ajuste: `manual` e `grl019`.
  - Justificativa: baixo impacto, ajuda a tela a comunicar que o registro veio de pré-cadastro automático.

### Não criado

- `dados_completos`
  - Não foi criado fisicamente. A tela calcula a situação visual com base nos campos preenchidos.
- `ultima_importacao_grl019_em`
  - Não foi criado porque não havia padrão semelhante no projeto e não era necessário para a correção mínima.
- CPF/CNPJ normalizado físico ou índice único funcional
  - Não foi criado para evitar risco de migration quebrar em bases com duplicidades anteriores. A regra foi aplicada na sincronização e na busca.

## 10. Checklist de validação

- [x] Importação do GRL019 continua salvando o relatório completo apenas no IndexedDB.
- [x] Nenhum GRL019 completo é salvo no banco.
- [x] Pré-cadastro automático considera somente linhas de `EXPEDIÇÃO` com CPF/CNPJ.
- [x] CPF/CNPJ é normalizado removendo caracteres não numéricos antes da comparação.
- [x] Cadastros existentes não são duplicados por CPF/CNPJ normalizado durante a importação.
- [x] Campos preenchidos manualmente não são sobrescritos pela importação.
- [x] Cadastro manual continua usando o mesmo CRUD e origem `manual` por padrão.
- [x] Modelo 5923 busca destinatário por CPF/CNPJ da expedição.
- [x] Modelo 5923 usa fallback do GRL019 quando não há cadastro global.
- [x] Tela `/cadastros/armazens` permanece no padrão visual do CRUD existente.
- [x] Não houve criação de fluxo paralelo de importação.

## 11. Dúvidas ou decisões pendentes

- Confirmar com a área de negócio se o pré-cadastro vindo do GRL019 deve sempre entrar com `tipo = outro` ou se há regra segura para inferir `armazem`, `industria` ou `destinatario_final`.
- Avaliar futuramente, após saneamento da base, a criação de coluna/índice para CPF/CNPJ normalizado, garantindo unicidade também no banco.
- Confirmar se `bairro`, `CEP` e `telefone` devem ser obrigatórios para considerar o cadastro como completo ou apenas desejáveis para complemento manual.
