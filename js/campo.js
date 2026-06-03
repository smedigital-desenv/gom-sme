var campoTabAtual = window.campoTabAtual || 'dia';
var campoFiltroAtual = window.campoFiltroAtual || null;
var campoEscolaFiltroAtual = window.campoEscolaFiltroAtual || '';

function loadCampoTab(tab, botao) {
  campoTabAtual = tab || 'dia';
  window.campoTabAtual = campoTabAtual;
  document.querySelectorAll('.campo-actions .btn').forEach(function(b) { b.classList.remove('active'); });
  if (botao) botao.classList.add('active');
  renderizarCampo();
}

function filtrarCampoKpi(filtro) {
  campoFiltroAtual = campoFiltroAtual === filtro ? null : filtro;
  window.campoFiltroAtual = campoFiltroAtual;
  renderizarCampo();
}

function filtrarCampo() {
  sincronizarFiltroEscolaCampo();
  renderizarCampo();
}

function limparFiltrosCampo() {
  campoFiltroAtual = null;
  window.campoFiltroAtual = null;
  campoEscolaFiltroAtual = '';
  window.campoEscolaFiltroAtual = '';

  const pesquisa = document.getElementById('pesquisa');
  if (pesquisa) pesquisa.value = '';

  const select = document.getElementById('campoSelectEscola');
  if (select) select.value = '';

  renderizarCampo();
}

function sincronizarFiltroEscolaCampo() {
  const select = document.getElementById('campoSelectEscola');
  if (!select) return;
  campoEscolaFiltroAtual = select.value || '';
  window.campoEscolaFiltroAtual = campoEscolaFiltroAtual;
}

function getFiltroEscolaCampoNormalizado() {
  return normalizarTextoBase(campoEscolaFiltroAtual || '');
}

function passaFiltroEscolaCampo(item) {
  const escolaFiltro = getFiltroEscolaCampoNormalizado();
  if (!escolaFiltro) return true;
  return normalizarTextoBase(item && item.unidade ? item.unidade : '').includes(escolaFiltro);
}

function popularSelectEscolasCampo() {
  const select = document.getElementById('campoSelectEscola');
  if (!select) return;

  const valorAtual = select.value || campoEscolaFiltroAtual || '';
  const mapa = {};

  getChamadosCampo().forEach(function(item) {
    const nome = String(item && item.unidade ? item.unidade : '').trim();
    if (nome) mapa[nome] = true;
  });

  getHistoricoCampo().forEach(function(item) {
    const nome = String(item && item.unidade ? item.unidade : '').trim();
    if (nome) mapa[nome] = true;
  });

  const escolas = Object.keys(mapa).sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
  select.innerHTML = '<option value="">Todas as escolas</option>' + escolas.map(function(nome) {
    const selected = nome === valorAtual ? ' selected' : '';
    return '<option value="' + escapeHtml(nome) + '"' + selected + '>' + escapeHtml(nome) + '</option>';
  }).join('');

  if (valorAtual && escolas.indexOf(valorAtual) >= 0) select.value = valorAtual;
  else if (valorAtual) {
    campoEscolaFiltroAtual = '';
    window.campoEscolaFiltroAtual = '';
  }
}

function getDadosCampo() {
  return window.dadosCampoGlobal || { chamados: [], historico: [], kpis: {} };
}

function getChamadosCampo() {
  const dados = getDadosCampo();
  return Array.isArray(dados.chamados) ? dados.chamados : [];
}

function getHistoricoCampo() {
  const dados = getDadosCampo();
  return Array.isArray(dados.historico) ? dados.historico : [];
}

