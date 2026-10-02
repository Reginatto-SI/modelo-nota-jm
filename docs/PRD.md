# PRD — Modelo de Nota JM

**Versão consolidada:** 2026-10-02  
**Status:** documento oficial de produto  
**Sistema:** Modelo de Nota JM

---

## 1. Objetivo do sistema

Criar e manter uma ferramenta web interna da JM Assessoria para geração de **modelos orientativos de notas fiscais** destinados a produtores rurais.

O sistema deve reduzir erros manuais, padronizar a orientação enviada ao produtor e permitir que a equipe JM gere PDFs a partir de fontes operacionais reais.

O sistema possui dois fluxos principais:

1. **Gerar modelo por contrato — GRL019**
2. **Gerar modelo avulso — RFT006**

O sistema **não emite NF-e real**, **não transmite para a SEFAZ**, **não utiliza certificado digital** e **não possui validade fiscal como documento eletrônico**. Ele gera somente um modelo orientativo para auxiliar a emissão correta pelo produtor.

---

## 2. Identidade visual

O sistema deve seguir o Design System JM.

Regras principais:

- nome exibido: **Modelo de Nota JM**;
- logo JM;
- azul escuro como cor principal;
- fonte padrão `system-ui`;
- layout limpo, corporativo e objetivo;
- menu lateral padronizado;
- cards, tabelas e formulários com baixa complexidade visual;
- priorizar operação rápida e pouca fricção.

Alterações visuais não devem criar um padrão paralelo ao restante dos sistemas JM.

---

## 3. Tipo de sistema

O sistema é uma ferramenta interna empresarial.

Não é SaaS.

Não existe necessidade atual de:

- tenant;
- segregação multiempresa por login;
- emissão fiscal;
- integração direta com SEFAZ.

Os cadastros do sistema possuem finalidade operacional e de parametrização.

---

## 4. Navegação principal

No menu lateral, os dois fluxos de geração devem aparecer de forma distinta:

- **Gerar modelo por contrato — GRL019**
- **Gerar modelo avulso — RFT006**

O usuário deve compreender imediatamente qual origem de dados está utilizando.

O fluxo RFT006 não deve ser transformado artificialmente em GRL019 e não deve reutilizar regras de casamento de contratos.

---

# PARTE A — FLUXO GRL019

## 5. Objetivo do fluxo GRL019

Gerar modelos orientativos com base em contratos de compra e venda de grãos importados pelo relatório GRL019.

O fluxo deve:

1. importar o GRL019;
2. armazenar o relatório localmente;
3. localizar contratos;
4. identificar contrato vinculado quando aplicável;
5. identificar a cooperativa;
6. consultar parametrizações;
7. gerar modelos orientativos;
8. permitir revisão;
9. gerar PDF.

---

## 6. Armazenamento do GRL019

O GRL019 é uma fonte operacional temporária.

Ele não deve ser salvo no banco de dados.

Preferir IndexedDB ou estratégia local equivalente já homologada.

O relatório permanece disponível até:

- substituição por novo arquivo;
- limpeza manual;
- limpeza dos dados locais do navegador.

---

## 7. Colunas principais do GRL019

O sistema utiliza principalmente:

| Coluna | Uso |
|---|---|
| `CONTRATO` | contrato principal |
| `CONTRATO VINCULADO` | contrato relacionado |
| `EMPRESA` | cooperativa |
| `TP FATURAMENTO` | recebimento/expedição |
| `COD.CONTRATO` | código do tipo de contrato |
| `DESC.CONTRATO` | descrição |
| `NOME/RAZÃO SOCIAL` | produtor ou destinatário |
| `CPF/CNPJ` | documento |
| `I.E.` | inscrição estadual |
| `ENDEREÇO` | endereço |
| `MUNICÍPIO` | município |
| `ESTADO` | UF |
| `COD.ITEM` | código do produto |
| `DESC.ITEM` | produto |
| `PREÇO UNIT. C/ICMS` | preço da saca |
| `TP FRETE` | frete |
| `OBSERVAÇÃO` | observações |

Contrato e contrato vinculado devem ser tratados como texto para preservar zeros à esquerda quando a origem fornecer corretamente.

---

## 8. Cadastros persistentes

O sistema deve possuir cadastros persistentes para:

- cooperativas;
- armazéns/destinatários;
- produtos;
- tipos de contrato;
- modelos de nota;
- dados adicionais/templates.

