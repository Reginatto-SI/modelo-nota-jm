# Análise dos Modelos de Nota 5118, 5923 e 5132

## 1. Resumo executivo

O sistema **ainda não está plenamente apto para substituir o Excel antigo com segurança fiscal/operacional**, embora já tenha uma base técnica importante para evoluir com baixo risco.

A análise do código indica que o fluxo atual já cobre pontos estruturais relevantes: importação do GRL019, preservação textual de contratos, vínculo oficial pela coluna `CONTRATO VINCULADO`, parametrização de modelo por CFOP/cooperativa, CST por modelo com fallback no produto, escolha de operação casada para 5118 + 5923, bloqueio da geração direta por linha de expedição vinculada, prévia editável e geração de PDF orientativo.

Entretanto, há lacunas que impedem afirmar equivalência funcional com os PDFs antigos dos modelos 5118, 5923 e 5132. Os principais bloqueios são:

- o campo `tipo_destinatario` existe no cadastro do modelo, mas a montagem da nota ainda decide o destinatário por regra fixa baseada no CFOP;
- os dados adicionais têm mecanismo de template, porém não expõem nem preenchem todas as variáveis exigidas pelos PDFs antigos;
- placeholders pendentes geram apenas aviso, não bloqueio ou confirmação explícita antes do PDF;
- a quantidade inicial é sempre 30.000 KG, inclusive para 5132, dependendo de edição manual para chegar ao exemplo de 600.000 KG;
- não há validação específica para contrato com zeros à esquerda já descaracterizado pelo Excel antes/na importação;
- não há evidência de teste automatizado cobrindo os três modelos fiscais completos com os textos e combinações esperadas dos PDFs antigos.

Conclusão: o sistema está **parcialmente preparado**, mas deve passar por ajustes pequenos e incrementais antes de ser usado como substituto seguro do Excel antigo.

## 2. Comparativo por modelo

### 2.1. Modelo 5118

#### Regra esperada

- Emitente: produtor/agricultor.
- Destinatário: cooperativa.
- CFOP: 5118.
- CST ICMS: 51.
- Produto: milho em grãos.
- NCM: 10059010.
- Unidade: KG.
- Quantidade exemplo: 30.000 KG.
- Valor unitário exemplo: 0,73333333.
- Valor total exemplo: R$ 22.000,00.
- Natureza da operação: venda de produção do estabelecimento entregue ao destinatário por conta e ordem do adquirente em venda à ordem.
- Pode ser gerado sozinho ou em conjunto com o 5923 quando a parametrização indicar operação casada.
- Dados adicionais devem incluir texto de ICMS diferido, PROCON MT, confirmação de negócio, contrato cliente/Cargill, local de entrega final, Funrural/base, placa cavalo e CNDs da cooperativa e do produtor.

#### Dados do PDF antigo usados como referência

O PDF antigo do 5118 indica uma nota orientativa de venda pelo produtor para a cooperativa, com CFOP 5118, CST 51, milho em KG, valor total de R$ 22.000,00 e dados adicionais extensos com textos fiscais, contrato Cargill, informação de entrega na Cargill e placeholders manuais.

#### Comportamento encontrado no sistema

- O CFOP vem do modelo parametrizado associado ao tipo de contrato.
- A nota 5118 usa o produtor da linha de recebimento como emitente.
- Para qualquer modelo que não seja 5923, o destinatário é a cooperativa encontrada no cadastro.
- A CST exibida no PDF prioriza `modelo.cst_icms_padrao` e só usa a CST do produto como fallback.
- A quantidade inicial é `30.000` KG e o valor unitário é calculado por `preço da saca / 60`.
- O valor total é calculado por `quantidade × valor unitário`.
- Quando o tipo de contrato tem `gera_operacao_casada`, o sistema oferece gerar apenas 5118 ou 5118 + 5923.
- A linha de expedição vinculada é usada para compor destinatário/local de entrega do 5923 e variáveis de armazém/destinatário nos dados adicionais.

#### Divergências

- A equivalência do texto dos dados adicionais depende de parametrização manual no cadastro do modelo; não há seed, validação ou checklist que garanta que o texto do PDF antigo esteja configurado.
- As variáveis atuais não cobrem todos os campos exigidos no PDF antigo, como endereço completo da cooperativa em uma única variável, telefone, bairro/CEP do destinatário, CST, CFOP, motorista, NF referenciada, CND do destinatário final e valores/base de Funrural/retenções.
- O campo `placa_cavalo` existe apenas como placeholder no template; a prévia tem `placaVeiculo`, mas não há sincronização automática entre o campo editável de placa e o placeholder dentro dos dados adicionais.
- Placeholders pendentes apenas geram toast de aviso ao clicar em gerar PDF, sem bloquear ou exigir confirmação.

