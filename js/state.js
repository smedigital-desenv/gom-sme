// Tela aparece primeiro; os dados carregam em seguida no painel.
document.addEventListener('DOMContentLoaded', iniciarSistema);

function iniciarSistema() {
  try {
    carregarUsuarioPermissoes(function(usuario) {
      const paginaInicial = getPaginaInicialPermitida('dashboard');
      loadPage(paginaInicial, true);
      esconderLoader();
      carregarBasesIniciais();

      const deveCarregarChamados = ['dashboard','triagem','fila','aprovacao','empresa','campo','alertas','obras','historico','relatorios'].some(function(p) {
        return podeAcessarPagina(p);
      });

      if (deveCarregarChamados) {
        carregarChamados({
          renderizar: true,
          forcar: true,
          callback: () => {
            // Pré-carrega Obras em segundo plano, depois da primeira tela estar pronta.
            // Assim, ao clicar em OBRAS, a tela já abre praticamente instantânea.
            if (podeAcessarPagina('obras')) setTimeout(precarregarObrasEmSegundoPlano, 500);
          }
        });
      }
    });
  } catch (erro) {
    console.error('[GOM] Erro ao iniciar sistema:', erro);
    mostrarErro(erro?.message || erro);
  }
}

function esconderLoader() {
  const loader = document.getElementById('loader');
  if (loader) loader.classList.add('hidden');
}

function mostrarErro(msg) {
  esconderLoader();
  const painel = document.getElementById('painelDados') || document.getElementById('main-content');
  if (painel) {
    painel.innerHTML = `<div class="empty-state erro"><h5>Não foi possível carregar os dados</h5><p>${escapeHtml(String(msg || 'Erro desconhecido'))}</p></div>`;
  }
}

function setPainelCarregando(texto) {
  const painel = document.getElementById('painelDados');
  if (painel) {
    painel.innerHTML = `<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-3">${escapeHtml(texto || 'Carregando dados...')}</p></div>`;
  }
}

function carregarBasesIniciais() {
  google.script.run
    .withSuccessHandler(res => {
      listaEscolasGlobal = Array.isArray(res?.escolas) ? res.escolas : [];
      listaEquipesGlobal = Array.isArray(res?.equipes) ? res.equipes : [];
      window.listaEquipesEmpresaGlobal = Array.isArray(res?.equipesEmpresa) ? res.equipesEmpresa : [];
      if (res && res.usuario) { window.usuarioAtualGom = res.usuario; aplicarPermissoesInterface(); }
      basesCarregadas = true;
      console.log('[GOM] Bases carregadas:', { escolas: listaEscolasGlobal.length, equipes: listaEquipesGlobal.length });
      if (telaAtual === 'cadastro' && typeof inicializarTelaCadastro === 'function') inicializarTelaCadastro();
      if (telaAtual === 'empresa' && typeof renderizarTela === 'function') renderizarTela();
      if (telaAtual === 'dashboard' && typeof renderDashboard === 'function') renderDashboard();
    })
    .withFailureHandler(err => {
      basesCarregadas = false;
      console.error('[GOM] Erro ao carregar bases iniciais:', err);
    })
    .getDadosIniciais();
}

function carregarChamados(opcoes = {}) {
  if (carregandoChamados && !opcoes.forcar) return;
  carregandoChamados = true;
  if (opcoes.renderizar && !dadosCarregados) setPainelCarregando('Carregando chamados...');

  google.script.run
    .withSuccessHandler(res => {
      ultimaRespostaChamadosRaw = res;
      listaChamadosGlobal = normalizarRespostaChamadosFrontend_(res);
      dadosCarregados = true;
      carregandoChamados = false;
      console.log('[GOM] Chamados carregados via gomListarChamadosWebV3Json:', listaChamadosGlobal.length, listaChamadosGlobal.slice(0, 3));
      if (opcoes.callback) opcoes.callback(listaChamadosGlobal);
      if (opcoes.renderizar !== false && typeof renderizarTela === 'function') renderizarTela();
    })
    .withFailureHandler(err => {
      dadosCarregados = false;
      carregandoChamados = false;
      console.error('[GOM] Erro em getDadosAdmin:', err);
      mostrarErro(err?.message || err);
    })
    .gomListarChamadosWebV3Json();
}

