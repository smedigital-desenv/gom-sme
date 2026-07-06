const ROTULOS_PAGINAS_GOM = {
  dashboard: 'Dashboard',
  triagem: 'Triagem',
  fila: 'Fila',
  aprovacao: 'Aprovação',
  empresa: 'Empresa',
  campo: 'Campo',
  alertas: 'Alertas',
  obras: 'Obras',
  historico: 'Memorial',
  relatorios: 'Relatórios',
  cadastro: 'Cadastro',
  equipes: 'Gerenciar Equipes',
  acompanhar: 'Acompanhar',
  configuracoes: 'Configurações',
  escola: 'Minha Escola'
};

const PAGINAS_SECRETARIA_GOM = [
  'dashboard', 'triagem', 'fila', 'aprovacao', 'campo', 'alertas',
  'obras', 'historico', 'relatorios', 'equipes', 'acompanhar', 'configuracoes'
];

const PAGINAS_MOBILE_PRINCIPAIS = ['dashboard', 'empresa', 'cadastro'];

function gomRotaPageValida_(pageName) {
  pageName = String(pageName || '').trim();
  return !!(pageName && ROTULOS_PAGINAS_GOM[pageName]);
}

function gomSalvarRotaAtual_(pageName) {
  if (!gomRotaPageValida_(pageName)) return;
  try { sessionStorage.setItem('gom:lastPage', pageName); sessionStorage.setItem('gom:lastPageTs', String(Date.now())); } catch(e) {}
  try { localStorage.setItem('gom:lastPage', pageName); localStorage.setItem('gom:lastPageTs', String(Date.now())); } catch(e) {}
  try {
    var hashAtual = String(window.location.hash || '').replace(/^#/, '');
    if (hashAtual !== pageName && window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#' + pageName);
    }
  } catch(e) {}
}

function gomLerRotaSalva_() {
  var hash = '';
  try { hash = String(window.location.hash || '').replace(/^#/, '').trim(); } catch(e) {}
  if (gomRotaPageValida_(hash)) return hash;
  var v = '';
  try { v = sessionStorage.getItem('gom:lastPage') || ''; } catch(e) {}
  if (gomRotaPageValida_(v)) return v;
  try { v = localStorage.getItem('gom:lastPage') || ''; } catch(e) {}
  return gomRotaPageValida_(v) ? v : '';
}

window.gomLerRotaSalva = gomLerRotaSalva_;
window.gomSalvarRotaAtual = gomSalvarRotaAtual_;

function paginaEhSecretariaGom(pageName) {
  return PAGINAS_SECRETARIA_GOM.indexOf(pageName) >= 0;
}

function atualizarNavegacaoAtiva(pageName) {
  document.querySelectorAll('.btn-nav, .nav-more-item, .mobile-nav-item, .mobile-more-item, .gom-secretaria-item, .gom-secretaria-iconbtn').forEach(function(btn) {
    btn.classList.remove('active');
  });

  document.querySelectorAll('[data-page="' + pageName + '"]').forEach(function(btn) {
    btn.classList.add('active');
  });

  const btnSecretaria = document.getElementById('btn-secretaria');
  const btnEmpresa = document.getElementById('btn-empresa');
  const btnCadastro = document.getElementById('btn-cadastro');

  if (btnSecretaria) btnSecretaria.classList.toggle('active', paginaEhSecretariaGom(pageName));
  if (btnEmpresa) btnEmpresa.classList.toggle('active', pageName === 'empresa');
  if (btnCadastro) btnCadastro.classList.toggle('active', pageName === 'cadastro');

  const btnMaisDesktop = document.querySelector('.btn-nav-more');
  if (btnMaisDesktop && !document.querySelector('.nav-actions-primary [data-page="' + pageName + '"]')) {
    btnMaisDesktop.classList.add('active');
  }

  const btnMaisMobile = document.querySelector('.mobile-nav-more');
  if (btnMaisMobile && PAGINAS_MOBILE_PRINCIPAIS.indexOf(pageName) === -1) {
    btnMaisMobile.classList.add('active');
  }

  const tituloMobile = document.getElementById('mobileCurrentPage');
  if (tituloMobile) tituloMobile.textContent = ROTULOS_PAGINAS_GOM[pageName] || pageName;
}

function atualizarAreaVisual(pageName) {
  // A tela da escola (e o cadastro no modo escola) usa a sidebar da ESCOLA;
  // as demais telas operacionais usam a sidebar da Secretaria.
  var modoEscola = (pageName === 'escola') || (pageName === 'cadastro' && window.__cadastroModo === 'escola');
  var ehSecretaria = paginaEhSecretariaGom(pageName) && !modoEscola;
  document.body.classList.toggle('gom-area-secretaria', ehSecretaria);
  document.body.classList.toggle('gom-area-escola', modoEscola);
  document.body.classList.toggle('gom-area-empresa', pageName === 'empresa');
  document.body.classList.toggle('gom-area-cadastro', pageName === 'cadastro');
  if (!ehSecretaria) fecharMenuSecretaria();
  if (!modoEscola && typeof fecharMenuEscola === 'function') fecharMenuEscola();
}

function abrirMenuSecretaria(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const sidebar = document.getElementById('gomSecretariaSidebar');
  if (sidebar) {
    sidebar.classList.add('is-open');
    document.body.classList.add('gom-secretaria-menu-open');
  }
}

function fecharMenuSecretaria(event) {
  if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
  const sidebar = document.getElementById('gomSecretariaSidebar');
  if (sidebar) sidebar.classList.remove('is-open');
  document.body.classList.remove('gom-secretaria-menu-open');
}

function toggleMenuSecretaria(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const sidebar = document.getElementById('gomSecretariaSidebar');
  if (sidebar && sidebar.classList.contains('is-open')) fecharMenuSecretaria();
  else abrirMenuSecretaria(event);
}

function loadSecretariaHome() {
  loadPage('dashboard');
  fecharMenuSecretaria();
}

function loadSecretariaPage(pageName) {
  loadPage(pageName);
  fecharMenuSecretaria();
}

// ── Menu lateral da Escola (espelha o da Secretaria) ────────────────────────
function abrirMenuEscola(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const sidebar = document.getElementById('gomEscolaSidebar');
  if (sidebar) { sidebar.classList.add('is-open'); document.body.classList.add('gom-secretaria-menu-open'); }
}
function fecharMenuEscola(event) {
  if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
  const sidebar = document.getElementById('gomEscolaSidebar');
  if (sidebar) sidebar.classList.remove('is-open');
  document.body.classList.remove('gom-secretaria-menu-open');
}
function toggleMenuEscola(event) {
  if (event && event.stopPropagation) event.stopPropagation();
  const sidebar = document.getElementById('gomEscolaSidebar');
  if (sidebar && sidebar.classList.contains('is-open')) fecharMenuEscola();
  else abrirMenuEscola(event);
}
function loadEscolaPage(pageName) {
  loadPage(pageName);
  fecharMenuEscola();
}
document.addEventListener('click', function (event) {
  const sidebar = document.getElementById('gomEscolaSidebar');
  if (!sidebar || !sidebar.classList.contains('is-open')) return;
  if (sidebar.contains(event.target)) return;
  fecharMenuEscola();
});

document.addEventListener('click', function (event) {
  const sidebar = document.getElementById('gomSecretariaSidebar');
  if (!sidebar || !sidebar.classList.contains('is-open')) return;
  const alvo = event.target;
  if (sidebar.contains(alvo)) return;
  const btnSecretaria = document.getElementById('btn-secretaria');
  if (btnSecretaria && btnSecretaria.contains(alvo)) return;
  fecharMenuSecretaria();
});

function abrirMobileMais() {
  const backdrop = document.getElementById('mobileMoreBackdrop');
  if (backdrop) {
    backdrop.classList.add('show');
    document.body.classList.add('mobile-more-open');
  }
}

function fecharMobileMais(event) {
  if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
  const backdrop = document.getElementById('mobileMoreBackdrop');
  if (backdrop) backdrop.classList.remove('show');
  document.body.classList.remove('mobile-more-open');
}

window.atualizarNavegacaoAtiva = atualizarNavegacaoAtiva;
window.abrirMenuSecretaria = abrirMenuSecretaria;
window.fecharMenuSecretaria = fecharMenuSecretaria;
window.toggleMenuSecretaria = toggleMenuSecretaria;
window.loadSecretariaHome = loadSecretariaHome;
window.loadSecretariaPage = loadSecretariaPage;
window.abrirMenuEscola = abrirMenuEscola;
window.fecharMenuEscola = fecharMenuEscola;
window.toggleMenuEscola = toggleMenuEscola;
window.loadEscolaPage = loadEscolaPage;
window.abrirMobileMais = abrirMobileMais;
window.fecharMobileMais = fecharMobileMais;

function loadPage(pageName, inicial=false) {
  // Controle de acesso CENTRAL: o roteador só abre a página se o central
  // liberar a tela (AcessoSME.can(tela,'ver')). Aplica o alias de rota antes
  // (ex.: memorial -> historico). Fallback: podeAcessarPagina() (que também
  // consulta o central) enquanto o módulo do central ainda não respondeu.
  var telaAlvo = (window.GOM_ROTAS_ALIAS && GOM_ROTAS_ALIAS[pageName]) || pageName;
  if (telaAlvo && telaAlvo !== 'mais') {
    if (window.AcessoSME && typeof window.AcessoSME.can === 'function') {
      if (!window.AcessoSME.can(telaAlvo, 'ver')) {
        if (typeof renderAcessoNegado === 'function') renderAcessoNegado(pageName);
        return;
      }
    } else if (typeof podeAcessarPagina === 'function' && !podeAcessarPagina(pageName)) {
      if (typeof renderAcessoNegado === 'function') renderAcessoNegado(pageName);
      return;
    }
  }
  if (!inicial && window.telaAtual === 'configuracoes' && pageName !== 'configuracoes') {
    if (typeof confirmarSaidaConfiguracoesSeNecessario === 'function' && !confirmarSaidaConfiguracoesSeNecessario()) return;
  }

  telaAtual = pageName;
  window.telaAtual = pageName;
  gomSalvarRotaAtual_(pageName);
  statusFiltroClicado = null;
  window.statusFiltroClicado = null;

  if (pageName === 'fila') {
    try { window.filaSubmodoAtual = window.filaSubmodoAtual || localStorage.getItem('gom:filaSubmodoAtual') || sessionStorage.getItem('gom:filaSubmodoAtual') || 'fila'; } catch(e) { window.filaSubmodoAtual = window.filaSubmodoAtual || 'fila'; }
  }

  atualizarNavegacaoAtiva(pageName);
  atualizarAreaVisual(pageName);
  if (typeof aplicarPermissoesInterface === 'function') aplicarPermissoesInterface();
  fecharMobileMais();

  const tpl = document.getElementById('tpl-' + pageName);
  const main = document.getElementById('main-content');
  if (!tpl || !main) return;

  main.innerHTML = tpl.innerHTML;

  if (pageName === 'dashboard') {
    if (dadosCarregados) {
      if (typeof renderDashboard === 'function') renderDashboard();
    } else {
      carregarChamados({ renderizar: true, forcar: false });
    }
    return;
  }

  if (pageName === 'acompanhar') {
    if (typeof inicializarAcompanhar === 'function') inicializarAcompanhar();
    return;
  }

  if (pageName === 'escola') {
    if (typeof inicializarEscolaDashboard === 'function') inicializarEscolaDashboard();
    return;
  }

  if (pageName === 'cadastro') {
    inicializarTelaCadastro();
    return;
  }

  if (pageName === 'configuracoes') {
    if (typeof inicializarConfiguracoes === 'function') inicializarConfiguracoes();
    return;
  }

  if (pageName === 'equipes') {
    if (typeof inicializarGerenciamentoEquipes === 'function') inicializarGerenciamentoEquipes();
    return;
  }

  if (pageName === 'empresa') {
    try { window.empresaModoAtual = window.empresaModoAtual || localStorage.getItem('gom:empresaModoAtual') || sessionStorage.getItem('gom:empresaModoAtual') || 'diario'; } catch(e) { window.empresaModoAtual = window.empresaModoAtual || 'diario'; }
    window.statusFiltroClicado = null;
    if (typeof statusFiltroClicado !== 'undefined') statusFiltroClicado = null;

    var buscaEmpresa = document.getElementById('pesquisa');
    if (buscaEmpresa) buscaEmpresa.value = '';

    setTimeout(function() {
      var tabsEmpresa = document.querySelectorAll('#empresaModoTabs .nav-link');
      Array.prototype.forEach.call(tabsEmpresa, function(b) { b.classList.remove('active'); });
      var alvo = Array.prototype.find.call(tabsEmpresa, function(btn) {
        var txt = (btn.textContent || '').toLowerCase();
        if (window.empresaModoAtual === 'orcamentos') return txt.indexOf('orçamento') !== -1 || txt.indexOf('orcamentos') !== -1;
        if (window.empresaModoAtual === 'gerencial') return txt.indexOf('gerencial') !== -1;
        if (window.empresaModoAtual === 'agenda') return txt.indexOf('agenda') !== -1 || txt.indexOf('acompanhamento') !== -1;
        if (window.empresaModoAtual === 'equipes') return txt.indexOf('equipe') !== -1;
        return txt.indexOf('execução') !== -1 || txt.indexOf('execucao') !== -1;
      });
      if (alvo) alvo.classList.add('active');
      if (typeof renderizarListaEquipes === 'function') renderizarListaEquipes();
      if (window.empresaModoAtual === 'gerencial' && typeof carregarGerencialOsEmpresaAtualizado_ === 'function') {
        carregarGerencialOsEmpresaAtualizado_({ forcar: true });
      }
    }, 0);
  }

  if (pageName === 'campo') {
    if (campoCarregado) {
      renderizarCampo();
    } else {
      carregarCampo({ renderizar: true, forcar: false });
    }
    return;
  }

  if (pageName === 'alertas') {
    if (typeof inicializarAlertas === 'function') inicializarAlertas(false);
    else if (dadosCarregados) renderizarTela();
    else carregarChamados({ renderizar: true, forcar: false });
    return;
  }

  if (pageName === 'relatorios') {
    if (typeof inicializarRelatorios === 'function') inicializarRelatorios(false);
    else if (dadosCarregados) renderizarTela();
    else carregarChamados({ renderizar: true, forcar: false });
    return;
  }

  if (pageName === 'obras') {
    if (obrasCarregadas) {
      renderizarTela();
    } else {
      carregarObras({ renderizar: true, forcar: false });
    }
    return;
  }

  if (['triagem', 'fila', 'aprovacao', 'empresa', 'historico'].includes(pageName)) {
    if (dadosCarregados) {
      renderizarTela();
      if (pageName === 'fila' && typeof gomFilaAtualizarEmBackground === 'function') {
        gomFilaAtualizarEmBackground(250);
      }
    } else {
      carregarChamados({ renderizar: true, forcar: false });
    }
    return;
  }

  renderizarTela();
}

function filtrarPorStatus(s) {
  statusFiltroClicado = s;
  window.statusFiltroClicado = s;
  renderizarTela();
}

window.loadPage = loadPage;
