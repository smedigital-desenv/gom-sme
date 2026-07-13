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
    ESCOLA: 'Escola',
    VISUALIZADOR: 'Visualizador'
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
    // O papel do usuário NESTE sistema é o autoritativo: vem de sistema.papel
    // (a RPC minhas_permissoes() devolve sistemas:[{ slug, papel, telas }]).
    // perfil.tipo é o tipo global do usuário, usado só como reforço.
    var papel = String(
      (A && A.sistema && A.sistema.papel) ||
      (A && A.perfil && A.perfil.tipo) || ''
    ).trim().toLowerCase().replace(/[\s-]+/g, '_');
    // O central pode nomear o papel de admin como 'admin' ou 'admin_gom'.
    if (papel.indexOf('admin') === 0) return 'ADMIN_GOM';
    if (papel === 'secretaria') return 'SECRETARIA';
    if (papel === 'empresa') return 'EMPRESA';
    if (papel === 'escola') return 'ESCOLA';
    // Heurística por telas liberadas (última linha de defesa, caso o papel venha vazio).
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
    // Visualizador (só-leitura): flag global is_viewer OU papel 'visualizador'
    // no sistema. Vê TODAS as telas como ADMIN, mas o app entra em modo
    // somente-leitura (nenhuma gravação passa).
    var ehVisualizador = !!(A && (
      (A.perfil && A.perfil.is_viewer) ||
      (A.sistema && String(A.sistema.papel || '').toLowerCase() === 'visualizador')
    ));
    var perfil = ehVisualizador ? 'ADMIN_GOM' : _perfilGom(A);
    var telas = _telasLiberadas();
    var email = (A && A.perfil && A.perfil.email) || '';
    var nome = (A && A.perfil && A.perfil.nome) || '';
    var escola = _escolaGom(A);
    var inicial = PAGINA_INICIAL[perfil] || (telas[0] || 'dashboard');
    if (!_can(inicial, 'ver') && telas.length) inicial = telas[0];

    window.GomAuth.perfil = perfil;
    window.GomAuth.email = email;
    window.GomAuth.escola = escola;
    window.GomAuth.somenteLeitura = ehVisualizador;
    window.GomAuth.session = (A && A.perfil) ? { user: { email: email } } : null;
    window.GomAuth.podeVerTela = function (t) { return _can(t, 'ver'); };
    window.GomAuth.paginaInicial = function () { return inicial; };

    window.usuarioAtualGom = {
      ok: true,
      perfil: perfil,
      perfilLabel: ehVisualizador ? 'Visualizador' : (LABELS[perfil] || perfil),
      modo: ehVisualizador ? 'SOMENTE LEITURA' : 'CENTRAL',
      restrito: true,
      email: email,
      nome: nome,
      telas: telas.slice(),
      paginaInicial: inicial,
      unidades: [],
      restritoEscola: !!(A && A.restritoEscola),
      somenteLeitura: ehVisualizador,
      acoes: { configurar: !ehVisualizador && _can('configuracoes', 'ver') }
    };
    window.permissoesCarregadas = true;

    _marcarTelasNoDom();
    _atualizarBadge(ehVisualizador ? 'VISUALIZADOR' : perfil, email);
    _criarBotaoLogout();
    if (ehVisualizador) _ativarSomenteLeitura();
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

  /* ── Modo SOMENTE LEITURA (visualizador) ──────────────────────────────────
   * Vê tudo, mas nenhuma gravação passa. Bloqueia no cliente de DADOS do GOM
   * (window.SB): insert/update/delete/upsert e uploads de Storage viram no-op
   * com aviso, sem quebrar a navegação nem as leituras (.select). */
  function _ativarSomenteLeitura() {
    try { if (document.body) document.body.classList.add('gom-somente-leitura'); } catch (e) {}
    _bannerSomenteLeitura();
    _bloquearEscritasSB();
    _bloquearEscritasSB_retry(0);
  }

  // window.SB é criado pelo js/config.js, que carrega depois desta ponte;
  // tentamos algumas vezes até ele existir.
  function _bloquearEscritasSB_retry(n) {
    if (window.SB && window.SB.__gomRO) return;
    if (n > 20) return;
    setTimeout(function () { _bloquearEscritasSB(); _bloquearEscritasSB_retry(n + 1); }, 150);
  }

  function _bloquearEscritasSB() {
    var SB = window.SB;
    if (!SB || SB.__gomRO) return;
    SB.__gomRO = true;
    try {
      var origFrom = SB.from.bind(SB);
      SB.from = function (t) {
        var qb = origFrom(t);
        ['insert', 'update', 'delete', 'upsert'].forEach(function (m) {
          if (qb && typeof qb[m] === 'function') qb[m] = function () { return _roStub(); };
        });
        return qb;
      };
    } catch (e) {}
    try {
      if (SB.storage && SB.storage.from) {
        var origSFrom = SB.storage.from.bind(SB.storage);
        SB.storage.from = function (b) {
          var s = origSFrom(b);
          ['upload', 'update', 'remove', 'move', 'copy', 'createSignedUploadUrl'].forEach(function (m) {
            if (s && typeof s[m] === 'function') s[m] = function () { _toastRO(); return Promise.resolve({ data: null, error: { message: 'Somente leitura' } }); };
          });
          return s;
        };
      }
    } catch (e) {}
  }

  // "Thenable" encadeável que resolve com erro — para .insert().select().single() etc.
  function _roStub() {
    _toastRO();
    var p = new Proxy(function () {}, {
      get: function (_t, prop) {
        if (prop === 'then') return function (res) { return Promise.resolve({ data: null, error: { message: 'Somente leitura', code: 'GOM_RO' } }).then(res); };
        if (prop === 'catch' || prop === 'finally') return function () { return p; };
        return function () { return p; };
      },
      apply: function () { return p; }
    });
    return p;
  }

  var _roToastAte = 0;
  function _toastRO() {
    try {
      var agora = Date.now();
      if (agora < _roToastAte) return;      // throttle
      _roToastAte = agora + 1800;
    } catch (e) {}
    var msg = 'Modo somente leitura: alterações desabilitadas.';
    try {
      if (typeof window.gomToast === 'function') return window.gomToast(msg);
      if (typeof window.mostrarToast === 'function') return window.mostrarToast(msg);
    } catch (e) {}
    var b = document.getElementById('gomRoBanner');
    if (b) { b.classList.add('gom-ro-flash'); setTimeout(function () { b.classList.remove('gom-ro-flash'); }, 500); }
  }

  function _bannerSomenteLeitura() {
    if (document.getElementById('gomRoBanner')) return;
    var b = document.createElement('div');
    b.id = 'gomRoBanner';
    b.innerHTML = '<i class="bi bi-eye"></i>&nbsp; Modo somente leitura — você pode visualizar, mas não alterar informações.';
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#0e7490;color:#fff;'
      + 'font:600 13px system-ui,Segoe UI,sans-serif;padding:8px 14px;text-align:center;box-shadow:0 -2px 12px rgba(0,0,0,.18);transition:background .2s;';
    (document.body || document.documentElement).appendChild(b);
    if (!document.getElementById('gomRoStyle')) {
      var st = document.createElement('style'); st.id = 'gomRoStyle';
      st.textContent = '.gom-ro-flash{background:#b45309 !important}';
      document.head.appendChild(st);
    }
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