Esses cadastros podem ser reutilizados pelo fluxo RFT006 quando fizer sentido, especialmente destinatários e templates, sem acoplar os dois importadores.

---

## 9. Cooperativas

Campos mínimos:

- nome utilizado no GRL019;
- razão social;
- CNPJ;
- inscrição estadual;
- endereço;
- bairro;
- CEP;
- município;
- UF;
- telefone;
- e-mail;
- ativo/inativo.

A cooperativa deve ser identificada pela coluna `EMPRESA`.

---

## 10. Armazéns e destinatários

Campos mínimos:

- razão social;
- CNPJ/CPF;
- inscrição estadual;
- endereço;
- bairro;
- CEP;
- município;
- UF;
- telefone;
- tipo;
- ativo/inativo.

O cadastro deve ser reutilizável também como destinatário do Modelo Avulso RFT006.

---

## 11. Produtos

No fluxo GRL019, os produtos podem possuir cadastro global com:

- código;
- descrição;
- NCM;
- CST de fallback;
- unidade;
- ativo/inativo.

A CST deve priorizar a parametrização do modelo quando houver.

---

## 12. Tipos de contrato

O tipo de contrato deve ser parametrizado por cooperativa.

Campos mínimos:

- cooperativa;
- código;
- descrição;
- tipo de faturamento;
- modelo/CFOP vinculado;
- exige contrato vinculado;
- gera operação casada;
- ativo/inativo.

O sistema não deve inferir o modelo somente pela descrição textual do contrato.

---

## 13. Modelos GRL019 homologados

O sistema deve preservar os modelos atuais:

- **CFOP 5118**
- **CFOP 5923**
- **CFOP 5132**

### 13.1 CFOP 5118

- emitente: produtor/agricultor;
- destinatário: cooperativa;
- produto: GRL019 + cadastro;
- CST: parametrização do modelo;
- quantidade: editável;
- valor unitário: preço da saca / 60;
- valor total: quantidade × valor unitário.

Pode ser gerado sozinho ou em operação casada com 5923.

### 13.2 CFOP 5923

- emitente: produtor/agricultor;
- destinatário: armazém/destinatário final;
- base para localizar destinatário: linha vinculada de expedição;
- linha de expedição não deve virar uma nota da cooperativa;
- CST: parametrização do modelo;
- quantidade e valores editáveis.

### 13.3 CFOP 5132

- emitente: produtor/agricultor;
- destinatário: cooperativa;
- gerado sozinho;
- não deve gerar 5923 automaticamente;
- deve aceitar quantidades diferentes de 30.000 KG;
- contrato deve permanecer como texto.

---

## 14. Casamento de contratos

A regra oficial é:

- `CONTRATO`;
- `CONTRATO VINCULADO`.

Não utilizar como regra oficial a suposição de contrato menor/maior.

---

## 15. Prévia GRL019

Antes de gerar o PDF, permitir revisão dos campos editáveis, incluindo quando aplicável:

- datas;
- quantidade;
- valor unitário;
- valor total;
- frete;
- placa;
- transportador;
- dados adicionais;
- CND;
- observações.

As regras homologadas do GRL019 devem permanecer preservadas durante a implementação do RFT006.

---

# PARTE B — FLUXO RFT006

## 16. Objetivo do Modelo Avulso RFT006

Permitir que a JM gere modelos orientativos de nota a partir de um relatório de faturamento RFT006 da empresa VERDENA.

Contexto operacional:

- a VERDENA possui faturamentos para agricultores;
- esses agricultores precisam emitir uma nova nota para uma associação/empresa terceira;
- a JM não possui acesso ao sistema da associação terceira;
- os dados do RFT006 servem como fonte para montar o modelo orientativo.

No novo modelo:

- **agricultor do RFT006 = emitente**;
- **destinatário = associação/empresa cadastrada no sistema**;
- **VERDENA = somente origem do relatório**.

A VERDENA não deve ser transformada automaticamente em emitente ou destinatário.

---

## 17. Arquivo RFT006

O arquivo analisado possui relatório de faturamento por cliente e item.

O cabeçalho interno pode aparecer como `RFT6`, mas o nome funcional do recurso deve ser **RFT006**.

O importador RFT006 deve ser independente do importador GRL019.

---

## 18. Colunas utilizadas do RFT006

Utilizar principalmente:

