# Correção das variáveis de armazém/destinatário nos Dados Adicionais

## Diagnóstico

As variáveis `{{armazem_*}}` aparecem cruas no PDF por três causas combinadas:

1. **`buildVars` em `src/lib/nota.ts` está incompleta.** O dicionário de variáveis inclui apenas `armazem_nome`, `armazem_cnpj` e `armazem_ie`. **Faltam** `armazem_endereco`, `armazem_municipio` e `armazem_uf` — por isso essas três aparecem literalmente como `{{armazem_endereco}}` etc. (exatamente o que mostra a imagem do PDF).

2. **`renderTemplate` devolve a variável crua quando não encontra a chave.** Hoje, se a chave não existir no dicionário, retorna `{{chave}}`. Isso faz qualquer variável não mapeada vazar para o PDF.

3. **`resolveContrato` em `src/lib/resolve.ts` só localiza o armazém quando há operação casada** (`ofereceCasada && expedicaoRow`). Em modelos 5132 (e 5118 sem casada), o `r.armazem` fica indefinido e todas as variáveis de armazém ficam vazias/cruas, mesmo havendo contrato vinculado de EXPEDIÇÃO no GRL019.

A prévia e o PDF já usam o mesmo texto: `buildNota` renderiza `dadosAdicionais` uma vez e o PDF apenas imprime `nota.dadosAdicionais`. Logo, corrigindo a renderização, prévia e PDF ficam idênticos automaticamente.

## Como o vínculo armazém×agricultor funciona (confirmado no código)

- Coluna `TP FATURAMENTO`: `RECEBIMENTO` = linha do agricultor (emitente); `EXPEDIÇÃO` = linha com os dados do armazém.
- `CONTRATO VINCULADO` liga as duas linhas (`findVinculado`).
- O armazém cadastrado em `/cadastros/armazens-destinatarios` é localizado pelo **CPF/CNPJ da linha de EXPEDIÇÃO**, com fallback por **NOME/RAZÃO SOCIAL** (já existente).

## Alterações (mínimas e seguras)

### 1. `src/lib/resolve.ts` — resolver armazém sempre que houver expedição
- Hoje o bloco que localiza `armazem` está dentro de `if (ofereceCasada && expedicaoRow)`. Alterar a condição para localizar o armazém **sempre que existir `expedicaoRow`** (linha de expedição vinculada), independente de operação casada.
- Manter a lógica atual de busca: primeiro por CPF/CNPJ, depois por nome (com `armazemPorNome = true` e o warning de validação já existente).
- Manter os warnings atuais; eles continuam só como aviso, sem bloquear a geração.
- Não alterar `podeGerar` nem o fluxo de 5923/operação casada.

### 2. `src/lib/nota.ts` — completar `buildVars` e usar dados de expedição como fallback
- Adicionar ao dicionário de variáveis:
  - `armazem_endereco`
  - `armazem_municipio`
  - `armazem_uf`
- Para nome, CNPJ e IE: usar o cadastro do armazém quando existir e, **se ausente, cair para os dados da linha de EXPEDIÇÃO do GRL019** (`r.expedicaoRow.nomeRazaoSocial`, `.cpfCnpj`, `.ie`). Endereço/município/UF vêm preferencialmente do cadastro (`r.armazem`), com fallback para a expedição quando o cadastro não tiver.
- Cada variável de armazém resolve para `####` quando não houver nenhum dado disponível (nem cadastro nem GRL019), em vez de string vazia.

### 3. `src/lib/nota.ts` — `renderTemplate` não deixar variável crua
- Quando a chave não existir no dicionário, substituir por `####` (placeholder claro para revisão manual) em vez de devolver `{{chave}}`.
- Resultado: nenhum `{{...}}` cru chega à prévia ou ao PDF.

### 4. Variáveis de contrato (informativas) — garantir preenchimento
- `buildVars` já expõe `contrato` e `contrato_vinculado`. Confirmar que ambos saem corretos a partir da linha pesquisada (recebimento). Esses campos representam o "casamento" agricultor×armazém citado pelo usuário. Não será criada coluna nova de "CONTRATO CLIENTE" (essa coluna não é importada hoje); caso o template use `{{contrato_cliente}}`, ela cairá no placeholder `####` pela regra do item 3.

## O que NÃO será alterado
- Layout/estrutura de geração do PDF (`pdf.ts`) — sem refatoração.
- Nenhuma tela nova; reutiliza `/cadastros/armazens-destinatarios` e os modelos atuais.
- Fluxo de operação casada 5118 + 5923 permanece igual.

## Critérios de aceite atendidos
- `{{armazem_nome}}` e demais variáveis de armazém são substituídas na prévia e no PDF.
- Nenhuma variável crua `{{...}}` aparece no PDF.
- Com armazém cadastrado, endereço/município/UF saem preenchidos.
- Dado ausente vira `####`.
- Funciona em 5118, 5132 e 5923 quando houver armazém/destinatário vinculado.
- Prévia e PDF mostram exatamente o mesmo texto.

## Verificação
- Atualizar/observar os testes existentes (`src/lib/nota.test.ts`, `src/lib/resolve.test.ts`) e rodar `bunx vitest run` para garantir que a resolução do armazém e a renderização do template estão corretas.
