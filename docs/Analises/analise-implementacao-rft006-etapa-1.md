# Análise técnica de implementação — RFT006 (etapa 1)

**Data:** 2026-10-02  
**Escopo:** diagnóstico do menor conjunto de alterações para iniciar o fluxo **Gerar modelo avulso — RFT006**, sem implementação, migration, backfill ou alteração de dados nesta etapa.  
**Base funcional:** `docs/PRD.md` e `docs/Analises/analise-modelo-avulso-rft006.md`.

## 1. Resumo executivo

O fluxo homologado atual é centrado no GRL019: um `ReportProvider` carrega um único relatório do IndexedDB, `Pesquisa` resolve cada linha contra cooperativa/tipo de contrato/modelo/produto/destinatário, `buildNota` cria uma nota com **um único produto**, `Preview` edita essa estrutura e `pdf.ts` desenha uma única linha de item. O RFT006 não deve entrar nesse encadeamento, pois não possui contrato, operação casada, cooperativa de origem nem obrigação de produto cadastrado.

O menor caminho seguro é:

1. manter intocados `parseGrl019`, `resolveContrato` e `buildNota`;
2. criar parser/tipos/estado local próprios do RFT006 e uma página operacional própria, reaproveitando os componentes visuais e o cadastro de destinatários;
3. representar itens do RFT006 como coleção sem substituir de imediato o campo singular usado pelo GRL019;
4. estender a prévia e o renderer por uma ramificação explícita de origem/capacidade, preservando a renderização atual quando a nota vier do GRL019;
5. implementar e homologar primeiro uma Nota individual; somente depois conectar a seleção múltipla à infraestrutura já existente de vários downloads individuais.

Não há evidência no código de parser, tipos, armazenamento ou configuração padrão para RFT006. Também não há geração em lote por seleção: existe apenas a capacidade técnica de manter várias notas na prévia e baixar um PDF separado para cada uma.

## 2. Mapa do fluxo atual

`App.tsx` registra as rotas. `Layout.tsx` monta o menu lateral. A importação passa por `Importar.tsx` → `parseGrl019` → `ReportContext` → `idb.ts`. A geração passa por `Pesquisa.tsx` → `resolveContrato` → `buildNota` → estado de navegação de `/preview`. A prévia chama `generatePdf`, cujo renderer recebe `Nota[]`, mas desenha uma nota por vez e uma única linha de produto por nota.

Pontos que devem ser tratados como fronteira homologada do GRL019:

- parsing e diagnóstico em `src/lib/grl019.ts`;
- sincronização automática de destinatários de expedição em `syncArmazensFromGrl019`;
- casamento e resolução fiscal em `src/lib/resolve.ts`;
- composição do documento GRL019 em `buildNota`;
- comportamento atual de prévia/PDF para `sourceType` GRL019.

## 3. Análise por ponto solicitado

### 3.1 Menu/sidebar e rotas atuais

**Envolvidos**

- `src/App.tsx`: rotas `/importar`, `/pesquisa`, `/preview` e cadastros.
- `src/components/Layout.tsx`: array `nav`, componente `Item` e menu responsivo.
- `src/pages/Index.tsx`: atalhos/explicação inicial, a revisar quando o fluxo for implementado.

**Pode ser reutilizado**

- `Layout`, `Item`, ícones, estados de menu recolhido e padrão visual.
- A convenção de páginas dentro do `Layout` e de rotas declaradas antes do catch-all.

**Precisa ser criado/ajustado**

- Renomear semanticamente os acessos atuais para **Gerar modelo por contrato — GRL019** (sem mudar seus destinos ou regras).
- Adicionar uma rota e item separados para **Gerar modelo avulso — RFT006**. A página pode concentrar importação e grade de Notas, evitando criar duas rotas antes de haver necessidade operacional.
- Definir navegação de volta da prévia conforme a origem; hoje ela sempre retorna/redireciona para `/pesquisa`.

**Riscos de regressão**

- Reutilizar `/importar` ou `/pesquisa` para os dois formatos pode misturar estado, mensagens e regras de contrato.
- `NavLink` sem `end` pode marcar itens indevidamente se as novas rotas compartilharem prefixos.
- O cabeçalho móvel não exibe navegação equivalente ao menu desktop; não se deve tentar resolver esse tema fora do escopo do RFT006.

