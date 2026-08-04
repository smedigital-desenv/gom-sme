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
  const SEL_CHAMADO = '*, escola:escolas(nome,tipo,endereco,email)';

  const CONFIGS_PADRAO = [
    ['LOGIN_ATIVO','SIM','Login','Ativa a tela de login obrigatória antes de exibir informações do sistema.',true],
    ['LOGIN_MODO','GOOGLE_PIN','Login','Modelo de acesso: Google institucional para Secretaria/GOM e PIN para Empresa.',true],
    ['CODIGO_ACESSO_EMPRESA','12344321','Login','Código de acesso da empresa para operação sem e-mail institucional.',true],
    ['PERMISSOES_MODO','ABERTO','Permissões','ABERTO mantém acesso total para configuração/homologação. RESTRITO aplica perfis por e-mail.',true],
    ['EMAILS_ADMIN_GOM','','Permissões','E-mails administradores com acesso total.',true],
    ['EMAILS_SECRETARIA','','Permissões','E-mails da Secretaria. Acesso operacional, sem Configurações e sem Gerenciar Equipes.',true],
    ['EMAILS_EMPRESA_ADICIONAIS','','Permissões','E-mails adicionais da empresa, além de EMAIL_EMPRESA.',true],
    ['EMAILS_ESCOLA','','Permissões','E-mails das escolas. Acesso somente a Cadastro e Acompanhar chamados.',true],
    ['PERFIL_SEM_LOGIN','PUBLICO','Permissões','Perfil usado quando não há e-mail identificado. Sugestão: PUBLICO.',true],
    ['EMAIL_EMPRESA','','Empresa','E-mail da empresa que receberá cobranças e avisos operacionais.',true],
    ['NOME_EMPRESA','','Empresa','Nome da empresa responsável pelos atendimentos.',true],
    ['EMAIL_RESPONSAVEL_GOM','','Empresa','E-mail interno da GOM para cópias, avisos e alertas.',true],
    ['HORARIO_LIMITE_CAMPO','11:00','Empresa','Horário limite para a empresa registrar as equipes do dia.',true],
    ['SLA_ANALISE_DIAS','3','Prazos/SLA','Prazo máximo desejado para chamados novos/em análise sem movimentação.',true],
    ['SLA_VISITA_DIAS','3','Prazos/SLA','Prazo máximo desejado para chamados aguardando visita.',true],
    ['SLA_ORCAMENTO_DIAS','5','Prazos/SLA','Prazo máximo desejado para retorno de orçamento solicitado.',true],
    ['SLA_APROVACAO_DIAS','2','Prazos/SLA','Prazo máximo desejado para análise de orçamento realizado.',true],
    ['SLA_OS_DIAS','7','Prazos/SLA','Prazo de referência para execução de OS emitida.',true],
    ['SLA_FINALIZACAO_DIAS','2','Prazos/SLA','Prazo para validação interna após serviço realizado.',true],
    ['ALERTA_COBRANCA_CAMPO_ATIVO','SIM','Alertas','Ativa cobrança automática quando não houver preenchimento diário da empresa.',true],
    ['ALERTA_EMAIL_EMPRESA_ATIVO','SIM','Alertas','Permite envio de e-mails de alerta para a empresa.',true],
    ['ALERTA_OS_SEM_NUMERO_ATIVO','SIM','Alertas','Destaca OS emitida sem numeração preenchida.',true],
    ['ALERTA_ORCAMENTO_SEM_RETORNO_ATIVO','SIM','Alertas','Destaca orçamentos solicitados sem retorno dentro do prazo.',true],
    ['ALERTA_ANALISE_PARADA_ATIVO','SIM','Alertas','Destaca chamados em análise sem interação acima do SLA.',true],
    ['ALERTA_VISITA_ATRASADA_ATIVO','SIM','Alertas','Destaca chamados aguardando visita acima do prazo configurado.',true],
    ['ALERTA_APROVACAO_PARADA_ATIVO','SIM','Alertas','Destaca orçamentos realizados aguardando decisão acima do SLA.',true],
    ['ALERTA_PREVISAO_VENCIDA_ATIVO','SIM','Alertas','Destaca OS com data prevista de conclusão vencida.',true],
    ['ALERTA_OS_SEM_PREVISAO_ATIVO','SIM','Alertas','Destaca OS em campo sem data prevista de conclusão.',true],
    ['ALERTA_SERVICO_SEM_FINALIZACAO_ATIVO','SIM','Alertas','Destaca serviço realizado ainda não finalizado no prazo.',true],
    ['NOME_SISTEMA','Gestão GOM','Sistema','Nome exibido nos e-mails e telas públicas.',true],
    ['SETOR_RESPONSAVEL','GOM | SME','Sistema','Identificação institucional do setor responsável.',true],
    ['TIMEZONE','America/Sao_Paulo','Sistema','Fuso horário utilizado nos registros e alertas.',true],
    ['LIMITE_ANEXOS','5','Anexos','Quantidade máxima de arquivos por envio.',true],
    ['TAMANHO_MAX_MB','8','Anexos','Tamanho máximo de cada anexo em MB.',true],
    ['STATUS_PADRAO_NOVO_CHAMADO','Em análise','Status','Status inicial padrão para novos chamados.',true],
    ['STATUS_DEVOLVIDO_MEMORIAL','Devolvido para a escola','Status','Status usado quando a solicitação é devolvida para a unidade e encerrada no Memorial.',true],
    ['OS_EMPRESA_NOME','ATLÂNTICA CONSTRUÇÕES, COMÉRCIO E SERVIÇOS LTDA','Ordem de Serviço','Nome da empresa destinatária exibido na Ordem de Serviço.',true],
    ['OS_PC_NUMERO','0290/2024','Ordem de Serviço','Número do PC usado na Ordem de Serviço.',true],
    ['OS_PREGAO_ELETRONICO','0157/2024','Ordem de Serviço','Número do Pregão Eletrônico usado na Ordem de Serviço.',true],
    ['OS_ATA_REGISTRO_PRECOS','177-01/2024','Ordem de Serviço','Ata de Registro de Preços usada na Ordem de Serviço.',true],
    ['OS_PRAZO_EXECUCAO','45 DIAS','Ordem de Serviço','Prazo de execução padrão exibido na Ordem de Serviço.',true],
    ['OS_NUMERO_INICIAL','','Ordem de Serviço','Número mínimo para a geração automática de OS no ano (ex.: 229). Em branco, segue a partir do maior número já existente.',true],
    ['EMAIL_ENVIO_ATIVO','SIM','E-mail','Interruptor mestre do envio automático de e-mails (visitas às escolas e alertas de SLA). Com NÃO, nada é enfileirado nem enviado; ao reativar, só novos eventos geram e-mail.',true],
    ['EMAIL_DEVOLUCAO_ATIVO','SIM','E-mail','Envia um e-mail à escola quando um chamado é devolvido para a escola, com o motivo da devolução.',true],
    ['EMAIL_DEVOLUCAO_ASSUNTO','Chamado #{{numero}} devolvido — {{escola}}','E-mail','Assunto do e-mail de devolução à escola. Variáveis: {{numero}}, {{escola}}, {{motivo}}.',true],
    ['EMAIL_DEVOLUCAO_CORPO','<p>Prezados responsáveis da <strong>{{escola}}</strong>,</p><p>O chamado <strong>#{{numero}}</strong> foi <strong>devolvido para a escola</strong> pela GOM.</p><p><strong>Motivo da devolução:</strong><br>{{motivo}}</p><p>Atenciosamente,<br><strong>GOM · SME Ribeirão Preto</strong></p>','E-mail','Corpo do e-mail de devolução à escola. Variáveis: {{numero}}, {{escola}}, {{motivo}}.',true]
  ];

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
  // Detecta se o chamado passou por "Atendimento Emergencial" em algum momento
  // (consulta o histórico). Usado para abrir a OS na conclusão do emergencial.
  async function _passouPorEmergencial(id) {
    try {
      const r = await window.SB
        .from('log_acoes')
        .select('id')
        .eq('solicitacao_id', id)
        .eq('status_novo', 'Atendimento Emergencial')
        .limit(1);
      if (r.error) return false;
      return (r.data || []).length > 0;
    } catch (e) { return false; }
  }
  async function _log(entry) {
    try { await window.SB.from('log_acoes').insert(Object.assign({ usuario: '' }, entry)); } catch (e) { window.gomWarn && window.gomWarn('[GOM] log:', e.message); }
  }
  async function _atendimento(entry) {
    try { await window.SB.from('historico_equipes').insert(entry); } catch (e) { window.gomWarn && window.gomWarn('[GOM] histórico:', e.message); }
  }
  async function _escolaIdPorNome(nome) {
    if (!nome) return null;
    const r = await window.SB.from('escolas').select('id,tipo').ilike('nome', String(nome).trim()).maybeSingle();
    return r.data || null;
  }

  function _configPadraoRows() {
    return CONFIGS_PADRAO.map(c => ({
      chave: c[0], valor: c[1], grupo: c[2], descricao: c[3], ativo: c[4] !== false
    }));
  }

  async function _garantirConfiguracoesPadrao() {
    const rows = _configPadraoRows();
    const up = await window.SB.from('configuracoes').upsert(rows, { onConflict: 'chave' }).select('*');
    if (up.error) {
      window.gomWarn && window.gomWarn('[GOM] Configurações padrão não criadas por política RLS:', up.error.message || up.error);
      return [];
    }
    const r = await window.SB.from('configuracoes').select('*').order('grupo', { ascending: true }).order('chave', { ascending: true });
    if (r.error) {
      window.gomWarn && window.gomWarn('[GOM] Configurações padrão criadas, mas não foi possível relistar:', r.error.message || r.error);
      return up.data || [];
    }
    return r.data || [];
  }



  /* ═══════════════════════ PERFIS x CONFIGURAÇÕES ═══════════════════════
   * A tela Configurações edita listas amigáveis como EMAILS_ADMIN_GOM.
   * Na migração para Supabase, a fonte operacional do login passou a ser a
   * tabela public.perfis. Estes helpers sincronizam as duas coisas:
   * - ao listar configurações, preenche as listas com os perfis ativos do banco;
   * - ao salvar configurações, grava os e-mails alterados também em public.perfis.
   * ===================================================================== */
  const PERFIL_CONFIG_MAP = {
    EMAILS_ADMIN_GOM: 'ADMIN_GOM',
    EMAILS_SECRETARIA: 'SECRETARIA',
    EMAILS_EMPRESA_ADICIONAIS: 'EMPRESA',
    EMAILS_ESCOLA: 'ESCOLA'
  };

  function _normalizarEmailLista(valor) {
    const vistos = {};
    return String(valor || '')
      .split(/[;,\n\r\t ]+/)
      .map(v => String(v || '').trim().toLowerCase())
      .filter(email => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
        if (vistos[email]) return false;
        vistos[email] = true;
        return true;
      });
  }

  function _nomePorEmail(email) {
    const base = String(email || '').split('@')[0] || '';
    return base
      .split(/[._-]+/)
      .filter(Boolean)
      .map(p => p.charAt(0).toUpperCase() + p.slice(1))
      .join(' ') || email;
  }

  async function _carregarPerfisComoConfiguracoes(configs) {
    configs = Array.isArray(configs) ? configs : [];
    if (!window.SB) return configs;

    let r;
    try {
      r = await window.SB
        .from('perfis')
        .select('email,perfil,ativo')
        .eq('ativo', true)
        .order('perfil', { ascending: true })
        .order('email', { ascending: true });
    } catch (e) {
      window.gomWarn && window.gomWarn('[GOM] Não foi possível consultar perfis para Configurações:', e.message || e);
      return configs;
    }
    if (r && r.error) {
      window.gomWarn && window.gomWarn('[GOM] Não foi possível consultar perfis para Configurações:', r.error.message || r.error);
      return configs;
    }

    const porPerfil = {};
    (r.data || []).forEach(row => {
      let perfil = String(row.perfil || '').trim().toUpperCase().replace(/-/g, '_');
      if (perfil === 'GOM') perfil = 'SECRETARIA';
      const email = String(row.email || '').trim().toLowerCase();
      if (!perfil || !email) return;
      if (!porPerfil[perfil]) porPerfil[perfil] = [];
      if (porPerfil[perfil].indexOf(email) === -1) porPerfil[perfil].push(email);
    });

    Object.keys(PERFIL_CONFIG_MAP).forEach(chave => {
      const perfil = PERFIL_CONFIG_MAP[chave];
      const emails = porPerfil[perfil] || [];
      let item = configs.find(c => String(c.chave || '').trim() === chave);
      if (!item) {
        const padrao = CONFIGS_PADRAO.find(c => c[0] === chave) || [chave, '', 'Permissões', '', true];
        item = { chave: padrao[0], valor: '', grupo: padrao[2], descricao: padrao[3], ativo: true };
        configs.push(item);
      }
      // A tabela perfis é a fonte principal do login. A tela passa a refletir os
      // perfis ativos do banco, não somente o texto salvo em configuracoes.
      item.valor = emails.join(', ');
      item.ativo = item.ativo === false ? false : true;
      item._origemPerfis = true;
    });

    return configs;
  }

  async function _upsertPerfilEmail(email, perfil) {
    email = String(email || '').trim().toLowerCase();
    perfil = String(perfil || '').trim().toUpperCase().replace(/-/g, '_');
    if (perfil === 'GOM') perfil = 'SECRETARIA';
    if (!email || !perfil) return;

    const existente = await window.SB
      .from('perfis')
      .select('email')
      .ilike('email', email)
      .maybeSingle();

    const dados = {
      email,
      perfil,
      ativo: true,
      nome: _nomePorEmail(email)
    };

    if (existente.error && existente.error.code !== 'PGRST116') _err('Buscar perfil ' + email, existente.error);

    if (existente.data && existente.data.email) {
      const upd = await window.SB
        .from('perfis')
        .update({ perfil, ativo: true, nome: dados.nome })
        .ilike('email', email);
      if (upd.error) _err('Atualizar perfil ' + email, upd.error);
    } else {
      const ins = await window.SB
        .from('perfis')
        .insert(dados);
      if (ins.error) _err('Criar perfil ' + email, ins.error);
    }
  }

  async function _sincronizarPerfisPorConfiguracoes(lista) {
    if (!Array.isArray(lista) || !window.SB) return;
    const alteradas = lista.filter(item => item && PERFIL_CONFIG_MAP[String(item.chave || '').trim()]);
    if (!alteradas.length) return;

    for (const item of alteradas) {
      const chave = String(item.chave || '').trim();
      const perfil = PERFIL_CONFIG_MAP[chave];
      const emailsNovos = _normalizarEmailLista(item.valor);

      // Desativa usuários removidos deste perfil na tela, sem apagar histórico.
      const atuais = await window.SB
        .from('perfis')
        .select('email')
        .eq('perfil', perfil)
        .eq('ativo', true);
      if (atuais.error) _err('Listar perfis ' + perfil, atuais.error);

      const setNovos = new Set(emailsNovos);
      for (const row of (atuais.data || [])) {
        const emailAtual = String(row.email || '').trim().toLowerCase();
        if (emailAtual && !setNovos.has(emailAtual)) {
          const des = await window.SB
            .from('perfis')
            .update({ ativo: false })
            .ilike('email', emailAtual)
            .eq('perfil', perfil);
          if (des.error) _err('Desativar perfil ' + emailAtual, des.error);
        }
      }

      for (const email of emailsNovos) {
        await _upsertPerfilEmail(email, perfil);
      }
    }
  }

  /* ══════════════════════════ LEITURAS ══════════════════════════ */

  async function listarChamados() {
    const r = await window.SB.from('solicitacoes').select(SEL_CHAMADO).order('id', { ascending: true });
    if (r.error) return JSON.stringify({ ok: false, total: 0, chamados: [], erro: r.error.message });
    const ids = (r.data || []).map(x => x.id);
    let anexosMap = {};
    try { anexosMap = await window.GomAnexos.mapaPorChamado(ids); } catch (e) { window.gomWarn && window.gomWarn('[GOM] anexos:', e.message); }
    const chamados = (r.data || []).map(row => M.mapChamado(row, anexosMap));
    return JSON.stringify({ ok: true, versao: 'v3-supabase', total: chamados.length, geradoEm: M.nowText(), chamados });
  }

  async function getDadosIniciais() {
    const [esc, eqSec, eqEmp] = await Promise.all([
      window.SB.from('escolas').select('id,nome,tipo,endereco,telefone,email').order('nome'),
      window.SB.from('equipes').select('nome').eq('tipo', 'secretaria').eq('ativo', true).order('nome'),
      window.SB.from('equipes').select('nome').eq('tipo', 'empresa').eq('ativo', true).order('nome')
    ]);
    const escolas = (esc.data || []).map(e => ({ id: e.id, nome: e.nome, tipo: e.tipo || '', endereco: e.endereco || '', telefone: e.telefone || '', email: e.email || '' }));
    const equipes = (eqSec.data || []).map(e => e.nome);
    const equipesEmpresa = (eqEmp.data || []).map(e => e.nome);
    return { escolas, equipes, equipesEmpresa, fluxo: M.getRegrasPublicas() };
  }

  function usuarioAtual() {
    // Fase 4 (login) substitui isto. Hoje = modo ABERTO (acesso total), igual ao Apps Script.
    const telas = ['dashboard', 'triagem', 'fila', 'aprovacao', 'empresa', 'campo', 'alertas', 'obras', 'historico', 'relatorios', 'cadastro', 'equipes', 'acompanhar', 'configuracoes'];
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
    const campoStatus = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Garantia de Serviço'];
    // Equipe da Educação: visitas da secretaria com equipe atribuída também entram no acompanhamento.
    const campoStatusEducacao = ['Aguardando visita', 'Em atendimento'];
    const jsonChamados = JSON.parse(await listarChamados());
    const chamados = (jsonChamados.chamados || []).filter(c =>
      campoStatus.includes(c.situacao) ||
      (campoStatusEducacao.includes(c.situacao) && String(c.equipe || '').trim())
    );
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
        pendentesHoje: chamados.filter(c => campoStatus.includes(c.situacao) && !preenchidosHoje.has(String(c.id))).length
      }
    };
    return JSON.stringify({ ok: true, versao: 'campo-supabase', total: chamados.length, dados });
  }

  async function listarConfiguracoes() {
    const r = await window.SB.from('configuracoes').select('*').order('grupo', { ascending: true }).order('chave', { ascending: true });
    if (r.error) return JSON.stringify({ ok: false, total: 0, grupos: [], configuracoes: [], erro: r.error.message });

    let dados = r.data || [];
    if (!dados.length) {
      try {
        window.gomWarn && window.gomWarn('[GOM] Tabela configuracoes vazia. Criando configurações padrão de homologação...');
        dados = await _garantirConfiguracoesPadrao();
      } catch (e) {
        window.gomWarn && window.gomWarn('[GOM] Falha ao criar configurações padrão:', e && e.message ? e.message : String(e));
        dados = [];
      }
    }

    dados = await _carregarPerfisComoConfiguracoes(dados || []);
    const chavesLegadasPerfis = ['EMAILS_GOM_OPERACIONAL', 'EMAILS_CAMPO', 'EMAILS_CONFERENTE'];
    dados = (dados || []).filter(d => chavesLegadasPerfis.indexOf(String(d.chave || '').trim()) < 0);
    const lista = dados.map((d, i) => ({
      ordem: i + 1, chave: d.chave, valor: d.valor == null ? '' : String(d.valor),
      grupo: d.grupo || 'Sistema', descricao: d.descricao || '', ativo: d.ativo === false ? 'NÃO' : 'SIM', padrao: '',
      origemPerfis: d._origemPerfis === true
    })).sort((a, b) => String(a.grupo).localeCompare(String(b.grupo)) || String(a.chave).localeCompare(String(b.chave)));
    const grupos = []; lista.forEach(i => { if (grupos.indexOf(i.grupo) === -1) grupos.push(i.grupo); });
    return JSON.stringify({ ok: true, total: lista.length, grupos, configuracoes: lista });
  }

  async function timeline(id) {
    const r = await window.SB.from('log_acoes').select('*').eq('solicitacao_id', id).order('registrado_em', { ascending: true });
    if (r.error) return JSON.stringify({ ok: false, eventos: [], erro: r.error.message });
    const eventos = (r.data || []).map(x => ({
      tipo: 'log',
      data: M.fmtDataHora(x.registrado_em),
      titulo: x.acao || 'Registro do sistema',
      descricao: x.observacao || '',
      usuario: x.usuario || '', acao: x.acao || '', origem: x.origem || '',
      statusAnterior: x.status_anterior || '', statusNovo: x.status_novo || '',
      observacao: x.observacao || '', equipe: x.equipe || '', valorOrcamento: x.valor_orcamento || ''
    }));
    return JSON.stringify({ ok: true, id, total: eventos.length, eventos, timeline: eventos });
  }


  function _mensagemPublicaStatus(status) {
    const st = M.normalizarStatus(status);
    const mensagens = {
      'Em análise': 'A solicitação foi recebida e está em análise pela equipe da GOM.',
      'Aguardando visita': 'A solicitação está aguardando visita técnica da equipe responsável.',
      'Em atendimento': 'A solicitação está na fila de atendimento da equipe responsável.',
      'Solicitado Orçamento': 'A solicitação foi encaminhada para orçamento da empresa responsável.',
      'Orçamento Realizado': 'O orçamento retornou da empresa e está aguardando decisão interna.',
      'OS emitida': 'A ordem de serviço foi emitida e o atendimento será acompanhado pela equipe responsável.',
      'Atendimento Emergencial': 'A solicitação foi classificada como emergencial e está em atendimento prioritário.',
      'Garantia de Obra': 'A solicitação está relacionada à garantia de obra e está em acompanhamento.',
      'Garantia de Serviço': 'O serviço executado está em garantia e retornou à empresa para correção.',
      'Serviço Realizado': 'A empresa informou a realização do serviço. A equipe interna fará a validação final.',
      'Devolvido para a escola': 'A solicitação foi devolvida para complementação da unidade escolar.',
      'Concluído': 'A solicitação foi concluída pela equipe responsável.',
      'A cargo da unidade escolar': 'A solicitação ficou a cargo da unidade escolar.',
      'Encaminhado para outra gerência ou Unidade escolar.': 'A solicitação foi encaminhada para outra gerência ou unidade escolar.',
      'Duplicado': 'A solicitação foi identificada como duplicada.'
    };
    return mensagens[st] || 'A solicitação está em acompanhamento pela equipe responsável.';
  }

  function _timelinePublicaChamado(row, logs) {
    const eventos = [];
    if (row && row.data_abertura) {
      eventos.push({
        data: M.fmtDataHora(row.data_abertura),
        titulo: 'Protocolo aberto',
        descricao: 'Solicitação registrada no sistema.'
      });
    }
    (logs || []).forEach(x => {
      const stNovo = x.status_novo ? M.normalizarStatus(x.status_novo) : '';
      eventos.push({
        data: M.fmtDataHora(x.registrado_em),
        titulo: stNovo ? ('Status: ' + stNovo) : (x.acao || 'Movimentação do protocolo'),
        descricao: stNovo ? _mensagemPublicaStatus(stNovo) : 'Houve uma nova movimentação no protocolo.'
      });
    });
    if (!eventos.length) {
      eventos.push({ data: '', titulo: 'Protocolo em acompanhamento', descricao: _mensagemPublicaStatus(row && row.situacao) });
    }
    return eventos;
  }

  async function _logsPorChamado(ids) {
    const mapa = {};
    if (!Array.isArray(ids) || !ids.length) return mapa;
    const r = await window.SB.from('log_acoes').select('*').in('solicitacao_id', ids).order('registrado_em', { ascending: true });
    if (r.error) return mapa;
    (r.data || []).forEach(x => {
      const id = String(x.solicitacao_id || '');
      mapa[id] = mapa[id] || [];
      mapa[id].push(x);
    });
    return mapa;
  }

  function _mapChamadoAcompanhar(row, anexosMap, logsMap) {
    const c = M.mapChamado(row, anexosMap || {});
    const logs = (logsMap && logsMap[String(row.id)]) || [];
    const status = M.normalizarStatus(c.situacao || row.situacao);
    return {
      id: c.id,
      unidade: c.unidade || '',
      descricao: c.detalhamento || 'Sem descrição pública informada.',
      tipo: c.tipo || '',
      status: status,
      situacao: status,
      corStatus: c.corStatus || (M.CORES && M.CORES[status]) || '#002b5e',
      dataAbertura: c.dataHora || c.data || '',
      ultimaAtualizacao: c.dataHoraUltimaAcao || c.dataHora || c.data || '',
      dataPrevistaConclusao: c.dataPrevistaConclusao || '',
      dataConclusao: c.dataConclusaoOs || c.dataConclusao || '',
      numeroOs: c.numeroOs || '',
      mensagemPublica: _mensagemPublicaStatus(status),
      podeComplementar: status === 'Devolvido para a escola',
      observacoesPublicas: [],
      timeline: _timelinePublicaChamado(row, logs)
    };
  }

  async function _escolaPorEmail(email) {
    const e = String(email || '').trim();
    if (!e) return null;
    const r = await window.SB.from('escolas').select('id,nome,tipo,email').ilike('email', '%' + e + '%').limit(1).maybeSingle();
    if (r.error) return null;
    return r.data || null;
  }

  async function consultarProtocoloEscola(p) {
    p = p || {};
    const id = String(p.id || '').trim();
    const unidade = String(p.unidade || '').trim();
    const email = String(p.email || '').trim();
    // escolaId: caminho preciso usado pela tela da escola (identidade já resolvida
    // no login). Filtra direto por escola_id, sem depender do nome da unidade.
    const escolaId = (p.escolaId != null && p.escolaId !== '') ? p.escolaId
      : ((p.escola_id != null && p.escola_id !== '') ? p.escola_id : '');

    let query = window.SB.from('solicitacoes').select(SEL_CHAMADO).order('data_abertura', { ascending: false }).limit(300);
    let unidadeLabel = unidade;

    if (id) {
      query = query.eq('id', id).limit(1);
    } else if (escolaId !== '') {
      query = query.eq('escola_id', escolaId);
    } else if (unidade) {
      const esc = await _escolaIdPorNome(unidade);
      if (!esc) return JSON.stringify({ ok: false, erro: 'Unidade escolar não localizada.' });
      query = query.eq('escola_id', esc.id);
    } else if (email) {
      const esc = await _escolaPorEmail(email);
      if (!esc) return JSON.stringify({ ok: false, erro: 'E-mail não localizado em nenhuma unidade escolar.' });
      unidadeLabel = esc.nome || '';
      query = query.eq('escola_id', esc.id);
    } else {
      return JSON.stringify({ ok: false, erro: 'Informe protocolo, unidade escolar ou e-mail.' });
    }

    const r = await query;
    if (r.error) return JSON.stringify({ ok: false, erro: r.error.message });
    const rows = r.data || [];
    if (!rows.length) return JSON.stringify({ ok: false, erro: 'Nenhum chamado encontrado para os dados informados.' });

    const ids = rows.map(x => x.id);
    let anexosMap = {};
    try { anexosMap = await window.GomAnexos.mapaPorChamado(ids); } catch (e) { anexosMap = {}; }
    const logsMap = await _logsPorChamado(ids);
    const chamados = rows.map(row => _mapChamadoAcompanhar(row, anexosMap, logsMap));

    if (id) return JSON.stringify({ ok: true, modo: 'detalhe', chamado: chamados[0] });
    return JSON.stringify({ ok: true, modo: 'lista', unidade: unidadeLabel || (chamados[0] && chamados[0].unidade) || '', total: chamados.length, chamados });
  }

  /* ══════════════════════════ ESCRITAS ══════════════════════════ */

  function _perfilAtualNormalizado() {
    let perfil = '';
    try { perfil = (window.GomAuth && window.GomAuth.perfil) || ''; } catch (e) {}
    if (!perfil) {
      try { perfil = (window.usuarioAtualGom && window.usuarioAtualGom.perfil) || ''; } catch (e) {}
    }
    perfil = String(perfil || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
    if (perfil === 'ADMINISTRADOR_GOM') perfil = 'ADMIN_GOM';
    if (perfil === 'GOM') perfil = 'SECRETARIA';
    return perfil;
  }

  function _podeEditarObservacoesSecretaria() {
    const perfil = _perfilAtualNormalizado();
    return perfil === 'ADMIN_GOM' || perfil === 'SECRETARIA';
  }

  function _limitarTextoLog(txt, max) {
    txt = String(txt == null ? '' : txt);
    max = Number(max || 8000);
    if (txt.length <= max) return txt;
    return txt.slice(0, max - 80) + '\n...[texto reduzido para registro do histórico]';
  }

  async function editarObservacoesChamado(p) {
    if (!_podeEditarObservacoesSecretaria()) {
      throw new Error('Apenas Secretaria/GOM e Administrador GOM podem editar o campo observações.');
    }

    const id = p.id;
    const atual = await _getChamado(id);
    const anterior = String(atual.observacoes || '').replace(/\r\n/g, '\n').trim();
    const nova = String((p.observacoesNova !== undefined ? p.observacoesNova : p.observacoes) || '').replace(/\r\n/g, '\n').trim();

    if (nova === anterior) return { ok: true, id, semAlteracao: true, observacoes: nova };

    await _update(id, { observacoes: nova });

    const usuario = (window.GomAuth && window.GomAuth.email) || (window.usuarioAtualGom && window.usuarioAtualGom.email) || '';
    const historico = [
      'Campo observações alterado pela Secretaria/GOM.',
      '',
      'ANTES:',
      anterior || '(vazio)',
      '',
      'DEPOIS:',
      nova || '(vazio)'
    ].join('\n');

    await _log({
      solicitacao_id: id,
      acao: 'Observações editadas',
      status_anterior: atual.situacao || '',
      status_novo: atual.situacao || '',
      observacao: _limitarTextoLog(historico, 8000),
      origem: 'edicao_observacoes',
      usuario
    });

    return { ok: true, id, observacoes: nova };
  }


  async function corrigirNumeroOsLegado(p) {
    const id = p && p.id;
    const numeroOs = String((p && p.numeroOs) || '').trim();
    if (!id) throw new Error('ID do chamado não informado.');
    if (!numeroOs) throw new Error('Informe o número da OS.');

    const atual = await _getChamado(id);
    const stAtual = M.normalizarStatus(atual.situacao);
    if (stAtual !== 'OS emitida') throw new Error('A correção manual do número só é permitida para chamados com OS emitida.');
    if (String(atual.numero_os || '').trim()) throw new Error('Este chamado já possui número de OS. Não é permitido alterar por esta rotina.');

    const duplicado = await window.SB
      .from('solicitacoes')
      .select('id,numero_os')
      .ilike('numero_os', numeroOs)
      .neq('id', id)
      .limit(1);
    if (duplicado.error) _err('Verificar número da OS', duplicado.error);
    if ((duplicado.data || []).length) throw new Error('Já existe outro chamado com o número de OS informado.');

    await _update(id, { numero_os: numeroOs, data_hora_ultima_acao: _nowISO() });
    await _log({
      solicitacao_id: id,
      acao: 'Número da OS legado informado',
      status_anterior: stAtual,
      status_novo: stAtual,
      observacao: 'Número da OS informado manualmente para chamado antigo sem numeração: ' + numeroOs,
      origem: 'correcao_numero_os_legado',
      usuario: (window.GomAuth && window.GomAuth.email) || ''
    });
    return { ok: true, id, numeroOs };
  }

  async function atualizarChamado(p) {
    const id = p.id; const atual = await _getChamado(id);
    const stAnt = M.normalizarStatus(atual.situacao);
    const recebida = String(p.situacao || p.status || '').trim();
    const stNovo = recebida ? M.normalizarStatus(recebida) : stAnt;
    const mudou = stNovo !== stAnt;
    // p.forcarTransicao = true ignora a régua de transições (ex.: ação dedicada
    // "Voltar para a Secretaria", que devolve o chamado sem travas).
    if (recebida && mudou && !p.forcarTransicao && !M.podeTransicionar(stAnt, stNovo)) throw new Error('Transição não permitida: ' + stAnt + ' → ' + stNovo);

    const u = {};
    if (recebida && mudou) u.situacao = stNovo;
    if (p.observacoes !== undefined) u.observacoes = M.appendObservacao(atual.observacoes, p.observacoes, stNovo);
    if (p.valorOrcamento !== undefined && p.valorOrcamento !== '') u.valor_orcamento = _num(p.valorOrcamento);
    // Número de OS novo é gerado automaticamente; correção manual fica restrita à função corrigirNumeroOsLegado().
    if (p.dataPrevistaConclusao !== undefined) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao);
    if (p.equipe !== undefined) { u.equipe_responsavel = p.equipe || ''; if (p.equipe) u.data_equipe = _nowISO(); }
    if (p.dataAgendamentoVisita !== undefined && p.dataAgendamentoVisita !== '') u.data_agendamento_visita = _date(p.dataAgendamentoVisita);
    if (p.grupoVisita !== undefined) u.grupo_visita = (p.grupoVisita === '' || p.grupoVisita === null) ? null : String(p.grupoVisita);
    if (['Aguardando visita', 'Visita agendada', 'Em atendimento'].includes(stNovo) && !atual.data_hora_entrada_fila) u.data_hora_entrada_fila = _nowISO();
    if (['Solicitado Orçamento', 'Atendimento Emergencial', 'OS emitida', 'Aguardando visita', 'Visita agendada', 'Garantia de Obra', 'Garantia de Serviço'].includes(stNovo) && mudou) u.data_hora_encaminhamento = _nowISO();
    if (stNovo === 'OS emitida' && mudou) { let n = String(atual.numero_os || '').trim(); if (!n) n = await _gerarNumeroOsAutomatico(); if (!n) n = String(id) + '/' + new Date().getFullYear(); u.numero_os = n; }
    // Abertura MANUAL da OS (botão "Abrir OS e baixar documento"), sem alterar
    // o status do chamado — ele só vai ao Memorial quando a validação normal
    // ("Registrar validação" → Validar e enviar para Memorial) for registrada.
    let _osAbertaManual = '';
    if (p.abrirOs === true && !mudou && !String(atual.numero_os || '').trim()) {
      let n = await _gerarNumeroOsAutomatico();
      if (!n) n = String(id) + '/' + new Date().getFullYear();
      u.numero_os = n;
      _osAbertaManual = n;
    }
    // Atendimento Emergencial: na aprovação final (Serviço Realizado → Concluído)
    // via decisão normal, se o chamado não tem OS e passou por emergência, a OS
    // é ABERTA (número gerado) na mesma ação em que é validado e encaminhado ao
    // Memorial — sem exigir o botão dedicado acima.
    let _osEmergencialAberta = '';
    if (!_osAbertaManual && stNovo === 'Concluído' && mudou && !String(atual.numero_os || '').trim()) {
      if (await _passouPorEmergencial(id)) {
        let n = await _gerarNumeroOsAutomatico();
        if (!n) n = String(id) + '/' + new Date().getFullYear();
        u.numero_os = n;
        u.data_hora_encaminhamento = u.data_hora_encaminhamento || _nowISO();
        u.data_conclusao_os = _nowISO();
        _osEmergencialAberta = n;
      }
    }
    if (stNovo === 'Devolvido para a escola') u.data_conclusao_os = _nowISO();
    // Cancelado: status terminal — segue direto para o Memorial. Marca a data de
    // encerramento e o MOTIVO é registrado nas observações/timeline.
    if (stNovo === 'Cancelado' && mudou) u.data_conclusao_os = _nowISO();
    // Marcação de evento especial (ex.: tempestade). '' limpa a marcação.
    if (p.evento !== undefined) u.evento = String(p.evento || '').trim() || null;
    const _anexosAtual = p.anexosAtualizacao || p.anexos || [];
    if (Array.isArray(_anexosAtual) && _anexosAtual.length) {
      const _esc = (atual.escola && atual.escola.nome) || atual.unidade_escolar || '';
      await window.GomAnexos.upload(id, 'solicitacao', _anexosAtual, _esc);
    }
    // Anexo do orçamento do Atendimento Emergencial (etapa sem fluxo formal de
    // orçamento) — categoria própria 'orcamento', igual ao fluxo normal.
    if (Array.isArray(p.anexosOrcamento) && p.anexosOrcamento.length) {
      await window.GomAnexos.upload(id, 'orcamento', p.anexosOrcamento);
    }

    await _update(id, u);
    // Devolvido para a escola: envia e-mail à escola com o MOTIVO da devolução.
    // (O chamado já fica no Memorial, pois é um status terminal.)
    if (stNovo === 'Devolvido para a escola' && mudou) {
      try { await _enfileirarEmailDevolucao_(atual, p.observacoes); } catch (e) {}
    }
    if (p.dataAgendamentoVisita) await _atendimento({ solicitacao_id: id, status: stNovo, numero_os: atual.numero_os || '', equipe: p.equipe || atual.equipe_responsavel || '', observacoes_dia: p.observacoes || '', data_atendimento: _date(p.dataAgendamentoVisita), tipo_registro: 'Agendamento de visita' });
    let _acaoLog = (stNovo === 'Cancelado' && mudou) ? 'Chamado cancelado' : 'Chamado atualizado';
    if (_osAbertaManual) _acaoLog = 'OS aberta manualmente (Atendimento Emergencial)';
    else if (_osEmergencialAberta) _acaoLog = 'Emergencial concluído — OS aberta e enviada ao Memorial';
    let _obsLog = p.observacoes || '';
    if (_osAbertaManual) _obsLog = ('OS ' + _osAbertaManual + ' aberta manualmente para o Atendimento Emergencial, sem concluir o chamado. ' + _obsLog).trim();
    else if (_osEmergencialAberta) _obsLog = ('OS ' + _osEmergencialAberta + ' aberta na conclusão do atendimento emergencial. ' + _obsLog).trim();
    await _log({ solicitacao_id: id, acao: _acaoLog, status_anterior: mudou ? stAnt : '', status_novo: mudou ? stNovo : stAnt, observacao: _obsLog, valor_orcamento: _num(p.valorOrcamento), equipe: p.equipe || '' });
    return { ok: true, id, status: stNovo, numeroOs: u.numero_os || atual.numero_os || '' };
  }

  async function criarSolicitacao(p) {
    const esc = await _escolaIdPorNome(p.unidade);
    const origem = p.sistema === 'Solar' ? ('Solar ' + (p.num_processo || '')).trim() : (p.sistema || 'Cadastro interno');
    const situacao = 'Em análise';
    const ins = await window.SB.from('solicitacoes').insert({
      data_abertura: _nowISO(), origem, escola_id: esc ? esc.id : null, tipo: p.tipo || (esc ? esc.tipo : ''),
      detalhamento: p.detalhamento || '', situacao, observacoes: M.appendObservacao('', p.observacoes, 'Cadastro interno'),
      data_hora_ultima_acao: _nowISO()
    }).select('id').single();
    if (ins.error) _err('Criar solicitação', ins.error);
    const id = ins.data.id;
    if (Array.isArray(p.anexos) && p.anexos.length) await window.GomAnexos.upload(id, 'solicitacao', p.anexos, p.unidade || '');
    await _log({ solicitacao_id: id, acao: 'Chamado criado', status_novo: situacao, observacao: p.observacoes || '', origem: 'cadastro interno' });
    return { ok: true, id };
  }

  async function criarSolicitacaoEscola(p) {
    const esc = await _escolaIdPorNome(p.unidade);

    // Itens (blocos "+" do formulário). Compat: formato antigo (campos soltos) = 1 item.
    let itens = Array.isArray(p.itens) ? p.itens : [];
    if (!itens.length && (p.tipo_solicitacao || p.descricao)) {
      itens = [{ tipo_solicitacao: p.tipo_solicitacao, local_ocorrencia: p.local_ocorrencia, tempo_problema: p.tempo_problema, descricao: p.descricao, urgente: p.urgente, anexos: p.anexos || [] }];
    }

    const linha = (rotulo, valor) => (valor != null && String(valor).trim() !== '') ? (rotulo + ': ' + String(valor).trim()) : '';
    const partes = [];
    [linha('Responsável', p.nome_responsavel), linha('Cargo/Função', p.cargo), linha('Telefone/WhatsApp', p.telefone)]
      .filter(Boolean).forEach(l => partes.push(l));
    itens.forEach((it, i) => {
      const bloco = [
        '— Problema ' + (i + 1) + (itens.length > 1 ? ' de ' + itens.length : '') + ' —',
        linha('Tipo principal', it.tipo_solicitacao),
        linha('Local da ocorrência', it.local_ocorrencia),
        linha('Há quanto tempo', it.tempo_problema),
        linha('Descrição', it.descricao),
        linha('Intervenção urgente', it.urgente)
      ].filter(Boolean).join('\n');
      if (bloco) partes.push('\n' + bloco);
    });
    const rodape = [
      linha('Afeta turma/serviço essencial', p.afeta_turma),
      linha('Risco à segurança', p.risco),
      linha('Impacto no funcionamento', p.funcionamento),
      linha('Precisa isolamento imediato', p.isolamento),
      linha('Observações adicionais', p.observacoes_adicionais)
    ].filter(Boolean).join('\n');
    if (rodape) partes.push('\n' + rodape);
    const detalhe = partes.join('\n');

    const ins = await window.SB.from('solicitacoes').insert({
      data_abertura: _nowISO(), origem: 'Formulário Escola', escola_id: esc ? esc.id : null, tipo: esc ? esc.tipo : '',
      detalhamento: detalhe, situacao: 'Em análise', observacoes: M.appendObservacao('', p.observacoes_adicionais, 'Cadastro da escola'), data_hora_ultima_acao: _nowISO()
    }).select('id').single();
    if (ins.error) _err('Criar solicitação (escola)', ins.error);
    const id = ins.data.id;

    // Anexos de cada item, atrelados ao LOCAL e TIPO do bloco (pasta de
    // arquivamento: <escola>/chamado-<id>/<local>/<tipo>/arquivo).
    const escNome = p.unidade || '';
    for (const it of itens) {
      if (Array.isArray(it.anexos) && it.anexos.length) {
        try {
          await window.GomAnexos.upload(id, 'solicitacao', it.anexos, escNome, { local: it.local_ocorrencia || '', tipo: it.tipo_solicitacao || '' });
        } catch (e) { window.gomWarn && window.gomWarn('[GOM] anexos escola:', (e && e.message) || e); }
      }
    }
    await _log({ solicitacao_id: id, acao: 'Chamado criado pela escola', status_novo: 'Em análise', origem: 'cadastro escola' });
    return { ok: true, id };
  }

  async function salvarEquipeDiaEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    const equipe = String(p.equipe || '').trim();
    if (!equipe) throw new Error('Selecione a equipe do dia.');
    // data_equipe = data selecionada pelo usuário; fallback = hoje
    const dataEquipe = _date(p.dataAtendimento || p.dataEquipe || p.dataEquipeDia) || M.todayKey();
    const u = { equipe_responsavel: equipe, data_equipe: dataEquipe, observacoes: M.appendObservacao(atual.observacoes, p.observacoes, 'Equipe do dia'), data_hora_ultima_acao: _nowISO() };
    if (p.numeroOs !== undefined) u.numero_os = p.numeroOs || atual.numero_os || '';
    if (p.dataPrevistaConclusao) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao);
    await _update(id, u);
    await _atendimento({ solicitacao_id: id, status: atual.situacao, numero_os: p.numeroOs || atual.numero_os || '', equipe, observacoes_dia: p.observacoes || '', data_prevista_conclusao: _date(p.dataPrevistaConclusao), data_atendimento: _date(p.dataAtendimento || p.dataEquipe || p.dataEquipeDia) || M.todayKey(), tipo_registro: 'Equipe do dia' });
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


  async function _gerarNumeroOsAutomatico() {
    const ano = new Date().getFullYear();
    try {
      const r = await window.SB.from('solicitacoes').select('numero_os').ilike('numero_os', '%/' + ano);
      if (r.error) return '';
      let maior = 0;
      (r.data || []).forEach(row => {
        const m = String(row.numero_os || '').match(/^(\d+)\s*\/\s*(\d{4})$/);
        if (m && Number(m[2]) === ano) maior = Math.max(maior, Number(m[1]) || 0);
      });
      // Piso configurável: a numeração nunca começa abaixo de OS_NUMERO_INICIAL.
      let minimo = 0;
      try {
        const cfgs = (typeof window !== 'undefined' && window.configuracoesGlobal) || [];
        const it = cfgs.find(c => c && c.chave === 'OS_NUMERO_INICIAL');
        if (it) minimo = parseInt(String(it.valor || '').replace(/\D/g, ''), 10) || 0;
      } catch (e) {}
      const proximo = Math.max(maior + 1, minimo);
      return String(proximo) + '/' + ano;
    } catch (e) {
      return '';
    }
  }

  async function aprovarOrcamento(p) {
    const id = p.id; const atual = await _getChamado(id);
    let numeroOs = String(atual.numero_os || '').trim();
    if (!numeroOs) numeroOs = await _gerarNumeroOsAutomatico();
    if (!numeroOs) numeroOs = String(id) + '/' + new Date().getFullYear();
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
    if (stNovo === 'OS emitida') { let n = String(atual.numero_os || '').trim(); if (!n) n = await _gerarNumeroOsAutomatico(); if (!n) n = String(id) + '/' + new Date().getFullYear(); u.numero_os = n; u.data_hora_encaminhamento = _nowISO(); if (p.dataPrevistaConclusao) u.data_prevista_conclusao = _date(p.dataPrevistaConclusao); }
    if (stNovo === 'Solicitado Orçamento') u.data_hora_encaminhamento = _nowISO();
    if (['A cargo da unidade escolar', 'Devolvido para a escola'].includes(stNovo)) u.data_conclusao_os = _nowISO();
    const _anexosAtual = p.anexosAtualizacao || p.anexos || [];
    if (Array.isArray(_anexosAtual) && _anexosAtual.length) {
      const _esc = (atual.escola && atual.escola.nome) || atual.unidade_escolar || '';
      await window.GomAnexos.upload(id, 'solicitacao', _anexosAtual, _esc);
    }
    await _update(id, u);
    await _log({ solicitacao_id: id, acao: rotulo, status_anterior: stAnt, status_novo: stNovo, observacao: parecer });
    return { ok: true, id, status: stNovo };
  }

  async function atualizarPrevisaoOsEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    const st = M.normalizarStatus(atual.situacao);
    if (!['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Garantia de Serviço', 'Serviço Realizado'].includes(st)) throw new Error('A previsão só pode ser alterada em OS, emergência, garantia ou serviço realizado.');
    await _update(id, { data_prevista_conclusao: _date(p.dataPrevistaConclusao) });
    await _log({ solicitacao_id: id, acao: 'Previsão de conclusão atualizada pela empresa', status_anterior: st, status_novo: st });
    return true;
  }

  async function finalizarOsEmpresa(p) {
    const id = p.id; const atual = await _getChamado(id);
    if (Array.isArray(p.anexosServico) && p.anexosServico.length) await window.GomAnexos.upload(id, 'servico', p.anexosServico);
    const u = { situacao: 'Serviço Realizado', observacoes: M.appendObservacao(atual.observacoes, p.observacoes, 'Serviço realizado pela empresa - aguardando validação GOM'), data_hora_ultima_acao: _nowISO() };
    if (p.equipe) { u.equipe_responsavel = p.equipe; u.data_equipe = _nowISO(); }
    if (p.numeroOs !== undefined) u.numero_os = p.numeroOs || atual.numero_os || '';
    await _update(id, u);
    await _atendimento({ solicitacao_id: id, status: 'Serviço Realizado', numero_os: p.numeroOs || atual.numero_os || '', equipe: p.equipe || atual.equipe_responsavel || '', observacoes_dia: p.observacoes || '', data_atendimento: M.todayKey(), tipo_registro: 'Finalização OS - aguardando validação' });
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

  async function listarEquipesGerencial(filtro) {
    filtro = filtro || {};
    const tipo = String(filtro.tipo || 'empresa').trim() === 'secretaria' ? 'secretaria' : 'empresa';
    const eq = await window.SB.from('equipes')
      .select('id,nome,tipo,ativo,created_at')
      .eq('tipo', tipo)
      .order('ativo', { ascending: false })
      .order('nome', { ascending: true });
    if (eq.error) return JSON.stringify({ ok: false, tipo, equipes: [], erro: eq.error.message });

    const ids = (eq.data || []).map(e => e.id);
    let membros = [];
    if (ids.length) {
      const mem = await window.SB.from('equipe_membros')
        .select('id,equipe_id,nome,funcao,telefone,email,ativo,created_at')
        .in('equipe_id', ids)
        .order('ativo', { ascending: false })
        .order('nome', { ascending: true });
      if (mem.error) {
        const msg = String(mem.error.message || '');
        return JSON.stringify({
          ok: false,
          tipo,
          equipes: [],
          erro: msg.indexOf('equipe_membros') >= 0 || msg.indexOf('relation') >= 0
            ? 'A tabela equipe_membros ainda não existe no Supabase. Rode o arquivo sql/03_equipe_membros.sql no SQL Editor.'
            : msg
        });
      }
      membros = mem.data || [];
    }

    const mapa = {};
    membros.forEach(m => {
      const key = String(m.equipe_id);
      if (!mapa[key]) mapa[key] = [];
      mapa[key].push({
        id: m.id,
        equipeId: m.equipe_id,
        nome: m.nome || '',
        funcao: m.funcao || '',
        telefone: m.telefone || '',
        email: m.email || '',
        ativo: m.ativo !== false,
        criadoEm: M.fmtDataHora(m.created_at)
      });
    });

    const equipes = (eq.data || []).map(e => ({
      id: e.id,
      nome: e.nome || '',
      tipo: e.tipo || tipo,
      ativo: e.ativo !== false,
      criadoEm: M.fmtDataHora(e.created_at),
      membros: mapa[String(e.id)] || []
    }));
    return JSON.stringify({ ok: true, tipo, total: equipes.length, equipes });
  }

  async function salvarEquipeGerencial(p) {
    p = p || {};
    const nome = String(p.nome || '').trim();
    const tipo = String(p.tipo || 'empresa').trim() === 'secretaria' ? 'secretaria' : 'empresa';
    if (!nome) return JSON.stringify({ ok: false, erro: 'Informe o nome da equipe.' });
    const r = await window.SB.from('equipes')
      .upsert({ nome, tipo, ativo: true }, { onConflict: 'nome,tipo' })
      .select('id,nome,tipo,ativo')
      .single();
    if (r.error) return JSON.stringify({ ok: false, erro: r.error.message });
    return JSON.stringify({ ok: true, equipe: r.data });
  }

  async function salvarMembroEquipeGerencial(p) {
    p = p || {};
    const equipeId = p.equipeId || p.equipe_id || p.idEquipe;
    const nome = String(p.nome || '').trim();
    if (!equipeId) return JSON.stringify({ ok: false, erro: 'Selecione a equipe.' });
    if (!nome) return JSON.stringify({ ok: false, erro: 'Informe o nome do integrante.' });

    const row = {
      equipe_id: Number(equipeId),
      nome,
      funcao: String(p.funcao || '').trim(),
      telefone: String(p.telefone || '').trim(),
      email: String(p.email || '').trim().toLowerCase(),
      ativo: true,
      updated_at: _nowISO()
    };

    const r = await window.SB.from('equipe_membros')
      .upsert(row, { onConflict: 'equipe_id,nome' })
      .select('id,equipe_id,nome,funcao,telefone,email,ativo')
      .single();
    if (r.error) {
      const msg = String(r.error.message || '');
      return JSON.stringify({ ok: false, erro: msg.indexOf('equipe_membros') >= 0 || msg.indexOf('relation') >= 0 ? 'A tabela equipe_membros ainda não existe no Supabase. Rode o arquivo sql/03_equipe_membros.sql no SQL Editor.' : msg });
    }
    return JSON.stringify({ ok: true, membro: r.data });
  }

  async function alterarStatusEquipeGerencial(p) {
    p = p || {};
    const id = p.id;
    if (!id) return JSON.stringify({ ok: false, erro: 'Equipe não informada.' });
    const ativo = p.ativo === true || String(p.ativo).toLowerCase() === 'true';
    const r = await window.SB.from('equipes').update({ ativo }).eq('id', id).select('id,nome,tipo,ativo').single();
    if (r.error) return JSON.stringify({ ok: false, erro: r.error.message });
    return JSON.stringify({ ok: true, equipe: r.data });
  }

  async function alterarStatusMembroEquipeGerencial(p) {
    p = p || {};
    const id = p.id;
    if (!id) return JSON.stringify({ ok: false, erro: 'Integrante não informado.' });
    const ativo = p.ativo === true || String(p.ativo).toLowerCase() === 'true';
    const r = await window.SB.from('equipe_membros').update({ ativo, updated_at: _nowISO() }).eq('id', id).select('id,equipe_id,nome,ativo').single();
    if (r.error) {
      const msg = String(r.error.message || '');
      return JSON.stringify({ ok: false, erro: msg.indexOf('equipe_membros') >= 0 || msg.indexOf('relation') >= 0 ? 'A tabela equipe_membros ainda não existe no Supabase. Rode o arquivo sql/03_equipe_membros.sql no SQL Editor.' : msg });
    }
    return JSON.stringify({ ok: true, membro: r.data });
  }

  async function salvarConfiguracoes(lista) {
    if (lista && !Array.isArray(lista) && Array.isArray(lista.configuracoes)) lista = lista.configuracoes;
    if (!Array.isArray(lista)) lista = [lista];
    const rows = lista.filter(i => i && i.chave).map(i => ({
      chave: String(i.chave).trim(), valor: i.valor == null ? '' : String(i.valor),
      grupo: String(i.grupo || 'Personalizadas').trim(), descricao: String(i.descricao || '').trim(),
      ativo: !(String(i.ativo || 'SIM').toUpperCase().startsWith('N'))
    }));
    if (rows.length) { const r = await window.SB.from('configuracoes').upsert(rows, { onConflict: 'chave' }); if (r.error) _err('Salvar configurações', r.error); }
    await _sincronizarPerfisPorConfiguracoes(rows);
    return await listarConfiguracoes();
  }

  async function registrarComplementoEscola(p) {
    const id = p.id; const atual = await _getChamado(id);
    const stAnt = M.normalizarStatus(atual.situacao);
    const complemento = p.complemento || p.observacoes || p.observacao || '';
    if (Array.isArray(p.anexos) && p.anexos.length) await window.GomAnexos.upload(id, 'solicitacao', p.anexos);
    await _update(id, {
      situacao: 'Em análise',
      observacoes: M.appendObservacao(atual.observacoes, complemento, 'Complemento da escola'),
      data_hora_ultima_acao: _nowISO()
    });
    await _log({ solicitacao_id: id, acao: 'Complemento registrado pela escola', status_anterior: stAnt, status_novo: 'Em análise', observacao: complemento || '', origem: 'portal escola' });
    return JSON.stringify({ ok: true, id, status: 'Em análise' });
  }

  // ── Unificar chamados de uma unidade: o mais antigo vira o principal e os
  // demais viram "Unificado", vinculados a ele (chamado_principal_id). ──────────
  async function unificarChamados(p) {
    p = p || {};
    let ids = Array.isArray(p.ids) ? p.ids.slice() : [];
    ids = ids.filter(function (v, i, a) { return v != null && v !== '' && a.indexOf(v) === i; });
    if (ids.length < 2) return JSON.stringify({ ok: false, erro: 'Selecione ao menos 2 chamados para unificar.' });

    const r = await window.SB.from('solicitacoes')
      .select('id,data_abertura,situacao,detalhamento,observacoes,escola_id,tipo,origem,classificacao,numero_os,valor_orcamento,equipe_responsavel,data_prevista_conclusao')
      .in('id', ids);
    if (r.error) return JSON.stringify({ ok: false, erro: r.error.message });
    const rows = r.data || [];
    if (rows.length < 2) return JSON.stringify({ ok: false, erro: 'Chamados não encontrados para unificar.' });

    // Principal = mais antigo (data_abertura; empate → menor id).
    rows.sort(function (a, b) {
      const da = String(a.data_abertura || ''), db = String(b.data_abertura || '');
      if (da !== db) return da < db ? -1 : 1;
      return Number(a.id) - Number(b.id);
    });
    const principal = rows[0];
    const absorvidos = rows.slice(1);

    for (const c of absorvidos) {
      await _update(c.id, {
        situacao: 'Unificado',
        chamado_principal_id: principal.id,
        observacoes: M.appendObservacao(c.observacoes, 'Unificado no chamado #' + principal.id + '.', 'Unificação'),
        data_hora_ultima_acao: _nowISO()
      });
      await _log({ solicitacao_id: c.id, acao: 'Chamado unificado', status_anterior: M.normalizarStatus(c.situacao), status_novo: 'Unificado', observacao: 'Unificado no #' + principal.id });
    }

    // Move os anexos dos absorvidos para o PRINCIPAL: assim todos passam a
    // aparecer na prévia (dentro dos detalhes) do chamado unificado, junto com
    // os anexos que já eram dele.
    const idsAbsorvidos = absorvidos.map(function (c) { return c.id; });
    if (idsAbsorvidos.length) {
      try {
        const ax = await window.SB.from('anexos').update({ solicitacao_id: principal.id }).in('solicitacao_id', idsAbsorvidos);
        if (ax && ax.error) window.gomWarn && window.gomWarn('[GOM] unificar anexos:', ax.error.message);
      } catch (e) { window.gomWarn && window.gomWarn('[GOM] unificar anexos:', (e && e.message) || e); }
    }

    // Consolida no principal TODAS as informações de cada chamado absorvido
    // (situação anterior, tipo, origem, descrição, OS, valor, equipe, prazo e as
    // observações já registradas), para não perder nada.
    const resumo = absorvidos.map(function (c) {
      const linhas = ['• Chamado #' + c.id + (c.data_abertura ? ' (aberto em ' + String(c.data_abertura).slice(0, 10) + ')' : '')];
      if (c.situacao) linhas.push('  Situação anterior: ' + c.situacao);
      if (c.tipo) linhas.push('  Tipo: ' + c.tipo);
      if (c.origem) linhas.push('  Origem: ' + c.origem);
      if (c.classificacao) linhas.push('  Classificação: ' + c.classificacao);
      const desc = String(c.detalhamento || '').replace(/\s+/g, ' ').trim();
      if (desc) linhas.push('  Descrição: ' + desc);
      if (c.numero_os) linhas.push('  Nº OS: ' + c.numero_os);
      if (c.valor_orcamento != null && c.valor_orcamento !== '') linhas.push('  Valor do orçamento: ' + c.valor_orcamento);
      if (c.equipe_responsavel) linhas.push('  Equipe: ' + c.equipe_responsavel);
      if (c.data_prevista_conclusao) linhas.push('  Previsão de conclusão: ' + String(c.data_prevista_conclusao).slice(0, 10));
      const obs = String(c.observacoes || '').trim();
      if (obs) linhas.push('  Observações:\n    ' + obs.replace(/\n/g, '\n    '));
      return linhas.join('\n');
    }).join('\n\n');
    await _update(principal.id, {
      observacoes: M.appendObservacao(principal.observacoes, 'Absorveu ' + absorvidos.length + ' chamado(s) da unidade (anexos movidos para este chamado):\n\n' + resumo, 'Unificação'),
      data_hora_ultima_acao: _nowISO()
    });
    await _log({ solicitacao_id: principal.id, acao: 'Chamados unificados', status_anterior: M.normalizarStatus(principal.situacao), status_novo: M.normalizarStatus(principal.situacao), observacao: 'Absorveu ' + absorvidos.map(function (c) { return '#' + c.id; }).join(', ') });

    return JSON.stringify({ ok: true, principal: principal.id, unificados: absorvidos.length });
  }

  // Monta e enfileira o e-mail de "Devolvido para a escola" com o motivo.
  async function _enfileirarEmailDevolucao_(chamado, motivo) {
    const esc = (chamado && chamado.escola) || {};
    const para = String(esc.email || '').trim();
    if (!para) return; // sem e-mail da escola cadastrado: não envia
    const escNome = esc.nome || chamado.unidade_escolar || '';
    const cfgs = (typeof window !== 'undefined' && window.configuracoesGlobal) || [];
    const getCfg = function (ch, fb) {
      const it = cfgs.find(function (c) { return c && c.chave === ch; });
      return (it && it.valor) ? String(it.valor) : (fb || '');
    };
    // Toggle próprio do e-mail de devolução (além do interruptor mestre).
    if (getCfg('EMAIL_DEVOLUCAO_ATIVO', 'SIM').toUpperCase() !== 'SIM') return;

    const assuntoTpl = getCfg('EMAIL_DEVOLUCAO_ASSUNTO', 'Chamado #{{numero}} devolvido — {{escola}}');
    const corpoTpl = getCfg('EMAIL_DEVOLUCAO_CORPO',
      '<p>Prezados responsáveis da <strong>{{escola}}</strong>,</p>'
      + '<p>O chamado <strong>#{{numero}}</strong> foi <strong>devolvido para a escola</strong> pela GOM.</p>'
      + '<p><strong>Motivo da devolução:</strong><br>{{motivo}}</p>'
      + '<p>Em caso de dúvidas, entre em contato com a Gerência de Obras e Manutenção.</p>'
      + '<p>Atenciosamente,<br><strong>GOM · SME Ribeirão Preto</strong></p>');
    const vars = {
      '{{numero}}': String(chamado.id || ''),
      '{{escola}}': escNome,
      '{{motivo}}': String(motivo || '').trim() || '(motivo não informado)'
    };
    const apVar = function (t) {
      let s = String(t || '');
      Object.keys(vars).forEach(function (k) { s = s.split(k).join(vars[k]); });
      return s;
    };
    await gravarFilaEmail({
      tipo: 'devolucao_escola',
      para: para,
      assunto: apVar(assuntoTpl),
      corpoHtml: apVar(corpoTpl),
      dadosRef: { chamado_id: chamado.id, escola_id: chamado.escola_id }
    });
  }

  // ── Fila de e-mails: o frontend grava aqui; o GAS processa a cada 15min ──
  async function gravarFilaEmail(entrada) {
    // entrada: { tipo, para, cc, assunto, corpoHtml, dadosRef }
    // Interruptor mestre (AUTORITATIVO): consulta o banco, pois window.configuracoesGlobal
    // pode não estar carregado fora da tela de Configurações (numa sessão que não abriu
    // Configurações o cache fica vazio e o e-mail "escaparia"). Com EMAIL_ENVIO_ATIVO != SIM,
    // NÃO enfileira (suspenso).
    try {
      let valorMaster = null;
      try {
        const rCfg = await window.SB.from('configuracoes').select('valor').eq('chave', 'EMAIL_ENVIO_ATIVO').maybeSingle();
        if (!rCfg.error && rCfg.data) valorMaster = rCfg.data.valor;
      } catch (e) {}
      if (valorMaster == null) {
        // Fallback para o cache em memória, caso o banco não responda (ex.: leitura sem permissão).
        const cfgsMaster = (typeof window !== 'undefined' && window.configuracoesGlobal) || [];
        const itMaster = cfgsMaster.find(function (c) { return c && c.chave === 'EMAIL_ENVIO_ATIVO'; });
        if (itMaster) valorMaster = itMaster.valor;
      }
      if (valorMaster != null && String(valorMaster).trim().toUpperCase() !== 'SIM') {
        return { ok: false, erro: 'Disparo de e-mail suspenso (EMAIL_ENVIO_ATIVO).', suspenso: true };
      }
    } catch (e) {}
    try {
      const row = {
        tipo:       String(entrada.tipo       || 'aviso'),
        para:       String(entrada.para       || ''),
        cc:         String(entrada.cc         || ''),
        assunto:    String(entrada.assunto    || ''),
        corpo_html: String(entrada.corpoHtml  || ''),
        dados_ref:  entrada.dadosRef || null,
        status:     'pendente'
      };
      if (!row.para || !row.assunto) return { ok: false, erro: 'para e assunto são obrigatórios.' };
      const { error } = await window.SB.from('email_fila').insert(row);
      if (error) return { ok: false, erro: error.message };
      return { ok: true };
    } catch (e) {
      return { ok: false, erro: String((e && e.message) || e) };
    }
  }

  // Expõe globalmente para uso em outros módulos (triagem-fila-inline.js etc.)
  window.gomGravarFilaEmail = gravarFilaEmail;

  return {
    listarChamados, getDadosIniciais, usuarioAtual, listarObras, listarCampo, listarConfiguracoes, timeline,
    consultarProtocoloEscola,
    atualizarChamado, editarObservacoesChamado, corrigirNumeroOsLegado, criarSolicitacao, criarSolicitacaoEscola, salvarEquipeDiaEmpresa, salvarEquipesDiaEmpresaLote,
    salvarRespostaOrcamentoEmpresa, salvarServicoRealizadoEmpresa, aprovarOrcamento, salvarDecisaoAprovacao,
    atualizarPrevisaoOsEmpresa, finalizarOsEmpresa, salvarNovaEquipe,
    listarEquipesGerencial, salvarEquipeGerencial, salvarMembroEquipeGerencial, alterarStatusEquipeGerencial, alterarStatusMembroEquipeGerencial,
    atualizarObra, salvarConfiguracoes, registrarComplementoEscola, gravarFilaEmail, unificarChamados
  };
})();
