/* ============================================================================
 * GOM | SME — Camada de dados (Supabase)
 * ----------------------------------------------------------------------------
 * Reproduz as funções do backend Apps Script (Code.js / Services) como
 * consultas ao Supabase, devolvendo os MESMOS formatos que o frontend espera.
 * Funções de leitura "...V3Json/V1Json" retornam STRING JSON (igual ao GAS).
 * ========================================================================== */
window.GomDados = (function () {
  'use strict';
  const M = window.GomMap;
  const SEL_CHAMADO = '*, escola:escolas(nome,tipo)';

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function _err(ctx, e) { const msg = (e && e.message) ? e.message : String(e); throw new Error(ctx + ': ' + msg); }
  function _nowISO() { return new Date().toISOString(); }
  function _num(v) {
    if (v === '' || v == null) return null;
    if (typeof v === 'number') return v;
    let s = String(v).replace(/[^\d,.-]/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') > -1) s = s.replace(',', '.');
    const n = parseFloat(s); return isNaN(n) ? null : n;
  }
  function _date(v) {
    if (!v) return null;
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}` : s;
  }
  async function _getChamado(id) {
    const r = await window.SB.from('solicitacoes').select(SEL_CHAMADO).eq('id', id).maybeSingle();
    if (r.error) _err('Buscar chamado', r.error);
    if (!r.data) throw new Error('Chamado não encontrado: ' + id);
    return r.data;
  }
  async function _update(id, updates) {
    updates.data_hora_ultima_acao = updates.data_hora_ultima_acao || _nowISO();
    const r = await window.SB.from('solicitacoes').update(updates).eq('id', id);
    if (r.error) _err('Atualizar chamado', r.error);
    return true;
  }
  async function _log(entry) {
    try { await window.SB.from('log_acoes').insert(Object.assign({ usuario: '' }, entry)); } catch (e) { console.warn('[GOM] log:', e.message); }
  }
  async function _atendimento(entry) {
    try { await window.SB.from('historico_equipes').insert(entry); } catch (e) { console.warn('[GOM] histórico:', e.message); }
  }
  async function _escolaIdPorNome(nome) {
    if (!nome) return null;
    const r = await window.SB.from('escolas').select('id,tipo').ilike('nome', String(nome).trim()).maybeSingle();
    return r.data || null;
  }

  /* ══════════════════════════ LEITURAS ══════════════════════════ */

  async function listarChamados() {
    const r = await window.SB.from('solicitacoes').select(SEL_CHAMADO).order('id', { ascending: true });
    if (r.error) return JSON.stringify({ ok: false, total: 0, chamados: [], erro: r.error.message });
    const ids = (r.data || []).map(x => x.id);
    let anexosMap = {};
    try { anexosMap = await window.GomAnexos.mapaPorChamado(ids); } catch (e) { console.warn('[GOM] anexos:', e.message); }
    const chamados = (r.data || []).map(row => M.mapChamado(row, anexosMap));
    return JSON.stringify({ ok: true, versao: 'v3-supabase', total: chamados.length, geradoEm: M.nowText(), chamados });
  }

  async function getDadosIniciais() {
    const [esc, eqSec, eqEmp] = await Promise.all([
      window.SB.from('escolas').select('nome,tipo,endereco,telefone,email').order('nome'),
      window.SB.from('equipes').select('nome').eq('tipo', 'secretaria').eq('ativo', true).order('nome'),
      window.SB.from('equipes').select('nome').eq('tipo', 'empresa').eq('ativo', true).order('nome')
    ]);
    const escolas = (esc.data || []).map(e => ({ nome: e.nome, tipo: e.tipo || '', endereco: e.endereco || '', telefone: e.telefone || '', email: e.email || '' }));
    const equipes = (eqSec.data || []).map(e => e.nome);
    const equipesEmpresa = (eqEmp.data || []).map(e => e.nome);
    return { escolas, equipes, equipesEmpresa, fluxo: M.getRegrasPublicas() };
  }

  function usuarioAtual() {
    // Fase 4 (login) substitui isto. Hoje = modo ABERTO (acesso total), igual ao Apps Script.
    const telas = ['dashboard', 'triagem', 'fila', 'aprovacao', 'empresa', 'campo', 'alertas', 'obras', 'historico', 'relatorios', 'cadastro', 'acompanhar', 'configuracoes'];
    const acoes = {};
    ['criar_solicitacao', 'editar_chamado', 'empresa_editar', 'obras_editar', 'cobranca_empresa', 'configuracoes_editar', 'ver_dashboard', 'ver_relatorios'].forEach(a => acoes[a] = true);
    return JSON.stringify({ ok: true, usuario: { ok: true, email: '', perfil: 'ADMIN_GOM', perfilLabel: 'Administrador GOM', modo: 'ABERTO', restrito: false, telas, paginaInicial: 'dashboard', unidades: [], acoes } });
  }

  async function listarObras() {
    const r = await window.SB.from('obras').select('*, escola:escolas(nome)').order('id', { ascending: false });
    if (r.error) return JSON.stringify({ ok: false, total: 0, obras: [], erro: r.error.message });
    const obras = (r.data || []).map(M.mapObra);
    return JSON.stringify({ ok: true, versao: 'obras-v3-supabase', total: obras.length, geradoEm: M.nowText(), obras });
  }

  async function listarCampo() {
    const campoStatus = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
    const jsonChamados = JSON.parse(await listarChamados());
    const chamados = (jsonChamados.chamados || []).filter(c => campoStatus.includes(c.situacao));
    let historico = [];
    try {
      const h = await window.SB.from('historico_equipes').select('*').order('registrado_em', { ascending: false }).limit(300);
      historico = (h.data || []).map(x => ({
        id: x.solicitacao_id, unidade: '', status: x.status || '', numeroOs: x.numero_os || '',
        equipe: x.equipe || '', observacoes: x.observacoes_dia || '',
        dataAtendimento: M.fmtData(x.data_atendimento), dataAtendimentoRaw: M.toYmd(x.data_atendimento),
        dataRegistro: M.fmtDataHora(x.registrado_em), tipoRegistro: x.tipo_registro || ''
      }));
    } catch (e) { historico = []; }
    const hoje = M.todayKey();
    const preenchidosHoje = new Set(historico.filter(h => h.dataAtendimentoRaw === hoje).map(h => String(h.id)));
    const dados = {
      data: M.fmtData(new Date()), chamados, historico,
      kpis: {
        osAbertas: chamados.filter(c => c.situacao === 'OS emitida').length,
        emergenciais: chamados.filter(c => c.situacao === 'Atendimento Emergencial').length,
        osSemNumero: chamados.filter(c => c.situacao === 'OS emitida' && !c.numeroOs).length,
        escolasEmAtendimento: new Set(chamados.map(c => c.unidade).filter(Boolean)).size,
        preenchidosHoje: preenchidosHoje.size,
        pendentesHoje: chamados.filter(c => !preenchidosHoje.has(String(c.id))).length
      }
    };
    return JSON.stringify({ ok: true, versao: 'campo-supabase', total: chamados.length, dados });
  }

  async function listarConfiguracoes() {
    const r = await window.SB.from('configuracoes').select('*');
    if (r.error) return JSON.stringify({ ok: false, total: 0, grupos: [], configuracoes: [], erro: r.error.message });
    const lista = (r.data || []).map((d, i) => ({
      ordem: i + 1, chave: d.chave, valor: d.valor == null ? '' : String(d.valor),
      grupo: d.grupo || 'Sistema', descricao: d.descricao || '', ativo: d.ativo === false ? 'NÃO' : 'SIM', padrao: ''
    })).sort((a, b) => String(a.grupo).localeCompare(String(b.grupo)) || String(a.chave).localeCompare(String(b.chave)));
    const grupos = []; lista.forEach(i => { if (grupos.indexOf(i.grupo) === -1) grupos.push(i.grupo); });
    return JSON.stringify({ ok: true, total: lista.length, grupos, configuracoes: lista });
  }

  async function timeline(id) {
    const r = await window.SB.from('log_acoes').select('*').eq('solicitacao_id', id).order('registrado_em', { ascending: true });
    if (r.error) return JSON.stringify({ ok: false, eventos: [], erro: r.error.message });
    const eventos = (r.data || []).map(x => ({
      data: M.fmtDataHora(x.registrado_em), usuario: x.usuario || '', acao: x.acao || '',
      statusAnterior: x.status_anterior || '', statusNovo: x.status_novo || '',
      observacao: x.observacao || '', equipe: x.equipe || '', valorOrcamento: x.valor_orcamento || ''
    }));
    return JSON.stringify({ ok: true, id, total: eventos.length, eventos, timeline: eventos });
  }

  /* ══════════════════════════ ESCRITAS ══════════════════════════ */

  async function atualizarChamado(p) {
    const id = p.id; const atual = await _getChamado(id);
    const stAnt = M.normalizarStatus(atual.situacao);
    const recebida = String(p.situacao || p.status || '').trim();
    const stNovo = recebida ? M.normalizarStatus(recebida) : stAnt;
    const mudou = stNovo !== stAnt;
    if (recebida && mudou && !M.podeTransicionar(stAnt, stNovo)) throw new Error('Transição não permitida: ' + stAnt + ' → ' + stNovo);

    const u = {};
    if (recebida && mudou) u.situacao = stNovo;
    if (p.observacoes !== undefined) u.observacoes = M.appendObservacao(atual.observacoes, p.observacoes, stNovo);
    if (p.valorOrcamento !== undefined && p.valorOrcamento !== '') u.valor_orcamento = _num(p.valorOrcamento);
    if (p.numeroOs !== undefined) u.numero_os = p.numeroOs || '';
    if (p.dataPrevistaConclusao !== undefined) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao);
    if (p.equipe !== undefined) { u.equipe_responsavel = p.equipe || ''; if (p.equipe) u.data_equipe = _nowISO(); }
    if (p.dataAgendamentoVisita !== undefined && p.dataAgendamentoVisita !== '') u.data_agendamento_visita = _date(p.dataAgendamentoVisita);
    if (['Aguardando visita', 'Em atendimento'].includes(stNovo) && !atual.data_hora_entrada_fila) u.data_hora_entrada_fila = _nowISO();
    if (['Solicitado Orçamento', 'Atendimento Emergencial', 'OS emitida', 'Aguardando visita'].includes(stNovo) && mudou) u.data_hora_encaminhamento = _nowISO();
    if (stNovo === 'Devolvido para a escola') u.data_conclusao_os = _nowISO();
    if (Array.isArray(p.anexosAtualizacao) && p.anexosAtualizacao.length) await window.GomAnexos.upload(id, 'solicitacao', p.anexosAtualizacao);

    await _update(id, u);
    if (p.dataAgendamentoVisita) await _atendimento({ solicitacao_id: id, status: stNovo, numero_os: atual.numero_os || '', equipe: p.equipe || atual.equipe_responsavel || '', observacoes_dia: p.observacoes || '', data_atendimento: _date(p.dataAgendamentoVisita), tipo_registro: 'Agendamento de visita' });
    await _log({ solicitacao_id: id, acao: 'Chamado atualizado', status_anterior: mudou ? stAnt : '', status_novo: mudou ? stNovo : stAnt, observacao: p.observacoes || '', valor_orcamento: _num(p.valorOrcamento), equipe: p.equipe || '' });
    return { ok: true, id, status: stNovo };
  }

  async function criarSolicitacao(p) {
    const esc = await _escolaIdPorNome(p.unidade);
    const origem = p.sistema === 'Solar' ? ('Solar ' + (p.num_processo || '')).trim() : (p.sistema || 'Cadastro interno');
    const situacao = M.normalizarStatus(p.situacao || 'Em análise');
    const ins = await window.SB.from('solicitacoes').insert({
      data_abertura: _nowISO(), origem, escola_id: esc ? esc.id : null, tipo: p.tipo || (esc ? esc.tipo : ''),
      detalhamento: p.detalhamento || '', situacao, observacoes: M.appendObservacao('', p.observacoes, 'Cadastro interno'),
      data_hora_ultima_acao: _nowISO()
    }).select('id').single();
    if (ins.error) _err('Criar solicitação', ins.error);
    const id = ins.data.id;
    if (Array.isArray(p.anexos) && p.anexos.length) await window.GomAnexos.upload(id, 'solicitacao', p.anexos);
    await _log({ solicitacao_id: id, acao: 'Chamado criado', status_novo: situacao, observacao: p.observacoes || '', origem: 'cadastro interno' });
    return { ok: true, id };
  }

  async function criarSolicitacaoEscola(p) {
    const esc = await _escolaIdPorNome(p.unidade);
    const detalhe = [
      ['Responsável', p.nome_responsavel], ['Cargo/Função', p.cargo], ['Telefone/WhatsApp', p.telefone],
      ['Tipo principal', p.tipo_solicitacao], ['Local da ocorrência', p.local_ocorrencia], ['Descrição', p.descricao],
      ['Urgente', p.urgente], ['Risco', p.risco], ['Observações adicionais', p.observacoes_adicionais]
    ].filter(x => x[1]).map(x => `${x[0]}: ${x[1]}`).join('\n');
    const ins = await window.SB.from('solicitacoes').insert({
      data_abertura: _nowISO(), origem: 'Formulário Escola', escola_id: esc ? esc.id : null, tipo: esc ? esc.tipo : '',
      detalhamento: detalhe, situacao: 'Em análise', observacoes: M.appendObservacao('', p.observacoes_adicionais, 'Cadastro da escola'), data_hora_ultima_acao: _nowISO()
    }).select('id').single();
    if (ins.error) _err('Criar solicitação (escola)', ins.error);
    const id = ins.data.id;
    if (Array.isArray(p.anexos) && p.anexos.length) await window.GomAnexos.upload(id, 'solicitacao', p.anexos);
    await _log({ solicitacao_id: id, acao: 'Chamado criado pela escola', status_novo: 'Em análise', origem: 'cadastro escola' });
    return { ok: true, id };
  }

  async function salvarEquipeDiaEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    const equipe = String(p.equipe || '').trim();
    if (!equipe) throw new Error('Selecione a equipe do dia.');
    const u = { equipe_responsavel: equipe, data_equipe: _nowISO(), observacoes: M.appendObservacao(atual.observacoes, p.observacoes, 'Equipe do dia'), data_hora_ultima_acao: _nowISO() };
    if (p.numeroOs !== undefined) u.numero_os = p.numeroOs || atual.numero_os || '';
    if (p.dataPrevistaConclusao) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao);
    await _update(id, u);
    await _atendimento({ solicitacao_id: id, status: atual.situacao, numero_os: p.numeroOs || atual.numero_os || '', equipe, observacoes_dia: p.observacoes || '', data_prevista_conclusao: _date(p.dataPrevistaConclusao), data_atendimento: _date(p.dataAgendamentoVisita || p.dataAtendimento) || M.todayKey(), tipo_registro: 'Equipe do dia' });
    await _log({ solicitacao_id: id, acao: 'Equipe do dia registrada', status_anterior: atual.situacao, status_novo: atual.situacao, observacao: p.observacoes || '', equipe });
    return true;
  }

  async function salvarEquipesDiaEmpresaLote(lista) {
    if (!Array.isArray(lista) || !lista.length) return { ok: true, salvos: 0, erros: [] };
    let salvos = 0; const erros = [];
    for (let i = 0; i < lista.length; i++) { try { await salvarEquipeDiaEmpresa(lista[i]); salvos++; } catch (e) { erros.push({ idx: i, id: lista[i].id || '', erro: e.message }); } }
    return { ok: erros.length === 0, salvos, erros };
  }

  async function salvarRespostaOrcamentoEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    if (Array.isArray(p.anexosOrcamento) && p.anexosOrcamento.length) await window.GomAnexos.upload(id, 'orcamento', p.anexosOrcamento);
    const u = { situacao: 'Orçamento Realizado', valor_orcamento: _num(p.valorOrcamento), observacoes: M.appendObservacao(atual.observacoes, p.observacoes, 'Orçamento realizado'), data_hora_ultima_acao: _nowISO() };
    if (p.dataPrevistaConclusao) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao);
    await _update(id, u);
    await _log({ solicitacao_id: id, acao: 'Orçamento realizado pela empresa', status_anterior: atual.situacao, status_novo: 'Orçamento Realizado', observacao: p.observacoes || '', valor_orcamento: _num(p.valorOrcamento) });
    return true;
  }

  async function salvarServicoRealizadoEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    if (Array.isArray(p.anexosServico) && p.anexosServico.length) await window.GomAnexos.upload(id, 'servico', p.anexosServico);
    const u = { situacao: 'Serviço Realizado', equipe_responsavel: p.equipe || atual.equipe_responsavel || '', observacoes: M.appendObservacao(atual.observacoes, p.observacoes, 'Serviço realizado'), data_hora_ultima_acao: _nowISO() };
    if (p.equipe) u.data_equipe = _nowISO();
    await _update(id, u);
    await _log({ solicitacao_id: id, acao: 'Serviço realizado pela empresa', status_anterior: atual.situacao, status_novo: 'Serviço Realizado', observacao: p.observacoes || '', equipe: p.equipe || '' });
    return true;
  }

  async function aprovarOrcamento(p) {
    const id = p.id; const atual = await _getChamado(id);
    const numeroOs = String(p.numeroOs || atual.numero_os || '').trim();
    if (!numeroOs) throw new Error('Informe o número da OS para aprovar o orçamento.');
    const u = { situacao: 'OS emitida', numero_os: numeroOs, observacoes: M.appendObservacao(atual.observacoes, p.observacoes, 'Orçamento aprovado'), data_hora_ultima_acao: _nowISO(), data_hora_encaminhamento: _nowISO() };
    if (p.dataPrevistaConclusao) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao);
    await _update(id, u);
    await _log({ solicitacao_id: id, acao: 'Orçamento aprovado e OS emitida', status_anterior: atual.situacao, status_novo: 'OS emitida', observacao: p.observacoes || '' });
    return true;
  }

  async function salvarDecisaoAprovacao(p) {
    const id = p.id; const atual = await _getChamado(id);
    const stAnt = M.normalizarStatus(atual.situacao);
    if (stAnt !== 'Orçamento Realizado') throw new Error('Este chamado não está aguardando aprovação de orçamento.');
    const dec = String(p.decisao || '').trim().toLowerCase();
    const parecer = p.parecerInterno || p.observacoes || '';
    const mapa = { 'aprovar': ['OS emitida', 'Orçamento aprovado'], 'ajuste': ['Solicitado Orçamento', 'Orçamento devolvido para ajuste'], 'negar': ['A cargo da unidade escolar', 'Orçamento negado'], 'devolver escola': ['Devolvido para a escola', 'Orçamento devolvido para a escola'], 'devolver_escola': ['Devolvido para a escola', 'Orçamento devolvido para a escola'] };
    const r = mapa[dec]; if (!r) throw new Error('Decisão inválida.');
    const [stNovo, rotulo] = r;
    const u = { situacao: stNovo, observacoes: M.appendObservacao(atual.observacoes, parecer, rotulo), data_hora_ultima_acao: _nowISO() };
    if (stNovo === 'OS emitida') { const n = String(p.numeroOs || '').trim(); if (!n) throw new Error('Informe o número da OS para aprovar.'); u.numero_os = n; u.data_hora_encaminhamento = _nowISO(); if (p.dataPrevistaConclusao) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao); }
    if (stNovo === 'Solicitado Orçamento') u.data_hora_encaminhamento = _nowISO();
    if (['A cargo da unidade escolar', 'Devolvido para a escola'].includes(stNovo)) u.data_conclusao_os = _nowISO();
    if (Array.isArray(p.anexosAtualizacao) && p.anexosAtualizacao.length) await window.GomAnexos.upload(id, 'solicitacao', p.anexosAtualizacao);
    await _update(id, u);
    await _log({ solicitacao_id: id, acao: rotulo, status_anterior: stAnt, status_novo: stNovo, observacao: parecer });
    return { ok: true, id, status: stNovo };
  }

  async function atualizarPrevisaoOsEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    const st = M.normalizarStatus(atual.situacao);
    if (!['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Serviço Realizado'].includes(st)) throw new Error('A previsão só pode ser alterada em OS, emergência, garantia ou serviço realizado.');
    await _update(id, { data_prevista_conclusao: _date(p.dataPrevistaConclusao) });
    await _log({ solicitacao_id: id, acao: 'Previsão de conclusão atualizada pela empresa', status_anterior: st, status_novo: st });
    return true;
  }

  async function finalizarOsEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    if (Array.isArray(p.anexosServico) && p.anexosServico.length) await window.GomAnexos.upload(id, 'servico', p.anexosServico);
    const u = { situacao: 'Serviço Realizado', observacoes: M.appendObservacao(atual.observacoes, p.observacoes, 'Serviço realizado pela empresa'), data_hora_ultima_acao: _nowISO(), data_conclusao_os: _nowISO() };
    if (p.equipe) { u.equipe_responsavel = p.equipe; u.data_equipe = _nowISO(); }
    if (p.numeroOs !== undefined) u.numero_os = p.numeroOs || atual.numero_os || '';
    await _update(id, u);
    await _atendimento({ solicitacao_id: id, status: 'Serviço Realizado', numero_os: p.numeroOs || atual.numero_os || '', equipe: p.equipe || atual.equipe_responsavel || '', observacoes_dia: p.observacoes || '', data_conclusao: M.todayKey(), data_atendimento: M.todayKey(), tipo_registro: 'Finalização OS' });
    await _log({ solicitacao_id: id, acao: 'OS finalizada pela empresa', status_anterior: atual.situacao, status_novo: 'Serviço Realizado', observacao: p.observacoes || '', equipe: p.equipe || '' });
    return true;
  }

  async function salvarNovaEquipe(nome, tipo) {
    const n = String(nome || '').trim(); if (!n) throw new Error('Informe o nome da equipe.');
    const t = String(tipo || 'secretaria').trim() === 'empresa' ? 'empresa' : 'secretaria';
    const r = await window.SB.from('equipes').upsert({ nome: n, tipo: t, ativo: true }, { onConflict: 'nome,tipo' });
    if (r.error) _err('Salvar equipe', r.error);
    return true;
  }

  async function atualizarObra(p) {
    const id = p.id;
    const esc = p.unidade ? await _escolaIdPorNome(p.unidade) : null;
    const dados = {
      tipo_obra: p.tipo || p.tipoObra, descricao: p.descricao, status: p.status, prioridade: p.prioridade,
      responsavel: p.responsavel, responsavel2: p.responsavel2, prazo_previsto: _date(p.prazo || p.prazoPrevisto),
      valor_estimado: _num(p.valorEstimado), observacoes: p.observacoes, data_hora_ultima_acao: _nowISO()
    };
    if (esc) dados.escola_id = esc.id;
    Object.keys(dados).forEach(k => { if (dados[k] === undefined) delete dados[k]; });
    let r;
    if (id) r = await window.SB.from('obras').update(dados).eq('id', id);
    else r = await window.SB.from('obras').insert(dados);
    if (r.error) _err('Salvar obra', r.error);
    return { ok: true, id: id || null };
  }

  async function salvarConfiguracoes(lista) {
    if (!Array.isArray(lista)) lista = [lista];
    const rows = lista.filter(i => i && i.chave).map(i => ({
      chave: String(i.chave).trim(), valor: i.valor == null ? '' : String(i.valor),
      grupo: String(i.grupo || 'Personalizadas').trim(), descricao: String(i.descricao || '').trim(),
      ativo: !(String(i.ativo || 'SIM').toUpperCase().startsWith('N'))
    }));
    if (rows.length) { const r = await window.SB.from('configuracoes').upsert(rows, { onConflict: 'chave' }); if (r.error) _err('Salvar configurações', r.error); }
    return await listarConfiguracoes();
  }

  async function registrarComplementoEscola(p) {
    const id = p.id; const atual = await _getChamado(id);
    if (Array.isArray(p.anexos) && p.anexos.length) await window.GomAnexos.upload(id, 'solicitacao', p.anexos);
    await _update(id, { observacoes: M.appendObservacao(atual.observacoes, p.complemento || p.observacoes, 'Complemento da escola') });
    await _log({ solicitacao_id: id, acao: 'Complemento registrado pela escola', observacao: p.complemento || p.observacoes || '', origem: 'portal escola' });
    return { ok: true, id };
  }

  return {
    listarChamados, getDadosIniciais, usuarioAtual, listarObras, listarCampo, listarConfiguracoes, timeline,
    atualizarChamado, criarSolicitacao, criarSolicitacaoEscola, salvarEquipeDiaEmpresa, salvarEquipesDiaEmpresaLote,
    salvarRespostaOrcamentoEmpresa, salvarServicoRealizadoEmpresa, aprovarOrcamento, salvarDecisaoAprovacao,
    atualizarPrevisaoOsEmpresa, finalizarOsEmpresa, salvarNovaEquipe, atualizarObra, salvarConfiguracoes, registrarComplementoEscola
  };
})();