#### Risco

**Alto.** O modelo 5118 pode sair com CST correta se o cadastro estiver correto, mas há risco de PDF com dados adicionais incompletos, placeholders não revisados ou textos fiscais insuficientes. Isso pode gerar orientação incorreta ao produtor e retrabalho operacional.

#### Sugestão de ajuste

- Manter a estrutura existente de `ModeloNota` e ampliar as variáveis do template.
- Criar validação/alerta estruturado na prévia para placeholders críticos antes do PDF.
- Parametrizar templates padrão por CFOP/cooperativa a partir dos textos dos PDFs antigos.
- Garantir que a placa editada no campo de transporte possa alimentar/revisar o texto dos dados adicionais, ou deixar claro que são campos independentes.

### 2.2. Modelo 5923

#### Regra esperada

- Emitente: produtor/agricultor.
- Destinatário: armazém/destinatário final, como Cargill.
- CFOP: 5923.
- CST ICMS: 41.
- Produto: milho em grãos.
- NCM: 10059010.
- Unidade: KG.
- Quantidade exemplo: 30.000 KG.
- Valor unitário exemplo: 0,73333333.
- Valor total exemplo: R$ 22.000,00.
- Natureza da operação: remessa de mercadoria por conta e ordem de terceiros, em venda à ordem.
- Deve trazer texto de ICMS não tributado/CST 041, motorista, PROCON MT, confirmação de negócio, contrato Cargill, referência à NF 5118/5120, dados completos da cooperativa, placa cavalo, CND do destinatário final e CND do produtor.
- CST 41 deve ser aplicada somente ao modelo 5923, não globalmente ao produto.

#### Dados do PDF antigo usados como referência

O PDF antigo do 5923 indica remessa pelo produtor para o destinatário final/armazém, com CFOP 5923, CST 41, valor total de R$ 22.000,00 e dados adicionais com referência à nota de venda, dados completos da cooperativa e placeholders manuais.

#### Comportamento encontrado no sistema

- O sistema trata 5923 como modelo de operação casada quando o tipo de contrato 5118 tem `gera_operacao_casada`.
- O sistema bloqueia/evita geração direta de linha de expedição vinculada e orienta gerar pelo recebimento.
- O destinatário do 5923 é o armazém cadastrado por CPF/CNPJ da linha de expedição; se não existir cadastro, usa os dados da própria linha de expedição.
- O cadastro de armazéns pode ser pré-alimentado a partir de linhas de expedição do GRL019.
- A CST pode ser parametrizada no modelo 5923, evitando o problema de fixar CST 41 no produto para todos os CFOPs.

#### Divergências

- O `tipo_destinatario` cadastrado no modelo não é efetivamente usado na decisão de destinatário; o código usa `which === "5923"` para decidir armazém/destinatário e cooperativa para os demais.
- O modelo 5923 não pode ser gerado sozinho pelo fluxo operacional atual; a tela afirma que 5923 sempre acompanha a venda 5118 quando há operação casada. Isso atende a regra de operação casada, mas impede eventual necessidade operacional futura de reemitir somente a orientação 5923, se esse cenário existir.
- Faltam variáveis/template para número da NF referenciada, motorista, dados completos da cooperativa com bairro/CEP/telefone/município/UF, CND do destinatário final e CST/CFOP nos dados adicionais.
- Não há bloqueio de placeholders críticos antes da geração do PDF.

#### Risco

**Alto.** O maior risco fiscal é configurar CST 41 fora do modelo correto ou emitir dados adicionais incompletos sem a referência à NF 5118/5120. O código já tem base para CST por modelo, mas a segurança depende de cadastro correto e de validações ainda insuficientes.

#### Sugestão de ajuste

- Usar `modelo.tipo_destinatario` na montagem da nota, preservando fallback compatível por CFOP apenas para registros legados.
- Ampliar variáveis do template para cobrir NF referenciada, motorista, dados completos da cooperativa e CND do destinatário.
- Criar validação de template mínima por CFOP 5923, verificando se há campos essenciais antes de gerar PDF.
- Manter bloqueio de geração direta por expedição vinculada, pois ele está alinhado à regra de a expedição ser fonte de dados e não nota emitida pela cooperativa.

