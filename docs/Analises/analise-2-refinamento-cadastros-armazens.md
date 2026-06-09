# Análise 2 — Refinamento do pré-cadastro de Armazéns/Destinatários via GRL019

## 1. Revisão da implementação atual

- A implementação anterior criou o pré-cadastro automático em `src/lib/db.ts`, acionado pela tela de importação em `src/pages/Importar.tsx` após o GRL019 ser salvo no IndexedDB.
- O relatório completo continua ficando no navegador; o banco recebe apenas registros resumidos em `armazens` com razão social, CPF/CNPJ, I.E., endereço, município, UF, tipo, status e origem.
- A tela `/cadastros/armazens` passou a usar a base como `Armazéns / Destinatários`, mantendo o `CrudPage` e adicionando indicadores visuais de origem e pendência.
- A resolução do 5923 em `src/lib/resolve.ts` já estava usando CPF/CNPJ normalizado como chave e deixou de buscar por razão social.
- O fallback em `src/lib/nota.ts` permanece correto: cadastro global primeiro; linha de expedição do GRL019 quando o cadastro não existe.
- Não foram encontrados diretórios `public/PRD` ou `docs/PRD` no repositório atual. A validação de regra foi feita contra as análises existentes em `docs/Analises` e contra a massa real `public/GRL019 Modelo - Cooperativa COAFORTE.xlsx`.

## 2. Resultado da validação das linhas de EXPEDIÇÃO

A massa `public/GRL019 Modelo - Cooperativa COAFORTE.xlsx` foi inspecionada diretamente como XLSX via leitura ZIP/XML, sem alterar o arquivo.

### Números encontrados

- Linhas com `TP FATURAMENTO = EXPEDIÇÃO`: **1.515**.
- Linhas com `TP FATURAMENTO = RECEBIMENTO`: **1.468**.
- CPF/CNPJ únicos em expedição, normalizados apenas com números: **75**.
- Razões sociais únicas em expedição: **44**.
- CPF/CNPJ de expedição associados a mais de uma razão social: **0**.
- Razões sociais associadas a mais de um CPF/CNPJ: **14**.

### Padrões recorrentes observados

Os nomes de expedição incluem majoritariamente pessoas jurídicas e diferentes perfis operacionais:

- Indústrias/agroindústrias: exemplos recorrentes como `FS AGRISOLUTIONS INDUSTRIA DE BIOCOMBUSTIVEIS LTDA`, `INPASA AGROINDUSTRIAL S/A`, `FS INDUSTRIA DE BIOCOMBUSTIVEIS LTDA`.
- Tradings/comerciais/exportadoras: exemplos como `COFCO INTERNATIONAL BRASIL S.A.`, `MARCOM COMMODITIES AGRICOLAS LTDA`, `SOYAMA AGRICOLA COMERCIO E EXPORTACAO DE GRAOS LTDA`.
- Armazéns/cerealistas: exemplos como `SAFRAS ARMAZENS GERAIS LTDA`, `SAGEL COMERCIO DE CEREAIS LTDA`.
- Cooperativas: exemplo `COOPERATIVA AGROPECUARIA TERRA VIVA - COOAVIL`.
- Grandes destinatários com filiais diferentes: mesma razão social aparece com CNPJs diferentes, por exemplo `INPASA AGROINDUSTRIAL S/A`, `SAFRAS ARMAZENS GERAIS LTDA`, `COFCO INTERNATIONAL BRASIL S.A.` e `TRES TENTOS AGROINDUSTRIAL S/A`.

### Conclusão objetiva

- **Cenário A para destinatário:** na massa analisada, as linhas de `EXPEDIÇÃO` representam contrapartes/destinatários úteis para compor a base global do 5923.
- **Cenário B para classificação de tipo:** não é seguro inferir automaticamente se o registro é `armazem`, `industria`, `trading`, `cooperativa` ou `destinatario_final` apenas pelo nome. Por isso o ajuste mínimo mantém novos pré-cadastros como `tipo = outro`, sem heurística complexa.

## 3. Avaliação dos riscos encontrados

- Usar apenas `EXPEDIÇÃO` como origem de candidatos é aceitável para formar uma base global de destinatários, mas não para classificar o tipo operacional.
- Razão social não pode ser chave: há 14 razões sociais com mais de um CNPJ na massa real, geralmente por filial. Isso confirma a decisão de usar CPF/CNPJ normalizado como chave principal.
- A ausência de índice único físico ainda permite duplicidades manuais históricas no banco. A sincronização evita criar novas duplicidades por CPF/CNPJ normalizado, mas não corrige dados já duplicados.
- Antes deste refinamento, registros manuais com campos vazios ainda poderiam ser enriquecidos por GRL019 se o CPF/CNPJ coincidisse. Isso era um risco para cadastros já validados pelo usuário.

## 4. Avaliação da proteção de registros manuais

### Comportamento anterior

- A sincronização procurava cadastro existente por CPF/CNPJ normalizado.
- Se encontrasse, preenchia apenas campos vazios, independentemente da origem do registro.
- Isso protegia contra sobrescrita, mas ainda permitia enriquecimento automático de um registro manual incompleto.

### Ajuste mínimo implementado

