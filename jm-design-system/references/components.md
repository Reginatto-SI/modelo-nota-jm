# Componentes, hierarquia e estados

## Sumário

- [Princípio](#princípio)
- [Botões](#botões)
- [Cards](#cards)
- [Badges](#badges)
- [Ícones](#ícones)
- [Estados e feedback](#estados-e-feedback)
- [Padrões disponíveis sem evidência de uso](#padrões-disponíveis-sem-evidência-de-uso)

## Princípio

Reutilizar primeiro os componentes shadcn existentes no destino. A referência usa `class-variance-authority`, `cn` (`clsx` + `tailwind-merge`), Radix e Lucide. Não duplicar componentes para mudar apenas classes.

## Botões

Base de todas as variantes:

```txt
inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md
text-sm font-medium ring-offset-background transition-colors
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
disabled:pointer-events-none disabled:opacity-50
[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0
```

| Variante | Classes reais | Uso |
|---|---|---|
| principal/default | `bg-primary text-primary-foreground hover:bg-primary/90` | ação principal/Novo/Salvar/Gerar |
| destrutiva | `bg-destructive text-destructive-foreground hover:bg-destructive/90` | confirmação destrutiva |
| outline | `border border-input bg-background hover:bg-accent hover:text-accent-foreground` | cancelar, voltar, ação secundária |
| secondary | `bg-secondary text-secondary-foreground hover:bg-secondary/80` | alternativa de baixa ênfase |
| ghost | `hover:bg-accent hover:text-accent-foreground` | ações de linha, navegação contextual |
| link | `text-primary underline-offset-4 hover:underline` | ação textual |

Tamanhos: default `h-10 px-4 py-2` (40px); pequeno `h-9 rounded-md px-3` (36px); grande `h-11 rounded-md px-8` (44px); icon `h-10 w-10` (40px). Em tabela compacta, o uso real reduz icon para `h-8 w-8`. Ícone usual 16px; quando seguido de texto, o código por vezes soma `mr-1`, embora a base já tenha gap.

Não existe estado `loading` embutido no componente. Ao implementar loading, preservar dimensões, substituir/adicionar Lucide spinner com rotação, desabilitar o botão e manter o label para evitar salto; não criar cor nova. O estado `active` não tem classe específica: não inventar tonalidade.

## Cards

Primitivo:

- Card: `rounded-lg border bg-card text-card-foreground shadow-sm`; nas páginas, aplicar `shadow-card`.
- Header: coluna, `space-y-1.5 p-6`.
- Title: `text-2xl font-semibold leading-none tracking-tight`, frequentemente `text-base` em cards operacionais.
- Description: `text-sm text-muted-foreground`.
- Content: `p-6 pt-0`.
- Footer: `flex items-center p-6 pt-0`.

Filtros e blocos densos usam superfície direta `rounded-lg border bg-card p-4 shadow-card`. Blocos informativos internos usam `rounded-md border bg-muted/30 p-3`. Hover de card só existe para cards clicáveis: `transition-colors hover:border-primary hover:text-primary`; não aplicar hover a superfícies estáticas.

## Badges

Base: `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors` com focus ring de 2px e offset 2px.

- default: primary, foreground claro, borda transparente; hover primary/80.
- secondary: secondary/secondary-foreground; hover secondary/80.
- destructive: destructive/destructive-foreground; hover destructive/80.
- outline: texto foreground.
- Status real de ativo no CRUD compartilhado: `variant="default"` e label `Ativo`.
- Status real de inativo: `variant="secondary"` e label `Inativo`.
- Tags técnicas usam secondary, `font-mono text-[11px]`.

## Ícones

Usar exclusivamente `lucide-react` quando já disponível. Padrão inline: 16×16; títulos/dialogs pontuais: 20px; cards de atalho: 24px; estados vazios: 40px; upload: 48px. Herdar cor do texto, usando `text-primary`, `text-muted-foreground`, `text-warning`, `text-success` ou `text-destructive` semanticamente. Ações destrutivas de linha são botão ghost com o ícone em destructive.

## Estados e feedback

- Loading de tabela: uma linha, célula com `colSpan`, `text-center text-muted-foreground`, texto `Carregando...`.
- Vazio de tabela: mesma composição, texto objetivo equivalente a `Nenhum registro.`.
- Empty state de página: `Card shadow-card`; conteúdo `flex flex-col items-center gap-3 py-12 text-center`; ícone semântico 40px, título `font-medium`, apoio muted.
- Loading visual genérico disponível: `animate-pulse rounded-md bg-muted` (Skeleton). Usar somente quando skeleton representar melhor a forma; a tabela real usa texto.
- Erros/avisos contextuais reais: `rounded-md border border-destructive/40 bg-destructive/10 p-3` ou equivalente warning; título semibold na cor semântica e explicação muted.
- Toasts Sonner: fundo background, texto foreground, border, `shadow-lg`; descrição muted; ação primary e cancelamento muted.
- Toast Radix: `rounded-md border p-6 pr-8 shadow-lg`; default background/foreground ou destructive; viewport full-width no topo mobile e até 420px no canto inferior direito a partir de `sm`.
- Disabled: bloquear ponteiro quando aplicável, opacidade 50%; inputs também mostram cursor não permitido.
- Focus: ring semântico de 2px e offset 2px em controles interativos.

## Padrões disponíveis sem evidência de uso

`Alert`, `Skeleton` e `Pagination` existem como primitivos na base, mas não aparecem nas páginas principais auditadas. Podem ser reutilizados com os tokens existentes quando a função exigir; não alegar que sua composição é um padrão recorrente. Não há componente dedicado chamado `PageHeader`, `FilterBar`, `EmptyState` ou `LoadingState`; as composições acima são os padrões efetivamente repetidos.