function renderizarCampo() {
  if (!window.campoCarregado) {
    const painel = document.getElementById('painelDados');
    if (painel) {
      painel.innerHTML = '<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold">Carregando equipes em campo...</p></div>';
    }
    return;
  }

  popularSelectEscolasCampo();
  renderizarKpisCampo();
  const painel = document.getElementById('painelDados');
  if (!painel) return;

  const termo = termoPesquisa();
  const chamadosBase = getChamadosCampo().filter(function(item) {
    const textoOk = normalizarTextoBase([
      item.id, item.unidade, item.detalhamento, item.equipe, item.situacao,
      item.numeroOs, item.observacoes, item.dataEquipe, item.dataHoraUltimaAcao,
      item.dataPrevistaConclusao
    ].join(' ')).includes(termo);
    return textoOk && passaFiltroEscolaCampo(item);
  });
  const chamados = aplicarFiltroCampo(chamadosBase);
  const historico = filtrarHistoricoCampo(getHistoricoCampo(), termo);

  if (campoTabAtual === 'historico') {
    painel.innerHTML = renderHistoricoCampo(historico, chamadosBase);
    return;
  }

  if (campoTabAtual === 'pendencias') {
    const pendentes = chamados.filter(function(c) { return !c.temEquipeDiaValida; });
    painel.innerHTML = pendentes.length ? renderListaCampoOficial(pendentes, { modo: 'pendencias' }) : '<div class="empty-state"><h5>Nenhuma pendência de preenchimento hoje.</h5><p>A empresa já registrou as equipes do dia para todos os atendimentos filtrados.</p></div>';
    setContadorCampo(pendentes.length);
    return;
  }

  // Acompanhamento diário: mostra somente os com equipe registrada hoje
  const preenchidosHojeLista = chamados.filter(function(c) { return !!c.temEquipeDiaValida; });
  painel.innerHTML = preenchidosHojeLista.length
    ? renderListaCampoOficial(preenchidosHojeLista, { modo: 'dia' })
    : '<div class="empty-state"><h5>Nenhum preenchimento registrado hoje.</h5><p>A empresa ainda não registrou equipes do dia. Use o botão <strong>Pendências de hoje</strong> para ver o que está em aberto.</p></div>';
  setContadorCampo(preenchidosHojeLista.length);
}

function aplicarFiltroCampo(lista) {
  if (!campoFiltroAtual) return lista || [];
  return (lista || []).filter(function(item) {
    const st = normalizarSituacaoSistema(item.situacao || item.status);
    if (campoFiltroAtual === 'OS emitida') return st === 'OS emitida';
    if (campoFiltroAtual === 'Atendimento Emergencial') return st === 'Atendimento Emergencial';
    if (campoFiltroAtual === 'OS sem número') return st === 'OS emitida' && !String(item.numeroOs || '').trim();
    if (campoFiltroAtual === 'Escolas em atendimento') return true;
    if (campoFiltroAtual === 'Pendentes hoje') return !item.temEquipeDiaValida;
    if (campoFiltroAtual === 'Preenchidos hoje') return !!item.temEquipeDiaValida;
    return true;
  });
}

function filtrarHistoricoCampo(historico, termo) {
  const lista = (historico || []).filter(function(h) { return passaFiltroEscolaCampo(h); });
  if (!termo) return lista;
  return lista.filter(function(h) {
    return normalizarTextoBase([h.dataAtendimento, h.id, h.unidade, h.equipe, h.tipoRegistro, h.observacoes].join(' ')).includes(termo);
  });
}

function renderizarKpisCampo() {
  const grid = document.getElementById('campoKpis');
  if (!grid) return;

  const dados = getDadosCampo();
  const k = dados.kpis || {};
  const chamados = getChamadosCampo();
  const osSemNumero = Number(k.osSemNumero || 0) || chamados.filter(function(c) { return normalizarSituacaoSistema(c.situacao || c.status) === 'OS emitida' && !String(c.numeroOs || '').trim(); }).length;
  const pendentesHoje = Number(k.pendentesHoje || 0) || chamados.filter(function(c) { return !c.temEquipeDiaValida; }).length;
  const preenchidosHoje = Number(k.preenchidosHoje || 0) || chamados.filter(function(c) { return !!c.temEquipeDiaValida; }).length;

  const cards = [
    { filtro: 'Escolas em atendimento', titulo: 'Unidades em campo', valor: k.escolasEmAtendimento || chamados.length, cor: 'var(--servico-realizado)', icon: 'bi-buildings-fill', descricao: 'Unidades com atendimento ativo e acompanhamento diário necessário.' },
    { filtro: 'Pendentes hoje', titulo: 'Pendentes hoje', valor: pendentesHoje, cor: 'var(--duplicado)', icon: 'bi-clock-history', descricao: 'Atendimentos que ainda não receberam equipe do dia ou observação diária.' },
    { filtro: 'Preenchidos hoje', titulo: 'Preenchidos hoje', valor: preenchidosHoje, cor: 'var(--concluido)', icon: 'bi-check-circle-fill', descricao: 'Atendimentos que já tiveram equipe registrada no dia atual.' },
    { filtro: 'OS emitida', titulo: 'OS emitidas', valor: k.osAbertas || chamados.filter(function(c) { return normalizarSituacaoSistema(c.situacao || c.status) === 'OS emitida'; }).length, cor: 'var(--os)', icon: 'bi-file-earmark-check-fill', descricao: 'Ordens de serviço liberadas para execução pela empresa.' },
    { filtro: 'Atendimento Emergencial', titulo: 'Emergenciais', valor: k.emergenciais || chamados.filter(function(c) { return normalizarSituacaoSistema(c.situacao || c.status) === 'Atendimento Emergencial'; }).length, cor: 'var(--emergencial)', icon: 'bi-exclamation-triangle-fill', descricao: 'Demandas emergenciais atualmente em campo.' },
    { filtro: 'OS sem número', titulo: 'OS sem número', valor: osSemNumero, cor: 'var(--orcamento)', icon: 'bi-exclamation-diamond-fill', descricao: 'OS emitidas que precisam de numeração para rastreabilidade.' }
  ];

  grid.innerHTML = cards
    .filter(function(c) { return Number(c.valor) > 0; })
    .map(function(c) { return renderKpiCampo(c); })
    .join('');
}

