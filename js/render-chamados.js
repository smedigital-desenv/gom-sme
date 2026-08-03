function renderizarTela() {
  if (telaAtual === 'dashboard') return (typeof renderDashboard === 'function' ? renderDashboard() : null);
  if (telaAtual === 'cadastro' || telaAtual === 'configuracoes') return;
  if (telaAtual === 'campo') return renderizarCampo();
  if (telaAtual === 'alertas') return (typeof renderizarAlertas === 'function' ? renderizarAlertas() : null);
  if (telaAtual === 'obras') return renderizarObras();

  const painel = document.getElementById('painelDados');
  if (!painel) return;

  if (!dadosCarregados) {
    painel.innerHTML = '<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold">Carregando chamados...</p></div>';
    return;
  }

  let listaTela = filtrarTelaChamados(listaChamadosGlobal);
  if (telaAtual === 'fila') {
    listaTela = (listaTela || []).filter(item => ['Aguardando visita', 'Visita agendada'].includes(normalizarSituacaoSistema(item.situacao || item.status)));
  }
  listaTela = ordenarChamados(listaTela);
  renderizarKPIsChamados(listaTela);

  const modoEmpresaAtual = window.empresaModoAtual || 'diario';
  const termo = (telaAtual === 'empresa' && (modoEmpresaAtual === 'gerencial' || modoEmpresaAtual === 'equipes')) ? '' : termoPesquisa();
  let listaRender = listaTela.filter(item => {
    const texto = normalizarTextoBase(`${item.id} ${item.unidade} ${item.detalhamento} ${item.situacao} ${item.status} ${item.observacoes} ${item.valorOrcamento} ${item.equipe} ${item.numeroOs} ${item.tipo} ${gomNomeEvento_(item.evento)}`);
    if (!texto.includes(termo)) return false;
    if (!statusFiltroClicado) return true;
    if (statusFiltroClicado === 'Entrada hoje') return ehMesmoDia(parseDataOrdenacao(item), new Date());
    if (statusFiltroClicado === 'A revisar')    return deveRevisarFila(item);
    return normalizarSituacaoSistema(item.situacao || item.status) === statusFiltroClicado;
  });

  const contador = document.getElementById('contador');
  if (contador) {
    if (telaAtual === 'fila') contador.innerText = `${listaRender.length} na fila`;
    else if (telaAtual === 'aprovacao') contador.innerText = `${listaRender.length} orçamento${listaRender.length === 1 ? '' : 's'}`;
    else contador.innerText = `${listaRender.length} Resultados`;
  }

  if (telaAtual === 'empresa') {
    painel.innerHTML = (typeof renderEmpresaView === 'function'
      ? renderEmpresaView(listaRender)
      : (typeof renderEmpresaViewFallback === 'function' ? renderEmpresaViewFallback(listaRender) : '<div class="empty-state"><h5>Módulo Empresa não carregado.</h5></div>'));
    return;
  }

  if (telaAtual === 'aprovacao') {
    painel.innerHTML = renderAprovacaoView(listaRender, listaChamadosGlobal || []);
    return;
  }

  if (telaAtual === 'historico') {
    painel.innerHTML = renderMemorialView(listaTela);
    return;
  }

  if (!listaRender.length) {
    painel.innerHTML = '<div class="empty-state"><h5>Nenhum registro encontrado para os filtros atuais.</h5></div>';
    return;
  }

  if (telaAtual === 'fila') painel.innerHTML = listaRender.map((item, idx) => renderCardFila(item, idx)).join('');
  else painel.innerHTML = listaRender.map((item) => renderCardChamado(item)).join('');
}

function filtrarTelaChamados(lista) {
  const statusTriagemSet = new Set(STATUS_TRIAGEM);
  const statusFilaSet = new Set(STATUS_FILA);
  const statusAprovacaoSet = new Set(STATUS_APROVACAO);
  const statusMemorialSet = new Set(STATUS_MEMORIAL);

  const getStatusEmpresaPorModo = function() {
    const modo = window.empresaModoAtual || 'diario';
    if (modo === 'orcamentos') return window.STATUS_EMPRESA_ORCAMENTO || ['Solicitado Orçamento'];
    if (modo === 'gerencial') return window.STATUS_EMPRESA_GERENCIAL || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
    if (modo === 'equipes') return [];
    return window.STATUS_EMPRESA_DIARIO || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
  };

  return (lista || []).filter(item => {
    const st = normalizarSituacaoSistema(item.situacao || item.status || item['Situação'] || item['Status']);
    item.situacao = st;
    if (telaAtual === 'fila') return statusFilaSet.has(st);
    if (telaAtual === 'empresa') {
      const modo = window.empresaModoAtual || 'diario';
      if (modo === 'equipes') return true;
      return new Set(getStatusEmpresaPorModo()).has(st);
    }
    if (telaAtual === 'aprovacao') return statusAprovacaoSet.has(st);
    if (telaAtual === 'historico') return statusMemorialSet.has(st);
    if (telaAtual === 'triagem') return statusTriagemSet.has(st);
    return true;
  });
}

function ordenarChamados(lista) {
  return [...(lista || [])].sort((a, b) => parseDataOrdenacao(a) - parseDataOrdenacao(b) || Number(a.id || 0) - Number(b.id || 0));
}

function renderizarKPIsChamados(listaTela) {
  const grid = document.getElementById('kpiGrid');
  if (!grid) return;

  const cont = {};
  (listaTela || []).forEach(i => {
    const st = normalizarSituacaoSistema(i.situacao || i.status);
    cont[st] = (cont[st] || 0) + 1;
  });

  let html = '';

  if (telaAtual === 'fila') {
    if (statusFiltroClicado && ['Aguardando visita', 'Visita agendada'].indexOf(statusFiltroClicado) === -1) {
      statusFiltroClicado = window.statusFiltroClicado = null;
    }
    const aguardandoVisita = cont['Aguardando visita'] || 0;
    const visitaAgendada = cont['Visita agendada'] || 0;
    html += montarKpiCard('Aguardando visita', 'Aguardando visita', aguardandoVisita, getCorStatus('Aguardando visita'), statusFiltroClicado === 'Aguardando visita', 'Chamados que saíram da triagem e ainda aguardam definição de visita.', true);
    html += montarKpiCard('Visita agendada', 'Visita agendada', visitaAgendada, getCorStatus('Visita agendada'), statusFiltroClicado === 'Visita agendada', 'Chamados com equipe da Secretaria e data de visita definidas.', true);
    grid.innerHTML = html;
    return;
  }

  let statuses = [];
  let tituloTotal = 'Todos na tela';

  if (telaAtual === 'triagem') statuses = STATUS_TRIAGEM;
  if (telaAtual === 'empresa') {
    const modoEmpresa = window.empresaModoAtual || 'diario';
    if (modoEmpresa === 'equipes') {
      grid.innerHTML = '';
      return;
    }
    if (modoEmpresa === 'orcamentos') {
      statuses = window.STATUS_EMPRESA_ORCAMENTO || ['Solicitado Orçamento'];
      tituloTotal = 'Orçamentos';
    } else if (modoEmpresa === 'gerencial') {
      statuses = window.STATUS_EMPRESA_GERENCIAL || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
      tituloTotal = 'OS em acompanhamento';
    } else {
      statuses = window.STATUS_EMPRESA_DIARIO || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
      tituloTotal = 'Execução diária';
    }
  }
  if (telaAtual === 'aprovacao') statuses = STATUS_APROVACAO;
  if (telaAtual === 'historico') statuses = STATUS_MEMORIAL;

  html += montarKpiCard(null, tituloTotal, listaTela.length, 'var(--primary)', statusFiltroClicado === null, 'Total de registros desta visão', false);

  statuses.forEach(st => {
    const valor = cont[st] || 0;
    if (valor > 0) html += montarKpiCard(st, st, valor, getCorStatus(st), statusFiltroClicado === st, 'Filtrar por ' + st);
  });

  grid.innerHTML = html;
}

