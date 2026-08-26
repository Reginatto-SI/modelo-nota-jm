---
name: jm-design-system
description: Reproduzir e manter a identidade visual oficial dos sistemas internos da JM Assessoria em interfaces web, especialmente projetos React, Tailwind CSS e shadcn/ui. Usar ao criar, adaptar ou revisar shells, sidebars, páginas, cards, formulários, tabelas, filtros, modais, estados e demais UI que devam pertencer ao ecossistema JM, preservando com fidelidade os tokens e padrões extraídos do Modelo de Nota JM.
---

# Aplicar o Design System JM

## Regra central

Tratar os arquivos desta Skill como fonte visual autocontida. Reproduzir o sistema existente; não redesenhar, modernizar, completar paletas nem criar variantes por preferência.

Antes de implementar:

1. Inspecionar o projeto de destino e localizar componentes equivalentes.
2. Ler [tokens.md](references/tokens.md) e executar sua configuração inicial: conferir CSS variables, mapeamentos Tailwind, sombras, radius e animações um a um.
3. Reutilizar toda implementação equivalente que já seja compatível com os valores oficiais.
4. Criar qualquer token, variável, extensão ou utilitário oficial ausente com **exatamente** o valor documentado; não presumir que um projeto Lovable novo já os possua.
5. Ler [layout-and-brand.md](references/layout-and-brand.md) e somente as referências de componentes necessárias.
6. Manter regras de negócio, dados, segurança e comportamento intactos.
7. Usar React + Tailwind + shadcn/Radix existentes quando disponíveis; não adicionar dependências para detalhes realizáveis nessa stack.

## Fontes normativas

- **Cores, radius, sombras, tipografia, animações e breakpoints:** [tokens.md](references/tokens.md)
- **Marca JM, shell, sidebar expandida/recolhida, mobile e páginas:** [layout-and-brand.md](references/layout-and-brand.md)
- **Botões, cards, badges, ícones, feedback e estados:** [components.md](references/components.md)
- **Inputs, selects, textarea, controles, filtros e busca:** [forms.md](references/forms.md)
- **Tabelas, dropdowns, tooltips, popovers, dialogs e paginação:** [data-and-overlays.md](references/data-and-overlays.md)
- **Checklist de fidelidade e limites da evidência:** [validation.md](references/validation.md)

## Ordem de decisão

1. Reutilizar o componente equivalente do projeto de destino.
2. Se um token oficial estiver ausente, criá-lo antes de usar o componente, seguindo a configuração canônica de `tokens.md` literalmente.
3. Se o componente estiver ausente, reproduzir a composição documentada sem alterar tokens.
4. Se o padrão não estiver documentado, usar o primitivo shadcn `default` já presente e os tokens JM; não inventar uma assinatura visual nova.
5. Distinguir sempre **padrão usado no Modelo de Nota** de **primitivo disponível, mas não validado em tela**.

## Restrições

- Não incorporar nomes, textos, dados ou regras fiscais/do Modelo de Nota.
- Não criar nova logo: usar exclusivamente o monograma textual documentado.
- Não trocar `system-ui` por fonte externa.
- Não criar dark mode: a referência possui apenas tema claro.
- Não forçar sidebar, tabela ou modal quando a funcionalidade não os exigir; quando exigir, aplicar o padrão JM.
- Não substituir componentes acessíveis Radix/shadcn por implementações artesanais.