function renderKpiCampo(card) {
  const ativo = campoFiltroAtual === card.filtro;
  const descricao = getKpiDescricao(card.filtro, card.titulo, card.descricao);
  return `
    <div class="kpi-box ${ativo ? 'ativo' : ''}" style="--kpi-color:${card.cor};" onclick="filtrarCampoKpi('${escapeJsAttr(card.filtro)}')" title="${escapeHtml(descricao)}" aria-label="${escapeHtml(card.titulo)}: ${escapeHtml(descricao)}">
      <div class="kpi-box-head"><span class="kpi-icon"><i class="bi ${card.icon}"></i></span><span class="kpi-pulse"></span></div>
      <div class="kpi-title">${escapeHtml(card.titulo)}</div>
      <div class="kpi-value-row"><div class="kpi-value">${escapeHtml(card.valor)}</div><span class="kpi-caption">registros</span></div>
      <div class="kpi-help">${escapeHtml(descricao)}</div>
    </div>`;
}

function renderListaCampoOficial(lista, opcoes) {
  opcoes = opcoes || {};
  return `
    <div class="campo-lista-oficial">
      <div class="campo-lista-toolbar">
        <div>
          <strong>${opcoes.modo === 'pendencias' ? 'Pendências de preenchimento da empresa' : 'Acompanhamento diário das equipes'}</strong>
          <span>${opcoes.modo === 'pendencias' ? 'Mostrando unidades que ainda não receberam equipe do dia pela empresa.' : 'Tela somente para consulta. A seleção da equipe e o salvamento diário ficam exclusivamente na tela Empresa.'}</span>
        </div>
        <div class="campo-lista-legenda"><span class="badge bg-warning text-dark">Pendente hoje</span><span class="badge bg-success">Preenchido hoje</span></div>
      </div>
      <div class="campo-lista-head campo-lista-head-oficial">
        <div>Unidade / serviço</div>
        <div>Status, OS e encaminhamento</div>
        <div>Equipe registrada</div>
        <div>Observação registrada</div>
        <div>Situação</div>
      </div>
      ${lista.map(renderLinhaCampoOficial).join('')}
    </div>`;
}

