/* ============================================================================
 * GOM | SME — Migrador de anexos Supabase Storage → Google Drive
 * ----------------------------------------------------------------------------
 * Roda por gatilho de tempo. Não é Web App público.
 *
 * Fluxo:
 *   1) Busca anexos com migracao_status pendente/erro.
 *   2) Baixa arquivo do Supabase Storage usando service_role.
 *   3) Salva no Google Drive.
 *   4) Atualiza public.anexos com url/drive_id/storage_path=drive:<id>.
 *   5) Remove o objeto original do Supabase Storage.
 *
 * Propriedades obrigatórias do Script:
 *   SUPABASE_URL = https://iqldovwttomkjkoakosc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = service_role key do Supabase
 *
 * Propriedades opcionais:
 *   BUCKET_ANEXOS = anexos
 *   PASTA_RAIZ_ID = ID de pasta Drive existente
 *   PASTA_RAIZ_NOME = GOM-SME Anexos
 *   LIMITE_POR_EXECUCAO = 25
 * ========================================================================== */

function prop_(nome, padrao) {
  return PropertiesService.getScriptProperties().getProperty(nome) || padrao || '';
}

function cfg_() {
  return {
    SUPABASE_URL: prop_('SUPABASE_URL', ''),
    SUPABASE_SERVICE_ROLE_KEY: prop_('SUPABASE_SERVICE_ROLE_KEY', ''),
    BUCKET_ANEXOS: prop_('BUCKET_ANEXOS', 'anexos'),
    PASTA_RAIZ_ID: prop_('PASTA_RAIZ_ID', ''),
    PASTA_RAIZ_NOME: prop_('PASTA_RAIZ_NOME', 'GOM-SME Anexos'),
    LIMITE_POR_EXECUCAO: Number(prop_('LIMITE_POR_EXECUCAO', '25')) || 25
  };
}

function instalarGatilhoHorario() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction && t.getHandlerFunction() === 'migrarAnexosPendentes') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('migrarAnexosPendentes').timeBased().everyHours(1).create();
  Logger.log('Gatilho horário instalado para migrarAnexosPendentes.');
}

function migrarAnexosPendentes() {
  var cfg = cfg_();
  validarCfg_(cfg);

  var anexos = listarPendentes_(cfg.LIMITE_POR_EXECUCAO);
  Logger.log('Anexos pendentes encontrados: ' + anexos.length);

  for (var i = 0; i < anexos.length; i++) {
    migrarUmAnexo_(anexos[i]);
  }
}

function testarMigracaoUmaVez() {
  migrarAnexosPendentes();
}

