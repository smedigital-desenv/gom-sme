/* ============================================================================
 * GOM | SME — Tela da Escola (dashboard da unidade)
 * ----------------------------------------------------------------------------
 * Dashboard amigável e fiel ao visual do sistema.
 *
 * - Perfil ESCOLA: mostra SOMENTE os chamados da própria unidade (GomAuth.escola,
 *   resolvido no login), e tem o botão "Abrir chamado" travado na unidade.
 * - Perfil de gestão (ADMIN_GOM / Secretaria): a mesma tela com um SELETOR de
 *   escola — permite consultar/supervisionar qualquer unidade (sem botão de
 *   abrir chamado, pois a abertura é da escola/Secretaria interna).
 *
 * Reaproveita o pipeline do Acompanhar (acompanhar.js): lista, detalhe (linha do
 * tempo) e complemento. Carrega via gomConsultarProtocoloEscolaV1Json({escolaId}).
 * ========================================================================== */

function _escolaEsc_(v) { return (typeof escapeHtml === 'function') ? escapeHtml(v) : String(v == null ? '' : v); }

function _escolaPerfil_() {
  return String((window.GomAuth && window.GomAuth.perfil) || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}
function _escolaEhPerfilEscola_() { return _escolaPerfil_() === 'ESCOLA'; }

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
    _kpiEscolaHtml_('bi-collection', 'Total de chamados', total, 'da unidade', 'var(--primary, #002b5e)', 'todos'),
    _kpiEscolaHtml_('bi-hourglass-split', 'Em andamento', and, 'em tratamento pela GOM', 'var(--visita, #2563eb)', 'andamento'),
    _kpiEscolaHtml_('bi-reply-fill', 'Aguardando a escola', dev, 'precisa complementar', 'var(--emergencial, #dc2626)', 'devolvido'),
    _kpiEscolaHtml_('bi-check2-circle', 'Concluídos', conc, 'serviço realizado', 'var(--concluido, #16a34a)', 'concluido')
  ].join('');
}

// Filtro pelos KPIs: re-renderiza a lista (reaproveitando renderListaAcompanhar)
// com o subconjunto escolhido.
function filtrarEscolaPara(bucket) {
  var todos = Array.isArray(window.__escolaChamados) ? window.__escolaChamados : [];
  var lista = (bucket === 'todos') ? todos : todos.filter(function (c) { return _escolaBucket_(c) === bucket; });
  var alvo = window.__escolaAlvoAtual || {};
  if (typeof renderListaAcompanhar === 'function') {
    renderListaAcompanhar({ ok: true, modo: 'lista', chamados: lista, unidade: alvo.nome || '' });
  }
}

// Seletor de escola para perfis de gestão. Para a ESCOLA, não aparece.
function gomMontarSeletorEscolaGestao_(mostrar) {
  var wrap = document.getElementById('escolaSeletorWrap');
  var btnAbrir = document.getElementById('escolaBtnAbrir');
  // "Abrir chamado" sempre visível (escola e gestão). Para a gestão, exige uma
  // escola selecionada no seletor (validado em gomAbrirCadastroEscola_).
  if (btnAbrir) btnAbrir.style.display = '';
  if (!wrap) return;
  if (!mostrar) { wrap.innerHTML = ''; return; }

  var escolas = Array.isArray(window.listaEscolasGlobal) ? window.listaEscolasGlobal : [];
  var sel = window.__escolaSelecionada || null;
  var opts = '<option value="">— Selecione uma escola —</option>' + escolas.map(function (e) {
    var id = (e && e.id != null) ? e.id : '';
    var nome = (e && e.nome) ? e.nome : String(e);
    var on = (sel && String(sel.id) === String(id)) ? ' selected' : '';
    return '<option value="' + _escolaEsc_(id) + '"' + on + '>' + _escolaEsc_(nome) + '</option>';
  }).join('');
  wrap.innerHTML = '<div class="d-flex align-items-center gap-2 flex-wrap">'
    + '<span class="fw-bold" style="font-size:.82rem;"><i class="bi bi-search me-1"></i>Ver a escola:</span>'
    + '<select class="form-select form-select-sm fw-bold" style="max-width:340px;" onchange="gomSelecionarEscolaGestao(this)">' + opts + '</select>'
    + '</div>';
}

window.gomSelecionarEscolaGestao = function (sel) {
  if (!sel) return;
  var id = sel.value;
  var nome = sel.options[sel.selectedIndex] ? sel.options[sel.selectedIndex].textContent : '';
  // Sem escola escolhida (opção em branco): volta ao estado inicial.
  if (!id && !nome) { window.__escolaSelecionada = null; var b0 = document.getElementById('acompanharResultado'); if (b0) carregarEscolaDashboard_(null); return; }
  window.__escolaSelecionada = { id: (id || null), nome: nome };
  var titulo = document.getElementById('escolaDashTitulo');
  if (titulo) titulo.textContent = nome;
  carregarEscolaDashboard_(window.__escolaSelecionada);
};

