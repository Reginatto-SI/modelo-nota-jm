# Templates recomendados de Dados Adicionais — 5118, 5923 e 5132

> Estes templates são referência funcional para cadastro manual dos modelos de nota. Os textos fiscais devem ser validados pela JM antes de uso definitivo.

## Variáveis usadas

- Contrato: `{{contrato}}`, `{{contrato_vinculado}}`, `{{contrato_cliente}}`, `{{confirmacao_negocio}}`.
- Destinatário final/armazém: `{{destinatario_final_nome}}`, `{{destinatario_final_cnpj}}`, `{{destinatario_final_ie}}`, `{{destinatario_final_endereco_completo}}`.
- Cooperativa: `{{cooperativa_razao_social}}`, `{{cooperativa_cnpj}}`, `{{cooperativa_ie}}`, `{{cooperativa_endereco}}`, `{{cooperativa_bairro}}`, `{{cooperativa_cep}}`, `{{cooperativa_telefone}}`, `{{cooperativa_municipio}}`, `{{cooperativa_uf}}`.
- Transporte: `{{placa_cavalo}}`, `{{motorista_nome}}`, `{{nf_referenciada}}`.
- CNDs/retenções: `{{cnd_cooperativa_numero}}`, `{{cnd_cooperativa_codigo_autenticacao}}`, `{{cnd_cooperativa_vencimento}}`, `{{cnd_produtor_numero}}`, `{{cnd_produtor_codigo_autenticacao}}`, `{{cnd_produtor_vencimento}}`, `{{cnd_destinatario_numero}}`, `{{cnd_destinatario_codigo_autenticacao}}`, `{{cnd_destinatario_vencimento}}`, `{{funrural_valor}}`, `{{funrural_base}}`, `{{retencao_valor}}`, `{{retencao_base}}`.

## Template recomendado — CFOP 5118

```txt
Inf. Contribuinte: ICMS DIFERIDO - ARTIGOS 573 A 586 - CONFORME ART. 6, DO ANEXO VII AO RICMS/MT/2024.
PROCON MT FONE 151 AV. HISTORIADOR RUBENS DE MENDONCA (AV. DO CPA), 917 BAIRRO ARAES EDIFICIO ELDORADO EXECUTIVE CENTER (AO LADO DA POLICIA FEDERAL) CEP 78008-000 FONE 151 - CUIABA MT.

CONFIRMAÇÃO DE NEGÓCIO {{confirmacao_negocio}} CONTRATO {{contrato_cliente}}

Mercadoria será entregue na {{destinatario_final_nome}}, CNPJ: {{destinatario_final_cnpj}}, I.E: {{destinatario_final_ie}}, ENDEREÇO: {{destinatario_final_endereco_completo}}.

FUNRURAL 1,5: {{funrural_valor}} Base: {{funrural_base}}
PLACA CAVALO: {{placa_cavalo}}

{{cooperativa_razao_social}} CND NUM: {{cnd_cooperativa_numero}} COD.AUT: {{cnd_cooperativa_codigo_autenticacao}} VENCIMENTO: {{cnd_cooperativa_vencimento}}

PRODUTOR: CND NUM: {{cnd_produtor_numero}} COD.AUT: {{cnd_produtor_codigo_autenticacao}} VENCIMENTO: {{cnd_produtor_vencimento}}
```

## Template recomendado — CFOP 5923

```txt
Inf. Contribuinte: ICMS NÃO TRIBUTADO - CST 041. MOTORISTA: {{motorista_nome}}.
PROCON MT AV HISTORIADOR RUBENS MENDONCA, 917, ED. ELDORADO EXECUTIVE CENTER, CUIABA - MT.

CONFIRMAÇÃO DE NEGÓCIO {{confirmacao_negocio}} CONTRATO {{contrato_cliente}}

REF. NFE Nº {{nf_referenciada}} (NOTA CFOP 5118/5120)

{{cooperativa_razao_social}}, CNPJ: {{cooperativa_cnpj}}, IE: {{cooperativa_ie}}, {{cooperativa_endereco}}, {{cooperativa_bairro}}, CEP: {{cooperativa_cep}}, {{cooperativa_telefone}}, {{cooperativa_municipio}} {{cooperativa_uf}}.

PLACA CAVALO: {{placa_cavalo}}

{{destinatario_final_nome}} CND NUM: {{cnd_destinatario_numero}} COD.AUT: {{cnd_destinatario_codigo_autenticacao}} VENCIMENTO: {{cnd_destinatario_vencimento}}

PRODUTOR: CND NUM: {{cnd_produtor_numero}} COD.AUT: {{cnd_produtor_codigo_autenticacao}} VENCIMENTO: {{cnd_produtor_vencimento}}
```

## Template recomendado — CFOP 5132

```txt
Inf. Contribuinte: ICMS DIFERIDO - ARTIGOS 573 A 586 - CONFORME ART. 6, DO ANEXO VII AO RICMS/MT/2024.
PROCON MT FONE 151 AV. HISTORIADOR RUBENS DE MENDONCA (AV. DO CPA), 917 BAIRRO ARAES EDIFICIO ELDORADO EXECUTIVE CENTER (AO LADO DA POLICIA FEDERAL) CEP 78008-000 FONE 151 - CUIABA MT.

CONFIRMAÇÃO DE NEGÓCIO: {{confirmacao_negocio}} CONTRATO: {{contrato}}

Mercadoria será entregue na {{destinatario_final_nome}}, CNPJ: {{destinatario_final_cnpj}}, I.E: {{destinatario_final_ie}}, LOCALIZADA NA {{destinatario_final_endereco_completo}}.

Valor: {{retencao_valor}} Base: {{retencao_base}}
PLACA CAVALO: {{placa_cavalo}}

{{cooperativa_razao_social}} CND NUM: {{cnd_cooperativa_numero}} COD.AUT: {{cnd_cooperativa_codigo_autenticacao}} VENCIMENTO: {{cnd_cooperativa_vencimento}}

PRODUTOR: CND NUM: {{cnd_produtor_numero}} COD.AUT: {{cnd_produtor_codigo_autenticacao}} VENCIMENTO: {{cnd_produtor_vencimento}}
```
