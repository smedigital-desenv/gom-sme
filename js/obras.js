const CORES_OBRAS = {
  'Aguardando': '#f59e0b',
  'Em projeto': '#6366f1',
  'Em licitação': '#0ea5e9',
  'Em execução': '#14b8a6',
  'Suspensa': '#ef4444',
  'Concluída': '#22c55e',
  'Arquivada': '#64748b'
};

const ICONES_OBRAS = {
  'Aguardando': 'bi-hourglass-split',
  'Em projeto': 'bi-pencil-square',
  'Em licitação': 'bi-megaphone-fill',
  'Em execução': 'bi-hammer',
  'Suspensa': 'bi-pause-circle-fill',
  'Concluída': 'bi-check-circle-fill',
  'Arquivada': 'bi-archive-fill'
};

function normalizarStatusObraSistema(valor) {
  const textoOriginal = String(valor || '').trim();
  const textoNormalizado = normalizarTextoBase(textoOriginal);
  const mapa = {
    '': 'Aguardando',
    'aguardando': 'Aguardando',
    'em projeto': 'Em projeto',
    'projeto': 'Em projeto',
    'em licitacao': 'Em licitação',
    'licitacao': 'Em licitação',
    'em execucao': 'Em execução',
    'execucao': 'Em execução',
    'concluida': 'Concluída',
    'concluido': 'Concluída',
    'suspensa': 'Suspensa',
    'suspenso': 'Suspensa',
    'arquivada': 'Arquivada',
    'arquivado': 'Arquivada'
  };
  return mapa[textoNormalizado] || textoOriginal || 'Aguardando';
}

function getCorObraStatus(status) { return CORES_OBRAS[normalizarStatusObraSistema(status)] || '#0f766e'; }
function getIconeObraStatus(status) { return ICONES_OBRAS[normalizarStatusObraSistema(status)] || 'bi-buildings-fill'; }
function pesoPrioridadeObra(prioridade) { const p = String(prioridade || 'P3').toUpperCase(); return { P0: 0, P1: 1, P2: 2, P3: 3 }[p] ?? 9; }
function getPrioridadeClass(prioridade) { const p = String(prioridade || 'P3').toLowerCase(); return ['p0','p1','p2','p3'].includes(p) ? p : 'p3'; }

function renderizarObras() {
  const painel = document.getElementById('painelDados');
  if (!painel) return;
  painel.classList.add('obras-grid');

  if (!obrasCarregadas) {
    setPainelCarregando('Carregando obras...');
    return;
  }

  const termo = termoPesquisa();
  const base = ordenarObras(listaObrasGlobal || []);
  const lista = base.filter(o => {
    o.status = normalizarStatusObraSistema(o.status);
    const texto = normalizarTextoBase(`${o.id} ${o.codigo} ${o.unidade} ${o.tipo} ${o.descricao} ${o.status} ${o.prioridade} ${o.responsavel} ${o.responsavel2} ${o.prazo} ${o.valorEstimado} ${o.observacoes}`);
    return texto.includes(termo) && (statusFiltroClicado ? o.status === statusFiltroClicado : true);
  });

  renderizarKPIsObras(base);
  const contador = document.getElementById('contador');
  if (contador) contador.innerText = `${lista.length} obras`;

  if (!lista.length) {
    painel.innerHTML = '<div class="empty-state"><i class="bi bi-buildings display-5 d-block mb-3 text-muted"></i><h5>Nenhuma obra encontrada.</h5><p>Ajuste a busca ou selecione outro status.</p></div>';
    return;
  }

  painel.innerHTML = lista.map(renderCardObra).join('');
}

function ordenarObras(lista) {
  return [...(lista || [])].sort((a, b) => {
    const pa = pesoPrioridadeObra(a.prioridade);
    const pb = pesoPrioridadeObra(b.prioridade);
    if (pa !== pb) return pa - pb;
    return String(a.unidade || a.descricao || '').localeCompare(String(b.unidade || b.descricao || ''), 'pt-BR') || Number(a.id || 0) - Number(b.id || 0);
  });
}

function renderizarKPIsObras(lista) {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;
  const cont = {};
  (lista || []).forEach(o => { const st = normalizarStatusObraSistema(o.status); cont[st] = (cont[st] || 0) + 1; });
  let html = '';
  html += montarKpiCard(null, 'Todas as obras', (lista || []).length, 'var(--obras)', statusFiltroClicado === null, 'Todas as obras');
  (window.STATUS_OBRAS || []).forEach(st => { if ((cont[st] || 0) > 0) html += montarKpiCard(st, st, cont[st], getCorObraStatus(st), statusFiltroClicado === st, 'Filtrar ' + st); });
  grid.innerHTML = html;
}

