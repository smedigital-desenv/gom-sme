/* ============================================================================
 * GOM | SME — Ponte google.script.run → Supabase
 * ----------------------------------------------------------------------------
 * Substitui o google.script.run do Apps Script. As telas continuam chamando
 *   google.script.run.withSuccessHandler(cb).withFailureHandler(eb).FUNC(payload)
 * e aqui roteamos cada FUNC para a camada de dados (GomDados) no Supabase.
 *
 * IMPORTANTE: carregue este arquivo DEPOIS de config.js, mapeadores.js,
 * anexos.js e dados.js, e ANTES dos scripts das telas.
 * ========================================================================== */
(function () {
  'use strict';
  const D = window.GomDados;

  function _runner() {
    const st = { _ok: null, _fail: null };
    const proxy = new Proxy(st, {
      get(t, prop) {
        if (prop === 'withSuccessHandler') return fn => { t._ok = fn; return proxy; };
        if (prop === 'withFailureHandler') return fn => { t._fail = fn; return proxy; };
        if (prop === 'withUserObject') return () => proxy;
        return function (...args) {
          Promise.resolve()
            .then(() => _exec(String(prop), args))
            .then(r => { if (typeof t._ok === 'function') t._ok(r); })
            .catch(e => {
              console.error('[GOM] Erro em ' + String(prop) + ':', e);
              if (typeof t._fail === 'function') t._fail(e);
            });
        };
      }
    });
    return proxy;
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = new Proxy({}, { get(_, prop) { return _runner()[prop]; } });
  // host.close()/google.script.host usados em alguns lugares — no-ops seguros
  window.google.script.host = window.google.script.host || { close: function () {}, editor: { focus: function () {} } };

  function _exec(nome, args) {
    const p = (args && args[0] !== undefined) ? args[0] : {};
    switch (nome) {
      /* ── Leituras (retornam STRING JSON, igual ao Apps Script) ── */
      case 'gomListarChamadosWebV3Json': return D.listarChamados();
      case 'getDadosIniciais': return D.getDadosIniciais();
      case 'gomObterUsuarioAtualV1Json':
      case 'getUsuario': return D.usuarioAtual();
      case 'gomListarObrasWebV3Json': return D.listarObras();
      case 'getDadosObras': return D.listarObras().then(s => { const o = JSON.parse(s); return o.obras || []; });
      case 'gomListarCampoWebV3Json': return D.listarCampo();
      case 'gomListarConfiguracoesWebV1Json':
      case 'listarConfiguracoes': return D.listarConfiguracoes();
      case 'gomListarTimelineChamadoV1Json':
      case 'listarTimelineChamado': { const id = (typeof p === 'object') ? (p.id || '') : p; return D.timeline(id); }
      case 'gomConsultarProtocoloEscolaV1Json': return D.consultarProtocoloEscola(p);

      /* ── Escritas ── */
      case 'atualizarChamadoWorkflow': return D.atualizarChamado(p);
      case 'editarObservacoesChamado': return D.editarObservacoesChamado(p);
      case 'gomAtualizarChamadosLoteV1': {
        const lista = typeof p === 'string' ? JSON.parse(p) : (Array.isArray(p) ? p : [p]);
        // cada item é um payload de atualizarChamado
        return (async () => { let ok = 0; const erros = []; for (const it of lista) { try { await D.atualizarChamado(it); ok++; } catch (e) { erros.push({ id: it.id, erro: e.message }); } } return JSON.stringify({ ok: erros.length === 0, total: lista.length, sucessos: ok, erros }); })();
      }
      case 'salvarNovaSolicitacao': return D.criarSolicitacao(p);
      case 'salvarSolicitacaoEscola': return D.criarSolicitacaoEscola(p);
      case 'salvarEquipeDiaEmpresa': return D.salvarEquipeDiaEmpresa(p);
      case 'salvarLoteEquipeDia':
      case 'salvarEquipesDiaEmpresaLote': { const lista = typeof p === 'string' ? JSON.parse(p) : p; return D.salvarEquipesDiaEmpresaLote(lista); }
      case 'salvarRespostaOrcamentoEmpresa': return D.salvarRespostaOrcamentoEmpresa(p);
      case 'salvarServicoRealizadoEmpresa': return D.salvarServicoRealizadoEmpresa(p);
      case 'aprovarOrcamentoEmpresa': return D.aprovarOrcamento(p);
      case 'salvarDecisaoAprovacao': return D.salvarDecisaoAprovacao(p);
      case 'atualizarPrevisaoOsEmpresa': return D.atualizarPrevisaoOsEmpresa(p);
      case 'finalizarOsEmpresa': return D.finalizarOsEmpresa(p);
      case 'salvarNovaEquipe': return D.salvarNovaEquipe(args[0], args[1]);
      case 'gomListarEquipesGerencialV1Json': return D.listarEquipesGerencial(p);
      case 'gomSalvarEquipeGerencialV1Json': return D.salvarEquipeGerencial(p);
      case 'gomSalvarMembroEquipeGerencialV1Json': return D.salvarMembroEquipeGerencial(p);
      case 'gomAlterarStatusEquipeGerencialV1Json': return D.alterarStatusEquipeGerencial(p);
      case 'gomAlterarStatusMembroEquipeGerencialV1Json': return D.alterarStatusMembroEquipeGerencial(p);
      case 'atualizarObra':
      case 'salvarObraModal': return D.atualizarObra(p);
      case 'gomSalvarConfiguracoesWebV1Json':
      case 'salvarConfiguracoes': {
        const payload = typeof p === 'string' ? JSON.parse(p) : p;
        const lista = Array.isArray(payload) ? payload : (payload && Array.isArray(payload.configuracoes) ? payload.configuracoes : []);
        return D.salvarConfiguracoes(lista);
      }
      case 'salvarConfiguracao': return D.salvarConfiguracoes([p]);
      case 'gomRegistrarComplementoEscolaV1Json':
      case 'registrarComplementoEscola': return D.registrarComplementoEscola(p);

      /* ── E-mail/cobrança: Fase 6 (ainda não migrado) ── */
      case 'gomGerarPreviewCobrancaEmpresaV1Json': return JSON.stringify({ ok: true, total: 0, pendencias: [], aviso: 'Cobrança por e-mail entra na Fase 6.' });
      case 'gomEnviarCobrancaPendenciasEmpresaV1Json':
      case 'enviarCobrancaEmpresa': return JSON.stringify({ ok: false, enviados: 0, erro: 'Envio de e-mail será configurado na Fase 6.' });
      case 'gomCriarTriggerCobrancaPendenciasEmpresaV1Json': return JSON.stringify({ ok: false, erro: 'Agendamento de e-mail entra na Fase 6.' });

      /* ── Exportação xlsx do memorial: Fase posterior (client-side) ── */
      case 'gomGerarMemorialXlsxV1Json': return JSON.stringify({ ok: false, erro: 'Exportação do memorial será reativada após a migração.' });

      default:
        return Promise.reject(new Error('Função não mapeada na ponte Supabase: ' + nome));
    }
  }

  window.gomLog && window.gomLog('%c[GOM] Ponte Supabase ativa (google.script.run → Supabase)', 'background:#003b73;color:#00e5ff;padding:2px 6px;border-radius:4px;');
})();
