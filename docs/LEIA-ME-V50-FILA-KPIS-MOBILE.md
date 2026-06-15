# GOM/SME — v50 Fila com KPIs corretos e menu mobile no topo

Patch pontual após validação do v49.

## Ajustes

1. A tela de Fila/Atendimento passa a exibir somente os KPIs:
   - `Aguardando visita`
   - `Visita agendada`
2. A Fila não deve exibir chamados concluídos, memorial, empresa, orçamento ou demais fluxos.
3. A Agenda/Acompanhamento da Secretaria também fica limitada a `Aguardando visita` e `Visita agendada`.
4. No celular, a sidebar lateral da Secretaria fica oculta e o menu mobile principal fica na parte superior da tela.

## Arquivos alterados

- `js/fila-secretaria.js`
- `js/render-chamados.js`
- `js/triagem-fila-inline.js`
- `css/styles.css`

## Sem alterações

Não mexe em Empresa, anexos, Drive, Supabase, Apps Script, login, permissões ou configurações.
