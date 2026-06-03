window.acompanharChamadosResultado = window.acompanharChamadosResultado || [];
window.acompanharListaPayload = window.acompanharListaPayload || null;

function inicializarAcompanhar() {
  preencherSelectEscolasAcompanhar();
  const resultado = document.getElementById('acompanharResultado');
  if (resultado && !resultado.innerHTML.trim()) {
    resultado.innerHTML = '<div class="acompanhar-empty"><i class="bi bi-search"></i><strong>Nenhuma consulta realizada.</strong><span>Informe protocolo, unidade ou e-mail para visualizar o andamento.</span></div>';
  }
}

function preencherSelectEscolasAcompanhar() {
  const select = document.getElementById('acompanharUnidade');
  if (!select) return;
  const atual = select.value || '';
  const escolas = Array.isArray(window.listaEscolasGlobal) ? window.listaEscolasGlobal : [];
  select.innerHTML = '<option value="">Selecione uma unidade para listar seus chamados</option>' +
    escolas.map(e => '<option value="' + escapeHtml(e.nome || '') + '">' + escapeHtml(e.nome || '') + '</option>').join('');
  if (atual) select.value = atual;
}

function consultarProtocoloEscola(event) {
  event.preventDefault();
  const form = event.target;
  const botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"]');
  const payload = formToObject(form);
  payload.id = String(payload.id || '').trim();
  payload.email = String(payload.email || '').trim();
  payload.unidade = String(payload.unidade || '').trim();

  if (!payload.id && !payload.email && !payload.unidade) {
    alert('Informe o protocolo, a unidade escolar ou o e-mail cadastrado da unidade.');
    return;
  }

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Consultando...');
  const resultado = document.getElementById('acompanharResultado');
  if (resultado) resultado.innerHTML = '<div class="acompanhar-loading"><div class="spinner-border text-primary"></div><strong>Consultando andamento...</strong></div>';

  google.script.run
    .withSuccessHandler(function(res) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      const retorno = parseJsonAcompanhar_(res);
      if (!retorno.ok) {
        renderErroAcompanhar(retorno.erro || 'Não foi possível localizar registros para a consulta.');
        return;
      }
      if (retorno.modo === 'lista' || Array.isArray(retorno.chamados)) renderListaAcompanhar(retorno);
      else renderResultadoAcompanhar(retorno.chamado);
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      renderErroAcompanhar((err && err.message) || err);
    })
    .gomConsultarProtocoloEscolaV1Json(payload);
}

function parseJsonAcompanhar_(res) {
  if (typeof res === 'string') {
    try { return JSON.parse(res); } catch(e) { return { ok: false, erro: 'Resposta inválida do servidor.' }; }
  }
  return res || { ok: false, erro: 'Resposta vazia do servidor.' };
}

function renderErroAcompanhar(msg) {
  const box = document.getElementById('acompanharResultado');
  if (!box) return;
  box.innerHTML = '<div class="acompanhar-alerta erro"><i class="bi bi-exclamation-triangle"></i><div><strong>Consulta não encontrada</strong><span>' + escapeHtml(msg || 'Verifique os dados informados.') + '</span></div></div>';
}

function renderListaAcompanhar(payload) {
  const box = document.getElementById('acompanharResultado');
  if (!box) return;
  const chamados = Array.isArray(payload.chamados) ? payload.chamados : [];
  window.acompanharChamadosResultado = chamados;
  window.acompanharListaPayload = payload;

  if (!chamados.length) {
    box.innerHTML = '<div class="acompanhar-empty"><i class="bi bi-inbox"></i><strong>Nenhum chamado encontrado.</strong><span>Não há protocolos vinculados aos dados informados.</span></div>';
    return;
  }

  const unidadeLabel = payload.unidade || (chamados[0] && chamados[0].unidade) || 'unidade consultada';
  box.innerHTML = [
    '<section class="acompanhar-lista-box">',
      '<div class="acompanhar-lista-head"><div>',
        '<span class="acompanhar-pill"><i class="bi bi-list-check me-1"></i>' + chamados.length + ' chamado(s)</span>',
        '<h5>Protocolos encontrados para ' + escapeHtml(unidadeLabel) + '</h5>',
        '<p>Clique em “Ver detalhes” para abrir o andamento completo de um protocolo.</p>',
      '</div></div>',
      '<div class="acompanhar-lista">' + chamados.map(renderItemListaAcompanhar).join('') + '</div>',
    '</section>'
  ].join('');
}

