/* ============================================================================
 * GOM | SME — Roteador de ACESSO (login híbrido)
 * ----------------------------------------------------------------------------
 * Decide, no carregamento, COMO o usuário entra:
 *
 *   • CENTRAL  → Secretaria / Escola / Admin entram pelo Controle de Acesso
 *                CENTRAL da rede (SSO Google). Carrega /central/* + a ponte.
 *   • EMPRESA  → o fornecedor externo entra por CÓDIGO (PIN), como antes,
 *                direto no GOM (validado no Supabase do GOM). NÃO passa pelo
 *                central; enxerga só a tela 'empresa'.
 *   • GATE     → sem sessão: mostra a tela de acesso com as duas opções.
 *   • SETUP    → link ?empresa-setup=token: define o PIN da empresa.
 *
 * Motivo do híbrido: a empresa não usa conta Google institucional, então o
 * acesso dela permanece por PIN (governado localmente pelo GOM). O restante
 * fica centralizado. Os DADOS do GOM seguem no Supabase do GOM (window.SB).
 * ========================================================================== */
(function () {
  'use strict';

  var MAX_TENTATIVAS_PIN = 5;
  var BLOQUEIO_PIN_MS = 10 * 60 * 1000;

  // ── Detecção de modo (executa durante o parse) ────────────────────────────
  function _temSessaoCentral() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (k && /^sb-.*-auth-token$/.test(k)) return true;
      }
    } catch (e) {}
    return false;
  }

  var setupToken = _setupTokenDaUrl();
  var empresaPin = false;
  try { empresaPin = sessionStorage.getItem('gomPinPerfil') === 'EMPRESA'; } catch (e) {}
  var sessaoCentral = _temSessaoCentral();

  var MODO;
  if (setupToken) MODO = 'SETUP';
  else if (sessaoCentral) MODO = 'CENTRAL';   // sessão do central tem prioridade
  else if (empresaPin) MODO = 'EMPRESA';
  else MODO = 'GATE';
  window.__GOM_ACESSO_MODO = MODO;

  // Gate visual imediato: nada interno aparece antes de decidir o acesso.
  try {
    document.documentElement.classList.add('gom-auth-gate');
    if (document.body) document.body.classList.add('gom-auth-gate');
  } catch (e) {}

  // ── CENTRAL: carrega o central de forma síncrona e ordenada ───────────────
  // Só carregamos o /central/ aqui — assim, nos modos EMPRESA/GATE o
  // acesso-sme.js não roda e não redireciona para o login do central
  // (o que impediria a empresa de escolher o PIN). Same-origin: sem bloqueio.
  if (MODO === 'CENTRAL') {
    document.write('<script src="/central/config.js"><\/script>');
    document.write('<script src="/central/acesso-sme.js"><\/script>');
    document.write('<script src="js/acesso-central.js"><\/script>');
    return; // a ponte (acesso-central.js) assume daqui.
  }

  // ── Logout dos modos locais (empresa/gate): limpa o PIN e volta ao acesso ──
  window.gomLogout = async function () {
    try { sessionStorage.removeItem('gomPinPerfil'); } catch (e) {}
    try {
      window.location.href = window.location.origin + window.location.pathname;
    } catch (e) { try { window.location.reload(); } catch (_) {} }
  };

  // ── EMPRESA: perfil local, só a tela 'empresa' ────────────────────────────
  if (MODO === 'EMPRESA') {
    _definirPerfilEmpresaLocal();
    _mostrarApp();
    return; // state.js encadeia o boot (loadPage('empresa') + dados).
  }

  // ── GATE / SETUP: tela de acesso ──────────────────────────────────────────
  function _iniciarTela() {
    if (MODO === 'SETUP') _mostrarTelaDefinirPin(setupToken);
    else _mostrarTelaLogin();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _iniciarTela);
  } else {
    _iniciarTela();
  }

  /* ========================================================================
   *  Perfil local da EMPRESA
   * ====================================================================== */
  function _definirPerfilEmpresaLocal() {
    window.GomAuth = {
      perfil: 'EMPRESA',
      email: 'empresa@pin',
      session: null,
      escola: null,
      podeVerTela: function (t) { return t === 'empresa'; },
      paginaInicial: function () { return 'empresa'; }
    };
    window.usuarioAtualGom = {
      ok: true,
      perfil: 'EMPRESA',
      perfilLabel: 'Empresa',
      modo: 'PIN EMPRESA',
      restrito: true,
      email: '',
      telas: ['empresa'],
      paginaInicial: 'empresa',
      unidades: [],
      acoes: { configurar: false }
    };
    window.permissoesCarregadas = true;
    try {
      sessionStorage.setItem('gom:lastPage', 'empresa');
      localStorage.setItem('gom:lastPage', 'empresa');
    } catch (e) {}
  }

  /* ========================================================================
   *  Overlay / telas de acesso
   * ====================================================================== */
  function _mostrarApp() {
    try {
      document.documentElement.classList.remove('gom-auth-gate');
      if (document.body) document.body.classList.remove('gom-auth-gate');
    } catch (e) {}
    var o = document.getElementById('gomAcessoOverlay');
    if (o) o.remove();
  }

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

  window.gomEntrarCentral = function () {
    window.location.href = (window.ACESSO_LOGIN || '/central/login.html') + '?next=index.html';
  };

  function _mostrarTelaLogin() {
    _overlay().innerHTML =
      '<div style="background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);padding:40px 36px;max-width:420px;width:100%;">'
      + '<div style="text-align:center;margin-bottom:24px;">'
      + '<i class="bi bi-gear-wide-connected" style="font-size:2.8rem;color:#075f82;"></i>'
      + '<h2 style="font-weight:900;color:#002b5e;margin:8px 0 4px;">GOM | SME</h2>'
      + '<p style="color:#64748b;font-size:.88rem;">Acesso ao sistema</p>'
      + '</div>'
      + '<div id="gomLoginMsg" style="display:none;margin-bottom:14px;border-radius:10px;padding:10px 14px;font-size:.88rem;"></div>'
      + '<div style="display:flex;gap:8px;margin-bottom:20px;">'
      + '<button class="btn btn-primary fw-bold flex-fill" id="gomTabSec" onclick="gomLoginAba(\'secretaria\')"><i class="bi bi-building me-1"></i>Secretaria</button>'
      + '<button class="btn btn-outline-secondary fw-bold flex-fill" id="gomTabEmp" onclick="gomLoginAba(\'empresa\')"><i class="bi bi-tools me-1"></i>Empresa</button>'
      + '</div>'
      + '<div id="gomFormSec">'
      + '<button id="gomBtnGoogle" class="btn btn-light border fw-bold w-100 py-3" onclick="gomEntrarCentral()" style="font-size:1rem;border-radius:12px;">'
      + '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" style="margin-right:10px;vertical-align:middle;">Entrar com Google Institucional</button>'
      + '<p class="text-muted small text-center mt-3">Acesso institucional pela rede SME</p>'
      + '</div>'
      + '<div id="gomFormEmp" style="display:none;">'
      + '<label class="form-label fw-bold text-muted small">CÓDIGO DE ACESSO</label>'
      + '<input type="password" id="gomLoginPIN" class="form-control mb-3" placeholder="Informe o código de acesso" autocomplete="off" onkeydown="if(event.key===\'Enter\') gomLoginPIN()">'
      + '<button id="gomBtnPIN" class="btn btn-primary fw-bold w-100" onclick="gomLoginPIN()"><i class="bi bi-shield-lock-fill me-1"></i>Entrar com código</button>'
      + '</div>'
      + '</div>';
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

  function _msg(txt, tipo) {
    var el = document.getElementById('gomLoginMsg') || document.getElementById('gomSetupMsg');
    if (!el) return;
    el.style.display = 'block';
    if (tipo === 'erro') { el.style.background = '#fef2f2'; el.style.color = '#dc2626'; el.style.border = '1px solid #fca5a5'; }
    else { el.style.background = '#eff6ff'; el.style.color = '#1d4ed8'; el.style.border = '1px solid #93c5fd'; }
    el.textContent = txt;
  }

  /* ── PIN da empresa (validado no Supabase do GOM) ─────────────────────────── */
  function _pinBloqueado() {
    var ate = Number(sessionStorage.getItem('gomPinBloqueadoAte') || 0);
    if (!ate) return false;
    if (Date.now() > ate) { _limparFalhasPin(); return false; }
    return true;
  }
  function _registrarFalhaPin() {
    var t = Number(sessionStorage.getItem('gomPinTentativas') || 0) + 1;
    sessionStorage.setItem('gomPinTentativas', String(t));
    if (t >= MAX_TENTATIVAS_PIN) sessionStorage.setItem('gomPinBloqueadoAte', String(Date.now() + BLOQUEIO_PIN_MS));
  }
  function _limparFalhasPin() {
    sessionStorage.removeItem('gomPinTentativas');
    sessionStorage.removeItem('gomPinBloqueadoAte');
  }

  window.gomLoginPIN = async function () {
    var pinEl = document.getElementById('gomLoginPIN');
    if (!pinEl) return;
    if (_pinBloqueado()) { _msg('Muitas tentativas. Aguarde alguns minutos e tente novamente.', 'erro'); return; }
    var pin = pinEl.value.trim();
    if (!pin) { _msg('Informe o código de acesso.', 'erro'); return; }
    var btn = document.getElementById('gomBtnPIN');
    if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
    try {
      if (!window.SB) { _msg('Sistema ainda carregando. Tente novamente em instantes.', 'erro'); if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; } return; }
      var r = await window.SB.from('configuracoes').select('valor').eq('chave', 'CODIGO_ACESSO_EMPRESA').maybeSingle();
      var pinSalvo = r.data ? String(r.data.valor || '') : '';
      if (!pinSalvo) { _registrarFalhaPin(); _msg('Não foi possível validar o acesso. Contate a administração.', 'erro'); if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; } return; }
      if (pin !== pinSalvo) { _registrarFalhaPin(); _msg(_pinBloqueado() ? 'Muitas tentativas. Aguarde alguns minutos e tente novamente.' : 'Acesso não autorizado.', 'erro'); if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; } return; }
      _limparFalhasPin();
      try {
        sessionStorage.setItem('gomPinPerfil', 'EMPRESA');
        sessionStorage.setItem('gom:lastPage', 'empresa');
        localStorage.setItem('gom:lastPage', 'empresa');
        window.location.hash = 'empresa';
      } catch (e) {}
      window.location.reload(); // recarrega já no modo EMPRESA.
    } catch (e) {
      _msg('Não foi possível validar o acesso. Tente novamente.', 'erro');
      if (btn) { btn.disabled = false; btn.textContent = 'Entrar com código'; }
    }
  };

  /* ── Primeiro acesso da empresa: define o PIN via token (?empresa-setup) ──── */
  function _setupTokenDaUrl() {
    try {
      var m = (window.location.search || '').match(/[?&]empresa-setup=([^&]+)/);
      return m ? decodeURIComponent(m[1]) : '';
    } catch (e) { return ''; }
  }

  function _mostrarTelaDefinirPin(token) {
    _overlay().innerHTML =
      '<div style="background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);padding:40px 36px;max-width:420px;width:100%;">'
      + '<div style="text-align:center;margin-bottom:20px;">'
      + '<i class="bi bi-shield-lock-fill" style="font-size:2.6rem;color:#075f82;"></i>'
      + '<h2 style="font-weight:900;color:#002b5e;margin:8px 0 4px;">Primeiro acesso da Empresa</h2>'
      + '<p style="color:#64748b;font-size:.9rem;">Defina o código de acesso (PIN) que a empresa usará para entrar no sistema.</p>'
      + '</div>'
      + '<div id="gomSetupMsg" style="display:none;margin-bottom:14px;border-radius:10px;padding:10px 14px;font-size:.88rem;"></div>'
      + '<label class="form-label fw-bold text-muted small">NOVO PIN <span class="fw-normal">(mín. 4 caracteres)</span></label>'
      + '<input type="password" id="gomSetupPin1" class="form-control mb-3" placeholder="Digite o PIN" autocomplete="new-password">'
      + '<label class="form-label fw-bold text-muted small">CONFIRME O PIN</label>'
      + '<input type="password" id="gomSetupPin2" class="form-control mb-3" placeholder="Repita o PIN" autocomplete="new-password" onkeydown="if(event.key===\'Enter\') gomDefinirPinEmpresa()">'
      + '<button id="gomBtnSetupPin" class="btn btn-primary fw-bold w-100" onclick="gomDefinirPinEmpresa()"><i class="bi bi-check2-circle me-1"></i>Salvar PIN</button>'
      + '</div>';
    var ov = document.getElementById('gomAcessoOverlay');
    if (ov) ov.dataset.setupToken = token;
  }

  window.gomDefinirPinEmpresa = async function () {
    var p1 = document.getElementById('gomSetupPin1');
    var p2 = document.getElementById('gomSetupPin2');
    var btn = document.getElementById('gomBtnSetupPin');
    var pin = p1 ? p1.value.trim() : '';
    var pin2 = p2 ? p2.value.trim() : '';
    if (pin.length < 4) { _msg('O PIN deve ter ao menos 4 caracteres.', 'erro'); return; }
    if (pin !== pin2) { _msg('Os PINs não coincidem.', 'erro'); return; }
    var ov = document.getElementById('gomAcessoOverlay');
    var token = ov && ov.dataset ? ov.dataset.setupToken : '';
    function _reset() { if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Salvar PIN'; } }
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Salvando...'; }
    try {
      if (!window.SB) { _msg('Sistema ainda carregando. Tente novamente.', 'erro'); _reset(); return; }
      var r = await window.SB.rpc('definir_pin_empresa', {
        p_token: token, p_pin: pin, p_hml: (String(window.GOM_DB_PREFIX || '') === 'hml_')
      });
      if (r && r.error) { _msg('Erro: ' + r.error.message, 'erro'); _reset(); return; }
      var data = r ? r.data : null;
      if (!data || data.ok !== true) { _msg((data && data.erro) || 'Não foi possível salvar o PIN.', 'erro'); _reset(); return; }
      _msg('PIN cadastrado com sucesso! Redirecionando para o login...', 'ok');
      setTimeout(function () { window.location.href = window.location.origin + window.location.pathname; }, 1600);
    } catch (e) {
      _msg('Não foi possível salvar o PIN. Tente novamente.', 'erro');
      _reset();
    }
  };
})();
