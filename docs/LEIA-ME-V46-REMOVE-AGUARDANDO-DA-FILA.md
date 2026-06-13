# GOM/SME — v46 Remover Aguardando visita como opção do próprio chamado

Quando o chamado já está em `Aguardando visita`, o dropdown de encaminhamento da Fila não deve mostrar `Aguardando visita` novamente.

Agora aparece um placeholder:

`-- Selecionar encaminhamento --`

E as opções:

- Em atendimento
- Atendimento Emergencial
- Solicitado Orçamento
- Garantia de Obra
- Devolvido para a escola

Arquivos:

- `js/triagem-fila-inline.js`
- `js/modal-chamados.js`
