# GOM/SME — v45 Fluxo correto de Aguardando visita

Correção do fluxo da Fila:

Triagem encaminha para `Aguardando visita`.

Na Fila, a partir de `Aguardando visita`, as opções corretas são:

- Em atendimento
- Atendimento Emergencial
- Solicitado Orçamento
- Garantia de Obra
- Devolvido para a escola

Ao escolher `Em atendimento`, o sistema exige equipe da Secretaria e data da visita.

## Arquivos

- `js/triagem-fila-inline.js`
- `js/modal-chamados.js`
- `js/supabase/mapeadores.js`

## Observação

`Aguardando visita` é a fila de espera.
`Em atendimento` é o chamado já assumido/agendado pela equipe da Secretaria.
