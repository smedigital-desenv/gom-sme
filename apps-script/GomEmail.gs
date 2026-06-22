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
 *        GOM_EMAIL_REDIRECT_PARA  = seu-email@exemplo.com   (TRAVA DE TESTE:
 *           enquanto preenchida, TODO e-mail vai SÓ para este endereço e nunca
 *           para as escolas. Apague esta propriedade para liberar a produção.)
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
  var corpoTextoOrig = String(msg.corpoTexto || '').trim();

  var cc = _normalizarLista_(msg.cc);
  var bcc = _normalizarLista_(msg.bcc);
  var replyTo = _prop_('GOM_EMAIL_REPLY_TO', '');

  // ── MODO TESTE (trava de segurança) ─────────────────────────────────────
  // Se a propriedade do script GOM_EMAIL_REDIRECT_PARA estiver preenchida,
  // NENHUM e-mail chega ao destinatário real (escola etc.): TUDO vai somente
  // para esse endereço, com um aviso de quem seria o destinatário original
  // (para/cc/bcc). Como esta é a única função que realmente envia, a trava vale
  // para todo envio: teste de fumaça, visita agendada, alertas de SLA e o
  // processador da fila. Para liberar produção, basta APAGAR/esvaziar a
  // propriedade GOM_EMAIL_REDIRECT_PARA.
  var redirect = _normalizarLista_(_prop_('GOM_EMAIL_REDIRECT_PARA', ''));
  if (redirect.length) {
    var origInfo = 'para: ' + (para.join(', ') || '(vazio)')
      + (cc.length ? ' · cc: ' + cc.join(', ') : '')
      + (bcc.length ? ' · bcc: ' + bcc.join(', ') : '');
    assunto = '[TESTE] ' + assunto;
    corpoHtml = '<div style="background:#fff3cd;border:1px solid #ffe08a;border-radius:8px;'
      + 'padding:10px 14px;margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;'
      + 'font-size:12px;color:#7a5b00;line-height:1.5;">'
      + '<strong>MODO TESTE — e-mail redirecionado.</strong><br>'
      + 'Destinatário original &rarr; ' + origInfo
      + '</div>' + corpoHtml;
    para = redirect;
    cc = [];
    bcc = [];
    Logger.log('gomEnviarEmail_: MODO TESTE — redirecionado para ' + redirect.join(', ') + ' | original ' + origInfo);
  }

  var corpoTexto = corpoTextoOrig || _htmlParaTexto_(corpoHtml) || ' ';

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

/* ── FASE B — Envio transacional (visita agendada para a escola) ─────────────
 *
 * Como chamar (do GAS de agendamento ou de uma função de gatilho):
 *
 *   gomEnviarEmailVisitaAgendada({
 *     para:           'diretoria@escola.edu.br',
 *     escolaNome:     'EMEF Profª Maria José',
 *     dataVisita:     '25/06/2026',
 *     equipe:         'Equipe Alfa',
 *     chamados: [
 *       { id: 1247, tipo: 'Cobertura', descricao: 'Telhado com infiltração' },
 *       { id: 1251, tipo: 'Elétrica',  descricao: 'Tomadas sem energia na sala 4' }
 *     ]
 *   });
 *
 * Assunto e corpo são lidos de EMAIL_VISITA_ASSUNTO / EMAIL_VISITA_CORPO no
 * Supabase (editáveis na tela Configurações). Fallback embutido se indisponível.
 */

function _lerConfigEmail_(cfg, chave, padrao) {
  try {
    var url = cfg.SUPABASE_URL + '/rest/v1/' + cfg.TABELA_CONF
      + '?select=valor&chave=eq.' + encodeURIComponent(chave) + '&ativo=eq.true&limit=1';
    var r = UrlFetchApp.fetch(url, {
      method: 'GET',
      headers: { apikey: cfg.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_SERVICE_ROLE_KEY },
      muteHttpExceptions: true
    });
    var dados = JSON.parse(r.getContentText() || '[]');
    if (Array.isArray(dados) && dados.length && dados[0].valor) return String(dados[0].valor);
  } catch (e) { Logger.log('_lerConfigEmail_ erro: ' + e); }
  return padrao || '';
}

