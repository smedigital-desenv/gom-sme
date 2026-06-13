window.relatoriosCharts = window.relatoriosCharts || {};
window.relatoriosTabAtual = window.relatoriosTabAtual || 'visao';

function inicializarRelatorios(forcar) {
  const painel = document.getElementById('relatoriosKpis');
  if (painel) painel.innerHTML = '<div class="empty-state relatorios-loading"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold">Carregando relatórios...</p></div>';

  function carregarObrasDepois() {
    if (!window.obrasCarregadas || forcar) {
      carregarObras({
        renderizar: false,
        forcar: Boolean(forcar),
        callback: function() { renderRelatorios(); }
      });
    } else {
      renderRelatorios();
    }
  }

  if (!window.dadosCarregados || forcar) {
    carregarChamados({
      renderizar: false,
      forcar: Boolean(forcar),
      callback: function() { carregarObrasDepois(); }
    });
  } else {
    carregarObrasDepois();
  }
}

function setRelatorioTab(tab, botao) {
  window.relatoriosTabAtual = tab || 'visao';
  document.querySelectorAll('.relatorio-tab').forEach(function(btn) { btn.classList.remove('active'); });
  if (botao) botao.classList.add('active');
  else {
    const btnAuto = document.querySelector('[data-rel-tab="' + window.relatoriosTabAtual + '"]');
    if (btnAuto) btnAuto.classList.add('active');
  }

  document.querySelectorAll('.relatorio-tab-pane').forEach(function(pane) { pane.classList.remove('active'); });
  const alvo = document.getElementById('relatorioTab' + capitalizarRelatorio(window.relatoriosTabAtual));
  if (alvo) alvo.classList.add('active');

  if (window.relatoriosTabAtual === 'graficos') {
    setTimeout(function() { renderRelatoriosGraficos(); }, 80);
  }
}