function renderLinhaCampoOficial(item) {
  const idOriginal = String(item.id || '');
  const id = escapeHtml(idOriginal);
  const idJs = escapeJsAttr(idOriginal);
  const st = normalizarSituacaoSistema(item.situacao || item.status);
  const unidade = escapeHtml(item.unidade || 'Unidade não informada');
  const detalheCompleto = escapeHtml(item.detalhamento || 'Sem descrição');
  const detalheCurto = escapeHtml(resumirTextoCampo(item.detalhamento || 'Sem descrição', 150));
  const numeroOs = escapeHtml(item.numeroOs || 'Sem número');
  const dataEnc = escapeHtml(item.dataHoraEncaminhamento || item.dataHoraEntradaFila || item.dataHoraUltimaAcao || item.dataHora || item.data || '-');
  const dataPrev = escapeHtml(item.dataPrevistaConclusao || '-');
  const dataEquipe = escapeHtml(item.dataEquipe || '-');
  const obs = escapeHtml(item.observacoes || item.observacaoAntiga || 'Sem observações registradas.');
  const equipeRegistrada = item.temEquipeDiaValida && String(item.equipe || '').trim()
    ? escapeHtml(item.equipe)
    : '<span class="campo-muted-value">Não registrada hoje</span>';
  const observacaoRegistrada = item.temEquipeDiaValida && String(item.observacoes || '').trim()
    ? escapeHtml(resumirTextoCampo(item.observacoes, 170))
    : '<span class="campo-muted-value">Aguardando preenchimento da empresa.</span>';
  const rowClass = item.temEquipeDiaValida ? 'campo-preenchido' : 'campo-pendente';
  const badge = item.temEquipeDiaValida ? '<span class="badge bg-success">Preenchido hoje</span>' : '<span class="badge bg-warning text-dark">Pendente hoje</span>';
  const alertaOs = st === 'OS emitida' && !String(item.numeroOs || '').trim() ? '<span class="empresa-os-alert"><i class="bi bi-exclamation-triangle-fill"></i> Sem nº OS</span>' : '';

  return `
    <div class="campo-lista-row campo-lista-row-oficial ${rowClass} ${getClasseStatus(st)}" style="--card-accent:${getCorStatus(st)};">
      <div class="campo-unidade-cell" data-label="Unidade / serviço">
        <details class="empresa-expand">
          <summary>
            <span class="empresa-unidade-link">${unidade}</span>
            <span class="empresa-os-id">#${id}</span>
          </summary>
          <div class="empresa-expand-body">
            <div class="modal-label">Descrição completa</div>
            <div class="card-detail mb-2">${detalheCompleto}</div>
            <div class="modal-label">Observações acumuladas</div>
            <div class="card-observacao mb-2">${obs}</div>
            <div class="campo-expand-meta">
              <span><strong>Data prevista:</strong> ${dataPrev}</span>
              <span><strong>Último registro de equipe:</strong> ${dataEquipe}</span>
            </div>
            <button type="button" class="btn btn-light btn-sm border fw-bold mt-2" onclick="abrirModalAnalise('${idJs}')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir chamado</button>
          </div>
        </details>
        <div class="empresa-os-desc">${detalheCurto}</div>
      </div>

      <div class="campo-status-cell campo-status-data-cell" data-label="Status / OS / encaminhamento">
        <span class="badge-status">${escapeHtml(st)}</span>
        <span class="empresa-os-numero"><strong>OS:</strong> ${numeroOs}</span>
        <span class="campo-data-inline"><i class="bi bi-calendar3"></i> ${dataEnc}</span>
        ${alertaOs}
      </div>

      <div class="campo-readonly-cell" data-label="Equipe registrada">
        <span class="campo-readonly-label">Equipe do dia</span>
        <strong>${equipeRegistrada}</strong>
      </div>

      <div class="campo-readonly-cell" data-label="Observação registrada">
        <span class="campo-readonly-label">Observação</span>
        <span>${observacaoRegistrada}</span>
      </div>

      <div class="campo-acao-cell campo-status-dia-cell" data-label="Situação">
        ${badge}
      </div>
    </div>`;
}
function montarOptionsEquipesCampo(valorAtual) {
  const equipes = Array.isArray(window.listaEquipesGlobal) ? window.listaEquipesGlobal : [];
  let html = '<option value="">-- Selecionar equipe --</option>';
  equipes.forEach(function(eq) {
    const nome = String(eq && eq.nome ? eq.nome : eq || '').trim();
    if (!nome) return;
    const selected = String(valorAtual || '') === nome ? ' selected' : '';
    html += `<option value="${escapeHtml(nome)}"${selected}>${escapeHtml(nome)}</option>`;
  });
  return html;
}

function salvarEquipeDiaCampoFront(e, id) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  alert('A tela Campo é somente para visualização. O registro da equipe do dia deve ser feito pela empresa na tela Empresa.');
}

