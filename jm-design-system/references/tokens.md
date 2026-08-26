# Tokens oficiais

## Sumário

- [Uso](#uso)
- [CSS canônico](#css-canônico)
- [Configuração Tailwind canônica](#configuração-tailwind-canônica)
- [Mapeamento semântico](#mapeamento-semântico)
- [Tipografia](#tipografia)
- [Geometria, sombras e movimento](#geometria-sombras-e-movimento)
- [Breakpoints e escala Tailwind](#breakpoints-e-escala-tailwind)

## Uso

Tratar esta etapa como bootstrap obrigatório, inclusive em um projeto Lovable vazio. Auditar primeiro o CSS global e a configuração Tailwind do destino. Reutilizar definições equivalentes somente quando nomes, valores e comportamento forem compatíveis; criar ou corrigir toda definição oficial ausente/divergente com os trechos canônicos abaixo. Não aproximar valores nem criar aliases ou variantes concorrentes.

Todas as cores consolidadas na referência são HSL sem a função `hsl()`. Consumir com `hsl(var(--token))`. Opacidades como `/90`, `/50` e `/10` são modificadores Tailwind sobre o token.

## CSS canônico

```css
:root {
  --background: 210 30% 97%;
  --foreground: 215 35% 16%;
  --card: 0 0% 100%;
  --card-foreground: 215 35% 16%;
  --popover: 0 0% 100%;
  --popover-foreground: 215 35% 16%;
  --primary: 214 70% 22%;
  --primary-foreground: 210 40% 98%;
  --primary-glow: 212 72% 38%;
  --secondary: 210 28% 92%;
  --secondary-foreground: 214 60% 24%;
  --muted: 210 25% 94%;
  --muted-foreground: 215 16% 46%;
  --accent: 205 80% 42%;
  --accent-foreground: 210 40% 98%;
  --success: 145 55% 38%;
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 48%;
  --warning-foreground: 30 40% 14%;
  --destructive: 0 72% 48%;
  --destructive-foreground: 210 40% 98%;
  --border: 214 20% 86%;
  --input: 214 20% 86%;
  --ring: 214 70% 22%;
  --radius: 0.6rem;
  --gradient-primary: linear-gradient(135deg, hsl(214 70% 20%), hsl(212 72% 34%));
  --gradient-header: linear-gradient(120deg, hsl(214 72% 18%), hsl(213 68% 28%));
  --shadow-card: 0 1px 3px hsl(214 40% 20% / 0.08), 0 4px 16px hsl(214 40% 20% / 0.06);
  --shadow-elevated: 0 10px 30px -10px hsl(214 60% 20% / 0.25);
  --sidebar-background: 214 72% 17%;
  --sidebar-foreground: 210 30% 88%;
  --sidebar-primary: 205 85% 50%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 214 50% 24%;
  --sidebar-accent-foreground: 210 40% 98%;
  --sidebar-border: 214 45% 26%;
  --sidebar-ring: 205 85% 50%;
}

@layer base {
  * { @apply border-border; }
  body {
    @apply bg-background text-foreground;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
}
```

## Configuração Tailwind canônica

Mesclar estas entradas em `theme.extend` do projeto. Se não existirem, criá-las exatamente; se já forem idênticas, reutilizá-las. Preservar as demais extensões funcionais do projeto de destino.

```ts
extend: {
  fontFamily: {
    sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
  },
  colors: {
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))", glow: "hsl(var(--primary-glow))" },
    secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
    destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
    success: { DEFAULT: "hsl(var(--success))", foreground: "hsl(var(--success-foreground))" },
    warning: { DEFAULT: "hsl(var(--warning))", foreground: "hsl(var(--warning-foreground))" },
    muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
    accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
    popover: { DEFAULT: "hsl(var(--popover))", foreground: "hsl(var(--popover-foreground))" },
    card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
    sidebar: {
      DEFAULT: "hsl(var(--sidebar-background))",
      foreground: "hsl(var(--sidebar-foreground))",
      primary: "hsl(var(--sidebar-primary))",
      "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
      accent: "hsl(var(--sidebar-accent))",
      "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
      border: "hsl(var(--sidebar-border))",
      ring: "hsl(var(--sidebar-ring))",
    },
  },
  backgroundImage: {
    "gradient-primary": "var(--gradient-primary)",
    "gradient-header": "var(--gradient-header)",
  },
  boxShadow: {
    card: "var(--shadow-card)",
    elevated: "var(--shadow-elevated)",
  },
  borderRadius: {
    lg: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    sm: "calc(var(--radius) - 4px)",
  },
  keyframes: {
    "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
    "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
    "fade-in": {
      from: { opacity: "0", transform: "translateY(6px)" },
      to: { opacity: "1", transform: "translateY(0)" },
    },
  },
  animation: {
    "accordion-down": "accordion-down 0.2s ease-out",
    "accordion-up": "accordion-up 0.2s ease-out",
    "fade-in": "fade-in 0.3s ease-out",
  },
}
```

Garantir que o mecanismo de scan/content do Tailwind inclua todos os arquivos React que usam essas classes. Manter `tailwindcss-animate` quando os componentes shadcn/Radix documentados dependerem das utilities `animate-in`, `fade-in-*`, `zoom-in-*` e `slide-in-*`; em projetos Lovable que já o tragam, apenas reutilizar o plugin. As definições próprias indispensáveis à identidade são `shadow-card`, `shadow-elevated`, `rounded-lg/md/sm` baseados em `--radius`, `animate-fade-in`, cores e família `sidebar.*` acima.

## Mapeamento semântico

| Papel | Valor/padrão real |
|---|---|
| Fundo da aplicação | `background` = `210 30% 97%` |
| Superfície/card/popover | branco `0 0% 100%` |
| Texto principal | `foreground` = `215 35% 16%` |
| Texto secundário | `muted-foreground` = `215 16% 46%` |
| Ação principal | `primary` = `214 70% 22%`; hover real `primary/90` |
| Ação destrutiva | `destructive` = `0 72% 48%`; hover `destructive/90` |
| Sucesso | `success` = `145 55% 38%` |
| Aviso | `warning` = `38 92% 48%` |
| Bordas/campos | `border` e `input` = `214 20% 86%` |
| Focus ring | `ring` = `214 70% 22%` |
| Sidebar | `sidebar-background` = `214 72% 17%` |
| Navegação inativa | branco a 75%; hover branco a 10% + texto branco |
| Navegação ativa | fundo branco a 12%, texto branco, ring branco a 10%, `shadow-sm` |

Não há token separado de `primary-active`; não inventar. Conservar o comportamento nativo do elemento no clique. Os gradientes existem na configuração, mas não são usados pelo shell principal atual; não promovê-los a padrão obrigatório.

## Tipografia

- Família global e da marca: `system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.
- Corpo: cor `foreground`; tamanho herdado do navegador (`1rem`) até uma classe especificar outro valor.
- Título de página recorrente: `text-2xl font-bold` (24px/32px, peso 700). O título do cartão de boas-vindas usa `font-semibold tracking-tight`.
- Título de dialog: `text-lg font-semibold leading-none tracking-tight` (18px, peso 600).
- `CardTitle` base: `text-2xl font-semibold leading-none tracking-tight`; uso recorrente nos cards compactos sobrescreve para `text-base` (16px).
- Texto normal denso, tabelas, botões, labels e descrições: `text-sm` (14px/20px).
- Label: `text-sm font-medium leading-none`.
- Ajuda, metadados, badge e grupos da sidebar: `text-xs` (12px/16px); grupos usam `font-semibold uppercase tracking-wider`.
- Placeholder: `text-muted-foreground`.
- Cabeçalho de tabela: `text-sm font-medium text-muted-foreground`.
- Badge: `text-xs font-semibold`.
- Marca expandida: nome do sistema `text-base font-semibold leading-tight tracking-tight`; organização `text-xs text-white/70`.

## Geometria, sombras e movimento

- Radius raiz: `0.6rem` (9.6px); `rounded-lg` = 9.6px, `rounded-md` = 7.6px, `rounded-sm` = 5.6px.
- Cards padrão: `rounded-lg border bg-card`; `shadow-card` é a sombra recorrente de superfícies de página. O primitivo `Card` isolado possui `shadow-sm`, normalmente sobrescrito/adicionado por `shadow-card` no uso.
- Superfície elevada: usar `shadow-elevated` somente quando o contexto já justificar elevação; dialogs usam `shadow-lg` do Tailwind, não esse token.
- Transição comum: `transition-colors` (Tailwind, 150ms). Sidebar: `transition-[width] duration-200`.
- Entrada de página: de `opacity: 0; transform: translateY(6px)` para opacidade/posição finais em `0.3s ease-out`.
- Accordion: abrir/fechar em `0.2s ease-out` usando a altura Radix.
- Overlays e menus usam animações do `tailwindcss-animate` documentadas nas referências específicas.

## Breakpoints e escala Tailwind

- Breakpoints usados: `sm` 640px, `md` 768px, `lg` 1024px; container configurado também com `2xl` 1400px.
- Conteúdo do shell usa `max-w-6xl` (72rem/1152px), não o container configurado.
- Espaçamento segue a escala Tailwind padrão: 1 = 4px, 1.5 = 6px, 2 = 8px, 3 = 12px, 4 = 16px, 5 = 20px, 6 = 24px, 8 = 32px, 10 = 40px, 12 = 48px.