function renderCardChamado(item) {
  const st = normalizarSituacaoSistema(item.situacao || item.status);
  const classe = getClasseStatus(st);
  const corStatus = getCorStatus(st);
  const idSeguro = escapeHtml(item.id);
  const tipo = escapeHtml(item.tipo || 'Sem tipo');
  const unidade = escapeHtml(item.unidade || 'Unidade não informada');
  const detalhamento = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  const observacoes = escapeHtml(item.observacoes || item.observacaoAntiga || 'Sem observações registradas.');
  const dataEntrada = escapeHtml(item.dataHora || item.data || 'Sem data');
  const valorOrcamento = item.valorOrcamento ? `<div class="card-money"><i class="bi bi-cash-coin"></i> Orçamento: ${escapeHtml(item.valorOrcamento)}</div>` : '';
  const iconeAnexo = temAnexo(item) ? '<span class="card-anexo-icon" title="Chamado com anexo"><i class="bi bi-paperclip"></i></span>' : '';
  const miniaturasAnexos = typeof renderMiniaturasAnexosChamado === 'function' ? renderMiniaturasAnexosChamado(item, 4) : '';
  const labelSituacao = telaAtual === 'historico' ? 'Status final' : 'Situação atual';
  const marcaEvento = (typeof gomRenderBadgeEvento_ === 'function' && item.evento) ? `<div class="card-evento-row">${gomRenderBadgeEvento_(item.evento)}</div>` : '';

  return `
    <div class="card-admin ${classe}" style="--card-accent: ${corStatus};" onclick="abrirModalAnalise('${idSeguro}')">
      <div class="card-topline">
        <span class="card-kind"><span class="card-dot"></span>${tipo}</span>
        <span class="card-id">#${escapeHtml(item.id || '-')}${iconeAnexo}</span>
      </div>
      ${marcaEvento}
      <div class="card-title-wrap">
        <span class="card-icon"><i class="bi bi-building"></i></span>
        <div>
          <div class="card-label">Unidade escolar</div>
          <div class="card-unit">${unidade}</div>
          <div class="card-subline"><i class="bi bi-calendar3"></i> ${dataEntrada}</div>
        </div>
      </div>
      <div class="card-detail">${detalhamento}</div>
      <div class="card-observacao"><strong>Observações:</strong> ${observacoes}</div>
      ${miniaturasAnexos}
      ${valorOrcamento}
      <div class="card-footer-row">
        <span class="card-footer-label">${labelSituacao}</span>
        <span class="status-pill"><span class="status-dot"></span>${escapeHtml(st || 'Sem status')}</span>
      </div>
    </div>`;
}

function renderCardFila(item, index) {
  const timestamp = parseDataOrdenacao(item);
  const st = normalizarSituacaoSistema(item.situacao || item.status);
  const classe = getClasseStatus(st);
  const corStatus = getCorStatus(st);
  const idSeguro = escapeHtml(item.id);
  const tipo = escapeHtml(item.tipo || 'Sem tipo');
  const unidade = escapeHtml(item.unidade || 'Unidade não informada');
  const detalhamento = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  const observacoes = escapeHtml(item.observacoes || item.observacaoAntiga || 'Sem observações registradas.');
  const entrada = escapeHtml(item.dataHoraEntradaFila || item.dataEntradaFila || item.dataHora || item.data || 'Sem data informada');
  const tempoFila = escapeHtml(formatarTempoFila(timestamp));
  const precisaRevisao = deveRevisarFila(item);
  const avisoEntrada = precisaRevisao
    ? '<span class="fila-warning-badge" title="Verifique a data/hora de entrada em atendimento."><i class="bi bi-exclamation-triangle-fill"></i> Revisar entrada</span>'
    : '<span class="fila-order-badge"><i class="bi bi-sort-down"></i> Ordem de entrada</span>';
  const posicao = String(index + 1).padStart(2, '0');
  const iconeAnexo = temAnexo(item) ? ' · Anexo' : '';
  const miniaturasAnexos = typeof renderMiniaturasAnexosChamado === 'function' ? renderMiniaturasAnexosChamado(item, 4) : '';
  const marcaEvento = (typeof gomRenderBadgeEvento_ === 'function' && item.evento) ? `<div class="card-evento-row">${gomRenderBadgeEvento_(item.evento)}</div>` : '';

  return `
    <div class="card-admin fila-card ${classe}" style="--card-accent: ${corStatus};" onclick="abrirModalAnalise('${idSeguro}')">
      <div class="card-topline">
        <span class="fila-rank-badge" title="Posição atual na fila">${posicao}</span>
        ${avisoEntrada}
      </div>
      ${marcaEvento}
      <div class="card-title-wrap">
        <span class="card-icon"><i class="bi bi-building"></i></span>
        <div>
          <div class="card-label">Unidade escolar</div>
          <div class="card-unit">${unidade}</div>
        </div>
      </div>
      <div class="fila-meta-grid">
        <div class="fila-meta-item"><span class="fila-meta-label">Entrada na fila</span><span class="fila-meta-value">${entrada}</span></div>
        <div class="fila-meta-item"><span class="fila-meta-label">Tempo na fila</span><span class="fila-meta-value">${tempoFila}</span></div>
      </div>
      <div class="card-detail">${detalhamento}</div>
      <div class="card-observacao"><strong>Observações:</strong> ${observacoes}</div>
      ${miniaturasAnexos}
      <div class="card-footer-row">
        <span class="card-footer-label">#${escapeHtml(item.id || '-')} · ${tipo}${iconeAnexo}</span>
        <span class="status-pill"><span class="status-dot"></span>${escapeHtml(st)}</span>
      </div>
    </div>`;
}



/* ==========================================================
   Memorial / Prontuário do Chamado - v11
   ========================================================== */
function renderMemorialView(lista) {
  const base = Array.isArray(lista) ? lista : [];
  popularFiltrosMemorial(base);

  const filtrados = aplicarFiltrosMemorial(base);
  const contador = document.getElementById('contador');
  if (contador) contador.innerText = filtrados.length + ' registro' + (filtrados.length === 1 ? '' : 's');

  window.memorialListaAtual = filtrados.slice();

  if (!filtrados.length) {
    return '<div class="empty-state memorial-empty"><i class="bi bi-archive display-5 d-block mb-3 text-muted"></i><h5>Nenhum registro encontrado no memorial.</h5><p>Ajuste os filtros ou limpe a busca para visualizar chamados encerrados.</p></div>';
  }

  const resumo = renderMemorialResumo(filtrados);
  return [
    resumo,
    '<div class="memorial-lista">',
      '<div class="memorial-lista-head">',
        '<div>Unidade / chamado</div>',
        '<div>Status / OS</div>',
        '<div>Datas e tempo</div>',
        '<div>Anexos</div>',
        '<div>Ações</div>',
      '</div>',
      filtrados.map(renderLinhaMemorial).join(''),
    '</div>'
  ].join('');
}

