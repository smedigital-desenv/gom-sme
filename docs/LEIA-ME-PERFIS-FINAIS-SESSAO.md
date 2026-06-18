# GOM | SME — Perfis finais + sessão por inatividade

## Perfis finais

- `ADMIN_GOM`: acesso total.
- `SECRETARIA`: telas operacionais da Secretaria, sem Configurações e sem Gerenciar Equipes. Pode acessar a tela Empresa somente no modo Agenda / Acompanhamento.
- `EMPRESA`: tela Empresa.
- `ESCOLA`: Cadastro e Acompanhar.

## Compatibilidade

O perfil antigo `GOM` é tratado no código como `SECRETARIA`, para evitar quebra de usuários antigos durante a transição.

`CAMPO` e `CONFERENTE` deixam de ser perfis oficiais. O SQL os deixa inativos, sem apagar histórico.

## Arquivos alterados

- `js/login.js`
- `js/permissoes.js`
- `js/empresa.js`
- `js/supabase/dados.js`
- `js/configuracoes-ui.js`
- `js/sessao-inatividade.js` novo
- `index.html`
- `sql/14_perfis_finais_timeout.sql` novo

## Regras da tela Empresa para Secretaria

A Secretaria tem acesso à página `empresa`, mas o sistema força o modo:

```text
agenda
```

Os botões de Execução diária, Orçamentos, Gerencial OS e Equipes ficam ocultos/desabilitados para Secretaria.

## Logout por inatividade

O sistema derruba a sessão após 4 horas sem atividade.

Atividades monitoradas:

- clique
- teclado
- mouse
- scroll
- toque no celular
- troca de rota

Ao expirar, o sistema chama `gomLogout()`, limpa sessão/cache e volta para o login.

## Como aplicar

1. Substitua os arquivos alterados no projeto.
2. Publique/deploy normalmente.
3. Rode no Supabase SQL Editor:

```text
sql/14_perfis_finais_timeout.sql
```

4. Teste com um usuário de cada perfil.

## Checklist de teste

### ADMIN_GOM

- Deve ver tudo.
- Deve acessar Configurações e Gerenciar Equipes.
- Deve acessar Empresa completa.

### SECRETARIA

- Deve ver Dashboard, Triagem, Fila, Aprovação, Campo, Alertas, Obras, Histórico, Relatórios, Cadastro e Acompanhar.
- Não deve ver Configurações.
- Não deve ver Gerenciar Equipes.
- Na tela Empresa, deve ver somente Agenda / Acompanhamento.

### EMPRESA

- Deve ver apenas Empresa.

### ESCOLA

- Deve ver Cadastro e Acompanhar.

