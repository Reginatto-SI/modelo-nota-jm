# Análise 1 — Refatoração da tela `/pesquisa`

## Diagnóstico do que existia antes

- A tela `/pesquisa` originalmente tinha uma busca simples para localizar contratos do GRL019 e acionar a geração do modelo.
- A primeira melhoria adicionou filtros avançados, filtros rápidos e colunas analíticas que ampliavam a tela além do fluxo real validado pela equipe JM.
- Como o sistema trabalha com apenas um GRL019 importado por vez, a pesquisa não precisa se comportar como uma consulta analítica ou ERP.
- O uso operacional confirmado é localizar rapidamente um contrato, normalmente por número do contrato, agricultor/produtor ou CPF/CNPJ, e gerar o modelo.
- A lógica de geração, parametrização e vínculo de contratos já está centralizada em `resolveContrato` e não deveria ser duplicada nem alterada pela tela.

## Alterações feitas

- Mantida a busca inteligente, mas simplificada para os campos realmente necessários no fluxo operacional:
  - contrato;
  - contrato vinculado;
  - agricultor / razão social;
  - CPF/CNPJ, inclusive por dígitos;
  - produto.
- Atualizado o placeholder para: `Pesquisar contrato, agricultor ou CPF/CNPJ...`.
- Removidos os filtros avançados criados anteriormente:
  - Cooperativa;
  - Produto;
  - CPF/CNPJ separado;
  - Tipo de faturamento;
  - Situação;
  - Modelo / CFOP;
  - botão `Limpar filtros`;
  - card avançado de filtros.
- Removidos os chips/filtros rápidos (`Todos`, `5118`, `5118 + 5923`, `5132`, `Pendências`).
- Simplificada a tabela para manter apenas as informações necessárias para gerar o modelo:
  - Contrato;
  - Agricultor / Razão Social;
  - Produto;
  - Modelo;
  - Ação.
- Removidas as colunas de Cooperativa, Situação, Tipo Faturamento e Vínculo.
- Preservadas as ações existentes:
  - `Gerar Modelo`;
  - `Ver recebimento` para expedições vinculadas;
  - modal de operação casada `5118 + 5923`.
- Revisada a performance da tela para evitar chamadas desnecessárias de `resolveContrato` durante a filtragem:
  - a busca filtra primeiro as linhas brutas do GRL019;
  - apenas os registros visíveis na tabela são resolvidos;
  - o resultado resolvido é reaproveitado no render da tabela.

## Arquivos modificados

- `src/pages/Pesquisa.tsx`
- `docs/Analises/analise-1-melhoria-tela-pesquisa.md`

## Critérios testados

- Busca por contrato: mantida no campo principal.
- Busca por contrato vinculado: mantida no campo principal.
- Busca por agricultor/produtor: mantida no campo principal.
- Busca por CPF/CNPJ: mantida no campo principal, com comparação por dígitos.
- Busca por produto: mantida no campo principal, mesmo sem filtro separado.
- Remoção de filtros avançados: card de filtros, selects e chips rápidos foram removidos da tela.
- Tabela simplificada: mantém somente colunas essenciais ao fluxo de geração.
- Geração de modelo: o botão `Gerar Modelo` continua usando `resolveContrato`, `buildNota` e navegação para `/preview`.
- Expedição vinculada: a ação `Ver recebimento` foi preservada.
- Estado sem GRL019 importado: preservado.
- Estado sem resultados: preservado com mensagem simples de nenhum contrato encontrado.

## Riscos ou pontos de atenção

- A coluna `Vínculo` foi removida para reduzir ruído visual, já que a ação `Ver recebimento` e o badge de modelo continuam orientando o usuário quando a linha for uma expedição vinculada.
- A tela continua limitada aos primeiros 50 resultados visíveis, mantendo o comportamento compacto anterior e incentivando o uso da busca principal.
- A busca por produto foi mantida, mas o placeholder prioriza contrato, agricultor e CPF/CNPJ porque são os principais caminhos operacionais informados pela equipe JM.
- Nenhuma regra de geração de nota, PDF, importação do GRL019 ou casamento de contratos foi alterada.

## Sugestões futuras

- Se a equipe identificar necessidade real de detalhar pendências, avaliar um detalhe sob demanda por linha em vez de recriar filtros analíticos.
- Se relatórios muito grandes dificultarem a busca, avaliar paginação simples mantendo a tela operacional e sem filtros avançados.
