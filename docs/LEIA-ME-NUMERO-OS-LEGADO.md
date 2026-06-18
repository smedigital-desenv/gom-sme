# Ajuste — Número de OS legado e geração automática para novas OS

## Objetivo

Permitir regularizar chamados antigos que já estavam como `OS emitida`, mas ficaram sem número de OS, sem permitir digitação manual para novas OS.

## Regras implementadas

### Chamados antigos

Se o chamado estiver com status `OS emitida` e não tiver `numero_os`, o modal exibe o bloco:

`Regularizar número da OS antiga`

Esse bloco permite informar manualmente o número da OS apenas uma vez.

O sistema valida:

- o chamado precisa estar em `OS emitida`;
- o chamado não pode já possuir número de OS;
- o número informado não pode existir em outro chamado;
- a alteração é registrada em `log_acoes`.

### Novas OS

Na aprovação de orçamento, o usuário não digita mais o número da OS.

O campo fica desabilitado com a mensagem:

`Gerado automaticamente pelo sistema`

A camada de dados gera automaticamente o próximo número de OS com base no maior número do ano atual.

## Arquivos alterados

- `index.html`
- `js/modal-chamados.js`
- `js/supabase/api.js`
- `js/supabase/dados.js`

## SQL necessário

Não precisa rodar SQL.

## Validação sugerida

1. Abrir um chamado antigo com status `OS emitida` e sem número.
2. Confirmar que aparece o bloco `Regularizar número da OS antiga`.
3. Informar um número, exemplo `213/2026`.
4. Salvar.
5. Confirmar que o número aparece no chamado.
6. Confirmar no Supabase se gravou em `hml_solicitacoes.numero_os`.
7. Confirmar se o log foi gravado em `hml_log_acoes`.
8. Abrir um orçamento em aprovação e confirmar que o campo Número da OS fica desabilitado.
9. Aprovar o orçamento e confirmar que o número foi gerado automaticamente.
