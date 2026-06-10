/* ============================================================================
 * GOM | SME — Permissões de interface por perfil
 * v32 — Revisão de regras de acesso antes das RLS finais
 *
 * Objetivo:
 * - Centralizar o que cada perfil pode ver no frontend.
 * - Impedir que EMPRESA/PIN herde rota antiga da Secretaria.
 * - Bloquear navegação direta para telas não permitidas.
 * - Manter ADMIN_GOM com acesso total.
 *
 * Observação: isso é proteção visual/operacional. A proteção definitiva será
 * feita depois nas políticas RLS do Supabase.
 * ========================================================================== */
window.usuarioAtualGom = window.usuarioAtualGom || null;
window.permissoesCarregadas = window.permissoesCarregadas || false;

var GOM_PERFIS_ACESSO = window.GOM_PERFIS_ACESSO || {
  ADMIN_GOM: [
    'dashboard', 'triagem', 'fila', 'aprovacao', 'empresa', 'campo',
    'alertas', 'obras', 'historico', 'relatorios', 'cadastro', 'equipes',
    'acompanhar', 'configuracoes'
  ],
  GOM: [
    'dashboard', 'triagem', 'fila', 'aprovacao', 'campo',
    'alertas', 'obras', 'historico', 'relatorios', 'cadastro', 'acompanhar'
  ],
  EMPRESA: [
    'empresa'
  ],
  CAMPO: [
    'campo', 'acompanhar'
  ],
  CONFERENTE: [
    'dashboard', 'historico', 'relatorios', 'obras', 'acompanhar'
  ],
  ESCOLA: [
    'acompanhar', 'cadastro'
  ]
};

var GOM_PERFIS_LABEL = window.GOM_PERFIS_LABEL || {
  ADMIN_GOM: 'Administrador GOM',
  GOM: 'Equipe GOM',
  EMPRESA: 'Empresa',
  CAMPO: 'Campo',
  CONFERENTE: 'Conferente',
  ESCOLA: 'Escola'
};

var GOM_PERFIS_INICIAL = window.GOM_PERFIS_INICIAL || {
  ADMIN_GOM: 'dashboard',
  GOM: 'dashboard',
  EMPRESA: 'empresa',
  CAMPO: 'campo',
  CONFERENTE: 'dashboard',
  ESCOLA: 'acompanhar'
};

var GOM_ROTAS_ALIAS = window.GOM_ROTAS_ALIAS || {
  secretaria: 'dashboard',
  home: 'dashboard',
  memorial: 'historico',
  gerenciarEquipes: 'equipes',
  gerenciar_equipes: 'equipes'
};

var GOM_TELAS_SECRETARIA = [
  'dashboard', 'triagem', 'fila', 'aprovacao', 'campo', 'alertas', 'obras',
  'historico', 'relatorios', 'equipes', 'acompanhar', 'configuracoes'
];

function normalizarPaginaPermissao_(pageName) {
  var p = String(pageName || '').trim();
  return GOM_ROTAS_ALIAS[p] || p;
}

