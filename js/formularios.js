function inicializarTelaCadastro() {
  preencherSelectEscolas('selectUnidade');
  preencherSelectEscolas('selectUnidadeEscola');
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
        refreshChamados();
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