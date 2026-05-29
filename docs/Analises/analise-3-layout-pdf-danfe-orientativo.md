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
