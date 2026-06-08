/* ============================================================================
 * GOM | SME — Login híbrido: Google OAuth + PIN Empresa
 * Ajuste de produção v3:
 * - Corrige o bug de sair e entrar novamente de forma imediata.
 * - Remove corrida entre o callback automático do Supabase e o callback manual.
 * - Usa troca manual do code OAuth com detectSessionInUrl: false no config.js.
 * - Mantém um pequeno intervalo técnico interno após logout, sem exigir ação do usuário.
 * - Mantém PIN da empresa funcionando.
 * ========================================================================== */
(function () {
  'use strict';

  const TELAS = {
    ADMIN_GOM:  ['dashboard','triagem','fila','aprovacao','empresa','campo','alertas','obras','historico','relatorios','cadastro','equipes','acompanhar','configuracoes'],
    GOM:        ['dashboard','triagem','fila','aprovacao','campo','alertas','obras','historico','relatorios','cadastro','acompanhar'],
    EMPRESA:    ['empresa'],
    CAMPO:      ['campo','acompanhar','dashboard'],
    CONFERENTE: ['dashboard','historico','relatorios','obras'],
    ESCOLA:     ['acompanhar','cadastro']
  };

  const PAGINA = {
    ADMIN_GOM: 'dashboard',
    GOM: 'dashboard',
    EMPRESA: 'empresa',
    CAMPO: 'campo',
    CONFERENTE: 'dashboard',
    ESCOLA: 'acompanhar'
  };

  const LABELS = {
    ADMIN_GOM: 'Administrador GOM',
    GOM: 'Equipe GOM',
    EMPRESA: 'Empresa',
    CAMPO: 'Campo',
    CONFERENTE: 'Conferente',
    ESCOLA: 'Escola'
  };

  const MAX_TENTATIVAS_PIN = 5;
  const BLOQUEIO_PIN_MS = 10 * 60 * 1000;
  const LOGOUT_GRACE_MS = 1800;
  const AUTH_READY_TIMEOUT_MS = 6000;

  let authListenerRegistrado = false;
  let loginFinalizando = false;
  let loginGoogleIniciando = false;

  window.GomAuth = {
    perfil: null,
    email: null,
    session: null,
    podeVerTela: function (tela) {
      return (TELAS[this.perfil] || []).indexOf(tela) >= 0;
    },
    paginaInicial: function () {
      return PAGINA[this.perfil] || 'dashboard';
    }
  };

  window.gomAuthInit = async function () {
    await _aguardarSupabaseAuthPronto();

    if (_temCallbackOAuth()) {
      var sessaoCallback = await _resolverCallbackOAuthManual();
      if (sessaoCallback && sessaoCallback.user) {
        await _finalizarLoginComSessao(sessaoCallback);
        return true;
      }
    }

    var sessao = await _obterSessaoComTentativas(_temCallbackOAuth() ? 12000 : 2200);
    if (sessao && sessao.user) {
      await _finalizarLoginComSessao(sessao);
      return true;
    }

    var pinP = sessionStorage.getItem('gomPinPerfil');
    if (pinP && TELAS[pinP]) {
      GomAuth.perfil = pinP;
      GomAuth.email = 'empresa@pin';
      GomAuth.session = null;
      return true;
    }

    return false;
  };

  async function _aguardarSupabaseAuthPronto() {
    var inicio = Date.now();
    while (Date.now() - inicio <= AUTH_READY_TIMEOUT_MS) {
      if (window.SB && window.SB.auth && typeof window.SB.auth.getSession === 'function') return;
      await _esperar(100);
    }
  }

  async function _resolverCallbackOAuthManual() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      var erro = params.get('error');
      var code = params.get('code');

      if (erro) {
        _limparUrlOAuth();
        return null;
      }

      if (!code || !window.SB || !window.SB.auth || typeof window.SB.auth.exchangeCodeForSession !== 'function') {
        return null;
      }

      var resp = await window.SB.auth.exchangeCodeForSession(code);
      if (resp && resp.error) throw resp.error;

      if (resp && resp.data && resp.data.session && resp.data.session.user) {
        sessionStorage.removeItem('gomOauthStart');
        _limparUrlOAuth();
        return resp.data.session;
      }
    } catch (e) {
      if (window.gomWarn) window.gomWarn('[GOM] Callback OAuth manual não finalizado. Tentando sessão persistida.', e);
    }

    var sessao = await _obterSessaoComTentativas(8000);
    if (sessao && sessao.user) {
      sessionStorage.removeItem('gomOauthStart');
      _limparUrlOAuth();
      return sessao;
    }

    return null;
  }

  async function _finalizarLoginComSessao(sessao) {
    if (!sessao || !sessao.user) return false;
    if (loginFinalizando) return true;

    loginFinalizando = true;
    try {
      sessionStorage.removeItem('gomPinPerfil');
      sessionStorage.removeItem('gomLogoutAte');
      sessionStorage.removeItem('gomOauthStart');

      GomAuth.session = sessao;
      GomAuth.email = sessao.user.email || '';
      await _carregarPerfil(GomAuth.email);
      _limparUrlOAuth();
      return true;
    } finally {
      setTimeout(function () { loginFinalizando = false; }, 500);
    }
  }

  async function _obterSessaoComTentativas(tempoMaximoMs) {
    var inicio = Date.now();
    var ultimoErro = null;

    while (Date.now() - inicio <= tempoMaximoMs) {
      try {
        var resp = await window.SB.auth.getSession();
        var sessao = resp && resp.data ? resp.data.session : null;
        if (sessao && sessao.user) return sessao;
      } catch (e) {
        ultimoErro = e;
      }
      await _esperar(250);
    }

    if (ultimoErro && window.gomWarn) window.gomWarn('[GOM] Não foi possível obter sessão OAuth.', ultimoErro);
    return null;
  }

  function _temCallbackOAuth() {
    var s = window.location.search || '';
    var h = window.location.hash || '';
    return /[?&]code=/.test(s) || /[?&]error=/.test(s) || /access_token=/.test(h) || /refresh_token=/.test(h);
  }

  function _urlLimpaAtual() {
    var url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    return url.toString();
  }

  function _limparUrlOAuth() {
    try {
      var limpa = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, limpa);
    } catch (e) {}
  }

  function _msLogoutRestante() {
    var ate = Number(sessionStorage.getItem('gomLogoutAte') || 0);
    if (!ate) return 0;
    var restante = ate - Date.now();
    if (restante <= 0) {
      sessionStorage.removeItem('gomLogoutAte');
      return 0;
    }
    return restante;
  }

  async function _aguardarLogoutRecente() {
    var restante = _msLogoutRestante();
    if (restante > 0) {
      await _esperar(restante + 100);
      sessionStorage.removeItem('gomLogoutAte');
    }
  }

  function _limparStorageAuthSupabase() {
    [window.localStorage, window.sessionStorage].forEach(function (storage) {
      if (!storage) return;
      var remover = [];
      for (var i = 0; i < storage.length; i++) {
        var k = storage.key(i);
        if (!k) continue;
        var kl = String(k).toLowerCase();
        if (
          kl.indexOf('supabase') >= 0 ||
          kl.indexOf('sb-') === 0 ||
          kl.indexOf('pkce') >= 0 ||
          kl.indexOf('oauth') >= 0
        ) {
          remover.push(k);
        }
      }
      remover.forEach(function (k) {
        try { storage.removeItem(k); } catch (e) {}
      });
    });
  }

  async function _carregarPerfil(email) {
    try {
      var r = await window.SB
        .from('perfis')
        .select('perfil,ativo')
        .ilike('email', email)
        .maybeSingle();

      GomAuth.perfil = (r.data && r.data.ativo) ? r.data.perfil : 'GOM';
    } catch (e) {
      GomAuth.perfil = 'GOM';
    }
  }

  window.gomEntrarGoogle = async function () {
    if (loginGoogleIniciando) return;
    loginGoogleIniciando = true;

    var btn = document.getElementById('gomBtnGoogle');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Preparando acesso...';
    }

    try {
      await _aguardarLogoutRecente();

      if (btn) {
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Redirecionando...';
      }

      sessionStorage.removeItem('gomPinPerfil');
      sessionStorage.setItem('gomOauthStart', String(Date.now()));

      _limparStorageAuthSupabase();
      sessionStorage.setItem('gomOauthStart', String(Date.now()));

      var resp = await window.SB.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: _urlLimpaAtual(),
          queryParams: {
            prompt: 'select_account'
          }
        }
      });

      if (resp && resp.error) throw resp.error;
    } catch (e) {
      loginGoogleIniciando = false;
      sessionStorage.removeItem('gomOauthStart');
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" style="margin-right:8px;">Entrar com Google Institucional';
      }
      _msg('Não foi possível iniciar o login. Tente novamente.', 'erro');
    }
  };

  window.gomLoginPIN = async function () {
    var pinEl = document.getElementById('gomLoginPIN');
    if (!pinEl) return;

    if (_pinBloqueado()) {
      _msg('Muitas tentativas. Aguarde alguns minutos e tente novamente.', 'erro');
      return;
    }

    var pin = pinEl.value.trim();
    if (!pin) {
      _msg('Informe o código de acesso.', 'erro');
      return;
    }

    var btn = document.getElementById('gomBtnPIN');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Verificando...';
    }

    try {
      var r = await window.SB
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'CODIGO_ACESSO_EMPRESA')
        .maybeSingle();

      var pinSalvo = r.data ? String(r.data.valor || '') : '';
      if (!pinSalvo) {
        _registrarFalhaPin();
        _msg('Não foi possível validar o acesso. Contate a administração.', 'erro');
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; }
        return;
      }

      if (pin !== pinSalvo) {
        _registrarFalhaPin();
        _msg(_pinBloqueado() ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' : 'Acesso não autorizado.', 'erro');
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; }
        return;
      }

      _limparFalhasPin();
      try { await window.SB.auth.signOut({ scope: 'local' }); } catch (e) {}
      _limparStorageAuthSupabase();
      sessionStorage.setItem('gomPinPerfil', 'EMPRESA');
      GomAuth.perfil = 'EMPRESA';
      GomAuth.email = 'empresa@pin';
      GomAuth.session = null;
      _loginSucesso();
    } catch (e) {
      _msg('Não foi possível validar o acesso. Tente novamente.', 'erro');
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; }
    }
  };

  window.gomLogout = async function () {
    var ate = Date.now() + LOGOUT_GRACE_MS;

    sessionStorage.removeItem('gomPinPerfil');
    sessionStorage.removeItem('gomOauthStart');
    sessionStorage.setItem('gomLogoutAte', String(ate));
    _limparFalhasPin();

    GomAuth.perfil = null;
    GomAuth.email = null;
    GomAuth.session = null;

    try {
      if (window.SB && window.SB.auth) {
        await window.SB.auth.signOut({ scope: 'local' });
      }
    } catch (e) {}

    _limparStorageAuthSupabase();
    sessionStorage.setItem('gomLogoutAte', String(ate));

    try {
      var limpa = window.location.origin + window.location.pathname + '?gom_logout=' + Date.now();
      window.location.replace(limpa);
    } catch (e) {
      _limparUrlOAuth();
      _mostrarTelaLogin();
    }
  };

  window.gomAplicarPerfil = function () {
    var telas = TELAS[GomAuth.perfil] || [];

    document.querySelectorAll('[data-page]').forEach(function (botao) {
      if (!botao.dataset.page || botao.dataset.page === 'mais') return;
      botao.style.display = telas.indexOf(botao.dataset.page) >= 0 ? '' : 'none';
    });

    var label = LABELS[GomAuth.perfil] || GomAuth.perfil;
    var emailLabel = (GomAuth.email && GomAuth.email !== 'empresa@pin') ? ' · ' + GomAuth.email : '';
    var badge = document.getElementById('perfilUsuarioBadge');
    var mobileBadge = document.getElementById('mobilePerfilUsuarioBadge');

    if (badge) badge.textContent = label + emailLabel;
    if (mobileBadge) mobileBadge.textContent = label;

    _criarBotaoLogout();

    if (typeof window.loadPage === 'function') {
      window.loadPage(GomAuth.paginaInicial());
    }
  };

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
    nav.parentElement.appendChild(btn);
  }

  function _mostrarTelaLogin() {
    _ocultarApp();
    _registrarListenerAuth();

    var old = document.getElementById('gomTelaLogin');
    if (old) {
      old.style.display = 'flex';
      _prepararBotaoGooglePosLogout();
      return;
    }

    var div = document.createElement('div');
    div.id = 'gomTelaLogin';
    div.style.cssText = 'position:fixed;inset:0;background:linear-gradient(135deg,#002b5e,#075f82);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
    div.innerHTML = `
      <div style="background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);padding:40px 36px;max-width:420px;width:100%;">
        <div style="text-align:center;margin-bottom:24px;">
          <i class="bi bi-gear-wide-connected" style="font-size:2.8rem;color:#075f82;"></i>
          <h2 style="font-weight:900;color:#002b5e;margin:8px 0 4px;">GOM | SME</h2>
          <p style="color:#64748b;font-size:.88rem;">Acesso restrito ao sistema</p>
        </div>

        <div id="gomLoginMsg" style="display:none;margin-bottom:14px;border-radius:10px;padding:10px 14px;font-size:.88rem;"></div>

        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <button class="btn btn-primary fw-bold flex-fill" id="gomTabSec" onclick="gomLoginAba('secretaria')">
            <i class="bi bi-building me-1"></i>Secretaria
          </button>
          <button class="btn btn-outline-secondary fw-bold flex-fill" id="gomTabEmp" onclick="gomLoginAba('empresa')">
            <i class="bi bi-tools me-1"></i>Empresa
          </button>
        </div>

        <div id="gomFormSec">
          <button id="gomBtnGoogle" class="btn btn-light border fw-bold w-100 py-3" onclick="gomEntrarGoogle()" style="font-size:1rem;border-radius:12px;">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" style="margin-right:10px;vertical-align:middle;">
            Entrar com Google Institucional
          </button>
          <p class="text-muted small text-center mt-3">Acesso institucional autorizado</p>
        </div>

        <div id="gomFormEmp" style="display:none;">
          <label class="form-label fw-bold text-muted small">CÓDIGO DE ACESSO</label>
          <input type="password" id="gomLoginPIN" class="form-control mb-3"
                 placeholder="Informe o código de acesso"
                 autocomplete="off"
                 onkeydown="if(event.key==='Enter') gomLoginPIN()">
          <button id="gomBtnPIN" class="btn btn-primary fw-bold w-100" onclick="gomLoginPIN()">
            <i class="bi bi-shield-lock-fill me-1"></i>Entrar com código
          </button>
        </div>
      </div>`;

    document.body.appendChild(div);
    _prepararBotaoGooglePosLogout();
  }

  function _prepararBotaoGooglePosLogout() {
    var restante = _msLogoutRestante();
    if (restante <= 0) return;

    var btn = document.getElementById('gomBtnGoogle');
    if (!btn) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Preparando acesso...';

    setTimeout(function () {
      if (!document.getElementById('gomTelaLogin')) return;
      var b = document.getElementById('gomBtnGoogle');
      if (!b) return;
      b.disabled = false;
      b.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" style="margin-right:10px;vertical-align:middle;">Entrar com Google Institucional';
      sessionStorage.removeItem('gomLogoutAte');
    }, restante + 120);
  }

  function _registrarListenerAuth() {
    if (authListenerRegistrado) return;
    authListenerRegistrado = true;

    window.SB.auth.onAuthStateChange(async function (event, session) {
      if (event === 'SIGNED_IN' && session && session.user && !_temCallbackOAuth()) {
        var ok = await _finalizarLoginComSessao(session);
        if (ok) _loginSucesso();
      }
    });
  }

  window.gomLoginAba = function (aba) {
    var formSec = document.getElementById('gomFormSec');
    var formEmp = document.getElementById('gomFormEmp');
    var tabSec = document.getElementById('gomTabSec');
    var tabEmp = document.getElementById('gomTabEmp');

    if (formSec) formSec.style.display = aba === 'secretaria' ? '' : 'none';
    if (formEmp) formEmp.style.display = aba === 'empresa' ? '' : 'none';
    if (tabSec) tabSec.className = 'btn fw-bold flex-fill ' + (aba === 'secretaria' ? 'btn-primary' : 'btn-outline-secondary');
    if (tabEmp) tabEmp.className = 'btn fw-bold flex-fill ' + (aba === 'empresa' ? 'btn-primary' : 'btn-outline-secondary');
  };

  function _pinBloqueado() {
    var ate = Number(sessionStorage.getItem('gomPinBloqueadoAte') || 0);
    if (!ate) return false;
    if (Date.now() > ate) {
      _limparFalhasPin();
      return false;
    }
    return true;
  }

  function _registrarFalhaPin() {
    var tentativas = Number(sessionStorage.getItem('gomPinTentativas') || 0) + 1;
    sessionStorage.setItem('gomPinTentativas', String(tentativas));
    if (tentativas >= MAX_TENTATIVAS_PIN) {
      sessionStorage.setItem('gomPinBloqueadoAte', String(Date.now() + BLOQUEIO_PIN_MS));
    }
  }

  function _limparFalhasPin() {
    sessionStorage.removeItem('gomPinTentativas');
    sessionStorage.removeItem('gomPinBloqueadoAte');
  }

  function _loginSucesso() {
    var el = document.getElementById('gomTelaLogin');
    if (el) el.remove();
    _mostrarApp();
    window.gomAplicarPerfil();
  }

  function _msg(txt, tipo) {
    var el = document.getElementById('gomLoginMsg');
    if (!el) return;
    el.style.display = 'block';
    if (tipo === 'erro') {
      el.style.background = '#fef2f2';
      el.style.color = '#dc2626';
      el.style.border = '1px solid #fca5a5';
    } else {
      el.style.background = '#eff6ff';
      el.style.color = '#1d4ed8';
      el.style.border = '1px solid #93c5fd';
    }
    el.textContent = txt;
  }

  function _ocultarApp() {
    ['nav-header','mobile-topbar','main','mobile-bottom-nav'].forEach(function (classe) {
      var e = document.querySelector('.' + classe) || document.querySelector(classe);
      if (e) e.style.display = 'none';
    });
    var loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  }

  function _mostrarApp() {
    ['nav-header','mobile-topbar','mobile-bottom-nav'].forEach(function (classe) {
      var e = document.querySelector('.' + classe);
      if (e) e.style.display = '';
    });
    var main = document.querySelector('main');
    if (main) main.style.display = '';
  }

  function _esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  document.addEventListener('DOMContentLoaded', function () {
    setTimeout(async function () {
      try {
        _registrarListenerAuth();

        if (_temCallbackOAuth()) {
          _ocultarApp();
        }

        var logado = await window.gomAuthInit();
        if (logado) {
          _mostrarApp();
          window.gomAplicarPerfil();
          return;
        }

        var r = await window.SB
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'LOGIN_ATIVO')
          .maybeSingle();

        if (r.data && String(r.data.valor || '').toUpperCase() === 'SIM') {
          _mostrarTelaLogin();
          if (_temCallbackOAuth()) {
            _msg('Não foi possível concluir o login. Tente novamente.', 'erro');
            _limparUrlOAuth();
          } else if ((window.location.search || '').indexOf('gom_logout=') >= 0) {
            try { window.history.replaceState({}, document.title, window.location.origin + window.location.pathname); } catch (e) {}
          }
        } else {
          GomAuth.perfil = 'ADMIN_GOM';
          GomAuth.email = '';
          _mostrarApp();
          window.gomAplicarPerfil();
        }
      } catch (e) {
        _mostrarTelaLogin();
        _msg('Não foi possível carregar o acesso. Atualize a página e tente novamente.', 'erro');
      }
    }, 300);
  });
})();