### 2.3. Modelo 5132

#### Regra esperada

- Emitente: produtor/agricultor.
- Destinatário: cooperativa.
- CFOP: 5132.
- CST ICMS: 51.
- Produto: milho em grãos.
- NCM: 10059010.
- Unidade: KG.
- Quantidade exemplo: 600.000 KG.
- Valor unitário exemplo: 0,758333.
- Valor total exemplo: R$ 454.999,80.
- Natureza da operação: fixação de preço de produção do estabelecimento.
- Deve ser emitido sozinho, sem gerar automaticamente 5923.
- Mesmo emitido sozinho, os dados adicionais podem informar local de entrega/destinatário final, como COFCO.
- Deve preservar contrato no formato `0000431969`, com zeros à esquerda.

#### Dados do PDF antigo usados como referência

O PDF antigo do 5132 indica fixação de preço pelo produtor para a cooperativa, com CFOP 5132, CST 51, quantidade de 600.000 KG, contrato com zeros à esquerda e dados adicionais contendo entrega em destinatário final/empresa de destino, textos fiscais e placeholders manuais.

#### Comportamento encontrado no sistema

- Se o CFOP resolvido for 5132, o sistema gera somente o 5132, sem acionar operação casada 5923.
- Para modelos diferentes de 5923, o destinatário montado é a cooperativa.
- As variáveis de armazém/destinatário final podem ser alimentadas por cadastro de armazém ou linha de expedição vinculada, inclusive em dados adicionais de modelos não 5923.
- Contratos são lidos como string no parser do GRL019 e usados como texto na montagem do PDF/nome do arquivo.

#### Divergências

- A quantidade inicial continua sendo 30.000 KG, não 600.000 KG; o usuário precisa alterar manualmente na prévia.
- Não há regra específica por modelo para quantidade padrão ou para importar quantidade do GRL019, se essa informação existir em outro campo não mapeado.
- A preservação de zeros à esquerda depende de a biblioteca de leitura receber a célula sem já ter perdido formatação; não há validação explícita para detectar contrato descaracterizado.
- O template atual não expõe todas as variáveis necessárias para o texto completo do 5132, especialmente valores/base de retenções, CND completa da cooperativa, endereço completo com bairro/CEP/telefone e dados finais de entrega com granularidade suficiente.

#### Risco

**Médio/alto.** O sistema impede o erro grave de gerar 5923 automaticamente no 5132, mas pode produzir orientação com quantidade incorreta se o usuário não ajustar a prévia, e pode perder o formato esperado do contrato se o Excel/GRL019 vier com zeros à esquerda descaracterizados.

#### Sugestão de ajuste

- Manter o 5132 sem operação casada.
- Permitir parametrizar quantidade inicial por modelo ou carregar quantidade real quando existir fonte confiável.
- Adicionar validação visual para contratos que deveriam ter zeros à esquerda ou comprimento fixo, sem inventar zeros automaticamente.
- Ampliar variáveis e validações do template para entrega final e placeholders de valor/base.

## 3. Gaps críticos

1. **Destinatário configurável por modelo ainda não governa a montagem da nota.** O cadastro tem `tipo_destinatario`, mas `buildNota` decide por CFOP: 5923 usa armazém/destinatário; demais usam cooperativa. Isso limita a parametrização solicitada.

2. **Dados adicionais incompletos para equivalência com os PDFs antigos.** Há template, mas faltam variáveis essenciais: CFOP, CST, produtor IE no painel de variáveis, cooperativa endereço completo, bairro, CEP, telefone, destinatário bairro/CEP/telefone, motorista, NF referenciada, CND do destinatário final e valores/base de Funrural/retenções.

3. **PDF pode ser gerado com placeholders pendentes.** O sistema avisa por toast, mas continua gerando. Para campos críticos, isso não é seguro.

4. **Quantidade fixa inicial de 30.000 KG.** O valor é adequado aos exemplos 5118/5923, mas não ao 5132 de 600.000 KG. Hoje depende de edição manual.

5. **Contrato com zeros à esquerda não tem validação de integridade.** O parser trata contrato como texto, mas não há alerta se o arquivo já veio descaracterizado como número.