function aplicarFiltrosMemorial(lista) {
  const termo = termoPesquisa();
  const mes = document.getElementById('memorialMes') ? document.getElementById('memorialMes').value : '';
  const status = document.getElementById('memorialStatus') ? document.getElementById('memorialStatus').value : '';
  const tipo = document.getElementById('memorialTipo') ? document.getElementById('memorialTipo').value : '';
  const evento = document.getElementById('memorialEvento') ? document.getElementById('memorialEvento').value : '';

  return (lista || []).filter(function(item) {
    const st = normalizarSituacaoSistema(item.situacao || item.status);
    if (statusFiltroClicado && st !== statusFiltroClicado) return false;
    if (status && st !== status) return false;

    if (tipo && String(item.tipo || '') !== tipo) return false;

    if (evento && String(item.evento || '') !== evento) return false;

    if (mes) {
      const dt = getDataFechamentoMemorial(item) || getDataAberturaMemorial(item);
      if (!dt || getAnoMesMemorial(dt) !== mes) return false;
    }

    if (!termo) return true;
    const texto = normalizarTextoBase([
      item.id, item.unidade, item.detalhamento, item.situacao, item.status,
      item.numeroOs, item.tipo, item.equipe, item.valorOrcamento, item.observacoes,
      item.dataHora, item.data, item.dataHoraUltimaAcao, item.dataConclusaoOs, item.dataConclusao,
      gomNomeEvento_(item.evento)
    ].join(' '));
    return texto.includes(termo);
  });
}

// Resolve o id de um evento para o seu nome legível (ou '' se não houver).
function gomNomeEvento_(idEvento) {
  if (!idEvento) return '';
  const ev = (typeof window.gomEventoPorId === 'function') ? window.gomEventoPorId(idEvento) : null;
  return ev ? (ev.nome || ev.id || '') : String(idEvento);
}

function popularFiltrosMemorial(lista) {
  preencherSelectMemorial_('memorialStatus', coletarValoresMemorial(lista, function(item) {
    return normalizarSituacaoSistema(item.situacao || item.status);
  }), 'Todos os status');

  preencherSelectMemorial_('memorialTipo', coletarValoresMemorial(lista, function(item) {
    return String(item.tipo || '').trim();
  }), 'Todos os tipos');

  // Filtro por evento: valor = id do evento, rótulo = nome legível.
  preencherSelectMemorial_('memorialEvento', coletarValoresMemorial(lista, function(item) {
    return String(item.evento || '').trim();
  }), 'Todos os eventos', gomNomeEvento_);

  preencherSelectMemorial_('memorialMes', coletarMesesMemorial(lista), 'Todos os meses', formatarMesLabelMemorial);
}

function preencherSelectMemorial_(id, valores, labelTodos, formatador) {
  const select = document.getElementById(id);
  if (!select) return;
  const atual = select.value || '';
  const opcoes = ['<option value="">' + escapeHtml(labelTodos || 'Todos') + '</option>'];
  (valores || []).forEach(function(v) {
    if (!v) return;
    opcoes.push('<option value="' + escapeHtml(v) + '">' + escapeHtml(formatador ? formatador(v) : v) + '</option>');
  });
  select.innerHTML = opcoes.join('');
  if (atual && valores.indexOf(atual) >= 0) select.value = atual;
}

function coletarValoresMemorial(lista, getter) {
  const mapa = {};
  (lista || []).forEach(function(item) {
    const valor = getter(item);
    if (valor) mapa[valor] = true;
  });
  return Object.keys(mapa).sort(function(a, b) { return a.localeCompare(b, 'pt-BR'); });
}

function coletarMesesMemorial(lista) {
  const mapa = {};
  (lista || []).forEach(function(item) {
    const dt = getDataFechamentoMemorial(item) || getDataAberturaMemorial(item);
    if (dt) mapa[getAnoMesMemorial(dt)] = true;
  });
  return Object.keys(mapa).sort().reverse();
}

function renderMemorialResumo(lista) {
  const total = lista.length;
  const comOs = lista.filter(function(i) { return String(i.numeroOs || '').trim(); }).length;
  const comAnexos = lista.filter(function(i) { return temAnexoCompletoMemorial(i); }).length;
  const tempoMedio = calcularTempoMedioMemorial(lista);

  return [
    '<div class="memorial-resumo-grid">',
      '<div class="memorial-resumo-card"><span>Registros filtrados</span><strong>' + total + '</strong><small>Total no prontuário</small></div>',
      '<div class="memorial-resumo-card"><span>Com número de OS</span><strong>' + comOs + '</strong><small>Rastreabilidade</small></div>',
      '<div class="memorial-resumo-card"><span>Com anexos</span><strong>' + comAnexos + '</strong><small>Solicitação, orçamento ou serviço</small></div>',
      '<div class="memorial-resumo-card"><span>Tempo médio</span><strong>' + escapeHtml(tempoMedio) + '</strong><small>Abertura até encerramento</small></div>',
    '</div>'
  ].join('');
}

function renderLinhaMemorial(item) {
  const idOriginal = String(item.id || '');
  const id = escapeHtml(idOriginal);
  const idJs = escapeJsAttr(idOriginal);
  const st = normalizarSituacaoSistema(item.situacao || item.status);
  const unidade = escapeHtml(item.unidade || 'Unidade não informada');
  const detalhe = escapeHtml(resumirTextoMemorial(item.detalhamento || 'Sem detalhamento informado.', 150));
  const tipo = escapeHtml(item.tipo || 'Sem tipo');
  const numeroOs = escapeHtml(item.numeroOs || 'Sem número');
  const dataAbertura = getDataAberturaMemorial(item);
  const dataFechamento = getDataFechamentoMemorial(item);
  const tempo = calcularTempoTotalMemorial(item);
  const anexos = getResumoAnexosMemorial(item);
  const cor = getCorStatus(st);

  return [
    '<div class="memorial-row" style="--card-accent:' + cor + ';">',
      '<div class="memorial-unidade" data-label="Unidade / chamado">',
        '<div class="memorial-idline"><span class="memorial-id">#' + id + '</span><span class="memorial-tipo">' + tipo + '</span></div>',
        '<strong>' + unidade + '</strong>',
        ((typeof gomRenderBadgeEvento_ === 'function' && item.evento) ? gomRenderBadgeEvento_(item.evento) : ''),
        '<p>' + detalhe + '</p>',
      '</div>',
      '<div class="memorial-status" data-label="Status / OS">',
        '<span class="badge-status">' + escapeHtml(st) + '</span>',
        '<div class="empresa-os-meta-line"><i class="bi bi-hash"></i><strong>OS:</strong> ' + numeroOs + '</div>',
        item.valorOrcamento ? '<div class="empresa-os-meta-line"><i class="bi bi-cash-coin"></i><strong>Orçamento:</strong> ' + escapeHtml(item.valorOrcamento) + '</div>' : '',
      '</div>',
      '<div class="memorial-datas" data-label="Datas e tempo">',
        '<div><strong>Abertura:</strong> ' + escapeHtml(formatarDataMemorial(dataAbertura)) + '</div>',
        '<div><strong>Encerramento:</strong> ' + escapeHtml(formatarDataMemorial(dataFechamento)) + '</div>',
        '<span class="memorial-tempo-pill"><i class="bi bi-stopwatch me-1"></i>' + escapeHtml(tempo) + '</span>',
      '</div>',
      '<div class="memorial-anexos" data-label="Anexos">',
        anexos.map(function(a) { return '<span class="' + a.classe + '"><i class="bi ' + a.icone + '"></i>' + escapeHtml(a.label) + '</span>'; }).join(''),
      '</div>',
      '<div class="memorial-acoes" data-label="Ações">',
        '<button class="btn btn-light border btn-sm fw-bold" onclick="abrirModalAnalise(\'' + idJs + '\')"><i class="bi bi-clock-history me-1"></i>Ver prontuário</button>',
        '<button class="btn btn-primary btn-sm fw-bold" onclick="imprimirProntuarioMemorial(\'' + idJs + '\')"><i class="bi bi-printer me-1"></i>Imprimir</button>',
        (typeof window.podeBaixarOSChamado_ === 'function' && window.podeBaixarOSChamado_(item))
          ? '<button class="btn btn-success btn-sm fw-bold" onclick="baixarOrdemServicoChamadoPorId_(\'' + idJs + '\', this)" title="Baixa a Ordem de Serviço deste chamado"><i class="bi bi-file-earmark-word me-1"></i>Baixar OS</button>'
          : '',
      '</div>',
    '</div>'
  ].join('');
}

