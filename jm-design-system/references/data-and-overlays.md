# Dados, menus e overlays

## Sumário

- [Tabela e listagem](#tabela-e-listagem)
- [Ações de linha](#ações-de-linha)
- [Dropdown, tooltip e popover](#dropdown-tooltip-e-popover)
- [Dialog e alert dialog](#dialog-e-alert-dialog)
- [Tabs](#tabs)
- [Paginação](#paginação)

## Tabela e listagem

Envolver a tabela em `rounded-lg border bg-card shadow-card`. O primitivo adiciona wrapper `relative w-full overflow-auto` e tabela `w-full caption-bottom text-sm`.

- Header: cada row tem borda inferior.
- Head: `h-12 px-4 text-left align-middle font-medium text-muted-foreground`; célula com checkbox remove padding direito.
- Row: `border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted`; última row do body sem borda.
- Cell: `p-4 align-middle` e ajuste para checkbox.
- Footer disponível: borda superior, `bg-muted/50 font-medium`.
- Não há zebra. Não adicionar.
- Compacta: head `h-10 px-3 py-2`; row `h-12`; cell `px-3 py-2`; ação icon 32×32px.
- Coluna de ações alinhada à direita, largura típica 80/96/128px conforme quantidade; conteúdo `flex items-center justify-end gap-1 whitespace-nowrap`.
- Loading e vazio usam uma única cell central muted, conforme `components.md`.
- Filtros ficam acima da tabela, separados; busca possui `max-w-sm`.

## Ações de linha

Para poucas ações, usar buttons ghost icon (editar, duplicar, excluir). Para maior densidade, usar um button ghost de reticências (`MoreHorizontal`) e DropdownMenu alinhado ao fim. Incluir `aria-label`/tooltip ou `title` em ações somente com ícone. Excluir usa destructive no ícone/item e sempre abre confirmação.

## Dropdown, tooltip e popover

- Dropdown content: z-50, mínimo 8rem, radius md, borda, popover, `p-1 shadow-md`; fade/zoom/slide conforme lado.
- Dropdown item: radius sm, `px-2 py-1.5 text-sm`; focus accent; disabled 50%. Ícone 16px com margem direita 8px.
- Tooltip: offset 4px, radius md, borda, popover, `px-3 py-1.5 text-sm shadow-md`; fade/zoom e slide de 8px.
- Popover disponível: largura 288px (`w-72`), radius md, borda, popover, padding 16px, `shadow-md`, offset 4px e mesmas animações.
- A sidebar recolhida usa `title` nativo em vez do componente Tooltip. Preservar comportamento equivalente; não exigir tooltip customizado.

## Dialog e alert dialog

Composição base:

- Overlay: `fixed inset-0 z-50 bg-black/80`; fade ao abrir/fechar.
- Content: centralizado em 50%/50%, `z-50 grid w-full max-w-lg gap-4 border bg-background p-6 shadow-lg duration-200`; quadrado no mobile e `sm:rounded-lg`; fade + zoom 95% + slide em torno do centro.
- Larguras usadas conforme conteúdo: `sm:max-w-md`, `sm:max-w-2xl`, `sm:max-w-3xl` e `max-w-4xl`. Para formulários longos: `max-h-[90vh] overflow-y-auto` (um fluxo usa 88vh).
- Close: absoluto `right-4 top-4`, radius sm, opacidade 70%; hover 100%; focus ring; X 16px; disabled sem eventos.
- Header: coluna, gap 6px, central no mobile e à esquerda em `sm`.
- Título: 18px semibold, line-height none/tracking tight. Descrição: 14px muted.
- Footer: `flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2`.
- AlertDialog usa a mesma superfície/overlay; header tem gap 8px. Cancelar é outline e ganha `mt-2 sm:mt-0`; confirmar usa button default ou destructive por classe conforme risco.

Não fechar dialog de edição automaticamente após falha de validação. Não aumentar radius/sombra por preferência.

## Tabs

- List: 40px, `inline-flex items-center justify-center rounded-md bg-muted p-1 text-muted-foreground`; em dialogs, frequentemente `grid w-full` com quantidade exata de colunas.
- Trigger: radius sm, `px-3 py-1.5 text-sm font-medium`; active background, foreground e `shadow-sm`; transition-all; focus ring; disabled 50%.
- Content: margem superior 8px e focus ring. Formulários internos seguem grid responsiva.

## Paginação

Existe um primitivo shadcn, mas nenhuma tela auditada o usa. Se a listagem futura exigir paginação, reutilizá-lo em vez de criar outro:

- nav central full width; lista horizontal, alinhada ao centro, gap 4px.
- links reutilizam Button: ativo outline, inativo ghost, default icon 40×40px.
- anterior/próximo usam tamanho default, gap 4px, padding interno assimétrico de 10px; reticências 36×36px.

Localizar labels para português no produto de destino sem alterar geometria. Não declarar paginação como comportamento atual das tabelas do Modelo de Nota.
