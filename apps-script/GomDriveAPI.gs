/* ============================================================================
 * GOM | SME — Drive API (Web App dedicado a anexos)
 * ----------------------------------------------------------------------------
 * Recebe arquivos em base64 via doPost e salva no Google Drive da conta que
 * publicou o script. Estrutura de pastas:
 *
 *   GOM-SME Anexos / escolas / {escola} / chamado-{id} / {categoria} / arquivo
 *
 * Publicação (OBRIGATÓRIO):
 *   Implantar → Nova implantação → App da Web
 *   - Executar como: EU (a conta institucional dona do Drive)
 *   - Quem pode acessar: QUALQUER PESSOA  ← sem isso o frontend não alcança
 *   A URL gerada deve ser /macros/s/.../exec (pública), e NÃO
 *   /a/macros/educacao.pmrp.sp.gov.br/... (restrita ao domínio).
 *
 * Segurança: token compartilhado simples (TOKEN abaixo). Troque o valor e
 * use o MESMO valor em js/config.js (GOM_DRIVE.TOKEN).
 * ========================================================================== */

var GOM_DRIVE_CONFIG = {
  TOKEN: 'TROQUE-ESTE-TOKEN-LONGO-E-ALEATORIO',
  PASTA_RAIZ_NOME: 'GOM-SME Anexos',
  PASTA_RAIZ_ID: '' // opcional: cole aqui o ID de uma pasta existente para fixar o destino
};

/* ── Health check: abra a URL /exec no navegador para testar ─────────────── */
function doGet(e) {
  return _json_({ ok: true, servico: 'GOM Drive API', versao: 1, data: new Date().toISOString() });
}

/* ── Entrada principal ────────────────────────────────────────────────────── */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return _json_({ ok: false, erro: 'Corpo da requisição vazio.' });
    }
    var p = JSON.parse(e.postData.contents);

    if (String(p.token || '') !== GOM_DRIVE_CONFIG.TOKEN) {
      return _json_({ ok: false, erro: 'Token inválido.' });
    }

    if (p.acao === 'upload') return _json_(_upload_(p));

    return _json_({ ok: false, erro: 'Ação desconhecida: ' + String(p.acao || '') });
  } catch (err) {
    return _json_({ ok: false, erro: String((err && err.message) || err) });
  }
}

/* ── Upload: salva os arquivos e devolve [{nome,id,url,tamanho}] ──────────── */
function _upload_(p) {
  var arquivos = Array.isArray(p.arquivos) ? p.arquivos : [];
  if (!arquivos.length) return { ok: true, arquivos: [] };

  var pasta = _pastaDestino_(p.escola, p.chamadoId, p.categoria);
  var salvos = [];

  for (var i = 0; i < arquivos.length; i++) {
    var a = arquivos[i] || {};
    var b64 = String(a.base64 || '').split(',').pop(); // aceita com ou sem prefixo data:
    if (!b64) continue;

    var nome = String(a.nome || ('anexo_' + (i + 1))).slice(0, 120);
    var mime = String(a.mimeType || 'application/octet-stream');
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, nome);

    var arquivo = pasta.createFile(blob);
    // Link público de leitura — necessário para os thumbnails no frontend.
    arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    salvos.push({
      nome: arquivo.getName(),
      id: arquivo.getId(),
      url: 'https://drive.google.com/file/d/' + arquivo.getId() + '/view',
      tamanho: arquivo.getSize()
    });
  }
  return { ok: true, arquivos: salvos };
}

/* ── Pastas: raiz / escolas / {escola} / chamado-{id} / {categoria} ───────── */
function _pastaDestino_(escola, chamadoId, categoria) {
  // Lock evita pastas duplicadas quando dois uploads chegam ao mesmo tempo.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var raiz = _pastaRaiz_();
    var pEscolas = _subpasta_(raiz, 'escolas');
    var pEscola = _subpasta_(pEscolas, _slug_(escola) || 'sem-escola');
    var pChamado = _subpasta_(pEscola, 'chamado-' + String(chamadoId || 'sem-id'));
    return _subpasta_(pChamado, _slug_(categoria) || 'solicitacao');
  } finally {
    lock.releaseLock();
  }
}

function _pastaRaiz_() {
  if (GOM_DRIVE_CONFIG.PASTA_RAIZ_ID) {
    return DriveApp.getFolderById(GOM_DRIVE_CONFIG.PASTA_RAIZ_ID);
  }
  var it = DriveApp.getFoldersByName(GOM_DRIVE_CONFIG.PASTA_RAIZ_NOME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(GOM_DRIVE_CONFIG.PASTA_RAIZ_NOME);
}

function _subpasta_(pai, nome) {
  var it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

function _slug_(s) {
  return String(s || '')
    .normalize ? String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 80)
    : String(s || '').replace(/[^\w.-]+/g, '_').slice(0, 80);
}

function _json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ── Teste manual no editor (Executar → testarUpload) ─────────────────────── */
function testarUpload() {
  var fake = {
    token: GOM_DRIVE_CONFIG.TOKEN,
    acao: 'upload',
    escola: 'EMEF Teste',
    chamadoId: 999,
    categoria: 'solicitacao',
    arquivos: [{ nome: 'teste.txt', mimeType: 'text/plain', base64: Utilities.base64Encode('GOM Drive OK') }]
  };
  Logger.log(JSON.stringify(_upload_(fake)));
}