6. **Ausência de validação automatizada por modelo fiscal completo.** Existem testes para parser, resolução, CST por modelo e nome de PDF, mas não há cenários completos 5118/5923/5132 comparando os campos mínimos esperados dos PDFs antigos.

## 4. Gaps importantes, mas não bloqueantes

1. **Sem comparação visual automatizada do PDF com os PDFs antigos.** O layout é orientativo e robusto, mas não há teste de regressão visual ou snapshot textual.

2. **Endereço completo é fragmentado.** Os cadastros têm endereço, bairro, CEP, município e UF, mas as variáveis disponíveis atualmente não cobrem todos os fragmentos para cooperativa e destinatário final.

3. **Painel de variáveis da tela de modelos está defasado em relação ao `buildVars`.** O código aceita algumas variáveis que não aparecem para o usuário, como `produtor_ie`, `cooperativa_nome`, `cooperativa_cnpj` e `cooperativa_ie`.

4. **A prévia permite editar campos principais, mas não mostra CST/CFOP/NCM em formulário dedicado.** Esses dados aparecem no PDF, mas a revisão operacional na tela poderia ser mais clara.

5. **Sem cadastro estruturado de CNDs e retenções.** Hoje esses dados são placeholders em texto, o que atende minimamente ao Excel, mas não garante controle histórico ou reaproveitamento.

6. **Sem bloqueio específico para produto sem NCM/CST quando a geração prossegue por warnings.** O `podeGerar` considera NCM e CST, mas o fluxo ainda permite seguir se houver modelo e apenas warnings em determinados casos.

## 5. Arquivos/funções investigados

- `src/lib/grl019.ts`
  - `parseGrl019`: importa o Excel, detecta cabeçalho, mapeia colunas e converte preço em número.
  - `str`: converte contrato, contrato vinculado e contrato cliente para texto.
  - `toNumber`: converte preço da saca/valor unitário com ICMS para número.
  - `findVinculado`: localiza vínculo oficialmente pela coluna `CONTRATO VINCULADO`.
  - `summarize`: conta recebimentos, expedições e vínculos.

- `src/lib/resolve.ts`
  - `resolveContrato`: concentra regra de cooperativa, tipo de contrato, modelo, operação casada, produto, armazém/destinatário e validações.
  - `findTiposAtivos`: resolve tipo por cooperativa, código de contrato e `TP FATURAMENTO`.
  - `findModeloAtivo`/`modeloLiberadoPara`: validam modelo ativo e liberado para a cooperativa.
  - Constantes `SACA_KG` e `QUANTIDADE_PADRAO` definem cálculo unitário e quantidade inicial.

- `src/lib/nota.ts`
  - `buildNota`: monta a nota para prévia/PDF, incluindo emitente, destinatário, produto, CST, quantidade, valores e dados adicionais.
  - `buildVars`: monta variáveis disponíveis para template.
  - `renderTemplate`: substitui `{{variavel}}` por valores ou placeholder `####`.
  - `hasPendingPlaceholders`: detecta placeholders pendentes.
  - `buildNotaPdfFileName`: monta nome padronizado do PDF preservando contratos como texto.

- `src/lib/pdf.ts`
  - `generatePdf`/`pdfDataUri`: geram PDF com jsPDF.
  - `drawNota`: compõe cabeçalho, natureza, emitente, destinatário, produto, impostos, transporte e dados adicionais.
  - `drawProductTable`: exibe produto, NCM, CST, CFOP, unidade, quantidade, valor unitário e total.
  - `drawAdditionalData`: quebra dados adicionais em páginas para evitar corte visual.

- `src/pages/Pesquisa.tsx`
  - Tela operacional de pesquisa e geração.
  - Bloqueia geração direta por expedição vinculada.
  - Oferece diálogo para gerar apenas 5118 ou 5118 + 5923 quando há operação casada.
  - Para 5132, gera somente o modelo parametrizado.

- `src/pages/Preview.tsx`
  - Prévia editável antes do PDF.
  - Permite alterar quantidade, valor unitário, datas, frete, placa, transportador, dados adicionais e observação.
  - Recalcula total quando quantidade ou valor unitário mudam.
  - Avisa sobre placeholders pendentes, mas não bloqueia geração.

- `src/pages/Importar.tsx`
  - Fluxo de importação do GRL019.
  - Mostra diagnóstico de colunas e resumo do relatório.
  - Executa pré-cadastro de destinatários/armazéns a partir de linhas de expedição.