function normalizarRespostaChamadosFrontend_(res) {
  ultimaRespostaChamadosRaw = res;

  // API V3 retorna JSON string para evitar problema de serialização do google.script.run.
  if (typeof res === 'string') {
    try {
      const payload = JSON.parse(res);
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.chamados)) return payload.chamados;
      if (payload && Array.isArray(payload.lista)) return payload.lista;
      if (payload && Array.isArray(payload.dados)) return payload.dados;
      if (payload && payload.ok === false) {
        console.error('[GOM] Backend retornou erro:', payload.erro, payload);
        return [];
      }
      console.warn('[GOM] JSON de chamados sem array reconhecível:', payload);
      return [];
    } catch (e) {
      console.error('[GOM] Erro ao interpretar JSON de chamados:', e, res?.slice ? res.slice(0, 500) : res);
      return [];
    }
  }

  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];
  if (Array.isArray(res.chamados)) return res.chamados;
  if (Array.isArray(res.lista)) return res.lista;
  if (Array.isArray(res.dados)) return res.dados;
  if (Array.isArray(res.ativos) || Array.isArray(res.concluidos)) {
    return [...(res.ativos || []), ...(res.concluidos || [])];
  }
  console.warn('[GOM] Resposta inesperada em chamados:', res);
  return [];
}

function carregarObras(opcoes = {}) {
  if (carregandoObras && !opcoes.forcar) return;

  if (obrasCarregadas && !opcoes.forcar) {
    if (opcoes.renderizar !== false && telaAtual === 'obras' && typeof renderizarTela === 'function') renderizarTela();
    if (opcoes.callback) opcoes.callback(listaObrasGlobal);
    return;
  }

  carregandoObras = true;
  if (opcoes.renderizar && !obrasCarregadas) setPainelCarregando('Carregando obras...');

  google.script.run
    .withSuccessHandler(res => {
      listaObrasGlobal = normalizarRespostaObrasFrontend_(res);
      obrasCarregadas = true;
      carregandoObras = false;
      console.log('[GOM] Obras carregadas via gomListarObrasWebV3Json:', listaObrasGlobal.length, listaObrasGlobal.slice(0, 3));
      if (opcoes.callback) opcoes.callback(listaObrasGlobal);
      if (opcoes.renderizar !== false && telaAtual === 'obras' && typeof renderizarTela === 'function') renderizarTela();
    })
    .withFailureHandler(err => {
      obrasCarregadas = false;
      carregandoObras = false;
      console.error('[GOM] Erro em gomListarObrasWebV3Json:', err);
      if (opcoes.renderizar !== false && telaAtual === 'obras') mostrarErro(err?.message || err);
    })
    .gomListarObrasWebV3Json();
}

function normalizarRespostaObrasFrontend_(res) {
  if (typeof res === 'string') {
    try {
      const payload = JSON.parse(res);
      if (Array.isArray(payload)) return payload;
      if (payload && Array.isArray(payload.obras)) return payload.obras;
      if (payload && Array.isArray(payload.lista)) return payload.lista;
      if (payload && Array.isArray(payload.dados)) return payload.dados;
      if (payload && payload.ok === false) {
        console.error('[GOM] Backend retornou erro em Obras:', payload.erro, payload);
        return [];
      }
      console.warn('[GOM] JSON de Obras sem array reconhecível:', payload);
      return [];
    } catch (e) {
      console.error('[GOM] Erro ao interpretar JSON de Obras:', e, res?.slice ? res.slice(0, 500) : res);
      return [];
    }
  }

  if (Array.isArray(res)) return res;
  if (!res || typeof res !== 'object') return [];
  if (Array.isArray(res.obras)) return res.obras;
  if (Array.isArray(res.lista)) return res.lista;
  if (Array.isArray(res.dados)) return res.dados;
  console.warn('[GOM] Resposta inesperada em Obras:', res);
  return [];
}

function precarregarObrasEmSegundoPlano() {
  if (obrasCarregadas || carregandoObras) return;
  carregarObras({ renderizar: false, forcar: false });
}

function refreshChamados(callback, patchLocal) {
  // ATUALIZAÇÃO OTIMISTA: se veio um patch { id, campos }, aplica localmente
  // e NÃO relê o backend. É o que torna o chamado mudar de tela instantaneamente.
  if (patchLocal && patchLocal.id) {
    gomAtualizarChamadoLocal(patchLocal.id, patchLocal.campos || {});
    if (typeof renderizarTela === 'function') renderizarTela();
    if (typeof callback === 'function') callback(window.listaChamadosGlobal);
    return;
  }
  carregarChamados({ renderizar: !callback, forcar: true, callback });
}

