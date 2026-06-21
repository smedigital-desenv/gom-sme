# Dashboard de Controle de Serviços — migração para o GitHub Pages

Página independente do app principal. O HTML mora aqui no repositório
(servido pelo GitHub Pages), mas **os dados continuam na planilha do Google**.

| Arquivo | Papel |
|---|---|
| `saldo.html` | A página (front-end), servida pelo GitHub Pages |
| `apps-script/ControleServicos.Code.gs` | Backend no Apps Script, publicado como Web App (API JSON) |

## Por que mudou

No Apps Script o HTML chamava `google.script.run.getDados()`. Isso **só
funciona dentro do Apps Script** — no GitHub Pages essa ponte não existe.

A solução: o Apps Script continua dono dos dados, mas agora o `doGet`
devolve **JSON** em vez de servir a página. O HTML busca esse JSON com
`fetch(API_URL)`. Toda a lógica de leitura da planilha (`getDados`) ficou
igual; só mudou o transporte.

```
saldo.html  ──fetch(/exec)──►  Web App (Apps Script)  ──►  Planilha "Plan1"
```

## Passo a passo

### 1. Publicar o Apps Script como Web App

1. Abra o projeto Apps Script **vinculado à planilha** e cole o conteúdo de
   `apps-script/ControleServicos.Code.gs` (substitua o `doGet`/`getDados` antigos).
2. **Implantar → Nova implantação → ⚙ → App da Web**.
3. Configure:
   - **Executar como:** Eu (dono da planilha)
   - **Quem tem acesso:** **Qualquer pessoa**  ← necessário para o `fetch` do navegador
4. **Implantar**, autorize e **copie a URL** que termina em `/exec`.

> A cada alteração no `.gs`, use **Implantar → Gerenciar implantações → Editar →
> Nova versão**, senão a URL continua servindo o código antigo.

### 2. Apontar o HTML para o Web App

Em `saldo.html`, no topo do `<script>`, troque:

```js
const API_URL = 'COLE_AQUI_A_URL_DO_WEB_APP/exec';
```

pela URL `/exec` copiada no passo anterior.

### 3. Publicar no GitHub Pages

```bash
git add saldo.html apps-script/ControleServicos.Code.gs docs/LEIA-ME-CONTROLE-SERVICOS.md
git commit -m "Dashboard Controle de Serviços: migra para GitHub Pages com API JSON no Apps Script"
git push
```

A página fica em: `https://smedigital-desenv.github.io/gom-sme/saldo.html`

## Se não carregar

Abra **F12 → Console / Network**:

- **CORS / "Failed to fetch"** → a implantação não está como **Qualquer pessoa**,
  ou você editou o `.gs` e não criou uma **nova versão** da implantação.
- **"Configure a constante API_URL…"** → a `API_URL` ainda está com o placeholder.
- **HTTP 401/403** → acesso da implantação está restrito; reabra e marque
  *Quem tem acesso: Qualquer pessoa*.
- **Cannot read properties of null (getSheetByName)** → a aba não se chama `Plan1`
  ou o script não está vinculado à planilha certa.

> O `fetch` do navegador para um Web App segue um redirect para
> `script.googleusercontent.com`, que devolve os dados com CORS liberado para GET.
> Por isso só funciona com a implantação aberta a *Qualquer pessoa*.
