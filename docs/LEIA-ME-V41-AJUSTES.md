# GOM/SME — Ajustes v41 (Triagem, Validação, Campo e Anexos no Drive)

Pacote incremental sobre a base **v40** (gerencial OS). Substitua os arquivos
listados abaixo no repositório — nenhum arquivo novo de tela foi criado, o
layout e os fluxos existentes (login, PIN, permissões, datas BR, agenda,
fila, equipes separadas, configurações) **não foram tocados**.

`docs/PATCH-v41.diff` contém o diff completo contra a base v40, para revisão.

---

## ORDEM DE APLICAÇÃO

1. **Supabase**: rodar `sql/11_garantia_servico_e_anexos_drive.sql` no SQL
   Editor (obrigatório ANTES do deploy — o novo status é FK em
   `historico_equipes`/`log_acoes`; sem o seed, salvar "Garantia de Serviço"
   falha).
2. **Apps Script**: criar o Web App com `apps-script/GomDriveAPI.gs`
   (trocar o TOKEN, executar `testarUpload` 1x para autorizar, publicar com
   acesso **"Qualquer pessoa"** — detalhes no GUIA-DRIVE.md já entregue).
3. **GitHub**: subir os arquivos deste pacote. Em `js/config.js`, preencher
   `GOM_DRIVE.URL` (URL /exec) e `GOM_DRIVE.TOKEN` (mesmo do passo 2).

---

## O QUE MUDOU, POR ARQUIVO

### 1. Triagem (sem data + Garantia de Obra)
- **index.html** — removido o bloco "Encaminhar todos para: [data]" da
  Triagem; texto de ajuda atualizado. (O bloco de data da FILA permanece
  intacto — a lógica da Fila não muda.)
- **js/triagem-fila-inline.js** — encaminhamentos da triagem agora incluem
  "Garantia de Obra". O salvamento já era tolerante à ausência da data
  (guard `inputData && inputData.value`), então nenhuma ação exige data.
- **js/supabase/mapeadores.js** — regra de fluxo: `Em análise` agora permite
  transição para "Garantia de Obra" (sem isso o backend bloquearia o save).

### 2. Aprovação/Validação do Serviço Realizado
- **js/modal-chamados.js** —
  (a) corrigido bug: o fluxo de decisão de ORÇAMENTO (aprovar/ajuste/negar)
  era aplicado a qualquer chamado aberto na tela Aprovação, inclusive
  "Serviço Realizado"; agora vale apenas para "Orçamento Realizado";
  (b) "Serviço Realizado" mostra somente duas decisões:
  **"Validar e enviar para Memorial"** (→ Concluído) e
  **"Garantia de Serviço (retorna à empresa)"**.
- **js/render-chamados.js** — o card inline de validação na tela Aprovação
  passou de 3 opções (Memorial/Garantia de Obra/Devolver) para as mesmas
  2 decisões; texto de ajuda atualizado.
