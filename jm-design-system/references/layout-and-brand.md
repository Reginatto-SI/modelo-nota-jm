# Marca, shell e páginas

## Sumário

- [Marca JM](#marca-jm)
- [Shell desktop](#shell-desktop)
- [Sidebar expandida](#sidebar-expandida)
- [Sidebar recolhida](#sidebar-recolhida)
- [Mobile](#mobile)
- [Estrutura de página](#estrutura-de-página)
- [Responsividade](#responsividade)

## Marca JM

A marca é um monograma construído em HTML, não um arquivo de imagem. Não gerar SVG, imagem ou outra interpretação.

```tsx
<div style={{
  width: size, height: size,
  borderRadius: size * 0.22,
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border) / 0.85)",
  display: "flex", alignItems: "center", justifyContent: "center",
  boxShadow: "0 1px 2px hsl(214 40% 20% / 0.08), 0 4px 10px hsl(214 40% 20% / 0.05)",
}} aria-label="Logo JM">
  <span style={{
    color: "hsl(var(--primary))", fontWeight: 700,
    fontSize: size * 0.42, letterSpacing: "-0.02em",
    fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    lineHeight: 1,
  }}>JM</span>
</div>
```

Tamanhos reais: 42px na sidebar expandida, 36px na recolhida, 32px no header mobile e 52px no cartão de apresentação da home. O radius é sempre 22% do tamanho. Preservar quadrado branco, borda a 85%, sombra em duas camadas e letras azuis.

No shell, posicionar o monograma junto do nome específico da aplicação e da linha `JM Assessoria`. O nome da aplicação pode mudar; a apresentação visual não.

## Shell desktop

- Raiz: `flex min-h-screen bg-background`.
- Sidebar fixa no fluxo, `hidden ... md:flex`; conteúdo principal `flex-1 overflow-x-hidden`.
- Conteúdo: `mx-auto max-w-6xl animate-fade-in p-4 md:p-8`.
- Persistir a preferência recolhida em armazenamento local quando apropriado ao projeto.
- Ícones: `lucide-react`, traço padrão, normalmente 16px (`h-4 w-4`). Não misturar famílias de ícones.

## Sidebar expandida

- Largura `w-64` = 256px; `shrink-0`, coluna, posição relativa.
- Fundo `bg-sidebar`; padding externo `p-4` = 16px.
- Transição exclusiva de largura em 200ms.
- Cabeçalho: margem inferior 24px; logo/nome e botão de recolher em uma linha, alinhados ao início, gap 12px.
- Nome: branco, 16px semibold, line-height apertado e tracking apertado. Organização: 12px, branco/70.
- Toggle: ghost icon de 32×32px; branco/70; hover fundo branco/10 e texto branco; fica à direita com `ml-auto`.
- Navegação: coluna com gap 4px.
- Item: `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors`; ícone 16×16 não encolhe; label trunca.
- Item inativo: `text-white/75`; hover `bg-white/10 text-white`.
- Item ativo: `bg-white/[0.12] text-white shadow-sm ring-1 ring-white/10`.
- Título de grupo: `mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-white/55`.
- Área inferior: `mt-auto space-y-3 px-3 pt-6`. Ações discretas usam ghost, texto 12px branco/65 e mesmo hover da navegação. Texto auxiliar usa branco/55 em 12px.

## Sidebar recolhida

- Largura `w-20` = 80px; manter padding externo de 16px.
- Cabeçalho vira coluna centralizada com gap 12px; logo passa a 36px e textos somem.
- Toggle permanece 32×32px e centralizado; ícone muda para ação de expandir.
- Itens: `justify-center px-0 py-2.5`, sem label; manter `title` e `aria-label` com o nome.
- Ocultar títulos de grupo; aplicar `mt-6` ao próximo grupo.
- Rodapé sem padding horizontal; ação centralizada, sem texto, com `title`; ocultar texto auxiliar.
- Não reduzir ícones nem mudar os estados ativo/hover.

## Mobile

A referência não implementa drawer/sidebar mobile. Abaixo de 768px, ocultar a sidebar e mostrar header:

- `flex items-center gap-3 border-b bg-card px-4 py-3`.
- Logo 32px; nome em semibold com truncamento; organização 12px em muted.
- Ação contextual ghost pequena à direita (`ml-auto text-xs`).
- Conteúdo com padding 16px.

Não inventar menu hambúrguer como se fosse padrão oficial. Se um novo produto exigir navegação mobile completa, preservar tokens e composição da sidebar num `Sheet` shadcn, documentando que isso é adaptação funcional, não evidência do sistema original.

## Estrutura de página

- Wrapper recorrente: `space-y-6` (24px vertical).
- Page header: `flex flex-wrap items-start justify-between gap-3`; título/descrição à esquerda e ação primária à direita.
- Título: `text-2xl font-bold text-foreground`; descrição: `text-sm text-muted-foreground`.
- Cards: branco, borda, radius lg e `shadow-card`; padding interno usual 24px pelo primitivo, ou 16px (`p-4`) para filtros/dados densos.
- Card de destaque da home: `rounded-xl border bg-card p-5 shadow-card sm:p-6`, logo 52px e conteúdo em linha.
- Grades recorrentes começam em uma coluna e passam a duas em `md`; formulários passam a duas em `sm`.
- Não há breadcrumb aplicado nas telas de referência. Não adicionar por estética.

## Responsividade

- Empilhar ações e cabeçalhos por padrão; alinhar em linha a partir de `sm` quando houver espaço.
- Formulários: `grid-cols-1 gap-4 sm:grid-cols-2`; campos longos ocupam `sm:col-span-2`.
- Tabelas mantêm largura integral dentro de wrapper com `overflow-auto`; não converter automaticamente em cards.
- Dialog footer: coluna reversa no mobile; linha, alinhada ao fim e gap horizontal no `sm`.
- Respeitar truncamento (`min-w-0`, `truncate`) em marca e valores potencialmente longos.