- `src/lib/db.ts`
  - Hooks de cadastro e persistência Supabase.
  - `syncArmazensFromGrl019`: cria/atualiza armazéns somente com linhas de expedição.
  - `useModelos`/`useSaveModelo`: carregam e salvam modelos com liberação N:N por cooperativa.

- `src/pages/cadastros/ModelosNota.tsx`
  - Tela de cadastro de modelos.
  - Permite configurar CFOP, tipo de destinatário, natureza, frete padrão, CST ICMS padrão, cooperativas liberadas e template de dados adicionais.
  - Lista parcial de variáveis disponíveis para o usuário.

- `src/lib/types.ts`
  - Tipos de domínio: cooperativa, armazém, produto, modelo de nota, tipo de contrato e linha GRL019.
  - Confirma a existência dos campos necessários para vários cadastros, mas também evidencia campos ausentes para template estruturado de CND/retenções.

- `src/lib/grl019.test.ts`, `src/lib/resolve.test.ts`, `src/lib/nota.test.ts`
  - Cobrem importação, vínculo, operação casada, CST por modelo, destinatário do 5923 e templates básicos.
  - Não cobrem ainda os três PDFs antigos como critérios funcionais completos.

- `supabase/migrations/20260609120000_add_cst_icms_padrao_modelos_nota.sql`
  - Migração que adiciona CST ICMS padrão por modelo de nota.

## 6. Plano de correção sugerido

### Etapa 1: parametrização e CST por modelo

- Confirmar nos cadastros reais que:
  - 5118 está com CST 51;
  - 5923 está com CST 41;
  - 5132 está com CST 51.
- Ajustar `buildNota` para respeitar `modelo.tipo_destinatario`, mantendo fallback por CFOP para compatibilidade.
- Criar testes unitários para 5118, 5923 e 5132 verificando CFOP, CST, destinatário e operação casada.

### Etapa 2: dados adicionais e variáveis

- Expandir `buildVars` com variáveis faltantes:
  - CFOP, CST, produtor IE;
  - cooperativa endereço, bairro, CEP, município, UF, telefone;
  - destinatário final bairro, CEP, telefone;
  - motorista, NF referenciada;
  - CND destinatário final;
  - Funrural/retenção valor e base.
- Atualizar o painel de variáveis em `ModelosNota.tsx` para refletir exatamente o que o motor de template suporta.
- Criar templates padrão dos três modelos com base nos PDFs antigos, sem hardcode fiscal no código de geração.

### Etapa 3: contrato vinculado e destinatário final

- Manter o vínculo oficial por `CONTRATO VINCULADO`.
- Validar explicitamente quando o tipo de contrato exige vínculo e ele não existe.
- Garantir que 5132 possa usar dados de expedição/destino final nos dados adicionais sem gerar 5923.
- Adicionar alerta quando contrato esperado com zeros à esquerda parecer descaracterizado.

### Etapa 4: revisão do PDF

- Gerar PDFs de teste dos três modelos com os dados dos exemplos antigos.
- Comparar visualmente campos obrigatórios: emitente, destinatário, natureza, CFOP, CST, NCM, quantidade, valores, frete, dados adicionais e observação orientativa.
- Ajustar apenas espaçamento/quebras se os dados adicionais ficarem difíceis de ler.
- Evitar criar novo layout paralelo; evoluir `src/lib/pdf.ts`.

### Etapa 5: validações antes da geração

- Transformar placeholders críticos pendentes em bloqueio ou modal de confirmação forte.
- Validar NCM, CST, destinatário final, contrato vinculado, modelo, tipo de contrato e textos essenciais por CFOP.
- Exibir checklist de pendências na prévia antes do botão de PDF.
- Criar testes cobrindo bloqueios principais.

## 7. Critérios de aceite

### Critérios gerais

- [ ] Contrato e contrato vinculado são preservados como texto.
- [ ] Contratos com zeros à esquerda aparecem corretamente no PDF e no nome do arquivo quando importados corretamente.
- [ ] O sistema alerta quando houver suspeita de contrato descaracterizado.
- [ ] Preço por KG = preço da saca / 60.
- [ ] Valor total = quantidade KG × valor unitário.
- [ ] Quantidade e valor unitário podem ser alterados na prévia.
- [ ] Total recalcula automaticamente após alteração.
- [ ] PDF não é gerado silenciosamente com placeholders críticos pendentes.
- [ ] Dados adicionais não estouram visualmente no PDF.
- [ ] Valores aparecem em padrão brasileiro.
- [ ] Quantidade aparece de forma legível.
- [ ] Documento orientativo deixa claro que não possui validade fiscal.

