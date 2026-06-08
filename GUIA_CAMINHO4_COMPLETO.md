# GOM | SME — Implementação Fase 4: Caminho 4
## Google OAuth (Secretaria) + PIN (Empresa)

---

## ANTES DE COMEÇAR — Correção de Configurações

**Problema:** A tela de Configurações mostra "0 configurações".
**Causa provável:** RLS do Supabase bloqueando leitura de configurações para anon após rodar o SQL de fases anteriores.

**Passo A — Rode no Supabase → SQL Editor:**
```sql
-- Garante acesso às configurações enquanto estiver em modo ABERTO
drop policy if exists config_anon_login    on public.configuracoes;
drop policy if exists config_anon_limitado on public.configuracoes;
drop policy if exists tmp_aberto_all       on public.configuracoes;

create policy config_anon_aberto on public.configuracoes
  for select to anon
  using (true);
```

**Passo B — Atualize o arquivo:**
- `js/supabase/dados.js` → use o arquivo `dados.js` entregue junto com este guia.

Após o deploy, clique em **Recarregar** na tela de Configurações.

---

## VISÃO GERAL DO QUE VAI ACONTECER

Ao final desta implementação:

- Secretaria acessa `smedigital.com.br/gom-sme/` → clica em "Entrar com Google" →
  escolhe a conta `@educacao.pmrp.sp.gov.br` → entra no sistema com perfil
  definido (ADMIN_GOM, GOM, etc.).

- Empresa acessa o mesmo URL → clica na aba "Empresa" → digita o PIN que você
  configurou → entra direto na tela Empresa.

- Se o login não estiver ativado (`LOGIN_ATIVO = 'NÃO'`), o sistema funciona como hoje
  (modo ABERTO). Você ativa quando quiser.

---

## PASSO 1 — Verificar acesso ao Google Cloud Console

### O que é
O Google Cloud Console é onde você cria o "aplicativo" que permite ao seu site
usar o login com Google. É gratuito.

### O que verificar antes

1. Acesse: https://console.cloud.google.com
   - Use uma conta Google pessoal OU a conta institucional da prefeitura.
   - **Recomendação:** Use sua conta pessoal para não depender de aprovações do TI da prefeitura.

2. Na tela inicial, verifique se consegue:
   - Criar um novo projeto (botão "Selecionar projeto" → "Novo projeto")
   - Se aparecer "Organização bloqueou criação de projetos", use outra conta.

3. Se nunca usou o Google Cloud, ele pode pedir um número de cartão de crédito
   para "verificação de identidade". **Não será cobrado nada** — o que usaremos
   é 100% gratuito e não tem limites relevantes para o volume da prefeitura.

### Checklist
```
[ ] Consigo acessar console.cloud.google.com
[ ] Consigo criar um projeto (ou já tenho um)
[ ] Conta que vou usar: ________________________________
```

---

## PASSO 2 — Criar o projeto no Google Cloud

1. Acesse: https://console.cloud.google.com
2. Clique em **"Selecionar projeto"** (canto superior esquerdo, ao lado do logo Google Cloud)
3. Clique em **"Novo projeto"** (canto superior direito do popup)
4. Preencha:
   - **Nome do projeto:** `GOM-SME-RP`
   - **Organização:** deixe como está (ou selecione a da prefeitura)
5. Clique em **Criar**
6. Aguarde alguns segundos e confirme que o projeto `GOM-SME-RP` está selecionado na barra superior.

---

## PASSO 3 — Configurar a tela de consentimento OAuth