| Coluna | Uso |
|---|---|
| `Nota` | chave de agrupamento e documento de referência |
| `Cont/Ped` | informação auxiliar |
| CFOP numérico em `C.F.O` | elegibilidade da origem |
| `Descricao` | descrição do item |
| `Ps.Liq` | fonte prioritária de quantidade quando maior que zero |
| `UN` | unidade |
| `Qtde` | fonte alternativa da quantidade |
| `Vl.Unit` | valor unitário |
| `Vl.Total` | valor bruto |
| `Vl.Dsct` | desconto |
| `Vl.Liq.` | valor líquido |
| `CNPJ` | CPF/CNPJ do emitente |
| `IE` | inscrição estadual do emitente |
| `Razão Social` | nome/razão social do emitente |
| `NCM ITEM` | NCM |
| `Clifor` | referência auxiliar |
| `Municipio` | município do emitente |

O parser não deve depender exclusivamente de um cabeçalho renomeado automaticamente como `C.F.O.1`. Deve localizar corretamente a coluna numérica de CFOP.

---

## 19. Elegibilidade do RFT006

A coluna `Cont/Ped` não será a regra principal de elegibilidade.

Uma linha será elegível quando o CFOP numérico normalizado começar com:

- `5`; ou
- `6`.

Para este recurso, essa regra identifica operações de saída elegíveis.

Não assumir que todo CFOP 5xxx/6xxx possui a mesma natureza fiscal.

### Normalização

O sistema deve:

- aceitar CFOP como texto ou número;
- remover espaços/formatações indevidas;
- normalizar para código legível;
- validar o primeiro dígito.

### CFOP da origem x CFOP do novo modelo

O CFOP importado do RFT006 serve **somente para validar a elegibilidade da origem**.

Ele não deve ser usado automaticamente como CFOP da nova nota.

O CFOP do novo modelo vem da configuração padrão do Modelo Avulso ou de alteração consciente do usuário.

---

## 20. Agrupamento por Nota

A unidade de geração do fluxo avulso é a coluna `Nota`.

Regras:

- uma Nota = um modelo;
- todas as linhas elegíveis da mesma Nota compõem os itens;
- uma Nota pode possuir vários produtos;
- duas Notas do mesmo agricultor permanecem separadas;
- não consolidar automaticamente documentos diferentes.

Se uma mesma Nota possuir linhas elegíveis e não elegíveis, não gerar um documento parcial silenciosamente.

Nesse caso:

- marcar a Nota como inconsistente;
- bloquear a geração;
- informar o problema.

---

## 21. Emitente do modelo avulso

Origem:

- nome: `Razão Social`;
- CPF/CNPJ: `CNPJ`;
- IE: `IE`;
- município: `Municipio`;
- referência auxiliar: `Clifor`.

Não identificar o estabelecimento somente pelo CPF/CNPJ.

Quando necessário, distinguir pelo conjunto:

- CPF/CNPJ;
- IE.

Endereço completo do emitente não é obrigatório nesta primeira versão do modelo avulso.

---

## 22. Destinatário do modelo avulso

O destinatário não vem do RFT006.

Ele deve ser selecionado a partir do cadastro persistente de armazéns/destinatários.

O sistema deve permitir:

- cadastrar a associação/empresa;
- selecionar outro destinatário quando necessário;
- definir um **destinatário padrão do Modelo Avulso RFT006**;
- carregar esse destinatário automaticamente na geração;
- alterar antes do PDF.

Não hardcodar os dados da associação no código.

---

## 23. Configuração padrão do Modelo Avulso

Criar uma configuração persistente para:

- destinatário padrão;
- CFOP do novo modelo;
- natureza da operação;
- CST;
- template de dados adicionais;
- status, se aplicável.

A configuração deve facilitar o uso recorrente.

Alterações feitas em uma nota específica não devem sobrescrever o padrão automaticamente.

Quando houver ação para promover alterações para o padrão, ela deve ser explícita, por exemplo:

**Salvar esta configuração como padrão**.

---

## 24. Produtos e itens do RFT006

O modelo avulso deve aceitar N itens.

O produto importado do RFT006 não precisa estar previamente cadastrado no cadastro global de produtos.

Origem:

| Campo | Origem |
|---|---|
| Descrição | `Descricao` |
| NCM | `NCM ITEM` |
| Unidade | `UN` |
| Quantidade | `Ps.Liq` quando > 0; senão `Qtde` |
| Valor unitário | `Vl.Unit` |
| Valor bruto | `Vl.Total` |
| Desconto | `Vl.Dsct` |
| Valor líquido | `Vl.Liq.` |

