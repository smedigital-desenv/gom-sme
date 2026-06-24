/* ============================================================================
 * GOM | SME — Migrador de Anexos: Supabase Storage  ->  Google Drive
 * ----------------------------------------------------------------------------
 * O frontend salva o arquivo rápido no Supabase Storage e grava os metadados em
 * public.anexos (migracao_status='pendente'). Este script (gatilho de tempo)
 * baixa cada anexo pendente, RECRIA NO DRIVE A MESMA HIERARQUIA DE PASTAS do
 * storage_path e, ao final, atualiza a linha em anexos e apaga o arquivo do
 * Storage.
 *
 * A hierarquia vem PRONTA no storage_path. Para o formulário da escola ela é:
 *     <escola>/chamado-<id>/<local>/<tipo>/arquivo
 * (e para outros envios: <categoria>/chamado-<id>/arquivo). Como o migrador só
 * ESPELHA o storage_path, ele cobre os dois formatos sem mudança.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * COMO PREPARAR (uma vez), na CONTA INSTITUCIONAL:
 *   1) Cole este arquivo num projeto Apps Script.
 *   2) Configurações do projeto -> Propriedades do script, adicione:
 *        SUPABASE_URL              = https://iqldovwttomkjkoakosc.supabase.co
 *        SUPABASE_SERVICE_ROLE_KEY = <service_role key do Supabase>
 *        GOM_DRIVE_ANEXOS_ROOT_ID  = <ID da pasta-raiz no Drive onde arquivar>
 *        GOM_ANEXOS_BUCKET         = anexos        (opcional; padrão "anexos")
 *   3) Rode gomMigrarAnexosTeste() para validar 1 lote no editor.
 *   4) Rode gomInstalarGatilhoAnexos() para agendar (a cada 10 min).
 *
 * O ID da pasta-raiz: abra a pasta no Drive e copie o trecho final da URL
 * (.../folders/ESSE_ID).
 * ========================================================================== */

function _prop_(nome, padrao) {
  return PropertiesService.getScriptProperties().getProperty(nome) || padrao || '';
}

function _cfgAnexos_() {
  return {
    SUPABASE_URL:  _prop_('SUPABASE_URL', '').replace(/\/+$/, ''),
    SERVICE_KEY:   _prop_('SUPABASE_SERVICE_ROLE_KEY', ''),
    DRIVE_ROOT_ID: _prop_('GOM_DRIVE_ANEXOS_ROOT_ID', ''),
    BUCKET:        _prop_('GOM_ANEXOS_BUCKET', 'anexos'),
    LIMITE:        25,           // anexos por execução
    MAX_TENTATIVAS: 3
  };
}

/* ── Entrada principal: processa as duas tabelas (prod + homologação) ──────── */
function gomMigrarAnexosPendentes() {
  var cfg = _cfgAnexos_();
  if (!cfg.SUPABASE_URL || !cfg.SERVICE_KEY) { Logger.log('Faltam SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.'); return; }
  if (!cfg.DRIVE_ROOT_ID) { Logger.log('Falta GOM_DRIVE_ANEXOS_ROOT_ID (pasta-raiz do Drive).'); return; }

  ['anexos', 'hml_anexos'].forEach(function (tabela) {
    try { _migrarUmaTabelaAnexos_(cfg, tabela); }
    catch (e) { Logger.log('Erro na tabela ' + tabela + ': ' + e); }
  });
}