function renderHistoricoCampo(historico, chamadosAtuais) {
  const historicoValido = Array.isArray(historico) ? historico : [];
  const chamados = Array.isArray(chamadosAtuais) ? chamadosAtuais : [];
  const baseGrafico = historicoValido.length ? historicoValido : chamados.map(function(c) {
    return {
      dataAtendimento: c.dataEquipe || c.dataHoraUltimaAcao || c.dataHora || c.data || 'Atual',
      id: c.id,
      unidade: c.unidade,
      equipe: c.equipe || (c.temEquipeDiaValida ? 'Equipe informada' : 'Pendente'),
      tipoRegistro: c.temEquipeDiaValida ? 'Preenchido hoje' : 'Pendente hoje',
      observacoes: c.observacoes || ''
    };
  });

  if (!baseGrafico.length && !chamados.length) {
    setContadorCampo(0);
    return '<div class="empty-state"><h5>Nenhum histórico ou atendimento em campo encontrado.</h5></div>';
  }

  const seriePorData = gerarSerieDiariaCampo(baseGrafico, 30);
  const porEquipe = agruparContagem(baseGrafico, function(h) { return String(h.equipe || 'Sem equipe').trim() || 'Sem equipe'; });
  const porTipo = agruparContagem(baseGrafico, function(h) { return String(h.tipoRegistro || 'Registro').trim() || 'Registro'; });
  const diasPorUnidade = calcularDiasEmCampoPorUnidade(chamados);
  const osPrazo = calcularOsPrazoCampo(chamados);
  const pendenciasTipo = calcularPendenciasTipoCampo(chamados);
  const atendimentosPorStatus = agruparContagem(chamados, function(c) { return normalizarSituacaoSistema(c.situacao || c.status || 'Sem status'); });
  const rankingEquipes = agruparContagem(baseGrafico, function(h) { return String(h.equipe || 'Sem equipe').trim() || 'Sem equipe'; });
  const tempoMedioEquipe = calcularTempoMedioCampoPorEquipe(chamados);

  const linhas = baseGrafico.slice(-120).reverse().map(function(h) {
    return `<tr><td>${escapeHtml(h.dataAtendimento || '-')}</td><td>#${escapeHtml(h.id || '-')}</td><td>${escapeHtml(h.unidade || '-')}</td><td>${escapeHtml(h.equipe || '-')}</td><td>${escapeHtml(h.tipoRegistro || '-')}</td><td>${escapeHtml(h.observacoes || '')}</td></tr>`;
  }).join('');

  setContadorCampo(baseGrafico.length || chamados.length);
  return `
    ${!historicoValido.length ? '<div class="alert alert-info border-0 shadow-sm"><strong>Histórico ainda sem registros reais.</strong> O painel abaixo usa a situação atual como referência até que a empresa alimente o registro diário.</div>' : ''}

    <div class="campo-grafico-principal mb-3">
      ${renderGraficoBarrasDataCampo('Registros por data', seriePorData, 'Atendimentos registrados por dia nos últimos 30 dias, inclusive dias sem registro.')}
    </div>

    <div class="campo-section-title"><i class="bi bi-pie-chart-fill"></i> Distribuição dos registros</div>
    <div class="campo-dashboard-grid campo-dashboard-grid-secundario mb-3">
      ${renderGraficoRoscaCampo('Registros por equipe', porEquipe, 'Distribuição dos registros conforme a equipe informada pela empresa.')}
      ${renderGraficoRoscaCampo('Tipo de registro', porTipo, 'Distribuição entre registros preenchidos, pendentes e demais tipos de lançamento.')}
    </div>

    <div class="campo-section-title"><i class="bi bi-clipboard-data-fill"></i> Indicadores operacionais de campo</div>
    <div class="campo-dashboard-grid campo-dashboard-grid-avancado mb-3">
      ${renderGraficoBarrasHorizCampo('Dias em campo por unidade', diasPorUnidade, 'Mostra as unidades que estão há mais tempo em atendimento ativo.', 'dias')}
      ${renderGraficoRoscaCampo('OS no prazo x vencidas', osPrazo, 'Compara OS com previsão dentro do prazo, vencidas ou sem previsão cadastrada.')}
      ${renderGraficoRoscaCampo('Pendências por tipo', pendenciasTipo, 'Agrupa os principais problemas operacionais que exigem ação da GOM ou da empresa.')}
      ${renderGraficoRoscaCampo('Atendimentos por status', atendimentosPorStatus, 'Distribuição dos atendimentos em campo por status atual.')}
      ${renderGraficoBarrasHorizCampo('Ranking de equipes por dias registrados', rankingEquipes, 'Quantidade de registros diários vinculados a cada equipe no período.', 'registros')}
      ${renderGraficoBarrasHorizCampo('Tempo médio em campo por equipe', tempoMedioEquipe, 'Média estimada de dias em campo por equipe, considerando atendimentos ativos.', 'dias', { decimais: 1 })}
    </div>

    <div class="campo-section-title"><i class="bi bi-table"></i> Últimos registros do campo</div>
    <div class="table-responsive bg-white rounded shadow-sm border">
      <table class="table table-sm align-middle mb-0">
        <thead class="table-light"><tr><th>Data</th><th>ID</th><th>Unidade</th><th>Equipe</th><th>Tipo</th><th>Observação</th></tr></thead>
        <tbody>${linhas || '<tr><td colspan="6" class="text-muted text-center py-4">Nenhum registro diário encontrado.</td></tr>'}</tbody>
      </table>
    </div>`;
}

function renderGraficoBarrasDataCampo(titulo, serie, subtitulo) {
  const entradas = Array.isArray(serie) ? serie : [];
  const max = entradas.reduce(function(m, item) { return Math.max(m, Number(item.valor || 0)); }, 1);
  return `
    <div class="panel campo-chart-panel campo-chart-panel-wide">
      <div class="panel-head campo-chart-head">
        <div>
          <h6 class="panel-title mb-0"><i class="bi bi-bar-chart-fill"></i>${escapeHtml(titulo)}</h6>
          <p class="campo-chart-subtitle mb-0">${escapeHtml(subtitulo || '')}</p>
        </div>
        <span class="campo-chart-periodo">Últimos ${escapeHtml(entradas.length || 0)} dias</span>
      </div>
      <div class="campo-chart campo-chart-data">
        ${entradas.map(function(item) {
          const label = item.label;
          const valor = Number(item.valor || 0);
          const altura = valor > 0 ? Math.max(12, Math.round((valor / max) * 190)) : 4;
          const classeZero = valor > 0 ? '' : ' zero';
          return `<div class="campo-bar-wrap campo-bar-data" title="${escapeHtml(label)}: ${escapeHtml(valor)} registro(s)"><div class="campo-bar${classeZero}" style="height:${altura}px;"></div><strong>${escapeHtml(valor)}</strong><span>${escapeHtml(label)}</span></div>`;
        }).join('')}
      </div>
    </div>`;
}