- **js/supabase/mapeadores.js** — `Serviço Realizado.proximos = ['Concluído',
  'Garantia de Serviço']` (backend rejeita qualquer outra transição);
  novo status `Garantia de Serviço` → tela Empresa, exige equipe do dia e
  observação, anexo de serviço, e volta para "Serviço Realizado" ao
  finalizar (ciclo de garantia). "Garantia de Obra" segue intacto e
  separado. Aliases e cor (#a855f7 roxo) incluídos.
- **Novo status em todos os pontos**: `js/gom-config.js` (STATUS_TODOS,
  STATUS_EMPRESA, _DIARIO, _GERENCIAL, STATUS_CAMPO, KPI "Garantia de
  serviço", cores), `js/runtime-patch.js` (fallbacks), `js/state.js`,
  `js/dashboard.js`, `js/relatorios.js`, `js/utils.js` (classe CSS, ícone
  bi-arrow-repeat, descrição), `css/styles.css` (var `--garantia-servico`),
  `js/supabase/dados.js` (campo, previsão de conclusão, texto do protocolo,
  carimbo de `data_hora_encaminhamento` ao entrar em garantia).
- **sql/11** — seed do status no `status_chamado`.
- O chamado finalizado pela Empresa continua indo para Aprovação como
  "Serviço Realizado" (`finalizarOsEmpresa` não mudou); **só** "Validar e
  enviar para Memorial" o leva ao Memorial/Concluído.

### 3. Campo / Acompanhamento
- **index.html** — novo submenu interno no topo da tela:
  **Equipe da Educação** | **Equipe da Empresa** (padrão: Empresa, que é a
  visão atual — nada some por padrão).
- **js/campo.js** —
  (a) classificação Educação×Empresa pelo NOME da equipe registrada, usando
  as listas separadas que já existem (`listaEquipesGlobal` = secretaria,
  `listaEquipesEmpresaGlobal` = empresa); sem equipe identificável, decide
  pelo status (visitas → Educação; OS/emergencial/garantias → Empresa).
  KPIs, lista diária, pendências e histórico respeitam o submenu;
  (b) **"Preenchido em"** agora mostra a data/hora em que o LANÇAMENTO foi
  feito (`registrado_em` do histórico), não a data da visita/atendimento;
  (c) removido **"Dia consultado"** dos cards (pill e linha do expand) —
  a data já está no filtro superior;
  (d) pill **"Registro:"** renomeada para **"Lançamento:"** (com data/hora
  do lançamento) e "Registro de equipe do dia" → **"Último lançamento"**.
- **js/supabase/dados.js** — `listarCampo` passou a incluir também os
  chamados "Aguardando visita"/"Em atendimento" QUE TÊM equipe atribuída
  (para alimentar a aba Educação) e o status "Garantia de Serviço". Os KPIs
  do servidor continuam contando só o lado Empresa (comportamento atual
  preservado); os KPIs da tela são recalculados por aba.
- **js/modal-chamados.js** — modal aberto a partir da tela Campo fica
  **somente leitura**: o bloco de workflow (status, observação, anexos,
  botões) é ocultado, igual ao que já acontecia no Histórico.

### 4. Anexos → Google Drive
- **js/supabase/anexos.js** — upload vai para o Drive via Web App GAS
  (1 arquivo por requisição, sem header Content-Type para evitar preflight
  CORS); metadados continuam na tabela `anexos` (`storage_path =
  'drive:<id>'` + coluna `url`). **Compatibilidade retroativa**: anexos
  antigos do Supabase Storage seguem sendo lidos por URL assinada. A
  assinatura pública não mudou — `dados.js` chama igual em todos os 10
  pontos.
- **js/config.js** — bloco `GOM_DRIVE` (URL + TOKEN) a preencher.
- **sql/11** — coluna `anexos.url` + políticas de insert/select na tabela
  `anexos` (se o erro atual de salvar anexo for RLS na tabela, isso resolve;
  o upload do arquivo em si deixa de depender do Storage).
- **apps-script/GomDriveAPI.gs** — Web App dedicado (mesmo da entrega
  anterior). Thumbnails no modal já funcionam: o frontend tem suporte
  nativo a links do Drive (`getDriveIdAnexo_`/`getPreviewUrlAnexo`).

---

## VALIDAÇÕES JÁ EXECUTADAS (Node.js, isoladas)

- Transições: Em análise→Garantia de Obra ✔; Serviço Realizado→Concluído ✔;
  Serviço Realizado→Garantia de Serviço ✔; Serviço Realizado→Garantia de
  Obra ✘ (bloqueado, correto); Serviço Realizado→Devolvido ✘ (bloqueado);
  Garantia de Serviço→Serviço Realizado ✔; tela(Garantia de Serviço)=empresa.
- Classificação Campo: equipe da empresa→Empresa; equipe da secretaria→
  Educação (mesmo com status de OS); sem equipe decide pelo status.
- Upload Drive (mock): insert correto no banco; `mapaPorChamado` mistura
  anexo novo (URL do Drive) com legado (URL assinada).
- Sintaxe: todos os 16 arquivos passam em `node --check`.

## TESTES OBRIGATÓRIOS NO SISTEMA (roteiro)

1. **Triagem**: sem campo de data no topo; encaminhamentos = Emergencial,
   Orçamento, Aguardando visita, **Garantia de Obra**, Devolvido; salvar
   sem data funciona; Garantia de Obra aparece depois na tela Empresa.
2. **Fila**: data individual por card e "Aplicar a todos" continuam iguais.
3. **Empresa finaliza OS** → chamado aparece em Aprovação/Validação como
   "Serviço Realizado" (não vai direto ao Memorial).
4. **Validação**: card e modal mostram só "Validar e enviar para Memorial"
   e "Garantia de Serviço". Validar → Memorial/Concluído. Garantia de
   Serviço → volta à Empresa (aba diário/gerencial), badge roxa, e a
   empresa consegue registrar equipe do dia e finalizar de novo.
5. **Garantia de Serviço ≠ Garantia de Obra**: KPIs e filtros mostram os
   dois separados; um não vira o outro em nenhum ponto.
6. **Campo**: submenu Educação/Empresa filtra cards, KPIs e histórico;
   "Preenchido em" mostra data/hora do lançamento; sem "Dia consultado";
   pill "Lançamento:"; abrir chamado pelo Campo → modal sem campos de
   edição (sem status/observação/anexos).
7. **Anexos**: anexar imagem em qualquer tela de edição → arquivo aparece
   no Drive (GOM-SME Anexos/escolas/...), thumbnail no modal; anexo antigo
   continua visível.
8. **Permissões**: PIN Empresa não acessa telas da Secretaria; seletores de
   equipe continuam separados (nada foi alterado nesses arquivos).
9. **Datas**: dd/mm/aaaa sem D-1 em Triagem→Fila→Empresa→Campo (lógica de
   datas não foi tocada; apenas remoção do campo da Triagem).
