# Especificação funcional — Modelo de Nota Avulsa via RFT006

**Projeto:** Modelo de Nota JM  
**Status:** aprovado para implementação  
**Data:** 2026-10-02  
**Origem analisada:** `RFT006 - Modelo de notas Emitidas.xlsx`  
**Observação:** o cabeçalho interno do relatório pode aparecer como `RFT6`; no sistema e nesta documentação usar `RFT006`.

---

## 1. Objetivo

Adicionar ao Modelo de Nota JM um novo fluxo para gerar **modelos orientativos de nota avulsa** a partir do relatório de faturamento RFT006 da empresa VERDENA.

Esse fluxo é independente da geração atual baseada em contratos do GRL019.

Na operação avulsa:

- os dados do agricultor presentes no RFT006 serão usados como **emitente** do novo modelo;
- os produtos e valores virão do RFT006;
- o destinatário será uma empresa/associação cadastrada no sistema;
- CFOP, CST, natureza da operação e dados adicionais serão definidos pela configuração do modelo avulso;
- o sistema continuará gerando apenas PDF orientativo, sem emitir NF-e real.

A VERDENA é apenas a origem do relatório. Ela não será automaticamente o emitente nem o destinatário do novo modelo.

---

## 2. Separação no menu lateral

O fluxo atual deve ficar claramente separado do novo fluxo.

### Nomenclatura desejada

- **Gerar modelo por contrato — GRL019**
- **Gerar modelo avulso — RFT006**

Não transformar o RFT006 em um GRL019 artificial nem compartilhar regras de casamento de contratos com o novo fluxo.

O novo recurso pode reutilizar componentes existentes de destinatário, prévia, edição, templates e PDF quando isso for seguro, mas deve possuir parser e estado operacional próprios.

---

## 3. Fonte de dados RFT006

O RFT006 é um relatório de faturamento por cliente/produto.

No arquivo analisado, a linha de cabeçalho contém duas colunas chamadas `C.F.O`:

1. uma coluna textual, com código + descrição da operação;
2. uma coluna numérica, com o CFOP.

Ao importar com bibliotecas que renomeiam cabeçalhos duplicados, a segunda pode aparecer como algo como `C.F.O.1`.

### Regra

Para validar a elegibilidade do registro, utilizar o **CFOP numérico**, e não depender do nome `C.F.O.1` hardcoded.

O parser deve localizar a coluna correta pelo cabeçalho/posição/conteúdo de forma robusta.

---

## 4. Regra de elegibilidade pelo CFOP

A coluna `Cont/Ped` **não será mais o critério de aceitação** do RFT006.

A elegibilidade será determinada pelo CFOP numérico.

### Registros elegíveis

Uma linha é elegível para o fluxo de modelo avulso quando o CFOP normalizado começar com:

- `5`; ou
- `6`.

Esses grupos representam operações de **saída**.

> Importante: não assumir tecnicamente que todo CFOP 5xxx/6xxx representa venda. Existem outras operações de saída nesses grupos. Para este recurso, a regra de produto aprovada é usar 5xxx/6xxx como critério operacional de elegibilidade do RFT006.

### Normalização

Antes da validação, o sistema deve:

- remover espaços;
- aceitar valor numérico ou texto;
- remover formatação indevida, se houver;
- obter o CFOP em formato de quatro dígitos quando possível;
- validar o primeiro dígito.

Exemplos elegíveis:

- `5102`
- `5910`
- `5908`
- `6102`

Exemplos não elegíveis:

- `1102`
- `2102`
- CFOP ausente;
- CFOP inválido.

### Nota com CFOPs mistos

A geração é agrupada por `Nota`.

Se uma mesma `Nota` possuir linhas elegíveis e não elegíveis, o sistema **não deve gerar somente uma parte da nota silenciosamente**.

Nesse caso:

- marcar a nota como inconsistente;
- bloquear a geração;
- informar que existem CFOPs mistos/incompatíveis;
- exigir correção da origem ou revisão consciente do usuário antes de qualquer evolução dessa regra.

---

## 5. Colunas utilizadas

Para a primeira versão, utilizar principalmente:

| Coluna RFT006 | Uso |
|---|---|
| `Nota` | Identificador do documento de referência e chave de agrupamento do modelo |
| `Cont/Ped` | Informação auxiliar; não define mais a elegibilidade |
| `C.F.O` numérico | Validação de operação de saída elegível |
| `Descricao` | Descrição do item/produto |
| `Ps.Liq` | Fonte prioritária da quantidade quando maior que zero |
| `UN` | Unidade do item |
| `Qtde` | Fonte alternativa da quantidade quando `Ps.Liq` não for utilizado |
| `Vl.Unit` | Valor unitário |
| `Vl.Total` | Valor total bruto do item |
| `Vl.Dsct` | Desconto do item |
| `Vl.Liq.` | Valor líquido do item |
| `CNPJ` | CPF/CNPJ do emitente |
| `IE` | Inscrição estadual do emitente |
| `Razão Social` | Nome/razão social do emitente |
| `NCM ITEM` | NCM do item |
| `Clifor` | Referência auxiliar interna do cliente/emitente |
| `Municipio` | Informação auxiliar do emitente |

