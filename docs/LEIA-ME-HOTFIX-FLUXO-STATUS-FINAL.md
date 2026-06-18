# Hotfix final — Seletores de fluxo/status

## Objetivo

Garantir que o campo `Alterar situação` do modal nunca mais carregue a lista completa `STATUS_TODOS` em telas operacionais.

## O que foi feito

Foi criado o arquivo:

`js/fluxo-status-final.js`

Ele é carregado por último no `index.html` e sobrescreve as funções globais do modal:

- `getStatusPermitidosModal`
- `preencherSelectStatusModal`
- `gomProximosStatusFluxo`

Além disso, ele reprocessa o select logo depois que o modal abre, para corrigir qualquer preenchimento feito por código antigo carregado antes.

## Resultado esperado

### Empresa / Execução diária

- `OS emitida` → somente `OS emitida` e `Serviço Realizado`
- `Atendimento Emergencial` → somente `Atendimento Emergencial` e `Serviço Realizado`
- `Garantia de Obra` → somente `Garantia de Obra` e `Serviço Realizado`
- `Garantia de Serviço` → somente `Garantia de Serviço` e `Serviço Realizado`

### Orçamentos

- `Solicitado Orçamento` → somente `Solicitado Orçamento` e `Orçamento Realizado`

### Triagem/Fila

Permanece usando apenas os encaminhamentos previstos para cada etapa.

## Arquivos alterados

- `index.html`
- `js/fluxo-status-final.js`

## SQL necessário

Não precisa rodar SQL.

## Observação de cache

Depois do deploy, atualizar a página com `Ctrl + F5`.
