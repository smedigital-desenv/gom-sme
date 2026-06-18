# Correção — equipe da Secretaria sendo salva como Empresa

## Problema

Ao alternar a tela de Gerenciar Equipes para `Equipes da Secretaria/GOM`, o estado visual mudava, mas o formulário de cadastro podia manter internamente o tipo anterior (`empresa`).

Resultado: uma equipe criada na aba da Secretaria podia ser salva como equipe da empresa.

## Correção aplicada

Arquivo alterado:

- `js/empresa.js`

Ajustes:

1. Ao trocar o tipo entre Empresa e Secretaria/GOM, o sistema atualiza também o campo interno `tipoNovaEquipeGerencial`.
2. O campo visual `TIPO` do formulário passa a ter ID próprio e também é atualizado.
3. Na hora de salvar, o sistema não confia mais no hidden antigo; ele lê o tipo atual diretamente de `getTipoEquipesGerencialAtual_()`.

## O que não foi alterado

- Dados de chamados
- Dados de obras
- Carga validada
- Perfis
- Login
- Histórico de equipes

## Diagnóstico no Supabase

Rode:

```sql
select id, nome, tipo, ativo, created_at
from public.equipes
order by created_at desc nulls last, id desc
limit 50;
```

Se alguma equipe estiver com tipo errado, corrija manualmente pelo ID:

```sql
update public.equipes
set tipo = 'secretaria'
where id = ID_DA_EQUIPE;
```