Campos adicionais do RFT006 podem ser mantidos no objeto importado para auditoria operacional, mas não devem se tornar obrigatórios sem necessidade.

---

## 6. Emitente

Todos os dados de agricultor/cliente existentes no RFT006 representam o **emitente do novo modelo**.

### Origem

- razão social: `Razão Social`;
- CPF/CNPJ: `CNPJ`;
- inscrição estadual: `IE`;
- município: `Municipio`, quando útil;
- referência auxiliar: `Clifor`.

### Regra de identidade

Não identificar o emitente somente pelo CPF/CNPJ.

O mesmo CPF/CNPJ pode possuir mais de uma inscrição estadual/propriedade.

Quando necessário para distinguir o estabelecimento, considerar pelo menos:

- CPF/CNPJ;
- IE.

O `Clifor` pode ser mantido como referência interna auxiliar.

### Endereço

Na primeira versão do modelo avulso, endereço completo do emitente **não é obrigatório**.

Não bloquear a geração por ausência de endereço, bairro, CEP ou UF se o modelo aprovado não exigir esses campos.

---

## 7. Destinatário

O destinatário do modelo avulso **não vem do RFT006**.

Ele deve vir do cadastro persistente já existente de armazéns/destinatários.

### Regras

- permitir cadastrar a associação/empresa destinatária no sistema;
- permitir selecionar outro destinatário quando necessário;
- possuir um **destinatário padrão do Modelo Avulso RFT006**;
- ao iniciar a geração, preencher automaticamente o destinatário padrão;
- permitir alteração manual antes de gerar o PDF.

Não hardcodar CNPJ, IE, razão social ou endereço do destinatário na implementação.

---

## 8. Configuração padrão do Modelo Avulso RFT006

Criar uma configuração persistente própria do fluxo avulso.

Campos mínimos:

- destinatário padrão;
- CFOP do novo modelo;
- natureza da operação;
- CST;
- template de dados adicionais;
- status ativo/inativo, se a estrutura atual de cadastros exigir.

### Regra de segurança

O sistema **não deve simplesmente adotar automaticamente o último valor excepcional usado em uma nota como novo padrão**.

Na geração:

- carregar a configuração padrão;
- permitir alterar os valores apenas para aquela geração;
- alterações temporárias não modificam o padrão;
- oferecer ação explícita equivalente a **Salvar esta configuração como padrão** quando fizer sentido.

Isso evita transformar uma exceção fiscal em padrão sem intenção do usuário.

---

## 9. Agrupamento por nota

A unidade de geração será a coluna `Nota`.

### Regra

- uma `Nota` do RFT006 gera **um modelo avulso**;
- todas as linhas elegíveis dessa mesma nota compõem os itens desse modelo;
- uma nota pode possuir vários produtos;
- se o mesmo agricultor possuir duas notas distintas, gerar dois modelos distintos;
- não consolidar automaticamente notas diferentes do mesmo agricultor.

### Validações de consistência

Dentro do mesmo número de `Nota`, validar que os dados principais do emitente não sejam conflitantes.

Se uma mesma nota possuir, por exemplo, CPF/CNPJ ou IE incompatíveis entre linhas, bloquear a geração e sinalizar inconsistência.

---

## 10. Produtos e itens

O modelo avulso deve aceitar **N itens por nota**.

O produto não precisa estar previamente cadastrado no cadastro global de produtos usado pelo GRL019.

### Origem do item

| Campo do modelo | Origem |
|---|---|
| Descrição | `Descricao` |
| NCM | `NCM ITEM` |
| Unidade | `UN` |
| Quantidade | `Ps.Liq` quando maior que zero; caso contrário `Qtde` |
| Valor unitário | `Vl.Unit` |
| Valor total bruto | `Vl.Total` |
| Desconto | `Vl.Dsct` |
| Valor líquido | `Vl.Liq.` |

### Valores

Na primeira versão, os valores devem ser **espelhados do RFT006**.

Não recalcular ou reinterpretar os valores importados sem necessidade.

A prévia pode exibir validações matemáticas como apoio, mas diferenças não devem ser silenciosamente sobrescritas.

---

## 11. Documento de referência

A coluna `Nota` também representa o número do documento de referência que deve poder ser usado nos dados adicionais do novo modelo.

Criar variável de template:

`{{nota_referencia}}`

Exemplo:

`Documento de referência: NF nº {{nota_referencia}}`

O texto final deve continuar parametrizável. Não hardcodar a frase no PDF.

---

## 12. Variáveis sugeridas para o modelo avulso

Disponibilizar, no mínimo:

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

### Documento

- `{{nota_referencia}}`

### Fiscal

- `{{cfop}}`
- `{{cst}}`
- `{{natureza_operacao}}`

### Totais

Quando o motor de templates suportar agregação de itens de forma segura:

- `{{valor_total}}`
- `{{valor_desconto}}`
- `{{valor_liquido}}`

Não criar variáveis sem origem real.

---

## 13. Tela após importação

Após importar o RFT006:

1. validar estrutura do arquivo;
2. identificar a coluna numérica de CFOP;
3. classificar linhas elegíveis e não elegíveis;
4. agrupar por `Nota`;
5. exibir a relação de notas, não as centenas de linhas cruas como interface principal.

### Colunas sugeridas na grade

- seleção;
- Nota;
- emitente;
- CPF/CNPJ;
- IE;
- quantidade de itens;
- valor líquido total;
- situação;
- ação.

### Situações sugeridas

- Pronto;
- CFOP não elegível;
- CFOPs mistos;
- dados do emitente inconsistentes;
- dado obrigatório ausente.

### Ações

- **Gerar modelo desta nota**
- seleção múltipla;
- **Gerar modelos em lote**

---

## 14. Geração avulsa individual

Ao selecionar uma única nota:

1. carregar todos os itens da nota;
2. carregar o destinatário padrão;
3. carregar CFOP, CST, natureza e dados adicionais padrão;
4. abrir uma prévia completa;
5. permitir edição;
6. gerar um PDF orientativo.

### Campos editáveis na prévia

Permitir edição, quando aplicável, de:

- razão social do emitente;
- CPF/CNPJ;
- IE;
- destinatário;
- CFOP;
- CST;
- natureza da operação;
- dados adicionais;
- descrição do item;
- NCM;
- unidade;
- quantidade;
- valor unitário;
- valor total;
- desconto;
- valor líquido;
- demais campos já editáveis no modelo de PDF, quando reutilizados.

### Regra de persistência da edição

As alterações feitas na prévia:

- valem apenas para a geração atual;
- não alteram o arquivo RFT006;
- não alteram automaticamente os cadastros;
- não alteram automaticamente a configuração padrão.

---

## 15. Geração em lote

O usuário deve poder selecionar várias notas elegíveis e gerar os modelos em lote.

### Configuração comum do lote

Antes da geração, aplicar aos modelos selecionados:

- destinatário;
- CFOP;
- CST;
- natureza da operação;
- dados adicionais.

Os valores devem iniciar pela configuração padrão do Modelo Avulso RFT006.

### Revisão

Exibir a quantidade de modelos que serão gerados e a relação de notas.

Cada nota deve poder possuir ação equivalente a:

- Visualizar;
- Editar.

A edição individual funciona como **override daquela nota**, sem alterar as demais notas do lote.

### Geração

Ao confirmar:

- gerar um PDF independente por `Nota`;
- não consolidar agricultores/notas distintos em um único documento fiscal orientativo;
- preservar os itens pertencentes a cada nota.

A forma final de download em lote pode reutilizar o padrão já existente no sistema, desde que não reduza a rastreabilidade de qual PDF pertence a qual nota.

---

## 16. Prévia e múltiplos itens

O PDF e a prévia do novo modelo precisam suportar várias linhas de produto.

### Requisitos

- não limitar o modelo a um único produto;
- preservar descrição, NCM, unidade, quantidade e valores por item;
- suportar notas com muitos itens;
- tratar quebra de página do PDF sem sobreposição;
- repetir cabeçalho de itens em nova página quando necessário, se o renderer atual permitir;
- não alterar o comportamento homologado dos PDFs GRL019 para conseguir suportar múltiplos itens no RFT006.

Se o renderer atual for fortemente acoplado a um único produto, criar a menor extensão reutilizável necessária, sem refatoração ampla do motor homologado.

---

## 17. Armazenamento e histórico

Na primeira versão:

- não é necessário criar histórico permanente de modelos avulsos gerados;
- não é necessário registrar no banco a relação `Nota RFT006 -> PDF gerado`;
- não salvar as linhas do RFT006 no backend apenas para esta funcionalidade.

O RFT006 é uma fonte operacional.

Preferir reutilizar a estratégia local já existente no projeto quando isso não acoplar o fluxo ao GRL019. Caso contrário, manter o estado do RFT006 isolado no navegador.

---

## 18. Validações obrigatórias

Antes da geração, validar:

- arquivo RFT006 reconhecido;
- cabeçalhos mínimos presentes;
- coluna numérica de CFOP identificada;
- CFOP elegível;
- nota válida;
- nota sem mistura de linhas elegíveis/não elegíveis;
- emitente consistente dentro da nota;
- CPF/CNPJ presente;
- IE presente quando exigida pelo modelo;
- ao menos um item;
- descrição do item;
- NCM;
- unidade;
- quantidade válida;
- valor unitário válido;
- destinatário selecionado;
- CFOP do **novo modelo** preenchido;
- CST preenchido;
- natureza da operação preenchida;
- placeholders obrigatórios revisados.

### Distinção importante

O CFOP importado do RFT006 é usado para **classificar a origem como elegível**.

Ele **não deve ser automaticamente usado como CFOP da nova nota**.

O CFOP do novo modelo vem da configuração do Modelo Avulso RFT006 ou de alteração consciente do usuário na prévia.

---

## 19. Alertas

Exibir mensagens objetivas para:

- arquivo incompatível;
- coluna de CFOP não localizada;
- CFOP inválido;
- nota com CFOPs mistos;
- emitente inconsistente;
- item sem NCM;
- quantidade ausente;
- destinatário não configurado;
- configuração fiscal incompleta;
- placeholders pendentes;
- falha ao gerar algum PDF do lote.

Em lote, uma falha em uma nota não deve produzir um PDF incorreto silenciosamente.

A implementação deve definir comportamento transacional seguro: bloquear o lote inteiro ou separar claramente sucessos e falhas, sem ocultar erros.

---

## 20. Fora do escopo inicial

Não implementar nesta etapa:

- emissão real de NF-e;
- transmissão para SEFAZ;
- alteração do RFT006 original;
- gravação automática de histórico;
- consolidação de várias notas em uma só;
- cadastro obrigatório de cada produto importado;
- integração direta com o ERP da VERDENA;
- inferência automática de CFOP/CST/natureza baseada na descrição do produto;
- mudanças na lógica homologada de contrato GRL019;
- refatoração ampla do sistema sem necessidade.

---

## 21. Amostra analisada

No arquivo fornecido para análise foram identificadas:

- 486 linhas de itens;
- 68 números de `Nota` distintos;
- CFOPs numéricos observados: `5102`, `5910`, `5908` e `6102`;
- todos os CFOPs observados começam com 5 ou 6.

A amostra deve servir como referência de desenvolvimento e teste, sem transformar seus valores específicos em regras hardcoded.

---

## 22. Critérios de aceite

A primeira versão será considerada funcional quando:

- [ ] o menu diferenciar GRL019 e RFT006;
- [ ] o usuário conseguir importar o RFT006;
- [ ] o sistema localizar corretamente a coluna numérica de CFOP;
- [ ] somente CFOPs iniciados em 5 ou 6 forem considerados elegíveis;
- [ ] `Cont/Ped` não for usado como regra principal de elegibilidade;
- [ ] o sistema agrupar os itens por `Nota`;
- [ ] cada nota gerar um modelo independente;
- [ ] uma nota suportar vários itens;
- [ ] duas notas do mesmo agricultor permanecerem separadas;
- [ ] emitente vir do RFT006;
- [ ] destinatário vir do cadastro do sistema;
- [ ] existir destinatário padrão para o fluxo avulso;
- [ ] existir configuração padrão de CFOP, CST, natureza e dados adicionais;
- [ ] alteração de uma geração não sobrescrever o padrão automaticamente;
- [ ] produto do RFT006 não exigir cadastro prévio no cadastro global;
- [ ] valores e descontos serem espelhados do RFT006;
- [ ] `{{nota_referencia}}` poder ser usada nos dados adicionais;
- [ ] geração individual possuir prévia editável;
- [ ] geração em lote permitir configuração comum;
- [ ] geração em lote permitir override/revisão individual por nota;
- [ ] cada nota do lote gerar seu próprio PDF;
- [ ] o PDF suportar múltiplos itens e quebra de página;
- [ ] nenhuma alteração afetar a lógica homologada do GRL019;
- [ ] o sistema continuar gerando somente documento orientativo.

---

## 23. Diretriz para implementação

Antes de alterar código:

1. localizar o fluxo atual de importação do GRL019;
2. localizar o componente de navegação/menu lateral;
3. localizar o cadastro existente de destinatários;
4. localizar o modelo/configuração fiscal e templates;
5. localizar a prévia/editoração;
6. localizar o renderer de PDF;
7. identificar quais partes podem ser reutilizadas sem acoplar RFT006 ao GRL019.

Aplicar mudanças incrementais.

Não fazer migração, backfill ou alteração destrutiva de dados sem necessidade explícita.

Preservar integralmente as regras homologadas do fluxo GRL019.