**Mudança mínima recomendada**

Manter as rotas GRL019 e adicionar uma única rota independente, por exemplo `/rft006`, com rótulos explícitos no menu. Compartilhar apenas `Layout` e componentes UI.

---

### 3.2 Importação/parsing do GRL019 e armazenamento local

**Envolvidos**

- `src/pages/Importar.tsx`: seleção, confirmação de substituição, diagnósticos, resumo e sincronização de armazéns.
- `src/lib/grl019.ts`: `parseGrl019`, `findHeaderRow`, `resolveHeaders`, normalizações, diagnósticos e `summarize`.
- `src/context/ReportContext.tsx`: estado global exclusivo `Grl019Report`.
- `src/lib/idb.ts`: banco `modelo-nota-jm`, versão 1, store `reports`, chave `current`.
- `src/lib/types.ts`: `Grl019Row` e `Grl019Report`.

**Pode ser reutilizado**

- Biblioteca `xlsx`, leitura como matriz (`header: 1`), busca de linha de cabeçalho, padrão de retorno com diagnóstico e mensagens da UI.
- Estratégia de armazenamento apenas no navegador, desde que o RFT006 use chave/store e tipos próprios e não sobrescreva `reports/current`.
- Padrões visuais de upload, confirmação de substituição e resumo.

**Precisa ser criado**

- `Rft006Raw/Row`, item normalizado, grupo por Nota, situação e relatório em tipos próprios.
- Parser próprio, sem chamar `parseGrl019`, capaz de preservar cabeçalhos duplicados e identificar a coluna `C.F.O` numérica por combinação de cabeçalho, posição e conteúdo — nunca por `C.F.O.1` fixo.
- Normalização do CFOP (texto/número, espaços/formatação, quatro dígitos quando válido), classificação 5xxx/6xxx, agrupamento por `Nota` e validações de CFOP misto, emitente inconsistente e obrigatórios.
- Quantidade por `Ps.Liq > 0`, com fallback para `Qtde`, e espelhamento dos valores sem recálculo destrutivo.
- Estado/contexto ou hook próprio do RFT006 e persistência local isolada. Se for ampliado o schema atual do IndexedDB em implementação futura, a versão deverá subir e a store/chave do GRL019 deverá permanecer intacta; isso não é uma migration de banco remoto.

**Riscos de regressão**

- Generalizar `ReportContext` ou `Grl019Report` para um union amplo tende a contaminar todas as telas atuais.
- Usar `xlsx.sheet_to_json` com objetos pode ocultar o cabeçalho duplicado por renome automático.
- Filtrar linhas antes de agrupar impediria detectar Nota com CFOPs mistos e produziria documento parcial.
- Reaproveitar a sincronização `syncArmazensFromGrl019` cadastraria agricultores do RFT006 como destinatários, contrariando a regra de negócio.

**Mudança mínima recomendada**

Criar módulo e estado RFT006 paralelos apenas na fronteira de importação, não uma arquitetura paralela completa. O resultado normalizado passa ao restante do fluxo; código de contrato GRL019 não é compartilhado.

---

### 3.3 Cadastro de armazéns/destinatários

**Envolvidos**

- `src/pages/cadastros/Armazens.tsx`: CRUD baseado em `CrudPage`.
- `src/lib/db.ts`: `useArmazens`, `useSaveArmazem`, `useDeleteArmazem` e sincronização GRL019.
- `src/lib/types.ts`: interface `Armazem`.
- `src/pages/Preview.tsx`: `CadastroDestinatarioDialog` e `partyFromCadastro`, que hoje pesquisam cooperativas e armazéns no modo de clone manual.

**Pode ser reutilizado**

- Cadastro `armazens`, inclusive razão social, documento, IE e endereço.
- CRUD, hooks React Query e seleção já existente na prévia.
- Conversão de `Armazem` para `NotaParty`; para RFT006 a busca deve preferir/exibir armazéns/destinatários ativos.

**Precisa ser criado/ajustado**

- Referência persistente ao destinatário padrão na configuração RFT006, não no próprio registro de armazém.
- Carregamento automático do padrão e troca consciente na prévia/lote.
- Eventual filtro visual pelos tipos adequados, sem impedir seleção válida que o cadastro já permite.

**Riscos de regressão**

