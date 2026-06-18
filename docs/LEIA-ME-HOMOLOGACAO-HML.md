# GOM | SME — Homologação no mesmo Supabase usando tabelas hml_*

## Objetivo

Criar uma branch/URL de homologação sem criar outro projeto no Supabase.

## Produção

- Branch: `main`
- Tabelas: `solicitacoes`, `obras`, `equipes`, `perfis`, `configuracoes`, etc.
- `js/config.js`: `DB_PREFIX: ''`

## Homologação

- Branch: `homologacao`
- Tabelas: `hml_solicitacoes`, `hml_obras`, `hml_equipes`, `hml_perfis`, `hml_configuracoes`, etc.
- `js/config.js`: `DB_PREFIX: 'hml_'`

## Arquivos alterados/criados

- `js/config.js`
- `js/config.homologacao.exemplo.js`
- `sql/16_homologacao_tabelas_hml.sql`
- `docs/LEIA-ME-HOMOLOGACAO-HML.md`

## Como aplicar

1. Crie a branch `homologacao` no GitHub a partir da `main`.
2. Na branch `homologacao`, substitua `js/config.js` pelo conteúdo de `js/config.homologacao.exemplo.js`, ou altere manualmente:

```js
DB_PREFIX: 'hml_'
```

3. Rode no Supabase:

```text
sql/16_homologacao_tabelas_hml.sql
```

4. Publique a branch em uma URL separada, por exemplo:

```text
/gom-sme-teste/
```

## Observação importante

O sistema compartilha `escolas`, `status_chamado` e `status_obra` entre produção e homologação. As tabelas operacionais ficam separadas por `hml_`.

Isso evita mexer nos chamados, obras, equipes, perfis e configurações reais de produção durante testes.

