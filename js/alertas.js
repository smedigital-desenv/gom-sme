(function() {
  window.alertasGlobal = Array.isArray(window.alertasGlobal) ? window.alertasGlobal : [];
  window.alertasFiltroAtual = window.alertasFiltroAtual || 'todos';
  window.alertasConfiguracoesCarregadas = Boolean(window.alertasConfiguracoesCarregadas);

  function parseJsonAlertas_(res) {
    if (!res) return { ok: false, configuracoes: [] };
    if (typeof res === 'string') {
      try { return JSON.parse(res); }
      catch(e) { return { ok: false, erro: e.message, configuracoes: [] }; }
    }
    return res;
  }

  function getConfigAlerta_(chave, padrao) {
    const lista = Array.isArray(window.configuracoesGlobal) ? window.configuracoesGlobal : [];
    const item = lista.find(cfg => String(cfg.chave || '').trim() === chave);
    const valor = item ? String(item.valor == null ? '' : item.valor).trim() : '';
    return valor || padrao;
  }

  function getConfigNumeroAlerta_(chave, padrao) {
    const valor = Number(String(getConfigAlerta_(chave, padrao)).replace(',', '.'));
    return isNaN(valor) || valor < 0 ? Number(padrao || 0) : valor;
  }

  function configAtivaAlerta_(chave, padrao) {
    const valor = normalizarTextoBase(getConfigAlerta_(chave, padrao || 'SIM'));
    return valor !== 'nao' && valor !== 'não' && valor !== 'false' && valor !== '0';
  }

  function carregarConfiguracoesParaAlertas_(callback) {
    if (window.alertasConfiguracoesCarregadas || !google || !google.script || !google.script.run) {
      if (typeof callback === 'function') callback();
      return;
    }

    google.script.run
      .withSuccessHandler(res => {
        const payload = parseJsonAlertas_(res);
        if (payload && Array.isArray(payload.configuracoes)) window.configuracoesGlobal = payload.configuracoes;
        window.alertasConfiguracoesCarregadas = true;
        if (typeof callback === 'function') callback();
      })
      .withFailureHandler(err => {
        console.warn('[GOM ALERTAS] Não foi possível carregar configurações. Usando padrões.', err);
        window.alertasConfiguracoesCarregadas = true;
        if (typeof callback === 'function') callback();
      })
      .gomListarConfiguracoesWebV1Json();
  }

  function timestampChamado_(item) {
    const candidatos = [
      item && item.dataHoraUltimaAcao,
      item && item.dataHoraEntradaFila,
      item && item.dataEntradaFila,
      item && item.dataHora,
      item && item.data,
      item && item.dataRaw
    ];
    for (const valor of candidatos) {
      if (!valor) continue;
      if (typeof valor === 'number' && !isNaN(valor)) return valor;
      const direto = parseDataHoraBR(valor);
      if (direto) return direto;
      const data = new Date(String(valor));
      if (!isNaN(data.getTime())) return data.getTime();
    }
    return null;
  }

  function timestampPrevisto_(item) {
    const candidatos = [
      item && item.dataPrevistaConclusao,
      item && item.previsaoConclusao,
      item && item.dataPrevisao,
      item && item.prazoConclusao,
      item && item.prazo
    ];
    for (const valor of candidatos) {
      if (!valor) continue;
      if (typeof valor === 'number' && !isNaN(valor)) return valor;
      const br = parseDataHoraBR(valor);
      if (br) return br;
      const data = new Date(String(valor));
      if (!isNaN(data.getTime())) return data.getTime();
    }
    return null;
  }

  function diasDesde_(timestamp) {
    if (!timestamp) return null;
    const diff = Date.now() - timestamp;
    if (diff < 0) return 0;
    return Math.floor(diff / (24 * 60 * 60 * 1000));
  }

  function formatarDataAlerta_(timestamp) {
    if (!timestamp) return 'Sem data';
    const data = new Date(timestamp);
    if (isNaN(data.getTime())) return 'Sem data';
    const dd = String(data.getDate()).padStart(2, '0');
    const mm = String(data.getMonth() + 1).padStart(2, '0');
    return dd + '/' + mm + '/' + data.getFullYear();
  }

  function criarAlerta_(dados) {
    return Object.assign({
      id: '',
      chamadoId: '',
      unidade: 'Unidade não informada',
      status: '',
      tipo: 'geral',
      grupo: 'Operacional',
      titulo: 'Alerta',
      descricao: '',
      acao: 'Verificar pendência.',
      severidade: 'media',
      cor: 'var(--orcamento)',
      icone: 'bi-exclamation-diamond-fill',
      dias: null,
      dataReferencia: '',
      item: null
    }, dados || {});
  }

  function calcularAlertas() {
    const chamados = Array.isArray(listaChamadosGlobal) ? listaChamadosGlobal : [];
    const alertas = [];

    const slaAnalise = getConfigNumeroAlerta_('SLA_ANALISE_DIAS', 3);
    const slaOrcamento = getConfigNumeroAlerta_('SLA_ORCAMENTO_DIAS', 5);
    const slaVisita = getConfigNumeroAlerta_('SLA_VISITA_DIAS', 3);
    const slaAprovacao = getConfigNumeroAlerta_('SLA_APROVACAO_DIAS', 2);
    const slaOs = getConfigNumeroAlerta_('SLA_OS_DIAS', 7);
    const slaFinalizacao = getConfigNumeroAlerta_('SLA_FINALIZACAO_DIAS', 2);

    chamados.forEach(item => {
      const st = normalizarSituacaoSistema(item.situacao || item.status);
      const id = String(item.id || '').trim();
      const unidade = item.unidade || 'Unidade não informada';
      const baseTs = timestampChamado_(item);
      const dias = diasDesde_(baseTs);
      const dataRef = formatarDataAlerta_(baseTs);
      const previsao = timestampPrevisto_(item);

      if (st === 'Em análise' && configAtivaAlerta_('ALERTA_ANALISE_PARADA_ATIVO', 'SIM') && dias !== null && dias >= slaAnalise) {
        alertas.push(criarAlerta_({
          id: 'analise-parada-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'analise-parada',
          grupo: 'Triagem',
          titulo: 'Chamado novo sem interação',
          descricao: 'O chamado está em análise há ' + dias + ' dia(s), acima do SLA configurado de ' + slaAnalise + ' dia(s).',
          acao: 'Avaliar a demanda e encaminhar para visita, orçamento, emergência ou devolução.',
          severidade: dias >= slaAnalise + 3 ? 'alta' : 'media',
          cor: 'var(--analise)',
          icone: 'bi-funnel-fill',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (st === 'OS emitida' && configAtivaAlerta_('ALERTA_OS_SEM_NUMERO_ATIVO', 'SIM') && !String(item.numeroOs || '').trim()) {
        alertas.push(criarAlerta_({
          id: 'os-sem-numero-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'os-sem-numero',
          grupo: 'OS',
          titulo: 'OS emitida sem numeração',
          descricao: 'A ordem de serviço foi liberada, mas o número da OS ainda não está preenchido.',
          acao: 'Abrir o chamado e preencher o número da OS para garantir rastreabilidade.',
          severidade: 'critica',
          cor: 'var(--emergencial)',
          icone: 'bi-file-earmark-x-fill',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (STATUS_CAMPO.includes(st) && configAtivaAlerta_('ALERTA_OS_SEM_PREVISAO_ATIVO', 'SIM') && !previsao) {
        alertas.push(criarAlerta_({
          id: 'os-sem-previsao-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'os-sem-previsao',
          grupo: 'Prazo',
          titulo: 'OS em campo sem previsão',
          descricao: 'A OS está em acompanhamento, mas não possui data prevista de conclusão.',
          acao: 'Solicitar à empresa ou registrar uma previsão para controle do prazo.',
          severidade: 'alta',
          cor: 'var(--os)',
          icone: 'bi-calendar-plus-fill',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (STATUS_CAMPO.includes(st) && configAtivaAlerta_('ALERTA_COBRANCA_CAMPO_ATIVO', 'SIM') && !item.temEquipeDiaValida) {
        alertas.push(criarAlerta_({
          id: 'sem-equipe-dia-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'sem-equipe-dia',
          grupo: 'Campo',
          titulo: 'Empresa sem equipe registrada hoje',
          descricao: 'A unidade está em atendimento, mas a equipe do dia ainda não foi informada no sistema.',
          acao: 'Cobrar o preenchimento diário da empresa ou registrar a equipe atuante.',
          severidade: 'critica',
          cor: 'var(--os)',
          icone: 'bi-people-fill',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (st === 'Solicitado Orçamento' && configAtivaAlerta_('ALERTA_ORCAMENTO_SEM_RETORNO_ATIVO', 'SIM') && dias !== null && dias >= slaOrcamento) {
        alertas.push(criarAlerta_({
          id: 'orcamento-sem-retorno-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'orcamento-sem-retorno',
          grupo: 'Orçamento',
          titulo: 'Orçamento solicitado sem retorno',
          descricao: 'O chamado está aguardando retorno da empresa além do prazo configurado de ' + slaOrcamento + ' dia(s).',
          acao: 'Verificar com a empresa o envio do orçamento ou registrar uma observação de acompanhamento.',
          severidade: dias >= slaOrcamento + 3 ? 'critica' : 'alta',
          cor: 'var(--orcamento)',
          icone: 'bi-clock-history',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (st === 'Orçamento Realizado' && configAtivaAlerta_('ALERTA_APROVACAO_PARADA_ATIVO', 'SIM') && dias !== null && dias >= slaAprovacao) {
        alertas.push(criarAlerta_({
          id: 'aprovacao-parada-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'aprovacao-parada',
          grupo: 'Aprovação',
          titulo: 'Orçamento aguardando aprovação',
          descricao: 'O orçamento já voltou da empresa e está aguardando decisão interna há ' + dias + ' dia(s).',
          acao: 'Aprovar, devolver para ajuste, negar ou registrar encaminhamento.',
          severidade: dias >= slaAprovacao + 3 ? 'critica' : 'alta',
          cor: 'var(--orcamento-realizado)',
          icone: 'bi-receipt-cutoff',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (st === 'Aguardando visita' && configAtivaAlerta_('ALERTA_VISITA_ATRASADA_ATIVO', 'SIM') && dias !== null && dias >= slaVisita) {
        alertas.push(criarAlerta_({
          id: 'visita-atrasada-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'visita-atrasada',
          grupo: 'Visita',
          titulo: 'Visita técnica aguardando há muitos dias',
          descricao: 'O chamado permanece aguardando visita acima do prazo configurado de ' + slaVisita + ' dia(s).',
          acao: 'Priorizar a visita ou encaminhar para orçamento/emergencial se a decisão já for possível.',
          severidade: dias >= slaVisita + 3 ? 'alta' : 'media',
          cor: 'var(--visita)',
          icone: 'bi-person-walking',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (st === 'Serviço Realizado' && configAtivaAlerta_('ALERTA_SERVICO_SEM_FINALIZACAO_ATIVO', 'SIM') && dias !== null && dias >= slaFinalizacao) {
        alertas.push(criarAlerta_({
          id: 'servico-sem-finalizacao-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'servico-sem-finalizacao',
          grupo: 'Finalização',
          titulo: 'Serviço realizado aguardando finalização',
          descricao: 'A empresa informou o serviço como realizado, mas a GOM ainda não finalizou o atendimento.',
          acao: 'Validar o serviço e encaminhar para o Memorial, ou devolver para nova ação.',
          severidade: dias >= slaFinalizacao + 3 ? 'alta' : 'media',
          cor: 'var(--servico-realizado)',
          icone: 'bi-clipboard2-check-fill',
          dias,
          dataReferencia: dataRef,
          item
        }));
      }

      if (previsao && STATUS_CAMPO.includes(st) && configAtivaAlerta_('ALERTA_PREVISAO_VENCIDA_ATIVO', 'SIM') && previsao < Date.now()) {
        const atraso = diasDesde_(previsao);
        alertas.push(criarAlerta_({
          id: 'previsao-vencida-' + id,
          chamadoId: id,
          unidade,
          status: st,
          tipo: 'previsao-vencida',
          grupo: 'Prazo',
          titulo: 'Previsão de conclusão vencida',
          descricao: 'A data prevista de conclusão foi ultrapassada.',
          acao: 'Atualizar a previsão, cobrar a empresa ou finalizar se o serviço já foi concluído.',
          severidade: 'critica',
          cor: 'var(--emergencial)',
          icone: 'bi-calendar-x-fill',
          dias: atraso,
          dataReferencia: formatarDataAlerta_(previsao),
          item
        }));
      }

      if (STATUS_CAMPO.includes(st) && dias !== null && dias >= slaOs && !previsao) {
        // Complemento de SLA geral de OS: só adiciona se ainda não houve alerta de ausência de previsão.
        const jaExiste = alertas.some(a => a.id === 'os-sem-previsao-' + id);
        if (!jaExiste) {
          alertas.push(criarAlerta_({
            id: 'os-sla-geral-' + id,
            chamadoId: id,
            unidade,
            status: st,
            tipo: 'os-sla-geral',
            grupo: 'OS',
            titulo: 'OS em acompanhamento acima do SLA',
            descricao: 'A OS está ativa há ' + dias + ' dia(s), acima do prazo de referência de ' + slaOs + ' dia(s).',
            acao: 'Verificar andamento, atualizar previsão e cobrar devolutiva da empresa.',
            severidade: 'alta',
            cor: 'var(--os)',
            icone: 'bi-stopwatch-fill',
            dias,
            dataReferencia: dataRef,
            item
          }));
        }
      }
    });

    return alertas.sort((a, b) => pesoSeveridade_(b.severidade) - pesoSeveridade_(a.severidade) || Number(b.dias || 0) - Number(a.dias || 0));
  }

  function pesoSeveridade_(sev) {
    if (sev === 'critica') return 3;
    if (sev === 'alta') return 2;
    if (sev === 'media') return 1;
    return 0;
  }

  function filtrarAlertas_(alertas) {
    const termoInput = document.getElementById('pesquisaAlertas');
    const termo = normalizarTextoBase(termoInput ? termoInput.value : '');
    const filtro = window.alertasFiltroAtual || 'todos';

    return (alertas || []).filter(a => {
      const porFiltro = filtro === 'todos' || a.severidade === filtro || a.grupo === filtro || a.tipo === filtro;
      const texto = normalizarTextoBase([a.titulo, a.descricao, a.acao, a.unidade, a.chamadoId, a.status, a.grupo, a.severidade].join(' '));
      return porFiltro && (!termo || texto.includes(termo));
    });
  }

  function contadorPor_(lista, fn) {
    return (lista || []).reduce((acc, item) => {
      const key = fn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }


  function renderizarResumoSlaAlertas_(alertas) {
    const box = document.getElementById('alertasSlaResumo');
    if (!box) return;

    const regras = [
      { chave: 'SLA_ANALISE_DIAS', label: 'Análise', valor: getConfigNumeroAlerta_('SLA_ANALISE_DIAS', 3), icon: 'bi-funnel-fill' },
      { chave: 'SLA_VISITA_DIAS', label: 'Visita', valor: getConfigNumeroAlerta_('SLA_VISITA_DIAS', 3), icon: 'bi-person-walking' },
      { chave: 'SLA_ORCAMENTO_DIAS', label: 'Orçamento', valor: getConfigNumeroAlerta_('SLA_ORCAMENTO_DIAS', 5), icon: 'bi-cash-coin' },
      { chave: 'SLA_APROVACAO_DIAS', label: 'Aprovação', valor: getConfigNumeroAlerta_('SLA_APROVACAO_DIAS', 2), icon: 'bi-clipboard2-check' },
      { chave: 'SLA_OS_DIAS', label: 'OS', valor: getConfigNumeroAlerta_('SLA_OS_DIAS', 7), icon: 'bi-file-earmark-check' },
      { chave: 'SLA_FINALIZACAO_DIAS', label: 'Finalização', valor: getConfigNumeroAlerta_('SLA_FINALIZACAO_DIAS', 2), icon: 'bi-check2-circle' }
    ];

    const criticos = (alertas || []).filter(a => a.severidade === 'critica').length;
    const altas = (alertas || []).filter(a => a.severidade === 'alta').length;

    box.innerHTML = [
      '<div class="alertas-sla-head">',
        '<div><strong><i class="bi bi-stopwatch me-1"></i>Controle de SLA ativo</strong><span>Prazos puxados da tela Configurações. Ajuste os dias sem alterar código.</span></div>',
        '<button class="btn btn-light border fw-bold btn-sm" onclick="loadPage(&quot;configuracoes&quot;)"><i class="bi bi-sliders me-1"></i>Ajustar SLA</button>',
      '</div>',
      '<div class="alertas-sla-grid">',
        regras.map(r => '<div class="alertas-sla-pill"><i class="bi ' + r.icon + '"></i><span>' + escapeHtml(r.label) + '</span><strong>' + escapeHtml(r.valor) + 'd</strong></div>').join(''),
      '</div>',
      '<div class="alertas-sla-foot"><span><b>' + criticos + '</b> crítico(s)</span><span><b>' + altas + '</b> alta prioridade</span><span>Use os cards abaixo para filtrar o radar.</span></div>'
    ].join('');
  }


  function renderizarKpisAlertas_(alertas) {
    const grid = document.getElementById('alertasKpis');
    if (!grid) return;

    const porGrupo = contadorPor_(alertas, a => a.grupo);
    const criticos = alertas.filter(a => a.severidade === 'critica').length;
    const altas = alertas.filter(a => a.severidade === 'alta').length;

    const cards = [
      { filtro: 'todos', titulo: 'Total de alertas', valor: alertas.length, cor: 'var(--primary)', icon: 'bi-exclamation-diamond-fill', desc: 'Todas as pendências encontradas automaticamente no fluxo.' },
      { filtro: 'critica', titulo: 'Críticos', valor: criticos, cor: 'var(--emergencial)', icon: 'bi-exclamation-triangle-fill', desc: 'Pendências que podem comprometer rastreabilidade, prazo ou operação diária.' },
      { filtro: 'alta', titulo: 'Alta prioridade', valor: altas, cor: 'var(--orcamento)', icon: 'bi-clock-history', desc: 'Itens parados acima do prazo configurado.' },
      { filtro: 'Campo', titulo: 'Campo', valor: porGrupo.Campo || 0, cor: 'var(--os)', icon: 'bi-geo-alt-fill', desc: 'Unidades em atendimento sem informação diária da equipe.' },
      { filtro: 'Orçamento', titulo: 'Orçamentos', valor: porGrupo.Orçamento || 0, cor: 'var(--orcamento)', icon: 'bi-cash-coin', desc: 'Orçamentos solicitados que ainda não retornaram.' },
      { filtro: 'Aprovação', titulo: 'Aprovações', valor: porGrupo.Aprovação || 0, cor: 'var(--orcamento-realizado)', icon: 'bi-receipt-cutoff', desc: 'Orçamentos realizados aguardando decisão interna.' }
    ];

    grid.innerHTML = cards
      .filter(c => Number(c.valor) > 0 || c.filtro === 'todos')
      .map(renderKpiAlerta_)
      .join('');
  }

  function renderKpiAlerta_(card) {
    const ativo = (window.alertasFiltroAtual || 'todos') === card.filtro;
    return `
      <div class="kpi-box ${ativo ? 'ativo' : ''}" style="--kpi-color:${card.cor};" onclick="filtrarAlertas('${escapeJsAttr(card.filtro)}')" title="${escapeHtml(card.desc)}" aria-label="${escapeHtml(card.titulo)}: ${escapeHtml(card.desc)}">
        <div class="kpi-box-head"><span class="kpi-icon"><i class="bi ${card.icon}"></i></span><span class="kpi-pulse"></span></div>
        <div class="kpi-title">${escapeHtml(card.titulo)}</div>
        <div class="kpi-value-row"><div class="kpi-value">${escapeHtml(card.valor)}</div><span class="kpi-caption">alertas</span></div>
        <div class="kpi-help">${escapeHtml(card.desc)}</div>
      </div>`;
  }

  function renderizarFiltrosAlertas_(alertas) {
    const el = document.getElementById('alertasFiltros');
    if (!el) return;
    const porGrupo = contadorPor_(alertas, a => a.grupo);
    const filtros = [
      ['todos', 'Todos', alertas.length],
      ['critica', 'Críticos', alertas.filter(a => a.severidade === 'critica').length],
      ['alta', 'Alta prioridade', alertas.filter(a => a.severidade === 'alta').length],
      ['Campo', 'Campo', porGrupo.Campo || 0],
      ['OS', 'OS', porGrupo.OS || 0],
      ['Orçamento', 'Orçamento', porGrupo.Orçamento || 0],
      ['Aprovação', 'Aprovação', porGrupo.Aprovação || 0],
      ['Visita', 'Visita', porGrupo.Visita || 0],
      ['Finalização', 'Finalização', porGrupo.Finalização || 0],
      ['Prazo', 'Prazo', porGrupo.Prazo || 0]
    ].filter(f => f[2] > 0 || f[0] === 'todos');

    el.innerHTML = filtros.map(f => {
      const ativo = (window.alertasFiltroAtual || 'todos') === f[0];
      return `<button class="alerta-filter ${ativo ? 'ativo' : ''}" onclick="filtrarAlertas('${escapeJsAttr(f[0])}')">${escapeHtml(f[1])}<span>${escapeHtml(f[2])}</span></button>`;
    }).join('');
  }

  function renderizarListaAlertas_(lista) {
    if (!lista.length) {
      return '<div class="empty-state"><h5>Nenhuma pendência encontrada</h5><p>Não há alertas para o filtro atual. Isso indica que os fluxos configurados estão sem travamentos aparentes.</p></div>';
    }

    return lista.map(a => `
      <div class="alerta-row alerta-${escapeHtml(a.severidade)}" style="--alerta-cor:${escapeHtml(a.cor)};">
        <div class="alerta-row-icon"><i class="bi ${escapeHtml(a.icone)}"></i></div>
        <div class="alerta-row-main">
          <div class="alerta-row-top">
            <span class="alerta-sev">${escapeHtml(labelSeveridade_(a.severidade))}</span>
            <span class="alerta-grupo">${escapeHtml(a.grupo)}</span>
            <span class="alerta-id">#${escapeHtml(a.chamadoId || '-')}</span>
          </div>
          <h5>${escapeHtml(a.titulo)}</h5>
          <div class="alerta-unidade"><i class="bi bi-building me-1"></i>${escapeHtml(a.unidade)}</div>
          <p>${escapeHtml(a.descricao)}</p>
          <div class="alerta-acao"><strong>Ação recomendada:</strong> ${escapeHtml(a.acao)}</div>
        </div>
        <div class="alerta-row-meta">
          <span class="status-pill"><span class="status-dot"></span>${escapeHtml(a.status || '-')}</span>
          <div class="alerta-data"><strong>${escapeHtml(a.dias == null ? '-' : a.dias + 'd')}</strong><span>desde ${escapeHtml(a.dataReferencia || 'sem data')}</span></div>
          <button class="btn btn-primary btn-sm fw-bold" onclick="abrirModalAnalise('${escapeJsAttr(a.chamadoId)}')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir</button>
        </div>
      </div>`).join('');
  }

  function labelSeveridade_(sev) {
    if (sev === 'critica') return 'Crítico';
    if (sev === 'alta') return 'Alta prioridade';
    if (sev === 'media') return 'Atenção';
    return 'Informativo';
  }

  window.filtrarAlertas = function(filtro) {
    window.alertasFiltroAtual = filtro || 'todos';
    renderizarAlertas();
  };

  window.renderizarAlertas = function() {
    const painel = document.getElementById('painelDados');
    const contador = document.getElementById('contadorAlertas');
    if (!painel) return;

    const todos = calcularAlertas();
    window.alertasGlobal = todos;
    const filtrados = filtrarAlertas_(todos);

    renderizarResumoSlaAlertas_(todos);
    renderizarKpisAlertas_(todos);
    renderizarFiltrosAlertas_(todos);
    if (contador) contador.innerText = filtrados.length + ' alertas';
    painel.innerHTML = renderizarListaAlertas_(filtrados);
  };


  function parseJsonCobrancaAlertas_(res) {
    if (!res) return { ok: false, erro: 'Resposta vazia.' };
    if (typeof res === 'string') {
      try { return JSON.parse(res); }
      catch(e) { return { ok: false, erro: 'JSON inválido: ' + e.message }; }
    }
    return res;
  }

  function prepararCobrancaEmpresaAlertas(botao) {
    if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Gerando prévia...');
    google.script.run
      .withSuccessHandler(function(res) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        const payload = parseJsonCobrancaAlertas_(res);
        renderPreviewCobrancaAlertas(payload);
      })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível gerar a prévia da cobrança.');
        else alert((err && err.message) || err);
      })
      .gomGerarPreviewCobrancaEmpresaV1Json();
  }

  function enviarCobrancaEmpresaAlertas(botao) {
    if (!confirm('Enviar cobrança consolidada para a empresa agora?')) return;
    if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Enviando...');
    google.script.run
      .withSuccessHandler(function(res) {
        const payload = parseJsonCobrancaAlertas_(res);
        if (!payload.ok) {
          if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
          alert(payload.erro || 'Não foi possível enviar a cobrança.');
          renderPreviewCobrancaAlertas(payload);
          return;
        }
        if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Enviado');
        renderPreviewCobrancaAlertas(payload);
        alert('Cobrança enviada com sucesso. Total de pendências: ' + (payload.total || 0));
      })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível enviar a cobrança.');
        else alert((err && err.message) || err);
      })
      .gomEnviarCobrancaPendenciasEmpresaV1Json();
  }

  function ativarCobrancaDiariaEmpresa(botao) {
    if (!confirm('Ativar/atualizar cobrança automática diária da empresa às 11h?')) return;
    if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Ativando...');
    google.script.run
      .withSuccessHandler(function(res) {
        const payload = parseJsonCobrancaAlertas_(res);
        if (!payload.ok) {
          if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
          alert(payload.erro || 'Não foi possível ativar o agendamento.');
          return;
        }
        if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Ativado');
        alert('Cobrança automática diária ativada/atualizada para 11h.');
      })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível ativar o agendamento.');
        else alert((err && err.message) || err);
      })
      .gomCriarTriggerCobrancaPendenciasEmpresaV1Json();
  }

  function renderPreviewCobrancaAlertas(payload) {
    const box = document.getElementById('alertasCobrancaPreview');
    if (!box) return;

    if (!payload || !payload.ok) {
      box.innerHTML = '<div class="alertas-cobranca-error"><i class="bi bi-exclamation-triangle me-1"></i>' + escapeHtml((payload && payload.erro) || 'Não foi possível carregar a prévia.') + '</div>';
      return;
    }

    const grupos = payload.grupos || {};
    const linhas = payload.pendencias || [];
    if (!linhas.length) {
      box.innerHTML = '<div class="alertas-cobranca-empty"><i class="bi bi-check2-circle me-1"></i>Nenhuma pendência de cobrança encontrada para a empresa.</div>';
      return;
    }

    const gruposHtml = Object.keys(grupos).map(function(chave) {
      return '<span><strong>' + escapeHtml(grupos[chave]) + '</strong>' + escapeHtml(chave) + '</span>';
    }).join('');

    const linhasHtml = linhas.slice(0, 10).map(function(p) {
      return '<tr><td>#' + escapeHtml(p.id || '') + '</td><td>' + escapeHtml(p.unidade || '') + '</td><td>' + escapeHtml(p.tipo || '') + '</td><td>' + escapeHtml(p.dias || '-') + '</td></tr>';
    }).join('');

    box.innerHTML = [
      '<div class="alertas-cobranca-resumo">',
        '<div><strong>' + escapeHtml(payload.total || 0) + '</strong><span>pendência(s) na cobrança</span></div>',
        '<div><strong>' + escapeHtml(payload.emailDestino || 'Sem e-mail') + '</strong><span>destinatário</span></div>',
        payload.cc ? '<div><strong>' + escapeHtml(payload.cc) + '</strong><span>cópia</span></div>' : '',
      '</div>',
      '<div class="alertas-cobranca-grupos">' + gruposHtml + '</div>',
      '<div class="table-responsive mt-2"><table class="table table-sm table-hover align-middle mb-0 alertas-cobranca-table">',
        '<thead><tr><th>ID</th><th>Unidade</th><th>Pendência</th><th>Dias</th></tr></thead>',
        '<tbody>' + linhasHtml + '</tbody>',
      '</table></div>',
      linhas.length > 10 ? '<div class="alertas-cobranca-more">Exibindo 10 de ' + linhas.length + ' pendências. O e-mail contém a relação consolidada.</div>' : ''
    ].join('');
  }

  window.prepararCobrancaEmpresaAlertas = prepararCobrancaEmpresaAlertas;
  window.enviarCobrancaEmpresaAlertas = enviarCobrancaEmpresaAlertas;
  window.ativarCobrancaDiariaEmpresa = ativarCobrancaDiariaEmpresa;
  window.renderPreviewCobrancaAlertas = renderPreviewCobrancaAlertas;


  window.calcularAlertasSistema = calcularAlertas;
  window.getConfigNumeroAlertaSistema = getConfigNumeroAlerta_;
  window.configAtivaAlertaSistema = configAtivaAlerta_;

  window.inicializarAlertas = function(forcar) {
    const painel = document.getElementById('painelDados');
    if (painel && !dadosCarregados) painel.innerHTML = '<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold">Carregando chamados para calcular alertas...</p></div>';

    carregarConfiguracoesParaAlertas_(function() {
      if (!dadosCarregados || forcar) {
        carregarChamados({
          renderizar: false,
          forcar: Boolean(forcar),
          callback: function() { renderizarAlertas(); }
        });
      } else {
        renderizarAlertas();
      }
    });
  };
})();