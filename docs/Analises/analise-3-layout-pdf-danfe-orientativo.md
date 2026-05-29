# Análise 3 — Layout do PDF em formato DANFE orientativo

## 1. Arquivo/função responsável pela geração do PDF

- Arquivo responsável: `src/lib/pdf.ts`.
- Funções públicas reutilizadas pelo fluxo atual:
  - `generatePdf(notas, fileName)`: cria o `jsPDF`, desenha cada nota e salva o arquivo.
  - `pdfDataUri(notas)`: cria o `jsPDF`, desenha cada nota e retorna a prévia em data URI.
- Função interna alterada:
  - `drawNota(doc, nota)`: concentra a montagem visual de cada nota no PDF.

## 2. Diagnóstico do layout antigo

O layout anterior já apresentava os dados corretos do modelo orientativo, porém se comportava mais como um relatório simples do que como um espelho DANFE:

- Cabeçalho com identificação e CFOP, mas sem bloco DANFE/identificação estruturado.
- Natureza da operação, emitente, destinatário, produto, transporte e dados adicionais apareciam em caixas simples.
- Produto/serviço era exibido em campos individuais, não em tabela semelhante à DANFE.
- Não havia bloco específico para cálculo de imposto com totais e campos fiscais orientativos.
- Não havia bloco `RESERVADO AO FISCO`.
- O texto de dados adicionais tinha quadro único e podia ficar visualmente limitado quando fosse muito longo.
- A marcação de documento orientativo existia, mas precisava ficar mais evidente no visual geral.

## 3. Alterações aplicadas no novo layout

As alterações foram limitadas à geração visual do PDF, sem mudança nas regras de negócio, cálculo, importação, resolução de CFOP, vínculo de contratos, cadastros, pesquisa ou prévia.

Principais mudanças:

- Mantido o uso do gerador existente com `jsPDF`.
- Adicionado uso do `jspdf-autotable`, dependência já existente no projeto, para montar a tabela DANFE de produto/serviço.
- Reorganizada a página em blocos/quadrantes com bordas finas e títulos em azul claro.
- Criado cabeçalho superior mais próximo de DANFE, com:
  - `MODELO DE NOTA JM`;
  - subtítulo de documento orientativo;
  - aviso `MODELO ORIENTATIVO - SEM VALIDADE FISCAL`;
  - destaque visual grande do `CFOP` à direita.
- Criado bloco `DANFE` com dados orientativos de identificação:
  - Documento Auxiliar da Nota Fiscal Eletrônica;
  - entrada/saída;
  - número, série, folha;
  - chave de acesso com linha/placeholder.
- Criado bloco de natureza da operação com modelo/natureza cadastrada e CFOP.
- Padronizados os blocos de emitente e destinatário/remetente com campos fiscais.
- Criada tabela de produto/serviço com colunas similares à DANFE.
- Criado bloco de cálculo do imposto com bases/impostos zerados e totais preenchidos pelo valor do modelo.
- Criado bloco de transportador/volumes transportados com placeholders quando não há dados.
- Criado bloco de dados adicionais ao lado de `RESERVADO AO FISCO`.
- Implementada quebra de página para dados adicionais extensos, preservando quebras de linha e evitando corte/sobreposição.
- Mantidos rodapé e avisos obrigatórios de documento orientativo sem validade fiscal.

## 4. Lista de blocos criados

1. Cabeçalho superior do modelo JM.
2. Bloco DANFE / identificação.
3. Chave de acesso orientativa.
4. Natureza da operação.
5. Emitente `(PRODUTOR RURAL)`.
6. Destinatário / remetente.
7. Dados do produto / serviço em tabela.
8. Cálculo do imposto.
9. Transportador / volumes transportados.
10. Dados adicionais / informações complementares.
11. Reservado ao fisco.
12. Rodapé com identificação da JM e aviso de documento orientativo.

## 5. Checklist de validação visual