function getResumoAnexosMemorial(item) {
  const grupos = [
    { label: 'Solicitação', valor: item.anexosSolicitacao || item.anexos, icone: 'bi-paperclip' },
    { label: 'Orçamento', valor: item.anexosOrcamento, icone: 'bi-receipt' },
    { label: 'Serviço', valor: item.anexosServico, icone: 'bi-check2-circle' }
  ];
  return grupos.map(function(g) {
    const qtd = extrairLinksAnexos(g.valor).length;
    return {
      label: qtd ? g.label + ' (' + qtd + ')' : g.label + ' (0)',
      icone: qtd ? g.icone : 'bi-dash-circle',
      classe: qtd ? 'memorial-anexo-pill ok' : 'memorial-anexo-pill vazio'
    };
  });
}

function temAnexoCompletoMemorial(item) {
  return extrairLinksAnexos(item.anexosSolicitacao || item.anexos).length > 0 ||
    extrairLinksAnexos(item.anexosOrcamento).length > 0 ||
    extrairLinksAnexos(item.anexosServico).length > 0;
}

function getDataAberturaMemorial(item) {
  return parseDataMemorial(item.dataHora || item.data || item.dataRaw || item.dataOrdenacao);
}

function getDataFechamentoMemorial(item) {
  return parseDataMemorial(item.dataConclusaoOs || item.dataConclusao || item.dataHoraUltimaAcao || item.dataHora || item.data);
}