- Alterar a chave de deduplicação/sincronização GRL019 (hoje CPF/CNPJ) afeta comportamento homologado e não é necessário.
- Incluir cooperativas como destinatários RFT006 por conveniência conflita com o requisito, que aponta o cadastro de armazéns/destinatários.
- Salvar alterações feitas na prévia diretamente no CRUD violaria o isolamento da geração.

**Mudança mínima recomendada**

Consumir `useArmazens` e extrair/reutilizar apenas o seletor/conversor já existente na prévia, sem mudar o CRUD nem `syncArmazensFromGrl019`.

---

### 3.4 Modelos, CFOP, CST, natureza e dados adicionais

**Envolvidos**

- `src/pages/cadastros/ModelosNota.tsx`: formulário de modelo, CFOP, natureza, CST, destinatário e template.
- `src/lib/types.ts`: `ModeloNota`.
- `src/lib/db.ts`: `useModelos`/`useSaveModelo`, incluindo vínculo N:N obrigatório com cooperativas.
- `src/lib/resolve.ts`: seleção do modelo pelo tipo de contrato/cooperativa e regras 5118/5923/5132.
- `src/lib/nota.ts`: prioridade da CST e composição da nota.

**Pode ser reutilizado**

- Conceitos e controles de edição para CFOP, natureza, CST, status e template.
- Campos existentes de `ModeloNota` como referência de nomenclatura e validação.
- Componentes `Input`, `Textarea`, `Select`, `Switch` e padrão de formulário/modal.

**Precisa ser criado**

- Configuração persistente própria do RFT006 contendo destinatário padrão, CFOP da nova nota, natureza, CST, template e status se aplicável.
- Leitura do padrão na criação de cada Nota e ação explícita futura para “Salvar esta configuração como padrão”. Overrides da prévia/lote permanecem somente no estado da geração.

**Por que não usar diretamente `modelos_nota` sem ajuste**

O cadastro atual exige ao menos uma cooperativa e sua consulta/resolução está acoplada a `modelo_nota_cooperativas`, tipo de contrato e GRL019. Forçar uma cooperativa fictícia para o RFT006 inventaria regra. É possível reaproveitar o formulário e os nomes dos campos, mas não o contrato de resolução. A persistência do novo padrão exigirá decisão de schema/migration em etapa autorizada; nenhuma alteração de banco é feita nesta análise.

**Riscos de regressão**

- Relaxar a obrigatoriedade de cooperativa em `ModelosNota` ou alterar `resolveContrato` pode mudar quais modelos GRL019 são encontrados.
- Usar o CFOP importado como CFOP do novo documento viola explicitamente o PRD.
- Fazer autosave de exceção como padrão cria risco fiscal.

**Mudança mínima recomendada**

Configuração RFT006 pequena e explícita, consumida somente pelo novo builder. Não introduzir RFT006 em `resolveContrato`.

---

### 3.5 Sistema de templates/variáveis

**Envolvidos**

- `src/lib/nota.ts`: `TEMPLATE_VARIABLE_GROUPS`, `buildVars`, `renderTemplate`, `getPendingPlaceholders` e `hasPendingPlaceholders`.
- `src/pages/cadastros/ModelosNota.tsx`: exibição da mesma lista de variáveis e edição do template.
- `src/pages/Preview.tsx`: edição livre de dados adicionais e aviso parcial de placeholders.

**Pode ser reutilizado**

- `renderTemplate`, que substitui chaves existentes e sinaliza origem ausente com `####`.
- Detectores de placeholders e UI de badges de variáveis.
- Convenção de template persistente em vez de texto fiscal no renderer.

**Precisa ser criado/ajustado**

- Um builder de variáveis RFT006 separado de `buildVars`, pois este recebe `ResolveResult` e contém semântica de contrato/cooperativa/produto singular.
- Catálogo RFT006 com `emitente_*`, `destinatario_*`, `nota_referencia`, `cfop`, `cst`, `natureza_operacao` e totais agregados seguros (`valor_total`, `valor_desconto`, `valor_liquido`).
- Validação única de placeholders pendentes antes da geração, inclusive tokens já convertidos para `####`, hoje tratados de modo diferente pela prévia.

**Riscos de regressão**