function _aplicarVariaveis_(template, vars) {
  var out = String(template || '');
  Object.keys(vars || {}).forEach(function(k) { out = out.split(k).join(String(vars[k] || '')); });
  return out;
}

function _montarListaChamados_(chamados) {
  if (!Array.isArray(chamados) || !chamados.length) return '';
  return '<ul style="margin:8px 0;padding-left:20px;">'
    + chamados.map(function(c) {
        return '<li style="margin-bottom:4px;"><strong>#' + (c.id || '') + '</strong>'
          + (c.tipo ? ' — ' + c.tipo : '') + (c.descricao ? ': ' + c.descricao : '') + '</li>';
      }).join('') + '</ul>';
}

function gomEnviarEmailVisitaAgendada(dados) {
  dados = dados || {};
  var para = dados.para;
  if (!para) return { ok: false, erro: '"para" é obrigatório.' };

  var cfg = null;
  try {
    var supaUrl = _prop_('SUPABASE_URL', '');
    var supaKey = _prop_('SUPABASE_SERVICE_ROLE_KEY', '');
    var rawPrefix = _prop_('DB_PREFIX', 'prod').trim().toLowerCase();
    var prefix = (rawPrefix === 'hml' || rawPrefix === 'hml_') ? 'hml_' : '';
    if (supaUrl && supaKey) cfg = { SUPABASE_URL: supaUrl, SUPABASE_SERVICE_ROLE_KEY: supaKey, TABELA_CONF: prefix + 'configuracoes' };
  } catch (e) {}

  var assuntoTpl = (cfg ? _lerConfigEmail_(cfg, 'EMAIL_VISITA_ASSUNTO', '') : '')
    || 'Visita técnica agendada — {{escola}} em {{data_visita}}';

  var corpoTpl = (cfg ? _lerConfigEmail_(cfg, 'EMAIL_VISITA_CORPO', '') : '')
    || '<p>Prezados responsáveis da <strong>{{escola}}</strong>,</p>'
     + '<p>Informamos que uma visita técnica foi agendada para <strong>{{data_visita}}</strong>, com a equipe <strong>{{equipe}}</strong>.</p>'
     + '<p>Itens previstos:</p>{{lista_chamados}}'
     + '<p>Em caso de dúvidas, entre em contato com a Gerência de Obras e Manutenção.</p>'
     + '<p>Atenciosamente,<br><strong>GOM · SME Ribeirão Preto</strong></p>';

  var primeiroId = (Array.isArray(dados.chamados) && dados.chamados.length) ? String(dados.chamados[0].id || '') : '';
  var vars = {
    '{{escola}}':         dados.escolaNome || '',
    '{{data_visita}}':    dados.dataVisita  || '',
    '{{equipe}}':         dados.equipe      || '',
    '{{lista_chamados}}': _montarListaChamados_(dados.chamados),
    '{{numero}}':         primeiroId
  };

  return gomEnviarEmail_({
    para:      para,
    assunto:   _aplicarVariaveis_(assuntoTpl, vars),
    corpoHtml: _layoutEmail_(_aplicarVariaveis_(corpoTpl, vars))
  });
}

function _layoutEmail_(conteudo) {
  return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f1f5f9;">'
    + '<div style="max-width:600px;margin:24px auto;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1e293b;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 18px rgba(0,0,0,.08);">'
      + '<div style="background:#003b73;padding:20px 24px;">'
        + '<div style="color:#fff;font-size:20px;font-weight:900;">GOM · SME</div>'
        + '<div style="color:#93c5fd;font-size:12px;margin-top:2px;">Gerência de Obras e Manutenção · Ribeirão Preto</div>'
      + '</div>'
      + '<div style="padding:24px;">' + conteudo + '</div>'
      + '<div style="padding:14px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">'
        + 'E-mail automático do sistema GOM · SME &mdash; não responda diretamente a esta mensagem.'
      + '</div>'
    + '</div></body></html>';
}

