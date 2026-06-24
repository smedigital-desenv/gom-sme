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
  // O formulário mostrado depende do PONTO DE ENTRADA (modo), não do perfil:
  // "Abrir chamado" (Minha Escola) => formulário da escola; "Novo chamado"
  // (Secretaria) => cadastro interno. Sem modo definido (ex.: rota restaurada),
  // cai no padrão do perfil. O seletor de abas fica sempre oculto.
  var modo = window.__cadastroModo || (gomPerfilAtualCad_() === 'ESCOLA' ? 'escola' : 'interno');
  var ehFormEscola = (modo === 'escola');

  var tabs = document.getElementById('cadTabs');
  if (tabs) tabs.style.display = 'none';

  function mostrarPane(el, on) {
    if (!el) return;
    el.style.display = on ? '' : 'none';
    el.classList.toggle('show', on);
    el.classList.toggle('active', on);
  }
  mostrarPane(document.getElementById('cad-escola'), ehFormEscola);
  mostrarPane(document.getElementById('cad-interno'), !ehFormEscola);

  var titulo = document.querySelector('#main-content .page-title');

  if (ehFormEscola) {
    // Unidade travada: a escola logada usa a própria; a gestão usa a escola
    // selecionada em "Minha Escola" (passada em __cadastroEscolaNome).
    var nomeEscola = window.__cadastroEscolaNome
      || ((window.GomAuth && window.GomAuth.escola && window.GomAuth.escola.nome) || '');
    var sel = document.getElementById('selectUnidadeEscola');
    if (sel) {
      if (nomeEscola) {
        sel.innerHTML = '<option value="' + escapeHtml(nomeEscola) + '" selected>' + escapeHtml(nomeEscola) + '</option>';
      } else {
        sel.innerHTML = '<option value="">Unidade não definida</option>';
      }
      sel.style.pointerEvents = 'none';
      sel.style.background = '#f1f5f9';
      sel.setAttribute('aria-readonly', 'true');
    }
    if (titulo) {
      titulo.innerHTML = '<div class="d-flex align-items-center gap-2 flex-wrap">'
        + '<button type="button" class="btn btn-light border fw-bold btn-sm" onclick="loadPage(\'escola\')"><i class="bi bi-arrow-left me-1"></i>Voltar</button>'
        + '<div><h4 class="mb-0"><i class="bi bi-journal-plus me-2"></i>Abrir chamado' + (nomeEscola ? ' — ' + escapeHtml(nomeEscola) : '') + '</h4>'
        + '<p class="mb-0">Descreva o problema da unidade. A solicitação vai direto para a análise da GOM.</p></div></div>';
    }
    gomCadEscolaGarantirItem_(); // garante pelo menos um bloco de problema
  } else if (titulo) {
    titulo.innerHTML = '<div class="d-flex align-items-center gap-2 flex-wrap">'
      + '<button type="button" class="btn btn-light border fw-bold btn-sm" onclick="loadPage(\'dashboard\')"><i class="bi bi-arrow-left me-1"></i>Voltar</button>'
      + '<div><h4 class="mb-0"><i class="bi bi-journal-plus me-2"></i>Cadastro interno</h4>'
      + '<p class="mb-0">Registro de solicitações pela equipe GOM/Secretaria. Escolha a unidade e detalhe o chamado.</p></div></div>';
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
// Blocos de problema do formulário da escola ("+"): cada bloco vira um ITEM do
// mesmo chamado, com seus próprios anexos (atrelados ao tipo/local do bloco).
function gomCadEscolaAddItem() {
  var cont = document.getElementById('cadEscolaItens');
  var tpl = document.getElementById('tplCadEscolaItem');
  if (!cont || !tpl) return;
  if (tpl.content && tpl.content.firstElementChild) {
    cont.appendChild(tpl.content.cloneNode(true));
  } else {
    var d = document.createElement('div'); d.innerHTML = tpl.innerHTML;
    if (d.firstElementChild) cont.appendChild(d.firstElementChild);
  }
  gomCadEscolaRenumerar_();
}

function gomCadEscolaRemoveItem(btn) {
  var item = btn && btn.closest ? btn.closest('.cad-escola-item') : null;
  if (!item) return;
  var cont = document.getElementById('cadEscolaItens');
  if (cont && cont.querySelectorAll('.cad-escola-item').length <= 1) {
    alert('É preciso ter pelo menos um problema no chamado.');
    return;
  }
  item.parentNode.removeChild(item);
  gomCadEscolaRenumerar_();
}

function gomCadEscolaRenumerar_() {
  var itens = document.querySelectorAll('#cadEscolaItens .cad-escola-item');
  Array.prototype.forEach.call(itens, function (it, i) {
    var t = it.querySelector('.cad-escola-item-titulo');
    if (t) t.textContent = 'Problema ' + (i + 1);
    var rm = it.querySelector('.cad-escola-item-rm');
    if (rm) rm.style.display = (itens.length > 1) ? '' : 'none';
  });
}

function gomCadEscolaGarantirItem_() {
  var cont = document.getElementById('cadEscolaItens');
  if (!cont) return;
  if (!cont.querySelector('.cad-escola-item')) gomCadEscolaAddItem();
  else gomCadEscolaRenumerar_();
}

async function enviarCadastroEscola(e) {
  e.preventDefault();
  const form = e.target;
  const botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Enviando solicitação...');
  else if (botao) botao.disabled = true;

  try {
    // Cabeçalho (unidade, telefone, responsável, cargo) + rodapé (afeta turma,
    // risco, impacto, isolamento, observações) — todos têm name=.
    const payload = formToObject(form);
    // Cada bloco de problema vira um item, com seus anexos.
    const blocos = Array.prototype.slice.call(form.querySelectorAll('.cad-escola-item'));
    const itens = [];
    for (const bloco of blocos) {
      const get = function (campo) { var el = bloco.querySelector('[data-campo="' + campo + '"]'); return el ? String(el.value || '').trim() : ''; };
      const anexos = await arquivosInputParaBase64(bloco.querySelector('[data-campo="anexos"]'));
      itens.push({
        tipo_solicitacao: get('tipo_solicitacao'),
        local_ocorrencia: get('local_ocorrencia'),
        tempo_problema: get('tempo_problema'),
        descricao: get('descricao'),
        urgente: get('urgente'),
        anexos: anexos
      });
    }
    if (!itens.length || !itens.some(function (it) { return it.tipo_solicitacao || it.descricao; })) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao); else if (botao) botao.disabled = false;
      alert('Adicione ao menos um problema (tipo e descrição) antes de enviar.');
      return;
    }
    payload.itens = itens;
    delete payload.anexos;
    google.script.run
      .withSuccessHandler(res=>{
        form.reset();
        if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Solicitação enviada');
        else if (botao) botao.disabled = false;
        alert('Solicitação enviada com ID #' + res.id);
        // Veio de "Minha Escola" (form da escola): volta para lá (recarrega só os
        // chamados da unidade, sem o carregamento geral de todos os chamados).
        if (window.__cadastroModo === 'escola' && typeof loadPage === 'function') {
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
window.gomCadEscolaAddItem = window.gomCadEscolaAddItem || gomCadEscolaAddItem;
window.gomCadEscolaRemoveItem = window.gomCadEscolaRemoveItem || gomCadEscolaRemoveItem;
window.enviarSolicitacaoEscola = window.enviarSolicitacaoEscola || enviarCadastroEscola;
window.setTipoEscola = window.setTipoEscola || setTipoEscola;
window.setTipoEscolaWeb = window.setTipoEscola;
window.toggleCamposSistema = window.toggleCamposSistema || toggleCamposSistema;