- Acrescentar variáveis ao catálogo compartilhado sem contexto pode anunciá-las nos modelos GRL019 embora não tenham origem naquele fluxo.
- Reutilizar `buildVars` exigiria fabricar `ResolveResult`/contrato/cooperativa.
- Renderizar template antes de o usuário trocar o destinatário deixaria dados adicionais desatualizados; o fluxo precisa definir reaplicação consciente do template ou gerar a partir do estado final.

**Mudança mínima recomendada**

Manter `renderTemplate` genérico; separar somente catálogo e montagem do mapa RFT006. Não alterar a saída dos templates GRL019.

---

### 3.6 Tela de prévia e campos editáveis

**Envolvidos**

- `src/pages/Preview.tsx`: estado `Nota[]`, abas, `update`, validações, edição financeira, partes, produto, transporte, dados adicionais e seletor de cadastro.
- `src/lib/nota.ts`: interface `Nota`, `NotaParty` e `sourceType` (`grl019 | manual_clone`).
- `src/pages/Pesquisa.tsx`: navega para `/preview` com `{ notas, warnings }`.

**Pode ser reutilizado**

- Estrutura de abas para várias notas, campos de partes, seletor de destinatário, campos monetários, dados adicionais, mensagens e chamada de PDF.
- Passagem por navigation state para a primeira versão, sem histórico permanente.
- O padrão de override em estado local, que já não grava a edição no Excel/cadastros.

**Precisa ser criado/ajustado**

- Origem explícita `rft006` e rota de retorno explícita, evitando chamar o RFT006 de `manual_clone`.
- Estrutura de itens N e editor em tabela/lista, com descrição, NCM, unidade, quantidade, valor unitário, bruto, desconto e líquido por linha.
- Validações próprias de documento RFT006 e totais; os validadores atuais assumem `produto`, `quantidade`, `valorUnitario` e `valorTotal` singulares e positivos.
- Campos de emitente, destinatário, CFOP, CST, natureza e dados adicionais editáveis para RFT006 sem habilitar edição fiscal irrestrita no GRL019.

**Riscos de regressão**

- Trocar diretamente `Nota.produto` por `Nota.itens` obrigaria refatoração simultânea de `buildNota`, testes, prévia e PDF homologados.
- A função `update` recalcula total em alterações de quantidade/valor; RFT006 deve inicialmente espelhar bruto/desconto/líquido e não sobrescrevê-los silenciosamente.
- A validação atual exige NCM/CST em `produto`; no RFT006 a CST é configuração da nota e NCM é por item.
- “Duplicar como avulso” é um clone manual de nota GRL019, não o novo fluxo RFT006; manter os conceitos distintos evita regressões e confusão.

**Mudança mínima recomendada**

Adicionar um payload/capacidade opcional de itens somente para origem RFT006 e renderizar uma seção específica dentro da mesma página. O caminho GRL019 continua usando os campos singulares e os mesmos componentes/validações atuais.

---

### 3.7 Geração/renderização de PDF

**Envolvidos**

- `src/lib/pdf.ts`: `drawNota`, `drawProductTable`, blocos fiscal/transporte/adicionais, `ensureSpace`, `addPage`, `generatePdf` e `pdfDataUri`.
- `src/lib/pdf.test.ts`: testes do conteúdo/layout atual.
- `src/pages/Preview.tsx`: dispara um `generatePdf([nota], nome)` por nota.

**Pode ser reutilizado**

- Cabeçalho orientativo, partes, natureza, rodapé, transporte, dados adicionais e helpers de paginação.
- `jspdf-autotable`, adequado a múltiplas linhas e quebra automática.
- `generatePdf`/`pdfDataUri` e desenho independente de cada documento.

**Precisa ser criado/ajustado**

- Adaptador que forneça as linhas RFT006 a `drawProductTable` sem alterar a linha GRL019.
- Totais do RFT006 (bruto, desconto, líquido) no bloco fiscal, preservando os zeros/cálculos atuais do GRL019.
- Coordenação de quebra de página: `autoTable` já quebra a tabela, mas os blocos seguintes devem usar `lastAutoTable.finalY`; em notas extensas deve ser verificado se o cabeçalho da tabela repete e se rodapé/conteúdo não colidem.
- Nome de arquivo baseado em Nota/emitente para RFT006; `buildNotaPdfFileName` atual é baseado em CFOP e contratos.

**Riscos de regressão**