- [x] Layout usa estrutura de quadros/quadrantes semelhante a DANFE orientativo.
- [x] Cabeçalho exibe `MODELO DE NOTA JM`.
- [x] Cabeçalho exibe `Documento orientativo - SEM validade fiscal`.
- [x] PDF exibe `MODELO ORIENTATIVO - SEM VALIDADE FISCAL`.
- [x] PDF mantém o texto obrigatório: `Este documento é um modelo orientativo para emissão da Nota Fiscal pelo produtor rural. Não possui validade fiscal como NF-e.`
- [x] CFOP aparece em destaque no cabeçalho.
- [x] Bloco DANFE/identificação foi criado.
- [x] Natureza da operação usa dados do modelo de nota recebido pela função.
- [x] Emitente continua usando os dados já presentes em `nota.emitente`.
- [x] Destinatário continua usando os dados já presentes em `nota.destinatario`.
- [x] Produto, NCM, CST, unidade, quantidade, valor unitário e valor total aparecem na tabela.
- [x] Campos de imposto aparecem como `0,00` quando o sistema não calcula imposto.
- [x] Valor total dos produtos e valor total da nota usam `nota.valorTotal`.
- [x] Transporte/volumes usa dados existentes ou placeholder `-`.
- [x] Dados adicionais preservam quebras e podem continuar em página adicional.
- [x] Bloco `RESERVADO AO FISCO` foi incluído.
- [x] Rodapé mantém `Gerado por JM Assessoria e Contabilidade MT - www.jmassessoriamt.com.br`.

## 6. Pontos para melhoria futura

- Ajustar a indicação `FOLHA` para refletir dinamicamente múltiplas páginas quando uma nota tiver dados adicionais muito extensos.
- Adicionar campos reais de transportador/volumes caso sejam futuramente importados do GRL019 ou cadastrados no sistema.
- Permitir parametrização visual por CFOP se a JM quiser variações específicas para 5118, 5923 ou 5132.
- Validar visualmente com PDFs reais gerados em navegador após instalação das dependências no ambiente de desenvolvimento.
- Adicionar teste automatizado específico para garantir presença textual dos avisos obrigatórios no PDF, se o projeto passar a expor geração em ambiente de teste com dependências instaladas.

## 7. Revisão fina aplicada

1. **Número da NF-e orientativo**: o cabeçalho DANFE não usa mais o CFOP como número de nota. O campo passou a exibir o placeholder fixo `Nº 000.000.000`, deixando claro que é apenas uma referência para preenchimento manual.
2. **Série**: a série também deixou de usar o CFOP e passou a exibir `SÉRIE: ____`, sem inferir dado real inexistente na estrutura atual da nota.
3. **Código do produto**: a estrutura tipada atual de `Nota.produto` contém `descricao`, `ncm`, `cst` e `unidade`, mas não contém código do produto. Por isso, o PDF usa código real apenas se o objeto recebido trouxer algum campo de código compatível em tempo de execução (`codigo`, `codigoProduto`, `codigo_produto` ou `codItem`). Se nenhum código estiver disponível, exibe `-`.
4. **Campo de CST usado**: o cadastro de produto usa `cst_icms`, e `buildNota` normaliza esse valor para `nota.produto.cst`. O PDF usa `cst_icms` como fallback quando existir no objeto recebido e, no fluxo atual tipado, usa `nota.produto.cst`.
5. **PDFs de referência consultados**: foram verificados os arquivos `/public/modeo_5118.pdf`, `/public/modeo_5923.pdf` e `/public/Modelo_5132.pdf` como referências disponíveis no repositório. No ambiente atual não há ferramenta de renderização/extração visual de PDF instalada, então a consulta técnica possível foi confirmar presença, tamanho e cabeçalho PDF dos arquivos, mantendo os ajustes aderentes à estrutura visual DANFE já implementada.
6. **Limitação técnica**: o ambiente permanece sem `node_modules`; `npm install` falha com `403 Forbidden` no registry, então `npm run build` não consegue encontrar `vite`. A validação automatizada local ficou limitada a checks que não dependem de instalação de pacotes.

## 8. Refinamento visual para aproximação ao modelo legado