function _escolaAlvoVazio_(alvo) {
  if (!alvo) return true;
  var temId = alvo.id != null && alvo.id !== '';
  var temNome = !!(alvo.nome && String(alvo.nome).trim());
  return !temId && !temNome;
}

function carregarEscolaDashboard_(alvo) {
  var box = document.getElementById('acompanharResultado');
  window.__escolaAlvoAtual = alvo || null;

  if (_escolaAlvoVazio_(alvo)) {
    renderEscolaKpis_([]);
    window.__escolaChamados = [];
    if (box) {
      if (_escolaEhPerfilEscola_()) {
        box.innerHTML = '<div class="acompanhar-alerta erro"><i class="bi bi-exclamation-triangle"></i>'
          + '<div><strong>Unidade não vinculada</strong><span>Seu e-mail ainda não está vinculado a uma escola. '
          + 'Peça à Secretaria/GOM para preencher o e-mail da sua unidade no cadastro da escola.</span></div></div>';
      } else {
        box.innerHTML = '<div class="acompanhar-empty"><i class="bi bi-building"></i><strong>Escolha uma escola acima.</strong>'
          + '<span>Selecione a unidade no seletor para ver os chamados dela.</span></div>';
      }
    }
    return;
  }

  if (box) box.innerHTML = '<div class="acompanhar-loading"><div class="spinner-border text-primary"></div><strong>Carregando os chamados da unidade...</strong></div>';

  google.script.run
    .withSuccessHandler(function (res) {
      var r = (typeof parseJsonAcompanhar_ === 'function')
        ? parseJsonAcompanhar_(res)
        : (typeof res === 'string' ? (function () { try { return JSON.parse(res); } catch (e) { return { ok: false }; } })() : (res || { ok: false }));

      if (!r || !r.ok) {
        window.__escolaChamados = [];
        renderEscolaKpis_([]);
        if (box) box.innerHTML = '<div class="acompanhar-empty"><i class="bi bi-inbox"></i><strong>Nenhum chamado para esta unidade.</strong>'
          + '<span>Quando houver um chamado, ele aparece aqui automaticamente.</span></div>';
        return;
      }

      var chamados = Array.isArray(r.chamados) ? r.chamados : (r.chamado ? [r.chamado] : []);
      window.__escolaChamados = chamados;
      renderEscolaKpis_(chamados);
      if (typeof renderListaAcompanhar === 'function') {
        renderListaAcompanhar({ ok: true, modo: 'lista', chamados: chamados, unidade: alvo.nome || r.unidade || '' });
      }
    })
    .withFailureHandler(function (err) {
      if (box) box.innerHTML = '<div class="acompanhar-alerta erro"><i class="bi bi-exclamation-triangle"></i>'
        + '<div><strong>Não foi possível carregar</strong><span>' + _escolaEsc_((err && err.message) || String(err)) + '</span></div></div>';
    })
    .gomConsultarProtocoloEscolaV1Json(
      (alvo.id != null && alvo.id !== '') ? { escolaId: alvo.id } : { unidade: alvo.nome }
    );
}

function inicializarEscolaDashboard() {
  var ehEscola = _escolaEhPerfilEscola_();
  gomMontarSeletorEscolaGestao_(!ehEscola);

  var alvo = ehEscola
    ? ((window.GomAuth && window.GomAuth.escola) || null)
    : (window.__escolaSelecionada || null);

  var titulo = document.getElementById('escolaDashTitulo');
  if (titulo) titulo.textContent = (alvo && alvo.nome) ? alvo.nome : (ehEscola ? 'Minha Escola' : 'Painel por escola');

  carregarEscolaDashboard_(alvo);
}

function refreshEscolaDashboard() {
  inicializarEscolaDashboard();
}

// Abre o formulário DA ESCOLA (preenchimento da unidade), travado na unidade
// certa: a escola logada usa a própria; a gestão usa a escola selecionada.
window.gomAbrirCadastroEscola_ = function () {
  var ehEscola = _escolaEhPerfilEscola_();
  var alvo = ehEscola
    ? ((window.GomAuth && window.GomAuth.escola) || null)
    : (window.__escolaSelecionada || window.__escolaAlvoAtual || null);
  if (!ehEscola && (!alvo || !alvo.nome)) {
    alert('Selecione uma escola no seletor acima para abrir um chamado para ela.');
    return;
  }
  window.__cadastroModo = 'escola';
  window.__cadastroEscolaNome = (alvo && alvo.nome) ? alvo.nome : '';
  if (typeof loadPage === 'function') loadPage('cadastro');
};

window.inicializarEscolaDashboard = inicializarEscolaDashboard;
window.refreshEscolaDashboard = refreshEscolaDashboard;
window.filtrarEscolaPara = filtrarEscolaPara;
