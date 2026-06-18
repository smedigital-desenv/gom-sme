/* ============================================================================
 * GOM | SME — Sessão por inatividade
 * ----------------------------------------------------------------------------
 * Derruba login após período sem uso, sem alterar dados do sistema.
 * Padrão: 4 horas. Pode ser sobrescrito por window.GOM_SESSAO_INATIVIDADE_HORAS.
 * ========================================================================== */
(function () {
  'use strict';

  var STORAGE_KEY = 'gomUltimaAtividadeSessao';
  var AVISO_KEY = 'gomLogoutInatividadeAvisado';
  var DEFAULT_HORAS = 4;
  var CHECK_MS = 60 * 1000;
  var THROTTLE_MS = 20 * 1000;
  var ultimoRegistroLocal = 0;
  var logoutDisparado = false;

  function horasConfiguradas_() {
    var h = Number(window.GOM_SESSAO_INATIVIDADE_HORAS || DEFAULT_HORAS);
    if (!isFinite(h) || h <= 0) h = DEFAULT_HORAS;
    return h;
  }

  function timeoutMs_() {
    return horasConfiguradas_() * 60 * 60 * 1000;
  }

  function usuarioLogado_() {
    try {
      if (window.GomAuth && window.GomAuth.perfil) return true;
      if (sessionStorage.getItem('gomPinPerfil')) return true;
    } catch (e) {}
    return false;
  }

  function agora_() {
    return Date.now();
  }

  function registrarAtividade_(forcar) {
    if (!usuarioLogado_()) return;
    var agora = agora_();
    if (!forcar && agora - ultimoRegistroLocal < THROTTLE_MS) return;
    ultimoRegistroLocal = agora;
    try {
      localStorage.setItem(STORAGE_KEY, String(agora));
      localStorage.removeItem(AVISO_KEY);
    } catch (e) {}
  }

  function ultimaAtividade_() {
    try {
      var v = Number(localStorage.getItem(STORAGE_KEY) || 0);
      if (v && isFinite(v)) return v;
    } catch (e) {}
    return agora_();
  }

  async function sairPorInatividade_() {
    if (logoutDisparado) return;
    logoutDisparado = true;
    try { localStorage.setItem(AVISO_KEY, String(agora_())); } catch (e) {}

    if (window.gomLogout && typeof window.gomLogout === 'function') {
      try { await window.gomLogout(); return; } catch (e) {}
    }

    // Fallback extremo, caso login.js não esteja disponível.
    try { sessionStorage.clear(); } catch (e1) {}
    try {
      Object.keys(localStorage || {}).forEach(function(k) {
        var kk = String(k || '').toLowerCase();
        if (kk.indexOf('gom') >= 0 || kk.indexOf('supabase') >= 0 || kk.indexOf('sb-') === 0) {
          localStorage.removeItem(k);
        }
      });
    } catch (e2) {}
    try { window.location.reload(); } catch (e3) {}
  }

  function verificarInatividade_() {
    if (!usuarioLogado_()) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      return;
    }
    var diff = agora_() - ultimaAtividade_();
    if (diff >= timeoutMs_()) sairPorInatividade_();
  }

  function instalarEventos_() {
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart', 'pointerdown'].forEach(function(evt) {
      window.addEventListener(evt, function() { registrarAtividade_(false); }, { passive: true });
    });
    window.addEventListener('hashchange', function() { registrarAtividade_(true); });
    document.addEventListener('visibilitychange', function() {
      if (!document.hidden) verificarInatividade_();
    });
  }

  window.gomRegistrarAtividadeSessao = function() { registrarAtividade_(true); };
  window.gomVerificarInatividadeSessao = verificarInatividade_;

  instalarEventos_();
  setInterval(verificarInatividade_, CHECK_MS);
  setTimeout(function() { registrarAtividade_(true); }, 1200);
})();
