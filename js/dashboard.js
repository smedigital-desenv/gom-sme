function renderDashboard() {
  const resumo = document.getElementById('dashboardResumo');
  const painel = document.getElementById('painelDados');
  if (!resumo) return;

  if (!window.dadosCarregados) {
    resumo.innerHTML = '<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold">Carregando dashboard...</p></div>';
    if (painel) painel.innerHTML = '';
    return;
  }

  const chamados = Array.isArray(window.listaChamadosGlobal) ? window.listaChamadosGlobal : [];
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  const porStatus = contarPorStatusDashboard(chamados);
  const campoAtivos = chamados.filter(c => ['OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço'].includes(normalizarSituacaoSistema(c.situacao || c.status)));
  const osEmitidas = chamados.filter(c => normalizarSituacaoSistema(c.situacao || c.status) === 'OS emitida');
  const osSemNumero = osEmitidas.filter(c => !String(c.numeroOs || '').trim());
  const campoHoje = campoAtivos.filter(c => !!c.temEquipeDiaValida);
  const atrasos = calcularAtrasosDashboardIntegrado(chamados);
  const finalizadosMes = chamados.filter(c => {
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    if (st !== 'Concluído' && st !== 'Serviço Realizado') return false;
    const d = parseDataDashboard(c.dataConclusaoOs || c.dataConclusao || c.dataHoraUltimaAcao || c.dataHora || c.data);
    return d && d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });

  const cards = [
    { titulo: 'Chamados novos', valor: porStatus['Em análise'] || 0, desc: 'Em análise sem interação', icon: 'bi-funnel', cor: 'var(--analise)', acao: "irDashboardPara('triagem','Em análise')" },
    { titulo: 'Aguardando visita', valor: porStatus['Aguardando visita'] || 0, desc: 'Na fila de visita', icon: 'bi-hourglass-split', cor: 'var(--visita)', acao: "irDashboardPara('fila','Aguardando visita')" },
    { titulo: 'Orçamentos pendentes', valor: porStatus['Solicitado Orçamento'] || 0, desc: 'Solicitados à empresa', icon: 'bi-cash-coin', cor: 'var(--orcamento)', acao: "irDashboardPara('empresa','Solicitado Orçamento','orcamentos')" },
    { titulo: 'Aprovações pendentes', valor: porStatus['Orçamento Realizado'] || 0, desc: 'Aguardando decisão', icon: 'bi-clipboard2-check', cor: 'var(--orcamento-realizado)', acao: "irDashboardPara('aprovacao','Orçamento Realizado')" },
    { titulo: 'OS emitidas', valor: osEmitidas.length, desc: osSemNumero.length + ' sem número', icon: 'bi-file-earmark-check', cor: 'var(--os)', acao: "irDashboardPara('empresa',null,'gerencial')" },
    { titulo: 'Campo hoje', valor: campoHoje.length + '/' + campoAtivos.length, desc: 'Com equipe registrada', icon: 'bi-geo-alt', cor: 'var(--servico-realizado)', acao: "loadPage('campo')" },
    { titulo: 'Radar de alertas', valor: atrasos.length, desc: 'SLA, prazo ou pendência', icon: 'bi-exclamation-triangle', cor: 'var(--emergencial)', acao: "loadPage('alertas')" },
    { titulo: 'Finalizados no mês', valor: finalizadosMes.length, desc: 'Produtividade mensal', icon: 'bi-check-circle', cor: 'var(--concluido)', acao: "loadPage('historico')" }
  ];

  resumo.innerHTML = cards.map(renderDashboardKpi).join('');
  renderDashboardStatusBars(chamados, porStatus);
  renderDashboardPendencias(chamados, atrasos, osSemNumero);
  renderDashboardRankingUnidades(chamados);
  renderDashboardProdutividade(finalizadosMes, chamados);
  if (painel) painel.innerHTML = '';
}

function renderDashboardKpi(card) {
  return '<button type="button" class="dashboard-kpi" style="--dash-color:' + card.cor + ';" onclick="' + card.acao + '">' +
    '<span class="dashboard-kpi-icon"><i class="bi ' + card.icon + '"></i></span>' +
    '<span class="dashboard-kpi-label">' + escapeHtml(card.titulo) + '</span>' +
    '<strong>' + escapeHtml(card.valor) + '</strong>' +
    '<small>' + escapeHtml(card.desc) + '</small>' +
  '</button>';
}

