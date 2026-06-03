window.usuarioAtualGom = window.usuarioAtualGom || null;
window.permissoesCarregadas = window.permissoesCarregadas || false;

function carregarUsuarioPermissoes(callback) {
  google.script.run
    .withSuccessHandler(function(res) {
      var payload = parseJsonPermissoes_(res);
      if (!payload || payload.ok === false) {
        window.usuarioAtualGom = perfilFallbackPermissoes_();
      } else {
        window.usuarioAtualGom = payload.usuario || payload;
      }
      window.permissoesCarregadas = true;
      aplicarPermissoesInterface();
      if (typeof callback === 'function') callback(window.usuarioAtualGom);
    })
    .withFailureHandler(function(err) {
      console.error('[GOM PERMISSÕES] Erro ao carregar usuário:', err);
      window.usuarioAtualGom = perfilFallbackPermissoes_();
      window.permissoesCarregadas = true;
      aplicarPermissoesInterface();
      if (typeof callback === 'function') callback(window.usuarioAtualGom);
    })
    .gomObterUsuarioAtualV1Json();
}

function parseJsonPermissoes_(res) {
  if (typeof res === 'string') {
    try { return JSON.parse(res); } catch(e) { return { ok: false, erro: 'JSON inválido' }; }
  }
  return res || { ok: false };
}

function perfilFallbackPermissoes_() {
  return {
    ok: true,
    perfil: 'ADMIN_GOM',
    perfilLabel: 'Administrador GOM',
    modo: 'ABERTO',
    restrito: false,
    email: '',
    telas: (window.TELAS_WEB || []).slice(),
    paginaInicial: 'dashboard',
    unidades: [],
    acoes: { configurar: true }
  };
}

function getUsuarioGom() {
  return window.usuarioAtualGom || perfilFallbackPermissoes_();
}

function podeAcessarPagina(pageName) {
  var usuario = getUsuarioGom();
  if (!usuario.restrito) return true;
  return Array.isArray(usuario.telas) && usuario.telas.indexOf(pageName) >= 0;
}

function getPaginaInicialPermitida(preferida) {
  if (podeAcessarPagina(preferida)) return preferida;
  var usuario = getUsuarioGom();
  return (usuario.telas && usuario.telas[0]) || 'acompanhar';
}

function aplicarPermissoesInterface() {
  var usuario = getUsuarioGom();
  var telas = Array.isArray(usuario.telas) ? usuario.telas : [];
  var restrito = Boolean(usuario.restrito);

  document.querySelectorAll('[data-page]').forEach(function(el) {
    var page = el.getAttribute('data-page');
    if (!page || page === 'mais') return;
    var permitido = !restrito || telas.indexOf(page) >= 0;
    el.classList.toggle('gom-permissao-oculto', !permitido);
    el.disabled = !permitido;
  });

  document.querySelectorAll('.nav-more').forEach(function(box) {
    var visiveis = box.querySelectorAll('.nav-more-item:not(.gom-permissao-oculto)').length;
    box.classList.toggle('gom-permissao-oculto', visiveis === 0);
  });

  atualizarBadgePerfilUsuario();
}

function atualizarBadgePerfilUsuario() {
  var usuario = getUsuarioGom();
  var perfil = usuario.perfilLabel || usuario.perfil || 'Usuário';
  var modo = usuario.modo ? 'Modo: ' + usuario.modo : '';
  var email = usuario.email || '';
  var detalhe = [modo, email].filter(Boolean).join(' · ');
  var html = '<span class="perfil-badge-text" title="' + escapeHtml(perfil) + '">' + escapeHtml(perfil) + '</span>' + (detalhe ? '<small title="' + escapeHtml(detalhe) + '">' + escapeHtml(detalhe) + '</small>' : '');

  var desktop = document.getElementById('perfilUsuarioBadge');
  if (desktop) desktop.innerHTML = html;

  var mobile = document.getElementById('mobilePerfilUsuarioBadge');
  if (mobile) mobile.textContent = perfil;
}

function renderAcessoNegado(pageName) {
  fecharMobileMais();
  var main = document.getElementById('main-content');
  var usuario = getUsuarioGom();
  if (!main) return;
  main.innerHTML = [
    '<div class="acesso-negado-card">',
      '<i class="bi bi-shield-lock"></i>',
      '<h4>Acesso restrito</h4>',
      '<p>Seu perfil <strong>' + escapeHtml(usuario.perfilLabel || usuario.perfil || '') + '</strong> não possui acesso à tela <strong>' + escapeHtml((ROTULOS_PAGINAS_GOM && ROTULOS_PAGINAS_GOM[pageName]) || pageName) + '</strong>.</p>',
      '<button class="btn btn-primary fw-bold" onclick="loadPage(\'' + escapeJsAttr(getPaginaInicialPermitida('dashboard')) + '\')"><i class="bi bi-arrow-left me-1"></i>Ir para minha tela inicial</button>',
    '</div>'
  ].join('');
}

window.carregarUsuarioPermissoes = carregarUsuarioPermissoes;
window.podeAcessarPagina = podeAcessarPagina;
window.getPaginaInicialPermitida = getPaginaInicialPermitida;
window.aplicarPermissoesInterface = aplicarPermissoesInterface;
window.renderAcessoNegado = renderAcessoNegado;