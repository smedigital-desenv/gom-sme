# GOM | SME — Repositório modular (GitHub Pages + Supabase)

Cada tela e módulo tem o seu próprio arquivo — igual ao Apps Script, mas agora no
GitHub Pages com controle de versão no git. Nada de monólito.

---

## Estrutura de pastas

```
index.html                   ← shell da app + nav + templates de tela + modal (56 KB)
css/
  styles.css                 ← todo o CSS (extraído do Styles.html)
js/
  config.js                  ← URL e chave do Supabase  ← VOCÊ PREENCHE
  gom-config.js              ← GOM_CONFIG: abas, status, cores, SLAs
  utils.js                   ← utilitários: formatação, datas, normalização
  permissoes.js              ← perfis e permissões
  dashboard.js               ← lógica do Dashboard
  state.js                   ← estado global e inicialização do sistema
  router.js                  ← roteamento entre telas
  render-chamados.js         ← renderização dos chamados (Triagem, Fila, Memorial...)
  triagem-fila-inline.js     ← tela Triagem e Fila com ações inline (rich UI)
  modal-chamados.js          ← modal de análise do chamado
  empresa.js                 ← Painel da Empresa (Execução diária, Orçamentos, OS)
  formularios.js             ← formulários de entrada
  obras.js                   ← tela de Obras
  campo.js                   ← tela Campo (execução em campo)
  alertas.js                 ← tela Alertas + cobrança da empresa
  relatorios.js              ← tela Relatórios
  acompanhar.js              ← portal de acompanhamento (escola)
  configuracoes-ui.js        ← tela Configurações do Sistema
  runtime-patch.js           ← patches e fallbacks em runtime
  supabase/
    mapeadores.js            ← conversão DB→frontend + formatação de datas (ponto de ajuste)
    anexos.js                ← Storage (no lugar do Drive)
    dados.js                 ← todas as leituras e escritas no Supabase
    api.js                   ← ponte: google.script.run → Supabase
sql/
  01_schema.sql              ← cria o banco (tabelas, RLS, seeds)
```

**Manutenção prática:** quero ajustar o Painel da Empresa → abro `js/empresa.js`.
Quero mudar a triagem inline → abro `js/triagem-fila-inline.js`. Cada arquivo tem
exatamente o escopo que o nome indica, igual ao Apps Script.

---

## Passo a passo de instalação

### 1. Supabase

1. **SQL Editor → New query →** cole `sql/01_schema.sql` → **Run**.
2. **Storage → New bucket →** nome `anexos`, marque **Private**.
3. **Settings → API →** copie o **Project URL** e a **anon public key**.

### 2. Preencher credenciais

Abra `js/config.js` e preencha:

```js
URL: 'https://SEU-PROJETO.supabase.co',
ANON_KEY: 'sua-anon-public-key',
```

### 3. GitHub Pages

```bash
# Coloque os arquivos no repo smedigital-desenv/gom-sme
git add .
git commit -m "GOM: migração modular para Supabase"
git push
```

**Settings → Pages →** confirme branch e pasta → aguarde ~1 min.

### 4. Dados de teste (opcional — sistema começa vazio)

No SQL Editor do Supabase:

```sql
insert into escolas (nome, tipo) values
  ('GIRASSOL ENCANTADO, CEI','CEI'),
  ('JARBAS MASSULO, PROF., EMEF','EMEF')
on conflict (nome) do nothing;

insert into equipes (nome, tipo) values
  ('Equipe A','secretaria'),
  ('Equipe Empresa 1','empresa')
on conflict (nome,tipo) do nothing;

insert into solicitacoes (escola_id, origem, detalhamento, situacao)
select id, 'Teste', 'Chamado de teste do sistema', 'Em análise'
from escolas limit 1;
```

---

## Como o sistema funciona

```
Tela chama google.script.run.FUNC(payload)
  → js/supabase/api.js (a ponte) roteia para
  → js/supabase/dados.js (executa a query no Supabase)
  → js/supabase/mapeadores.js (converte linha do banco → objeto esperado pelas telas)
  → retorna para a tela no mesmo formato de antes
```

As telas não sabem que o backend mudou de Apps Script para Supabase.

---

## Onde mexer para cada tipo de mudança

| O que mudar | Arquivo |
|---|---|
| Layout ou lógica de uma tela | `js/<nome-da-tela>.js` |
| CSS / visual geral | `css/styles.css` |
| Uma query ou escrita no banco | `js/supabase/dados.js` |
| Campo errado ou data com formato estranho | `js/supabase/mapeadores.js` |
| Upload/leitura de anexos | `js/supabase/anexos.js` |
| Credenciais do Supabase | `js/config.js` |
| Estrutura de tabelas | `sql/01_schema.sql` + rodar no SQL Editor |
| Status, cores, SLAs do sistema | `js/gom-config.js` |

---

## Próximas fases

1. **Validar com dados reais** — ajustes de formato em `mapeadores.js`.
2. **Migração dos dados** das planilhas para as tabelas.
3. **Login Google + RLS** — sair do modo ABERTO usando `perfis`.
4. **E-mail** via Edge Function + cron.

---

## Se algo não carregar

Abra **F12 → Console**. Você verá:

- `[GOM] Supabase conectado` — cliente iniciou.
- `[GOM] Ponte Supabase ativa` — shim instalado.
- `[GOM] Erro em <FUNC>: ...` — qual função e o erro específico.

Me mande o texto do erro que eu corrijo diretamente no arquivo correspondente.
