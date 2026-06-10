# Análise 5 — Tutorial de filtros do GRL019 na tela de importação

## 1. Diagnóstico

A tela `/importar` já concentrava o fluxo de seleção e leitura do arquivo Excel do relatório GRL019, com diagnóstico de falhas em modal e confirmação para substituir relatório existente. Porém, antes de selecionar o arquivo, não havia um ponto de ajuda visual mostrando quais filtros aplicar no sistema de origem para gerar o GRL019 corretamente.

A imagem de referência já existia em `public/GRL019_Tutorial.png`, então a correção necessária era apenas expor esse material na interface, sem criar rota, sem upload e sem alterar a lógica de importação, validação, IndexedDB ou pré-cadastro de armazéns.

## 2. Arquivos alterados

- `src/pages/Importar.tsx`
  - Inclusão do botão de tutorial na tela `/importar`.
  - Inclusão de modal responsivo reutilizando o componente `Dialog` já existente no projeto.
- `docs/Analises/analise-5-tutorial-filtros-grl019.md`
  - Registro da análise, decisões e checklist de validação.

## 3. Local do botão

O botão `Ver exemplo de filtros` foi posicionado próximo ao título `Importar GRL019`, no topo da tela `/importar`.

Em telas menores, o cabeçalho passa a empilhar o título e o botão, mantendo o botão com largura completa para facilitar o toque. Em telas maiores, o botão fica alinhado à direita do título.

## 4. Componente/modal utilizado

Foi reutilizado o componente de UI existente `Dialog`, com:

- `DialogTrigger` para abrir o modal pelo botão.
- `DialogContent` com `max-h-[90vh]`, `max-w-4xl` e `overflow-y-auto` para responsividade.
- `DialogHeader`, `DialogTitle` e `DialogDescription` para manter o padrão visual.
- `DialogFooter` e `DialogClose` para o botão de fechar.

## 5. Caminho da imagem

A imagem é consumida diretamente do diretório público pelo caminho:

```tsx
<img src="/GRL019_Tutorial.png" />
```

No código, também foi definido `alt` descritivo e classes responsivas para evitar estouro de layout:

- `w-full`
- `max-w-full`
- `max-h-[70vh]`
- `object-contain`

## 6. Checklist de validação

- [x] Botão aparece na tela `/importar`.
- [x] Botão abre modal.
- [x] Modal exibe o título `Exemplo de filtros do GRL019`.
- [x] Modal exibe a descrição solicitada.
- [x] Modal referencia a imagem `/GRL019_Tutorial.png`.
- [x] Imagem usa classes responsivas e não deve estourar o layout.
- [x] Modal possui botão `Fechar`.
- [x] Alteração não muda a função `handleFile`.
- [x] Alteração não muda `parseGrl019` nem validações do GRL019.
- [x] Alteração não muda IndexedDB.
- [x] Alteração não muda pré-cadastro de armazéns.