Na primeira versão, espelhar os valores importados.

Não recalcular e substituir automaticamente o conteúdo do relatório.

---

## 25. Documento de referência

A coluna `Nota` também será o documento de referência utilizado nos dados adicionais.

Disponibilizar a variável:

`{{nota_referencia}}`

Exemplo de uso em template:

`Documento de referência: NF nº {{nota_referencia}}`

O texto deve ser parametrizável e não hardcoded no renderer.

---

## 26. Variáveis do Modelo Avulso

Disponibilizar quando houver origem real:

### Emitente

- `{{emitente_nome}}`
- `{{emitente_cpf_cnpj}}`
- `{{emitente_ie}}`
- `{{emitente_municipio}}`

### Destinatário

- `{{destinatario_nome}}`
- `{{destinatario_razao_social}}`
- `{{destinatario_cnpj}}`
- `{{destinatario_ie}}`
- `{{destinatario_endereco_completo}}`

### Documento e fiscal

- `{{nota_referencia}}`
- `{{cfop}}`
- `{{cst}}`
- `{{natureza_operacao}}`

### Totais

Quando suportado com segurança:

- `{{valor_total}}`
- `{{valor_desconto}}`
- `{{valor_liquido}}`

---

## 27. Tela de importação RFT006

Após importar:

1. validar a estrutura;
2. localizar a coluna numérica de CFOP;
3. classificar registros elegíveis;
4. agrupar por Nota;
5. exibir as Notas disponíveis.

A interface principal não deve mostrar as centenas de linhas cruas como unidade operacional.

### Grade sugerida

- seleção;
- Nota;
- emitente;
- CPF/CNPJ;
- IE;
- quantidade de itens;
- valor líquido;
- situação;
- ação.

Situações possíveis:

- Pronto;
- CFOP não elegível;
- CFOPs mistos;
- emitente inconsistente;
- dados obrigatórios ausentes.

---

## 28. Geração individual

Ao selecionar uma Nota:

1. carregar todos os itens;
2. carregar configuração padrão;
3. carregar destinatário padrão;
4. abrir a prévia;
5. permitir edição;
6. gerar PDF.

Na prévia, permitir editar quando aplicável:

- emitente;
- CPF/CNPJ;
- IE;
- destinatário;
- CFOP;
- CST;
- natureza;
- dados adicionais;
- descrição;
- NCM;
- unidade;
- quantidade;
- valor unitário;
- valor bruto;
- desconto;
- valor líquido.

As alterações da prévia:

- valem somente para a geração atual;
- não alteram o Excel original;
- não alteram automaticamente cadastros;
- não alteram automaticamente a configuração padrão.

---

## 29. Geração em lote

O usuário deve poder selecionar várias Notas elegíveis.

Aplicar uma configuração comum ao lote:

- destinatário;
- CFOP;
- CST;
- natureza;
- dados adicionais.

Antes da geração, mostrar quantos modelos serão gerados.

Cada Nota deve poder ser:

- visualizada;
- editada individualmente.

A edição individual funciona como override somente daquela Nota.

Ao confirmar:

- gerar um PDF independente por Nota;
- não consolidar notas diferentes;
- manter os itens pertencentes a cada Nota.

---

## 30. PDF com múltiplos itens

O renderer deve suportar:

- múltiplas linhas de produto;
- notas com muitos itens;
- quebra de página;
- legibilidade;
- ausência de sobreposição;
- continuidade visual correta.

A implementação do RFT006 não deve quebrar o PDF homologado do GRL019.

Caso o renderer atual seja fortemente acoplado a um único item, aplicar a menor extensão necessária.

---

# PARTE C — REGRAS COMPARTILHADAS

## 31. Prévia obrigatória

Os dois fluxos devem oferecer revisão antes do PDF.

O sistema deve permitir corrigir informações operacionais sem exigir nova importação quando a correção for intencional e limitada à geração atual.

---

## 32. Dados adicionais

Os textos fiscais e observações devem permanecer parametrizáveis.

Não hardcodar textos fiscais no renderer.

Placeholders pendentes devem ser claramente sinalizados.

---

## 33. PDF orientativo

Todo PDF deve deixar claro que se trata de documento orientativo.

Texto recomendado:

> Este documento é um modelo orientativo para emissão da Nota Fiscal pelo produtor rural. Não possui validade fiscal como NF-e.

Rodapé:

> Gerado por JM Assessoria e Contabilidade MT.

---

## 34. Validações

