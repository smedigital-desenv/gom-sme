/* GOM | SME - Ajustes leves de acessibilidade para formulários dinâmicos */
(function () {
  'use strict';

  var contador = 0;
  var SELETOR_CAMPOS = 'input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"]), select, textarea';

  function normalizarTexto(txt) {
    return String(txt || '')
      .replace(/[_-]+/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function textoDoCampo(campo) {
    var txt = campo.getAttribute('data-label') ||
      campo.getAttribute('aria-label') ||
      campo.getAttribute('placeholder') ||
      campo.getAttribute('title') ||
      campo.getAttribute('name') ||
      campo.getAttribute('id') ||
      'Campo do formulário';

    txt = normalizarTexto(txt);
    if (!txt) txt = 'Campo do formulário';
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  }

  function idSeguro(campo) {
    if (campo.id) return campo.id;
    contador += 1;
    campo.id = 'gom-campo-auto-' + Date.now().toString(36) + '-' + contador;
    return campo.id;
  }

  function temLabelAssociado(campo) {
    if (campo.labels && campo.labels.length) return true;
    if (campo.id && document.querySelector('label[for="' + CSS.escape(campo.id) + '"]')) return true;
    return false;
  }

  function vincularLabelsSoltos(root) {
    (root || document).querySelectorAll('label:not([for])').forEach(function (label) {
      if (label.querySelector(SELETOR_CAMPOS)) return;
      var prox = label.nextElementSibling;
      if (!prox) return;

      var campo = prox.matches && prox.matches(SELETOR_CAMPOS) ? prox : prox.querySelector && prox.querySelector(SELETOR_CAMPOS);
      if (!campo) return;

      label.setAttribute('for', idSeguro(campo));
    });
  }

  function garantirLabel(campo) {
    if (!campo || campo.disabled || temLabelAssociado(campo)) return;

    var id = idSeguro(campo);
    if (!campo.getAttribute('aria-label')) campo.setAttribute('aria-label', textoDoCampo(campo));

    var label = document.createElement('label');
    label.className = 'gom-sr-only gom-auto-label';
    label.setAttribute('for', id);
    label.textContent = campo.getAttribute('aria-label') || textoDoCampo(campo);

    campo.parentNode.insertBefore(label, campo);
  }

  function aplicar(root) {
    try {
      var base = root && root.querySelectorAll ? root : document;
      vincularLabelsSoltos(base);
      base.querySelectorAll(SELETOR_CAMPOS).forEach(garantirLabel);
    } catch (e) {
      if (window.gomWarn) window.gomWarn('[GOM] Acessibilidade:', e && e.message ? e.message : e);
    }
  }

  var timer = null;
  function agendar(root) {
    clearTimeout(timer);
    timer = setTimeout(function () { aplicar(root || document); }, 120);
  }

  document.addEventListener('DOMContentLoaded', function () {
    aplicar(document);
    try {
      var obs = new MutationObserver(function (mutations) {
        var relevante = mutations.some(function (m) { return m.addedNodes && m.addedNodes.length; });
        if (relevante) agendar(document);
      });
      obs.observe(document.body, { childList: true, subtree: true });
    } catch (e) {}
  });

  window.gomGarantirLabelsCampos = aplicar;
})();