function renderGraficoRoscaCampo(titulo, dados, subtitulo) {
  const paleta = ['#002b5e', '#00e5ff', '#22c55e', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6', '#ef4444', '#64748b'];
  const entradasOriginais = Object.entries(dados || {}).filter(function(item) { return Number(item[1] || 0) > 0; }).sort(function(a, b) { return b[1] - a[1]; });
  const entradas = limitarEntradasRoscaCampo(entradasOriginais, 7);
  const total = entradas.reduce(function(soma, item) { return soma + Number(item[1] || 0); }, 0);

  if (!total) {
    return `
      <div class="panel campo-chart-panel campo-donut-panel">
        <div class="panel-head campo-chart-head"><div><h6 class="panel-title mb-0"><i class="bi bi-pie-chart-fill"></i>${escapeHtml(titulo)}</h6><p class="campo-chart-subtitle mb-0">${escapeHtml(subtitulo || '')}</p></div></div>
        <div class="empty-state compact"><h6>Nenhum registro para este gráfico.</h6></div>
      </div>`;
  }

  let acumulado = 0;
  const segmentos = entradas.map(function(item, idx) {
    const valor = Number(item[1] || 0);
    const inicio = acumulado;
    const fim = acumulado + (valor / total * 360);
    acumulado = fim;
    return `${paleta[idx % paleta.length]} ${inicio.toFixed(2)}deg ${fim.toFixed(2)}deg`;
  }).join(', ');

  return `
    <div class="panel campo-chart-panel campo-donut-panel">
      <div class="panel-head campo-chart-head">
        <div>
          <h6 class="panel-title mb-0"><i class="bi bi-pie-chart-fill"></i>${escapeHtml(titulo)}</h6>
          <p class="campo-chart-subtitle mb-0">${escapeHtml(subtitulo || '')}</p>
        </div>
        <span class="campo-chart-periodo">${escapeHtml(total)} registros</span>
      </div>
      <div class="campo-donut-wrap">
        <div class="campo-donut" style="background: conic-gradient(${segmentos});">
          <div class="campo-donut-center"><strong>${escapeHtml(total)}</strong><span>registros</span></div>
        </div>
        <div class="campo-donut-legend">
          ${entradas.map(function(item, idx) {
            const label = item[0];
            const valor = Number(item[1] || 0);
            const pct = total ? Math.round(valor / total * 100) : 0;
            return `<div class="campo-donut-legend-row" title="${escapeHtml(label)}: ${escapeHtml(valor)}"><span class="campo-donut-color" style="background:${paleta[idx % paleta.length]};"></span><span class="campo-donut-label">${escapeHtml(label)}</span><strong>${escapeHtml(valor)}</strong><em>${escapeHtml(pct)}%</em></div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
}

function limitarEntradasRoscaCampo(entradas, limite) {
  if (!Array.isArray(entradas) || entradas.length <= limite) return entradas || [];
  const principais = entradas.slice(0, limite);
  const outros = entradas.slice(limite).reduce(function(soma, item) { return soma + Number(item[1] || 0); }, 0);
  if (outros > 0) principais.push(['Outros', outros]);
  return principais;
}

function gerarSerieDiariaCampo(lista, dias) {
  const totalDias = Math.max(7, Number(dias || 30));
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - (totalDias - 1));
  const mapa = {};
  const serie = [];

  for (let i = 0; i < totalDias; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
    const chave = chaveDataCampo(d);
    mapa[chave] = { chave: chave, label: labelDataCampo(d), valor: 0 };
    serie.push(mapa[chave]);
  }

  (lista || []).forEach(function(item) {
    const d = parseDataCampo(item.dataAtendimento || item.dataEquipe || item.dataHoraUltimaAcao || item.dataHora || item.data);
    if (!d) return;
    const dLimpa = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (dLimpa.getTime() < inicio.getTime()) return;
    const chave = chaveDataCampo(dLimpa);
    if (mapa[chave]) mapa[chave].valor += 1;
  });

  return serie;
}