function contarPorStatusDashboard(chamados) {
  const cont = {};
  (chamados || []).forEach(c => {
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    cont[st] = (cont[st] || 0) + 1;
  });
  return cont;
}

function renderDashboardStatusBars(chamados, porStatus) {
  const box = document.getElementById('dashboardStatusBars');
  if (!box) return;
  const ordem = ['Em análise','Aguardando visita','Solicitado Orçamento','Orçamento Realizado','OS emitida','Atendimento Emergencial','Garantia de Obra','Serviço Realizado','Concluído'];
  const total = Math.max(1, (chamados || []).length);
  const linhas = ordem.filter(st => (porStatus[st] || 0) > 0).map(st => {
    const valor = porStatus[st] || 0;
    const perc = Math.max(4, Math.round((valor / total) * 100));
    return '<div class="dashboard-bar-row" onclick="irDashboardStatus(\'' + escapeJsAttr(st) + '\')">' +
      '<div class="dashboard-bar-label"><span class="status-dot" style="background:' + getCorStatus(st) + ';"></span>' + escapeHtml(st) + '</div>' +
      '<div class="dashboard-bar-track"><span style="width:' + perc + '%; background:' + getCorStatus(st) + ';"></span></div>' +
      '<strong>' + valor + '</strong>' +
    '</div>';
  }).join('');
  box.innerHTML = linhas || '<div class="empty-state compact"><h5>Nenhum chamado para exibir.</h5></div>';
}

function renderDashboardPendencias(chamados, atrasos, osSemNumero) {
  const box = document.getElementById('dashboardPendencias');
  if (!box) return;
  const pendencias = [];
  (osSemNumero || []).slice(0, 4).forEach(c => pendencias.push({ tipo: 'OS sem número', item: c, cor: 'var(--orcamento)' }));
  (atrasos || []).slice(0, 6).forEach(c => pendencias.push({ tipo: c.motivoAtraso || 'Atraso operacional', item: c, cor: 'var(--emergencial)' }));

  if (!pendencias.length) {
    box.innerHTML = '<div class="empty-state compact"><h5>Nenhuma pendência crítica no momento.</h5><p>Os principais gargalos aparecerão aqui automaticamente.</p></div>';
    return;
  }

  box.innerHTML = pendencias.slice(0, 8).map(p => {
    const c = p.item;
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    return '<div class="dashboard-pendencia" style="--pend-color:' + p.cor + ';" onclick="abrirModalAnalise(\'' + escapeJsAttr(c.id) + '\')">' +
      '<div><strong>' + escapeHtml(p.tipo) + '</strong><span>#' + escapeHtml(c.id || '-') + ' · ' + escapeHtml(c.unidade || 'Unidade não informada') + '</span></div>' +
      '<em>' + escapeHtml(st) + '</em>' +
    '</div>';
  }).join('');
}

function renderDashboardRankingUnidades(chamados) {
  const box = document.getElementById('dashboardRankingUnidades');
  if (!box) return;
  const statusAtivos = ['Em análise','Aguardando visita','Solicitado Orçamento','Orçamento Realizado','OS emitida','Atendimento Emergencial','Garantia de Obra','Serviço Realizado'];
  const mapa = {};
  (chamados || []).forEach(c => {
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    if (!statusAtivos.includes(st)) return;
    const unidade = String(c.unidade || 'Unidade não informada').trim();
    mapa[unidade] = (mapa[unidade] || 0) + 1;
  });
  const ranking = Object.keys(mapa).map(k => ({ unidade: k, total: mapa[k] })).sort((a,b) => b.total - a.total || a.unidade.localeCompare(b.unidade, 'pt-BR')).slice(0, 6);
  box.innerHTML = ranking.length ? ranking.map((r, idx) => '<div class="dashboard-rank-row"><span>' + (idx + 1) + '</span><strong>' + escapeHtml(r.unidade) + '</strong><em>' + r.total + '</em></div>').join('') : '<div class="empty-state compact"><h5>Sem ranking no momento.</h5></div>';
}

function renderDashboardProdutividade(finalizadosMes, chamados) {
  const box = document.getElementById('dashboardProdutividade');
  if (!box) return;
  const servRealizado = (chamados || []).filter(c => normalizarSituacaoSistema(c.situacao || c.status) === 'Serviço Realizado').length;
  const concluidos = (chamados || []).filter(c => normalizarSituacaoSistema(c.situacao || c.status) === 'Concluído').length;
  box.innerHTML = '<div class="dashboard-prod-main"><strong>' + finalizadosMes.length + '</strong><span>finalizados neste mês</span></div>' +
    '<div class="dashboard-prod-grid"><div><strong>' + servRealizado + '</strong><span>serviços realizados</span></div><div><strong>' + concluidos + '</strong><span>concluídos</span></div></div>';
}


