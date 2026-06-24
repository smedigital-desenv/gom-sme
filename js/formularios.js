function inicializarTelaCadastro() {
  preencherSelectEscolas('selectUnidade');
  preencherSelectEscolas('selectUnidadeEscola');
  gomAjustarCadastroPorPerfil_();
}

function gomPerfilAtualCad_() {
  return String((window.GomAuth && window.GomAuth.perfil) || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
}

// Cadastro dividido por perfil: a ESCOLA vê só o formulário da unidade (travado
// na própria escola); a Secretaria/GOM vê só o cadastro interno. O seletor de
// abas fica oculto — cada perfil enxerga um formulário só.
function gomAjustarCadastroPorPerfil_() {
  var ehEscola = gomPerfilAtualCad_() === 'ESCOLA';
  var tabs = document.getElementById('cadTabs');
  if (tabs) tabs.style.display = 'none';

  function mostrarPane(el, on) {
    if (!el) return;
    el.style.display = on ? '' : 'none';
    el.classList.toggle('show', on);
    el.classList.toggle('active', on);
  }
  mostrarPane(document.getElementById('cad-escola'), ehEscola);
  mostrarPane(document.getElementById('cad-interno'), !ehEscola);

  var titulo = document.querySelector('#main-content .page-title');

  if (ehEscola) {
    var esc = (window.GomAuth && window.GomAuth.escola) || null;
    var sel = document.getElementById('selectUnidadeEscola');
    if (sel) {
      if (esc && esc.nome) {
        sel.innerHTML = '<option value="' + escapeHtml(esc.nome) + '" selected>' + escapeHtml(esc.nome) + '</option>';
      } else {
        sel.innerHTML = '<option value="">Unidade não vinculada — avise a Secretaria/GOM</option>';
      }
      // Trava a unidade na escola do usuário (a opção única já garante o valor).
      sel.style.pointerEvents = 'none';
      sel.style.background = '#f1f5f9';
      sel.setAttribute('aria-readonly', 'true');
    }
    if (titulo) {
      titulo.innerHTML = '<div class="d-flex align-items-center gap-2 flex-wrap">'
        + '<button type="button" class="btn btn-light border fw-bold btn-sm" onclick="loadPage(\'escola\')"><i class="bi bi-arrow-left me-1"></i>Voltar</button>'
        + '<div><h4 class="mb-0"><i class="bi bi-journal-plus me-2"></i>Abrir chamado</h4>'
        + '<p class="mb-0">Descreva o problema da sua unidade. A solicitação vai direto para a análise da GOM.</p></div></div>';
    }
  } else if (titulo) {
    titulo.innerHTML = '<div><h4><i class="bi bi-journal-plus me-2"></i>Cadastro interno</h4>'
      + '<p>Registro de solicitações pela equipe GOM/Secretaria. Escolha a unidade e detalhe o chamado.</p></div>';
  }
}
function preencherSelectEscolas(id) {
  const el = document.getElementById(id); if (!el) return;
  el.innerHTML = '<option value="">Selecione...</option>' + listaEscolasGlobal.map(e=>`<option value="${escapeHtml(e.nome)}">${escapeHtml(e.nome)}</option>`).join('');
}
function setTipoEscola() {
  const nome = document.getElementById('selectUnidade')?.value || '';
  const e = listaEscolasGlobal.find(x => x.nome === nome);
  const input = document.getElementById('inputTipo'); if (input) input.value = e ? e.tipo : '';
}
function toggleCamposSistema() {
  const s = document.getElementById('selectSistema')?.value;
  const solar = document.getElementById('divSolar'); if (solar) solar.style.display = s === 'Solar' ? 'block':'none';
  const sol = document.getElementById('divSolicitacaoPor'); if (sol) sol.style.display = s === 'Solicitação por' ? 'block':'none';
}
async function enviarFormularioInterno(e) {
  e.preventDefault();
  const form = e.target;
  const botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Criando solicitação...');
  else if (botao) botao.disabled = true;

  try {
    const payload = formToObject(form);
    // Situação inicial é fixa por regra de negócio: todo chamado entra em análise.
    payload.situacao = 'Em análise';
    payload.anexos = await arquivosInputParaBase64(form.querySelector('[name="anexos"]'));
    google.script.run
      .withSuccessHandler(res=>{
        form.reset();
        if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Solicitação criada');
        else if (botao) botao.disabled = false;
        alert('Solicitação criada com ID #' + res.id);
        refreshChamados();
      })
      .withFailureHandler(err=>{
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        else if (botao) botao.disabled = false;
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível criar a solicitação.');
        else alert(err.message||err);
      })
      .salvarNovaSolicitacao(payload);
  } catch (erro) {
    if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
    else if (botao) botao.disabled = false;
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erro, 'Não foi possível preparar os anexos.');
    else alert(erro.message || erro);
  }
}
async function enviarCadastroEscola(e) {
  e.preventDefault();
  const form = e.target;
  const botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Enviando solicitação...');
  else if (botao) botao.disabled = true;

  try {
    const payload = formToObject(form);
    payload.anexos = await arquivosInputParaBase64(form.querySelector('[name="anexos"]'));
    google.script.run
      .withSuccessHandler(res=>{
        form.reset();
        if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Solicitação enviada');
        else if (botao) botao.disabled = false;
        alert('Solicitação enviada com ID #' + res.id);
        // ESCOLA: volta para "Minha Escola" (recarrega só os chamados da unidade,
        // sem disparar o carregamento geral de todos os chamados).
        if (gomPerfilAtualCad_() === 'ESCOLA' && typeof loadPage === 'function') {
          loadPage('escola');
        } else {
          refreshChamados();
        }
      })
      .withFailureHandler(err=>{
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        else if (botao) botao.disabled = false;
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível enviar a solicitação.');
        else alert(err.message||err);
      })
      .salvarSolicitacaoEscola(payload);
  } catch (erro) {
    if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
    else if (botao) botao.disabled = false;
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erro, 'Não foi possível preparar os anexos.');
    else alert(erro.message || erro);
  }
}

// Exposição explícita de funções do Cadastro
window.inicializarTelaCadastro = window.inicializarTelaCadastro || inicializarTelaCadastro;
window.enviarFormularioInterno = window.enviarFormularioInterno || enviarFormularioInterno;
window.enviarFormulario = window.enviarFormulario || enviarFormularioInterno;
window.enviarCadastroEscola = window.enviarCadastroEscola || enviarCadastroEscola;
window.enviarSolicitacaoEscola = window.enviarSolicitacaoEscola || enviarCadastroEscola;
window.setTipoEscola = window.setTipoEscola || setTipoEscola;
window.setTipoEscolaWeb = window.setTipoEscola;
window.toggleCamposSistema = window.toggleCamposSistema || toggleCamposSistema;