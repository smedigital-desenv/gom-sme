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
  configuracoes: 'Configurações'
};

const PAGINAS_MOBILE_PRINCIPAIS = ['dashboard', 'triagem', 'empresa', 'campo'];

function atualizarNavegacaoAtiva(pageName) {
  document.querySelectorAll('.btn-nav, .nav-more-item, .mobile-nav-item, .mobile-more-item').forEach(function(btn) {
    btn.classList.remove('active');
  });

  const btnDesktop = document.getElementById('btn-' + pageName);
  if (btnDesktop) btnDesktop.classList.add('active');

  document.querySelectorAll('[data-page="' + pageName + '"]').forEach(function(btn) {
    btn.classList.add('active');
  });

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
window.abrirMobileMais = abrirMobileMais;
window.fecharMobileMais = fecharMobileMais;


function loadPage(pageName, inicial=false) {
  if (typeof podeAcessarPagina === 'function' && !podeAcessarPagina(pageName)) {
    if (typeof renderAcessoNegado === 'function') renderAcessoNegado(pageName);
    return;
  }
  if (!inicial && window.telaAtual === 'configuracoes' && pageName !== 'configuracoes') {
    if (typeof confirmarSaidaConfiguracoesSeNecessario === 'function' && !confirmarSaidaConfiguracoesSeNecessario()) return;
  }
  telaAtual = pageName;
  statusFiltroClicado = null;

  atualizarNavegacaoAtiva(pageName);
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
    window.empresaModoAtual = window.empresaModoAtual || 'diario';
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
        if (window.empresaModoAtual === 'equipes') return txt.indexOf('equipe') !== -1;
        return txt.indexOf('execução') !== -1 || txt.indexOf('execucao') !== -1;
      });
      if (alvo) alvo.classList.add('active');
      if (typeof renderizarListaEquipes === 'function') renderizarListaEquipes();
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
    } else {
      carregarChamados({ renderizar: true, forcar: false });
    }
    return;
  }

  renderizarTela();
}

function filtrarPorStatus(s) {
  statusFiltroClicado = s;
  renderizarTela();
}