### Aceite do 5118

- [ ] Emitente é o produtor/agricultor da linha de recebimento.
- [ ] Destinatário é a cooperativa cadastrada.
- [ ] CFOP é 5118.
- [ ] CST ICMS é 51 por parametrização do modelo.
- [ ] Natureza da operação corresponde ao texto esperado do PDF antigo.
- [ ] Produto, NCM, unidade, quantidade, valor unitário e valor total conferem com o exemplo.
- [ ] Dados adicionais incluem ICMS diferido, PROCON MT, confirmação de negócio, contrato cliente/Cargill, entrega na Cargill, Funrural/base, placa cavalo e CNDs da cooperativa e do produtor.
- [ ] Se o contrato estiver parametrizado como operação casada, o usuário pode gerar apenas 5118 ou 5118 + 5923.

### Aceite do 5923

- [ ] Emitente é o produtor/agricultor.
- [ ] Destinatário é o armazém/destinatário final da expedição vinculada ou cadastro equivalente.
- [ ] CFOP é 5923.
- [ ] CST ICMS é 41 somente neste modelo.
- [ ] Natureza da operação corresponde à remessa por conta e ordem de terceiros em venda à ordem.
- [ ] Dados adicionais incluem ICMS não tributado/CST 041, motorista, PROCON MT, confirmação de negócio, contrato cliente/Cargill, referência à NF 5118/5120, dados completos da cooperativa, placa cavalo, CND do destinatário final e CND do produtor.
- [ ] Linha de expedição vinculada é usada como fonte de destinatário/local, não como nota emitida pela cooperativa.
- [ ] Geração direta por expedição vinculada continua bloqueada/orientada.

### Aceite do 5132

- [ ] Emitente é o produtor/agricultor.
- [ ] Destinatário é a cooperativa.
- [ ] CFOP é 5132.
- [ ] CST ICMS é 51 por parametrização do modelo.
- [ ] Natureza da operação corresponde à fixação de preço de produção do estabelecimento.
- [ ] O modelo 5132 é emitido sozinho e não gera 5923 automaticamente.
- [ ] Quantidade de 600.000 KG pode ser informada sem limitação ou retorno indevido para 30.000 KG.
- [ ] Contrato como `0000431969` é preservado quando vem preservado do GRL019.
- [ ] Dados adicionais podem informar destinatário/local final, como COFCO, sem gerar operação casada.
- [ ] Dados adicionais incluem ICMS diferido, PROCON MT, confirmação de negócio, contrato, entrega final, valor/base, placa cavalo e CNDs da cooperativa e do produtor.

## 8. Status após implementação deste PR

Esta análise foi escrita como diagnóstico pré-implementação. Após os ajustes do PR, os seguintes pontos passaram a estar endereçados no código:

- `modelo.tipo_destinatario` passou a influenciar a montagem do destinatário da nota, mantendo fallback legado por CFOP para cadastros antigos.
- As variáveis de dados adicionais foram ampliadas para cobrir contrato, confirmação de negócio, produtor, cooperativa, destinatário final/armazém, produto/modelo fiscal, transporte, CNDs e retenções.
- A tela de Modelos de Nota passou a listar as mesmas variáveis suportadas pelo motor de template.
- A prévia passou a exigir confirmação explícita antes de gerar PDF com placeholders pendentes.
- Foi adicionada quantidade padrão por modelo (`quantidade_padrao`) como sugestão inicial editável na prévia.
- Foi adicionada validação não bloqueante para suspeita de contrato 5132 descaracterizado sem zeros à esquerda, sem corrigir automaticamente o contrato.
- Foram documentados templates recomendados em `docs/modelos/templates-dados-adicionais-5118-5923-5132.md` para cadastro manual.

Permanecem fora do escopo deste PR, por segurança:

- cadastro estruturado de CNDs, motorista, NF referenciada e retenções;
- alteração do layout do PDF;
- emissão fiscal real;
- mudança no fluxo de operação casada 5118 + 5923;
- liberação de geração direta por linha de expedição;
- mudança na regra do 5132 ser gerado sozinho.