Esta é a tela que o usuário vê quando loga com o Google ("GOM SME está pedindo
acesso ao seu e-mail").

1. No menu lateral esquerdo: **APIs e Serviços → Tela de consentimento OAuth**
   (ou acesse: https://console.cloud.google.com/apis/credentials/consent)

2. Em "Tipo de usuário", selecione:
   - **Interno** → se você está usando a conta do Google Workspace da prefeitura
     e quer restringir o login apenas ao domínio `@educacao.pmrp.sp.gov.br`.
   - **Externo** → se está usando conta pessoal OU quer permitir qualquer e-mail
     (mais flexível; você controla o acesso pela tabela `perfis` no banco).
   - **👉 Recomendação: escolha Externo.** Mais simples e você controla quem pode
     acessar pelo banco de dados, não pelo Google.

3. Clique em **Criar**

4. Preencha o formulário:
   - **Nome do app:** `GOM | SME - Ribeirão Preto`
   - **E-mail de suporte:** seu e-mail
   - **Logo:** pode pular
   - **Domínio do app:** `smedigital.com.br`
   - **E-mail do desenvolvedor:** seu e-mail
   - Clique em **Salvar e continuar**

5. Tela "Escopos":
   - Clique em **Adicionar ou remover escopos**
   - Marque: `../auth/userinfo.email` e `../auth/userinfo.profile`
   - Clique em **Atualizar** → **Salvar e continuar**

6. Tela "Usuários de teste":
   - Se escolheu "Externo" e o app ainda não está publicado, precisa adicionar
     os e-mails dos usuários aqui para que possam fazer login.
   - Clique em **+ Add users** e adicione todos os e-mails da equipe
     (incluindo o seu).
   - **Importante:** adicione também o e-mail que será usado para testar.
   - Clique em **Salvar e continuar**

7. Tela "Resumo": clique em **Voltar ao painel**

### Nota sobre "Publicar app"
Enquanto o app estiver em modo "Teste", só os e-mails adicionados em
"Usuários de teste" conseguem logar. Para produção, clique em
**Publicar app** → o Google pode pedir uma revisão (demora 1-3 dias).
Para uso interno da prefeitura, geralmente não é necessário publicar.

---

## PASSO 4 — Criar as credenciais OAuth

1. Menu lateral: **APIs e Serviços → Credenciais**
   (ou: https://console.cloud.google.com/apis/credentials)

2. Clique em **"+ Criar credenciais" → "ID do cliente OAuth"**

3. Preencha:
   - **Tipo de aplicativo:** `Aplicativo da Web`
   - **Nome:** `GOM SME Web`

4. Em **"Origens JavaScript autorizadas"**, clique em "+ Adicionar URI" e adicione:
   ```
   https://smedigital.com.br
   ```
   (Se também tiver a versão sem www, adicione `https://www.smedigital.com.br`)

5. Em **"URIs de redirecionamento autorizados"**, clique em "+ Adicionar URI" e adicione:
   ```
   https://iqldovwttomkjkoakosc.supabase.co/auth/v1/callback
   ```
   (Este é o endereço do seu projeto Supabase — já está preenchido com o seu projeto)

6. Clique em **Criar**

7. Vai aparecer um popup com:
   - **ID do cliente:** algo como `123456789-abc.apps.googleusercontent.com`
   - **Chave secreta do cliente:** algo como `GOCSPX-abc123...`
   - **Copie os dois** — você vai precisar no próximo passo.
   - Clique em **OK**

```
Anote aqui:
ID do cliente:     ________________________________
Chave secreta:     ________________________________
```

---

## PASSO 5 — Configurar Google OAuth no Supabase

1. Acesse o **Supabase Dashboard**: https://supabase.com/dashboard
2. Selecione o projeto **gom-sme**
3. No menu lateral: **Authentication → Providers**
4. Encontre **Google** na lista e clique nele
5. Ative o toggle **Enable Google provider**
6. Preencha:
   - **Client ID (for OAuth):** cole o ID do cliente do Passo 4
   - **Client Secret:** cole a chave secreta do Passo 4
7. Clique em **Save**

### Verificar URL de callback
Na mesma tela, confirme que a URL de callback é:
```
https://iqldovwttomkjkoakosc.supabase.co/auth/v1/callback
```
Essa URL já foi adicionada no Google Cloud no Passo 4.

---

## PASSO 6 — Configurar Supabase Auth (e-mail magic link opcional)

O Caminho 4 usa principalmente Google OAuth, mas o magic link é usado
para casos de fallback. Configure:

1. **Authentication → Providers → Email**
   - **Enable Email provider:** ON
   - **Confirm email:** OFF (para magic link sem senha)
   - **Secure email change:** ON (segurança para troca de e-mail)
   - Clique em **Save**

2. **Authentication → URL Configuration**
   - **Site URL:** `https://smedigital.com.br/gom-sme/`
   - **Redirect URLs:** adicione `https://smedigital.com.br/gom-sme/`
   - Clique em **Save**
   
   ⚠️ Este passo é crítico! Sem a URL de redirecionamento, o usuário fica
   numa página em branco após o login com Google.

---

## PASSO 7 — Rodar o SQL de setup

No Supabase → **SQL Editor → New query**, cole e execute:

```sql
-- ── Tabela perfis (garante existência) ───────────────────────────────────
create table if not exists public.perfis (
  email      text primary key,
  perfil     text not null check (perfil in (
    'ADMIN_GOM','GOM','EMPRESA','CAMPO','CONFERENTE','ESCOLA','PUBLICO','SEM_ACESSO'
  )),
  escola_id  bigint references public.escolas(id),
  ativo      boolean not null default true,
  criado_em  timestamptz not null default now()
);

alter table public.perfis enable row level security;
drop policy if exists perfis_leitura on public.perfis;
drop policy if exists perfis_admin   on public.perfis;
drop policy if exists p_build_all    on public.perfis;

-- Usuário logado lê o próprio perfil
create policy perfis_leitura on public.perfis
  for select to authenticated
  using (lower(email) = lower(auth.jwt() ->> 'email'));

-- Admin gerencia todos os perfis
create policy perfis_admin on public.perfis
  for all to authenticated
  using (
    exists (
      select 1 from public.perfis p2
      where lower(p2.email) = lower(auth.jwt() ->> 'email')
        and p2.perfil = 'ADMIN_GOM' and p2.ativo = true
    )
  )
  with check (true);

-- ── Configurações para o login ────────────────────────────────────────────
insert into public.configuracoes (chave, valor, grupo, descricao, ativo) values
  ('LOGIN_ATIVO',             'NÃO', 'Acesso', 'SIM = obriga login; NÃO = modo ABERTO (todos acessam)', true),
  ('CODIGO_ACESSO_EMPRESA',   '',    'Acesso', 'PIN de acesso para o perfil Empresa', true),
  ('LOGIN_MODO',              'GOOGLE_PIN', 'Acesso', 'Modo de login ativo', true)
on conflict (chave) do nothing;

-- ── Restaurar acesso às configurações para anon ───────────────────────────
drop policy if exists config_anon_login    on public.configuracoes;
drop policy if exists config_anon_limitado on public.configuracoes;
drop policy if exists tmp_aberto_all       on public.configuracoes;

create policy config_anon_aberto on public.configuracoes
  for select to anon
  using (true);
```

---

## PASSO 8 — Cadastrar os perfis dos usuários

Ainda no SQL Editor, cadastre os e-mails de quem pode acessar o sistema.
**Substitua pelos e-mails reais** da sua equipe:

```sql
insert into public.perfis (email, perfil, ativo) values
  -- Administradores (acesso total, incluindo Configurações)
  ('diogoperez@educacao.pmrp.sp.gov.br',   'ADMIN_GOM',  true),

  -- Equipe operacional (todas as telas exceto Configurações)
  -- ('fulano@educacao.pmrp.sp.gov.br',     'GOM',        true),
  -- ('ciclano@educacao.pmrp.sp.gov.br',    'GOM',        true),

  -- Campo (apenas telas Campo e Acompanhar)
  -- ('campo@educacao.pmrp.sp.gov.br',      'CAMPO',      true),

  -- Conferente (leitura: dashboard, obras, memorial, relatórios)
  -- ('conferente@educacao.pmrp.sp.gov.br', 'CONFERENTE', true)

  -- Empresa NÃO entra aqui — usa PIN separado
on conflict (email) do update
  set perfil = excluded.perfil,
      ativo  = excluded.ativo;
```

> **Adicionar usuário no futuro:**
> ```sql
> INSERT INTO perfis (email, perfil) VALUES ('novo@educacao.pmrp.sp.gov.br', 'GOM');
> ```
>
> **Revogar acesso:**
> ```sql
> UPDATE perfis SET ativo = false WHERE email = 'usuario@educacao.pmrp.sp.gov.br';
> ```

---

## PASSO 9 — Configurar o PIN da Empresa

Na tela de **Configurações do Sistema** do GOM (quando estiver funcionando),
edite a chave `CODIGO_ACESSO_EMPRESA` com o PIN desejado.

Ou direto no SQL:
```sql
UPDATE public.configuracoes
SET valor = 'PIN-AQUI'
WHERE chave = 'CODIGO_ACESSO_EMPRESA';
```

> Escolha um PIN com 6-10 caracteres. Evite datas de nascimento.
> Para trocar: edite na tela de Configurações ou rode o UPDATE acima.

---

## PASSO 10 — Colocar os arquivos no repositório

### Arquivos a atualizar/criar:

| Arquivo local | Destino no repositório |
|---|---|
| `login_caminho4_hibrido.js` | `js/login.js` (substitui) |
| `dados.js` | `js/supabase/dados.js` (substitui) |
| `index.html` | `index.html` (já inclui tag do login.js) |

### No repositório GitHub (smedigital-desenv/gom-sme):

```bash
# Se trabalha localmente com git:
cp login_caminho4_hibrido.js js/login.js
cp dados.js js/supabase/dados.js

git add js/login.js js/supabase/dados.js index.html
git commit -m "Fase 4: Google OAuth + PIN empresa"
git push origin main
```

Ou edite os arquivos diretamente no editor do GitHub (como tem feito).

---

## PASSO 11 — Testar ANTES de ativar o login obrigatório

O sistema ainda está em modo ABERTO (LOGIN_ATIVO = 'NÃO').
Após o deploy, teste o fluxo de login sem bloquear ninguém:

1. Acesse: `https://smedigital.com.br/gom-sme/`
2. O sistema deve carregar normalmente (modo ABERTO).
3. Abra o Console do browser (F12) e execute:
   ```js
   // Simula o login Google manualmente para testar
   window.gomEntrarGoogle()
   ```
4. Deve redirecionar para a tela do Google → selecione sua conta.
5. Após voltar, verifique no Console:
   ```js
   window.GomAuth.perfil   // deve mostrar 'ADMIN_GOM' ou o perfil cadastrado
   window.GomAuth.email    // deve mostrar seu e-mail
   ```
6. Teste o PIN da empresa:
   - Na tela de login (se aparecer), clique em "Empresa"
   - Digite o PIN cadastrado
   - Deve entrar e mostrar SOMENTE a tela Empresa

### Se o Google retornar erro de "redirect_uri_mismatch":
- Verifique o Passo 4 — o URI de redirecionamento no Google Cloud Console deve
  ser exatamente: `https://iqldovwttomkjkoakosc.supabase.co/auth/v1/callback`

### Se aparecer "Access blocked: This app's request is invalid":
- O app está em modo "Teste" e o e-mail não está na lista de usuários de teste.
- Volte ao Google Cloud Console → Tela de consentimento → Usuários de teste →
  adicione o e-mail.

### Se entrar mas o perfil vier como 'GOM' em vez de 'ADMIN_GOM':
- O e-mail logado não bate com o cadastrado em `perfis`.
- Verifique: `SELECT email, perfil FROM perfis;` no SQL Editor.
- Confirme que o e-mail está idêntico ao que o Google retorna.

---

## PASSO 12 — Ativar o login obrigatório

Quando todos os testes estiverem OK, ative:

```sql
UPDATE public.configuracoes
SET valor = 'SIM'
WHERE chave = 'LOGIN_ATIVO';
```

A partir desse momento, qualquer pessoa que acessar a URL verá a tela de login.
Usuários não cadastrados em `perfis` entram com perfil `GOM` (pode mudar isso
no `login.js` se preferir bloquear completamente).

---

## PASSO 13 — Adicionar usuários da Empresa como Google Workspace (opcional)

Se a empresa terceirizada tiver e-mail Google e quiser usar o botão Google
em vez do PIN, basta cadastrar o e-mail dela em `perfis` com perfil `EMPRESA`:

```sql
INSERT INTO perfis (email, perfil, ativo)
VALUES ('contato@empresa-terceirizada.com.br', 'EMPRESA', true);
```

Ela clica em "Entrar com Google" (qualquer conta Google funciona, não só
@educacao), entra e vê somente a tela Empresa.

---

## CHECKLIST FINAL

```
PREPARAÇÃO:
[ ] Passo A: SQL de correção de configurações rodado
[ ] dados.js atualizado no repositório

GOOGLE CLOUD:
[ ] Projeto criado: GOM-SME-RP
[ ] Tela de consentimento configurada (Externo)
[ ] E-mails de teste adicionados (incluindo o seu)
[ ] Credenciais OAuth criadas
[ ] Client ID copiado: ______________________________
[ ] Client Secret copiado: ______________________________

SUPABASE:
[ ] Google provider ativado com Client ID e Secret
[ ] Site URL configurado: https://smedigital.com.br/gom-sme/
[ ] Redirect URL adicionado
[ ] SQL do Passo 7 executado
[ ] Perfis cadastrados (Passo 8)
[ ] PIN da empresa configurado (Passo 9)

CÓDIGO:
[ ] login_caminho4_hibrido.js → js/login.js
[ ] dados.js → js/supabase/dados.js
[ ] index.html atualizado
[ ] Commit e push realizados

TESTES:
[ ] Login com Google funciona (redireciona e volta)
[ ] Perfil correto carregado após login
[ ] PIN da empresa funciona
[ ] Empresa vê SOMENTE a tela Empresa
[ ] Secretaria vê todas as telas corretas para o perfil

ATIVAÇÃO:
[ ] LOGIN_ATIVO = 'SIM' atualizado no banco
[ ] Teste de acesso sem login confirmado (deve pedir login)
[ ] Todos os usuários conseguem acessar
```

---

## REFERÊNCIA RÁPIDA — URLs importantes

| Recurso | URL |
|---|---|
| Sistema GOM | `https://smedigital.com.br/gom-sme/` |
| Google Cloud Console | `https://console.cloud.google.com` |
| Supabase Dashboard | `https://supabase.com/dashboard/project/iqldovwttomkjkoakosc` |
| Supabase Auth Settings | `https://supabase.com/dashboard/project/iqldovwttomkjkoakosc/auth/providers` |
| Supabase SQL Editor | `https://supabase.com/dashboard/project/iqldovwttomkjkoakosc/sql` |
| Callback OAuth (Google Cloud) | `https://iqldovwttomkjkoakosc.supabase.co/auth/v1/callback` |
