/* ============================================================================
 * GOM | SME — Serviço de E-mail (Apps Script)  ·  FASE A: motor de envio
 * ----------------------------------------------------------------------------
 * Todo e-mail do sistema sai pela conta institucional que PUBLICA este script
 * (a mesma usada no GomDriveMigrador). O frontend não envia e-mail direto e não
 * guarda segredo nenhum: o disparo automático virá por gatilho de tempo lendo
 * uma fila no Supabase (próximas fases), igual ao padrão do migrador de anexos.
 *
 * NESTA FASE validamos só o motor, rodando gomEmailTesteDeFumaca() no editor.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * COMO PREPARAR (uma vez):
 *   1) Abra https://script.google.com com a CONTA INSTITUCIONAL (a dona do
 *      GomDriveMigrador) e cole este arquivo num projeto Apps Script.
 *   2) Configurações do projeto → Propriedades do script → adicione:
 *        GOM_EMAIL_TESTE_PARA     = seu-email@exemplo.com   (destino do teste)
 *        GOM_EMAIL_REMETENTE_NOME = GOM · SME               (opcional)
 *        GOM_EMAIL_REPLY_TO       = email-de-resposta       (opcional)
 *   3) Selecione a função gomEmailTesteDeFumaca e clique em Executar.
 *   4) Autorize os escopos quando solicitado (envio de e-mail).
 *   5) Confira a caixa de entrada do GOM_EMAIL_TESTE_PARA. O remetente deve ser
 *      a conta institucional. Se chegou, a Fase A está concluída.
 *
 * Observação: para as próximas fases, as MESMAS chaves do GomDriveMigrador
 * (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) serão lidas das Propriedades do
 * script para o gatilho ler os chamados e a fila de e-mails.
 * ========================================================================== */

function _prop_(nome, padrao) {
  return PropertiesService.getScriptProperties().getProperty(nome) || padrao || '';
}

/**
 * Função núcleo: envia 1 e-mail (HTML) a partir da conta institucional.
 * @param {Object} msg
 *   - para:       string ou array de e-mails  (obrigatório)
 *   - assunto:    string                       (obrigatório)
 *   - corpoHtml:  string (HTML do corpo)
 *   - corpoTexto: string (alternativa em texto puro; gerada do HTML se ausente)
 *   - cc, bcc:    string ou array              (opcional)
 *   - anexos:     array de { nome, mimeType, base64 }  (opcional)
 * @return {Object} { ok:true, enviadoPara, de } ou { ok:false, erro }
 */
function gomEnviarEmail_(msg) {
  msg = msg || {};
  var para = _normalizarLista_(msg.para);
  if (!para.length) return { ok: false, erro: 'Destinatário (para) é obrigatório.' };

  var assunto = String(msg.assunto || '').trim();
  if (!assunto) return { ok: false, erro: 'Assunto é obrigatório.' };

  var corpoHtml = String(msg.corpoHtml || '');
  var corpoTexto = String(msg.corpoTexto || '').trim() || _htmlParaTexto_(corpoHtml) || ' ';

  var cc = _normalizarLista_(msg.cc);
  var bcc = _normalizarLista_(msg.bcc);
  var replyTo = _prop_('GOM_EMAIL_REPLY_TO', '');

  var blobs = [];
  var anexos = Array.isArray(msg.anexos) ? msg.anexos : [];
  for (var i = 0; i < anexos.length; i++) {
    var a = anexos[i] || {};
    var b64 = String(a.base64 || '').split(',').pop(); // aceita com/sem prefixo data:
    if (!b64) continue;
    var nome = String(a.nome || ('anexo_' + (i + 1))).slice(0, 120);
    var mime = String(a.mimeType || 'application/octet-stream');
    blobs.push(Utilities.newBlob(Utilities.base64Decode(b64), mime, nome));
  }

  var options = {
    htmlBody: corpoHtml || undefined,
    name: _prop_('GOM_EMAIL_REMETENTE_NOME', 'GOM · SME'),
    cc: cc.length ? cc.join(',') : undefined,
    bcc: bcc.length ? bcc.join(',') : undefined,
    replyTo: replyTo || undefined,
    attachments: blobs.length ? blobs : undefined
  };

  try {
    MailApp.sendEmail({
      to: para.join(','),
      subject: assunto,
      body: corpoTexto,
      htmlBody: options.htmlBody,
      name: options.name,
      cc: options.cc,
      bcc: options.bcc,
      replyTo: options.replyTo,
      attachments: options.attachments
    });
    var de = '';
    try { de = Session.getEffectiveUser().getEmail(); } catch (e) {}
    return { ok: true, enviadoPara: para, de: de };
  } catch (err) {
    return { ok: false, erro: String((err && err.message) || err) };
  }
}