function gomAtualizarChamadoLocal(id, campos) {
  campos = campos || {};
  var item = (window.listaChamadosGlobal || []).find(function (c) {
    return String(c.id) === String(id);
  });
  if (!item) return false;
  Object.keys(campos).forEach(function (k) { item[k] = campos[k]; });
  if (campos.situacao && !campos.status) item.status = campos.situacao;
  if (campos.status && !campos.situacao) item.situacao = campos.status;
  if (campos.situacao && typeof getCorStatus === 'function') item.corStatus = getCorStatus(campos.situacao);
  return true;
}

window.refreshChamados = refreshChamados;
window.gomAtualizarChamadoLocal = gomAtualizarChamadoLocal;

function refreshObras(callback) {
  carregarObras({ renderizar: !callback, forcar: true, callback });
}

// Diagnóstico no navegador: cole debugChamadosFrontend() no console do Web App.
function debugChamadosFrontend() {
  const porStatus = {};
  (listaChamadosGlobal || []).forEach(i => {
    const bruto = i?.situacao || i?.status || i?.['Situação'] || i?.['Status'] || '';
    const st = (typeof normalizarSituacaoSistema === 'function') ? normalizarSituacaoSistema(bruto) : bruto;
    porStatus[st] = (porStatus[st] || 0) + 1;
  });

  let filtradosTela = 'função filtrarTelaChamados indisponível';
  try {
    if (typeof filtrarTelaChamados === 'function') filtradosTela = filtrarTelaChamados(listaChamadosGlobal || []).length;
  } catch (e) {
    filtradosTela = 'erro ao filtrar: ' + e.message;
  }

  const info = {
    telaAtual,
    dadosCarregados,
    carregandoChamados,
    totalGlobal: (listaChamadosGlobal || []).length,
    filtradosTela,
    porStatus,
    amostra: (listaChamadosGlobal || []).slice(0, 5),
    tipoRespostaRaw: Array.isArray(ultimaRespostaChamadosRaw) ? 'array' : typeof ultimaRespostaChamadosRaw,
    respostaRaw: ultimaRespostaChamadosRaw
  };
  console.log('[GOM DEBUG FRONTEND]', info);
  return info;
}

// Teste direto no navegador, sem depender do carregamento inicial.
function testarGetDadosAdminFrontend() {
  console.log('[GOM TESTE] Chamando gomListarChamadosWebV3Json direto...');
  google.script.run
    .withSuccessHandler(res => {
      const lista = normalizarRespostaChamadosFrontend_(res);
      console.log('[GOM TESTE] gomListarChamadosWebV3Json retornou:', lista.length, lista.slice(0, 5), res);
    })
    .withFailureHandler(err => console.error('[GOM TESTE] Erro getDadosAdmin:', err))
    .gomListarChamadosWebV3Json();
}

function forcarCarregamentoChamadosFrontend() {
  dadosCarregados = false;
  carregarChamados({ renderizar: true, forcar: true });
}


function debugObrasFrontend() {
  const info = {
    telaAtual,
    obrasCarregadas,
    carregandoObras,
    totalObras: (listaObrasGlobal || []).length,
    amostra: (listaObrasGlobal || []).slice(0, 5)
  };
  console.log('[GOM DEBUG OBRAS]', info);
  return info;
}

function forcarCarregamentoObrasFrontend() {
  obrasCarregadas = false;
  carregarObras({ renderizar: true, forcar: true });
}

// Garante acesso global mesmo em navegadores que não exponham function declarations automaticamente.
window.debugChamadosFrontend = debugChamadosFrontend;
window.testarGetDadosAdminFrontend = testarGetDadosAdminFrontend;
window.forcarCarregamentoChamadosFrontend = forcarCarregamentoChamadosFrontend;
window.debugObrasFrontend = debugObrasFrontend;
window.forcarCarregamentoObrasFrontend = forcarCarregamentoObrasFrontend;

