-- =============================================================================
-- GOM | SME — Correção dos alertas críticos do Supabase Security Advisor:
--   1) rls_disabled_in_public   (Table publicly accessible)
--   2) sensitive_columns_exposed (Sensitive data publicly accessible)
--
-- Contexto do app (ver docs/LEIA-ME-V32-REGRAS-ACESSO.txt, que já previa esta
-- etapa como pendente):
--   - Secretaria/GOM/Admin e Escola autenticam via Google OAuth real
--     (Supabase Auth) => auth.jwt() ->> 'email' é confiável para essas sessões.
--   - Empresa autentica só por PIN (sem sessão Supabase real) => enxerga o
--     banco como o papel "anon". Não há como isolar por empresa individual
--     nesse modelo hoje (é 1 código compartilhado, não 1 login por empresa).
--     As políticas abaixo aceitam esse limite conhecido: dão a "anon" só o
--     necessário para as telas da Empresa funcionarem, nunca acesso a
--     perfis/configurações/dados de equipe.
--
-- ORDEM DE APLICAÇÃO OBRIGATÓRIA:
--   1) Rode este arquivo inteiro no SQL Editor do Supabase (projeto gom-sme,
--      ref iqldovwttomkjkoakosc) ANTES de publicar o novo js/login.js.
--   2) Só depois publique o código (o login por PIN passa a chamar a função
--      validar_pin_empresa criada aqui, em vez de ler configuracoes.valor
--      direto do navegador).
--
-- Revise os nomes de coluna abaixo contra o seu schema real (rode \d perfis
-- etc. no SQL Editor) antes de rodar em produção — foram inferidos do código
-- em js/supabase/dados.js e js/login.js.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Funções auxiliares (SECURITY DEFINER para poderem ler perfis/escolas
--    mesmo com RLS ativo nessas tabelas, sem recursão de política).
-- -----------------------------------------------------------------------------

create or replace function public.sme_perfil_atual(p_hml boolean default false)
returns text
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_perfil text;
  v_tabela text := case when p_hml then 'hml_perfis' else 'perfis' end;
  v_email  text := lower(coalesce(auth.jwt() ->> 'email', ''));
begin
  if v_email = '' then
    return null;
  end if;
  execute format(
    'select perfil from %I where lower(email) = %L and ativo = true limit 1',
    v_tabela, v_email
  ) into v_perfil;
  return v_perfil;
exception when undefined_table then
  return null;
end;
$$;

revoke all on function public.sme_perfil_atual(boolean) from public;
grant execute on function public.sme_perfil_atual(boolean) to anon, authenticated;

create or replace function public.sme_escola_id_atual()
returns bigint
language sql
security definer
set search_path = public
stable
as $$
  select id from public.escolas
  where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1
$$;

revoke all on function public.sme_escola_id_atual() from public;
grant execute on function public.sme_escola_id_atual() to anon, authenticated;

-- Valida o PIN da Empresa no banco, sem nunca devolver o valor ao navegador.
-- Substitui a leitura direta de configuracoes.valor feita hoje em js/login.js.
create or replace function public.validar_pin_empresa(p_pin text, p_hml boolean default false)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pin    text;
  v_tabela text := case when p_hml then 'hml_configuracoes' else 'configuracoes' end;
begin
  if p_pin is null or length(trim(p_pin)) = 0 then
    return false;
  end if;
  execute format(
    'select valor from %I where chave = %L',
    v_tabela, 'CODIGO_ACESSO_EMPRESA'
  ) into v_pin;
  return v_pin is not null and v_pin = p_pin;
exception when undefined_table then
  return false;
end;
$$;

revoke all on function public.validar_pin_empresa(text, boolean) from public;
grant execute on function public.validar_pin_empresa(text, boolean) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 1) escolas — cadastro de unidades. Não é prefixada (compartilhada prod/hml).
--    Leitura pública (nome/endereço/telefone/email da unidade já é informação
--    de diretório público da rede); escrita só via SQL Editor (não há tela no
--    app para isso hoje).
-- -----------------------------------------------------------------------------
alter table public.escolas enable row level security;

