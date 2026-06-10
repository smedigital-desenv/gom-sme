/* GOM | SME - Modo produção silencioso
   Reduz logs internos no console sem esconder erros reais. */
(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search || '');
  var debugParam = params.get('debug');
  var debugStorage = null;
  try { debugStorage = localStorage.getItem('gomDebug'); } catch (e) {}

  window.GOM_DEBUG = debugParam === '1' || debugParam === 'true' || debugStorage === '1' || debugStorage === 'true';

  function isDebug() { return window.GOM_DEBUG === true; }

  function isInternalGomMessage(args) {
    if (!args || !args.length) return false;
    var first = args[0];
    return typeof first === 'string' && first.indexOf('[GOM]') !== -1;
  }

  function bindConsole(method) {
    var original = console && console[method] ? console[method].bind(console) : function () {};
    return function () {
      var args = Array.prototype.slice.call(arguments);
      if (!isDebug() && isInternalGomMessage(args)) return;
      original.apply(console, args);
    };
  }

  if (window.console) {
    console.log = bindConsole('log');
    console.info = bindConsole('info');
    console.debug = bindConsole('debug');
  }

  window.gomLog = function () {
    if (isDebug() && window.console && console.log) console.log.apply(console, arguments);
  };

  window.gomInfo = function () {
    if (isDebug() && window.console && console.info) console.info.apply(console, arguments);
  };

  window.gomWarn = function () {
    if (isDebug() && window.console && console.warn) console.warn.apply(console, arguments);
  };

  window.gomSetDebug = function (ativo) {
    window.GOM_DEBUG = !!ativo;
    try { localStorage.setItem('gomDebug', ativo ? '1' : '0'); } catch (e) {}
    if (window.console && console.info) {
      console.info('GOM_DEBUG:', window.GOM_DEBUG ? 'ativado' : 'desativado');
    }
  };
})();