function carregarCampo(opcoes = {}) {
  if (carregandoCampo && !opcoes.forcar) return;
  if (campoCarregado && !opcoes.forcar) {
    if (opcoes.renderizar !== false && telaAtual === 'campo') renderizarCampo();
    return;
  }
  carregandoCampo = true;

  // OTIMIZAÇÃO: monta chamados de campo a partir de listaChamadosGlobal (já em memória),
  // sem round-trip ao backend. O histórico de equipes vem em background.
  if (dadosCarregados && Array.isArray(listaChamadosGlobal) && listaChamadosGlobal.length && !opcoes.forcarBackend) {
    const statusCampo = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
    const chamadosCampo = listaChamadosGlobal.filter(c =>
      statusCampo.includes(normalizarSituacaoSistema(c.situacao || c.status))
    );
    const kpis = {
      osAbertas:            chamadosCampo.filter(c => normalizarSituacaoSistema(c.situacao||c.status) === 'OS emitida').length,
      emergenciais:         chamadosCampo.filter(c => normalizarSituacaoSistema(c.situacao||c.status) === 'Atendimento Emergencial').length,
      osSemNumero:          chamadosCampo.filter(c => normalizarSituacaoSistema(c.situacao||c.status) === 'OS emitida' && !String(c.numeroOs||'').trim()).length,
      escolasEmAtendimento: new Set(chamadosCampo.map(c => c.unidade).filter(Boolean)).size,
      preenchidosHoje:      chamadosCampo.filter(c => !!c.temEquipeDiaValida).length,
      pendentesHoje:        chamadosCampo.filter(c => !c.temEquipeDiaValida).length
    };
    const historicoAtual = dadosCampoGlobal?.historico || [];
    dadosCampoGlobal = { chamados: chamadosCampo, historico: historicoAtual, kpis };
    carregandoCampo = false;
    campoCarregado  = true;
    console.log('[GOM] Campo montado localmente:', chamadosCampo.length, 'chamados');
    if (opcoes.renderizar !== false && telaAtual === 'campo') renderizarCampo();
    _carregarHistoricoCampoBackground_();
    return;
  }

  if (opcoes.renderizar !== false) setPainelCarregando('Carregando equipes em campo...');
  google.script.run
    .withSuccessHandler(res => {
      carregandoCampo = false;
      campoCarregado = true;
      dadosCampoGlobal = normalizarRespostaCampoFrontend_(res);
      console.log('[GOM] Campo carregado do backend:', dadosCampoGlobal);
      if (opcoes.renderizar !== false && telaAtual === 'campo') renderizarCampo();
    })
    .withFailureHandler(err => {
      carregandoCampo = false;
      console.error('[GOM] Erro em Campo:', err);
      if (opcoes.renderizar !== false) mostrarErro(err?.message || err);
    })
    .gomListarCampoWebV3Json();
}

function _carregarHistoricoCampoBackground_() {
  if (window._carregandoHistoricoCampo_) return;
  if (dadosCampoGlobal?.historico?.length) return; // já tem histórico
  window._carregandoHistoricoCampo_ = true;
  google.script.run
    .withSuccessHandler(res => {
      window._carregandoHistoricoCampo_ = false;
      const dados = normalizarRespostaCampoFrontend_(res);
      if (dadosCampoGlobal) {
        dadosCampoGlobal.historico = dados.historico || [];
        dadosCampoGlobal.kpis     = dados.kpis || dadosCampoGlobal.kpis;
      }
      if (telaAtual === 'campo' && window.campoTabAtual === 'historico') renderizarCampo();
      console.log('[GOM] Histórico campo em background:', (dados.historico||[]).length);
    })
    .withFailureHandler(err => {
      window._carregandoHistoricoCampo_ = false;
      console.warn('[GOM] Histórico campo background (não crítico):', err);
    })
    .gomListarCampoWebV3Json();
}

function normalizarRespostaCampoFrontend_(res) {
  try {
    const payload = typeof res === 'string' ? JSON.parse(res) : res;
    if (payload && payload.ok === false) {
      console.error('[GOM] Backend Campo retornou erro:', payload.erro);
      return { chamados: [], historico: [], kpis: {} };
    }
    return payload?.dados || { chamados: [], historico: [], kpis: {} };
  } catch (e) {
    console.error('[GOM] Erro ao interpretar JSON Campo:', e);
    return { chamados: [], historico: [], kpis: {} };
  }
}

function refreshCampo() {
  campoCarregado = false;
  window._carregandoHistoricoCampo_ = false;
  // Força re-montagem local (usa listaChamadosGlobal atualizado)
  carregarCampo({ renderizar: true, forcar: true });
}

// Exposição explícita de carregadores globais
window.carregarChamados = window.carregarChamados || carregarChamados;
window.carregarObras = window.carregarObras || carregarObras;
window.carregarCampo = window.carregarCampo || carregarCampo;