1. **O que foi alterado no visual**
   - O cabeçalho deixou de ter protagonismo institucional da JM e passou a simular a abertura de uma DANFE real, com faixa de recebimento, bloco central `DANFE`, área de chave/código de barras e quadros técnicos em preto/cinza.
   - As seções passaram a usar títulos mais compactos, preenchimento azul muito claro e bordas mais escuras, reduzindo a aparência de flyer corporativo e reforçando a leitura de formulário fiscal.
   - O rodapé orientativo foi mantido, porém com caixa menor e mais discreta, para preservar a proteção jurídica sem competir visualmente com o espelho da nota.
   - A tabela de produto/serviço foi mantida com a mesma estrutura técnica, mas com cabeçalho neutro, linhas secas e dados do produto destacados.
   - O bloco de dados adicionais manteve a divisão com `RESERVADO AO FISCO` e passou a destacar o conteúdo orientativo em vermelho, por ser a área de maior uso prático para o agricultor.

2. **O que passou a ficar em vermelho**
   - No cabeçalho, nome, endereço, município e UF do emitente/produtor rural.
   - Nos blocos de emitente e destinatário/remetente: nome/razão social, CPF/CNPJ, inscrição estadual, endereço, bairro, município e UF.
   - Na natureza da operação: modelo/natureza cadastrada e CFOP.
   - Na tabela de produto: código quando existir, produto, NCM, CST, CFOP, unidade, quantidade, valor unitário e valor total.
   - No cálculo do imposto: apenas os totais variáveis (`Valor total produtos` e `Valor total da nota`), mantendo os campos estruturais zerados em cor neutra.
   - No transporte: razão social, tipo de frete e placa quando esses dados estiverem preenchidos.
   - Em dados adicionais/informações complementares: o texto orientativo gerado a partir do modelo, incluindo contrato, confirmação de negócio, produtor, armazém/destinatário, placa, CND, vencimento e observação quando aparecerem no conteúdo.

3. **Como a chave de acesso foi tratada**
   - A linha genérica anterior foi substituída por um placeholder visual seguro (`____ ____ ____ ____ ____ ____ ____ ____ ____ ____ ____`), evitando qualquer aparência de chave consultável ou válida.
   - A chave fica identificada como `CHAVE DE ACESSO (PREENCHER APÓS EMISSÃO DA NF-e)`, reforçando que o agricultor deve preencher/copiar a chave somente depois de emitir a NF-e no emissor oficial.
   - A série passou a ser exibida como campo em branco (`SÉRIE: ____`), em vez de texto `xxx`, para não sugerir dado fiscal real.

4. **Código de barras visual de exemplo**
   - Foi incluído um desenho simples de barras no topo, inspirado no espaço de código de barras da DANFE real.
   - Esse desenho continua sendo meramente visual e não representa uma chave fiscal válida nem deve ser usado para consulta oficial.

5. **Posicionamento do aviso de documento orientativo**
   - O aviso `MODELO ORIENTATIVO - SEM VALIDADE FISCAL` permanece no cabeçalho direito e no rodapé.
   - O texto obrigatório `Este documento é um modelo orientativo para emissão da Nota Fiscal pelo produtor rural. Não possui validade fiscal como NF-e.` permanece no rodapé, em caixa menor e discreta.
   - O rodapé continua exibindo `Gerado por JM Assessoria e Contabilidade MT - www.jmassessoriamt.com.br` junto ao aviso de documento orientativo.

6. **Limitações técnicas que permaneceram**
   - A chave de acesso é um placeholder visual seguro e o código de barras é apenas exemplo visual; nenhum dos dois é derivado de dados fiscais reais.
   - O campo `FOLHA: 1 de 1` continua estático mesmo quando dados adicionais muito extensos exigirem nova página.
   - O destaque em vermelho dos dados adicionais é aplicado ao conteúdo do bloco como um todo, pois o texto chega ao PDF já renderizado a partir do template; uma separação por trechos exigiria estruturação adicional do template e foi evitada para não alterar regra de negócio.
   - Os campos de transportador/volumes continuam dependendo dos dados já existentes em `Nota`; quando não há origem real, permanecem placeholders.
   - No ambiente de validação atual, as referências `/public/modeo_5118.pdf`, `/public/modeo_5923.pdf` e `/public/Modelo_5132.pdf` foram consultadas como arquivos do repositório, mas não houve renderização automática local por falta de ferramenta instalada para converter PDF em imagem. A comparação visual também considerou as imagens anexadas à tarefa.