/** Teste do e-mail de visita agendada — rode no editor do Apps Script. */
function gomTesteEmailVisitaAgendada() {
  var para = _prop_('GOM_EMAIL_TESTE_PARA', '');
  if (!para) throw new Error('Defina GOM_EMAIL_TESTE_PARA nas Propriedades do Script.');
  var r = gomEnviarEmailVisitaAgendada({
    para: para,
    escolaNome: 'EMEF Profª Maria José (TESTE)',
    dataVisita: '25/06/2026',
    equipe:     'Equipe Alfa',
    chamados: [
      { id: 1247, tipo: 'Cobertura',  descricao: 'Telhado com infiltração no bloco B' },
      { id: 1251, tipo: 'Elétrica',   descricao: 'Tomadas sem energia na sala 4' },
      { id: 1260, tipo: 'Hidráulica', descricao: 'Vazamento no bebedouro do pátio' }
    ]
  });
  Logger.log(JSON.stringify(r));
  if (!r.ok) throw new Error('Falha: ' + r.erro);
  return r;
}

/* ── FASE C (próxima) ────────────────────────────────────────────────────────
 * Gatilho diário que varreia chamados em atraso de SLA e envia e-mails de alerta.
 * Implementado após validação da Fase B.
 *
 * function gomDispararAlertasSLA() { ... }
 */


/* ── FASE C — Processador da fila + alertas de SLA ─────────────────────────
 *
 * INSTALAÇÃO DOS GATILHOS (rode UMA VEZ no editor):
 *   gomInstalarGatilhos()
 *
 * Propriedades adicionais necessárias (além das já configuradas):
 *   SUPABASE_URL              = https://iqldovwttomkjkoakosc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = <service_role key do Supabase>
 *   DB_PREFIX                 = ''  (produção) ou 'hml_' (homologação)
 * ========================================================================== */

function _cfgC_() {
  var rawPrefix = _prop_('DB_PREFIX', 'prod').trim().toLowerCase();
  // Convenção: 'prod' ou qualquer valor não reconhecido = produção (sem prefixo)
  // 'hml' ou 'hml_' = homologação
  var prefix = (rawPrefix === 'hml' || rawPrefix === 'hml_') ? 'hml_' : '';
  return {
    SUPABASE_URL:              _prop_('SUPABASE_URL', ''),
    SUPABASE_SERVICE_ROLE_KEY: _prop_('SUPABASE_SERVICE_ROLE_KEY', ''),
    TABELA_FILA:               prefix + 'email_fila',
    TABELA_CONF:               prefix + 'configuracoes',
    TABELA_SOL:                prefix + 'solicitacoes',
    TABELA_ESCOLAS:            'escolas',            // compartilhada entre prod e hml
    LIMITE_FILA:               50,
    MAX_TENTATIVAS:            3
  };
}

function _sbGet_(cfg, path) {
  var r = UrlFetchApp.fetch(cfg.SUPABASE_URL + path, {
    method: 'GET',
    headers: { apikey: cfg.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + cfg.SUPABASE_SERVICE_ROLE_KEY },
    muteHttpExceptions: true
  });
  return JSON.parse(r.getContentText() || '[]');
}