function parseDataMemorial(valor) {
  if (!valor) return null;
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor;
  if (typeof valor === 'number' && !isNaN(valor)) return new Date(valor);
  const s = String(valor || '').trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const p = s.slice(0, 10).split('-');
    return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  const ts = typeof parseDataHoraBR === 'function' ? parseDataHoraBR(s) : null;
  if (ts) return new Date(ts);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function formatarDataMemorial(data) {
  if (!data || isNaN(data.getTime())) return '-';
  return data.toLocaleDateString('pt-BR') + ' ' + String(data.getHours()).padStart(2, '0') + ':' + String(data.getMinutes()).padStart(2, '0');
}

function getAnoMesMemorial(data) {
  return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0');
}

function formatarMesLabelMemorial(valor) {
  const partes = String(valor || '').split('-');
  if (partes.length !== 2) return valor;
  const data = new Date(Number(partes[0]), Number(partes[1]) - 1, 1);
  return data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function calcularTempoTotalMemorial(item) {
  const ini = getDataAberturaMemorial(item);
  const fim = getDataFechamentoMemorial(item);
  if (!ini || !fim || isNaN(ini.getTime()) || isNaN(fim.getTime())) return 'Sem dados';
  const dias = Math.max(0, Math.round((fim.getTime() - ini.getTime()) / 86400000));
  if (dias === 0) return 'Mesmo dia';
  if (dias === 1) return '1 dia';
  return dias + ' dias';
}

function calcularTempoMedioMemorial(lista) {
  const valores = (lista || []).map(function(item) {
    const ini = getDataAberturaMemorial(item);
    const fim = getDataFechamentoMemorial(item);
    if (!ini || !fim) return null;
    return Math.max(0, Math.round((fim.getTime() - ini.getTime()) / 86400000));
  }).filter(function(v) { return v !== null && !isNaN(v); });
  if (!valores.length) return '-';
  const media = Math.round(valores.reduce(function(a, b) { return a + b; }, 0) / valores.length);
  if (media === 0) return 'Mesmo dia';
  if (media === 1) return '1 dia';
  return media + ' dias';
}

function resumirTextoMemorial(valor, limite) {
  const texto = String(valor || '').replace(/\s+/g, ' ').trim();
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite - 1).trim() + '…';
}

function limparFiltrosMemorial() {
  const pesquisa = document.getElementById('pesquisa');
  const mes = document.getElementById('memorialMes');
  const status = document.getElementById('memorialStatus');
  const tipo = document.getElementById('memorialTipo');
  if (pesquisa) pesquisa.value = '';
  if (mes) mes.value = '';
  if (status) status.value = '';
  if (tipo) tipo.value = '';
  statusFiltroClicado = null;
  window.statusFiltroClicado = null;
  renderizarTela();
}


function getListaMemorialExportacao() {
  const lista = window.memorialListaAtual || aplicarFiltrosMemorial(filtrarTelaChamados(window.listaChamadosGlobal || []));
  return Array.isArray(lista) ? lista : [];
}

function montarLinhasMemorialExportacao(lista) {
  const linhas = [
    ['ID','Unidade','Tipo','Status final','Nº OS','Data abertura','Data encaminhamento','Data prevista','Data encerramento','Tempo total','Valor orçamento','Equipe atual','Descrição','Observações']
  ];

  (lista || []).forEach(function(item) {
    linhas.push([
      item.id || '',
      item.unidade || '',
      item.tipo || '',
      normalizarSituacaoSistema(item.situacao || item.status),
      item.numeroOs || '',
      formatarDataMemorial(getDataAberturaMemorial(item)),
      item.dataHoraEncaminhamento || item.dataEntradaFila || '',
      item.dataPrevistaConclusao || '',
      formatarDataMemorial(getDataFechamentoMemorial(item)),
      calcularTempoTotalMemorial(item),
      item.valorOrcamento || '',
      item.equipe || '',
      item.detalhamento || '',
      item.observacoes || ''
    ]);
  });

  return linhas;
}

function exportarMemorialArquivo(botao) {
  const formato = document.getElementById('memorialFormatoExportacao') ? document.getElementById('memorialFormatoExportacao').value : 'csv';
  if (formato === 'xlsx') return exportarMemorialXlsx(botao);
  return exportarMemorialCsv(botao);
}

function exportarMemorialCsv(botao) {
  const lista = getListaMemorialExportacao();
  if (!lista.length) {
    alert('Não há registros para exportar.');
    return;
  }

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Gerando CSV...');
  const linhas = montarLinhasMemorialExportacao(lista);
  const csv = linhas.map(function(l) { return l.map(csvEscapeMemorial).join(';'); }).join('\n');
  const blob = new Blob(['\\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'memorial_atendimentos_' + new Date().toISOString().slice(0,10) + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'CSV exportado');
}

function exportarMemorialXlsx(botao) {
  const lista = getListaMemorialExportacao();
  if (!lista.length) {
    alert('Não há registros para exportar.');
    return;
  }

  if (!google || !google.script || !google.script.run || typeof google.script.run.gomGerarMemorialXlsxV1Json !== 'function') {
    alert('A função de exportação XLSX ainda não está disponível no backend. Substitua também o arquivo Code.gs deste patch.');
    return;
  }

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Gerando XLSX...');
  const linhas = montarLinhasMemorialExportacao(lista);

  google.script.run
    .withSuccessHandler(function(res) {
      const payload = typeof res === 'string' ? JSON.parse(res) : res;
      if (!payload || !payload.ok) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        alert((payload && payload.erro) || 'Não foi possível gerar o XLSX.');
        return;
      }

      baixarBase64Memorial(payload.base64, payload.nome || ('memorial_atendimentos_' + new Date().toISOString().slice(0,10) + '.xlsx'), payload.mime || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'XLSX exportado');
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível gerar o XLSX.');
      else alert((err && err.message) || err);
    })
    .gomGerarMemorialXlsxV1Json({
      nome: 'memorial_atendimentos_' + new Date().toISOString().slice(0,10) + '.xlsx',
      linhas: linhas
    });
}

function baixarBase64Memorial(base64, nome, mime) {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime || 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome || 'arquivo.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscapeMemorial(valor) {
  const s = String(valor == null ? '' : valor).replace(/"/g, '""').replace(/\r?\n/g, ' ');
  return '"' + s + '"';
}

function montarEventosProntuarioMemorial(item) {
  const eventos = [];

  function add(data, titulo, detalhe) {
    eventos.push({
      data: data || '-',
      titulo: titulo || '',
      detalhe: detalhe || ''
    });
  }

  add(item.dataHora || item.data, 'Chamado criado', item.origem || item.sistema || '');
  if (item.dataHoraEntradaFila || item.dataEntradaFila) add(item.dataHoraEntradaFila || item.dataEntradaFila, 'Entrada em atendimento/fila', '');
  if (item.dataHoraEncaminhamento) add(item.dataHoraEncaminhamento, 'Encaminhado', 'Encaminhamento para atendimento/empresa.');
  if (item.valorOrcamento) add(item.dataHoraUltimaAcao || item.dataHoraEncaminhamento || '', 'Orçamento registrado', item.valorOrcamento);
  if (item.dataPrevistaConclusao) add(item.dataPrevistaConclusao, 'Previsão de conclusão', '');
  if (item.dataConclusaoOs || item.dataConclusao) add(item.dataConclusaoOs || item.dataConclusao, 'Encerramento/conclusão', normalizarSituacaoSistema(item.situacao || item.status));

  const obs = String(item.observacoes || '').split(/\n+/).map(function(l) { return l.trim(); }).filter(Boolean);
  obs.slice(-12).forEach(function(linha) {
    const match = linha.match(/^\[([^\]]+)\]\s*(.*)$/);
    if (match) add(match[1], 'Observação registrada', match[2]);
    else add('', 'Observação registrada', linha);
  });

  return eventos;
}

function renderEventosProntuarioPrint(item) {
  const eventos = montarEventosProntuarioMemorial(item);
  if (!eventos.length) return '<div class="print-empty">Sem eventos suficientes para montar linha do tempo.</div>';
  return eventos.map(function(ev) {
    return '<tr><td>' + escapeHtml(ev.data || '-') + '</td><td><strong>' + escapeHtml(ev.titulo || '') + '</strong><br><span>' + escapeHtml(ev.detalhe || '') + '</span></td></tr>';
  }).join('');
}

function renderAnexosProntuarioPrint(item) {
  const grupos = [
    { titulo: 'Solicitação', valor: item.anexosSolicitacao || item.anexos },
    { titulo: 'Orçamento', valor: item.anexosOrcamento },
    { titulo: 'Serviço realizado', valor: item.anexosServico }
  ];

  return grupos.map(function(g) {
    const anexos = extrairLinksAnexos(g.valor);
    if (!anexos.length) return '<div class="print-anexo vazio"><strong>' + escapeHtml(g.titulo) + '</strong><span>Sem anexos</span></div>';
    return '<div class="print-anexo"><strong>' + escapeHtml(g.titulo) + '</strong>' + anexos.map(function(a, i) {
      return '<a href="' + escapeHtml(a.url) + '" target="_blank">' + escapeHtml(a.nome || ('Anexo ' + (i + 1))) + '</a>';
    }).join('') + '</div>';
  }).join('');
}

function imprimirProntuarioMemorial(id) {
  const item = (window.listaChamadosGlobal || []).find(function(c) { return String(c.id) === String(id); });
  if (!item) return;

  const st = normalizarSituacaoSistema(item.situacao || item.status);
  const cor = getCorStatus(st);
  const dataImpressao = new Date().toLocaleString('pt-BR');
  const anexosPrint = renderAnexosProntuarioPrint(item);
  const eventosPrint = renderEventosProntuarioPrint(item);

  const html = [
    '<!DOCTYPE html><html><head><meta charset="utf-8"><title>Prontuário #' + escapeHtml(item.id || '') + '</title>',
    '<style>',
      '@page{size:A4;margin:14mm;}',
      '*{box-sizing:border-box;}',
      'body{font-family:Arial,Helvetica,sans-serif;color:#0f172a;margin:0;background:#f8fafc;font-size:12px;}',
      '.page{background:#fff;max-width:980px;margin:0 auto;padding:24px 28px;}',
      '.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:4px solid #002b5e;padding-bottom:14px;margin-bottom:18px;}',
      '.brand{display:flex;gap:12px;align-items:center;}',
      '.logo{width:46px;height:46px;border-radius:12px;background:#002b5e;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:900;}',
      'h1{font-size:22px;color:#002b5e;margin:0 0 4px;font-weight:900;}',
      '.subtitle{color:#64748b;font-size:12px;font-weight:bold;}',
      '.protocol{text-align:right;}',
      '.protocol strong{display:block;font-size:24px;color:#002b5e;}',
      '.status{display:inline-block;border-radius:999px;padding:6px 10px;background:' + cor + ';color:#fff;font-weight:900;margin-top:6px;}',
      '.section{border:1px solid #dbe3ef;border-radius:14px;margin:12px 0;overflow:hidden;}',
      '.section-title{background:#f1f5f9;color:#002b5e;font-weight:900;text-transform:uppercase;font-size:11px;letter-spacing:.04em;padding:9px 12px;border-bottom:1px solid #dbe3ef;}',
      '.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0;border-top:0;}',
      '.field{padding:10px 12px;border-right:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;min-height:58px;}',
      '.field:nth-child(4n){border-right:0;}',
      '.label{display:block;color:#64748b;text-transform:uppercase;font-size:10px;font-weight:900;margin-bottom:4px;}',
      '.value{font-weight:800;color:#0f172a;white-space:pre-wrap;}',
      '.text-block{padding:12px;line-height:1.45;white-space:pre-wrap;}',
      '.timeline{width:100%;border-collapse:collapse;}',
      '.timeline td{padding:9px 12px;border-bottom:1px solid #e2e8f0;vertical-align:top;}',
      '.timeline td:first-child{width:160px;color:#475569;font-weight:900;}',
      '.timeline tr:last-child td{border-bottom:0;}',
      '.timeline span{color:#475569;font-size:11px;}',
      '.anexos{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px;}',
      '.print-anexo{border:1px solid #dbe3ef;border-radius:10px;padding:10px;min-height:70px;}',
      '.print-anexo strong{display:block;color:#002b5e;margin-bottom:6px;}',
      '.print-anexo a,.print-anexo span{display:block;color:#334155;text-decoration:none;margin:3px 0;font-size:11px;}',
      '.print-anexo.vazio{background:#f8fafc;color:#64748b;}',
      '.footer{margin-top:18px;border-top:1px solid #cbd5e1;padding-top:10px;color:#64748b;font-size:10px;display:flex;justify-content:space-between;}',
      '.screen-actions{position:sticky;top:0;background:#0f172a;padding:10px;text-align:right;}',
      '.screen-actions button{background:#2563eb;color:#fff;border:0;border-radius:8px;padding:8px 14px;font-weight:bold;margin-left:8px;cursor:pointer;}',
      '@media print{body{background:#fff}.page{padding:0;max-width:none}.screen-actions{display:none}.section{break-inside:avoid}.grid{grid-template-columns:repeat(4,1fr)}.field{break-inside:avoid}}',
    '</style></head><body>',
    '<div class="screen-actions"><button onclick="window.print()">Imprimir</button><button onclick="window.close()">Fechar</button></div>',
    '<main class="page">',
      '<header class="header">',
        '<div class="brand"><div class="logo">GOM</div><div><h1>Prontuário do Chamado</h1><div class="subtitle">Secretaria Municipal de Educação · Gestão Operacional de Manutenção</div></div></div>',
        '<div class="protocol"><span class="label">Protocolo</span><strong>#' + escapeHtml(item.id || '') + '</strong><span class="status">' + escapeHtml(st) + '</span></div>',
      '</header>',

      '<section class="section"><div class="section-title">Identificação</div><div class="grid">',
        '<div class="field"><span class="label">Unidade</span><div class="value">' + escapeHtml(item.unidade || '-') + '</div></div>',
        '<div class="field"><span class="label">Tipo</span><div class="value">' + escapeHtml(item.tipo || '-') + '</div></div>',
        '<div class="field"><span class="label">Origem</span><div class="value">' + escapeHtml(item.origem || item.sistema || '-') + '</div></div>',
        '<div class="field"><span class="label">Nº OS</span><div class="value">' + escapeHtml(item.numeroOs || 'Sem número') + '</div></div>',
        '<div class="field"><span class="label">Abertura</span><div class="value">' + escapeHtml(formatarDataMemorial(getDataAberturaMemorial(item))) + '</div></div>',
        '<div class="field"><span class="label">Encaminhamento</span><div class="value">' + escapeHtml(item.dataHoraEncaminhamento || item.dataEntradaFila || '-') + '</div></div>',
        '<div class="field"><span class="label">Previsão</span><div class="value">' + escapeHtml(item.dataPrevistaConclusao || '-') + '</div></div>',
        '<div class="field"><span class="label">Conclusão</span><div class="value">' + escapeHtml(formatarDataMemorial(getDataFechamentoMemorial(item))) + '</div></div>',
        '<div class="field"><span class="label">Tempo total</span><div class="value">' + escapeHtml(calcularTempoTotalMemorial(item)) + '</div></div>',
        '<div class="field"><span class="label">Equipe atual</span><div class="value">' + escapeHtml(item.equipe || 'Sem equipe registrada') + '</div></div>',
        '<div class="field"><span class="label">Valor orçamento</span><div class="value">' + escapeHtml(item.valorOrcamento || '-') + '</div></div>',
        '<div class="field"><span class="label">Última atualização</span><div class="value">' + escapeHtml(item.dataHoraUltimaAcao || '-') + '</div></div>',
      '</div></section>',

      '<section class="section"><div class="section-title">Descrição do problema / solicitação</div><div class="text-block">' + escapeHtml(item.detalhamento || 'Sem detalhamento informado.') + '</div></section>',
      '<section class="section"><div class="section-title">Observações consolidadas</div><div class="text-block">' + escapeHtml(item.observacoes || 'Sem observações registradas.') + '</div></section>',
      '<section class="section"><div class="section-title">Linha do tempo resumida</div><table class="timeline">' + eventosPrint + '</table></section>',
      '<section class="section"><div class="section-title">Anexos vinculados</div><div class="anexos">' + anexosPrint + '</div></section>',
      '<footer class="footer"><span>Documento gerado pelo Sistema GOM/SME</span><span>Gerado em ' + escapeHtml(dataImpressao) + '</span></footer>',
    '</main>',
    '<script>setTimeout(function(){ window.print(); }, 350);<\/script>',
    '</body></html>'
  ].join('');

  const w = window.open('', '_blank');
  if (!w) {
    alert('O navegador bloqueou a janela de impressão. Libere pop-ups para este sistema.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}

window.renderMemorialView = renderMemorialView;
window.limparFiltrosMemorial = limparFiltrosMemorial;
window.exportarMemorialArquivo = exportarMemorialArquivo;
window.exportarMemorialCsv = exportarMemorialCsv;
window.exportarMemorialXlsx = exportarMemorialXlsx;
window.imprimirProntuarioMemorial = imprimirProntuarioMemorial;


function renderAprovacaoView(lista, listaGlobal) {
  const registros = Array.isArray(lista) ? lista : [];
  const baseGlobal = Array.isArray(listaGlobal) ? listaGlobal : [];
  if (!registros.length) return renderAprovacaoVazia(baseGlobal);

  return [
    '<div class="aprovacao-lista-oficial">',
      '<div class="aprovacao-lista-head">',
        '<div>Unidade / problema</div>',
        '<div>Informações para validação</div>',
        '<div>Parecer e decisão</div>',
      '</div>',
      registros.map(function(item) {
        const st = normalizarSituacaoSistema(item.situacao || item.status);
        return st === 'Serviço Realizado' ? renderLinhaAprovacaoServico(item) : renderLinhaAprovacaoOrcamento(item);
      }).join(''),
    '</div>'
  ].join('');
}

function renderAprovacaoVazia(listaGlobal) {
  const lista = Array.isArray(listaGlobal) ? listaGlobal : [];
  const orcamentosSolicitados = lista.filter(function(item) {
    return normalizarSituacaoSistema(item.situacao || item.status) === 'Solicitado Orçamento';
  });
  const emAnalise = lista.filter(function(item) {
    return normalizarSituacaoSistema(item.situacao || item.status) === 'Em análise';
  });
  const osEmitidas = lista.filter(function(item) {
    return normalizarSituacaoSistema(item.situacao || item.status) === 'OS emitida';
  });

  const exemplos = orcamentosSolicitados.slice(0, 5).map(function(item) {
    return [
      '<div class="aprovacao-preview-row">',
        '<strong>#' + escapeHtml(item.id || '-') + ' · ' + escapeHtml(item.unidade || 'Unidade não informada') + '</strong>',
        '<span>' + escapeHtml(resumirTextoAprovacao(item.detalhamento || 'Sem descrição', 110)) + '</span>',
      '</div>'
    ].join('');
  }).join('');

  return [
    '<div class="aprovacao-empty-diagnostico">',
      '<div class="aprovacao-empty-card principal">',
        '<i class="bi bi-clipboard2-check"></i>',
        '<h5>Nenhum orçamento devolvido aguardando aprovação.</h5>',
        '<p>Esta tela mostra somente chamados com status <strong>Orçamento Realizado</strong>, ou seja, orçamentos que a empresa já devolveu para decisão da GOM.</p>',
      '</div>',
      '<div class="aprovacao-empty-grid">',
        '<div class="aprovacao-empty-metric"><span>Solicitados à empresa</span><strong>' + orcamentosSolicitados.length + '</strong><small>Ainda precisam ser devolvidos em Empresa &gt; Orçamentos.</small></div>',
        '<div class="aprovacao-empty-metric"><span>Em análise</span><strong>' + emAnalise.length + '</strong><small>Ainda não foram enviados para orçamento.</small></div>',
        '<div class="aprovacao-empty-metric"><span>OS emitidas</span><strong>' + osEmitidas.length + '</strong><small>Já passaram da aprovação.</small></div>',
      '</div>',
      orcamentosSolicitados.length ? '<div class="aprovacao-preview"><div class="aprovacao-preview-head"><strong>Orçamentos que ainda estão com a empresa</strong><button class="btn btn-primary btn-sm fw-bold" onclick="abrirEmpresaOrcamentosAprovacao()"><i class="bi bi-arrow-right-circle me-1"></i>Ir para Empresa / Orçamentos</button></div>' + exemplos + '</div>' : '',
      '<div class="aprovacao-empty-help"><strong>Para testar o fluxo completo:</strong> abra <em>Empresa &gt; Orçamentos</em>, preencha valor, previsão e observação, devolva o orçamento. Depois ele aparecerá aqui para aprovar, devolver para ajuste, negar ou devolver para escola.</div>',
    '</div>'
  ].join('');
}

function abrirEmpresaOrcamentosAprovacao() {
  if (typeof loadPage !== 'function') return;
  loadPage('empresa');
  setTimeout(function() {
    const botoes = document.querySelectorAll('#empresaModoTabs .nav-link');
    let botaoOrcamento = null;
    Array.prototype.forEach.call(botoes, function(btn) {
      const texto = normalizarTextoBase(btn.textContent || '');
      if (texto.indexOf('orcamento') !== -1) botaoOrcamento = btn;
    });
    if (typeof setEmpresaModo === 'function') setEmpresaModo('orcamentos', botaoOrcamento);
  }, 80);
}


function renderLinhaAprovacaoServico(item) {
  const idOriginal = String(item.id || '');
  const id = escapeHtml(idOriginal);
  const idJs = escapeJsAttr(idOriginal);
  const unidade = escapeHtml(item.unidade || 'Unidade não informada');
  const detalheCompleto = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  const detalheCurto = escapeHtml(resumirTextoAprovacao(item.detalhamento || 'Sem detalhamento informado.', 180));
  const obsEmpresa = escapeHtml(item.observacoes || 'Sem observações registradas.');
  const dataAcao = escapeHtml(item.dataHoraUltimaAcao || item.dataHora || item.data || '-');
  const equipe = escapeHtml(item.equipe || item.equipeDia || item.equipeResponsavel || 'Equipe não informada');
  const semNumeroOs = !String(item.numeroOs || item.numero_os || '').trim();
  const numeroOs = escapeHtml(item.numeroOs || item.numero_os || 'Sem número');
  const formId = 'formValidacaoServico_' + id;
  const anexos = renderAnexosGrupo('Anexos do serviço realizado', item.anexosServico || item.anexos);
  // Atendimento Emergencial executa o serviço antes de qualquer OS, então chega
  // aqui sem número. Atalho para gerar a OS e concluir (Memorial) em um clique,
  // separado visualmente da validação normal (evita botões espremidos).
  const botaoAbrirOs = semNumeroOs ? [
    '<div class="aprovacao-abrir-os">',
      '<span class="aprovacao-abrir-os-linha"><span>ou</span></span>',
      '<button type="button" class="btn btn-warning btn-sm fw-bold aprovacao-abrir-os-btn" onclick="gomAbrirOsEnviarMemorialInline_(\'' + idJs + '\', this)" title="Gera o número da OS, baixa o documento e encaminha o chamado ao Memorial na mesma ação"><i class="bi bi-file-earmark-plus me-1"></i>Abrir OS e enviar ao Memorial</button>',
      '<small class="aprovacao-abrir-os-help">Sem número de OS (emergencial) — gera a OS, baixa o documento e conclui em uma única ação.</small>',
    '</div>'
  ].join('') : '';

  return [
    '<div class="aprovacao-row" style="--card-accent: var(--servico-realizado, #10b981);">',
      '<div class="aprovacao-unidade" data-label="Unidade / problema">',
        '<details class="empresa-expand">',
          '<summary><span class="empresa-unidade-link">' + unidade + '</span><span class="empresa-os-id">#' + id + '</span></summary>',
          '<div class="empresa-expand-body">',
            '<div class="modal-label">Descrição completa</div>',
            '<div class="card-detail mb-2">' + detalheCompleto + '</div>',
            '<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="abrirModalAnalise(\'' + idJs + '\')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir detalhes completos</button>',
          '</div>',
        '</details>',
        '<div class="empresa-os-desc">' + detalheCurto + '</div>',
      '</div>',

      '<div class="aprovacao-orcamento" data-label="Informações para validação">',
        '<div class="aprovacao-valor"><i class="bi bi-check2-circle"></i><strong>Serviço realizado</strong></div>',
        '<div class="aprovacao-meta"><i class="bi bi-hash"></i><span>OS: ' + numeroOs + '</span></div>',
        '<div class="aprovacao-meta"><i class="bi bi-people"></i><span>Equipe: ' + equipe + '</span></div>',
        '<div class="aprovacao-meta"><i class="bi bi-calendar3"></i><span>Informado em: ' + dataAcao + '</span></div>',
        '<div class="aprovacao-obs"><strong>Observações da empresa:</strong><br>' + obsEmpresa + '</div>',
        anexos || '<div class="aprovacao-anexo-vazio"><i class="bi bi-paperclip"></i> Nenhum anexo de serviço informado.</div>',
      '</div>',

      '<div class="aprovacao-decisao-col" data-label="Parecer e decisão">',
        '<form id="' + formId + '" class="aprovacao-decisao" onsubmit="salvarValidacaoServicoFront(event,\'' + idJs + '\')">',
          '<label class="empresa-field-label">Parecer interno</label>',
          '<textarea class="form-control form-control-sm" name="observacoes" rows="3" placeholder="Validação da execução, motivo de garantia ou devolução..."></textarea>',
          '<div class="aprovacao-form-grid mt-2">',
            '<div>',
              '<label class="empresa-field-label">Decisão</label>',
              '<select class="form-select form-select-sm fw-bold" name="situacao" required>',
                '<option value="">Selecione...</option>',
                '<option value="Concluído">Validar e enviar para Memorial</option>',
                '<option value="Garantia de Serviço">Garantia de Serviço</option>',
              '</select>',
            '</div>',
          '</div>',
          '<div class="aprovacao-decisao-help">Validar envia o chamado ao Memorial. Garantia de Serviço devolve à Empresa para correção, sem novo orçamento.</div>',
          '<button class="btn btn-success btn-sm fw-bold aprovacao-submit"><i class="bi bi-check2-square me-1"></i>Registrar validação</button>',
        '</form>',
        botaoAbrirOs,
      '</div>',
    '</div>'
  ].join('');
}

function salvarValidacaoServicoFront(e, id) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const form = e.target;
  const payload = formToObject(form);
  payload.id = id;
  if (!payload.situacao) {
    alert('Selecione uma decisão.');
    return;
  }
  const botao = form.querySelector('button[type="submit"], .aprovacao-submit');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Registrando validação...');
  else if (botao) botao.disabled = true;
  google.script.run
    .withSuccessHandler(function() {
      refreshChamados(function() {
        if (typeof renderizarTela === 'function') renderizarTela();
      });
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível registrar a validação.');
      else alert((err && err.message) || err);
    })
    .atualizarChamadoWorkflow(payload);
}

// Atalho do card de Aprovação (Serviço Realizado sem OS): lê o parecer já
// digitado no formulário da linha e delega ao mesmo núcleo usado pelo modal.
function gomAbrirOsEnviarMemorialInline_(id, botao) {
  const form = botao ? botao.closest('.aprovacao-row').querySelector('.aprovacao-decisao') : null;
  const obsField = form ? form.querySelector('[name="observacoes"]') : null;
  const obs = obsField ? String(obsField.value || '').trim() : '';
  if (typeof window.gomAbrirOsEnviarMemorialCore_ === 'function') {
    window.gomAbrirOsEnviarMemorialCore_(id, obs, botao);
  }
}
window.gomAbrirOsEnviarMemorialInline_ = gomAbrirOsEnviarMemorialInline_;

function renderLinhaAprovacaoOrcamento(item) {
  const idOriginal = String(item.id || '');
  const id = escapeHtml(idOriginal);
  const idJs = escapeJsAttr(idOriginal);
  const unidade = escapeHtml(item.unidade || 'Unidade não informada');
  const detalheCompleto = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  const detalheCurto = escapeHtml(resumirTextoAprovacao(item.detalhamento || 'Sem detalhamento informado.', 180));
  const obsEmpresa = escapeHtml(item.observacoes || 'Sem observações registradas.');
  const valorFmt = (typeof gomMoedaFormatar === 'function') ? gomMoedaFormatar(item.valorOrcamento) : '';
  const valor = escapeHtml(valorFmt || item.valorOrcamento || 'Valor não informado');
  const dataOrc = escapeHtml(item.dataHoraUltimaAcao || item.dataHora || item.data || '-');
  const dataPrevInput = escapeHtml(typeof formatarInputDate === 'function' ? formatarInputDate(item.dataPrevistaConclusaoRaw || item.dataPrevistaConclusao || '') : '');
  const formId = 'formAprovacao_' + id;
  const anexos = renderAnexosGrupo('Anexos do orçamento', item.anexosOrcamento);

  return [
    '<div class="aprovacao-row" style="--card-accent: var(--orcamento-realizado);">',
      '<div class="aprovacao-unidade" data-label="Unidade / problema">',
        '<details class="empresa-expand">',
          '<summary><span class="empresa-unidade-link">' + unidade + '</span><span class="empresa-os-id">#' + id + '</span></summary>',
          '<div class="empresa-expand-body">',
            '<div class="modal-label">Descrição completa</div>',
            '<div class="card-detail mb-2">' + detalheCompleto + '</div>',
            '<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="abrirModalAnalise(\'' + idJs + '\')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir detalhes completos</button>',
          '</div>',
        '</details>',
        '<div class="empresa-os-desc">' + detalheCurto + '</div>',
      '</div>',

      '<div class="aprovacao-orcamento" data-label="Orçamento da empresa">',
        '<div class="aprovacao-valor"><i class="bi bi-cash-coin"></i><strong>' + valor + '</strong></div>',
        '<div class="aprovacao-meta"><i class="bi bi-calendar3"></i><span>Devolvido em: ' + dataOrc + '</span></div>',
        '<div class="aprovacao-obs"><strong>Observações da empresa:</strong><br>' + obsEmpresa + '</div>',
        anexos || '<div class="aprovacao-anexo-vazio"><i class="bi bi-paperclip"></i> Nenhum anexo de orçamento informado.</div>',
      '</div>',

      '<form id="' + formId + '" class="aprovacao-decisao" data-label="Parecer e decisão" onsubmit="salvarDecisaoAprovacaoFront(event,\'' + idJs + '\')">',
        '<label class="empresa-field-label">Parecer interno</label>',
        '<textarea class="form-control form-control-sm" name="parecerInterno" rows="3" placeholder="Justificativa da aprovação, devolução ou reprovação..."></textarea>',

        '<div class="aprovacao-form-grid mt-2">',
          '<div>',
            '<label class="empresa-field-label">Decisão</label>',
            '<select class="form-select form-select-sm fw-bold" name="decisao" onchange="atualizarCamposAprovacao(this,\'' + idJs + '\')" required>',
              '<option value="">Selecione...</option>',
              '<option value="aprovar">Aprovar e emitir OS</option>',
              '<option value="ajuste">Devolver para ajuste</option>',
              '<option value="negar">Negar orçamento</option>',
              '<option value="devolver_escola">Devolver para escola</option>',
            '</select>',
          '</div>',
          '<div>',
            '<label class="empresa-field-label">Número da OS</label>',
            '<input class="form-control form-control-sm" name="numeroOs" id="aprovNumeroOs_' + id + '" placeholder="Gerado automaticamente pelo sistema" disabled>',
          '</div>',
          '<div>',
            '<label class="empresa-field-label">Previsão de conclusão</label>',
            '<input class="form-control form-control-sm" type="date" name="dataPrevistaConclusao" id="aprovPrevisao_' + id + '" value="' + dataPrevInput + '">',
          '</div>',
        '</div>',

        '<div class="aprovacao-decisao-help" id="aprovHelp_' + id + '">Escolha uma decisão para liberar os campos necessários.</div>',
        '<button class="btn btn-primary btn-sm fw-bold aprovacao-submit"><i class="bi bi-check2-square me-1"></i>Registrar decisão</button>',
      '</form>',
    '</div>'
  ].join('');
}

function atualizarCamposAprovacao(select, id) {
  const decisao = select ? select.value : '';
  const numeroOs = document.getElementById('aprovNumeroOs_' + id);
  const previsao = document.getElementById('aprovPrevisao_' + id);
  const help = document.getElementById('aprovHelp_' + id);

  if (numeroOs) {
    const aprovar = decisao === 'aprovar';
    numeroOs.disabled = !aprovar;
    numeroOs.required = false;
    if (!aprovar) numeroOs.value = '';
  }

  if (previsao) {
    previsao.disabled = decisao === 'ajuste' || decisao === 'negar' || decisao === 'devolver_escola';
  }

  if (help) {
    const mensagens = {
      aprovar: 'Ao aprovar, o número da OS será gerado automaticamente pelo sistema. A previsão será usada para controle de prazo.',
      ajuste: 'O orçamento volta para a empresa como Solicitado Orçamento, com o parecer interno registrado.',
      negar: 'O chamado será encaminhado ao Memorial como A cargo da unidade escolar.',
      devolver_escola: 'O chamado será devolvido para a escola e ficará no Memorial.'
    };
    help.textContent = mensagens[decisao] || 'Escolha uma decisão para liberar os campos necessários.';
  }
}

function salvarDecisaoAprovacaoFront(e, id) {
  if (e && typeof e.preventDefault === 'function') e.preventDefault();
  const form = e.target;
  const payload = formToObject(form);
  payload.id = id;

  if (!payload.decisao) {
    alert('Selecione uma decisão.');
    return;
  }

    const botao = form.querySelector('button[type="submit"], .aprovacao-submit');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Registrando decisão...');
  else if (botao) {
    botao.disabled = true;
    botao.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Salvando...';
  }

  google.script.run
    .withSuccessHandler(function() {
      refreshChamados(function() {
        if (typeof renderizarTela === 'function') renderizarTela();
      });
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) {
        botao.disabled = false;
        botao.innerHTML = '<i class="bi bi-check2-square me-1"></i>Registrar decisão';
      }
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível registrar a decisão.');
      else alert((err && err.message) || err);
    })
    .salvarDecisaoAprovacao(payload);
}

function resumirTextoAprovacao(valor, limite) {
  const texto = String(valor || '').replace(/\s+/g, ' ').trim();
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite - 1).trim() + '…';
}

window.renderAprovacaoView = renderAprovacaoView;
window.atualizarCamposAprovacao = atualizarCamposAprovacao;
window.salvarDecisaoAprovacaoFront = salvarDecisaoAprovacaoFront;
window.salvarValidacaoServicoFront = salvarValidacaoServicoFront;

window.abrirEmpresaOrcamentosAprovacao = abrirEmpresaOrcamentosAprovacao;
