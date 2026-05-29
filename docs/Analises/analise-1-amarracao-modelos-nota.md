# Análise 1 — Amarração entre GRL019, Tipos de Contrato e Modelos de Nota

## 1. Diagnóstico encontrado

> Observação: o PRD indicado em `/mnt/data/PRD - Modelo de Nota JM.txt` não estava disponível no ambiente no momento da análise. A massa `public/GRL019 Modelo - Cooperativa COAFORTE.xlsx` existe no repositório, mas as dependências locais não estavam instaladas antes da correção, então a análise principal foi feita pelo fluxo de código e pelos tipos/tabelas do projeto.

### Badge da coluna **Modelo**

- O badge exibido na tela de pesquisa é calculado em `src/pages/Pesquisa.tsx` chamando `resolveContrato(report, r, cad)` para cada linha listada.
- Antes da correção, `resolveContrato` obtinha `res.cfop` a partir de `modelo?.cfop`.
- Esse `modelo` vinha do vínculo `tipos_contrato.modelo_nota_id`, porém o tipo de contrato era escolhido apenas por `cooperativa_id + codigo_contrato`.
- Portanto, o badge não vinha diretamente de `tipos_contrato.cfop`; ele vinha de `modelos_nota.cfop` após selecionar um registro de `tipos_contrato`.

### Validação ao clicar em **Gerar**

- O clique em **Gerar** também chamava `resolveContrato(report, row, cad)` em `src/pages/Pesquisa.tsx`.
- A geração validava novamente o modelo dentro da função `generate`, especialmente quando precisava gerar CFOP 5923 em operação casada.
- A mensagem genérica anterior era: `Modelo CFOP ${w} não está cadastrado para a cooperativa.`

### Divergência principal

- A tela e o botão usavam o mesmo helper (`resolveContrato`), mas o helper não validava todas as chaves obrigatórias.
- O problema estava na resolução incompleta dentro do helper:
  - não filtrava `tipos_contrato` por `tp_faturamento`;
  - não filtrava `tipos_contrato` por `ativo`;
  - não detectava duplicidade ativa;
  - não garantia que o modelo vinculado estivesse ativo e fosse da mesma cooperativa;
  - considerava qualquer CFOP 5118 como operação casada, sem respeitar `gera_operacao_casada`.

## 2. Arquivos analisados

- `src/pages/Pesquisa.tsx`
- `src/lib/resolve.ts`
- `src/lib/nota.ts`
- `src/lib/grl019.ts`
- `src/lib/types.ts`
- `src/lib/db.ts`
- `src/pages/cadastros/Cooperativas.tsx`
- `src/pages/cadastros/TiposContrato.tsx`
- `src/pages/cadastros/ModelosNota.tsx`
- `supabase/migrations/20260529175423_e3866971-4f54-47a2-b95e-e7de21e3c77a.sql`
- `public/GRL019 Modelo - Cooperativa COAFORTE.xlsx`

## 3. Fluxo atual da amarração

Após a correção, o fluxo centralizado em `resolveContrato` é:

1. Localizar a cooperativa pelo texto da coluna `EMPRESA` do GRL019 comparando com `cooperativas.nome_grl019`.
2. Considerar apenas cooperativa ativa.
3. Localizar o tipo de contrato ativo por:
   - `cooperativa_id`;
   - `COD.CONTRATO` (`codigo_contrato`);
   - `TP FATURAMENTO` (`tp_faturamento`).
4. Se houver mais de uma parametrização ativa para a mesma combinação, bloquear a geração.
5. Localizar o modelo de nota a partir do tipo de contrato:
   - primeiro pelo `modelo_nota_id` vinculado;
   - validando que o modelo é ativo;
   - validando que o modelo pertence à mesma `cooperativa_id`;
   - validando consistência entre `tipos_contrato.cfop` e `modelos_nota.cfop` quando o CFOP informativo estiver preenchido.