drop policy if exists escolas_select_all on public.escolas;
create policy escolas_select_all
  on public.escolas for select
  to anon, authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- 2) perfis — fonte de autorização (email -> perfil). CRÍTICO: hoje qualquer
--    um pode ler/editar isso, o que permite autopromoção a ADMIN_GOM.
-- -----------------------------------------------------------------------------
alter table public.perfis enable row level security;

drop policy if exists perfis_select_proprio_ou_admin on public.perfis;
create policy perfis_select_proprio_ou_admin
  on public.perfis for select
  to authenticated
  using (
    lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.sme_perfil_atual() = 'ADMIN_GOM'
  );

drop policy if exists perfis_write_admin on public.perfis;
create policy perfis_write_admin
  on public.perfis for all
  to authenticated
  using (public.sme_perfil_atual() = 'ADMIN_GOM')
  with check (public.sme_perfil_atual() = 'ADMIN_GOM');

-- Nenhuma política para "anon": a tabela perfis só é consultada após login
-- Google real, então o papel anon fica sem nenhum acesso (SELECT/INSERT/
-- UPDATE/DELETE todos negados por padrão do RLS).

-- -----------------------------------------------------------------------------
-- 3) configuracoes — CRÍTICO: guarda o PIN da Empresa em texto puro
--    (chave = 'CODIGO_ACESSO_EMPRESA'). LOGIN_ATIVO/LOGIN_MODO precisam
--    continuar públicos (a tela de login lê antes de qualquer autenticação).
--    O restante (inclusive o PIN) só é legível por quem já está logado; o
--    PIN em si passa a ser conferido só via validar_pin_empresa(), nunca lido.
-- -----------------------------------------------------------------------------
alter table public.configuracoes enable row level security;

drop policy if exists configuracoes_select_publica_bootstrap on public.configuracoes;
create policy configuracoes_select_publica_bootstrap
  on public.configuracoes for select
  to anon
  using (chave in ('LOGIN_ATIVO', 'LOGIN_MODO'));

drop policy if exists configuracoes_select_autenticado on public.configuracoes;
create policy configuracoes_select_autenticado
  on public.configuracoes for select
  to authenticated
  using (true);

drop policy if exists configuracoes_write_admin on public.configuracoes;
create policy configuracoes_write_admin
  on public.configuracoes for all
  to authenticated
  using (public.sme_perfil_atual() = 'ADMIN_GOM')
  with check (public.sme_perfil_atual() = 'ADMIN_GOM');

-- -----------------------------------------------------------------------------
-- 4) solicitacoes — tabela principal de chamados.
--    Secretaria/GOM/Admin: acesso total. Escola: só os chamados da própria
--    unidade (select/insert). Empresa (anon): select/update amplos — é a
--    limitação conhecida do PIN compartilhado, documentada no topo do arquivo.
-- -----------------------------------------------------------------------------
alter table public.solicitacoes enable row level security;

drop policy if exists solicitacoes_staff_full on public.solicitacoes;
create policy solicitacoes_staff_full
  on public.solicitacoes for all
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'))
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

drop policy if exists solicitacoes_escola_select on public.solicitacoes;
create policy solicitacoes_escola_select
  on public.solicitacoes for select
  to authenticated
  using (
    public.sme_perfil_atual() = 'ESCOLA'
    and escola_id = public.sme_escola_id_atual()
  );

drop policy if exists solicitacoes_escola_insert on public.solicitacoes;
create policy solicitacoes_escola_insert
  on public.solicitacoes for insert
  to authenticated
  with check (
    public.sme_perfil_atual() = 'ESCOLA'
    and escola_id = public.sme_escola_id_atual()
  );