function capitalizarRelatorio(valor) {
  valor = String(valor || '');
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function renderRelatorios() {
  if (window.telaAtual !== 'relatorios') return;

  const chamados = filtrarRelatoriosChamados(window.listaChamadosGlobal || []);
  const obras = filtrarRelatoriosObras(window.listaObrasGlobal || []);
  window.relatoriosListaAtual = chamados.slice();
  window.relatoriosObrasAtual = obras.slice();

  popularFiltrosRelatorios(window.listaChamadosGlobal || []);
  renderRelatoriosKpis(chamados, obras);
  renderRelatorioStatusBars(chamados);
  renderRelatorioFunil(chamados);
  renderRelatorioRankingUnidades(chamados);
  renderRelatorioTempoEtapa(chamados);
  renderRelatorioOrcamentosMes(chamados);
  renderRelatorioFinalizadosMes(chamados);
  renderRelatorioTipos(chamados);
  renderRelatorioObrasStatus(obras);
  setRelatorioTab(window.relatoriosTabAtual || 'visao');
}

function renderRelatoriosGraficos() {
  const chamados = window.relatoriosListaAtual || [];
  const obras = window.relatoriosObrasAtual || [];

  const fallback = document.getElementById('relatoriosChartFallback');
  if (typeof Chart === 'undefined') {
    if (fallback) fallback.innerHTML = '<div class="alert alert-warning fw-bold mb-0"><i class="bi bi-exclamation-triangle me-1"></i>Não foi possível carregar a biblioteca de gráficos. A visão em barras/tabelas continua disponível nas outras abas.</div>';
    return;
  }
  if (fallback) fallback.innerHTML = '';

  const statusMap = contarPorRelatorio(chamados, c => normalizarSituacaoSistema(c.situacao || c.status));
  const tiposMap = contarPorRelatorio(chamados, c => String(c.tipo || 'Sem tipo').trim());
  const topUnidadesMap = contarPorRelatorio(chamados, c => String(c.unidade || 'Unidade não informada').trim());
  const orcamentosMap = agruparOrcamentosPorMesRelatorio(chamados);
  const finalizadosMap = agruparFinalizadosPorMesRelatorio(chamados);
  const obrasMap = contarPorRelatorio(obras, c => String(c.status || c.situacao || 'Sem status').trim());

  criarGraficoRelatorio('chartStatusChamados', 'doughnut', statusMap, {
    label: 'Chamados',
    coresPorChave: getCorStatus,
    legenda: true
  });

  criarGraficoRelatorio('chartTiposChamados', 'doughnut', limitarMapaRelatorio(tiposMap, 8), {
    label: 'Tipos',
    paleta: paletaRelatorios(),
    legenda: true
  });

  criarGraficoRelatorio('chartTopUnidades', 'bar', limitarMapaRelatorio(topUnidadesMap, 10), {
    label: 'Chamados',
    horizontal: true,
    paleta: ['#002b5e']
  });

  criarGraficoRelatorio('chartOrcamentosMes', 'bar', ordenarMapaMesRelatorio(orcamentosMap, 8), {
    label: 'Orçamentos',
    paleta: ['#fb923c']
  });

  criarGraficoRelatorio('chartFinalizadosMes', 'line', ordenarMapaMesRelatorio(finalizadosMap, 8), {
    label: 'Finalizações',
    paleta: ['#22c55e']
  });

  criarGraficoRelatorio('chartObrasStatus', 'bar', limitarMapaRelatorio(obrasMap, 10), {
    label: 'Obras',
    horizontal: true,
    coresPorChave: corObraRelatorio
  });
}

function criarGraficoRelatorio(canvasId, tipo, mapa, opcoes) {
  opcoes = opcoes || {};
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  const ctx = canvas.getContext('2d');
  if (window.relatoriosCharts[canvasId]) {
    try { window.relatoriosCharts[canvasId].destroy(); } catch(e) {}
  }

  const labels = Object.keys(mapa || {});
  const valores = labels.map(k => Number(mapa[k] || 0));
  const labelsFormatadas = labels.map(k => /^\d{4}-\d{2}$/.test(k) ? formatarMesRelatorio(k) : k);

  if (!labels.length) {
    const box = canvas.closest('.chart-shell');
    if (box) box.classList.add('chart-empty');
    return;
  } else {
    const box = canvas.closest('.chart-shell');
    if (box) box.classList.remove('chart-empty');
  }

  const cores = labels.map(function(k, idx) {
    if (typeof opcoes.coresPorChave === 'function') return opcoes.coresPorChave(k);
    const paleta = opcoes.paleta || paletaRelatorios();
    return paleta[idx % paleta.length];
  });

  const chartType = tipo === 'bar' && opcoes.horizontal ? 'bar' : tipo;
  const config = {
    type: chartType,
    data: {
      labels: labelsFormatadas,
      datasets: [{
        label: opcoes.label || 'Total',
        data: valores,
        backgroundColor: tipo === 'line' ? 'rgba(34, 197, 94, .14)' : cores,
        borderColor: tipo === 'line' ? (opcoes.paleta && opcoes.paleta[0] || '#22c55e') : cores,
        borderWidth: tipo === 'line' ? 3 : 1.5,
        tension: .36,
        fill: tipo === 'line',
        pointRadius: tipo === 'line' ? 4 : 0,
        pointHoverRadius: tipo === 'line' ? 6 : 0,
        borderRadius: tipo === 'bar' ? 10 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: opcoes.horizontal ? 'y' : 'x',
      plugins: {
        legend: {
          display: Boolean(opcoes.legenda),
          position: 'bottom',
          labels: {
            usePointStyle: true,
            boxWidth: 9,
            font: { weight: '700' }
          }
        },
        tooltip: {
          backgroundColor: '#0f172a',
          titleFont: { weight: '800' },
          bodyFont: { weight: '700' },
          padding: 10
        }
      },
      scales: tipo === 'doughnut' ? {} : {
        x: {
          beginAtZero: true,
          grid: { color: 'rgba(148,163,184,.22)' },
          ticks: { font: { weight: '700' } }
        },
        y: {
          beginAtZero: true,
          grid: { display: !opcoes.horizontal, color: 'rgba(148,163,184,.18)' },
          ticks: { font: { weight: '700' } }
        }
      }
    }
  };

  window.relatoriosCharts[canvasId] = new Chart(ctx, config);
}

function paletaRelatorios() {
  return ['#002b5e', '#00e5ff', '#f59e0b', '#22c55e', '#fb923c', '#14b8a6', '#6366f1', '#ec4899', '#84cc16', '#475569'];
}

function filtrarRelatoriosChamados(lista) {
  const termo = normalizarTextoBase(document.getElementById('relatorioBusca') ? document.getElementById('relatorioBusca').value : '');
  const mes = document.getElementById('relatorioMes') ? document.getElementById('relatorioMes').value : '';
  const status = document.getElementById('relatorioStatus') ? document.getElementById('relatorioStatus').value : '';
  const tipo = document.getElementById('relatorioTipo') ? document.getElementById('relatorioTipo').value : '';

  return (lista || []).filter(function(item) {
    const st = normalizarSituacaoSistema(item.situacao || item.status);
    if (status && st !== status) return false;
    if (tipo && String(item.tipo || '') !== tipo) return false;

    if (mes) {
      const dt = parseDataRelatorio(item.dataHora || item.data || item.dataRaw || item.dataConclusaoOs || item.dataConclusao || item.dataHoraUltimaAcao);
      if (!dt || getAnoMesRelatorio(dt) !== mes) return false;
    }

    if (!termo) return true;
    const texto = normalizarTextoBase([
      item.id, item.unidade, item.numeroOs, item.tipo, st, item.detalhamento,
      item.observacoes, item.equipe, item.valorOrcamento
    ].join(' '));
    return texto.includes(termo);
  });
}

function filtrarRelatoriosObras(lista) {
  const termo = normalizarTextoBase(document.getElementById('relatorioBusca') ? document.getElementById('relatorioBusca').value : '');
  if (!termo) return Array.isArray(lista) ? lista : [];
  return (lista || []).filter(function(item) {
    const texto = normalizarTextoBase([
      item.id, item.unidade, item.escola, item.status, item.situacao, item.tipo,
      item.descricao, item.detalhamento, item.responsavel
    ].join(' '));
    return texto.includes(termo);
  });
}

function popularFiltrosRelatorios(lista) {
  preencherSelectRelatorio('relatorioStatus', coletarValoresRelatorio(lista, function(item) {
    return normalizarSituacaoSistema(item.situacao || item.status);
  }), 'Todos os status');

  preencherSelectRelatorio('relatorioTipo', coletarValoresRelatorio(lista, function(item) {
    return String(item.tipo || '').trim();
  }), 'Todos os tipos');

  preencherSelectRelatorio('relatorioMes', coletarMesesRelatorio(lista), 'Todos os meses', formatarMesRelatorio);
}

function preencherSelectRelatorio(id, valores, labelTodos, formatador) {
  const el = document.getElementById(id);
  if (!el) return;
  const atual = el.value || '';
  el.innerHTML = '<option value="">' + escapeHtml(labelTodos || 'Todos') + '</option>' +
    (valores || []).map(function(v) {
      return '<option value="' + escapeHtml(v) + '">' + escapeHtml(formatador ? formatador(v) : v) + '</option>';
    }).join('');
  if (atual && valores.indexOf(atual) >= 0) el.value = atual;
}

function coletarValoresRelatorio(lista, getter) {
  const mapa = {};
  (lista || []).forEach(function(item) {
    const v = getter(item);
    if (v) mapa[v] = true;
  });
  return Object.keys(mapa).sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
}

function coletarMesesRelatorio(lista) {
  const mapa = {};
  (lista || []).forEach(function(item) {
    const d = parseDataRelatorio(item.dataHora || item.data || item.dataRaw || item.dataConclusaoOs || item.dataConclusao || item.dataHoraUltimaAcao);
    if (d) mapa[getAnoMesRelatorio(d)] = true;
  });
  return Object.keys(mapa).sort().reverse();
}

function renderRelatoriosKpis(chamados, obras) {
  const box = document.getElementById('relatoriosKpis');
  if (!box) return;

  const ativos = (chamados || []).filter(function(c) {
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    return ['Em análise','Aguardando visita','Solicitado Orçamento','Orçamento Realizado','OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço','Serviço Realizado'].indexOf(st) >= 0;
  });

  const concluidos = (chamados || []).filter(function(c) {
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    return ['Concluído','A cargo da unidade escolar','Devolvido para a escola','Duplicado','Encaminhado para outra gerência ou Unidade escolar.'].indexOf(st) >= 0;
  });

  const comOs = (chamados || []).filter(c => String(c.numeroOs || '').trim()).length;
  const comOrcamento = (chamados || []).filter(c => String(c.valorOrcamento || '').trim()).length;
  const tempoMedio = calcularTempoMedioRelatorio(chamados);

  const cards = [
    { label: 'Chamados filtrados', valor: chamados.length, desc: 'Registros dentro dos filtros atuais', icon: 'bi-collection', cor: 'var(--primary)' },
    { label: 'Ativos no fluxo', valor: ativos.length, desc: 'Ainda em acompanhamento operacional', icon: 'bi-activity', cor: 'var(--orcamento)' },
    { label: 'Encerrados', valor: concluidos.length, desc: 'Memorial e saídas finais', icon: 'bi-check2-circle', cor: 'var(--concluido)' },
    { label: 'Com OS', valor: comOs, desc: 'Registros com número de ordem', icon: 'bi-file-earmark-check', cor: 'var(--os)' },
    { label: 'Com orçamento', valor: comOrcamento, desc: 'Registros com valor informado', icon: 'bi-cash-coin', cor: 'var(--orcamento-realizado)' },
    { label: 'Tempo médio', valor: tempoMedio, desc: 'Abertura até conclusão/última ação', icon: 'bi-stopwatch', cor: 'var(--visita)' },
    { label: 'Obras', valor: obras.length, desc: 'Obras cadastradas filtradas', icon: 'bi-buildings', cor: 'var(--obras)' },
    { label: 'Alertas atuais', valor: typeof calcularAlertasSistema === 'function' ? calcularAlertasSistema().length : '-', desc: 'Radar operacional integrado', icon: 'bi-exclamation-triangle', cor: 'var(--emergencial)' }
  ];

  box.innerHTML = cards.map(function(c) {
    return '<div class="relatorio-kpi" style="--rel-color:' + c.cor + ';">' +
      '<span class="relatorio-kpi-icon"><i class="bi ' + c.icon + '"></i></span>' +
      '<span class="relatorio-kpi-label">' + escapeHtml(c.label) + '</span>' +
      '<strong>' + escapeHtml(c.valor) + '</strong>' +
      '<small>' + escapeHtml(c.desc) + '</small>' +
    '</div>';
  }).join('');
}

function renderRelatorioStatusBars(chamados) {
  const ordem = ['Em análise','Aguardando visita','Solicitado Orçamento','Orçamento Realizado','OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço','Serviço Realizado','Concluído','Devolvido para a escola','A cargo da unidade escolar','Duplicado'];
  renderBarrasRelatorio('relatorioStatusBars', contarPorRelatorio(chamados, c => normalizarSituacaoSistema(c.situacao || c.status)), ordem, getCorStatus);
}

function renderRelatorioFunil(chamados) {
  const etapas = [
    ['Em análise', 'Triagem'],
    ['Aguardando visita', 'Visita'],
    ['Solicitado Orçamento', 'Orçamento'],
    ['Orçamento Realizado', 'Aprovação'],
    ['OS emitida', 'OS'],
    ['Serviço Realizado', 'Validação'],
    ['Concluído', 'Concluído']
  ];
  const cont = contarPorRelatorio(chamados, c => normalizarSituacaoSistema(c.situacao || c.status));
  const total = Math.max(1, Math.max.apply(null, etapas.map(e => cont[e[0]] || 0)));
  const html = etapas.map(function(e) {
    const valor = cont[e[0]] || 0;
    const largura = Math.max(9, Math.round((valor / total) * 100));
    return '<div class="relatorio-funnel-row" style="--funnel-color:' + getCorStatus(e[0]) + '; --funnel-width:' + largura + '%;">' +
      '<span>' + escapeHtml(e[1]) + '</span><strong>' + valor + '</strong><div><em></em></div>' +
    '</div>';
  }).join('');
  const box = document.getElementById('relatorioFunil');
  if (box) box.innerHTML = html || vazioRelatorio('Sem dados para o funil.');
}

function renderRelatorioRankingUnidades(chamados) {
  const mapa = contarPorRelatorio(chamados, c => String(c.unidade || 'Unidade não informada').trim());
  renderRankingRelatorio('relatorioRankingUnidades', mapa, 8);
}

function renderRelatorioTempoEtapa(chamados) {
  const grupos = {};
  (chamados || []).forEach(function(c) {
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    const dias = calcularDiasRelatorio(c);
    if (dias == null) return;
    if (!grupos[st]) grupos[st] = [];
    grupos[st].push(dias);
  });
  const medias = {};
  Object.keys(grupos).forEach(function(k) {
    const arr = grupos[k];
    medias[k] = Math.round(arr.reduce((a,b) => a + b, 0) / arr.length);
  });
  renderRankingRelatorio('relatorioTempoEtapa', medias, 8, function(v) { return v + 'd'; });
}

function agruparOrcamentosPorMesRelatorio(chamados) {
  const filtrados = (chamados || []).filter(c => String(c.valorOrcamento || '').trim());
  return contarPorRelatorio(filtrados, c => {
    const d = parseDataRelatorio(c.dataHoraUltimaAcao || c.dataHoraEncaminhamento || c.dataHora || c.data);
    return d ? getAnoMesRelatorio(d) : 'Sem data';
  });
}

function agruparFinalizadosPorMesRelatorio(chamados) {
  const filtrados = (chamados || []).filter(c => ['Concluído','Serviço Realizado'].indexOf(normalizarSituacaoSistema(c.situacao || c.status)) >= 0);
  return contarPorRelatorio(filtrados, c => {
    const d = parseDataRelatorio(c.dataConclusaoOs || c.dataConclusao || c.dataHoraUltimaAcao || c.dataHora || c.data);
    return d ? getAnoMesRelatorio(d) : 'Sem data';
  });
}

function renderRelatorioOrcamentosMes(chamados) {
  const mapa = agruparOrcamentosPorMesRelatorio(chamados);
  renderBarrasRelatorio('relatorioOrcamentosMes', mapa, Object.keys(mapa).sort().slice(-8), () => 'var(--orcamento)');
}

function renderRelatorioFinalizadosMes(chamados) {
  const mapa = agruparFinalizadosPorMesRelatorio(chamados);
  renderBarrasRelatorio('relatorioFinalizadosMes', mapa, Object.keys(mapa).sort().slice(-8), () => 'var(--concluido)');
}

function renderRelatorioTipos(chamados) {
  const mapa = contarPorRelatorio(chamados, c => String(c.tipo || 'Sem tipo').trim());
  renderBarrasRelatorio('relatorioTipos', mapa, Object.keys(mapa).sort((a,b) => mapa[b]-mapa[a]).slice(0, 8), () => 'var(--primary)');
}

function renderRelatorioObrasStatus(obras) {
  const mapa = contarPorRelatorio(obras, c => String(c.status || c.situacao || 'Sem status').trim());
  renderBarrasRelatorio('relatorioObrasStatus', mapa, Object.keys(mapa).sort((a,b) => mapa[b]-mapa[a]).slice(0, 8), corObraRelatorio);
}

function renderBarrasRelatorio(id, mapa, ordem, corFn) {
  const box = document.getElementById(id);
  if (!box) return;
  const chaves = (ordem || Object.keys(mapa)).filter(k => mapa[k]);
  if (!chaves.length) {
    box.innerHTML = vazioRelatorio('Sem dados para exibir.');
    return;
  }
  const max = Math.max(1, Math.max.apply(null, chaves.map(k => mapa[k] || 0)));
  box.innerHTML = chaves.map(function(k) {
    const valor = mapa[k] || 0;
    const largura = Math.max(4, Math.round((valor / max) * 100));
    const label = /^\d{4}-\d{2}$/.test(k) ? formatarMesRelatorio(k) : k;
    return '<div class="relatorio-bar-row">' +
      '<div class="relatorio-bar-label" title="' + escapeHtml(label) + '"><span style="background:' + corFn(k) + ';"></span>' + escapeHtml(label) + '</div>' +
      '<div class="relatorio-bar-track"><em style="width:' + largura + '%; background:' + corFn(k) + ';"></em></div>' +
      '<strong>' + escapeHtml(valor) + '</strong>' +
    '</div>';
  }).join('');
}

function renderRankingRelatorio(id, mapa, limite, formatadorValor) {
  const box = document.getElementById(id);
  if (!box) return;
  const linhas = Object.keys(mapa || {}).map(k => ({ label: k, valor: mapa[k] }))
    .sort((a,b) => Number(b.valor) - Number(a.valor) || a.label.localeCompare(b.label, 'pt-BR'))
    .slice(0, limite || 8);
  if (!linhas.length) {
    box.innerHTML = vazioRelatorio('Sem dados para exibir.');
    return;
  }
  box.innerHTML = linhas.map(function(r, idx) {
    return '<div class="relatorio-rank-row"><span>' + (idx + 1) + '</span><strong title="' + escapeHtml(r.label) + '">' + escapeHtml(r.label) + '</strong><em>' + escapeHtml(formatadorValor ? formatadorValor(r.valor) : r.valor) + '</em></div>';
  }).join('');
}

function contarPorRelatorio(lista, getter) {
  const mapa = {};
  (lista || []).forEach(function(item) {
    const k = getter(item) || 'Sem informação';
    mapa[k] = (mapa[k] || 0) + 1;
  });
  return mapa;
}

function limitarMapaRelatorio(mapa, limite) {
  const saida = {};
  Object.keys(mapa || {})
    .sort((a,b) => Number(mapa[b]) - Number(mapa[a]) || a.localeCompare(b, 'pt-BR'))
    .slice(0, limite || 10)
    .forEach(k => saida[k] = mapa[k]);
  return saida;
}

function ordenarMapaMesRelatorio(mapa, limite) {
  const saida = {};
  Object.keys(mapa || {}).sort().slice(-(limite || 8)).forEach(k => saida[k] = mapa[k]);
  return saida;
}

function calcularTempoMedioRelatorio(chamados) {
  const arr = (chamados || []).map(calcularDiasRelatorio).filter(v => v !== null && !isNaN(v));
  if (!arr.length) return '-';
  const media = Math.round(arr.reduce((a,b) => a + b, 0) / arr.length);
  if (media === 0) return 'Mesmo dia';
  return media + 'd';
}

function calcularDiasRelatorio(item) {
  const ini = parseDataRelatorio(item.dataHora || item.data || item.dataRaw);
  const fim = parseDataRelatorio(item.dataConclusaoOs || item.dataConclusao || item.dataHoraUltimaAcao || item.dataHoraEncaminhamento || item.dataHora || item.data);
  if (!ini || !fim) return null;
  return Math.max(0, Math.round((fim.getTime() - ini.getTime()) / 86400000));
}

function parseDataRelatorio(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  if (typeof valor === 'number' && !isNaN(valor)) return new Date(valor);
  const s = String(valor || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const p = s.slice(0, 10).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  if (typeof parseDataHoraBR === 'function') {
    const ts = parseDataHoraBR(s);
    if (ts) return new Date(ts);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function getAnoMesRelatorio(data) {
  return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
}

function formatarMesRelatorio(valor) {
  const p = String(valor || '').split('-');
  if (p.length !== 2) return valor;
  const data = new Date(Number(p[0]), Number(p[1]) - 1, 1);
  return data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
}

function corObraRelatorio(status) {
  const s = normalizarTextoBase(status);
  if (s.includes('conclu')) return 'var(--obra-concluida)';
  if (s.includes('exec')) return 'var(--obra-execucao)';
  if (s.includes('licit')) return 'var(--obra-licitacao)';
  if (s.includes('projeto')) return 'var(--obra-projeto)';
  if (s.includes('susp')) return 'var(--obra-suspensa)';
  return 'var(--obras)';
}

function vazioRelatorio(msg) {
  return '<div class="relatorio-empty">' + escapeHtml(msg || 'Sem dados.') + '</div>';
}

function limparFiltrosRelatorios() {
  ['relatorioBusca','relatorioMes','relatorioStatus','relatorioTipo'].forEach(function(id) {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  renderRelatorios();
}

function exportarRelatoriosCsv(botao) {
  const lista = window.relatoriosListaAtual || [];
  if (!lista.length) {
    alert('Não há registros filtrados para exportar.');
    return;
  }
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Exportando...');

  const linhas = [['ID','Unidade','Tipo','Status','Nº OS','Data','Valor orçamento','Equipe','Descrição','Observações']];
  lista.forEach(function(item) {
    linhas.push([
      item.id || '',
      item.unidade || '',
      item.tipo || '',
      normalizarSituacaoSistema(item.situacao || item.status),
      item.numeroOs || '',
      item.dataHora || item.data || '',
      item.valorOrcamento || '',
      item.equipe || '',
      item.detalhamento || '',
      item.observacoes || ''
    ]);
  });

  const csv = linhas.map(l => l.map(csvEscapeRelatorio).join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorios_gom_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Exportado');
}

function csvEscapeRelatorio(valor) {
  return '"' + String(valor == null ? '' : valor).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
}

window.inicializarRelatorios = inicializarRelatorios;
window.renderRelatorios = renderRelatorios;
window.renderRelatoriosGraficos = renderRelatoriosGraficos;
window.setRelatorioTab = setRelatorioTab;
window.limparFiltrosRelatorios = limparFiltrosRelatorios;
window.exportarRelatoriosCsv = exportarRelatoriosCsv;