function parseDataCampo(valor) {
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  if (typeof valor === 'number' && valor > 100000) {
    const dataNumero = new Date(valor);
    return isNaN(dataNumero.getTime()) ? null : dataNumero;
  }

  const s = String(valor || '').trim();
  if (!s || s === 'Atual' || s === '-') return null;

  const primeiraParte = s.split(' ')[0];
  if (primeiraParte.indexOf('/') > -1) {
    const partes = primeiraParte.split('/');
    if (partes.length >= 3) {
      let dia = Number(partes[0]);
      let mes = Number(partes[1]);
      let ano = Number(partes[2]);
      if (ano < 100) ano += 2000;
      const d = new Date(ano, mes - 1, dia);
      return isNaN(d.getTime()) ? null : d;
    }
  }

  if (primeiraParte.indexOf('-') > -1) {
    const partesIso = primeiraParte.split('-');
    if (partesIso.length >= 3 && partesIso[0].length === 4) {
      const d = new Date(Number(partesIso[0]), Number(partesIso[1]) - 1, Number(partesIso[2]));
      return isNaN(d.getTime()) ? null : d;
    }
  }

  const dataNativa = new Date(s);
  return isNaN(dataNativa.getTime()) ? null : dataNativa;
}

function chaveDataCampo(data) {
  return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
}

function labelDataCampo(data) {
  return String(data.getDate()).padStart(2, '0') + '/' + String(data.getMonth() + 1).padStart(2, '0');
}

function renderGraficoBarrasHorizCampo(titulo, dados, subtitulo, unidade, opcoes) {
  const cfg = opcoes || {};
  const decimais = Number(cfg.decimais || 0);
  const entradas = Object.entries(dados || {})
    .filter(function(item) { return Number(item[1] || 0) > 0; })
    .sort(function(a, b) { return Number(b[1] || 0) - Number(a[1] || 0); })
    .slice(0, Number(cfg.limite || 10));

  const max = entradas.reduce(function(m, item) { return Math.max(m, Number(item[1] || 0)); }, 1);

  return `
    <div class="panel campo-chart-panel campo-hbar-panel">
      <div class="panel-head campo-chart-head">
        <div>
          <h6 class="panel-title mb-0"><i class="bi bi-bar-chart-steps"></i>${escapeHtml(titulo)}</h6>
          <p class="campo-chart-subtitle mb-0">${escapeHtml(subtitulo || '')}</p>
        </div>
        <span class="campo-chart-periodo">Top ${escapeHtml(entradas.length || 0)}</span>
      </div>
      <div class="campo-hbar-body">
        ${entradas.length ? entradas.map(function(item, idx) {
          const label = String(item[0] || 'Sem informação');
          const valor = Number(item[1] || 0);
          const largura = Math.max(6, Math.round((valor / max) * 100));
          const valorFormatado = decimais > 0 ? valor.toFixed(decimais).replace('.', ',') : String(Math.round(valor));
          return `<div class="campo-hbar-row" title="${escapeHtml(label)}: ${escapeHtml(valorFormatado)} ${escapeHtml(unidade || '')}">
            <div class="campo-hbar-label"><span>${escapeHtml(idx + 1)}</span>${escapeHtml(label)}</div>
            <div class="campo-hbar-track"><div class="campo-hbar-fill" style="width:${largura}%;"></div></div>
            <div class="campo-hbar-value">${escapeHtml(valorFormatado)} <small>${escapeHtml(unidade || '')}</small></div>
          </div>`;
        }).join('') : '<div class="empty-state compact"><h6>Nenhum dado para este gráfico.</h6></div>'}
      </div>
    </div>`;
}

function calcularDiasEmCampoPorUnidade(chamados) {
  const hoje = new Date();
  const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return (chamados || []).reduce(function(acc, item) {
    const unidade = String(item.unidade || 'Unidade não informada').trim() || 'Unidade não informada';
    const dataInicio = parseDataCampo(item.dataHoraEncaminhamento || item.dataHoraEntradaFila || item.dataHoraUltimaAcao || item.dataHora || item.data);
    if (!dataInicio) return acc;
    const inicioLimpo = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
    const dias = Math.max(1, Math.floor((hojeLimpo.getTime() - inicioLimpo.getTime()) / 86400000) + 1);
    acc[unidade] = Math.max(Number(acc[unidade] || 0), dias);
    return acc;
  }, {});
}