function renderItemListaAcompanhar(chamado, index) {
  const st = chamado.status || chamado.situacao || 'Em análise';
  const cor = chamado.corStatus || (typeof getCorStatus === 'function' ? getCorStatus(st) : '#002b5e');
  const descricao = chamado.descricao || 'Sem descrição pública informada.';
  return [
    '<article class="acompanhar-lista-item" style="--status-color:' + escapeHtml(cor) + ';">',
      '<div class="acompanhar-lista-status"><span>#' + escapeHtml(chamado.id || '') + '</span><strong>' + escapeHtml(st) + '</strong></div>',
      '<div class="acompanhar-lista-main">',
        '<h6>' + escapeHtml(chamado.unidade || 'Unidade não informada') + '</h6>',
        '<p>' + escapeHtml(resumirTextoAcompanhar(descricao, 180)) + '</p>',
        '<div class="acompanhar-lista-meta">',
          '<span><i class="bi bi-calendar-event me-1"></i>Abertura: ' + escapeHtml(chamado.dataAbertura || '-') + '</span>',
          '<span><i class="bi bi-clock-history me-1"></i>Atualização: ' + escapeHtml(chamado.ultimaAtualizacao || '-') + '</span>',
          '<span><i class="bi bi-hash me-1"></i>OS: ' + escapeHtml(chamado.numeroOs || 'Sem número') + '</span>',
        '</div>',
      '</div>',
      '<div class="acompanhar-lista-action"><button class="btn btn-primary btn-sm fw-bold" onclick="abrirDetalheAcompanhar(' + index + ')"><i class="bi bi-eye me-1"></i>Ver detalhes</button></div>',
    '</article>'
  ].join('');
}

function abrirDetalheAcompanhar(index) {
  const chamado = (window.acompanharChamadosResultado || [])[Number(index)];
  if (!chamado) return;
  renderResultadoAcompanhar(chamado, true);
  const box = document.getElementById('acompanharResultado');
  if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function voltarListaAcompanhar() {
  if (window.acompanharListaPayload) renderListaAcompanhar(window.acompanharListaPayload);
}

function renderResultadoAcompanhar(chamado, mostrarVoltar) {
  const box = document.getElementById('acompanharResultado');
  if (!box || !chamado) return;

  const st = chamado.status || chamado.situacao || 'Em análise';
  const cor = chamado.corStatus || (typeof getCorStatus === 'function' ? getCorStatus(st) : '#002b5e');
  const timeline = Array.isArray(chamado.timeline) ? chamado.timeline : [];
  const obsPublicas = Array.isArray(chamado.observacoesPublicas) ? chamado.observacoesPublicas : [];

  box.innerHTML = [
    '<section class="acompanhar-protocolo" style="--status-color:' + escapeHtml(cor) + ';">',
      mostrarVoltar ? '<button class="btn btn-light border fw-bold btn-sm mb-3" onclick="voltarListaAcompanhar()"><i class="bi bi-arrow-left me-1"></i>Voltar para lista</button>' : '',
      '<div class="acompanhar-protocolo-head">',
        '<div><span class="acompanhar-pill">Protocolo #' + escapeHtml(chamado.id || '') + '</span><h5>' + escapeHtml(chamado.unidade || 'Unidade não informada') + '</h5><p>' + escapeHtml(chamado.descricao || 'Sem descrição pública informada.') + '</p></div>',
        '<div class="acompanhar-status-box"><small>Status atual</small><strong>' + escapeHtml(st) + '</strong></div>',
      '</div>',
      '<div class="acompanhar-info-grid">',
        renderInfoAcompanhar('Abertura', chamado.dataAbertura || '-'),
        renderInfoAcompanhar('Última atualização', chamado.ultimaAtualizacao || '-'),
        renderInfoAcompanhar('Previsão', chamado.dataPrevistaConclusao || '-'),
        renderInfoAcompanhar('Conclusão', chamado.dataConclusao || '-'),
        renderInfoAcompanhar('Nº OS', chamado.numeroOs || 'Sem número'),
        renderInfoAcompanhar('Tipo', chamado.tipo || '-'),
      '</div>',
      '<div class="acompanhar-orientacao-status"><i class="bi bi-info-circle-fill"></i><span>' + escapeHtml(chamado.mensagemPublica || 'A solicitação está em acompanhamento pela equipe responsável.') + '</span></div>',
      '<div class="acompanhar-section-title"><i class="bi bi-clock-history me-1"></i>Linha do tempo do protocolo</div>',
      '<div class="acompanhar-timeline">' + (timeline.length ? timeline.map(renderEventoAcompanhar).join('') : '<div class="acompanhar-empty-mini">Sem eventos públicos suficientes para exibir.</div>') + '</div>',
      obsPublicas.length ? '<div class="acompanhar-section-title"><i class="bi bi-chat-left-text me-1"></i>Observações públicas</div><div class="acompanhar-observacoes">' + obsPublicas.map(o => '<div>' + escapeHtml(o) + '</div>').join('') + '</div>' : '',
      chamado.podeComplementar ? renderComplementoEscola(chamado) : '',
    '</section>'
  ].join('');
}

function renderInfoAcompanhar(label, valor) {
  return '<div class="acompanhar-info"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(valor || '-') + '</strong></div>';
}

function renderEventoAcompanhar(ev) {
  return '<div class="acompanhar-evento"><span>' + escapeHtml(ev.data || '-') + '</span><div><strong>' + escapeHtml(ev.titulo || '') + '</strong><p>' + escapeHtml(ev.descricao || '') + '</p></div></div>';
}

function renderComplementoEscola(chamado) {
  return [
    '<div class="acompanhar-complemento">',
      '<div class="acompanhar-section-title"><i class="bi bi-paperclip me-1"></i>Complementar informações</div>',
      '<p>Este chamado foi devolvido para a escola. Envie uma complementação para que ele volte à análise da GOM.</p>',
      '<form onsubmit="enviarComplementoEscola(event)" class="acompanhar-complemento-form">',
        '<input type="hidden" name="id" value="' + escapeHtml(chamado.id || '') + '">',
        '<input type="hidden" name="unidade" value="' + escapeHtml(chamado.unidade || '') + '">',
        '<input type="hidden" name="email" value="' + escapeHtml(document.getElementById('acompanharEmail') ? document.getElementById('acompanharEmail').value : '') + '">',
        '<textarea class="form-control" name="observacao" rows="3" placeholder="Descreva a complementação ou correção solicitada..." required></textarea>',
        '<input class="form-control" type="file" name="anexos" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">',
        '<button class="btn btn-success fw-bold" type="submit"><i class="bi bi-send-check me-1"></i>Enviar complemento</button>',
      '</form>',
    '</div>'
  ].join('');
}

async function enviarComplementoEscola(event) {
  event.preventDefault();
  const form = event.target;
  const botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"]');
  const payload = formToObject(form);

  try {
    if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Enviando...');
    payload.anexos = await arquivosInputParaBase64(form.querySelector('[name="anexos"]'));
    google.script.run
      .withSuccessHandler(function(res) {
        const retorno = parseJsonAcompanhar_(res);
        if (!retorno.ok) {
          if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
          alert(retorno.erro || 'Não foi possível enviar o complemento.');
          return;
        }
        if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Enviado');
        alert('Complemento enviado com sucesso. O chamado voltou para análise.');
        consultarProtocoloAposComplemento_(payload);
      })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        alert((err && err.message) || err);
      })
      .gomRegistrarComplementoEscolaV1Json(payload);
  } catch (erro) {
    if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
    alert((erro && erro.message) || erro);
  }
}