function renderCardObra(o) {
  const status = normalizarStatusObraSistema(o.status);
  const corStatus = getCorObraStatus(status);
  const prioridade = String(o.prioridade || 'P3').toUpperCase();
  const idSeguro = escapeHtml(o.id);
  const codigo = escapeHtml(o.codigo || ('OBRA-' + (o.id || '')));
  const unidade = escapeHtml(o.unidade || o.descricao || 'Obra sem unidade informada.');
  const descricao = escapeHtml(o.descricao || 'Obra sem descrição informada.');
  const tipo = escapeHtml(o.tipo || 'Sem tipo');
  const responsavel = escapeHtml(o.responsavel || 'Não definido');
  const apoio = escapeHtml(o.responsavel2 || '—');
  const prazo = escapeHtml(o.prazo || o.dataTermino || 'Sem prazo');
  const atualizado = escapeHtml(o.dataHoraUltimaAcao || o.dataHoraUltimaAtualizacao || 'Sem atualização');
  const observacoes = escapeHtml(o.observacoes || 'Sem observações registradas.');
  const valor = o.valorEstimado ? `<div class="card-money"><i class="bi bi-cash-coin"></i> ${escapeHtml(o.valorEstimado)}</div>` : '';

  return `
    <div class="card-admin obra-card" style="--card-accent: ${corStatus};" onclick="abrirModalObra('${idSeguro}')">
      <div class="obra-top-badges">
        <span class="prioridade-pill ${getPrioridadeClass(prioridade)}"><i class="bi bi-flag-fill"></i>${escapeHtml(prioridade)}</span>
        <span class="obra-status-pill"><i class="bi ${getIconeObraStatus(status)}"></i>${escapeHtml(status)}</span>
      </div>
      <div class="card-title-wrap">
        <span class="card-icon"><i class="bi bi-cone-striped"></i></span>
        <div>
          <div class="card-label">${codigo} · ${tipo}</div>
          <div class="card-unit">${unidade}</div>
          <div class="card-subline">${descricao}</div>
        </div>
      </div>
      <div class="obra-meta-grid">
        <div class="obra-meta-item"><span class="obra-meta-label">Responsável</span><span class="obra-meta-value">${responsavel}</span></div>
        <div class="obra-meta-item"><span class="obra-meta-label">Apoio</span><span class="obra-meta-value">${apoio}</span></div>
        <div class="obra-meta-item"><span class="obra-meta-label">Prazo</span><span class="obra-meta-value">${prazo}</span></div>
      </div>
      ${valor}
      <div class="card-detail">${observacoes}</div>
      <div class="card-footer-row">
        <span class="text-muted small"><i class="bi bi-clock-history me-1"></i>${atualizado}</span>
        <span class="obra-link-btn">Abrir detalhes <i class="bi bi-arrow-right-short"></i></span>
      </div>
    </div>`;
}

function abrirModalObra(id) {
  const o = listaObrasGlobal.find(x => String(x.id) === String(id));
  if (!o) return;
  idObraAberta = o.id;
  document.getElementById('obraId').value = o.id;
  document.getElementById('obraIdBadge').innerText = o.id;
  document.getElementById('obraUnidade').innerText = o.unidade || o.descricao || '';
  document.getElementById('obraDescricao').innerText = o.descricao || '';
  document.getElementById('obraStatus').innerHTML = (window.STATUS_OBRAS || []).map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  document.getElementById('obraStatus').value = normalizarStatusObraSistema(o.status);
  document.getElementById('obraPrioridade').value = String(o.prioridade || 'P3').toUpperCase();
  document.getElementById('obraResponsavel').value = o.responsavel || '';
  document.getElementById('obraResponsavel2').value = o.responsavel2 || '';
  document.getElementById('obraObservacoes').value = o.observacoes || '';
  new bootstrap.Modal(document.getElementById('modalObra')).show();
}

function salvarObraModal(botao) {
  const btn = botao || (typeof gomGetBotaoAtivo === 'function' ? gomGetBotaoAtivo() : null);
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, 'Salvando obra...');
  else if (btn) btn.disabled = true;

  const payload = {
    id: idObraAberta,
    status: document.getElementById('obraStatus').value,
    prioridade: document.getElementById('obraPrioridade').value,
    responsavel: document.getElementById('obraResponsavel').value,
    responsavel2: document.getElementById('obraResponsavel2').value,
    observacoes: document.getElementById('obraObservacoes').value
  };
  google.script.run
    .withSuccessHandler(() => {
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalObra'));
      if (modal) modal.hide();
      refreshObras();
    })
    .withFailureHandler(err => {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
      else if (btn) btn.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar a obra.');
      else alert(err.message || err);
    })
    .atualizarObra(payload);
}

window.renderizarObras = window.renderizarObras || renderizarObras;
