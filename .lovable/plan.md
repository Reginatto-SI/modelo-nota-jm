## Contexto

O arquivo `public/PRD` não existe no projeto. Usarei como fonte de verdade os modelos legados em `public/` (`modeo_5118.pdf`, `modeo_5923.pdf`, `Modelo_5132.pdf`) e os documentos `docs/Analises/*`, que descrevem as regras fiscais e o layout DANFE orientativo já implementados.

Todos os ajustes são pontuais, reutilizando a estrutura existente. Nenhuma regra fiscal, cálculo, importação do GRL019 ou resolução de CFOP será alterada. Cada ponto alterado receberá comentário no código.

---

## 1. Cabeçalho da sidebar (remover "JM" duplicado)

`src/components/Layout.tsx` (linhas 57-60): substituir o bloco de dois `<div>` por uma única linha "Modelo de Nota JM" ao lado do logo, eliminando a redundância visual. Mantém o mesmo botão que navega para `/`.

## 2. Renomear item de menu

`src/components/Layout.tsx` (linha 19): `label: "Pesquisar Contratos"` → `label: "Gerar Modelo de Nota"`. A rota `/pesquisa` e o ícone permanecem (nenhuma rota nova).

## 3. Renomear título da tela principal

`src/pages/Pesquisa.tsx` (linhas 113-116): título `"Pesquisar Contratos"` → `"Gerar Modelo de Nota"` e ajuste do texto auxiliar para refletir a finalidade (localizar contrato e gerar o modelo).
`src/pages/Index.tsx` (linha 66): título do card `"Pesquisa rápida por contrato"` → `"Localizar contrato e gerar modelo"` e botão (linha 76) `"Pesquisar"` → `"Gerar Modelo"` para manter consistência. Rotas inalteradas.

## 4. Corrigir bloco "Dados Adicionais" do PDF (estouro de texto)

Em `src/lib/pdf.ts`, função `drawAdditionalData`:
- Garantir margem interna direita ao quebrar o texto (usar largura útil = `leftW - margem` em ambos os lados) para o texto não encostar na borda da coluna.
- Recalcular a altura/encaixe das linhas com `lineHeight` coerente ao `fontSize` real usado (hoje 7.0pt com passo 3.45 fica apertado), evitando sobreposição vertical.
- Manter a quebra de página já existente para textos longos (altura dinâmica por página), apenas corrigindo o cálculo para não cortar a última linha.

## 5. Aumentar "Dados Adicionais" e reduzir "Reservado ao Fisco"

Em `drawAdditionalData` (`src/lib/pdf.ts`), alterar a proporção das colunas de `0.68 / 0.32` para aproximadamente `0.82 / 0.18`, alinhando ao modelo legado (onde o "Reservado ao Fisco" é uma coluna estreita). Isso amplia o espaço útil para os textos parametrizados sem mexer na estrutura.

## 6. Corrigir aviso "MODELO ORIENTATIVO - SEM VALIDADE FISCAL" (rodapé)

Em `drawFooter` (`src/lib/pdf.ts`): o texto está cortando na base. Ajustes:
- Aumentar levemente a altura da faixa de aviso e/ou subir sua posição para caber as duas linhas sem corte.
- Recalcular `splitTextToSize` com largura correta para não invadir e não quebrar de forma inesperada.
- Garantir que a linha do rodapé inferior não se sobreponha à faixa.

## 7. Aproximar o PDF do modelo legado

Sem mudar a estrutura/ordem dos blocos, ajustes visuais de aproximação ao legado (`modeo_5118.pdf`):
- Reduzir o peso "institucional": diminuir a faixa de aviso para algo mais discreto (mantendo os dizeres obrigatórios) e priorizar a leitura dos dados.
- Reforçar o destaque (vermelho/negrito) já existente nos campos que o produtor precisa conferir/preencher (emitente, destinatário, valores, placa, CNDs).
- Pequenos ajustes de espaçamento para que a página fique mais parecida com uma nota real.
Os avisos obrigatórios de documento orientativo permanecem (cabeçalho/rodapé/marca d'água textual).

## 8. UX da operação casada 5118/5923 — investigação + ajuste aprovado

**Investigação (resultado):**
- `src/lib/resolve.ts` define `ofereceCasada = cfop === "5118" && gera_operacao_casada`. O modelo 5923 só é resolvido (`modelo5923`) dentro dessa condição. Não existe caminho para gerar 5923 isoladamente.
- `docs/Analises/analise-2` documenta explicitamente: "O CFOP 5923 é gerado apenas como parte da operação casada 5118 + 5923". A linha de EXPEDIÇÃO serve apenas como vínculo para localizar o armazém/destinatário do 5923. Gerar 5923 sozinho é, inclusive, bloqueado como "parametrização suspeita".
- **Conclusão:** a ausência da opção "somente 5923" é uma decisão de negócio/fiscal documentada, não um bug.

**Ajuste aprovado (apenas UX, sem mudar a regra):** em `src/pages/Pesquisa.tsx`, melhorar o texto do modal `AlertDialog` (linhas 187-208) para explicar que o 5923 acompanha obrigatoriamente o 5118 (remessa que complementa a venda), deixando claro o porquê de não haver "somente 5923". Botões permanecem "Gerar apenas 5118" e "Gerar 5118 + 5923".

## 9. Coluna "Modelo" na listagem

`src/pages/Pesquisa.tsx` (linha 161): badge `"CFOP 5118 + 5923"` → `"5118 + 5923"` (remover "CFOP" para reduzir dúvida sobre dependência). As demais badges (`CFOP {cfop}`, `Vínculo do 5923`, etc.) podem ser simplificadas de forma consistente, mantendo o significado.

## 10. Texto dos botões de ação

`src/pages/Pesquisa.tsx` (linha 175): botão `"Gerar"` → `"Gerar Modelo"`. Padronizar com o título da tela.

---

## Relatório (entregável)

Ao final entregarei um relatório curto cobrindo: como o bloco de Dados Adicionais foi corrigido, a nova distribuição de espaços (≈82/18), o resultado da investigação 5118/5923 e a recomendação de evolução futura da UX.

## Restrições respeitadas
- Sem novas arquiteturas, rotas ou componentes paralelos.
- Sem alterar regras fiscais, cálculo, importação ou resolução de CFOP.
- Reuso dos componentes existentes; alterações mínimas e comentadas.
- Compatível com os modelos já cadastrados.

## QA
Após as mudanças no PDF, vou gerar um PDF de teste e inspecioná-lo página a página (render para imagem) para confirmar que não há texto cortado, sobreposição ou quebra inesperada antes de concluir.