drop policy if exists solicitacoes_empresa_select on public.solicitacoes;
create policy solicitacoes_empresa_select
  on public.solicitacoes for select
  to anon
  using (true);

drop policy if exists solicitacoes_empresa_update on public.solicitacoes;
create policy solicitacoes_empresa_update
  on public.solicitacoes for update
  to anon
  using (true)
  with check (true);

-- -----------------------------------------------------------------------------
-- 5) log_acoes / historico_equipes — trilha de auditoria dos chamados.
--    Staff: leitura total. Escola: leitura só da própria unidade. Empresa
--    (anon): só insert (registra atendimento/orçamento), sem editar histórico
--    alheio.
-- -----------------------------------------------------------------------------
alter table public.log_acoes enable row level security;
alter table public.historico_equipes enable row level security;

drop policy if exists log_acoes_staff_full on public.log_acoes;
create policy log_acoes_staff_full
  on public.log_acoes for all
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'))
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

drop policy if exists log_acoes_escola_select on public.log_acoes;
create policy log_acoes_escola_select
  on public.log_acoes for select
  to authenticated
  using (
    public.sme_perfil_atual() = 'ESCOLA'
    and exists (
      select 1 from public.solicitacoes s
      where s.id = log_acoes.solicitacao_id
        and s.escola_id = public.sme_escola_id_atual()
    )
  );

drop policy if exists log_acoes_empresa_insert on public.log_acoes;
create policy log_acoes_empresa_insert
  on public.log_acoes for insert
  to anon
  with check (true);

drop policy if exists historico_equipes_staff_full on public.historico_equipes;
create policy historico_equipes_staff_full
  on public.historico_equipes for all
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'))
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

drop policy if exists historico_equipes_escola_select on public.historico_equipes;
create policy historico_equipes_escola_select
  on public.historico_equipes for select
  to authenticated
  using (
    public.sme_perfil_atual() = 'ESCOLA'
    and exists (
      select 1 from public.solicitacoes s
      where s.id = historico_equipes.solicitacao_id
        and s.escola_id = public.sme_escola_id_atual()
    )
  );

drop policy if exists historico_equipes_empresa_insert on public.historico_equipes;
create policy historico_equipes_empresa_insert
  on public.historico_equipes for insert
  to anon
  with check (true);

-- -----------------------------------------------------------------------------
-- 6) anexos — arquivos ligados a um chamado. Mesmo padrão de solicitacoes.
-- -----------------------------------------------------------------------------
alter table public.anexos enable row level security;

drop policy if exists anexos_staff_full on public.anexos;
create policy anexos_staff_full
  on public.anexos for all
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'))
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

drop policy if exists anexos_escola_select on public.anexos;
create policy anexos_escola_select
  on public.anexos for select
  to authenticated
  using (
    public.sme_perfil_atual() = 'ESCOLA'
    and exists (
      select 1 from public.solicitacoes s
      where s.id = anexos.solicitacao_id
        and s.escola_id = public.sme_escola_id_atual()
    )
  );

drop policy if exists anexos_escola_insert on public.anexos;
create policy anexos_escola_insert
  on public.anexos for insert
  to authenticated
  with check (
    public.sme_perfil_atual() = 'ESCOLA'
    and exists (
      select 1 from public.solicitacoes s
      where s.id = anexos.solicitacao_id
        and s.escola_id = public.sme_escola_id_atual()
    )
  );

drop policy if exists anexos_empresa_select on public.anexos;
create policy anexos_empresa_select
  on public.anexos for select
  to anon
  using (true);

drop policy if exists anexos_empresa_insert on public.anexos;
create policy anexos_empresa_insert
  on public.anexos for insert
  to anon
  with check (true);

-- -----------------------------------------------------------------------------
-- 7) obras — tela restrita a ADMIN_GOM/SECRETARIA/GOM (Empresa e Escola não
--    têm essa tela hoje, então nenhum acesso anon é concedido).
-- -----------------------------------------------------------------------------
alter table public.obras enable row level security;