/** Normaliza uma lista de e-mails (string com ; ou , ou array) e remove duplicados/inválidos. */
function _normalizarLista_(v) {
  if (!v) return [];
  var arr = Array.isArray(v) ? v : String(v).split(/[;,]/);
  var vistos = {};
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var s = String(arr[i] || '').trim();
    if (!s || !/@/.test(s)) continue;
    var k = s.toLowerCase();
    if (vistos[k]) continue;
    vistos[k] = true;
    out.push(s);
  }
  return out;
}

/** Conversão simples de HTML para texto puro (fallback do corpo). */
function _htmlParaTexto_(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|h[1-6])>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/* ── TESTE DE FUMAÇA (Fase A) ─────────────────────────────────────────────
 * Rode esta função no editor para validar o envio pela conta institucional.
 * Pré-requisito: propriedade do script GOM_EMAIL_TESTE_PARA preenchida.
 */
function gomEmailTesteDeFumaca() {
  var para = _prop_('GOM_EMAIL_TESTE_PARA', '');
  if (!para) {
    throw new Error('Defina a propriedade do script GOM_EMAIL_TESTE_PARA com o e-mail de destino do teste.');
  }
  var html = '' +
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1f2937;line-height:1.6">' +
      '<h2 style="color:#003b73;margin:0 0 8px">GOM · SME — teste de e-mail</h2>' +
      '<p>Este é um <strong>teste de fumaça</strong> do serviço de e-mail do GOM.</p>' +
      '<p>Se você recebeu esta mensagem, o envio pela conta institucional está funcionando e a Fase A está concluída.</p>' +
      '<p style="color:#6b7280;font-size:12px;margin-top:16px">Enviado pelo Apps Script · ' + new Date().toLocaleString('pt-BR') + '</p>' +
    '</div>';
  var r = gomEnviarEmail_({
    para: para,
    assunto: 'GOM · SME — teste de e-mail (Fase A)',
    corpoHtml: html
  });
  Logger.log(JSON.stringify(r));
  if (!r.ok) throw new Error('Falha no envio: ' + r.erro);
  return r;
}

/* ── Quota: e-mails que ainda podem ser enviados hoje por esta conta ──────── */
function gomEmailQuotaRestante() {
  var q = MailApp.getRemainingDailyQuota();
  Logger.log('Quota de e-mails restante hoje: ' + q);
  return q;
}

/* ── ESBOÇO (próximas fases — NÃO usado ainda) ─────────────────────────────
 * Exemplo de como o e-mail de "visita agendada" para a escola será montado a
 * partir dos dados do chamado/visita. O conteúdo final virá da tela de template
 * (Fase B) e o disparo virá do gatilho que lê a fila no Supabase (Fase C).
 *
 * function _montarEmailVisitaAgendada_(dados) {
 *   // dados: { escolaNome, data, equipe, chamados:[{id,tipo,descricao}], link }
 *   var linhas = (dados.chamados || []).map(function(c){
 *     return '<li>#' + c.id + ' — ' + c.tipo + ': ' + c.descricao + '</li>';
 *   }).join('');
 *   var html = '<h2>Visita técnica agendada</h2>' +
 *     '<p>Sua unidade (' + dados.escolaNome + ') tem visita agendada para <b>' +
 *     dados.data + '</b>, equipe <b>' + dados.equipe + '</b>.</p>' +
 *     '<p>Itens previstos:</p><ul>' + linhas + '</ul>';
 *   return { assunto: 'Visita agendada — ' + dados.escolaNome + ' em ' + dados.data, corpoHtml: html };
 * }
 */