- Alterar globalmente colunas, totais ou medidas muda o PDF homologado GRL019.
- `didDrawPage` desenha rodapé durante o `autoTable`, enquanto `drawNota` também desenha rodapé; mudanças de paginação devem ser cobertas por testes de múltiplas páginas.
- Um array passado a `generatePdf` produz um arquivo com várias notas/páginas, mas o requisito do lote pede arquivo independente por Nota.

**Mudança mínima recomendada**

Preservar o ramo de uma linha exatamente como está para GRL019 e fazer `drawProductTable` aceitar linhas normalizadas apenas quando existirem itens RFT006. Alterar o bloco de totais condicionado à origem, com testes de regressão dos PDFs existentes.

---

### 3.8 Capacidade atual do PDF para múltiplos itens

**Constatação**

Não há suporte funcional a vários itens na mesma nota. `Nota` possui `produto`, `quantidade`, `valorUnitario` e `valorTotal` singulares, e `drawProductTable` passa ao `autoTable` um `body` com exatamente uma linha. O fato de `autoTable` suportar paginação e de `generatePdf` aceitar `Nota[]` não resolve N itens: esse array representa documentos, não itens.

**Pode ser reutilizado**

- `autoTable`, `lastAutoTable.finalY`, `didDrawPage`, `ensureSpace` e `addPage`.

**Precisa ser criado**

- Tipo de item com valores bruto, desconto e líquido.
- Lista de itens por Nota RFT006.
- Mapeamento de cada item para uma linha e soma dos totais importados.
- Testes com 2 itens, muitos itens/quebra de página e conferência de que GRL019 continua com uma linha.

**Risco principal**

Confundir “várias notas” com “vários itens” e gerar um PDF por linha do RFT006, quebrando a regra uma Nota = um documento.

---

### 3.9 Geração individual e infraestrutura para lote

**Envolvidos**

- `src/pages/Pesquisa.tsx`: `generate` pode montar uma ou duas notas da operação casada.
- `src/pages/Preview.tsx`: mantém `Nota[]`, usa abas e `gerarPdfs` itera gerando downloads independentes.
- `src/lib/pdf.ts`: também aceita `Nota[]`, embora a UI atual prefira chamadas individuais.

**Pode ser reutilizado**

- Prévia em abas e estado como coleção.
- Loop de PDFs independentes, alinhado à exigência de não consolidar Notas RFT006.
- Componentes de tabela, checkbox, diálogo e alertas já presentes no projeto.

**Precisa ser criado**

- Grade agrupada por Nota com seleção, situação e bloqueio de grupos inválidos.
- Builder individual RFT006, inicialmente acionado por “Gerar modelo desta nota”.
- Para lote: seleção múltipla, configuração comum em memória, cópia imutável por Nota e override individual.
- Relatório claro de falhas/sucessos. A política transacional deve ser definida antes de liberar o lote; o PRD aceita bloquear tudo ou separar resultados de forma explícita.
- Estratégia de downloads compatível com bloqueios do navegador; disparar muitos `doc.save` consecutivos pode ser bloqueado e precisa de teste real. Não há ZIP ou gerenciador de lote instalado hoje.

**Riscos de regressão**

- Reaproveitar a operação casada como “lote” traz semântica de CFOP/contrato que não existe no RFT006.
- Gerar todas as Notas em um único `generatePdf(notas)` descumpre o PDF independente por Nota.
- Implementar lote antes de estabilizar parser, agrupamento, builder, prévia e PDF multi-item multiplica estados inválidos.

**Mudança mínima recomendada**

Entregar primeiro geração individual sobre a mesma coleção que futuramente alimentará o lote. Depois adicionar seleção/configuração comum e manter a geração final por `generatePdf([nota])`.

## 4. Conjunto mínimo de alterações futuras

Sem executar nenhuma delas nesta etapa, o menor conjunto previsto é:

1. **Navegação:** ajuste de rótulos e uma rota/página RFT006.
2. **Domínio RFT006:** tipos de linha, item, grupo/Nota, relatório e diagnóstico.
3. **Importação:** parser independente e testes unitários com cabeçalhos duplicados, CFOP texto/número, mistos e emitente inconsistente.
4. **Estado local:** store/chave isolada do relatório RFT006, sem backend/histórico.
5. **Configuração padrão:** persistência autorizada posteriormente para destinatário/CFOP/CST/natureza/template, reutilizando o destinatário existente. Esta é a única necessidade de schema remoto identificada; não deve ser executada sem etapa específica.
6. **Builder/template:** composição RFT006 independente de `resolveContrato`/`buildNota`, reutilizando `NotaParty` e `renderTemplate`.
7. **Prévia:** capacidade RFT006 e editor de itens N na página existente.
8. **PDF:** linhas N e totais RFT006 por ramo explícito, mantendo o ramo GRL019 inalterado.
9. **Lote:** seleção/configuração comum/override após homologação individual.