function _sbPatch_(cfg, path, body) {
  UrlFetchApp.fetch(cfg.SUPABASE_URL + path, {
    method: 'PATCH',
    headers: {
      apikey: cfg.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
}

function _sbPost_(cfg, path, body) {
  var r = UrlFetchApp.fetch(cfg.SUPABASE_URL + path, {
    method: 'POST',
    headers: {
      apikey: cfg.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: 'Bearer ' + cfg.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  return r;
}

/** Lê uma lista de configurações do Supabase de uma vez. */
function _lerConfigs_(cfg, chaves) {
  // Codifica o CONTEÚDO de cada chave, mas mantém as vírgulas LITERAIS — senão o
  // PostgREST não separa a lista do in.() e a leitura volta vazia.
  var in_ = chaves.map(function(c) { return encodeURIComponent(c); }).join(',');
  var r = _sbGet_(cfg, '/rest/v1/' + cfg.TABELA_CONF
    + '?select=chave,valor&chave=in.(' + in_ + ')&ativo=eq.true');
  var mapa = {};
  (Array.isArray(r) ? r : []).forEach(function(it) { mapa[it.chave] = it.valor || ''; });
  return mapa;
}

/* ── C1: processa as filas de e-mail (produção + homologação) a cada 15 min ──
 *
 * Uma única conta institucional envia tanto a fila de produção (email_fila)
 * quanto a de homologação (hml_email_fila). Cada item da fila já carrega
 * para/assunto/corpo prontos, então o envio independe do ambiente — basta
 * drenar as duas tabelas. Se uma delas ainda não existir (ex.: antes de rodar
 * as migrações em produção), a leitura é ignorada sem quebrar a outra.
 */
function gomProcessarFilaEmail() {
  var cfg = _cfgC_();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_SERVICE_ROLE_KEY) {
    Logger.log('gomProcessarFilaEmail: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
    return;
  }
  ['email_fila', 'hml_email_fila'].forEach(function(tabela) {
    try { _processarUmaFila_(cfg, tabela); }
    catch (e) { Logger.log('gomProcessarFilaEmail: erro na tabela ' + tabela + ' — ' + e); }
  });
}

function _processarUmaFila_(cfg, tabelaFila) {
  Logger.log('gomProcessarFilaEmail: lendo tabela ' + tabelaFila);
  var url = '/rest/v1/' + tabelaFila
    + '?status=eq.pendente&tentativas=lt.' + cfg.MAX_TENTATIVAS
    + '&order=criado_em.asc&limit=' + cfg.LIMITE_FILA;

  var pendentes = _sbGet_(cfg, url);

  if (!Array.isArray(pendentes) || !pendentes.length) {
    Logger.log('  ' + tabelaFila + ': nenhum e-mail pendente (ou tabela inexistente).');
    return;
  }
  Logger.log('  ' + tabelaFila + ': processando ' + pendentes.length + ' e-mails.');

  pendentes.forEach(function(item) {
    var resultado = gomEnviarEmail_({
      para:      item.para,
      cc:        item.cc || undefined,
      assunto:   item.assunto,
      corpoHtml: item.corpo_html
    });

    if (resultado.ok) {
      _sbPatch_(cfg, '/rest/v1/' + tabelaFila + '?id=eq.' + item.id, {
        status:     'enviado',
        enviado_em: new Date().toISOString(),
        erro_msg:   null
      });
      Logger.log('  #' + item.id + ' (' + tabelaFila + ') enviado para ' + item.para);
    } else {
      var novasTentativas = (item.tentativas || 0) + 1;
      _sbPatch_(cfg, '/rest/v1/' + tabelaFila + '?id=eq.' + item.id, {
        status:     novasTentativas >= cfg.MAX_TENTATIVAS ? 'erro' : 'pendente',
        tentativas: novasTentativas,
        erro_msg:   resultado.erro
      });
      Logger.log('  #' + item.id + ' (' + tabelaFila + ') FALHOU (tentativa ' + novasTentativas + '): ' + resultado.erro);
    }
  });
}

/* ── C2: gera alertas de SLA e grava na fila (1x/dia, 8h) ──────────────────
 *
 * Usa a mesma régua de SLA da tela Alertas. Evita duplicar alertas do mesmo
 * dia verificando se já existe item na fila com dados_ref->>'chamado_id'
 * igual e criado_em >= início do dia.
 */
function gomDispararAlertasSLA() {
  var cfg = _cfgC_();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_SERVICE_ROLE_KEY) {
    Logger.log('gomDispararAlertasSLA: propriedades não configuradas.');
    return;
  }

  // Lê configs relevantes
  var conf = _lerConfigs_(cfg, [
    'SLA_ANALISE_DIAS','SLA_VISITA_DIAS','SLA_ORCAMENTO_DIAS',
    'SLA_APROVACAO_DIAS','SLA_FINALIZACAO_DIAS',
    'EMAIL_SLA_ATIVO','EMAIL_SLA_ASSUNTO','EMAIL_SLA_CORPO',
    'EMAIL_SLA_DESTINATARIOS','EMAIL_RESPONSAVEL_GOM'
  ]);

  if (String(conf['EMAIL_SLA_ATIVO'] || 'SIM').toUpperCase() !== 'SIM') {
    Logger.log('gomDispararAlertasSLA: EMAIL_SLA_ATIVO = NÃO — abortando.');
    return;
  }

  var sla = {
    'Em análise':          Number(conf['SLA_ANALISE_DIAS']    || 3),
    'Aguardando visita':   Number(conf['SLA_VISITA_DIAS']     || 3),
    'Visita agendada':     Number(conf['SLA_VISITA_DIAS']     || 3),
    'Solicitado Orçamento':Number(conf['SLA_ORCAMENTO_DIAS']  || 5),
    'Orçamento Realizado': Number(conf['SLA_APROVACAO_DIAS']  || 2),
    'Serviço Realizado':   Number(conf['SLA_FINALIZACAO_DIAS']|| 2)
  };

  var assuntoTpl = conf['EMAIL_SLA_ASSUNTO']
    || '[GOM] Chamado {{numero}} — {{etapa}} acima do prazo ({{dias_atraso}} dias)';
  var corpoTpl = conf['EMAIL_SLA_CORPO']
    || '<p>Chamado <strong>#{{numero}}</strong> — <strong>{{escola}}</strong><br>'
     + 'Etapa: <strong>{{etapa}}</strong> · Atraso: <strong>{{dias_atraso}} dias</strong><br>'
     + 'Status atual: <strong>{{status}}</strong></p>'
     + '<p>Acesse o GOM para tomar providências.</p>'
     + '<p>Atenciosamente,<br><strong>GOM · SME Ribeirão Preto</strong></p>';

  var destinatarios = [conf['EMAIL_SLA_DESTINATARIOS'] || '', conf['EMAIL_RESPONSAVEL_GOM'] || '']
    .join(',').split(/[;,]/).map(function(e) { return e.trim(); })
    .filter(function(e) { return e && /@/.test(e); });
  var paraJoin = destinatarios.join(',');
  if (!paraJoin) { Logger.log('gomDispararAlertasSLA: nenhum destinatário configurado.'); return; }

  // Status têm espaço/acento (ex.: "Em análise"): codifica cada valor (com as
  // aspas), mas junta com vírgulas LITERAIS para o PostgREST separar o in.().
  var statusAbertos = Object.keys(sla).map(function(s) { return encodeURIComponent('"' + s + '"'); }).join(',');
  var chamados = _sbGet_(cfg,
    '/rest/v1/' + cfg.TABELA_SOL
    + '?select=id,situacao,data_hora_ultima_acao,data_hora_entrada_fila,escola_id'
    + '&situacao=in.(' + statusAbertos + ')'
    + '&limit=500');

  // O nome da escola vem da tabela escolas (compartilhada), não da solicitacoes
  // (a coluna unidade_escolar não existe lá). Monta um mapa id -> nome.
  var nomesEscola = {};
  if (Array.isArray(chamados) && chamados.length) {
    var idsEscola = {};
    chamados.forEach(function(c) { if (c.escola_id) idsEscola[c.escola_id] = true; });
    var listaEscolaIds = Object.keys(idsEscola);
    if (listaEscolaIds.length) {
      var escolasRows = _sbGet_(cfg, '/rest/v1/' + cfg.TABELA_ESCOLAS
        + '?select=id,nome&id=in.(' + listaEscolaIds.map(function(x) { return encodeURIComponent(x); }).join(',') + ')&limit=2000');
      (Array.isArray(escolasRows) ? escolasRows : []).forEach(function(e) { nomesEscola[e.id] = e.nome; });
    }
  }

  // Busca alertas já enviados hoje para evitar duplicata
  var inicioHoje = new Date(); inicioHoje.setHours(0,0,0,0);
  var jaEnviados = _sbGet_(cfg,
    '/rest/v1/' + cfg.TABELA_FILA
    + '?tipo=eq.sla_alerta&criado_em=gte.' + encodeURIComponent(inicioHoje.toISOString())
    + '&select=dados_ref&limit=500');
  var idsJaEnviados = {};
  (Array.isArray(jaEnviados) ? jaEnviados : []).forEach(function(r) {
    if (r.dados_ref && r.dados_ref.chamado_id) idsJaEnviados[r.dados_ref.chamado_id] = true;
  });

  var hoje = new Date(); hoje.setHours(0,0,0,0);
  var gerados = 0;

  (Array.isArray(chamados) ? chamados : []).forEach(function(ch) {
    if (idsJaEnviados[ch.id]) return; // já avisado hoje

    var limDias = sla[ch.situacao];
    if (!limDias) return;

    var refDate = ch.data_hora_ultima_acao || ch.data_hora_entrada_fila;
    if (!refDate) return;
    var diasAtraso = Math.floor((hoje - new Date(refDate)) / 86400000);
    if (diasAtraso < limDias) return; // ainda no prazo

    function apVar(tpl, vars) {
      var s = String(tpl || '');
      Object.keys(vars).forEach(function(k) { s = s.split(k).join(String(vars[k] || '')); });
      return s;
    }
    var vars = {
      '{{numero}}':     ch.id,
      '{{escola}}':     nomesEscola[ch.escola_id] || ('Escola #' + ch.escola_id),
      '{{etapa}}':      ch.situacao,
      '{{dias_atraso}}':diasAtraso,
      '{{status}}':     ch.situacao,
      '{{link}}':       ''
    };

    _sbPost_(cfg, '/rest/v1/' + cfg.TABELA_FILA, {
      tipo:       'sla_alerta',
      para:       paraJoin,
      cc:         '',
      assunto:    apVar(assuntoTpl, vars),
      corpo_html: _layoutEmail_(apVar(corpoTpl, vars)),
      dados_ref:  { chamado_id: ch.id, escola_id: ch.escola_id, situacao: ch.situacao, dias_atraso: diasAtraso }
    });
    gerados++;
  });

  Logger.log('gomDispararAlertasSLA: ' + gerados + ' alertas gerados.');
  // Processa a fila imediatamente (envia na mesma execução)
  if (gerados > 0) gomProcessarFilaEmail();
}

/* ── Instalação dos gatilhos ─────────────────────────────────────────────────
 * Rode gomInstalarGatilhos() UMA VEZ no editor.
 * Para remover tudo: gomRemoverGatilhos().
 */
function gomInstalarGatilhos() {
  gomRemoverGatilhos();
  // Fila de e-mails: a cada 15 minutos
  ScriptApp.newTrigger('gomProcessarFilaEmail')
    .timeBased().everyMinutes(15).create();
  // Alertas de SLA: diariamente às 8h
  ScriptApp.newTrigger('gomDispararAlertasSLA')
    .timeBased().everyDays(1).atHour(8).nearMinute(0).create();
  Logger.log('Gatilhos instalados: fila (15min) + SLA (diário 8h).');
}

function gomRemoverGatilhos() {
  var fns = ['gomProcessarFilaEmail', 'gomDispararAlertasSLA'];
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (fns.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
  Logger.log('Gatilhos de e-mail removidos.');
}

/** Teste manual da fila — cria 1 item de teste e processa imediatamente. */
function gomTesteFilaEmail() {
  var para = _prop_('GOM_EMAIL_TESTE_PARA', '');
  if (!para) throw new Error('Defina GOM_EMAIL_TESTE_PARA nas Propriedades do Script.');
  var cfg = _cfgC_();
  if (!cfg.SUPABASE_URL || !cfg.SUPABASE_SERVICE_ROLE_KEY)
    throw new Error('Configure SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY nas Propriedades do Script.');

  Logger.log('Tabela alvo: ' + cfg.TABELA_FILA);
  var respInsert = _sbPost_(cfg, '/rest/v1/' + cfg.TABELA_FILA, {
    tipo: 'visita_agendada', para: para, cc: '',
    assunto: 'GOM · Teste de fila de e-mail',
    corpo_html: _layoutEmail_('<p>Teste do processador de fila. Se chegou, a Fase C está funcionando.</p>'
      + '<p style="color:#6b7280;font-size:12px;">' + new Date().toLocaleString('pt-BR') + '</p>'),
    dados_ref: { teste: true }
  });
  Logger.log('Resposta do insert: HTTP ' + respInsert.getResponseCode() + ' — ' + respInsert.getContentText().slice(0, 200));

  Logger.log('Item de teste gravado na fila. Processando...');
  gomProcessarFilaEmail();
  Logger.log('gomTesteFilaEmail concluído.');
}
