/* GOM | SME - Feedback visual padronizado */
(function () {
  'use strict';

  var timer = null;

  function ensureToast() {
    var el = document.getElementById('gomToastGlobal');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'gomToastGlobal';
    el.className = 'gom-toast-global';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
    return el;
  }

  window.gomToast = function (mensagem, tipo, duracao) {
    var el = ensureToast();
    var classe = tipo || 'info';
    el.className = 'gom-toast-global ' + classe + ' show';
    el.innerHTML = '<span>' + String(mensagem || '').replace(/[&<>]/g, function (s) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[s];
    }) + '</span>';

    clearTimeout(timer);
    timer = setTimeout(function () {
      el.classList.remove('show');
    }, Number(duracao || 2800));
  };

  window.gomMarcarBotaoSalvando = function (botao, salvando, textoSalvando) {
    if (!botao) return;
    if (salvando) {
      if (!botao.dataset.gomTextoOriginal) botao.dataset.gomTextoOriginal = botao.innerHTML;
      botao.disabled = true;
      botao.classList.add('gom-btn-loading');
      botao.innerHTML = '<span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>' + (textoSalvando || 'Salvando...');
    } else {
      botao.disabled = false;
      botao.classList.remove('gom-btn-loading');
      if (botao.dataset.gomTextoOriginal) botao.innerHTML = botao.dataset.gomTextoOriginal;
      delete botao.dataset.gomTextoOriginal;
    }
  };
})();
