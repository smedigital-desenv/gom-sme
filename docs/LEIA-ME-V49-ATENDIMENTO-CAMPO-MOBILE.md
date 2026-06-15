# GOM/SME — v49 Atendimento, Campo e menu mobile

Patch cirúrgico solicitado para ajustar somente quatro pontos:

1. Tela de Atendimento/Fila com KPIs específicos para `Aguardando visita` e `Visita agendada`.
2. Renomeação visual e operacional de `Em atendimento` para `Visita agendada`.
3. Tela de Campo passa a considerar os agendamentos da Secretaria/Educação (`Aguardando visita` e `Visita agendada`).
4. No celular, a barra lateral da Secretaria fica recolhida exibindo apenas o botão hambúrguer; os itens aparecem somente quando o usuário expande o menu.

## Arquivos alterados

- `js/gom-config.js`
- `js/supabase/mapeadores.js`
- `js/triagem-fila-inline.js`
- `js/modal-chamados.js`
- `js/render-chamados.js`
- `js/state.js`
- `js/campo.js`
- `css/styles.css`

## Observações

- Não há SQL obrigatório neste patch.
- Registros legados com status `Em atendimento` são normalizados no frontend como `Visita agendada`.
- O fluxo de anexos, Drive, empresa, configurações, permissões e login não foi alterado.

## Testes mínimos

1. Abrir Atendimento/Fila e confirmar KPIs: `Atendimento`, `Aguardando visita`, `Visita agendada`.
2. Em um chamado `Aguardando visita`, abrir o select e confirmar opções:
   - `Visita agendada`
   - `Atendimento Emergencial`
   - `Solicitado Orçamento`
   - `Garantia de Obra`
   - `Devolvido para a escola`
3. Selecionar `Visita agendada` e confirmar exigência de equipe da Secretaria e data da visita.
4. Abrir Campo > Equipe da Educação e confirmar que os agendamentos da Secretaria aparecem.
5. Abrir no celular e confirmar que o menu lateral mostra somente o hambúrguer até ser expandido.
