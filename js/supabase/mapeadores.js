/* ============================================================================
 * GOM | SME — Mapeadores (datas, status e conversão de dados)
 * ----------------------------------------------------------------------------
 * Este é o ÚNICO arquivo que você precisa ajustar se algum campo/data aparecer
 * diferente nas telas. Ele transforma a linha do Postgres no MESMO objeto que
 * o Apps Script entregava (contrato "V3"), para o frontend não precisar mudar.
 * ========================================================================== */
window.GomMap = (function () {
  'use strict';
  const TZ = 'America/Sao_Paulo';

  // ── Datas (replicam formatDate_/formatDateTime_/nowText_/todayKey_) ─────────
  function _partes(value, opts) {
    if (value === null || value === undefined || value === '') return null;
    const d = (value instanceof Date) ? value : new Date(value);
    if (isNaN(d.getTime())) return null;
    const p = {};
    new Intl.DateTimeFormat('pt-BR', Object.assign({ timeZone: TZ }, opts))
      .formatToParts(d).forEach(x => { p[x.type] = x.value; });
    return p;
  }
  function fmtData(v) { const p = _partes(v, { day: '2-digit', month: '2-digit', year: 'numeric' }); return p ? `${p.day}/${p.month}/${p.year}` : ''; }
  function fmtDataHora(v) { const p = _partes(v, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }); return p ? `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}` : ''; }
  function nowText() { const p = _partes(new Date(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }); return `${p.day}/${p.month}/${p.year} ${p.hour}:${p.minute}:${p.second}`; }
  function todayKey() { const p = _partes(new Date(), { day: '2-digit', month: '2-digit', year: 'numeric' }); return p ? `${p.year}-${p.month}-${p.day}` : ''; }
  function toMs(v) { if (!v) return ''; const d = (v instanceof Date) ? v : new Date(v); return isNaN(d.getTime()) ? '' : d.getTime(); }
  function toYmd(v) { const p = _partes(v, { day: '2-digit', month: '2-digit', year: 'numeric' }); return p ? `${p.year}-${p.month}-${p.day}` : ''; }

  // ── Status: cores, aliases e regras de fluxo (espelho do FluxoService) ──────
  const CORES = {
    'Em análise': '#FFD300', 'Solicitado Orçamento': '#f59e0b', 'Orçamento Realizado': '#fb923c',
    'Aguardando visita': '#14b8a6', 'Em atendimento': '#00e5ff', 'Atendimento Emergencial': '#ec4899',
    'OS emitida': '#22d3ee', 'Serviço Realizado': '#10b981', 'Garantia de Obra': '#d97706',
    'Visita Técnica': '#14b8a6', 'Devolvido para a escola': '#64748b', 'Concluído': '#39FF14',
    'Encaminhado para outra gerência ou Unidade escolar.': '#6366f1', 'A cargo da unidade escolar': '#84cc16', 'Duplicado': '#475569'
  };
  const TODOS = Object.keys(CORES).concat(['Serviço Realizado']).filter((v, i, a) => a.indexOf(v) === i);
  const ALIASES = {
    'recebido': 'Em análise', 'avaliar': 'Em análise',
    'garantia obra - griffo': 'Garantia de Obra', 'garantia de obra - griffo': 'Garantia de Obra',
    'solicitado orcamento': 'Solicitado Orçamento', 'orçamento solicitado': 'Solicitado Orçamento', 'orcamento solicitado': 'Solicitado Orçamento',
    'servico realizado': 'Serviço Realizado',
    'aguardando visita tecnica': 'Aguardando visita', 'aguardando visita técnica': 'Aguardando visita',
    'devolvido escola': 'Devolvido para a escola', 'devolvido para escola': 'Devolvido para a escola'
  };
  const REGRAS = {
    'Em análise': { tela: 'triagem', proximos: ['Atendimento Emergencial', 'Solicitado Orçamento', 'Aguardando visita', 'Devolvido para a escola'] },
    'Aguardando visita': { tela: 'fila', filaVisita: true, proximos: ['Devolvido para a escola', 'Atendimento Emergencial', 'Solicitado Orçamento'] },
    'Solicitado Orçamento': { tela: 'empresa', exigeValorOrcamento: true, exigeObservacao: true, anexoPermitido: 'orcamento', bloqueiaEquipe: true, proximos: ['Orçamento Realizado'] },
    'Orçamento Realizado': { tela: 'aprovacao', exigeAprovacao: true, proximos: ['OS emitida', 'Solicitado Orçamento', 'A cargo da unidade escolar', 'Devolvido para a escola'] },
    'OS emitida': { tela: 'empresa', exigeEquipeDia: true, exigeObservacao: true, anexoPermitido: 'servico', proximos: ['Serviço Realizado'] },
    'Atendimento Emergencial': { tela: 'empresa', exigeEquipeDia: true, exigeObservacao: true, anexoPermitido: 'servico', proximos: ['Serviço Realizado'] },
    'Garantia de Obra': { tela: 'empresa', exigeEquipeDia: true, exigeObservacao: true, anexoPermitido: 'servico', proximos: ['Serviço Realizado'] },
    'Em atendimento': { tela: 'fila', legado: true, proximos: ['Serviço Realizado', 'Devolvido para a escola', 'Solicitado Orçamento', 'Atendimento Emergencial'] },
    'Serviço Realizado': { tela: 'triagem', proximos: ['Concluído', 'Garantia de Obra', 'Devolvido para a escola'] },
    'Visita Técnica': { tela: 'fila', legado: true, proximos: ['Devolvido para a escola', 'Atendimento Emergencial', 'Solicitado Orçamento'] },
    'Devolvido para a escola': { tela: 'memorial', finalizado: true, proximos: [] },
    'Concluído': { tela: 'memorial', finalizado: true, proximos: [] },
    'Encaminhado para outra gerência ou Unidade escolar.': { tela: 'memorial', finalizado: true, proximos: [] },
    'A cargo da unidade escolar': { tela: 'memorial', finalizado: true, proximos: [] },
    'Duplicado': { tela: 'memorial', finalizado: true, proximos: [] }
  };
  function _norm(s) { return String(s || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  function normalizarStatus(status) {
    const txt = String(status || '').trim(); const n = _norm(txt);
    if (!n) return 'Em análise';
    if (ALIASES[n]) return ALIASES[n];
    const achado = TODOS.find(st => _norm(st) === n);
    return achado || txt;
  }
  function regra(s) { return REGRAS[normalizarStatus(s)] || { tela: 'triagem', proximos: TODOS }; }
  function telaDoStatus(s) { return regra(s).tela || 'triagem'; }
  function proximosStatus(s) { return regra(s).proximos || []; }
  function podeTransicionar(de, para) { const o = normalizarStatus(de), d = normalizarStatus(para); if (o === d) return true; return proximosStatus(o).includes(d); }
  function getRegrasPublicas() { return { regras: REGRAS, status: { TODOS: TODOS }, cores: CORES, obras: STATUS_OBRAS }; }
  const STATUS_OBRAS = ['Aguardando', 'Em projeto', 'Em licitação', 'Em execução', 'Suspensa', 'Concluída', 'Arquivada'];

  // ── Observações com carimbo (replica appendObservation_) ────────────────────
  function appendObservacao(atual, nova, contexto) {
    const obs = String(nova || '').trim();
    if (!obs) return String(atual || '');
    const prefixo = `[${nowText()}]${contexto ? ' ' + contexto : ''}`;
    return [String(atual || '').trim(), `${prefixo}: ${obs}`].filter(Boolean).join('\n');
  }

  // ── Linha do banco (solicitacoes + join escola) → objeto do frontend ────────
  // anexosMap: { [solicitacao_id]: { solicitacao:[{nome,url}], orcamento:[...], servico:[...] } }
  function mapChamado(row, anexosMap) {
    row = row || {};
    const escola = row.escola || row.escolas || {};
    const status = normalizarStatus(row.situacao);
    const ax = (anexosMap && anexosMap[row.id]) || {};
    const J = a => JSON.stringify(a || []);
    return {
      id: row.id,
      situacao: status, status: status,
      data: fmtData(row.data_abertura), dataRaw: toMs(row.data_abertura),
      dataHora: fmtDataHora(row.data_abertura),
      sistema: row.origem || '',
      unidade: (escola && escola.nome) || row.unidade_escolar || '',
      detalhamento: row.detalhamento || '',
      classificacao: row.classificacao || '',
      resolvido: row.resolvido === true ? 'Sim' : (row.resolvido === false ? '' : (row.resolvido || '')),
      visitaTecnica: '', emissaoOrcamento: '', ordemServico: '',
      dataConclusao: fmtDataHora(row.data_conclusao), responsavel: row.responsavel || '',
      observacaoAntiga: row.observacao_antiga || '',
      numeroOs: row.numero_os || '', auxiliar: row.numero_os || '',
      tipo: row.tipo || (escola && escola.tipo) || '',
      equipe: row.equipe_responsavel || '',
      dataHoraUltimaAcao: fmtDataHora(row.data_hora_ultima_acao),
      dataHoraEntradaFila: fmtDataHora(row.data_hora_entrada_fila),
      dataEntradaFilaRaw: toMs(row.data_hora_entrada_fila),
      anexos: J(ax.solicitacao), observacoes: String(row.observacoes || '').trim(),
      valorOrcamento: row.valor_orcamento != null ? row.valor_orcamento : '',
      dataEquipe: fmtData(row.data_equipe), dataEquipeRaw: toYmd(row.data_equipe),
      anexosOrcamento: J(ax.orcamento), anexosServico: J(ax.servico),
      dataHoraEncaminhamento: fmtDataHora(row.data_hora_encaminhamento), dataEncaminhamentoRaw: toMs(row.data_hora_encaminhamento),
      dataPrevistaConclusao: fmtData(row.data_prevista_conclusao), dataPrevistaConclusaoRaw: toMs(row.data_prevista_conclusao),
      dataConclusaoOs: fmtDataHora(row.data_conclusao_os), dataConclusaoOsRaw: toMs(row.data_conclusao_os),
      dataAgendamentoVisita: fmtData(row.data_agendamento_visita), dataAgendamentoVisitaRaw: toYmd(row.data_agendamento_visita),
      telaFluxo: telaDoStatus(status), corStatus: CORES[status] || '#002b5e',
      temEquipeDiaValida: !!(row.equipe_responsavel && toYmd(row.data_equipe) && toYmd(row.data_equipe) === todayKey()),
      precisaRevisaoFila: status === 'Em atendimento' && !row.data_hora_entrada_fila
    };
  }

  function mapObra(row) {
    row = row || {};
    const escola = row.escola || row.escolas || {};
    const tipoObra = row.tipo_obra || '';
    const prazoFmt = fmtData(row.prazo_previsto);
    return {
      id: row.id, codigo: 'OBRA-' + row.id,
      unidade: (escola && escola.nome) || row.unidade_escolar || '',
      tipo: tipoObra, descricao: row.descricao || '',
      status: row.status || 'Aguardando', prioridade: row.prioridade || 'P3',
      responsavel: row.responsavel || '', responsavel2: row.responsavel2 || '',
      prazo: prazoFmt || tipoObra,
      dataTermino: fmtData(row.prazo_previsto),
      valorEstimado: row.valor_estimado != null
        ? 'R$ ' + Number(row.valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
        : '',
      observacoes: row.observacoes || '', link: '',
      dataHoraUltimaAcao: fmtDataHora(row.data_hora_ultima_acao || row.updated_at),
      dataHoraUltimaAtualizacao: fmtDataHora(row.updated_at)
    };
  }

  return {
    TZ, fmtData, fmtDataHora, nowText, todayKey, toMs, toYmd,
    CORES, ALIASES, REGRAS, STATUS_OBRAS, normalizarStatus, telaDoStatus,
    proximosStatus, podeTransicionar, getRegrasPublicas, appendObservacao,
    mapChamado, mapObra
  };
})();
