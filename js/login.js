/* ============================================================================
 * GOM | SME — Login híbrido: Google OAuth + PIN Empresa
 * Ajuste de produção v9:
 * - Corrige o bug de sair e entrar novamente de forma imediata.
 * - Usa bloqueio visual imediato para impedir que telas/dados apareçam antes do login.
 * - Remove corrida entre o callback automático do Supabase e o callback manual.
 * - Usa troca manual do code OAuth com detectSessionInUrl: false no config.js.
 * - Mantém um pequeno intervalo técnico interno após logout, sem exigir ação do usuário.
 * - Mostra a transição também em recarregamentos com ?gom_logout de versões anteriores.
 * - Mantém PIN da empresa funcionando.
 * - Reduz a tela “Verificando acesso...” após o retorno do Google usando cache curto de perfil.
 * - Mostra a tela de login mais rápido quando não há sessão ativa.
 * ========================================================================== */
(function () {
  'use strict';

  const TELAS = {
    ADMIN_GOM:  ['dashboard','triagem','fila','aprovacao','empresa','campo','alertas','obras','historico','relatorios','cadastro','equipes','acompanhar','configuracoes'],
    SECRETARIA: ['dashboard','triagem','fila','aprovacao','empresa','campo','alertas','obras','historico','relatorios','cadastro','acompanhar'],
    // Compatibilidade: perfis antigos GOM passam a se comportar como SECRETARIA.
    GOM:        ['dashboard','triagem','fila','aprovacao','empresa','campo','alertas','obras','historico','relatorios','cadastro','acompanhar'],
    EMPRESA:    ['empresa'],
    ESCOLA:     ['acompanhar','cadastro']
  };

  const PAGINA = {
    ADMIN_GOM: 'dashboard',
    SECRETARIA: 'dashboard',
    GOM: 'dashboard',
    EMPRESA: 'empresa',
    ESCOLA: 'acompanhar'
  };

  const LABELS = {
    ADMIN_GOM: 'Administrador GOM',
    SECRETARIA: 'Secretaria',
    GOM: 'Secretaria',
    EMPRESA: 'Empresa',
    ESCOLA: 'Escola'
  };

  const MAX_TENTATIVAS_PIN = 5;
  const BLOQUEIO_PIN_MS = 10 * 60 * 1000;
  const LOGOUT_GRACE_MS = 1800;
  const AUTH_READY_TIMEOUT_MS = 1800;
  const CALLBACK_OAUTH_TIMEOUT_MS = 3200;
  const PERFIL_QUERY_TIMEOUT_MS = 850;
  const PERFIL_CACHE_KEY = 'gomPerfilCacheV1';
  const PERFIL_CACHE_TTL_MS = 10 * 60 * 1000;
  const LOGIN_ATIVO_CACHE_KEY = 'gomLoginAtivoCacheV1';
  const LOGIN_ATIVO_CACHE_TTL_MS = 5 * 60 * 1000;

  function _normalizarPerfilLogin(perfil) {
    var p = String(perfil || '').trim().toUpperCase().replace(/-/g, '_');
    if (p === 'GOM') return 'SECRETARIA';
    if (p === 'ADMIN-GOM') return 'ADMIN_GOM';
    if (!p || !TELAS[p]) return 'SECRETARIA';
    return p;
  }


  let authListenerRegistrado = false;
  let loginFinalizando = false;
  let loginGoogleIniciando = false;
  let logoutEmAndamento = false;
  let acessoFoiNegado = false; // marca quando um e-mail autenticado não está cadastrado em perfis

  window.GomAuth = {
    perfil: null,
    email: null,
    session: null,
    // Escola vinculada ao usuário logado (perfil ESCOLA). { id, nome } ou null.
    // Preenchida por _resolverEscolaDoUsuario_ a partir do e-mail (escolas.email).
    escola: null,
    podeVerTela: function (tela) {
      return (TELAS[this.perfil] || []).indexOf(tela) >= 0;
    },
    paginaInicial: function () {
      return PAGINA[this.perfil] || 'dashboard';
    }
  };

  // Bloqueio visual imediato: evita que qualquer tela interna apareça antes da autenticação.
  // O carregamento de dados pode continuar em segundo plano, mas a interface fica protegida.
  try {
    _ocultarApp();
    _mostrarTelaVerificando();
  } catch (e) {}

  window.gomAuthInit = async function () {
    await _aguardarSupabaseAuthPronto();

    if (_temCallbackOAuth()) {
      var sessaoCallback = await _resolverCallbackOAuthManual();
      if (sessaoCallback && sessaoCallback.user) {
        var okCb = await _finalizarLoginComSessao(sessaoCallback);
        return okCb !== false;
      }
    }

    var sessao = await _obterSessaoComTentativas(_temCallbackOAuth() ? 3800 : 650);
    if (sessao && sessao.user) {
      var okSessao = await _finalizarLoginComSessao(sessao);
      return okSessao !== false;
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

      var resp = await _comTimeout(
        window.SB.auth.exchangeCodeForSession(code),
        CALLBACK_OAUTH_TIMEOUT_MS,
        { gomTimeout: true }
      );
      if (resp && resp.gomTimeout) return null;
      if (resp && resp.error) throw resp.error;

      if (resp && resp.data && resp.data.session && resp.data.session.user) {
        sessionStorage.removeItem('gomOauthStart');
        _limparUrlOAuth();
        return resp.data.session;
      }
    } catch (e) {
      if (window.gomWarn) window.gomWarn('[GOM] Callback OAuth manual não finalizado. Tentando sessão persistida.', e);
    }

    var sessao = await _obterSessaoComTentativas(2200);
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
      var emailLogin = GomAuth.email;

      // Caminho rápido: após a primeira validação, usamos um cache curto do perfil
      // para que o retorno do Google não fique parado na tela “Verificando acesso...”.
      // Em paralelo, o Supabase confirma o perfil real e atualiza a interface se necessário.
      var perfilCache = _obterPerfilCache(emailLogin);
      if (perfilCache) {
        GomAuth.perfil = perfilCache;
        _limparUrlOAuth();
        _carregarPerfil(emailLogin).then(function (res) {
          if (res === null) {
            // Revalidação em segundo plano: e-mail não está mais autorizado.
            _negarAcessoNaoAutorizado(emailLogin);
          } else if (typeof window.gomAplicarPerfil === 'function' && GomAuth.perfil !== perfilCache) {
            window.gomAplicarPerfil();
          }
        }).catch(function () {});
        return true;
      }

      var resultado = await _carregarPerfil(emailLogin);
      _limparUrlOAuth();

      if (resultado === null) {
        // E-mail autenticado pelo Google, mas sem cadastro ativo em perfis: nega.
        await _negarAcessoNaoAutorizado(emailLogin);
        return false;
      }
      if (resultado === '__INDET__') {
        // Não foi possível confirmar o cadastro agora: não concede acesso.
        await _negarAcessoNaoAutorizado(emailLogin, true);
        return false;
      }
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

  // Vincula o usuário logado à sua escola (perfil ESCOLA), casando o e-mail com
  // escolas.email. Centraliza a resolução "e-mail → escola": hoje 1 e-mail por
  // escola; se no futuro for preciso vários e-mails por unidade, basta mudar aqui
  // (ou apontar para uma tabela de vínculo). Guarda em sessionStorage para
  // resistir a timeouts. Em caso de falha, restaura do cache.
  async function _resolverEscolaDoUsuario_(email) {
    GomAuth.escola = null;
    if (email) {
      try {
        var consulta = window.SB.from('escolas').select('id,nome,email').ilike('email', email).limit(1).maybeSingle();
        var r = await _comTimeout(consulta, PERFIL_QUERY_TIMEOUT_MS, { gomTimeout: true });
        if (r && !r.gomTimeout && r.data && r.data.id != null) {
          GomAuth.escola = { id: r.data.id, nome: r.data.nome || '' };
          try { sessionStorage.setItem('gomEscolaVinc', JSON.stringify(GomAuth.escola)); } catch (e) {}
          return GomAuth.escola;
        }
      } catch (e) {}
    }
    // Falha/timeout: tenta restaurar do cache da sessão.
    try {
      var cache = JSON.parse(sessionStorage.getItem('gomEscolaVinc') || 'null');
      if (cache && cache.id != null) { GomAuth.escola = cache; return cache; }
    } catch (e) {}
    return null;
  }

  // Retorna o perfil do e-mail; ou null quando o e-mail NÃO está cadastrado/ativo
  // em public.perfis (acesso negado); ou '__INDET__' quando não foi possível
  // verificar a tempo (timeout/erro) e não há cache válido.
  // Nunca concede um perfil padrão (ex.: SECRETARIA) a e-mails desconhecidos.
  async function _carregarPerfil(email) {
    var cache = _obterPerfilCache(email);
    try {
      var consulta = window.SB
        .from('perfis')
        .select('perfil,ativo')
        .ilike('email', email)
        .maybeSingle();

      var r = await _comTimeout(consulta, PERFIL_QUERY_TIMEOUT_MS, { gomTimeout: true });
      if (r && r.gomTimeout) {
        if (cache) { GomAuth.perfil = cache; if (cache === 'ESCOLA') await _resolverEscolaDoUsuario_(email); return cache; }
        GomAuth.perfil = null;
        return '__INDET__';
      }

      if (r && r.data && r.data.ativo) {
        GomAuth.perfil = _normalizarPerfilLogin(r.data.perfil);
        if (email) _salvarPerfilCache(email, GomAuth.perfil);
        if (GomAuth.perfil === 'ESCOLA') await _resolverEscolaDoUsuario_(email);
        return GomAuth.perfil;
      }

      // Consulta respondeu, mas não há registro ativo para este e-mail: não autorizado.
      if (email) _limparPerfilCache(email);
      GomAuth.perfil = null;
      return null;
    } catch (e) {
      if (cache) { GomAuth.perfil = cache; if (cache === 'ESCOLA') await _resolverEscolaDoUsuario_(email); return cache; }
      GomAuth.perfil = null;
      return '__INDET__';
    }
  }

  // Encerra a sessão e devolve o usuário à tela de login com mensagem clara.
  // Usado quando um e-mail autenticado pelo Google não está cadastrado em perfis.
  async function _negarAcessoNaoAutorizado(email, indeterminado) {
    acessoFoiNegado = true;
    var emailNegado = email || GomAuth.email || '';
    try { sessionStorage.removeItem('gomPinPerfil'); } catch (e) {}
    try { sessionStorage.removeItem('gomEscolaVinc'); } catch (e) {}
    GomAuth.perfil = null;
    GomAuth.session = null;
    GomAuth.email = null;
    GomAuth.escola = null;
    if (email) { try { _limparPerfilCache(email); } catch (e) {} }
    try {
      if (window.SB && window.SB.auth) {
        await Promise.race([ window.SB.auth.signOut({ scope: 'local' }), _esperar(1200) ]);
      }
    } catch (e) {}
    _limparStorageAuthSupabase();
    _limparUrlOAuth();
    _ocultarApp();
    _mostrarTelaLogin();
    if (indeterminado) {
      _msg('Não foi possível verificar seu acesso agora. Verifique a conexão e tente novamente.', 'erro');
    } else {
      _msg('Acesso não autorizado. O e-mail ' + (emailNegado || 'informado') + ' não está cadastrado no sistema. Procure a administração do GOM para liberar o acesso.', 'erro');
    }
  }

  function _obterPerfilCache(email) {
    if (!email) return null;
    try {
      var raw = localStorage.getItem(PERFIL_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || String(obj.email || '').toLowerCase() !== String(email || '').toLowerCase()) return null;
      var perfilNormalizado = _normalizarPerfilLogin(obj.perfil);
      if (!perfilNormalizado || !TELAS[perfilNormalizado]) return null;
      if (!obj.ts || Date.now() - Number(obj.ts) > PERFIL_CACHE_TTL_MS) return null;
      return perfilNormalizado;
    } catch (e) { return null; }
  }

  function _salvarPerfilCache(email, perfil) {
    perfil = _normalizarPerfilLogin(perfil);
    if (!email || !perfil || !TELAS[perfil]) return;
    try {
      localStorage.setItem(PERFIL_CACHE_KEY, JSON.stringify({
        email: String(email || '').toLowerCase(),
        perfil: perfil,
        ts: Date.now()
      }));
    } catch (e) {}
  }

  function _limparPerfilCache(email) {
    try {
      var raw = localStorage.getItem(PERFIL_CACHE_KEY);
      if (!raw) return;
      var obj = JSON.parse(raw);
      if (!email || String(obj.email || '').toLowerCase() === String(email || '').toLowerCase()) {
        localStorage.removeItem(PERFIL_CACHE_KEY);
      }
    } catch (e) {
      try { localStorage.removeItem(PERFIL_CACHE_KEY); } catch (_) {}
    }
  }

  window.gomEntrarGoogle = async function () {
    if (loginGoogleIniciando) return;
    loginGoogleIniciando = true;
    acessoFoiNegado = false;

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
      var r = await window.SB.rpc('validar_pin_empresa', {
        p_pin: pin, p_hml: (String(window.GOM_DB_PREFIX || '') === 'hml_')
      });

      if (r && r.error) {
        _registrarFalhaPin();
        _msg('Não foi possível validar o acesso. Contate a administração.', 'erro');
        if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; }
        return;
      }

      if (r.data !== true) {
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
      try {
        sessionStorage.setItem('gom:lastPage', 'empresa');
        localStorage.setItem('gom:lastPage', 'empresa');
        if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#empresa');
      } catch (e) {}
      _loginSucesso();
    } catch (e) {
      _msg('Não foi possível validar o acesso. Tente novamente.', 'erro');
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; }
    }
  };

  window.gomLogout = async function () {
    if (logoutEmAndamento) return;
    logoutEmAndamento = true;

    var inicioSaida = Date.now();
    var ate = Date.now() + LOGOUT_GRACE_MS;

    _mostrarTelaSaindo('Saindo do sistema...', 'Aguarde um instante enquanto encerramos sua sessão com segurança.');
    _ocultarApp();

    sessionStorage.removeItem('gomPinPerfil');
    sessionStorage.removeItem('gomOauthStart');
    sessionStorage.setItem('gomLogoutAte', String(ate));
    _limparFalhasPin();

    GomAuth.perfil = null;
    GomAuth.email = null;
    GomAuth.session = null;

    try {
      if (window.SB && window.SB.auth) {
        await Promise.race([
          window.SB.auth.signOut({ scope: 'local' }),
          _esperar(1200)
        ]);
      }
    } catch (e) {}

    _limparStorageAuthSupabase();
    sessionStorage.setItem('gomLogoutAte', String(ate));

    var passado = Date.now() - inicioSaida;
    if (passado < 900) {
      await _esperar(900 - passado);
    }

    _atualizarTelaSaindo('Saída concluída', 'Abrindo a tela de login...');
    await _esperar(250);

    try {
      _limparUrlOAuth();
      _mostrarTelaLogin();
    } finally {
      logoutEmAndamento = false;
    }
  };

  window.gomAplicarPerfil = function () {
    var telas = TELAS[GomAuth.perfil] || [];

    try {
      if (window.GomAuth && window.GomAuth.perfil) {
        window.usuarioAtualGom = {
          ok: true,
          perfil: GomAuth.perfil,
          perfilLabel: LABELS[GomAuth.perfil] || GomAuth.perfil,
          modo: GomAuth.perfil === 'EMPRESA' ? 'PIN EMPRESA' : 'LOGIN',
          restrito: true,
          email: GomAuth.email || '',
          telas: telas.slice(),
          paginaInicial: GomAuth.paginaInicial(),
          unidades: [],
          acoes: { configurar: GomAuth.perfil === 'ADMIN_GOM' }
        };
      }
    } catch (e) {}

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

    if (typeof window.aplicarPermissoesInterface === 'function') {
      window.aplicarPermissoesInterface();
    }

    if (GomAuth.perfil === 'EMPRESA' && typeof window.fecharMenuSecretaria === 'function') {
      window.fecharMenuSecretaria();
    }

    if (typeof window.loadPage === 'function') {
      // Não forçar Dashboard após login/reload. Mantém a rota salva quando ela
      // pertence ao perfil atual (ex.: Empresa > Agenda, Fila > Agenda, Campo).
      var destino = GomAuth.paginaInicial();
      try {
        var rotaSalva = typeof window.gomLerRotaSalva === 'function'
          ? window.gomLerRotaSalva()
          : (sessionStorage.getItem('gom:lastPage') || localStorage.getItem('gom:lastPage') || '');
        if (rotaSalva && GomAuth.podeVerTela(rotaSalva)) destino = rotaSalva;
      } catch (e) {}

      var atual = window.telaAtual || '';
      if (!atual || !GomAuth.podeVerTela(atual)) {
        window.loadPage(destino, true);
      }
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

  function _obterOverlayAuth() {
    var overlay = document.getElementById('gomAuthOverlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'gomAuthOverlay';
      overlay.setAttribute('aria-live', 'polite');
      overlay.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:linear-gradient(135deg,#002b5e,#075f82);display:flex;align-items:center;justify-content:center;padding:20px;';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    return overlay;
  }

  function _mostrarTelaVerificando() {
    var overlay = _obterOverlayAuth();
    overlay.style.background = 'linear-gradient(135deg,#002b5e,#075f82)';
    overlay.innerHTML = `
      <div style="width:min(430px,92vw);background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.35);padding:34px 30px;text-align:center;">
        <div class="spinner-border text-primary" role="status" style="width:2.6rem;height:2.6rem;"></div>
        <h3 style="font-weight:900;color:#002b5e;margin:18px 0 6px;font-size:1.25rem;">Carregando acesso...</h3>
        <p style="color:#64748b;margin:0;font-size:.94rem;line-height:1.45;">Aguarde um instante.</p>
      </div>`;
  }

  function _mostrarTelaSaindo(titulo, texto) {
    var overlay = _obterOverlayAuth();
    overlay.style.background = 'linear-gradient(135deg,#002b5e,#075f82)';
    overlay.innerHTML = `
      <div style="width:min(430px,92vw);background:#fff;border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.35);padding:34px 30px;text-align:center;">
        <div class="spinner-border text-primary" role="status" style="width:2.6rem;height:2.6rem;"></div>
        <h3 id="gomSaindoTitulo" style="font-weight:900;color:#002b5e;margin:18px 0 6px;font-size:1.25rem;">${titulo || 'Saindo do sistema...'}</h3>
        <p id="gomSaindoTexto" style="color:#64748b;margin:0;font-size:.94rem;line-height:1.45;">${texto || 'Aguarde um instante enquanto encerramos sua sessão com segurança.'}</p>
      </div>`;
  }

  function _atualizarTelaSaindo(titulo, texto) {
    var t = document.getElementById('gomSaindoTitulo');
    var p = document.getElementById('gomSaindoTexto');
    if (t && titulo) t.textContent = titulo;
    if (p && texto) p.textContent = texto;
  }

  function _removerOverlayAuth() {
    var el = document.getElementById('gomAuthOverlay');
    if (el) el.remove();
  }

  function _mostrarTelaLogin() {
    _ocultarApp();
    _registrarListenerAuth();

    var overlay = _obterOverlayAuth();
    overlay.style.background = 'linear-gradient(135deg,#002b5e,#075f82)';
    overlay.innerHTML = `
      <div id="gomTelaLogin" style="background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);padding:40px 36px;max-width:420px;width:100%;">
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
      if (!document.getElementById('gomAuthOverlay')) return;
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
    _removerOverlayAuth();
    _mostrarApp();

    // O perfil autenticado é a fonte de verdade para permissões visuais.
    // Isso evita que o PIN da empresa herde o modo aberto/ADMIN do backend antigo.
    try {
      if (window.GomAuth && window.GomAuth.perfil && window.GOM_PERFIS_ACESSO) {
        var perfil = window.GomAuth.perfil;
        var telas = (window.GOM_PERFIS_ACESSO[perfil] || []).slice();
        window.usuarioAtualGom = {
          ok: true,
          perfil: perfil,
          perfilLabel: ({ ADMIN_GOM:'Administrador GOM', GOM:'Equipe GOM', EMPRESA:'Empresa', CAMPO:'Campo', CONFERENTE:'Conferente', ESCOLA:'Escola' })[perfil] || perfil,
          modo: perfil === 'EMPRESA' ? 'PIN EMPRESA' : 'LOGIN',
          restrito: true,
          email: window.GomAuth.email || '',
          telas: telas,
          paginaInicial: perfil === 'EMPRESA' ? 'empresa' : (telas[0] || 'dashboard'),
          unidades: [],
          acoes: { configurar: perfil === 'ADMIN_GOM' }
        };
      }
    } catch (e) {}

    window.gomAplicarPerfil();
    if (typeof window.aplicarPermissoesInterface === 'function') window.aplicarPermissoesInterface();
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
    try { document.documentElement.classList.add('gom-auth-gate'); } catch (e) {}
    try { if (document.body) document.body.classList.add('gom-auth-gate'); } catch (e) {}
    ['nav-header','mobile-topbar','main','mobile-bottom-nav'].forEach(function (classe) {
      var e = document.querySelector('.' + classe) || document.querySelector(classe);
      if (e) e.style.display = 'none';
    });
    var loader = document.getElementById('loader');
    if (loader) loader.style.display = 'none';
  }

  function _mostrarApp() {
    try { document.documentElement.classList.remove('gom-auth-gate'); } catch (e) {}
    try { if (document.body) document.body.classList.remove('gom-auth-gate'); } catch (e) {}
    ['nav-header','mobile-topbar','mobile-bottom-nav'].forEach(function (classe) {
      var e = document.querySelector('.' + classe);
      if (e) e.style.display = '';
    });
    var main = document.querySelector('main');
    if (main) main.style.display = '';
  }

  function _loginAtivoCacheValido() {
    try {
      var raw = localStorage.getItem(LOGIN_ATIVO_CACHE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      if (!obj || !obj.ts || Date.now() - Number(obj.ts) > LOGIN_ATIVO_CACHE_TTL_MS) return null;
      return obj.ativo === true;
    } catch (e) { return null; }
  }

  function _salvarLoginAtivoCache(ativo) {
    try {
      localStorage.setItem(LOGIN_ATIVO_CACHE_KEY, JSON.stringify({ ativo: Boolean(ativo), ts: Date.now() }));
    } catch (e) {}
  }

  async function _loginAtivoNoSupabase() {
    try {
      var r = await Promise.race([
        window.SB
          .from('configuracoes')
          .select('valor')
          .eq('chave', 'LOGIN_ATIVO')
          .maybeSingle(),
        _esperar(1200).then(function () { return { timeout: true }; })
      ]);
      if (r && r.timeout) return true;
      var ativo = Boolean(r.data && String(r.data.valor || '').toUpperCase() === 'SIM');
      _salvarLoginAtivoCache(ativo);
      return ativo;
    } catch (e) {
      return true;
    }
  }

  function _mostrarLoginRapidoSeSemCallback() {
    if (_temCallbackOAuth()) return;
    if (_msLogoutRestante() > 0) return;
    // Como o sistema já está com LOGIN_ATIVO em produção/homologação,
    // evita deixar o usuário parado em “Verificando acesso...” só para buscar essa configuração.
    var cache = _loginAtivoCacheValido();
    if (cache !== false) {
      setTimeout(function () {
        if (!GomAuth.perfil && !GomAuth.session && !sessionStorage.getItem('gomPinPerfil')) {
          _mostrarTelaLogin();
        }
      }, 180);
    }
  }

  function _comTimeout(promessa, ms, valorTimeout) {
    return Promise.race([
      promessa,
      _esperar(ms).then(function () { return valorTimeout; })
    ]);
  }

  function _esperar(ms) {
    return new Promise(function (resolve) { setTimeout(resolve, ms); });
  }

  // ── Primeiro acesso da empresa: link com token p/ cadastrar o PIN ──────────
  function _empresaSetupTokenDaUrl_() {
    try {
      var m = (window.location.search || '').match(/[?&]empresa-setup=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  function _setupMsg_(texto, tipo) {
    var el = document.getElementById('gomSetupMsg');
    if (!el) return;
    el.style.display = '';
    el.textContent = texto;
    el.style.background = tipo === 'ok' ? '#dcfce7' : '#fee2e2';
    el.style.color = tipo === 'ok' ? '#166534' : '#991b1b';
  }

  function _mostrarTelaDefinirPinEmpresa(token) {
    _ocultarApp();
    var overlay = _obterOverlayAuth();
    overlay.style.background = 'linear-gradient(135deg,#002b5e,#075f82)';
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);padding:40px 36px;max-width:420px;width:100%;">
        <div style="text-align:center;margin-bottom:20px;">
          <i class="bi bi-shield-lock-fill" style="font-size:2.6rem;color:#075f82;"></i>
          <h2 style="font-weight:900;color:#002b5e;margin:8px 0 4px;">Primeiro acesso da Empresa</h2>
          <p style="color:#64748b;font-size:.9rem;">Defina o código de acesso (PIN) que a empresa usará para entrar no sistema.</p>
        </div>
        <div id="gomSetupMsg" style="display:none;margin-bottom:14px;border-radius:10px;padding:10px 14px;font-size:.88rem;"></div>
        <label class="form-label fw-bold text-muted small">NOVO PIN <span class="fw-normal">(mín. 4 caracteres)</span></label>
        <input type="password" id="gomSetupPin1" class="form-control mb-3" placeholder="Digite o PIN" autocomplete="new-password">
        <label class="form-label fw-bold text-muted small">CONFIRME O PIN</label>
        <input type="password" id="gomSetupPin2" class="form-control mb-3" placeholder="Repita o PIN" autocomplete="new-password"
               onkeydown="if(event.key==='Enter') gomDefinirPinEmpresa()">
        <button id="gomBtnSetupPin" class="btn btn-primary fw-bold w-100" onclick="gomDefinirPinEmpresa()">
          <i class="bi bi-check2-circle me-1"></i>Salvar PIN
        </button>
      </div>`;
    overlay.dataset.setupToken = token;
  }

  window.gomDefinirPinEmpresa = async function () {
    var p1 = document.getElementById('gomSetupPin1');
    var p2 = document.getElementById('gomSetupPin2');
    var btn = document.getElementById('gomBtnSetupPin');
    var pin = p1 ? p1.value.trim() : '';
    var pin2 = p2 ? p2.value.trim() : '';
    if (pin.length < 4) { _setupMsg_('O PIN deve ter ao menos 4 caracteres.', 'erro'); return; }
    if (pin !== pin2) { _setupMsg_('Os PINs não coincidem.', 'erro'); return; }
    var overlay = document.getElementById('gomAuthOverlay');
    var token = overlay && overlay.dataset ? overlay.dataset.setupToken : '';
    function _resetBtn() { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Salvar PIN'; } }
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...'; }
    try {
      var r = await window.SB.rpc('definir_pin_empresa', {
        p_token: token, p_pin: pin, p_hml: (String(window.GOM_DB_PREFIX || '') === 'hml_')
      });
      if (r && r.error) { _setupMsg_('Erro: ' + r.error.message, 'erro'); _resetBtn(); return; }
      var data = r ? r.data : null;
      if (!data || data.ok !== true) { _setupMsg_((data && data.erro) || 'Não foi possível salvar o PIN.', 'erro'); _resetBtn(); return; }
      _setupMsg_('PIN cadastrado com sucesso! Redirecionando para o login...', 'ok');
      setTimeout(function () { window.location.href = window.location.origin + window.location.pathname; }, 1600);
    } catch (e) {
      _setupMsg_('Não foi possível salvar o PIN. Tente novamente.', 'erro');
      _resetBtn();
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var _setupTok = _empresaSetupTokenDaUrl_();
    if (_setupTok) { _mostrarTelaDefinirPinEmpresa(_setupTok); return; }

    var veioDeLogout = (window.location.search || '').indexOf('gom_logout=') >= 0 || _msLogoutRestante() > 0;
    if (veioDeLogout) {
      _mostrarTelaSaindo('Preparando acesso...', 'Estamos finalizando a saída anterior e abrindo a tela de login.');
      _ocultarApp();
    }

    setTimeout(async function () {
      try {
        _registrarListenerAuth();

        var temCallback = _temCallbackOAuth();
        if (!temCallback && !veioDeLogout) {
          _mostrarLoginRapidoSeSemCallback();
        }

        var pinP = sessionStorage.getItem('gomPinPerfil');
        if (pinP && TELAS[pinP]) {
          GomAuth.perfil = pinP;
          GomAuth.email = 'empresa@pin';
          GomAuth.session = null;
          _loginSucesso();
          return;
        }

        if (temCallback) {
          _ocultarApp();
          _mostrarTelaVerificando();
        }

        var logado = await _comTimeout(window.gomAuthInit(), temCallback ? 5200 : 1500, false);
        if (logado) {
          _loginSucesso();
          return;
        }

        if (acessoFoiNegado) {
          // A negação de acesso já exibiu a tela de login com a mensagem correta.
          _limparUrlOAuth();
          return;
        }

        var loginAtivo = await _loginAtivoNoSupabase();

        if (loginAtivo) {
          _mostrarTelaLogin();
          if (temCallback) {
            _msg('Não foi possível concluir o login automaticamente. Clique novamente em Entrar com Google.', 'erro');
            _limparUrlOAuth();
          } else if ((window.location.search || '').indexOf('gom_logout=') >= 0) {
            try { window.history.replaceState({}, document.title, window.location.origin + window.location.pathname); } catch (e) {}
          }
        } else {
          GomAuth.perfil = 'ADMIN_GOM';
          GomAuth.email = '';
          _loginSucesso();
        }
      } catch (e) {
        _mostrarTelaLogin();
        _msg('Não foi possível carregar o acesso. Atualize a página e tente novamente.', 'erro');
      }
    }, 20);
  });
})();
