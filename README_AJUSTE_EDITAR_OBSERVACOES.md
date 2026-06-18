# GOM | SME — Editar campo Observações pela Secretaria/GOM

## Objetivo

Permitir que usuários dos perfis `SECRETARIA`, `GOM` legado, `ADMIN_GOM` e `ADMINISTRADOR-GOM` editem diretamente o campo completo `observacoes` de um chamado aberto no modal.

## Comportamento

- O botão `Editar observações` aparece no modal do chamado apenas para Secretaria/GOM e Administrador GOM.
- Ao salvar, o campo `observacoes` é substituído pelo novo texto.
- O histórico é registrado em `log_acoes` com:
  - ação: `Observações editadas`
  - status anterior e novo mantendo a situação atual do chamado
  - texto anterior e texto novo no campo `observacao`
  - origem: `edicao_observacoes`
- Não altera status, OS, equipe, obras ou dados de cadastro.

## Arquivos alterados

- `index.html`
- `js/modal-chamados.js`
- `js/supabase/api.js`
- `js/supabase/dados.js`

## SQL

Não há SQL obrigatório. Usa as tabelas já existentes:

- `solicitacoes` / `hml_solicitacoes`
- `log_acoes` / `hml_log_acoes`

## Validação na homologação

1. Entrar em `/gom-sme/teste/` com perfil Secretaria ou Administrador GOM.
2. Abrir um chamado.
3. Clicar em `Editar observações`.
4. Alterar o texto e salvar.
5. Conferir que a observação foi substituída no chamado.
6. Conferir que a linha do tempo mostra `Observações editadas`.
7. Conferir no Supabase em `hml_log_acoes`.
