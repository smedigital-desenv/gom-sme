/* ============================================================================
 * GOM | SME — Tela da Escola (dashboard da unidade)
 * ----------------------------------------------------------------------------
 * Dashboard amigável e fiel ao visual do sistema, mostrando SOMENTE os chamados
 * da escola vinculada ao usuário logado (GomAuth.escola, resolvido no login).
 *
 * Reaproveita o pipeline já testado do Acompanhar (acompanhar.js): a lista, o
 * detalhe (linha do tempo) e o complemento de chamados devolvidos. Aqui só
 * acrescentamos o hero, os KPIs e o carregamento automático por escola_id.
 *
 * Carrega via gomConsultarProtocoloEscolaV1Json({ escolaId }) — caminho preciso
 * por escola_id (não por nome). O bootstrap NÃO carrega chamados para o perfil
 * ESCOLA, então esta tela busca apenas os da própria unidade.
 * ========================================================================== */

function _escolaEsc_(v) { return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v == null ? '' : v); }

// Classifica o chamado em um "balde" amigável para os KPIs e o filtro.
function _escolaBucket_(c) {
  var st = String((c && (c.status || c.situacao)) || '').trim();
  if (st === 'Devolvido para a escola') return 'devolvido';
  if (['Serviço Realizado', 'Servico Realizado', 'Concluído', 'Concluido', 'Finalizado', 'Encerrado', 'Unificado'].indexOf(st) >= 0) return 'concluido';
  return 'andamento';
}

function _kpiEscolaHtml_(icone, label, valor, sub, cor, bucket) {
  return '<button type="button" class="dashboard-kpi" style="--dash-color:' + cor + ';" onclick="filtrarEscolaPara(\'' + bucket + '\')">'
    + '<span class="dashboard-kpi-icon"><i class="bi ' + icone + '"></i></span>'
    + '<span class="dashboard-kpi-label">' + _escolaEsc_(label) + '</span>'
    + '<strong>' + Number(valor || 0) + '</strong>'
    + '<small>' + _escolaEsc_(sub) + '</small>'
    + '</button>';
}

function renderEscolaKpis_(chamados) {
  var el = document.getElementById('escolaKpis');
  if (!el) return;
  var total = chamados.length, dev = 0, conc = 0, and = 0;
  chamados.forEach(function (c) {
    var b = _escolaBucket_(c);
    if (b === 'devolvido') dev++;
    else if (b === 'concluido') conc++;
    else and++;
  });
  el.innerHTML = [
    _kpiEscolaHtml_('bi-collection', 'Total de chamados', total, 'da sua unidade', 'var(--primary, #002b5e)', 'todos'),
    _kpiEscolaHtml_('bi-hourglass-split', 'Em andamento', and, 'em tratamento pela GOM', 'var(--visita, #2563eb)', 'andamento'),
    _kpiEscolaHtml_('bi-reply-fill', 'Aguardando você', dev, 'precisa complementar', 'var(--emergencial, #dc2626)', 'devolvido'),
    _kpiEscolaHtml_('bi-check2-circle', 'Concluídos', conc, 'serviço realizado', 'var(--concluido, #16a34a)', 'concluido')
  ].join('');
}

// Filtro pelos KPIs: re-renderiza a lista (reaproveitando renderListaAcompanhar)
// com o subconjunto escolhido.
function filtrarEscolaPara(bucket) {
  var todos = Array.isArray(window.__escolaChamados) ? window.__escolaChamados : [];
  var lista = (bucket === 'todos') ? todos : todos.filter(function (c) { return _escolaBucket_(c) === bucket; });
  var esc = (window.GomAuth && window.GomAuth.escola) || {};
  if (typeof renderListaAcompanhar === 'function') {
    renderListaAcompanhar({ ok: true, modo: 'lista', chamados: lista, unidade: esc.nome || '' });
  }
}

function carregarEscolaDashboard_() {
  var esc = (window.GomAuth && window.GomAuth.escola) || null;
  var box = document.getElementById('acompanharResultado');

  if (!esc || esc.id == null) {
    renderEscolaKpis_([]);
    if (box) box.innerHTML = '<div class="acompanhar-alerta erro"><i class="bi bi-exclamation-triangle"></i>'
      + '<div><strong>Unidade não vinculada</strong><span>Seu e-mail ainda não está vinculado a uma escola. '
      + 'Peça à Secretaria/GOM para preencher o e-mail da sua unidade no cadastro da escola.</span></div></div>';
    return;
  }

  if (box) box.innerHTML = '<div class="acompanhar-loading"><div class="spinner-border text-primary"></div><strong>Carregando os chamados da sua unidade...</strong></div>';

  google.script.run
    .withSuccessHandler(function (res) {
      var r = (typeof parseJsonAcompanhar_ === 'function')
        ? parseJsonAcompanhar_(res)
        : (typeof res === 'string' ? (function () { try { return JSON.parse(res); } catch (e) { return { ok: false }; } })() : (res || { ok: false }));

      // Sem chamados ainda não é erro: mostra estado vazio amigável.
      if (!r || !r.ok) {
        window.__escolaChamados = [];
        renderEscolaKpis_([]);
        if (box) box.innerHTML = '<div class="acompanhar-empty"><i class="bi bi-inbox"></i><strong>Nenhum chamado ainda.</strong>'
          + '<span>Quando sua unidade abrir um chamado, ele aparece aqui automaticamente.</span></div>';
        return;
      }

      var chamados = Array.isArray(r.chamados) ? r.chamados : (r.chamado ? [r.chamado] : []);
      window.__escolaChamados = chamados;
      renderEscolaKpis_(chamados);
      if (typeof renderListaAcompanhar === 'function') {
        renderListaAcompanhar({ ok: true, modo: 'lista', chamados: chamados, unidade: esc.nome || r.unidade || '' });
      }
    })
    .withFailureHandler(function (err) {
      if (box) box.innerHTML = '<div class="acompanhar-alerta erro"><i class="bi bi-exclamation-triangle"></i>'
        + '<div><strong>Não foi possível carregar</strong><span>' + _escolaEsc_((err && err.message) || String(err)) + '</span></div></div>';
    })
    .gomConsultarProtocoloEscolaV1Json({ escolaId: esc.id });
}

function inicializarEscolaDashboard() {
  var esc = (window.GomAuth && window.GomAuth.escola) || null;
  var titulo = document.getElementById('escolaDashTitulo');
  if (titulo && esc && esc.nome) titulo.textContent = esc.nome;
  carregarEscolaDashboard_();
}

function refreshEscolaDashboard() {
  inicializarEscolaDashboard();
}

window.inicializarEscolaDashboard = inicializarEscolaDashboard;
window.refreshEscolaDashboard = refreshEscolaDashboard;
window.filtrarEscolaPara = filtrarEscolaPara;