- Registros com `origem_cadastro != grl019` não são mais enriquecidos automaticamente.
- Apenas registros que ainda continuam como `origem_cadastro = grl019` podem receber preenchimento automático de campos vazios.
- Qualquer salvamento feito pelo CRUD de `/cadastros/armazens` passa a gravar `origem_cadastro = manual`, tratando a edição como validação manual do usuário.

### Risco residual

- Se uma base antiga já tiver registros importados sem origem correta, a migration anterior aplica default `manual`, então esses registros ficam protegidos por padrão. Isso é conservador e evita automações irreversíveis.

## 5. Avaliação da rastreabilidade da sincronização

### Benefício

- Saber quando um registro foi criado ou enriquecido pelo GRL019 facilita auditoria e suporte.
- Ajuda a diferenciar registros importados recentemente de cadastros antigos.

### Custo e risco

- O custo é baixo: uma coluna opcional `timestamptz` em `armazens`.
- Não exige nova tabela, novo fluxo ou mudança nos modelos de nota.
- Não salva o GRL019 completo no banco.

### Ajuste mínimo implementado

- Criada a coluna `ultima_sincronizacao_grl019`.
- A sincronização grava essa data/hora ao criar um pré-cadastro via GRL019.
- A sincronização atualiza essa data/hora somente quando realmente enriquece campos vazios de um registro ainda com origem `grl019`.

## 6. Avaliação da UX da tela

### Importação

- O toast anterior desaparecia rápido e não deixava resumo persistente.
- Foi adicionado um card compacto de resultado após a importação, usando `Card`, `CardHeader`, `CardTitle` e `CardContent` já existentes.
- O card mostra: arquivo, destinatários encontrados, criados, atualizados, protegidos, inalterados e ignorados.

### Cadastro de armazéns/destinatários

- Foi adicionado um card compacto acima do CRUD com quatro indicadores:
  - Total;
  - Via GRL019;
  - Pendentes;
  - Completos.
- Não foi criado dashboard novo nem componente de layout complexo.
- A edição manual não expõe mais `origem_cadastro` como campo editável direto; a origem é indicador operacional e é ajustada automaticamente para `manual` quando o usuário salva pelo CRUD.

## 7. Consistência da base

### Base projetada a partir do GRL019 modelo

Como não há acesso a uma base Supabase real neste ambiente, a consistência foi avaliada sobre a base que seria criada a partir da massa modelo.

- Possíveis duplicidades por CPF/CNPJ normalizado geradas pela sincronização: **0**, porque a sincronização usa `Map` por CPF/CNPJ normalizado.
- Registros candidatos sem CPF/CNPJ: **0**.
- Registros candidatos sem razão social: **0**.
- Registros candidatos sem município: **0**.
- Registros candidatos sem UF: **0**.
- Registros candidatos sem endereço: **0**.
- Registros candidatos sem I.E.: **0**.

### Observação importante

- Existem 14 razões sociais associadas a múltiplos CPF/CNPJ. Isso não é erro da base; são filiais/unidades e reforçam que razão social não deve ser usada como chave.

## 8. Ajustes implementados

1. `syncArmazensFromGrl019` passou a retornar contadores mais úteis:
   - `encontrados`;
   - `criados`;
   - `atualizados`;
   - `protegidos`;
   - `inalterados`;
   - `ignorados`.
2. `ignorados` agora conta apenas linhas de `EXPEDIÇÃO` sem chave/dado mínimo, não mais todas as linhas de recebimento.
3. Cadastros manuais passaram a ser protegidos contra enriquecimento automático.
4. Cadastros de origem `grl019` continuam podendo ser enriquecidos apenas em campos vazios.
5. Salvamento manual no CRUD define `origem_cadastro = manual`.
6. Criada rastreabilidade `ultima_sincronizacao_grl019`.
7. Importação passou a exibir card persistente com resultado da sincronização.
8. Tela `/cadastros/armazens` passou a exibir indicadores rápidos compactos.

## 9. Ajustes recomendados para o futuro

- Avaliar, após saneamento da base real, índice único funcional para CPF/CNPJ normalizado.
- Avaliar uma tela ou relatório simples de duplicidades existentes por CPF/CNPJ normalizado antes de impor unicidade física.
- Confirmar com a área de negócio se `bairro`, `CEP` e `telefone` devem ser obrigatórios para considerar cadastro completo.
- Confirmar se `tipo = outro` é o melhor estado inicial para pré-cadastros do GRL019 ou se deve existir um rótulo específico como `pendente_classificacao` em versão futura.
- Avaliar exibir `ultima_sincronizacao_grl019` na tela somente se o usuário precisar desse dado operacional; por ora a informação fica persistida para auditoria sem aumentar a grid.

## 10. Checklist final

- [x] Importação continua salvando o GRL019 completo apenas no IndexedDB.
- [x] Pré-cadastro continua funcionando sem fluxo paralelo.
- [x] CPF/CNPJ normalizado continua sendo a chave principal.
- [x] Sincronização não cria duplicidade por CPF/CNPJ normalizado.
- [x] Registros manuais não são enriquecidos automaticamente.
- [x] Registros editados pelo usuário passam a origem `manual`.
- [x] Registros `grl019` só recebem campos vazios.
- [x] Modelo 5923 continua usando cadastro quando existir e fallback do GRL019 quando necessário.
- [x] Pesquisa de contratos não foi alterada.
- [x] Demais cadastros não foram alterados.
- [x] Arquivo Markdown de refinamento foi criado em `docs/Analises`.