Não são necessários para o RFT006: mudanças em tipos de contrato, casamento de contratos, sincronização de armazéns do GRL019, cadastro obrigatório de produtos ou histórico de PDFs.

## 5. Ordem incremental recomendada

1. **Congelar comportamento com testes:** manter testes atuais e acrescentar casos de regressão GRL019 para parser, resolução, nota e PDF de um item.
2. **Parser puro RFT006:** tipos, reconhecimento, CFOP, agrupamento e diagnósticos, sem UI nem persistência.
3. **Página/rota e armazenamento local isolado:** upload e grade por Nota, inicialmente apenas leitura/situação.
4. **Configuração padrão:** após decisão/autorização de persistência, cadastrar/selecionar padrão sem tocar em `modelos_nota`/resolução GRL019.
5. **Geração individual:** builder e variáveis RFT006, seleção de destinatário, navegação para prévia.
6. **Prévia multi-item:** edição por linha sem recálculo automático dos valores importados; overrides somente em memória.
7. **PDF multi-item:** render e quebras de página condicionados à origem, com snapshots/assertivas textuais e teste de nota longa.
8. **Homologação individual e regressão GRL019:** validar 5118, 5923, 5132, operação casada, clone manual e nomes dos arquivos.
9. **Lote:** seleção, configuração comum, override individual e PDFs separados; validar política de falhas e downloads no navegador.

## 6. Matriz de riscos e contenção

| Risco | Impacto | Contenção mínima |
|---|---|---|
| RFT006 entrar no `ReportContext` GRL019 | telas atuais receberem formato incompatível | contexto/store próprios |
| Reuso de `resolveContrato` | regras artificiais de cooperativa/contrato | builder RFT006 independente |
| Mudança destrutiva de `Nota.produto` | quebra ampla na prévia/PDF/testes | capacidade opcional de itens RFT006 e compatibilidade singular |
| Mudança global do PDF | regressão visual homologada | ramo explícito e testes dos três CFOPs |
| Filtro antes do agrupamento | Nota parcial silenciosa | agrupar todas as linhas e só então classificar |
| Autosave de override | exceção vira padrão fiscal | ação explícita e estado local por geração |
| Reuso da sincronização de armazéns | agricultores viram destinatários | nunca chamar sync no RFT006 |
| Downloads em massa bloqueados | lote incompleto | teste de navegador e feedback por Nota antes da liberação |

## 7. Decisões que precisam ser fechadas antes das etapas correspondentes

Estas lacunas não impedem parser e grade, mas impedem concluir persistência/lote sem inventar regra:

1. **Persistência da configuração padrão:** confirmar se será uma configuração singleton global e autorizar a migration/schema correspondente. O código atual não possui local apropriado sem acoplamento a cooperativas.
2. **IE obrigatória:** o PRD diz “quando exigida pelo modelo”; a configuração precisa indicar essa exigência ou a regra precisa ser definida para a primeira versão.
3. **Falha em lote:** escolher bloqueio integral ou sucessos/falhas separados antes de implementar a confirmação do lote.
4. **Valor final no PDF:** confirmar a apresentação de bruto, desconto e líquido no bloco fiscal; os dados devem ser espelhados, mas o layout atual mostra apenas total e desconto zero.

## 8. Checklist de aderência desta análise

- [x] Nenhum código de aplicação foi alterado.
- [x] Nenhuma migration, backfill, banco ou dado foi alterado.
- [x] O parser e a resolução GRL019 foram tratados como fronteira homologada.
- [x] Não foi proposta inferência fiscal nem dado hardcoded.
- [x] Foram priorizados `Layout`, CRUD de destinatários, componentes de prévia, template genérico e renderer existentes.
- [x] A extensão nova foi limitada às diferenças reais do RFT006: parser/estado, agrupamento, configuração e itens N.