function calcularOsPrazoCampo(chamados) {
  const hoje = new Date();
  const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const resultado = { 'No prazo': 0, 'Vencidas': 0, 'Sem previsão': 0 };

  (chamados || []).forEach(function(item) {
    const st = normalizarSituacaoSistema(item.situacao || item.status);
    if (!['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'].includes(st)) return;
    const previsao = parseDataCampo(item.dataPrevistaConclusao || item.previsaoConclusao || item.dataPrevisao);
    if (!previsao) {
      resultado['Sem previsão'] += 1;
      return;
    }
    const previsaoLimpa = new Date(previsao.getFullYear(), previsao.getMonth(), previsao.getDate());
    if (previsaoLimpa.getTime() < hojeLimpo.getTime()) resultado['Vencidas'] += 1;
    else resultado['No prazo'] += 1;
  });

  return resultado;
}

function calcularPendenciasTipoCampo(chamados) {
  const hoje = new Date();
  const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const resultado = {
    'Sem equipe hoje': 0,
    'OS sem número': 0,
    'Previsão vencida': 0,
    'Sem previsão': 0,
    'Sem observação hoje': 0
  };

  (chamados || []).forEach(function(item) {
    const st = normalizarSituacaoSistema(item.situacao || item.status);
    if (!item.temEquipeDiaValida) resultado['Sem equipe hoje'] += 1;
    if (st === 'OS emitida' && !String(item.numeroOs || '').trim()) resultado['OS sem número'] += 1;

    const previsao = parseDataCampo(item.dataPrevistaConclusao || item.previsaoConclusao || item.dataPrevisao);
    if (!previsao) resultado['Sem previsão'] += 1;
    else {
      const previsaoLimpa = new Date(previsao.getFullYear(), previsao.getMonth(), previsao.getDate());
      if (previsaoLimpa.getTime() < hojeLimpo.getTime()) resultado['Previsão vencida'] += 1;
    }

    if (item.temEquipeDiaValida && !String(item.observacoes || '').trim()) resultado['Sem observação hoje'] += 1;
  });

  Object.keys(resultado).forEach(function(chave) {
    if (!resultado[chave]) delete resultado[chave];
  });
  return resultado;
}

function calcularTempoMedioCampoPorEquipe(chamados) {
  const hoje = new Date();
  const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const acumulado = {};

  (chamados || []).forEach(function(item) {
    const equipe = String(item.equipe || '').trim();
    if (!equipe) return;
    const dataInicio = parseDataCampo(item.dataHoraEncaminhamento || item.dataHoraEntradaFila || item.dataHoraUltimaAcao || item.dataHora || item.data);
    if (!dataInicio) return;
    const inicioLimpo = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), dataInicio.getDate());
    const dias = Math.max(1, Math.floor((hojeLimpo.getTime() - inicioLimpo.getTime()) / 86400000) + 1);
    if (!acumulado[equipe]) acumulado[equipe] = { soma: 0, qtd: 0 };
    acumulado[equipe].soma += dias;
    acumulado[equipe].qtd += 1;
  });

  return Object.keys(acumulado).reduce(function(acc, equipe) {
    acc[equipe] = acumulado[equipe].qtd ? (acumulado[equipe].soma / acumulado[equipe].qtd) : 0;
    return acc;
  }, {});
}

function renderGraficoBarrasCampo(titulo, dados, cor) {
  const entradas = Object.entries(dados || {}).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 12);
  const serie = entradas.map(function(item) { return { label: item[0], valor: item[1] }; });
  return renderGraficoBarrasDataCampo(titulo, serie, '');
}

function agruparContagem(lista, fn) {
  return (lista || []).reduce(function(acc, item) {
    const chave = fn(item) || 'Sem informação';
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});
}

function normalizarDataCurtaCampo(valor) {
  const s = String(valor || '').trim();
  if (!s) return 'Sem data';
  const br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (br) return br[1].padStart(2, '0') + '/' + br[2].padStart(2, '0');
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[3] + '/' + iso[2];
  return s.substring(0, 10);
}

function setContadorCampo(n) {
  const c = document.getElementById('contadorCampo');
  if (c) c.innerText = Number(n || 0) + ' registro' + (Number(n || 0) === 1 ? '' : 's');
}

function campoSafeDomId(valor) {
  return String(valor || '').split('').map(function(ch) {
    const code = ch.charCodeAt(0);
    const ok = (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122) || ch === '_' || ch === '-';
    return ok ? ch : '_';
  }).join('') || 'sem_id';
}

function resumirTextoCampo(valor, limite) {
  const texto = String(valor || '').replace(/\s+/g, ' ').trim();
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite - 1).trim() + '…';
}

window.renderizarCampo = renderizarCampo;
window.loadCampoTab = loadCampoTab;
window.filtrarCampo = filtrarCampo;
window.limparFiltrosCampo = limparFiltrosCampo;
window.filtrarCampoKpi = filtrarCampoKpi;
window.salvarEquipeDiaCampoFront = salvarEquipeDiaCampoFront;