# Formulários e filtros

## Sumário

- [Composição](#composição)
- [Input e busca](#input-e-busca)
- [Textarea](#textarea)
- [Select](#select)
- [Checkbox, radio e switch](#checkbox-radio-e-switch)
- [Filtros](#filtros)
- [Validação e ajuda](#validação-e-ajuda)

## Composição

Usar `grid grid-cols-1 gap-4 sm:grid-cols-2`; campos longos e textarea usam `sm:col-span-2`. Envolver campo comum em `space-y-1.5` (6px) e combinar `Label`, controle e ajuda. Label base: 14px medium, line-height none.

## Input e busca

Input real:

```txt
flex h-10 w-full rounded-md border border-input bg-background px-3 py-2
text-base md:text-sm ring-offset-background
placeholder:text-muted-foreground
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:cursor-not-allowed disabled:opacity-50
```

Arquivos seguem `file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground`.

Busca: wrapper `relative max-w-sm`; ícone Search `absolute left-3 top-2.5 h-4 w-4 text-muted-foreground`; Input com `pl-9`. Manter placeholder curto. Campos com outros ícones devem preservar a mesma geometria.

## Textarea

`flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm`, com os mesmos placeholder, focus e disabled do Input. Não redimensionar arbitrariamente; telas específicas podem aumentar altura conforme conteúdo.

## Select

- Trigger: 40px, full width, `rounded-md border border-input bg-background px-3 py-2 text-sm`, conteúdo distribuído; mesmo focus ring e disabled; texto em uma linha; chevron 16px a 50%.
- Content: z-50, máximo 24rem, mínimo 8rem, overflow oculto, radius md, borda, popover branco, `shadow-md`; viewport `p-1` e largura mínima igual ao trigger no modo popper.
- Item: `rounded-sm py-1.5 pl-8 pr-2 text-sm`; check 16px à esquerda; focus usa accent/accent-foreground; disabled 50%.
- Abrir/fechar: fade + zoom 95%; deslizar 8px conforme lado; offset 4px.

## Checkbox, radio e switch

- Checkbox: 16×16px, `rounded-sm border border-primary`; checked primary com foreground; check 16px; focus ring padrão; disabled 50%.
- Radio disponível: grupo `grid gap-2`; item circular 16×16px, border/text primary; indicador circular 10px. Não há uso de radio nas telas auditadas, portanto reutilizar o primitivo sem variação visual.
- Switch: trilho 44×24px, radius total, borda transparente 2px; checked primary, unchecked input; thumb 20×20px background com `shadow-lg`, translada 20px; transições de cor/transform; focus/disabled padrão.
- Linha de switch em formulário: `flex items-center justify-between rounded-md border p-3`, label à esquerda.

## Filtros

Filtro composto recorrente:

```txt
rounded-lg border bg-card p-4 shadow-card
grid gap-3 md:items-end
```

Dimensionar colunas conforme a função, mantendo densidade; referência usa `md:grid-cols-[minmax(220px,1.4fr)_minmax(180px,1fr)_minmax(160px,0.7fr)_auto]`. Cada filtro usa `space-y-1.5`; ação de limpar é Button outline. Em mobile, empilhar. Não criar barra visual diferente se essa composição servir.

## Validação e ajuda

- Ajuda/contexto: `text-xs text-muted-foreground`, logo abaixo do campo.
- A referência comunica muitas validações por toast e mantém o modal aberto para correção; preservar esse fluxo se compatível com o produto.
- Não há estilo global consolidado de mensagem inline de erro. Se necessária, usar `text-xs text-destructive` sem inventar fundo/borda e associar via ARIA.
- Campos obrigatórios são definidos pela regra funcional, não pela Skill. Não inferir obrigatoriedade.