function _migrarUmaTabelaAnexos_(cfg, tabela) {
  var pendentes = _sbGetAnexosPendentes_(cfg, tabela);
  if (!pendentes.length) { Logger.log(tabela + ': nada pendente (ou tabela inexistente).'); return; }
  Logger.log(tabela + ': migrando ' + pendentes.length + ' anexo(s).');

  var raiz = DriveApp.getFolderById(cfg.DRIVE_ROOT_ID);

  pendentes.forEach(function (a) {
    var sp = String(a.storage_path || '').trim();
    if (!sp || sp.indexOf('drive:') === 0) {
      _sbPatchAnexo_(cfg, tabela, a.id, { migracao_status: 'migrado' }); // já migrado/sem path
      return;
    }
    try {
      // 1) baixa do Storage
      var blob = _sbStorageBaixar_(cfg, sp);
      blob.setName(a.nome || sp.split('/').pop());

      // 2) recria as pastas do storage_path no Drive (tudo menos o nome do arquivo)
      var partes = sp.split('/').filter(function (s) { return s !== ''; });
      partes.pop(); // remove o nome do arquivo
      var pasta = _drvPastaPorCaminho_(raiz, partes);

      // 3) cria o arquivo no Drive e libera por link
      var arquivo = pasta.createFile(blob);
      try { arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
      var fileId = arquivo.getId();
      var urlDrive = 'https://drive.google.com/file/d/' + fileId + '/view';

      // 4) atualiza a linha do anexo (o frontend passa a usar a URL do Drive)
      _sbPatchAnexo_(cfg, tabela, a.id, {
        url: urlDrive,
        storage_path: 'drive:' + fileId,
        origem_storage: 'drive',
        migracao_status: 'migrado'
      });

      // 5) apaga o arquivo do Supabase Storage (já está no Drive)
      _sbStorageRemover_(cfg, sp);

      Logger.log('  #' + a.id + ' (' + tabela + ') -> ' + partes.join('/') + ' OK');
    } catch (e) {
      var tent = (Number(a.tentativas) || 0) + 1;
      _sbPatchAnexo_(cfg, tabela, a.id, {
        tentativas: tent,
        migracao_status: tent >= cfg.MAX_TENTATIVAS ? 'erro' : 'pendente',
        erro_msg: String((e && e.message) || e).slice(0, 400)
      });
      Logger.log('  #' + a.id + ' (' + tabela + ') FALHOU (tentativa ' + tent + '): ' + e);
    }
  });
}

/* ── Drive: garante a pasta aninhada a partir de uma lista de nomes ────────── */
function _drvPastaPorCaminho_(raiz, partes) {
  var atual = raiz;
  for (var i = 0; i < partes.length; i++) {
    var nome = String(partes[i]).slice(0, 200) || 'sem-nome';
    var it = atual.getFoldersByName(nome);
    atual = it.hasNext() ? it.next() : atual.createFolder(nome);
  }
  return atual;
}

/* ── Supabase: lê anexos pendentes ─────────────────────────────────────────── */
function _sbGetAnexosPendentes_(cfg, tabela) {
  var url = cfg.SUPABASE_URL + '/rest/v1/' + tabela
    + '?select=id,solicitacao_id,nome,storage_path,origem_storage,migracao_status,tentativas'
    + '&migracao_status=eq.pendente'
    + '&origem_storage=eq.supabase'
    + '&order=id.asc&limit=' + cfg.LIMITE;
  var r = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: { apikey: cfg.SERVICE_KEY, Authorization: 'Bearer ' + cfg.SERVICE_KEY },
    muteHttpExceptions: true
  });
  if (r.getResponseCode() >= 300) return []; // tabela inexistente etc.
  try { var d = JSON.parse(r.getContentText() || '[]'); return Array.isArray(d) ? d : []; }
  catch (e) { return []; }
}

/* ── Supabase: PATCH numa linha de anexo ───────────────────────────────────── */
function _sbPatchAnexo_(cfg, tabela, id, body) {
  UrlFetchApp.fetch(cfg.SUPABASE_URL + '/rest/v1/' + tabela + '?id=eq.' + encodeURIComponent(id), {
    method: 'PATCH',
    headers: {
      apikey: cfg.SERVICE_KEY, Authorization: 'Bearer ' + cfg.SERVICE_KEY,
      'Content-Type': 'application/json', Prefer: 'return=minimal'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
}

/* ── Supabase Storage: baixa um objeto (service role) ──────────────────────── */
function _sbStorageBaixar_(cfg, storagePath) {
  var url = cfg.SUPABASE_URL + '/storage/v1/object/' + cfg.BUCKET + '/' + _encPath_(storagePath);
  var r = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: { apikey: cfg.SERVICE_KEY, Authorization: 'Bearer ' + cfg.SERVICE_KEY },
    muteHttpExceptions: true
  });
  if (r.getResponseCode() >= 300) throw new Error('Download Storage HTTP ' + r.getResponseCode() + ': ' + r.getContentText().slice(0, 200));
  return r.getBlob();
}

/* ── Supabase Storage: remove um objeto ────────────────────────────────────── */
function _sbStorageRemover_(cfg, storagePath) {
  UrlFetchApp.fetch(cfg.SUPABASE_URL + '/storage/v1/object/' + cfg.BUCKET + '/' + _encPath_(storagePath), {
    method: 'DELETE',
    headers: { apikey: cfg.SERVICE_KEY, Authorization: 'Bearer ' + cfg.SERVICE_KEY },
    muteHttpExceptions: true
  });
}

/* Codifica cada segmento do caminho, mantendo as barras. */
function _encPath_(p) {
  return String(p || '').split('/').map(function (s) { return encodeURIComponent(s); }).join('/');
}

/* ── Gatilhos ──────────────────────────────────────────────────────────────── */
function gomInstalarGatilhoAnexos() {
  gomRemoverGatilhoAnexos();
  ScriptApp.newTrigger('gomMigrarAnexosPendentes').timeBased().everyMinutes(10).create();
  Logger.log('Gatilho instalado: migrar anexos a cada 10 min.');
}

function gomRemoverGatilhoAnexos() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'gomMigrarAnexosPendentes') ScriptApp.deleteTrigger(t);
  });
  Logger.log('Gatilho de anexos removido.');
}

/* ── Teste manual (rode no editor) ─────────────────────────────────────────── */
function gomMigrarAnexosTeste() {
  gomMigrarAnexosPendentes();
  Logger.log('gomMigrarAnexosTeste concluído — confira o log acima e a pasta no Drive.');
}
