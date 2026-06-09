# Análise 3 — PDFs individuais por modelo e padronização de nome do arquivo

## 1. Diagnóstico da geração atual de PDF

O fluxo atual de geração de modelos passa pela tela de pesquisa, monta uma lista de notas e envia essa lista para a prévia:

1. `src/pages/Pesquisa.tsx` resolve o contrato com `resolveContrato`.
2. Para cada CFOP solicitado, `Pesquisa.generate` chama `buildNota` e acumula os modelos em `notas`.
3. A prévia (`src/pages/Preview.tsx`) recebe `state.notas` e renderiza uma aba por modelo.
4. Ao clicar em **Gerar PDF**, a prévia chamava `generatePdf(notas, ...)` passando todas as notas de uma vez.
5. `src/lib/pdf.ts` desenha cada `Nota` no mesmo `jsPDF`, adicionando página para índices maiores que zero.

O problema operacional estava no passo 4: quando a operação casada 5118 + 5923 chegava à prévia com duas notas, as duas eram enviadas juntas para a mesma chamada de PDF, resultando em um único arquivo com múltiplas páginas/modelos.

## 2. Arquivos analisados

- `src/pages/Pesquisa.tsx`
  - Fluxo de pesquisa, escolha de geração simples ou casada e montagem do array `notas`.
- `src/pages/Preview.tsx`
  - Tela onde ocorre o clique final de download do PDF.
- `src/lib/pdf.ts`
  - Função `generatePdf`, desenho do DANFE orientativo e salvamento do arquivo.
- `src/lib/nota.ts`
  - Construção da estrutura `Nota`, variáveis usadas nos dados adicionais e dados disponíveis para nomeação.
- `src/lib/resolve.ts`
  - Representação da operação casada 5118 + 5923 e vínculo da expedição.
- `src/lib/nota.test.ts`
  - Cobertura unitária de `buildNota`, expandida para a nova regra de nome de arquivo.

## 3. Onde existia agrupamento/unificação

A unificação existia em dois pontos complementares:

- Na prévia, `src/pages/Preview.tsx` chamava `generatePdf(notas, fileName)` com todos os modelos selecionados.
- Em `src/lib/pdf.ts`, `generatePdf` percorre o array recebido e adiciona nova página no mesmo documento quando há mais de uma nota.

Essa lógica continua disponível para compatibilidade interna, mas a tela de prévia deixou de usá-la com múltiplos modelos no download operacional.

## 4. Regra implementada para geração individual

A correção mínima foi aplicada no clique **Gerar PDF** da prévia:

- A validação de placeholders e valores permanece igual.
- Depois da validação, a tela percorre `notas` com `forEach`.
- Para cada modelo, chama `generatePdf([nota], nomePadronizado)`.
- Assim, cada CFOP gera um documento `jsPDF` próprio, preservando o layout atual porque a mesma função de desenho (`generatePdf`/`drawNota`) continua sendo reutilizada.

Com isso:

- 5118 sozinho baixa 1 PDF.
- 5118 + 5923 baixa 2 PDFs separados.
- 5132 sozinho baixa 1 PDF.

## 5. Regra implementada para nome dos arquivos

Foi criada a função `buildNotaPdfFileName` em `src/lib/nota.ts`, usando dados vindos da mesma resolução que monta a prévia/modelo/PDF.

O padrão aplicado é:

```text
{cfop} - CONFIRMAÇÃO DE NEGÓCIO {contrato}-{contrato_vinculado} CONTRATO {contrato_cliente} - {produtor_nome}.pdf
```

Observações:

- O separador entre `contrato` e `contrato_vinculado` foi implementado como hífen (`-`), porque barra (`/`) é caractere inválido em nomes de arquivo no Windows e foi apontada como caractere a sanitizar.
- Para o 5923, a mesma função é usada; muda apenas o `cfop` da própria nota.
- O produtor vem de `nota.emitente.nome`, que já é a origem usada no PDF.
- Contrato, contrato vinculado e contrato cliente são armazenados em `nota.pdfFileNameMeta` no momento do `buildNota`, a partir de `ResolveResult.searchedRow`, evitando criar nova fonte paralela.

Exemplo gerado:

```text
5118 - CONFIRMAÇÃO DE NEGÓCIO 334-340 CONTRATO 4700025684 - ARIEL RIGHI.pdf
```

## 6. Tratamento de campos ausentes

A função de nome do arquivo limpa cada campo antes de montar o texto:

- `null` e `undefined` viram string vazia e não entram no nome.
- Se não houver contrato vinculado, a função usa apenas o contrato principal, sem barra ou hífen sobrando.
- Se não houver contrato cliente, o trecho `CONTRATO {contrato_cliente}` é omitido.
- Se não houver produtor, o nome não termina com separador estranho.
- Espaços duplicados são compactados.
- Caracteres inválidos para Windows/WhatsApp são substituídos/removidos:
  - `/`
  - `\`
  - `:`
  - `*`
  - `?`
  - `"`
  - `<`
  - `>`
  - `|`

## 7. Checklist de validação

- [x] Gerar apenas 5118 baixa um único PDF.
- [x] Gerar 5118 + 5923 baixa dois PDFs separados.
- [x] Gerar 5132 baixa um único PDF.
- [x] O nome do arquivo contém CFOP.
- [x] O nome do arquivo contém “CONFIRMAÇÃO DE NEGÓCIO”.
- [x] O nome do arquivo contém contrato/contrato vinculado quando existir.
- [x] O nome do arquivo contém contrato cliente quando existir.
- [x] O nome do arquivo contém nome do produtor.
- [x] O nome do arquivo não possui caracteres inválidos.
- [x] O layout/conteúdo do PDF não foi alterado; a geração visual continua usando `src/lib/pdf.ts` sem alteração de layout, cálculos ou regras fiscais.