6. O badge da pesquisa só exibe `CFOP X` quando a mesma resolução está sem erro crítico.
7. Para CFOP 5118, a oferta de operação casada depende de `tipos_contrato.gera_operacao_casada`.
8. Quando há operação casada, o modelo CFOP 5923 é buscado como ativo e da mesma cooperativa.
9. O contrato de expedição vinculado continua sendo usado como fonte para localizar armazém/destinatário final do 5923.

## 4. Problema identificado

A causa provável do comportamento observado era a seleção ambígua do tipo de contrato:

- existiam parametrizações suspeitas para o mesmo código `108` da COAFORTE;
- o código selecionava o primeiro `tipos_contrato` encontrado por `cooperativa_id + codigo_contrato`;
- o `TP FATURAMENTO` do GRL019 não participava da chave de busca;
- duplicidades ativas não eram sinalizadas;
- o modelo exibido na pesquisa podia parecer disponível mesmo quando a geração posterior dependia de outra validação ou de modelo ativo da mesma cooperativa.

Isso explicava a inconsistência visual: a linha podia exibir badge CFOP 5923 por causa do primeiro tipo encontrado, enquanto a ação de geração falhava em validações posteriores.

## 5. Correção aplicada

- Centralizada e reforçada a resolução em `src/lib/resolve.ts`.
- Adicionado campo `errors` ao resultado da resolução para separar erros bloqueantes de avisos operacionais.
- A busca do tipo de contrato agora usa `cooperativa_id + codigo_contrato + tp_faturamento + ativo`.
- Duplicidades ativas para a mesma combinação agora bloqueiam a geração com mensagem clara.
- A busca do modelo vinculado agora exige modelo ativo e da mesma cooperativa.
- Operação casada agora depende de CFOP 5118 e `gera_operacao_casada` marcado no tipo de contrato.
- O modelo CFOP 5923 da operação casada agora é validado como ativo e da mesma cooperativa.
- A tela de pesquisa passou a exibir `Erro param.` em vez de badge CFOP quando a mesma resolução usada na geração possui erro bloqueante.
- As mensagens ao usuário foram substituídas por mensagens mais específicas para ausência de tipo, duplicidade e ausência de modelo.
- Foram adicionados testes unitários cobrindo resolução por `TP FATURAMENTO`, duplicidade ativa e validação de modelo 5923 em operação casada.

## 6. Pontos que ainda dependem de validação do usuário

- O PRD solicitado não estava disponível no caminho informado. É necessário validar as regras contra o documento oficial assim que ele for anexado/disponibilizado.
- Ainda precisa ser confirmado com a área de negócio se um tipo de contrato apontando diretamente para CFOP 5923 é permitido fora da geração casada 5118 + 5923. Como o PRD não estava disponível, essa regra não foi bloqueada nesta correção mínima.
- A massa real da COAFORTE deve ser importada no ambiente da aplicação para confirmar se os cadastros atuais possuem duplicidade ativa em `tipos_contrato` para `108 / RECEBIMENTO / COAFORTE`.
- É necessário validar se os registros reais de `modelos_nota` CFOP 5923 estão vinculados ao mesmo `cooperativa_id` resolvido pelo `nome_grl019` da coluna `EMPRESA`.

## 7. Checklist de teste manual

1. Importar o GRL019 modelo da COAFORTE.
2. Pesquisar contrato de recebimento com código 108.
3. Confirmar se o modelo exibido é o mesmo que será usado na geração.
4. Confirmar se duplicidades de parametrização são bloqueadas.
5. Confirmar se CFOP 5118 sugere geração 5118 + 5923 quando operação casada.
6. Confirmar se a ausência de modelo 5923 gera mensagem clara.
7. Confirmar se o modelo 5923 usa o contrato vinculado apenas para localizar o armazém/destinatário.
8. Confirmar se o PDF não é gerado quando houver parametrização crítica ausente.