drop policy if exists obras_staff_full on public.obras;
create policy obras_staff_full
  on public.obras for all
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'))
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

-- -----------------------------------------------------------------------------
-- 8) equipes — nome/tipo/ativo de equipes é usado em formulários de todos os
--    perfis (dropdown), sem dado sensível. Escrita só para quem gerencia
--    equipes (ADMIN_GOM/SECRETARIA/GOM).
-- -----------------------------------------------------------------------------
alter table public.equipes enable row level security;

drop policy if exists equipes_select_all on public.equipes;
create policy equipes_select_all
  on public.equipes for select
  to anon, authenticated
  using (true);

drop policy if exists equipes_write_staff on public.equipes;
create policy equipes_write_staff
  on public.equipes for insert
  to authenticated
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

drop policy if exists equipes_update_staff on public.equipes;
create policy equipes_update_staff
  on public.equipes for update
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'))
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

drop policy if exists equipes_delete_staff on public.equipes;
create policy equipes_delete_staff
  on public.equipes for delete
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

-- -----------------------------------------------------------------------------
-- 9) equipe_membros — contém nome/telefone/e-mail PESSOAL dos integrantes:
--    dado sensível de verdade. Só staff (ADMIN_GOM/SECRETARIA/GOM) enxerga.
-- -----------------------------------------------------------------------------
alter table public.equipe_membros enable row level security;

drop policy if exists equipe_membros_staff_full on public.equipe_membros;
create policy equipe_membros_staff_full
  on public.equipe_membros for all
  to authenticated
  using (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'))
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

-- -----------------------------------------------------------------------------
-- 10) email_fila — fila de e-mails a enviar: contém destinatário e corpo do
--     e-mail (dado sensível). Só staff pode enfileirar; ninguém lê pelo
--     cliente (o worker que envia usa a service_role key, que ignora RLS).
-- -----------------------------------------------------------------------------
alter table public.email_fila enable row level security;

drop policy if exists email_fila_staff_insert on public.email_fila;
create policy email_fila_staff_insert
  on public.email_fila for insert
  to authenticated
  with check (public.sme_perfil_atual() in ('ADMIN_GOM', 'SECRETARIA', 'GOM'));

-- =============================================================================
-- 11) Variantes hml_* (homologação, mesmo projeto Supabase — ver
--     docs/LEIA-ME-HOMOLOGACAO-HML.md). Simplificação deliberada: como
--     homologação é usada pela equipe interna, aqui basta exigir sessão
--     autenticada (perfil válido) — sem a granularidade fina de produção.
--     Aperte manualmente se homologação também for usada por Empresa/Escola
--     de fora da equipe. O bloco é seguro mesmo se as tabelas hml_* não
--     existirem (ele pula silenciosamente).
-- =============================================================================
do $$
declare
  t text;
  tabelas text[] := array[
    'solicitacoes', 'anexos', 'historico_equipes', 'log_acoes', 'obras',
    'configuracoes', 'perfis', 'equipes', 'equipe_membros', 'email_fila'
  ];
begin
  foreach t in array tabelas loop
    if to_regclass('public.hml_' || t) is not null then
      execute format('alter table public.%I enable row level security', 'hml_' || t);
      execute format('drop policy if exists hml_staff_full_access on public.%I', 'hml_' || t);
      execute format(
        'create policy hml_staff_full_access on public.%I for all to authenticated using (public.sme_perfil_atual(true) is not null) with check (public.sme_perfil_atual(true) is not null)',
        'hml_' || t
      );
    end if;
  end loop;
end $$;

-- =============================================================================
-- 12) Conferência: liste todas as tabelas do schema public e confirme que
--     "rowsecurity" está "t" (true) em todas antes de considerar concluído.
-- =============================================================================
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
