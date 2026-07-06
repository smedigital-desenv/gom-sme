/* ============================================================================
 * GOM | SME — Ponte para o CONTROLE DE ACESSO CENTRAL (Fase 1: login + telas)
 * ----------------------------------------------------------------------------
 * A autenticação (SSO Google) e as PERMISSÕES DE TELA passam a ser controladas
 * pelo Controle de Acesso CENTRAL da rede SME (window.AcessoSME), servido em
 * /central/. Este arquivo é a CAMADA DE COMPATIBILIDADE: traduz o AcessoSME
 * para os símbolos que o restante do app já usa (window.GomAuth,
 * window.usuarioAtualGom) e expõe o logout central.
 *
 * IMPORTANTE (Fase 1): os DADOS do GOM continuam no Supabase do GOM (window.SB).
 * O central usa o SEU próprio cliente (window.ACESSO_SB). São clientes SEPARADOS.
 * A proteção definitiva dos dados (RLS) é a Fase 2 — aqui tratamos só o acesso
 * (login + quais telas o usuário enxerga).
 * ========================================================================== */
(function () {
  'use strict';

  // Slugs de tela do GOM (espelham o mapa papel->tela cadastrado no central).
  var TELAS_GOM = [
    'dashboard', 'triagem', 'fila', 'aprovacao', 'empresa', 'campo',
    'alertas', 'obras', 'historico', 'relatorios', 'cadastro', 'equipes',
    'acompanhar', 'escola', 'configuracoes', 'saldo'
  ];

  var LABELS = {
    ADMIN_GOM: 'Administrador GOM',
    SECRETARIA: 'Secretaria',
    EMPRESA: 'Empresa',
    ESCOLA: 'Escola'
  };

  var PAGINA_INICIAL = {
    ADMIN_GOM: 'dashboard',
    SECRETARIA: 'dashboard',
    EMPRESA: 'empresa',
    ESCOLA: 'escola'
  };

  function _A() { return window.AcessoSME || null; }

  function _can(tela, acao) {
    var A = _A();
    if (A && typeof A.can === 'function') return !!A.can(tela, acao || 'ver');
    return false;
  }

  // Stub inicial: código que leia GomAuth antes do central ficar pronto não quebra.
  window.GomAuth = window.GomAuth || {
    perfil: null,
    email: null,
    session: null,
    escola: null,
    podeVerTela: function (t) { return _can(t, 'ver'); },
    paginaInicial: function () { return PAGINA_INICIAL[this.perfil] || 'dashboard'; }
  };

  /* ── Gate visual imediato: impede que telas internas apareçam antes do acesso ── */
  try {
    document.documentElement.classList.add('gom-auth-gate');
    if (document.body) document.body.classList.add('gom-auth-gate');
  } catch (e) {}
  _mostrarOverlayCarregando();

  function _overlay() {
    var o = document.getElementById('gomAcessoOverlay');
    if (!o) {
      o = document.createElement('div');
      o.id = 'gomAcessoOverlay';
      o.setAttribute('aria-live', 'polite');
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:linear-gradient(135deg,#002b5e,#075f82);display:flex;align-items:center;justify-content:center;padding:20px;';
      (document.body || document.documentElement).appendChild(o);
    }
    o.style.display = 'flex';
    return o;
  }

  function _mostrarOverlayCarregando() {
    try {
      _overlay().innerHTML =
        '<div style="width:min(430px,92vw);background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.35);padding:34px 30px;text-align:center;">'
        + '<div class="spinner-border text-primary" role="status" style="width:2.6rem;height:2.6rem;"></div>'
        + '<h3 style="font-weight:900;color:#002b5e;margin:18px 0 6px;font-size:1.25rem;">Verificando acesso...</h3>'
        + '<p style="color:#64748b;margin:0;font-size:.94rem;line-height:1.45;">Controle de acesso central da SME.</p>'
        + '</div>';
    } catch (e) {}
  }

  function _mostrarOverlayErro(msg) {
    try {
      var login = window.ACESSO_LOGIN || '/central/login.html';
      _overlay().innerHTML =
        '<div style="width:min(430px,92vw);background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.35);padding:34px 30px;text-align:center;">'
        + '<i class="bi bi-shield-exclamation" style="font-size:2.4rem;color:#dc2626;"></i>'
        + '<h3 style="font-weight:900;color:#002b5e;margin:14px 0 6px;font-size:1.2rem;">Acesso indisponível</h3>'
        + '<p style="color:#64748b;margin:0 0 16px;font-size:.94rem;line-height:1.45;">' + (msg || 'Não foi possível carregar o controle de acesso central.') + '</p>'
        + '<a class="btn btn-primary fw-bold" href="' + login + '">Ir para o login</a>'
        + '</div>';
    } catch (e) {}
  }

  function _removerOverlay() {
    var o = document.getElementById('gomAcessoOverlay');
    if (o) o.remove();
  }

  /* ── Mapeamento AcessoSME -> perfil/estruturas herdadas do GOM ─────────────── */
  function _perfilGom(A) {
    if (A && A.perfil && A.perfil.is_super_admin) return 'ADMIN_GOM';
    var tipo = String((A && A.perfil && A.perfil.tipo) || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (tipo === 'admin_gom' || tipo === 'secretaria' || tipo === 'empresa' || tipo === 'escola') {
      return tipo.toUpperCase();
    }
    // Heurística por telas liberadas (robusta, independe do vocabulário de 'tipo').
    if ((A && A.restritoEscola) || (_can('escola') && !_can('empresa') && !_can('dashboard'))) return 'ESCOLA';
    if (_can('empresa') && !_can('dashboard') && !_can('escola')) return 'EMPRESA';
    if (_can('configuracoes') || _can('equipes')) return 'ADMIN_GOM';
    return 'SECRETARIA';
  }

  function _telasLiberadas() {
    var out = [];
    for (var i = 0; i < TELAS_GOM.length; i++) {
      if (_can(TELAS_GOM[i], 'ver')) out.push(TELAS_GOM[i]);
    }
    return out;
  }

  function _escolaGom(A) {
    try {
      if (A && A.restritoEscola && Array.isArray(A.escolas) && A.escolas.length) {
        var e = A.escolas[0];
        return { id: e.id, nome: e.nome || '' };
      }
    } catch (e) {}
    return null;
  }

  /* Constrói GomAuth + usuarioAtualGom a partir do AcessoSME (já pronto).
   * Retorna o usuarioAtualGom para encadear com o boot do app (state.js). */
  window.gomAcessoCentralAplicar = function () {
    var A = _A();
    var perfil = _perfilGom(A);
    var telas = _telasLiberadas();
    var email = (A && A.perfil && A.perfil.email) || '';
    var nome = (A && A.perfil && A.perfil.nome) || '';
    var escola = _escolaGom(A);
    var inicial = PAGINA_INICIAL[perfil] || (telas[0] || 'dashboard');
    if (!_can(inicial, 'ver') && telas.length) inicial = telas[0];

    window.GomAuth.perfil = perfil;
    window.GomAuth.email = email;
    window.GomAuth.escola = escola;
    window.GomAuth.session = (A && A.perfil) ? { user: { email: email } } : null;
    window.GomAuth.podeVerTela = function (t) { return _can(t, 'ver'); };
    window.GomAuth.paginaInicial = function () { return inicial; };

    window.usuarioAtualGom = {
      ok: true,
      perfil: perfil,
      perfilLabel: LABELS[perfil] || perfil,
      modo: 'CENTRAL',
      restrito: true,
      email: email,
      nome: nome,
      telas: telas.slice(),
      paginaInicial: inicial,
      unidades: [],
      restritoEscola: !!(A && A.restritoEscola),
      acoes: { configurar: _can('configuracoes', 'ver') }
    };
    window.permissoesCarregadas = true;

    _marcarTelasNoDom();
    _atualizarBadge(perfil, email);
    _criarBotaoLogout();
    _mostrarApp();

    return window.usuarioAtualGom;
  };

  /* Compat: fluxos antigos chamavam window.gomAplicarPerfil(). */
  window.gomAplicarPerfil = function () {
    window.gomAcessoCentralAplicar();
    if (typeof window.aplicarPermissoesInterface === 'function') window.aplicarPermissoesInterface();
  };

  /* Marca os botões do menu (data-page="dashboard" ...) também com
   * data-tela="dashboard" para que o AcessoSME esconda automaticamente as
   * telas sem permissão. Complementa aplicarPermissoesInterface(). */
  function _marcarTelasNoDom() {
    try {
      document.querySelectorAll('[data-page]').forEach(function (el) {
        var p = el.getAttribute('data-page');
        if (!p || p === 'mais') return;
        if (!el.hasAttribute('data-tela')) el.setAttribute('data-tela', p);
      });
      var saldo = document.getElementById('btn-saldo');
      if (saldo && !saldo.hasAttribute('data-tela')) saldo.setAttribute('data-tela', 'saldo');
    } catch (e) {}
  }

  function _atualizarBadge(perfil, email) {
    var label = LABELS[perfil] || perfil || 'Usuário';
    var emailLabel = (email && email !== 'empresa@pin') ? ' · ' + email : '';
    var badge = document.getElementById('perfilUsuarioBadge');
    var mobileBadge = document.getElementById('mobilePerfilUsuarioBadge');
    if (badge) badge.textContent = label + emailLabel;
    if (mobileBadge) mobileBadge.textContent = label;
  }

  function _mostrarApp() {
    try { document.documentElement.classList.remove('gom-auth-gate'); } catch (e) {}
    try { if (document.body) document.body.classList.remove('gom-auth-gate'); } catch (e) {}
    _removerOverlay();
  }

  function _criarBotaoLogout() {
    if (document.getElementById('gomBtnLogoutNav')) return;
    var nav = document.querySelector('.nav-actions-primary');
    if (!nav) return;
    var btn = document.createElement('button');
    btn.id = 'gomBtnLogoutNav';
    btn.className = 'btn-nav';
    btn.title = 'Sair';
    btn.innerHTML = '<i class="bi bi-box-arrow-right"></i><span>Sair</span>';
    btn.onclick = window.gomLogout;
    (nav.parentElement || nav).appendChild(btn);
  }

  /* Logout: encerra a sessão no CENTRAL e volta ao login central. */
  window.gomLogout = async function () {
    try {
      var A = _A();
      if (A && typeof A.signOut === 'function') { await A.signOut(); return; }
    } catch (e) {}
    try { window.location.href = window.ACESSO_LOGIN || '/central/login.html'; } catch (e) {}
  };

  /* Espera o central e resolve aplicando o perfil. Usado por
   * carregarUsuarioPermissoes() (permissoes.js) para encadear o boot do app. */
  window.gomAcessoCentralPronto = function () {
    var A = _A();
    if (!A || !A.pronto) {
      _mostrarOverlayErro('O módulo de acesso central (/central/acesso-sme.js) não carregou.');
      return Promise.reject(new Error('AcessoSME ausente'));
    }
    return A.pronto.then(function () { return window.gomAcessoCentralAplicar(); });
  };

  /* Rede de segurança: se o central falhar, mostra erro claro em vez de deixar
   * o usuário preso na tela "Verificando acesso...". */
  try {
    var A0 = _A();
    if (A0 && A0.pronto && typeof A0.pronto.catch === 'function') {
      A0.pronto.catch(function () {
        _mostrarOverlayErro('Não foi possível verificar seu acesso no central.');
      });
    } else if (!A0) {
      _mostrarOverlayErro('O módulo de acesso central (/central/acesso-sme.js) não carregou.');
    }
  } catch (e) {}
})();
