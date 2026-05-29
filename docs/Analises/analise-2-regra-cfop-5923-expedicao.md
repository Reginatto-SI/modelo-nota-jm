# Análise 2 — Regra do CFOP 5923 e EXPEDIÇÃO como vínculo

## 1. Diagnóstico da regra atual

Após a correção anterior, a resolução de modelo já estava centralizada em `resolveContrato`, usando cooperativa, código de contrato, `TP FATURAMENTO`, status ativo e modelo ativo da mesma cooperativa. Mesmo assim, uma linha de `EXPEDIÇÃO` ainda podia ser resolvida como linha principal quando houvesse parametrização ativa própria para `EXPEDIÇÃO` apontando para CFOP 5923.

Isso mantinha risco operacional: o usuário poderia ver uma linha de expedição na Pesquisa com badge `CFOP 5923` e botão `Gerar`, interpretando que deveria gerar uma nota diretamente por essa linha.

A regra funcional oficial nesta etapa é que o contrato de `RECEBIMENTO` é o principal. O CFOP 5923 é gerado apenas como parte da operação casada `5118 + 5923`, quando o recebimento estiver parametrizado com CFOP 5118 e `gera_operacao_casada = true`. A linha de `EXPEDIÇÃO` vinculada serve somente para localizar o armazém/destinatário final usado no modelo 5923.

## 2. Onde o sistema ainda permitia ou sugeria geração direta do 5923

- `src/lib/resolve.ts` resolvia o tipo de contrato com base na linha pesquisada. Quando a linha pesquisada era `EXPEDIÇÃO`, uma parametrização ativa de expedição com modelo CFOP 5923 podia preencher `res.cfop = "5923"`.
- `src/pages/Pesquisa.tsx` renderizava o badge a partir de `res.cfop`. Assim, uma expedição parametrizada diretamente como 5923 podia aparecer como `CFOP 5923`.
- A mesma tela exibia o botão `Gerar` para a linha de expedição, porque não havia um estado específico para indicar que aquela linha era apenas vínculo da operação casada.

## 3. Correção aplicada

- `resolveContrato` passou a identificar quando a linha pesquisada é `EXPEDIÇÃO` vinculada a uma linha de `RECEBIMENTO`.
- Para `EXPEDIÇÃO` vinculada, a parametrização principal passa a ser resolvida pela linha de `RECEBIMENTO`, não pela própria expedição.
- Foi adicionado o estado `expedicaoComoVinculo5923` para sinalizar que a linha deve ser exibida como vínculo, sem geração direta.
- Foi adicionado o campo `contratoRecebimentoVinculado` para permitir orientar o usuário e preencher a busca com o contrato principal.
- Foi adicionada sinalização de `parametrizacaoSuspeitaExpedicao5923` quando existir parametrização ativa de `EXPEDIÇÃO` apontando para CFOP 5923. O cadastro não é excluído automaticamente.
- A Pesquisa passou a exibir `Vínculo do 5923` para expedição usada como vínculo e troca o botão `Gerar` por `Ver recebimento`.
- Ao clicar em `Ver recebimento`, o sistema informa que a expedição é usada apenas para montar o 5923 e orienta a gerar pelo contrato de recebimento vinculado.
- A geração direta de expedição parametrizada como CFOP 5923 sem recebimento vinculado é bloqueada como parametrização suspeita.

## 4. Comportamento por tipo de linha

### RECEBIMENTO 5118

- Se não houver operação casada, a linha aparece como `CFOP 5118`.
- O botão `Gerar` permanece disponível.
- A geração segue o modelo principal 5118.

### RECEBIMENTO 5118 casado

- Se `gera_operacao_casada = true` e houver modelo 5923 ativo para a mesma cooperativa, a linha aparece como `CFOP 5118 + 5923`.
- O botão `Gerar` abre o diálogo com as opções:
  - `Gerar apenas 5118`;
  - `Gerar 5118 + 5923`;
  - `Cancelar`.
- A linha de expedição vinculada continua sendo usada apenas para localizar o armazém/destinatário do 5923.

### RECEBIMENTO 5132

- A linha aparece como `CFOP 5132`.
- O botão `Gerar` permanece disponível.
- Não há oferta de operação casada.

### EXPEDIÇÃO vinculada

- A expedição vinculada a recebimento com operação casada não aparece como `CFOP 5923` direto.
- A coluna Modelo mostra `Vínculo do 5923`.
- A coluna Ação mostra `Ver recebimento`.
- Ao clicar, o sistema orienta o usuário a gerar pelo contrato de recebimento vinculado e preenche a pesquisa com esse contrato.

### Parametrização inválida ou suspeita

- Duplicidade ativa por cooperativa, código de contrato e `TP FATURAMENTO` continua bloqueando a geração.
- Ausência de modelo ativo da mesma cooperativa continua bloqueando a geração com mensagem clara.
- EXPEDIÇÃO parametrizada diretamente para CFOP 5923 sem recebimento vinculado é bloqueada com a mensagem de parametrização suspeita.
- EXPEDIÇÃO vinculada que também possua cadastro direto para CFOP 5923 não é excluída automaticamente; a interface sinaliza a suspeita e orienta o uso pelo recebimento.

## 5. Checklist de teste manual

1. Importar o GRL019 modelo da COAFORTE.
2. Pesquisar contrato de RECEBIMENTO com operação casada.
3. Confirmar se aparece `CFOP 5118 + 5923`.
4. Clicar em `Gerar` e confirmar se abre opção 5118 ou 5118 + 5923.
5. Pesquisar contrato de EXPEDIÇÃO vinculado.
6. Confirmar se ele não aparece como geração direta normal de `CFOP 5923`.
7. Confirmar se o sistema orienta a gerar pelo contrato de RECEBIMENTO vinculado.
8. Confirmar se o PDF 5923 continua usando a linha de EXPEDIÇÃO apenas para localizar o armazém/destinatário.
9. Confirmar se duplicidades continuam bloqueadas.
10. Confirmar se erro de modelo ausente continua mostrando mensagem clara.