function carregarUsuarioPermissoes(callback) {
  if (window.GomAuth && window.GomAuth.perfil) {
    window.usuarioAtualGom = perfilPeloGomAuth_();
    window.permissoesCarregadas = true;
    aplicarPermissoesInterface();
    _corrigirRotaAtualSeNaoPermitida();
    if (typeof callback === 'function') callback(window.usuarioAtualGom);
    return;
  }

  if (!window.google || !google.script || !google.script.run) {
    window.usuarioAtualGom = perfilFallbackPermissoes_();
    window.permissoesCarregadas = true;
    aplicarPermissoesInterface();
    if (typeof callback === 'function') callback(window.usuarioAtualGom);
    return;
  }

  google.script.run
    .withSuccessHandler(function(res) {
      var payload = parseJsonPermissoes_(res);
      if (window.GomAuth && window.GomAuth.perfil) {
        window.usuarioAtualGom = perfilPeloGomAuth_();
      } else if (!payload || payload.ok === false) {
        window.usuarioAtualGom = perfilFallbackPermissoes_();
      } else {
        window.usuarioAtualGom = normalizarUsuarioPermissoes_(payload.usuario || payload);
      }
      window.permissoesCarregadas = true;
      aplicarPermissoesInterface();
      _corrigirRotaAtualSeNaoPermitida();
      if (typeof callback === 'function') callback(window.usuarioAtualGom);
    })
    .withFailureHandler(function(err) {
      if (window.gomError) window.gomError('[GOM PERMISSÕES] Erro ao carregar usuário:', err);
      else console.error('[GOM PERMISSÕES] Erro ao carregar usuário:', err);
      window.usuarioAtualGom = (window.GomAuth && window.GomAuth.perfil) ? perfilPeloGomAuth_() : perfilFallbackPermissoes_();
      window.permissoesCarregadas = true;
      aplicarPermissoesInterface();
      _corrigirRotaAtualSeNaoPermitida();
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

function normalizarUsuarioPermissoes_(usuario) {
  usuario = usuario || {};
  var perfil = usuario.perfil || 'GOM';
  var telas = Array.isArray(usuario.telas) ? usuario.telas.map(normalizarPaginaPermissao_) : (GOM_PERFIS_ACESSO[perfil] || GOM_PERFIS_ACESSO.GOM || []).slice();
  usuario.perfil = perfil;
  usuario.perfilLabel = usuario.perfilLabel || GOM_PERFIS_LABEL[perfil] || perfil;
  usuario.telas = telas;
  usuario.restrito = usuario.restrito !== false;
  usuario.paginaInicial = usuario.paginaInicial || GOM_PERFIS_INICIAL[perfil] || (telas[0] || 'dashboard');
  usuario.acoes = usuario.acoes || { configurar: perfil === 'ADMIN_GOM' };
  return usuario;
}

function perfilPeloGomAuth_() {
  var perfil = (window.GomAuth && window.GomAuth.perfil) || 'GOM';
  if (!GOM_PERFIS_ACESSO[perfil]) perfil = 'GOM';
  var telas = (GOM_PERFIS_ACESSO[perfil] || GOM_PERFIS_ACESSO.GOM || []).slice();
  return {
    ok: true,
    perfil: perfil,
    perfilLabel: GOM_PERFIS_LABEL[perfil] || perfil,
    modo: perfil === 'EMPRESA' ? 'PIN EMPRESA' : 'LOGIN',
    restrito: true,
    email: (window.GomAuth && window.GomAuth.email) || '',
    telas: telas,
    paginaInicial: GOM_PERFIS_INICIAL[perfil] || (telas[0] || 'dashboard'),
    unidades: [],
    acoes: { configurar: perfil === 'ADMIN_GOM' }
  };
}

function perfilFallbackPermissoes_() {
  // Fallback usado apenas quando o login ainda não está ativo/validado.
  return {
    ok: true,
    perfil: 'ADMIN_GOM',
    perfilLabel: 'Administrador GOM',
    modo: 'ABERTO',
    restrito: false,
    email: '',
    telas: (window.TELAS_WEB || GOM_PERFIS_ACESSO.ADMIN_GOM || []).slice(),
    paginaInicial: 'dashboard',
    unidades: [],
    acoes: { configurar: true }
  };
}

function getUsuarioGom() {
  if (window.GomAuth && window.GomAuth.perfil) return perfilPeloGomAuth_();
  return window.usuarioAtualGom || perfilFallbackPermissoes_();
}

function podeAcessarPagina(pageName) {
  var page = normalizarPaginaPermissao_(pageName);
  if (!page || page === 'mais') return true;
  var usuario = getUsuarioGom();
  if (!usuario.restrito) return true;
  return Array.isArray(usuario.telas) && usuario.telas.indexOf(page) >= 0;
}

function getPaginaInicialPermitida(preferida) {
  var p = normalizarPaginaPermissao_(preferida);
  if (p && podeAcessarPagina(p)) return p;
  var usuario = getUsuarioGom();
  var inicial = normalizarPaginaPermissao_(usuario.paginaInicial || (usuario.telas && usuario.telas[0]));
  if (inicial && podeAcessarPagina(inicial)) return inicial;
  return (usuario.telas && usuario.telas[0]) || 'acompanhar';
}

function aplicarPermissoesInterface() {
  var usuario = getUsuarioGom();
  var telas = Array.isArray(usuario.telas) ? usuario.telas.map(normalizarPaginaPermissao_) : [];
  var restrito = Boolean(usuario.restrito);
  var perfil = usuario.perfil || '';

  document.querySelectorAll('[data-page]').forEach(function(el) {
    var page = normalizarPaginaPermissao_(el.getAttribute('data-page'));
    if (!page || page === 'mais') return;
    var permitido = !restrito || telas.indexOf(page) >= 0;
    el.classList.toggle('gom-permissao-oculto', !permitido);
    el.disabled = !permitido;
    if (!permitido) el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
  });

  // Topo: EMPRESA deve ver apenas área da Empresa e sair.
  var topSecretaria = document.getElementById('btn-secretaria');
  if (topSecretaria) topSecretaria.classList.toggle('gom-permissao-oculto', restrito && telas.indexOf('dashboard') < 0 && perfil === 'EMPRESA');

  var topCadastro = document.getElementById('btn-cadastro');
  if (topCadastro) topCadastro.classList.toggle('gom-permissao-oculto', restrito && telas.indexOf('cadastro') < 0);

  var topEmpresa = document.getElementById('btn-empresa');
  if (topEmpresa) topEmpresa.classList.toggle('gom-permissao-oculto', restrito && telas.indexOf('empresa') < 0);

  document.querySelectorAll('.nav-more, .mobile-more-panel').forEach(function(box) {
    var visiveis = box.querySelectorAll('[data-page]:not(.gom-permissao-oculto)').length;
    box.classList.toggle('gom-permissao-oculto', restrito && visiveis === 0);
  });

  // Sidebar da Secretaria só aparece para perfis com telas da Secretaria.
  var sidebarSecretaria = document.getElementById('gomSecretariaSidebar');
  if (sidebarSecretaria) {
    var podeSecretaria = telas.some(function(t) { return GOM_TELAS_SECRETARIA.indexOf(t) >= 0; });
    sidebarSecretaria.classList.toggle('gom-permissao-oculto', restrito && !podeSecretaria);
    if (restrito && !podeSecretaria && typeof window.fecharMenuSecretaria === 'function') window.fecharMenuSecretaria();
  }

  document.body.classList.toggle('gom-perfil-empresa', perfil === 'EMPRESA');
  document.body.classList.toggle('gom-perfil-secretaria', perfil !== 'EMPRESA');
  atualizarBadgePerfilUsuario();
}

function atualizarBadgePerfilUsuario() {
  var usuario = getUsuarioGom();
  var perfil = usuario.perfilLabel || usuario.perfil || 'Usuário';
  var modo = usuario.modo ? 'Modo: ' + usuario.modo : '';
  var email = usuario.email || '';
  if (email === 'empresa@pin') email = '';
  var detalhe = [modo, email].filter(Boolean).join(' · ');
  var html = '<span class="perfil-badge-text" title="' + escapeHtml(perfil) + '">' + escapeHtml(perfil) + '</span>' + (detalhe ? '<small title="' + escapeHtml(detalhe) + '">' + escapeHtml(detalhe) + '</small>' : '');

  var desktop = document.getElementById('perfilUsuarioBadge');
  if (desktop) desktop.innerHTML = html;

  var mobile = document.getElementById('mobilePerfilUsuarioBadge');
  if (mobile) mobile.textContent = perfil;
}

function renderAcessoNegado(pageName) {
  if (typeof fecharMobileMais === 'function') fecharMobileMais();
  var main = document.getElementById('main-content');
  var usuario = getUsuarioGom();
  var page = normalizarPaginaPermissao_(pageName);
  if (!main) return;
  main.innerHTML = [
    '<div class="acesso-negado-card">',
      '<i class="bi bi-shield-lock"></i>',
      '<h4>Acesso restrito</h4>',
      '<p>Seu perfil <strong>' + escapeHtml(usuario.perfilLabel || usuario.perfil || '') + '</strong> não possui acesso à tela <strong>' + escapeHtml((window.ROTULOS_PAGINAS_GOM && ROTULOS_PAGINAS_GOM[page]) || page) + '</strong>.</p>',
      '<button class="btn btn-primary fw-bold" onclick="loadPage(\'' + escapeJsAttr(getPaginaInicialPermitida()) + '\')"><i class="bi bi-arrow-left me-1"></i>Ir para minha tela inicial</button>',
    '</div>'
  ].join('');
}

function _corrigirRotaAtualSeNaoPermitida() {
  var usuario = getUsuarioGom();
  if (!usuario.restrito) return;

  var rotaSalva = null;
  try {
    rotaSalva = localStorage.getItem('gomUltimaTela') || localStorage.getItem('gomTelaAtual') || sessionStorage.getItem('gomUltimaTela');
  } catch (e) {}

  if (rotaSalva && !podeAcessarPagina(rotaSalva)) {
    var inicial = getPaginaInicialPermitida();
    try {
      localStorage.setItem('gomUltimaTela', inicial);
      localStorage.setItem('gomTelaAtual', inicial);
      sessionStorage.setItem('gomUltimaTela', inicial);
    } catch (e) {}
  }
}

function _registrarRotaPermitida(pageName) {
  var page = normalizarPaginaPermissao_(pageName);
  if (!page || page === 'mais') return;
  if (!podeAcessarPagina(page)) return;
  try {
    localStorage.setItem('gomUltimaTela', page);
    localStorage.setItem('gomTelaAtual', page);
    sessionStorage.setItem('gomUltimaTela', page);
  } catch (e) {}
}

function gomPermissoesResumo() {
  var usuario = getUsuarioGom();
  return {
    perfil: usuario.perfil,
    perfilLabel: usuario.perfilLabel,
    modo: usuario.modo,
    email: usuario.email,
    restrito: usuario.restrito,
    paginaInicial: getPaginaInicialPermitida(),
    telas: (usuario.telas || []).slice()
  };
}

function gomTestarPermissao(pageName) {
  var page = normalizarPaginaPermissao_(pageName);
  return {
    tela: page,
    permitido: podeAcessarPagina(page),
    usuario: gomPermissoesResumo()
  };
}


function gomAutorizarNavegacao(pageName) {
  var page = normalizarPaginaPermissao_(pageName || 'dashboard');
  if (!podeAcessarPagina(page)) {
    renderAcessoNegado(page);
    return false;
  }
  _registrarRotaPermitida(page);
  return true;
}

(function instalarPermissoesSemRecursao_() {
  if (window.__gomPermissoesNavegacaoV33) return;
  window.__gomPermissoesNavegacaoV33 = true;

  var tentarEnvolverSecretaria = function() {
    // Não embrulhamos window.loadPage aqui. O aviso-saida.js é o único responsável
    // por interceptar loadPage e ele consulta gomAutorizarNavegacao().
    // Isso evita o loop: aviso-saida -> permissoes -> aviso-saida.

    if (typeof window.loadSecretariaPage === 'function' && !window.loadSecretariaPage.__gomPermWrapped) {
      var originalSecretariaPage = window.loadSecretariaPage;
      var wrappedSecretariaPage = function(pageName) {
        var page = normalizarPaginaPermissao_(pageName || 'dashboard');
        if (!gomAutorizarNavegacao(page)) return false;
        return originalSecretariaPage.apply(this, arguments);
      };
      wrappedSecretariaPage.__gomPermWrapped = true;
      window.loadSecretariaPage = wrappedSecretariaPage;
    }

    if (typeof window.loadSecretariaHome === 'function' && !window.loadSecretariaHome.__gomPermWrapped) {
      var originalSecretariaHome = window.loadSecretariaHome;
      var wrappedSecretariaHome = function() {
        if (!podeAcessarPagina('dashboard')) {
          var inicial = getPaginaInicialPermitida();
          if (inicial && inicial !== 'dashboard' && typeof window.loadPage === 'function') return window.loadPage(inicial);
          renderAcessoNegado('dashboard');
          return false;
        }
        _registrarRotaPermitida('dashboard');
        return originalSecretariaHome.apply(this, arguments);
      };
      wrappedSecretariaHome.__gomPermWrapped = true;
      window.loadSecretariaHome = wrappedSecretariaHome;
    }
  };

  tentarEnvolverSecretaria();
  document.addEventListener('DOMContentLoaded', tentarEnvolverSecretaria);
  setTimeout(tentarEnvolverSecretaria, 300);
  setTimeout(tentarEnvolverSecretaria, 1200);
})();

window.GOM_PERFIS_ACESSO = GOM_PERFIS_ACESSO;
window.GOM_PERFIS_LABEL = GOM_PERFIS_LABEL;
window.GOM_PERFIS_INICIAL = GOM_PERFIS_INICIAL;
window.carregarUsuarioPermissoes = carregarUsuarioPermissoes;
window.podeAcessarPagina = podeAcessarPagina;
window.getPaginaInicialPermitida = getPaginaInicialPermitida;
window.aplicarPermissoesInterface = aplicarPermissoesInterface;
window.renderAcessoNegado = renderAcessoNegado;
window.gomAutorizarNavegacao = gomAutorizarNavegacao;
window.gomPermissoesResumo = gomPermissoesResumo;
window.gomTestarPermissao = gomTestarPermissao;
