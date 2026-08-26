# Validação de fidelidade

## Procedimento obrigatório

Antes de concluir qualquer interface JM:

1. Comparar tokens com `tokens.md`; rejeitar cores literais não documentadas, salvo conteúdo semântico já existente no produto.
2. Confirmar reutilização de componentes equivalentes no projeto de destino.
3. Comparar shell e marca em desktop expandido, desktop recolhido e mobile.
4. Verificar teclado, focus visible, labels/ARIA, disabled e overflow.
5. Verificar densidade: padding de página 16/32px, cards 16/24px, campos 40px, tabelas default/compacta.
6. Confirmar que nenhuma regra de negócio foi alterada.

## Checklist visual

- [ ] Monograma JM textual, quadrado branco, azul primary, proporções e sombra exatas
- [ ] Sidebar 256px expandida e 80px recolhida
- [ ] Estados ativo, inativo e hover da navegação
- [ ] Labels ocultos e identificação acessível no modo recolhido
- [ ] Header mobile abaixo de 768px; sem drawer inventado
- [ ] Fundo `210 30% 97%`, superfícies brancas e texto `215 35% 16%`
- [ ] Conteúdo com máximo 1152px, padding 16/32px e entrada fade-in
- [ ] Tipografia system-ui e hierarquia documentada
- [ ] Cards com borda, radius e `shadow-card`
- [ ] Botões, inputs, selects, textarea e controles em estados hover/focus/disabled
- [ ] Busca com ícone e filtros em card compacto
- [ ] Tabelas sem zebra, com hover muted/50, overflow e ações à direita
- [ ] Badges e cores semânticas sem tonalidades inventadas
- [ ] Dialog overlay preto/80, conteúdo central, padding 24px e footer responsivo
- [ ] Tooltips/dropdowns/popovers e transições coerentes
- [ ] Loading e vazios seguem composições reais
- [ ] Ícones Lucide nas dimensões documentadas
- [ ] Mobile e grids não causam overflow fora das tabelas

## Limites da evidência

- Há somente tema claro; não há tokens `.dark` oficiais.
- A sidebar mobile completa, breadcrumbs e zebra não existem.
- Paginação, radio, popover, skeleton e Alert estão disponíveis como primitivos, mas não são padrões recorrentes em páginas.
- Não há token oficial para `primary-active`, nem componente Button com loading.
- Não existe asset de logo JM no repositório visual: a implementação oficial é o componente textual descrito.
- O CSS legado de template Vite (`App.css`) não participa da aplicação carregada e não integra o Design System.

Quando uma necessidade cair nesses limites, preservar os tokens e primitivos existentes, implementar apenas o mínimo funcional e registrar a decisão como adaptação — nunca como padrão extraído.