O sistema deve bloquear ou alertar conforme a criticidade.

### GRL019

Validar, entre outros:

- relatório importado;
- cooperativa;
- contrato;
- vínculo quando necessário;
- tipo de contrato;
- modelo;
- produto;
- NCM;
- CST;
- destinatário;
- quantidade;
- valores;
- placeholders.

### RFT006

Validar, entre outros:

- arquivo reconhecido;
- cabeçalhos;
- coluna de CFOP;
- CFOP elegível;
- Nota;
- consistência do emitente;
- ao menos um item;
- NCM;
- unidade;
- quantidade;
- valores;
- destinatário;
- CFOP do novo modelo;
- CST;
- natureza;
- placeholders.

---

## 35. Regra de ouro

O sistema deve gerar modelos somente com base em:

- dados reais dos relatórios importados;
- cadastros persistentes;
- parametrizações;
- templates;
- edições conscientes do usuário.

O sistema não deve inventar:

- emitente;
- destinatário;
- CFOP;
- CST;
- NCM;
- vínculo;
- textos adicionais;
- dados cadastrais.

Quando um dado obrigatório estiver ausente, informar e permitir correção.

---

## 36. Armazenamento e histórico

Na primeira versão do RFT006:

- não é necessário histórico permanente de modelos gerados;
- não é necessário salvar no banco a relação Nota → PDF;
- não salvar o relatório RFT006 no backend apenas para esta funcionalidade.

O relatório é operacional.

Preferir armazenamento local ou estado isolado no navegador.

---

## 37. Fora do escopo atual

Não implementar sem nova decisão:

- emissão real de NF-e;
- transmissão para SEFAZ;
- certificado digital;
- assinatura digital;
- escrituração fiscal;
- integração direta com ERP;
- alteração automática do arquivo de origem;
- consolidação de várias Notas RFT006;
- cadastro obrigatório de todos os produtos RFT006;
- histórico permanente RFT006;
- inferência fiscal automática por descrição;
- refatoração ampla do fluxo GRL019;
- alteração de dados reais, migration ou backfill sem autorização explícita.

---

## 38. Critérios de aceite — RFT006

A funcionalidade estará apta para homologação quando:

- [ ] o menu diferenciar GRL019 e RFT006;
- [ ] o RFT006 puder ser importado;
- [ ] a coluna numérica de CFOP for identificada;
- [ ] somente registros elegíveis 5xxx/6xxx entrarem no fluxo;
- [ ] `Cont/Ped` não for o critério principal;
- [ ] os itens forem agrupados por Nota;
- [ ] cada Nota gerar um modelo independente;
- [ ] múltiplos itens forem suportados;
- [ ] Notas do mesmo agricultor permanecerem separadas;
- [ ] emitente vier do RFT006;
- [ ] destinatário vier do cadastro;
- [ ] existir destinatário padrão;
- [ ] existir configuração padrão de CFOP/CST/natureza/dados adicionais;
- [ ] exceções não sobrescreverem o padrão;
- [ ] produtos não exigirem cadastro prévio;
- [ ] valores forem espelhados;
- [ ] `{{nota_referencia}}` funcionar;
- [ ] a prévia individual for editável;
- [ ] lote permitir configuração comum;
- [ ] lote permitir override individual;
- [ ] cada Nota gerar seu próprio PDF;
- [ ] PDF suportar múltiplos itens;
- [ ] o fluxo GRL019 continuar funcionando sem regressão.

---

## 39. Diretrizes para implementação

O desenvolvimento deve ser incremental.

Antes de alterar código:

1. localizar navegação/menu;
2. localizar importador GRL019;
3. localizar cadastro de destinatários;
4. localizar templates/configuração fiscal;
5. localizar prévia;
6. localizar renderer de PDF;
7. identificar reutilização segura.

Reutilizar componentes existentes quando isso não misturar regras de negócio.

Evitar:

- arquitetura paralela desnecessária;
- refatorações grandes;
- alterações fora do escopo;
- regressões no GRL019.

---

## 40. Documentos de apoio

Documentos complementares:

- `docs/Analises/analise-modelo-avulso-rft006.md`
- `docs/Analises/analise-modelos-nota-5118-5923-5132.md`
- `docs/modelos/templates-dados-adicionais-5118-5923-5132.md`

O presente arquivo `docs/PRD.md` é o documento oficial de escopo do produto. Os arquivos de `Analises` servem como suporte técnico e histórico de decisões.