function consultarProtocoloAposComplemento_(payload) {
  const form = document.getElementById('formAcompanharProtocolo');
  if (!form) return;
  if (document.getElementById('acompanharId')) document.getElementById('acompanharId').value = payload.id || '';
  if (document.getElementById('acompanharUnidade')) document.getElementById('acompanharUnidade').value = payload.unidade || '';
  setTimeout(function() {
    consultarProtocoloEscola({ preventDefault: function(){}, target: form });
  }, 450);
}

function limparConsultaAcompanhar() {
  window.acompanharChamadosResultado = [];
  window.acompanharListaPayload = null;
  const form = document.getElementById('formAcompanharProtocolo');
  if (form) form.reset();
  preencherSelectEscolasAcompanhar();
  const resultado = document.getElementById('acompanharResultado');
  if (resultado) resultado.innerHTML = '<div class="acompanhar-empty"><i class="bi bi-search"></i><strong>Nenhuma consulta realizada.</strong><span>Informe protocolo, unidade ou e-mail para visualizar o andamento.</span></div>';
}

function resumirTextoAcompanhar(texto, limite) {
  texto = String(texto || '').replace(/\s+/g, ' ').trim();
  limite = Number(limite || 160);
  return texto.length <= limite ? texto : texto.slice(0, limite - 1).trim() + '…';
}

window.inicializarAcompanhar = inicializarAcompanhar;
window.consultarProtocoloEscola = consultarProtocoloEscola;
window.enviarComplementoEscola = enviarComplementoEscola;
window.limparConsultaAcompanhar = limparConsultaAcompanhar;
window.abrirDetalheAcompanhar = abrirDetalheAcompanhar;
window.voltarListaAcompanhar = voltarListaAcompanhar;