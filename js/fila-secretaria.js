/* ============================================================================
   GOM - Fila da Secretaria: agenda separada por responsabilidade + pós-visita
   v19: corrige inclusão de chamados antigos da Fila/Em atendimento na agenda.
   Carregar depois de triagem-fila-inline.js.
   ============================================================================ */
(function gomFilaSecretaria(){
  'use strict';

  window.filaSubmodoAtual = window.filaSubmodoAtual || 'fila';
  window.filaAgendaResponsavelAtual = 'secretaria';
  window.filaAgendaFiltroAtual = window.filaAgendaFiltroAtual || 'todos';
  // Filtro da Agenda por campo (busca por digitação + dropdown de campo).
  window.filaAgendaCampoFiltro = window.filaAgendaCampoFiltro || 'tudo';

  function telaAtual_() {
    return window.telaAtual || (typeof telaAtual !== 'undefined' ? telaAtual : 'dashboard');
  }

  function html_(v) {
    return typeof escapeHtml === 'function' ? escapeHtml(v) : String(v == null ? '' : v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function js_(v) {
    return typeof escapeJsAttr === 'function' ? escapeJsAttr(v) : String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
  }

  function normalizar_(v) {
    return typeof normalizarSituacaoSistema === 'function' ? normalizarSituacaoSistema(v) : String(v || '').trim();
  }

  function texto_(v) {
    return typeof normalizarTextoBase === 'function' ? normalizarTextoBase(v) : String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function cor_(st) {
    return typeof getCorStatus === 'function' ? getCorStatus(st) : '#075f82';
  }

  function dataISOHoje_() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function normalizarDataISO_(valor) {
    if (!valor) return '';
    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return valor.getFullYear() + '-' + String(valor.getMonth() + 1).padStart(2, '0') + '-' + String(valor.getDate()).padStart(2, '0');
    }
    var s = String(valor || '').trim();
    if (!s) return '';
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
    var br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (br) return br[3] + '-' + String(br[2]).padStart(2, '0') + '-' + String(br[1]).padStart(2, '0');
    return '';
  }

  function dataBr_(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso || 'Sem data definida';
    return m[3] + '/' + m[2] + '/' + m[1];
  }

  function diaSemana_(iso) {
    if (!iso || iso === 'sem-data') return 'Pendência de organização';
    var partes = String(iso).split('-').map(Number);
    var d = new Date(partes[0], partes[1] - 1, partes[2]);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('pt-BR', { weekday: 'long' });
  }

  function dataOrdenacao_(iso) {
    if (!iso) return 99999999;
    return Number(String(iso).replace(/-/g, '')) || 99999999;
  }

  function diffDiasHoje_(iso) {
    if (!iso) return 0;
    var p = String(iso).split('-').map(Number);
    if (p.length !== 3) return 0;
    var d = new Date(p[0], p[1] - 1, p[2]);
    var h = new Date();
    var hoje = new Date(h.getFullYear(), h.getMonth(), h.getDate());
    if (isNaN(d)) return 0;
    return Math.floor((hoje.getTime() - d.getTime()) / 86400000);
  }

  function campoDataAgenda_(item) {
    // Agenda da Secretaria usa somente datas de visita/vistoria da Secretaria.
    // Datas de atendimento da empresa ficam exclusivamente em data_equipe/dataAtendimento.
    var candidatos = [
      item.dataAgendamentoVisitaRaw,
      item.dataAgendamentoVisita,
      item.data_agendamento_visita,
      item.dataVisita,
      item.data_visita,
      item.previsaoVisita,
      item.previsao_visita,
      item.dataHoraEntradaFila,
      item.dataEntradaFila,
      item.dataHoraUltimaAcao,
      item.dataHora,
      item.data
    ];
    for (var i = 0; i < candidatos.length; i++) {
      var iso = normalizarDataISO_(candidatos[i]);
      if (iso) return iso;
    }
    return '';
  }

  function equipeAgenda_(item) {
    return item.equipe || item.equipeDia || item.equipeAtual || item.nomeEquipe || item.responsavel || '';
  }

  function numeroOs_(item) {
    return item.numeroOs || item.numero_os || item.os || '';
  }

  function tipoChamado_(item) {
    return item.tipo || item.tipoUnidade || item.segmento || item.categoria || item.etapa || 'Chamado';
  }

  function descricaoCurta_(item) {
    var s = String(item.detalhamento || item.descricao || item.problema || item.observacoes || '').replace(/\s+/g, ' ').trim();
    if (!s) return 'Sem descrição resumida informada.';
    return s.length > 210 ? s.slice(0, 210) + '…' : s;
  }

  function isStatusSecretaria_(st) {
    st = normalizar_(st);
    return st === 'Aguardando visita' || st === 'Visita agendada';
  }


  function isStatusEmpresa_(st) {
    st = normalizar_(st);
    var t = texto_(st);
    var exatos = [
      'Solicitado Orçamento',
      'Orçamento Solicitado',
      'Aguardando Orçamento',
      'OS emitida',
      'OS Emitida',
      'OS sem numeração',
      'Atendimento Emergencial',
      'Garantia de Obra',
      'Em execução',
      'Aguardando execução'
    ];
    if (exatos.indexOf(st) >= 0) return true;
    if (t.indexOf('orcamento') >= 0) return true;
    if (t.indexOf('os emitida') >= 0 || t.indexOf('os sem numeracao') >= 0) return true;
    if (t.indexOf('emergencial') >= 0) return true;
    if (t.indexOf('garantia') >= 0) return true;
    if (t.indexOf('execucao') >= 0 || t.indexOf('em execucao') >= 0) return true;
    return false;
  }

  function grupoResponsavel_(st) {
    if (isStatusSecretaria_(st)) return 'secretaria';
    if (isStatusEmpresa_(st)) return 'empresa';
    return 'outro';
  }

  function isStatusAgenda_(st) {
    return grupoResponsavel_(st) === 'secretaria';
  }

  function statusEmpresaTipo_(st) {
    var t = texto_(normalizar_(st));
    if (t.indexOf('orcamento') >= 0) return 'orcamentos';
    if (t.indexOf('os emitida') >= 0 || t.indexOf('os sem numeracao') >= 0) return 'os';
    if (t.indexOf('emergencial') >= 0) return 'emergenciais';
    if (t.indexOf('garantia') >= 0) return 'garantia';
    return 'empresa';
  }

  function temJustificativaPosVisita_(item) {
    var obs = texto_(item.observacoes || item.observacao || item.historico || '');
    return obs.indexOf('justificativa pos-visita') >= 0 || obs.indexOf('justificativa pos visita') >= 0 || obs.indexOf('[pos-visita]') >= 0;
  }

  function diagnosticoPosVisita_(item) {
    if (!item || item._agendaResponsavel !== 'secretaria') return { ativo: false, dias: 0, nivel: '', label: '', classe: '' };
    var dias = diffDiasHoje_(item._agendaData);
    var st = item._agendaStatus || '';
    var precisa = item._agendaData && dias >= 1 && isStatusSecretaria_(st);
    if (!precisa) return { ativo: false, dias: dias, nivel: '', label: '', classe: '' };

    if (temJustificativaPosVisita_(item)) {
      return {
        ativo: true,
        dias: dias,
        nivel: 'justificado',
        classe: 'is-pos-justificado',
        label: 'Justificado sem mudança',
        detalhe: 'Há justificativa registrada, mas o status ainda não evoluiu.'
      };
    }

    if (dias >= 2) {
      return {
        ativo: true,
        dias: dias,
        nivel: 'critico',
        classe: 'is-pos-critico',
        label: dias + ' dias sem andamento',
        detalhe: 'A visita já passou e o chamado continua aguardando encaminhamento.'
      };
    }

    return {
      ativo: true,
      dias: dias,
      nivel: 'alerta',
      classe: 'is-pos-alerta',
      label: 'D+1 sem andamento',
      detalhe: 'Verificar se a visita foi efetiva e por que o chamado não teve andamento.'
    };
  }

  function listaAgenda_() {
    var termo = typeof termoPesquisa === 'function' ? termoPesquisa() : texto_(document.getElementById('pesquisa')?.value || '');
    var campo = window.filaAgendaCampoFiltro || 'tudo';
    return (window.listaChamadosGlobal || []).filter(function(item) {
      var st = normalizar_(item.situacao || item.status || item['Situação'] || item['Status']);
      if (!isStatusAgenda_(st)) return false;
      var alvo;
      if (campo === 'unidade')     alvo = texto_(item.unidade);
      else if (campo === 'status') alvo = texto_(st);
      else if (campo === 'equipe') alvo = texto_(equipeAgenda_(item));
      else if (campo === 'data')   alvo = texto_(dataBr_(campoDataAgenda_(item)) + ' ' + campoDataAgenda_(item));
      else alvo = texto_([item.id, item.unidade, item.detalhamento, item.descricao, st, item.observacoes, equipeAgenda_(item), numeroOs_(item), campoDataAgenda_(item)].join(' '));
      return !termo || alvo.indexOf(termo) >= 0;
    }).map(function(item) {
      var st = normalizar_(item.situacao || item.status || item['Situação'] || item['Status']);
      var responsavel = grupoResponsavel_(st);
      var novo = Object.assign({}, item, {
        _agendaStatus: st,
        _agendaData: campoDataAgenda_(item),
        _agendaEquipe: equipeAgenda_(item),
        _agendaOs: numeroOs_(item),
        _agendaTipo: tipoChamado_(item),
        _agendaDescricao: descricaoCurta_(item),
        _agendaResponsavel: responsavel,
        _agendaEmpresaTipo: statusEmpresaTipo_(st)
      });
      novo._posVisita = diagnosticoPosVisita_(novo);
      return novo;
    }).sort(function(a, b) {
      var aP = a._posVisita && a._posVisita.ativo && a._posVisita.nivel !== 'justificado' ? 0 : 1;
      var bP = b._posVisita && b._posVisita.ativo && b._posVisita.nivel !== 'justificado' ? 0 : 1;
      return aP - bP
        || dataOrdenacao_(a._agendaData) - dataOrdenacao_(b._agendaData)
        || String(a._agendaEquipe || '').localeCompare(String(b._agendaEquipe || ''), 'pt-BR')
        || String(a.unidade || '').localeCompare(String(b.unidade || ''), 'pt-BR')
        || Number(a.id || 0) - Number(b.id || 0);
    });
  }

  function listaResponsavel_(lista) {
    var resp = window.filaAgendaResponsavelAtual || 'secretaria';
    return (lista || []).filter(function(i){ return i._agendaResponsavel === resp; });
  }

  function filtrarAgenda_(lista) {
    var filtro = window.filaAgendaFiltroAtual || 'todos';
    var resp = window.filaAgendaResponsavelAtual || 'secretaria';
    var hoje = dataISOHoje_();
    lista = listaResponsavel_(lista);

    if (resp === 'secretaria') {
      // Sem filtro por status (KPIs removidos): a busca por texto + campo refina.
      return lista;
    }

    if (filtro === 'orcamentos') return lista.filter(function(i){ return i._agendaEmpresaTipo === 'orcamentos'; });
    if (filtro === 'os') return lista.filter(function(i){ return i._agendaEmpresaTipo === 'os'; });
    if (filtro === 'emergenciais') return lista.filter(function(i){ return i._agendaEmpresaTipo === 'emergenciais'; });
    if (filtro === 'garantia') return lista.filter(function(i){ return i._agendaEmpresaTipo === 'garantia'; });
    if (filtro === 'hoje') return lista.filter(function(i){ return i._agendaData === hoje; });
    if (filtro === 'pendencias') return lista.filter(function(i){ return !i._agendaEquipe || !i._agendaData; });
    return lista;
  }

  function atualizarSubmenuAtivo_() {
    var modo = window.filaSubmodoAtual || 'fila';
    document.querySelectorAll('[data-fila-modo]').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-fila-modo') === modo);
    });

    document.querySelectorAll('[data-agenda-filtro]').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-agenda-filtro') === (window.filaAgendaFiltroAtual || 'todos'));
    });

    document.querySelectorAll('[data-agenda-responsavel]').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-agenda-responsavel') === (window.filaAgendaResponsavelAtual || 'secretaria'));
    });

    var wrapData = document.getElementById('gomDataGlobalWrap_fila');
    if (wrapData) wrapData.style.display = modo === 'agenda' ? 'none' : '';

    var pesquisa = document.getElementById('pesquisa');
    if (pesquisa) {
      var resp = window.filaAgendaResponsavelAtual || 'secretaria';
      pesquisa.placeholder = modo === 'agenda'
        ? (resp === 'empresa' ? 'Buscar unidade, OS, status, equipe ou data na agenda da empresa...' : 'Buscar unidade, equipe, status, data ou pós-visita na agenda da Secretaria...')
        : 'Buscar unidade, ID, solicitação ou observação...';
    }
  }

  function contar_(lista) {
    var hoje = dataISOHoje_();
    lista = lista || [];
    return {
      total: lista.length,
      aguardandoVisita: lista.filter(function(i){ return i._agendaStatus === 'Aguardando visita'; }).length,
      visitaAgendada: lista.filter(function(i){ return i._agendaStatus === 'Visita agendada'; }).length,
      hoje: lista.filter(function(i){ return i._agendaData === hoje; }).length,
      semData: lista.filter(function(i){ return !i._agendaData; }).length,
      semEquipe: lista.filter(function(i){ return !i._agendaEquipe; }).length,
      equipes: new Set(lista.map(function(i){ return i._agendaEquipe; }).filter(Boolean)).size,
      comOs: lista.filter(function(i){ return !!i._agendaOs; }).length,
      semAndamento: lista.filter(function(i){ return i._posVisita && i._posVisita.ativo && i._posVisita.nivel !== 'justificado'; }).length,
      justificados: lista.filter(function(i){ return i._posVisita && i._posVisita.ativo && i._posVisita.nivel === 'justificado'; }).length,
      criticos: lista.filter(function(i){ return i._posVisita && i._posVisita.nivel === 'critico'; }).length,
      orcamentos: lista.filter(function(i){ return i._agendaEmpresaTipo === 'orcamentos'; }).length,
      os: lista.filter(function(i){ return i._agendaEmpresaTipo === 'os'; }).length,
      emergenciais: lista.filter(function(i){ return i._agendaEmpresaTipo === 'emergenciais'; }).length,
      garantia: lista.filter(function(i){ return i._agendaEmpresaTipo === 'garantia'; }).length,
      pendencias: lista.filter(function(i){ return !i._agendaEquipe || !i._agendaData; }).length
    };
  }

  function montarKpiAgendaCard_(chave, title, valor, cor, ativo, descricao, icone) {
    var valorSeguro = html_(valor == null ? 0 : valor);
    var titleSeguro = html_(title);
    var descSeguro = html_(descricao || 'Clique para filtrar esta visão.');
    var chaveJs = js_(chave || 'todos');
    var caption = Number(valor) === 1 ? 'chamado' : 'chamados';
    return [
      '<div class="kpi-box agenda-kpi-box ' + (ativo ? 'ativo' : '') + '" style="--kpi-color:' + html_(cor || 'var(--primary)') + ';" onclick="setFilaAgendaFiltro(\'' + chaveJs + '\')" title="' + descSeguro + '" aria-label="' + titleSeguro + ': ' + descSeguro + '">',
        '<div class="kpi-box-head"><span class="kpi-icon"><i class="bi ' + html_(icone || 'bi-funnel') + '"></i></span><span class="kpi-pulse"></span></div>',
        '<div class="kpi-title">' + titleSeguro + '</div>',
        '<div class="kpi-value-row"><div class="kpi-value">' + valorSeguro + '</div><span class="kpi-caption">' + caption + '</span></div>',
        '<div class="kpi-help">' + descSeguro + '</div>',
      '</div>'
    ].join('');
  }

  function renderKpisAgenda_(listaCompleta) {
    var grid = document.getElementById('kpiGrid');
    if (!grid) return;
    var resp = window.filaAgendaResponsavelAtual || 'secretaria';
    var f = window.filaAgendaFiltroAtual || 'todos';
    var listaResp = listaResponsavel_(listaCompleta || []);
    var c = contar_(listaResp);
    var html = '';

    if (resp === 'secretaria') {
      if (f !== 'aguardando-visita' && f !== 'visita-agendada') {
        window.filaAgendaFiltroAtual = f = 'aguardando-visita';
      }
      html += montarKpiAgendaCard_('aguardando-visita', 'Aguardando visita', c.aguardandoVisita, cor_('Aguardando visita'), f === 'aguardando-visita', 'Chamados que saíram da triagem e ainda aguardam definição de visita.', 'bi-calendar2-week');
      html += montarKpiAgendaCard_('visita-agendada', 'Visita agendada', c.visitaAgendada, cor_('Visita agendada'), f === 'visita-agendada', 'Chamados com equipe da Secretaria e data de visita definidas.', 'bi-calendar-check');
    } else {
      html += montarKpiAgendaCard_('todos', 'Agenda Empresa', c.total, 'var(--primary)', f === 'todos', 'Chamados sob responsabilidade da empresa, sem misturar com a fila da Secretaria.', 'bi-building');
      html += montarKpiAgendaCard_('orcamentos', 'Orçamentos', c.orcamentos, 'var(--orcamento)', f === 'orcamentos', 'Solicitações de orçamento que dependem de retorno ou ação da empresa.', 'bi-cash-coin');
      html += montarKpiAgendaCard_('os', 'OS emitidas', c.os, 'var(--os)', f === 'os', 'Ordens de serviço emitidas para acompanhamento de execução pela empresa.', 'bi-file-earmark-check');
      html += montarKpiAgendaCard_('emergenciais', 'Emergenciais', c.emergenciais, 'var(--emergencial)', f === 'emergenciais', 'Atendimentos emergenciais sob responsabilidade da empresa.', 'bi-lightning-charge');
      html += montarKpiAgendaCard_('garantia', 'Garantia', c.garantia, '#f97316', f === 'garantia', 'Chamados vinculados à garantia de obra ou retorno da empresa.', 'bi-shield-check');
      html += montarKpiAgendaCard_('pendencias', 'Pendências', c.pendencias, 'var(--duplicado)', f === 'pendencias', 'Itens da empresa que estão sem equipe ou sem data/previsão definida.', 'bi-exclamation-circle');
    }

    grid.innerHTML = html || '<div class="alert alert-info">Nenhum indicador para esta visão.</div>';
  }

  function montarResumoAgenda_(listaResp) {
    var c = contar_(listaResp);
    var resp = window.filaAgendaResponsavelAtual || 'secretaria';
    if (resp === 'empresa') {
      return [
        '<div class="fila-agenda-resumo fila-agenda-resumo-v14">',
          '<span><strong>' + c.total + '</strong> total empresa</span>',
          '<span><strong>' + c.orcamentos + '</strong> orçamentos</span>',
          '<span><strong>' + c.os + '</strong> OS emitidas</span>',
          '<span><strong>' + c.emergenciais + '</strong> emergenciais</span>',
          '<span><strong>' + c.garantia + '</strong> garantias</span>',
          '<span class="' + (c.pendencias ? 'is-alerta' : '') + '"><strong>' + c.pendencias + '</strong> pendências</span>',
        '</div>'
      ].join('');
    }
    return [
      '<div class="fila-agenda-resumo fila-agenda-resumo-v14">',
        '<span><strong>' + c.aguardandoVisita + '</strong> aguardando visita</span>',
        '<span><strong>' + c.visitaAgendada + '</strong> visita agendada</span>',
      '</div>'
    ].join('');
  }

  function montarResponsaveisAgenda_() {
    // A Fila mostra somente a agenda da Secretaria/GOM.
    // A agenda da Empresa fica no módulo Empresa, em aba própria.
    window.filaAgendaResponsavelAtual = 'secretaria';
    return '';
  }

  function montarFiltrosAgenda_(listaResp) {
    var c = contar_(listaResp);
    var f = window.filaAgendaFiltroAtual || 'todos';
    var resp = window.filaAgendaResponsavelAtual || 'secretaria';
    function btn(chave, label, qtd, icone) {
      return '<button type="button" class="agenda-filter-btn ' + (f === chave ? 'active' : '') + '" data-agenda-filtro="' + chave + '" onclick="setFilaAgendaFiltro(\'' + chave + '\')"><i class="bi ' + icone + '"></i><span>' + label + '</span><strong>' + qtd + '</strong></button>';
    }
    if (resp === 'empresa') {
      return '<div class="agenda-filter-bar agenda-filter-bar-v14">'
        + btn('todos', 'Todos da empresa', c.total, 'bi-building')
        + btn('orcamentos', 'Orçamentos', c.orcamentos, 'bi-cash-coin')
        + btn('os', 'OS emitidas', c.os, 'bi-file-earmark-check')
        + btn('emergenciais', 'Emergenciais', c.emergenciais, 'bi-lightning-charge')
        + btn('garantia', 'Garantia', c.garantia, 'bi-shield-check')
        + btn('pendencias', 'Pendências', c.pendencias, 'bi-exclamation-circle')
        + '</div>';
    }
    return '<div class="agenda-filter-bar agenda-filter-bar-v14">'
      + btn('aguardando-visita', 'Aguardando visita', c.aguardandoVisita, 'bi-calendar2-week')
      + btn('visita-agendada', 'Visita agendada', c.visitaAgendada, 'bi-calendar-check')
      + '</div>';
  }

  function montarRowChamado_(item, chave) {
    var out = [];
    var id = html_(item.id || '-');
    var idJs = js_(item.id || '');
    var st = item._agendaStatus || 'Sem status';
    var eq = item._agendaEquipe || 'Equipe não definida';
    var os = item._agendaOs || 'Sem OS';
    var tituloData = chave === 'sem-data' ? 'Sem data' : dataBr_(chave);
    var diag = item._posVisita || {};
    var classeDiag = diag.ativo ? ' is-pos-visita ' + diag.classe : '';
    out.push('<article class="fila-agenda-row' + classeDiag + ' is-resp-' + html_(item._agendaResponsavel) + '" style="--card-accent:' + html_(cor_(st)) + '">');
      out.push('<div class="fila-agenda-row-main">');
        out.push('<div class="fila-agenda-row-unidade"><strong>' + html_(item.unidade || 'Unidade não informada') + '</strong><small>#' + id + ' · ' + html_(item._agendaTipo) + '</small></div>');
        if (diag.ativo) {
          out.push('<div class="pos-visita-alerta"><i class="bi bi-exclamation-triangle-fill"></i><div><strong>' + html_(diag.label) + '</strong><small>' + html_(diag.detalhe || '') + '</small></div></div>');
        }
        out.push('<p>' + html_(item._agendaDescricao) + '</p>');
      out.push('</div>');
      out.push('<div class="fila-agenda-row-info">');
        out.push('<span class="fila-agenda-status" style="--status-accent:' + html_(cor_(st)) + '">' + html_(st) + '</span>');
        out.push('<span class="' + (!item._agendaEquipe ? 'is-pendente' : '') + '"><i class="bi bi-people"></i>' + html_(eq) + '</span>');
        out.push('<span><i class="bi bi-file-earmark-check"></i>' + html_(os) + '</span>');
        out.push('<span><i class="bi bi-calendar3"></i>' + html_(tituloData) + '</span>');
      out.push('</div>');
      out.push('<div class="fila-pos-actions fila-acompanhamento-actions" aria-label="Ações de acompanhamento">');
        out.push('<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="gomFilaAcaoPosVisita(\'' + idJs + '\',\'reagendar\',this)"><i class="bi bi-calendar-plus me-1"></i>Reagendar visita</button>');
        out.push('<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="gomFilaAcaoPosVisita(\'' + idJs + '\',\'orcamento\',this)"><i class="bi bi-cash-coin me-1"></i>Encaminhar para orçamento</button>');
        out.push('<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="gomFilaAcaoPosVisita(\'' + idJs + '\',\'emergencial\',this)"><i class="bi bi-lightning-charge me-1"></i>Encaminhar como emergencial</button>');
        out.push('<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="gomFilaAcaoPosVisita(\'' + idJs + '\',\'devolver\',this)"><i class="bi bi-reply me-1"></i>Devolver para escola</button>');
        out.push('<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="gomFilaAcaoPosVisita(\'' + idJs + '\',\'justificar\',this)"><i class="bi bi-chat-left-text me-1"></i>Registrar justificativa</button>');
        out.push('<button type="button" class="btn btn-primary btn-sm fw-bold" onclick="gomFilaAcaoPosVisita(\'' + idJs + '\',\'abrir\',this)"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir chamado</button>');
      out.push('</div>');
    out.push('</article>');
    return out.join('');
  }

  // Agrupa os chamados de um dia por escola (visita) e monta um card guarda-chuva
  // por escola, com cabeçalho da visita, ação "aplicar a todos" e as linhas dentro.
  function montarVisitasDoDia_(itens, chave) {
    var porEscola = {};
    var ordem = [];
    itens.forEach(function(item) {
      var chaveEscola = String(item.grupoVisita || item.escolaId || item.unidade || 'sem-escola').trim();
      if (!porEscola[chaveEscola]) { porEscola[chaveEscola] = []; ordem.push(chaveEscola); }
      porEscola[chaveEscola].push(item);
    });
    var out = ['<div class="fila-visitas-list">'];
    ordem.forEach(function(chaveEscola) {
      var grupo = porEscola[chaveEscola];
      var escola = grupo[0].unidade || 'Unidade não informada';
      var equipes = {};
      grupo.forEach(function(i) { if (i._agendaEquipe) equipes[i._agendaEquipe] = true; });
      var listaEquipes = Object.keys(equipes);
      var equipeLabel = listaEquipes.length === 1 ? listaEquipes[0] : (listaEquipes.length === 0 ? 'Equipe não definida' : (listaEquipes.length + ' equipes'));
      var dataLabel = chave === 'sem-data' ? 'sem data' : dataBr_(chave);
      var grupoKey = 'g_' + String(chave) + '_' + chaveEscola.replace(/[^A-Za-z0-9]/g, '_');
      window.__gomFilaGruposVisita[grupoKey] = { escola: escola, ids: grupo.map(function(i) { return i.id; }) };
      out.push('<div class="fila-visita-card">');
        out.push('<div class="fila-visita-head">');
          out.push('<div class="fila-visita-head-main"><i class="bi bi-building-community"></i><div><strong>' + html_(escola) + '</strong><small><i class="bi bi-people me-1"></i>' + html_(equipeLabel) + ' · ' + html_(dataLabel) + '</small></div></div>');
          out.push('<span class="fila-visita-count">' + grupo.length + ' chamado' + (grupo.length === 1 ? '' : 's') + '</span>');
        out.push('</div>');
        if (grupo.length > 1) {
          out.push('<div class="fila-visita-lote">');
            out.push('<span class="fila-visita-lote-label"><i class="bi bi-stack me-1"></i>Aplicar a todos:</span>');
            out.push('<select class="form-select form-select-sm" id="sel_' + grupoKey + '">');
              out.push('<option value="">Encaminhamento da visita…</option>');
              out.push('<option value="orcamento">Solicitar orçamento</option>');
              out.push('<option value="emergencial">Atendimento emergencial</option>');
              out.push('<option value="devolver">Devolver para a escola</option>');
            out.push('</select>');
            out.push('<button type="button" class="btn btn-primary btn-sm fw-bold" onclick="gomFilaAplicarVisitaEmLote(\'' + js_(grupoKey) + '\',this)">Aplicar</button>');
          out.push('</div>');
        }
        out.push('<div class="fila-agenda-rows">');
        grupo.forEach(function(item) { out.push(montarRowChamado_(item, chave)); });
        out.push('</div>');
      out.push('</div>');
    });
    out.push('</div>');
    return out.join('');
  }

  function renderAgenda_() {
    atualizarSubmenuAtivo_();
    var painel = document.getElementById('painelDados');
    if (!painel) return;

    if (!window.dadosCarregados && typeof dadosCarregados !== 'undefined' && !dadosCarregados) {
      painel.className = 'fila-agenda-shell agenda-list-mode';
      painel.innerHTML = '<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold">Carregando agenda...</p></div>';
      return;
    }

    window.filaAgendaResponsavelAtual = 'secretaria';
    var listaCompleta = listaAgenda_();
    if (typeof window.gomFilaAgrupado === 'undefined') {
      try { window.gomFilaAgrupado = sessionStorage.getItem('gomFilaAgrupado') === '1'; } catch (e) { window.gomFilaAgrupado = false; }
    }
    var agrupar = !!window.gomFilaAgrupado;
    window.__gomFilaGruposVisita = {};
    var listaResp = listaResponsavel_(listaCompleta);
    var lista = filtrarAgenda_(listaCompleta);
    var contador = document.getElementById('contador');
    if (contador) contador.textContent = lista.length + ' em acompanhamento';

    var resp = window.filaAgendaResponsavelAtual || 'secretaria';
    var atualizado = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var tituloTela = resp === 'empresa' ? 'Agenda e Acompanhamento da Empresa' : 'Atendimento da Secretaria';
    var descTela = resp === 'empresa'
      ? 'Somente chamados que já estão sob responsabilidade da empresa: orçamento, OS, emergência, garantia e execução.'
      : 'Somente chamados em Aguardando visita ou Visita agendada, sem misturar com Memorial, Empresa ou outros fluxos.';

    var grupos = {};
    lista.forEach(function(item) {
      var k = item._agendaData || 'sem-data';
      if (!grupos[k]) grupos[k] = [];
      grupos[k].push(item);
    });

    var chaves = Object.keys(grupos).sort(function(a, b) {
      if (a === 'sem-data') return 1;
      if (b === 'sem-data') return -1;
      return dataOrdenacao_(a) - dataOrdenacao_(b);
    });

    var campoAtual = window.filaAgendaCampoFiltro || 'tudo';
    var camposAgenda = [['tudo','Todos os campos'],['unidade','Unidade'],['status','Status'],['equipe','Equipe'],['data','Data']];
    var campoSelect = '<select class="form-select form-select-sm fw-bold gom-agenda-campo" onchange="setFilaAgendaCampo(this.value)" title="Escolha o campo para filtrar a agenda" style="max-width:170px;">'
      + camposAgenda.map(function(c){ return '<option value="' + c[0] + '"' + (campoAtual === c[0] ? ' selected' : '') + '>' + c[1] + '</option>'; }).join('')
      + '</select>';

    var html = [
      '<div class="fila-agenda-shell agenda-list-mode agenda-v14">',
        '<div class="fila-agenda-toolbar agenda-list-toolbar">',
          '<div><h5><i class="bi ' + (resp === 'empresa' ? 'bi-building' : 'bi-calendar2-week') + ' me-2"></i>' + html_(tituloTela) + '</h5><p>' + html_(descTela) + '</p></div>',
          '<div class="fila-agenda-toolbar-actions">',
            '<span class="gom-agenda-campo-label small fw-bold text-muted me-1"><i class="bi bi-funnel me-1"></i>Filtrar por:</span>',
            campoSelect,
            '<button type="button" class="btn btn-sm ' + (agrupar ? 'btn-primary' : 'btn-outline-primary') + ' fw-bold" onclick="gomFilaToggleAgrupar(this)" title="Agrupar os chamados por escola"><i class="bi bi-collection me-1"></i>' + (agrupar ? 'Agrupado por escola' : 'Agrupar por escola') + '</button>',
            '<span class="text-muted small fw-bold ms-2"><i class="bi bi-clock-history me-1"></i>Atualizado às ' + html_(atualizado) + '</span>',
          '</div>',
        '</div>',
        montarResponsaveisAgenda_(),
        '<div class="fila-agenda-list-view">'
    ];

    if (!listaResp.length) {
      html.push('<div class="empty-state"><h5>Nenhum atendimento nesta visão.</h5><p class="text-muted">Esta área mostra apenas os status de responsabilidade ' + (resp === 'empresa' ? 'da empresa' : 'da Secretaria') + '.</p></div>');
    } else if (!lista.length) {
      html.push('<div class="empty-state"><h5>Nenhum registro neste filtro.</h5><p class="text-muted">Escolha outro KPI/filtro ou clique em Atualizar agora.</p></div>');
    }

    chaves.forEach(function(chave) {
      var itens = grupos[chave] || [];
      var titulo = chave === 'sem-data' ? 'Sem data definida' : dataBr_(chave);
      var subtitulo = chave === 'sem-data' ? 'Registros que precisam de data/previsão' : diaSemana_(chave);
      html.push('<section class="fila-agenda-dia-list ' + (chave === 'sem-data' ? 'is-sem-data' : '') + '">');
      html.push('<div class="fila-agenda-dia-list-head"><div><strong>' + html_(titulo) + '</strong><small>' + html_(subtitulo) + '</small></div><span>' + itens.length + ' atendimento' + (itens.length === 1 ? '' : 's') + '</span></div>');
      if (agrupar) {
        html.push(montarVisitasDoDia_(itens, chave));
      } else {
        html.push('<div class="fila-agenda-rows">');
        itens.forEach(function(item) { html.push(montarRowChamado_(item, chave)); });
        html.push('</div>');
      }
      html.push('</section>');
    });

    html.push('</div></div>');
    painel.className = 'fila-agenda-shell agenda-list-mode agenda-v14';
    painel.innerHTML = html.join('');
  }

  function acharChamado_(id) {
    return (window.listaChamadosGlobal || []).find(function(x){ return String(x.id) === String(id); }) || null;
  }

  function atualizarLocal_(id, campos) {
    if (typeof gomAtualizarChamadoLocal === 'function') {
      gomAtualizarChamadoLocal(id, campos);
      return;
    }
    var c = acharChamado_(id);
    if (c) Object.assign(c, campos || {});
  }

  function anexarObsLocal_(item, obs) {
    var atual = item && item.observacoes ? String(item.observacoes) : '';
    return atual ? atual + '\n' + obs : obs;
  }


  function camposDataSecretaria_(iso) {
    iso = normalizarDataISO_(iso);
    if (!iso) return {};
    return {
      dataAgendamentoVisita: iso,
      dataAgendamentoVisitaRaw: iso,
      data_agendamento_visita: iso,
      dataVisita: iso,
      data_visita: iso,
      previsaoVisita: iso,
      previsao_visita: iso
    };
  }

  async function confirmarDataSecretariaNoBanco_(id, iso) {
    iso = normalizarDataISO_(iso);
    if (!id || !iso) return { ok: false, motivo: 'dados_invalidos' };
    if (!window.SB || typeof window.SB.from !== 'function') {
      return { ok: false, motivo: 'supabase_indisponivel' };
    }
    try {
      var r = await window.SB
        .from('solicitacoes')
        .update({
          data_agendamento_visita: iso,
          data_hora_ultima_acao: new Date().toISOString()
        })
        .eq('id', id)
        .select('id,data_agendamento_visita')
        .maybeSingle();
      if (r && r.error) return { ok: false, erro: r.error.message || String(r.error) };
      var salva = normalizarDataISO_(r && r.data && r.data.data_agendamento_visita);
      return { ok: salva === iso, data: salva, raw: r && r.data };
    } catch (e) {
      return { ok: false, erro: e && e.message ? e.message : String(e) };
    }
  }

  function confirmarVisualDataSalva_(btn, iso, confirmacao) {
    var msg = 'Salvo: ' + dataBr_(iso);
    if (confirmacao && confirmacao.ok) msg = 'Confirmado: ' + dataBr_(iso);
    if (btn && typeof gomMostrarSucessoBotao === 'function') {
      gomMostrarSucessoBotao(btn, msg, 1600);
    }
    if (window.console && console.info) {
      console.info('[GOM] Data da visita confirmada', {
        dataSelecionada: iso,
        dataSelecionadaBR: dataBr_(iso),
        dataSalvaBanco: confirmacao && confirmacao.data,
        confirmada: !!(confirmacao && confirmacao.ok)
      });
    }
  }

  function salvarAcao_(payload, camposLocais, btn, textoLoading) {
    if (!payload || !payload.id) return;
    if (!window.google || !google.script || !google.script.run || typeof google.script.run.atualizarChamadoWorkflow !== 'function') {
      alert('Função de atualização não carregada. Recarregue o sistema e tente novamente.');
      return;
    }
    if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, textoLoading || 'Salvando...');
    else if (btn) btn.disabled = true;

    google.script.run
      .withSuccessHandler(async function() {
        var dataReagendada = normalizarDataISO_(payload.dataAgendamentoVisita || '');
        var campos = Object.assign({}, camposLocais || {});
        var confirmacao = null;

        if (dataReagendada) {
          // Garante que a agenda da Secretaria use somente a data da visita da Secretaria
          // e confirma no banco antes de redesenhar a tela.
          Object.assign(campos, camposDataSecretaria_(dataReagendada));
          confirmacao = await confirmarDataSecretariaNoBanco_(payload.id, dataReagendada);
          if (!confirmacao.ok) {
            if (window.console && console.warn) console.warn('[GOM] Não foi possível confirmar a data salva no banco:', confirmacao);
            alert('A data foi enviada, mas o sistema não conseguiu confirmar a gravação no banco. Clique em Atualizar e confira o chamado antes de seguir.');
          }
        }

        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
        else if (btn) btn.disabled = false;

        atualizarLocal_(payload.id, campos);

        if (dataReagendada) confirmarVisualDataSalva_(btn, dataReagendada, confirmacao);
        else if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(btn, 'Salvo', 900);

        if (window.filaSubmodoAtual === 'agenda' && typeof renderAgenda_ === 'function') {
          renderAgenda_();
        } else if (typeof window.renderizarTela === 'function') {
          window.renderizarTela();
        }

        if (typeof refreshChamados === 'function') refreshChamados(null, null);
        else window.gomFilaAtualizarEmBackground(250);
      })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
        else if (btn) btn.disabled = false;
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível registrar a ação pós-visita.');
        else alert((err && err.message) || err || 'Erro ao registrar ação.');
      })
      .atualizarChamadoWorkflow(payload);
  }


  function abrirModalReagendarVisita_(item, dataAtualISO) {
    return new Promise(function(resolve) {
      var anterior = document.getElementById('gomModalReagendarVisitaOverlay');
      if (anterior) anterior.remove();

      var unidade = (item && item.unidade) ? String(item.unidade) : 'Chamado';
      var valorInicial = normalizarDataISO_(dataAtualISO) || dataISOHoje_();
      var overlay = document.createElement('div');
      overlay.id = 'gomModalReagendarVisitaOverlay';
      overlay.className = 'gom-date-modal-overlay';
      overlay.innerHTML = '' +
        '<div class="gom-date-modal" role="dialog" aria-modal="true" aria-labelledby="gomModalReagendarTitulo">' +
          '<button type="button" class="gom-date-modal-close" data-gom-date-cancel aria-label="Fechar"><i class="bi bi-x-lg"></i></button>' +
          '<div class="gom-date-modal-icon"><i class="bi bi-calendar2-week"></i></div>' +
          '<div class="gom-date-modal-body">' +
            '<p class="gom-date-modal-eyebrow">Reagendamento de visita</p>' +
            '<h3 id="gomModalReagendarTitulo">Nova data da visita</h3>' +
            '<p class="gom-date-modal-desc">Selecione no calendário ou digite a data para <strong>' + escapeHtml(unidade) + '</strong>.</p>' +
            '<label class="gom-date-modal-label" for="gomModalReagendarInput">Data da visita</label>' +
            '<input id="gomModalReagendarInput" class="gom-date-modal-input" type="date" value="' + escapeHtml(valorInicial) + '">' +
            '<div class="gom-date-modal-preview" id="gomModalReagendarPreview"><i class="bi bi-check2-circle"></i><span></span></div>' +
          '</div>' +
          '<div class="gom-date-modal-actions">' +
            '<button type="button" class="btn btn-light border fw-bold" data-gom-date-cancel>Cancelar</button>' +
            '<button type="button" class="btn btn-primary fw-bold" id="gomModalReagendarSalvar"><i class="bi bi-check2-circle me-1"></i>Salvar nova data</button>' +
          '</div>' +
        '</div>';

      document.body.appendChild(overlay);
      document.body.classList.add('gom-modal-open');

      var input = overlay.querySelector('#gomModalReagendarInput');
      var preview = overlay.querySelector('#gomModalReagendarPreview span');
      var btnSalvar = overlay.querySelector('#gomModalReagendarSalvar');

      function atualizarPreview() {
        var iso = normalizarDataISO_(input.value);
        if (preview) preview.textContent = iso ? ('Data selecionada: ' + dataBr_(iso)) : 'Selecione uma data válida.';
      }
      function fechar(valor) {
        document.body.classList.remove('gom-modal-open');
        overlay.remove();
        document.removeEventListener('keydown', escHandler);
        resolve(valor || null);
      }
      function escHandler(ev) {
        if (ev.key === 'Escape') fechar(null);
      }

      overlay.addEventListener('click', function(ev) {
        if (ev.target === overlay || ev.target.closest('[data-gom-date-cancel]')) fechar(null);
      });
      if (input) input.addEventListener('input', atualizarPreview);
      if (btnSalvar) btnSalvar.addEventListener('click', function() {
        var iso = normalizarDataISO_(input.value);
        if (!iso) {
          input.classList.add('is-invalid');
          input.focus();
          return;
        }
        fechar(iso);
      });
      document.addEventListener('keydown', escHandler);
      setTimeout(function(){ if (input) { input.focus(); if (input.showPicker) { try { input.showPicker(); } catch(e) {} } } }, 80);
      atualizarPreview();
    });
  }

  window.gomFilaAcaoPosVisita = async function(id, acao, btn) {
    var item = acharChamado_(id);
    if (!item) return;
    var unidade = item.unidade || ('Chamado #' + id);
    var hoje = dataISOHoje_();

    if (acao === 'abrir') {
      if (typeof abrirModalAnalise === 'function') abrirModalAnalise(id);
      return;
    }

    if (acao === 'reagendar') {
      var atual = campoDataAgenda_(item) || hoje;
      var nova = await abrirModalReagendarVisita_(item, atual);
      if (!nova) return;
      var obsReag = '[PÓS-VISITA] Visita reagendada para ' + dataBr_(nova) + '.';
      var camposData = camposDataSecretaria_(nova);
      camposData.observacoes = anexarObsLocal_(item, obsReag);
      salvarAcao_({ id: id, dataAgendamentoVisita: nova, observacoes: obsReag }, camposData, btn, 'Reagendando...');
      return;
    }

    if (acao === 'justificar') {
      var justificativa = prompt('Registre a justificativa pós-visita para:\n' + unidade + '\n\nExemplo: equipe não conseguiu acesso, precisa de material, unidade fechada, necessário nova vistoria...');
      if (justificativa === null) return;
      justificativa = String(justificativa || '').trim();
      if (!justificativa) {
        alert('Informe a justificativa antes de salvar.');
        return;
      }
      var obsJust = '[PÓS-VISITA] JUSTIFICATIVA PÓS-VISITA: ' + justificativa;
      salvarAcao_({ id: id, observacoes: obsJust }, {
        observacoes: anexarObsLocal_(item, obsJust)
      }, btn, 'Registrando...');
      return;
    }

    var mapa = {
      orcamento: { status: 'Solicitado Orçamento', texto: 'encaminhar para orçamento', obs: '[PÓS-VISITA] Encaminhado para orçamento após visita técnica.' },
      emergencial: { status: 'Atendimento Emergencial', texto: 'encaminhar como emergencial', obs: '[PÓS-VISITA] Encaminhado como atendimento emergencial após visita técnica.' },
      devolver: { status: 'Devolvido para a escola', texto: 'devolver para a escola', obs: '[PÓS-VISITA] Devolvido para a escola após análise da visita técnica.' }
    };
    var cfg = mapa[acao];
    if (!cfg) return;
    if (!confirm('Deseja ' + cfg.texto + ' este chamado?\n\n' + unidade)) return;
    salvarAcao_({ id: id, situacao: cfg.status, observacoes: cfg.obs }, {
      situacao: cfg.status,
      status: cfg.status,
      observacoes: anexarObsLocal_(item, cfg.obs)
    }, btn, 'Encaminhando...');
  };

  window.gomFilaToggleAgrupar = function(btn) {
    window.gomFilaAgrupado = !window.gomFilaAgrupado;
    try { sessionStorage.setItem('gomFilaAgrupado', window.gomFilaAgrupado ? '1' : '0'); } catch (e) {}
    if (typeof renderAgenda_ === 'function') renderAgenda_();
  };

  // Aplica um mesmo encaminhamento a todos os chamados de uma visita (escola),
  // em sequência, reutilizando o fluxo individual já existente (atualizarChamadoWorkflow).
  window.gomFilaAplicarVisitaEmLote = function(grupoKey, btn) {
    var sel = document.getElementById('sel_' + grupoKey);
    var acao = sel ? sel.value : '';
    var mapa = {
      orcamento: { status: 'Solicitado Orçamento', label: 'Solicitar orçamento', obs: '[PÓS-VISITA] Encaminhado para orçamento após visita técnica (visita em lote).' },
      emergencial: { status: 'Atendimento Emergencial', label: 'Atendimento emergencial', obs: '[PÓS-VISITA] Encaminhado como atendimento emergencial após visita técnica (visita em lote).' },
      devolver: { status: 'Devolvido para a escola', label: 'Devolver para a escola', obs: '[PÓS-VISITA] Devolvido para a escola após análise da visita técnica (visita em lote).' }
    };
    var cfg = mapa[acao];
    if (!cfg) { alert('Selecione o encaminhamento da visita.'); return; }
    var grupo = (window.__gomFilaGruposVisita || {})[grupoKey];
    if (!grupo || !grupo.ids || !grupo.ids.length) return;
    if (!confirm('Aplicar "' + cfg.label + '" a todos os ' + grupo.ids.length + ' chamados da visita à ' + grupo.escola + '?')) return;

    if (!window.google || !google.script || !google.script.run || typeof google.script.run.atualizarChamadoWorkflow !== 'function') {
      alert('Função de atualização não carregada. Recarregue o sistema e tente novamente.');
      return;
    }

    if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, 'Aplicando ' + grupo.ids.length + '...');
    else if (btn) btn.disabled = true;

    var ids = grupo.ids.slice();
    var falhas = [];
    function aplicarUm(idx) {
      if (idx >= ids.length) {
        if (falhas.length) {
          if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn); else if (btn) btn.disabled = false;
          alert('Aplicado a ' + (ids.length - falhas.length) + ' de ' + ids.length + ' chamados. Falharam: #' + falhas.join(', #'));
        } else if (typeof gomMostrarSucessoBotao === 'function') {
          gomMostrarSucessoBotao(btn, 'Aplicado a ' + ids.length);
        } else if (btn) { btn.disabled = false; }
        if (typeof renderAgenda_ === 'function') renderAgenda_();
        if (typeof refreshChamados === 'function') refreshChamados(null, null);
        else window.gomFilaAtualizarEmBackground(250);
        return;
      }
      var id = ids[idx];
      var item = acharChamado_(id) || {};
      var payload = { id: id, situacao: cfg.status, observacoes: cfg.obs };
      var camposLocais = { situacao: cfg.status, status: cfg.status, observacoes: anexarObsLocal_(item, cfg.obs) };
      google.script.run
        .withSuccessHandler(function() { atualizarLocal_(id, camposLocais); aplicarUm(idx + 1); })
        .withFailureHandler(function() { falhas.push(id); aplicarUm(idx + 1); })
        .atualizarChamadoWorkflow(payload);
    }
    aplicarUm(0);
  };

  window.setFilaAgendaResponsavel = function(resp) {
    window.filaAgendaResponsavelAtual = 'secretaria';
    window.filaAgendaFiltroAtual = 'todos';
    atualizarSubmenuAtivo_();
    renderAgenda_();
  };

  window.setFilaAgendaFiltro = function(filtro) {
    window.filaAgendaFiltroAtual = filtro || 'todos';
    atualizarSubmenuAtivo_();
    renderAgenda_();
  };

  window.setFilaSubmodo = function(modo, btn) {
    window.filaSubmodoAtual = modo === 'agenda' ? 'agenda' : 'fila';
    try { sessionStorage.setItem('gom:filaSubmodoAtual', window.filaSubmodoAtual); localStorage.setItem('gom:filaSubmodoAtual', window.filaSubmodoAtual); } catch(e) {}
    if (window.filaSubmodoAtual === 'agenda' && !window.filaAgendaFiltroAtual) window.filaAgendaFiltroAtual = 'todos';
    atualizarSubmenuAtivo_();
    if (typeof window.renderizarTela === 'function') window.renderizarTela();
    if (window.filaSubmodoAtual === 'agenda') window.gomFilaAtualizarEmBackground(150);
  };

  window.gomAtualizarFilaAgora = function(btn) {
    if (window._gomFilaAtualizandoAgora_) return;
    window._gomFilaAtualizandoAgora_ = true;
    if (btn && typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, 'Atualizando...');
    else if (btn) btn.disabled = true;

    var finalizar = function() {
      window._gomFilaAtualizandoAgora_ = false;
      if (btn && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
      else if (btn) btn.disabled = false;
      if (btn && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(btn, 'Atualizado', 1200);
    };

    if (typeof carregarChamados !== 'function') {
      finalizar();
      if (typeof window.renderizarTela === 'function') window.renderizarTela();
      return;
    }

    carregarChamados({
      renderizar: false,
      forcar: true,
      callback: function() {
        finalizar();
        if (telaAtual_() === 'fila' && typeof window.renderizarTela === 'function') window.renderizarTela();
      }
    });
  };

  window.gomFilaAtualizarEmBackground = function(delay) {
    clearTimeout(window._gomFilaRefreshTimer_);
    window._gomFilaRefreshTimer_ = setTimeout(function() {
      if (telaAtual_() !== 'fila') return;
      if (window._gomFilaAtualizandoAgora_) return;
      if (typeof carregarChamados !== 'function') return;
      carregarChamados({
        renderizar: false,
        forcar: true,
        callback: function() {
          if (telaAtual_() === 'fila' && typeof window.renderizarTela === 'function') window.renderizarTela();
        }
      });
    }, Number(delay || 450));
  };

  var renderBase = window.renderizarTela;
  window.renderizarTela = function renderizarTelaFilaSecretariaWrapper() {
    if (telaAtual_() === 'fila' && window.filaSubmodoAtual === 'agenda') {
      renderAgenda_();
      return;
    }
    if (typeof renderBase === 'function') renderBase.apply(this, arguments);
    if (telaAtual_() === 'fila') atualizarSubmenuAtivo_();
  };

  // Dropdown de campo da Agenda: define o campo da busca por digitação.
  window.setFilaAgendaCampo = function(campo) {
    var validos = { tudo: 1, unidade: 1, status: 1, equipe: 1, data: 1 };
    window.filaAgendaCampoFiltro = validos[campo] ? campo : 'tudo';
    if (typeof renderAgenda_ === 'function') renderAgenda_();
  };

  // Aba "Fila" = somente casos SEM andamento: Aguardando visita ainda sem data
  // agendada e sem equipe. Os que já têm visita agendada/andamento vão na Agenda.
  (function() {
    var renderListaFilaOriginal = window.renderListaFilaOperacional;
    if (typeof renderListaFilaOriginal !== 'function') return;
    window.renderListaFilaOperacional = function(lista) {
      var filtrada = (lista || []).filter(function(it) {
        var st = normalizar_(it.situacao || it.status);
        if (st !== 'Aguardando visita') return false;
        var temDataVisita = !!(it.dataAgendamentoVisitaRaw || it.dataAgendamentoVisita || it.data_agendamento_visita);
        var temEquipe = !!(it.equipe && String(it.equipe).trim());
        return !temDataVisita && !temEquipe;
      });
      var contador = document.getElementById('contador');
      if (contador && telaAtual_() === 'fila') contador.textContent = filtrada.length + ' na fila (sem andamento)';
      return renderListaFilaOriginal(filtrada);
    };
  })();

  try { if (typeof renderizarTela !== 'undefined') renderizarTela = window.renderizarTela; } catch(e) {}
  window.renderFilaAgendaSecretaria = renderAgenda_;
  window.gomFilaSecretariaPatch = true;
  window.gomFilaSecretariaVersao = 'v19-agenda-secretaria-legado';
  window.gomLog && window.gomLog('[GOM] Fila Secretaria agenda separada carregada.');
})();