function calcularAtrasosDashboardIntegrado(chamados) {
  if (typeof window.calcularAlertasSistema === 'function') {
    try {
      const alertas = window.calcularAlertasSistema() || [];
      return alertas.map(function(a) {
        const item = Object.assign({}, a.item || {});
        item.motivoAtraso = a.titulo || 'Alerta operacional';
        item.alertaSeveridade = a.severidade || 'media';
        item.alertaGrupo = a.grupo || '';
        item.alertaTipo = a.tipo || '';
        return item;
      }).filter(function(item) { return item && item.id; });
    } catch (erro) {
      console.warn('[GOM DASHBOARD] Falha ao usar radar de alertas; usando cálculo local.', erro);
    }
  }
  return calcularAtrasosDashboard(chamados);
}


function calcularAtrasosDashboard(chamados) {
  const hoje = inicioDiaDashboard(new Date());
  const campoStatus = ['OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço'];
  return (chamados || []).filter(c => {
    const st = normalizarSituacaoSistema(c.situacao || c.status);
    const previsao = parseDataDashboard(c.dataPrevistaConclusao || c.dataPrevistaConclusaoRaw);
    const ultima = parseDataDashboard(c.dataHoraUltimaAcao || c.dataHoraEncaminhamento || c.dataHora || c.data);

    if (campoStatus.includes(st) && !previsao) {
      c.motivoAtraso = 'Sem previsão de conclusão';
      return true;
    }
    if (previsao && inicioDiaDashboard(previsao).getTime() < hoje.getTime() && st !== 'Serviço Realizado' && st !== 'Concluído') {
      c.motivoAtraso = 'Previsão vencida';
      return true;
    }
    if (ultima) {
      const dias = Math.floor((hoje.getTime() - inicioDiaDashboard(ultima).getTime()) / 86400000);
      if (st === 'Em análise' && dias >= 3) { c.motivoAtraso = 'Em análise há muitos dias'; return true; }
      if (st === 'Aguardando visita' && dias >= 3) { c.motivoAtraso = 'Visita atrasada'; return true; }
      if (st === 'Solicitado Orçamento' && dias >= 5) { c.motivoAtraso = 'Orçamento sem retorno'; return true; }
      if (st === 'Orçamento Realizado' && dias >= 2) { c.motivoAtraso = 'Aprovação parada'; return true; }
      if (st === 'Serviço Realizado' && dias >= 2) { c.motivoAtraso = 'Aguardando finalização'; return true; }
    }
    return false;
  });
}

function parseDataDashboard(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  if (typeof valor === 'number' && !isNaN(valor)) return new Date(valor);
  const s = String(valor || '').trim();
  if (!s) return null;
  if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') {
    const p = s.slice(0, 10).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  const br = parseDataHoraBR(s);
  if (br) return new Date(br);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function inicioDiaDashboard(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function irDashboardPara(tela, filtro, modoEmpresa) {
  if (modoEmpresa) window.empresaModoAtual = modoEmpresa;
  loadPage(tela);
  setTimeout(function() {
    if (filtro) {
      window.statusFiltroClicado = filtro;
      if (typeof statusFiltroClicado !== 'undefined') statusFiltroClicado = filtro;
      if (typeof renderizarTela === 'function') renderizarTela();
    }
  }, 50);
}

function irDashboardStatus(status) {
  const st = normalizarSituacaoSistema(status);
  if (st === 'Em análise') return irDashboardPara('triagem', st);
  if (st === 'Aguardando visita') return irDashboardPara('fila', st);
  if (st === 'Solicitado Orçamento') return irDashboardPara('empresa', st, 'orcamentos');
  if (st === 'Orçamento Realizado') return irDashboardPara('aprovacao', st);
  if (['OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço','Serviço Realizado'].includes(st)) return irDashboardPara('empresa', null, 'gerencial');
  return loadPage('historico');
}

function refreshDashboard() {
  if (typeof refreshChamados === 'function') refreshChamados(function() { renderDashboard(); });
  else renderDashboard();
}

window.renderDashboard = renderDashboard;
window.refreshDashboard = refreshDashboard;
window.irDashboardPara = irDashboardPara;
window.irDashboardStatus = irDashboardStatus;