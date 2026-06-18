# GOM | SME — Ajuste Cadastro e Visita agendada na Triagem

## Objetivo

1. Remover do Cadastro interno a possibilidade de informar a Situação Inicial.
2. Garantir que todo chamado novo do Cadastro interno entre como `Em análise`.
3. Permitir que a Triagem encaminhe um chamado diretamente para `Visita agendada`.
4. Ao escolher `Visita agendada`, exigir equipe da Secretaria/GOM e data da visita.

## Arquivos alterados

- `index.html`
- `js/formularios.js`
- `js/triagem-fila-inline.js`
- `js/supabase/dados.js`
- `js/supabase/mapeadores.js`
- `sql/01_schema.sql`

## Arquivo SQL novo

- `sql/17_status_visita_agendada.sql`

## Como aplicar

Aplicar primeiro na branch/pasta de homologação.

Depois de substituir os arquivos, rodar no Supabase:

```sql
sql/17_status_visita_agendada.sql
```

Esse SQL apenas adiciona/atualiza o status `Visita agendada` na tabela compartilhada `status_chamado`.
Ele não altera chamados existentes.

## Validação

1. Abrir `/gom-sme/teste/`.
2. Ir em Cadastro e conferir que o campo `Situação Inicial` não aparece.
3. Criar solicitação e confirmar que entrou como `Em análise`.
4. Ir em Triagem.
5. Escolher `Visita agendada` em um chamado.
6. Confirmar que aparecem `Equipe da visita` e `Data da visita`.
7. Salvar e conferir se o chamado entrou em `hml_solicitacoes` como `Visita agendada` com `equipe_responsavel` e `data_agendamento_visita` preenchidos.