function validarCfg_(cfg) {
  if (!cfg.SUPABASE_URL) throw new Error('Configure SUPABASE_URL nas Propriedades do Script.');
  if (!cfg.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Configure SUPABASE_SERVICE_ROLE_KEY nas Propriedades do Script.');
}

function sbFetch_(path, opt) {
  var cfg = cfg_();
  opt = opt || {};
  var headers = opt.headers || {};
  headers.apikey = cfg.SUPABASE_SERVICE_ROLE_KEY;
  headers.Authorization = 'Bearer ' + cfg.SUPABASE_SERVICE_ROLE_KEY;
  if (opt.json !== false) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  if (opt.prefer) headers.Prefer = opt.prefer;

  var resp = UrlFetchApp.fetch(cfg.SUPABASE_URL.replace(/\/$/, '') + path, {
    method: opt.method || 'get',
    headers: headers,
    payload: opt.payload,
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  var text = resp.getContentText() || '';
  if (code < 200 || code >= 300) throw new Error('Supabase HTTP ' + code + ': ' + text);
  if (opt.raw) return resp;
  return text ? JSON.parse(text) : null;
}

function listarPendentes_(limite) {
  var select = 'id,solicitacao_id,categoria,nome,storage_path,url,mime_type,tamanho_bytes,origem_storage,migracao_status,tentativas_migracao';
  var path = '/rest/v1/anexos?select=' + encodeURIComponent(select)
    + '&migracao_status=in.(pendente,erro)'
    + '&origem_storage=eq.supabase'
    + '&storage_path=not.is.null'
    + '&order=id.asc&limit=' + encodeURIComponent(String(limite || 25));
  return sbFetch_(path, { method: 'get' }) || [];
}

function atualizarAnexo_(id, dados) {
  return sbFetch_('/rest/v1/anexos?id=eq.' + encodeURIComponent(String(id)), {
    method: 'patch',
    payload: JSON.stringify(dados),
    prefer: 'return=representation'
  });
}

function migrarUmAnexo_(a) {
  try {
    if (!a || !a.id || !a.storage_path || String(a.storage_path).indexOf('drive:') === 0) return;

    atualizarAnexo_(a.id, {
      migracao_status: 'migrando',
      erro_migracao: null,
      tentativas_migracao: Number(a.tentativas_migracao || 0) + 1
    });

    var blob = baixarStorage_(a.storage_path, a.nome || 'anexo');
    var pasta = pastaDestino_(a);
    var arq = pasta.createFile(blob);
    arq.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var url = 'https://drive.google.com/file/d/' + arq.getId() + '/view';
    atualizarAnexo_(a.id, {
      storage_path_original: a.storage_path,
      storage_path: 'drive:' + arq.getId(),
      drive_id: arq.getId(),
      url: url,
      origem_storage: 'drive',
      migracao_status: 'migrado',
      migrado_em: new Date().toISOString(),
      erro_migracao: null
    });

    removerStorage_(a.storage_path);
    Logger.log('Migrado anexo #' + a.id + ' → ' + url);
  } catch (err) {
    var msg = String((err && err.message) || err).slice(0, 500);
    try {
      atualizarAnexo_(a.id, {
        migracao_status: 'erro',
        erro_migracao: msg,
        tentativas_migracao: Number(a.tentativas_migracao || 0) + 1
      });
    } catch (e) {}
    Logger.log('Erro ao migrar anexo #' + (a && a.id) + ': ' + msg);
  }
}

function baixarStorage_(storagePath, nome) {
  var cfg = cfg_();
  var url = cfg.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/' + encodeURIComponent(cfg.BUCKET_ANEXOS) + '/' + encodePath_(storagePath);
  var resp = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      apikey: cfg.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_SERVICE_ROLE_KEY
    },
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) throw new Error('Falha ao baixar Storage HTTP ' + code + ': ' + resp.getContentText());
  return resp.getBlob().setName(nome || arquivoNome_(storagePath));
}

function removerStorage_(storagePath) {
  var cfg = cfg_();
  var url = cfg.SUPABASE_URL.replace(/\/$/, '') + '/storage/v1/object/' + encodeURIComponent(cfg.BUCKET_ANEXOS) + '/' + encodePath_(storagePath);
  var resp = UrlFetchApp.fetch(url, {
    method: 'delete',
    headers: {
      apikey: cfg.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_SERVICE_ROLE_KEY
    },
    muteHttpExceptions: true
  });
  var code = resp.getResponseCode();
  if (code < 200 || code >= 300) Logger.log('Aviso: não consegui remover do Storage (' + code + '): ' + resp.getContentText());
}

function pastaDestino_(a) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var raiz = pastaRaiz_();
    var pChamados = subpasta_(raiz, 'chamados');
    var pChamado = subpasta_(pChamados, 'chamado-' + String(a.solicitacao_id || 'sem-id'));
    return subpasta_(pChamado, slug_(a.categoria || 'anexo'));
  } finally {
    lock.releaseLock();
  }
}

function pastaRaiz_() {
  var cfg = cfg_();
  if (cfg.PASTA_RAIZ_ID) return DriveApp.getFolderById(cfg.PASTA_RAIZ_ID);
  var nome = cfg.PASTA_RAIZ_NOME || 'GOM-SME Anexos';
  var it = DriveApp.getFoldersByName(nome);
  return it.hasNext() ? it.next() : DriveApp.createFolder(nome);
}

function subpasta_(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

function encodePath_(path) {
  return String(path || '').split('/').map(encodeURIComponent).join('/');
}

function arquivoNome_(path) {
  var p = String(path || '').split('/');
  return p[p.length - 1] || 'anexo';
}

function slug_(s) {
  var v = String(s || '');
  try { v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
  return v.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'anexo';
}
