function gomFormatarInputDateModal_(valor) {
  // Inputs type="date" precisam receber ISO puro. A exibição fica no calendário do navegador.
  var iso = gomModalDataParaISO_(valor);
  return iso || '';
}

function gomModalDataParaISO_(valor) {
  if (typeof gomDataParaISO === 'function') return gomDataParaISO(valor);
  if (valor === null || valor === undefined || valor === '') return '';
  if (valor instanceof Date && !isNaN(valor.getTime())) return valor.getFullYear() + '-' + String(valor.getMonth() + 1).padStart(2, '0') + '-' + String(valor.getDate()).padStart(2, '0');
  if (typeof valor === 'number' && !isNaN(valor)) {
    var dataNumero = new Date(valor);
    if (!isNaN(dataNumero.getTime())) return dataNumero.getFullYear() + '-' + String(dataNumero.getMonth() + 1).padStart(2, '0') + '-' + String(dataNumero.getDate()).padStart(2, '0');
  }
  var texto = String(valor || '').trim();
  if (!texto) return '';
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var br = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (br) {
    var ano = Number(br[3]);
    if (ano < 100) ano += 2000;
    return String(ano).padStart(4, '0') + '-' + String(Number(br[2])).padStart(2, '0') + '-' + String(Number(br[1])).padStart(2, '0');
  }
  var data = new Date(texto);
  if (!isNaN(data.getTime())) return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
  return '';
}




function isFluxoAprovacaoModal_(chamado) {
  // Decisões de orçamento valem APENAS para "Orçamento Realizado".
  // "Serviço Realizado" tem fluxo próprio de validação (Memorial ou Garantia de Serviço).
  var st = normalizarSituacaoSistema(chamado && (chamado.situacao || chamado.status));
  return st === 'Orçamento Realizado';
}

function setTextoModalFluxo_(emAprovacao) {
  var statusLabel = document.getElementById('mdlStatusLabel');
  var obsLabel = document.getElementById('mdlObsLabel');
  var obs = document.getElementById('mdlNovaObservacao');
  var btn = document.getElementById('mdlBtnAtualizar');
  var osLabel = document.getElementById('mdlNumeroOsLabel');

  if (statusLabel) statusLabel.textContent = emAprovacao ? 'Decisão do orçamento' : 'Alterar situação';
  if (obsLabel) obsLabel.textContent = emAprovacao ? 'Parecer interno' : 'Nova observação';
  if (obs) obs.placeholder = emAprovacao ? 'Justificativa da aprovação, devolução ou reprovação...' : 'Registrar observação do trâmite...';
  if (btn) btn.innerHTML = emAprovacao ? '<i class="bi bi-check2-square me-1"></i>Registrar decisão' : 'ATUALIZAR';
  if (osLabel) osLabel.textContent = emAprovacao ? 'Número da OS' : 'Nº da OS';
}

function atualizarCamposModalAprovacao() {
  var select = document.getElementById('mdlSelectStatus');
  var decisao = select ? select.value : '';
  var numeroOs = document.getElementById('mdlNumeroOs');
  var dataPrev = document.getElementById('mdlDataPrevistaConclusao');

  if (numeroOs) {
    var aprovando = decisao === 'aprovar';
    numeroOs.disabled = true;
    numeroOs.required = false;
    numeroOs.placeholder = aprovando ? 'Gerado automaticamente pelo sistema' : 'Não se aplica nesta decisão';
    numeroOs.value = '';
  }

  if (dataPrev) {
    var precisaPrevisao = decisao === 'aprovar';
    dataPrev.disabled = !precisaPrevisao;
  }
}

function limparAnexosModalAtualizacao_() {
  if (typeof gomAnexoLimpar === 'function') { gomAnexoLimpar('mdlAnexosAtualizacao'); return; }
  var input = document.getElementById('mdlAnexosAtualizacao');
  if (input) input.value = '';
}


function normalizarPerfilObservacoesModal_(perfil) {
  var p = String(perfil || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (p === 'ADMINISTRADOR_GOM') p = 'ADMIN_GOM';
  if (p === 'GOM') p = 'SECRETARIA';
  return p;
}

function usuarioPodeEditarObservacoesChamado_() {
  var perfil = '';
  try { perfil = (window.GomAuth && window.GomAuth.perfil) || ''; } catch(e) {}
  if (!perfil) {
    try { perfil = (window.usuarioAtualGom && window.usuarioAtualGom.perfil) || ''; } catch(e) {}
  }
  perfil = normalizarPerfilObservacoesModal_(perfil);
  return perfil === 'ADMIN_GOM' || perfil === 'SECRETARIA';
}


function usuarioPodeCorrigirNumeroOsLegado_() {
  return usuarioPodeEditarObservacoesChamado_();
}

function atualizarBoxNumeroOsLegado_(chamado) {
  var box = document.getElementById('mdlOsLegadoBox');
  var input = document.getElementById('mdlNumeroOsLegado');
  if (!box) return;
  var st = normalizarSituacaoSistema(chamado && (chamado.situacao || chamado.status));
  var numero = String((chamado && (chamado.numeroOs || chamado.numero_os || chamado.auxiliar)) || '').trim();
  var pode = usuarioPodeCorrigirNumeroOsLegado_() && st === 'OS emitida' && !numero;
  box.style.display = pode ? '' : 'none';
  if (input) input.value = '';
}

async function salvarNumeroOsLegadoChamado(botao) {
  if (!usuarioPodeCorrigirNumeroOsLegado_()) {
    alert('Seu perfil não tem permissão para alterar o número da OS.');
    return;
  }
  var chamadoAtual = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(idChamadoAberto); }) || {};
  var st = normalizarSituacaoSistema(chamadoAtual.situacao || chamadoAtual.status);
  if (st !== 'OS emitida') {
    alert('A regularização manual do número só está disponível para chamados antigos com OS emitida.');
    return;
  }
  if (String(chamadoAtual.numeroOs || '').trim()) {
    alert('Este chamado já possui número de OS. Novas alterações não são permitidas por esta tela.');
    return;
  }
  var input = document.getElementById('mdlNumeroOsLegado');
  var numero = input ? String(input.value || '').trim() : '';
  if (!numero) {
    alert('Informe o número da OS. Ex.: 213/2026');
    if (input) input.focus();
    return;
  }

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando nº OS...');
  else if (botao) botao.disabled = true;

  google.script.run
    .withSuccessHandler(function() {
      if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Nº OS salvo');
      var camposLocais = { numeroOs: numero, auxiliar: numero };
      if (typeof gomAtualizarChamadoLocal === 'function') gomAtualizarChamadoLocal(idChamadoAberto, camposLocais);
      refreshChamados(function() {
        var atualizado = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(idChamadoAberto); });
        atualizarBoxNumeroOsLegado_(atualizado || chamadoAtual);
        if (typeof atualizarBotaoOrdemServicoModal === 'function') atualizarBotaoOrdemServicoModal(atualizado || chamadoAtual);
        carregarTimelineChamadoModal_(idChamadoAberto);
      }, { id: idChamadoAberto, campos: camposLocais });
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar o número da OS.');
      else alert((err && err.message) || err);
    })
    .corrigirNumeroOsLegado({ id: idChamadoAberto, numeroOs: numero });
}

function fecharEdicaoObservacoesChamado_() {
  var box = document.getElementById('mdlObsEditBox');
  var obsBox = document.getElementById('mdlObservacoes');
  var btn = document.getElementById('mdlBtnEditarObservacoes');
  if (box) box.style.display = 'none';
  if (obsBox) obsBox.style.display = '';
  if (btn) btn.style.display = usuarioPodeEditarObservacoesChamado_() ? '' : 'none';
}

function abrirEdicaoObservacoesChamado() {
  if (!usuarioPodeEditarObservacoesChamado_()) {
    alert('Apenas Secretaria/GOM e Administrador GOM podem editar o campo observações.');
    return;
  }
  var chamadoAtual = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(idChamadoAberto); }) || {};
  var textarea = document.getElementById('mdlObservacoesEditadas');
  var box = document.getElementById('mdlObsEditBox');
  var obsBox = document.getElementById('mdlObservacoes');
  var btn = document.getElementById('mdlBtnEditarObservacoes');
  if (textarea) textarea.value = String(chamadoAtual.observacoes || '');
  if (box) box.style.display = '';
  if (obsBox) obsBox.style.display = 'none';
  if (btn) btn.style.display = 'none';
  if (textarea) setTimeout(function(){ textarea.focus(); }, 50);
}

function cancelarEdicaoObservacoesChamado() {
  fecharEdicaoObservacoesChamado_();
}

async function salvarEdicaoObservacoesChamado(botao) {
  if (!usuarioPodeEditarObservacoesChamado_()) {
    alert('Apenas Secretaria/GOM e Administrador GOM podem editar o campo observações.');
    return;
  }

  var chamadoAtual = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(idChamadoAberto); }) || {};
  var textarea = document.getElementById('mdlObservacoesEditadas');
  var novoTexto = textarea ? String(textarea.value || '').replace(/\r\n/g, '\n').trim() : '';
  var textoAtual = String(chamadoAtual.observacoes || '').replace(/\r\n/g, '\n').trim();

  if (novoTexto === textoAtual) {
    alert('Nenhuma alteração foi feita no campo observações.');
    return;
  }

  if (!novoTexto && textoAtual && !confirm('As observações atuais serão apagadas. Confirmar alteração?')) return;

  var payload = { id: idChamadoAberto, observacoesNova: novoTexto };

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando alteração...');
  else if (botao) botao.disabled = true;

  google.script.run
    .withSuccessHandler(function() {
      if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Observações atualizadas');
      else if (botao) botao.disabled = false;

      if (typeof gomAtualizarChamadoLocal === 'function') {
        gomAtualizarChamadoLocal(idChamadoAberto, { observacoes: novoTexto });
      } else {
        chamadoAtual.observacoes = novoTexto;
      }

      var obsBox = document.getElementById('mdlObservacoes');
      if (obsBox) obsBox.innerText = novoTexto || 'Sem observações';
      fecharEdicaoObservacoesChamado_();
      carregarTimelineChamadoModal_(idChamadoAberto);
      if (typeof refreshChamados === 'function') refreshChamados(function() { atualizarModalChamadoAbertoAposRefresh_(); }, null);
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível editar as observações.');
      else alert((err && err.message) || err);
    })
    .editarObservacoesChamado(payload);
}

async function coletarAnexosModalAtualizacao_() {
  var input = document.getElementById('mdlAnexosAtualizacao');
  if (!input || !input.files || !input.files.length) return [];
  if (typeof arquivosInputParaBase64 !== 'function') {
    throw new Error('Função de leitura de anexos não carregada. Recarregue o sistema e tente novamente.');
  }
  return await arquivosInputParaBase64(input);
}

function renderAnexosDetalhesChamadoModal_(chamado) {
  // Usa preview com miniaturas (imagens) + lightbox para o modal completo do chamado.
  // Função renderAnexosGrupoVisual_ mostra thumb para imagens e link para outros tipos.
  function renderAnexosGrupoVisual_(titulo, valor) {
    if (typeof extrairLinksAnexos !== 'function') return '';
    var anexos = extrairLinksAnexos(valor);
    if (!anexos.length) return '';
    var itens = anexos.map(function(a, i) {
      var nome = escapeHtml(a.nome || ('Anexo ' + (i + 1)));
      var url  = a.url || '';
      var ehImg = typeof isImagemAnexo === 'function' && isImagemAnexo(a);
      var preview = ehImg && typeof getPreviewUrlAnexo === 'function' ? getPreviewUrlAnexo(a, 280) : '';
      if (ehImg && preview) {
        return '<button type="button" class="gom-modal-thumb" title="'+nome+' — clique para ampliar"'
          +' data-url="'+escapeHtml(url)+'" data-preview="'+escapeHtml(getPreviewUrlAnexo(a,1400)||preview)+'"'
          +' data-nome="'+nome+'" data-grupo="'+escapeHtml(titulo)+'" data-imagem="SIM"'
          +' onclick="abrirPreviewAnexoCard(event,this)">'
          +'<img src="'+escapeHtml(preview)+'" alt="'+nome+'" loading="lazy"'
          +' onerror="this.parentNode.classList.add(\'sem-prev\')">'
          +'<span class="gom-modal-thumb-label">'+nome+'</span>'
          +'</button>';
      }
      var icone = typeof getIconeAnexoCard_ === 'function' ? getIconeAnexoCard_(a) : 'bi-paperclip';
      return '<a class="gom-modal-file-item" href="'+escapeHtml(url)+'" target="_blank" rel="noopener">'
        +'<i class="bi '+icone+' me-2"></i>'+nome+'</a>';
    }).join('');
    return '<div class="anexo-grupo mb-3">'
      +'<div class="modal-label"><i class="bi bi-paperclip me-1"></i>'+escapeHtml(titulo)+'</div>'
      +'<div class="gom-modal-anexos-grid">'+itens+'</div>'
      +'</div>';
  }

  var html = '';
  html += renderAnexosGrupoVisual_('Anexos da solicitação', chamado.anexosSolicitacao || chamado.anexos);
  html += renderAnexosGrupoVisual_('Anexos do orçamento', chamado.anexosOrcamento);
  html += renderAnexosGrupoVisual_('Anexos do serviço realizado', chamado.anexosServico);
  if (html) return html;
  return '<div class="anexo-grupo mb-3"><div class="modal-label">Arquivos anexados</div>'
    +'<div class="anexo-empty"><i class="bi bi-inbox me-1"></i>Nenhum anexo cadastrado neste chamado.</div></div>';
}



function parseTimelineJsonModal_(res) {
  if (!res) return { ok: false, timeline: [] };
  if (typeof res === 'string') {
    try { return JSON.parse(res); } catch(e) { return { ok: false, erro: e.message, timeline: [] }; }
  }
  return res;
}

function timelineIconePorTipo_(tipo) {
  tipo = String(tipo || '').toLowerCase();
  if (tipo.indexOf('criacao') >= 0) return 'bi-plus-circle-fill';
  if (tipo.indexOf('equipe') >= 0) return 'bi-people-fill';
  if (tipo.indexOf('prazo') >= 0) return 'bi-calendar-check-fill';
  if (tipo.indexOf('conclusao') >= 0) return 'bi-check-circle-fill';
  if (tipo.indexOf('fila') >= 0) return 'bi-hourglass-split';
  if (tipo.indexOf('encaminhamento') >= 0) return 'bi-send-fill';
  return 'bi-dot';
}

function renderTimelineChamadoModal_(eventos, carregando) {
  var box = document.getElementById('mdlTimelineBox');
  if (!box) return;
  eventos = Array.isArray(eventos) ? eventos : [];

  if (carregando && !eventos.length) {
    box.innerHTML = '<div class="timeline-loading"><span class="spinner-border spinner-border-sm me-2"></span>Carregando histórico...</div>';
    return;
  }

  if (!eventos.length) {
    box.innerHTML = '<div class="timeline-empty"><i class="bi bi-clock-history me-1"></i>Nenhum histórico detalhado encontrado para este chamado.</div>';
    return;
  }

  var html = eventos.map(function(e) {
    var status = e.statusNovo || e.status || '';
    var statusAnterior = e.statusAnterior || '';
    var statusLinha = statusAnterior && statusAnterior !== status
      ? '<span class="timeline-status-de">' + escapeHtml(statusAnterior) + '</span><i class="bi bi-arrow-right-short"></i><span class="timeline-status-para">' + escapeHtml(status || '-') + '</span>'
      : (status ? '<span class="timeline-status-para">' + escapeHtml(status) + '</span>' : '');
    var meta = [e.origem, e.usuario, e.equipe ? 'Equipe: ' + e.equipe : '', e.valorOrcamento ? 'Valor: ' + e.valorOrcamento : ''].filter(Boolean).join(' · ');
    return '<div class="timeline-item timeline-' + escapeHtml(e.tipo || 'log') + '">' +
      '<div class="timeline-marker"><i class="bi ' + timelineIconePorTipo_(e.tipo) + '"></i></div>' +
      '<div class="timeline-content">' +
        '<div class="timeline-top"><strong>' + escapeHtml(e.titulo || 'Registro') + '</strong><span>' + escapeHtml(e.data || '-') + '</span></div>' +
        (statusLinha ? '<div class="timeline-status">' + statusLinha + '</div>' : '') +
        (e.descricao ? '<div class="timeline-desc">' + escapeHtml(e.descricao) + '</div>' : '') +
        (meta ? '<div class="timeline-meta">' + escapeHtml(meta) + '</div>' : '') +
      '</div>' +
    '</div>';
  }).join('');

  box.innerHTML = '<div class="timeline-list">' + html + '</div>' + (carregando ? '<div class="timeline-loading small"><span class="spinner-border spinner-border-sm me-2"></span>Atualizando com logs do sistema...</div>' : '');
}

function montarTimelineLocalModal_(chamado) {
  chamado = chamado || {};
  var eventos = [];
  function add(ev) {
    if (!ev || (!ev.titulo && !ev.descricao)) return;
    eventos.push(ev);
  }

  add({ tipo: 'criacao', data: chamado.dataHora || chamado.data || '', titulo: 'Chamado criado', descricao: chamado.detalhamento || '', statusNovo: chamado.situacao || chamado.status || '', origem: chamado.sistema || 'Solicitação' });
  if (chamado.dataHoraEntradaFila) add({ tipo: 'fila', data: chamado.dataHoraEntradaFila, titulo: 'Entrada em atendimento/fila', descricao: 'Registro de entrada no atendimento.', statusNovo: chamado.situacao || chamado.status || '', origem: 'Sistema' });
  if (chamado.dataHoraEncaminhamento) add({ tipo: 'encaminhamento', data: chamado.dataHoraEncaminhamento, titulo: 'Encaminhamento registrado', descricao: 'Chamado encaminhado para a etapa atual.', statusNovo: chamado.situacao || chamado.status || '', origem: 'Sistema' });
  if (chamado.dataPrevistaConclusao) add({ tipo: 'prazo', data: chamado.dataPrevistaConclusao, titulo: 'Previsão de conclusão', descricao: 'Previsão definida para conclusão do atendimento.', statusNovo: chamado.situacao || chamado.status || '', origem: 'Prazo' });
  if (chamado.dataConclusaoOs || chamado.dataConclusao) add({ tipo: 'conclusao', data: chamado.dataConclusaoOs || chamado.dataConclusao, titulo: 'Conclusão registrada', descricao: 'Conclusão do atendimento ou OS.', statusNovo: chamado.situacao || chamado.status || '', origem: 'Sistema' });

  return eventos;
}

function carregarTimelineChamadoModal_(id) {
  window.gomTimelineChamadoAtual_ = null; // zera cache do chamado anterior
  var chamado = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(id); }) || {};
  var locais = montarTimelineLocalModal_(chamado);
  renderTimelineChamadoModal_(locais, true);

  if (!google || !google.script || !google.script.run || typeof google.script.run.gomListarTimelineChamadoV1Json !== 'function') {
    renderTimelineChamadoModal_(locais, false);
    return;
  }

  google.script.run
    .withSuccessHandler(function(res) {
      var payload = parseTimelineJsonModal_(res);
      var eventos = payload && payload.ok && Array.isArray(payload.timeline) ? payload.timeline : locais;
      if (!eventos.length) eventos = locais;
      renderTimelineChamadoModal_(eventos, false);
      // Cacheia a timeline do chamado aberto e reavalia o botão "Abrir OS" —
      // ele só vale para chamados que passaram por Atendimento Emergencial.
      window.gomTimelineChamadoAtual_ = { id: id, eventos: eventos };
      if (String(idChamadoAberto) === String(id) && typeof gomAtualizarBotaoAbrirOsMemorial_ === 'function') {
        gomAtualizarBotaoAbrirOsMemorial_(chamado);
      }
    })
    .withFailureHandler(function(err) {
      console.warn('[GOM TIMELINE] Falha ao carregar timeline:', err);
      renderTimelineChamadoModal_(locais, false);
    })
    .gomListarTimelineChamadoV1Json(id);
}

function recarregarTimelineModal() {
  if (window.idChamadoAberto || typeof idChamadoAberto !== 'undefined') carregarTimelineChamadoModal_(idChamadoAberto);
}


function atualizarModalChamadoAbertoAposRefresh_() {
  if (!idChamadoAberto) return;
  var atualizado = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(idChamadoAberto); });
  if (!atualizado) return;
  var boxAnexos = document.getElementById('mdlAnexosBox');
  if (boxAnexos) boxAnexos.innerHTML = renderAnexosDetalhesChamadoModal_(atualizado);
  var obs = document.getElementById('mdlObservacoes');
  if (obs) obs.innerText = atualizado.observacoes || 'Sem observações';
  if (typeof atualizarBotaoOrdemServicoModal === 'function') atualizarBotaoOrdemServicoModal(atualizado);
  if (typeof gomAtualizarBotaoAbrirOsMemorial_ === 'function') gomAtualizarBotaoAbrirOsMemorial_(atualizado);
  var numeroOsEl = document.getElementById('mdlNumeroOs');
  if (numeroOsEl) numeroOsEl.value = atualizado.numeroOs || '';
  carregarTimelineChamadoModal_(idChamadoAberto);
}

function sinalizarAtualizacaoAnexosModal_() {
  var boxAnexos = document.getElementById('mdlAnexosBox');
  if (!boxAnexos) return;
  boxAnexos.innerHTML = '<div class="anexo-grupo mb-3"><div class="modal-label"><i class="bi bi-cloud-arrow-up me-1"></i>Arquivos anexados</div><div class="anexo-empty"><span class="spinner-border spinner-border-sm me-2"></span>Atualizando anexos do chamado...</div></div>';
}

function abrirModalAnalise(id) {
  const c = listaChamadosGlobal.find(x => String(x.id) === String(id));
  if (!c) return;
  idChamadoAberto = c.id;
  document.getElementById('mdlId').innerText = c.id;
  document.getElementById('mdlUnidade').innerText = c.unidade || '';
  document.getElementById('mdlSistema').innerText = c.sistema || '';
  // "Abertura" = data real do chamado; "Última intervenção" = quando o chamado
  // mudou pela última vez (data_hora_ultima_acao) — é a data que os alertas usam.
  document.getElementById('mdlData').innerText = c.dataHora || c.data || '';
  var elUltimaInterv = document.getElementById('mdlUltimaIntervencao');
  if (elUltimaInterv) elUltimaInterv.innerText = c.dataHoraUltimaAcao || c.dataHora || c.data || '—';
  document.getElementById('mdlDetalhe').innerText = c.detalhamento || 'Sem detalhe';
  document.getElementById('mdlObservacoes').innerText = c.observacoes || 'Sem observações';
  fecharEdicaoObservacoesChamado_();
  document.getElementById('mdlAnexosBox').innerHTML = renderAnexosDetalhesChamadoModal_(c);
  carregarTimelineChamadoModal_(c.id);
  preencherSelectStatusModal(c);
  const emAprovacaoModal = isFluxoAprovacaoModal_(c);
  setTextoModalFluxo_(emAprovacaoModal);
  const workflow = document.getElementById('mdlWorkflowBox');
  if (workflow) workflow.style.display = (telaAtual === 'historico' || telaAtual === 'campo') ? 'none' : '';
  const inputObs = document.getElementById('mdlNovaObservacao');
  if (inputObs) inputObs.value = '';
  limparAnexosModalAtualizacao_();
  const numeroOs = document.getElementById('mdlNumeroOs');
  if (numeroOs) numeroOs.value = c.numeroOs || '';
  // Valor do orçamento e previsão de conclusão — cada um só aparece quando há dado.
  const valorOrcRow = document.getElementById('mdlValorOrcamentoRow');
  const valorOrcEl = document.getElementById('mdlValorOrcamento');
  const valorOrcCol = document.getElementById('mdlValorOrcamentoCol');
  var vOrc = (typeof gomMoedaFormatar === 'function') ? gomMoedaFormatar(c.valorOrcamento) : (c.valorOrcamento || '');
  if (valorOrcEl) valorOrcEl.innerText = vOrc || '';
  if (valorOrcCol) valorOrcCol.style.display = vOrc ? '' : 'none';
  const prevConclEl = document.getElementById('mdlPrevisaoConclusao');
  const prevConclCol = document.getElementById('mdlPrevisaoCol');
  var vPrev = c.dataPrevistaConclusao || '';
  if (prevConclEl) prevConclEl.innerText = vPrev || '';
  if (prevConclCol) prevConclCol.style.display = vPrev ? '' : 'none';
  if (valorOrcRow) valorOrcRow.style.display = (vOrc || vPrev) ? '' : 'none';
  const prev = document.getElementById('mdlDataPrevistaConclusao');
  if (prev) {
    const valorPrev = c.dataPrevistaConclusaoRaw || c.dataPrevistaConclusao || '';
    prev.value = gomFormatarInputDateModal_(valorPrev);
  }
  // Campo de agendamento de visita — só visível na tela de fila
  const camposFila = document.querySelectorAll('.modal-extra-fila');
  const ehFila = (telaAtual === 'fila' || normalizarSituacaoSistema(c.situacao || c.status) === 'Aguardando visita');
  camposFila.forEach(function(el) { el.style.display = ehFila ? '' : 'none'; });
  const dataAgend = document.getElementById('mdlDataAgendamentoVisita');
  if (dataAgend) {
    const valorAgend = c.dataAgendamentoVisitaRaw || c.dataAgendamentoVisita || '';
    dataAgend.value = gomFormatarInputDateModal_(valorAgend);
  }
  atualizarBoxNumeroOsLegado_(c);
  // Botão "Salvar observação" — sempre visível quando não é aprovação
  const btnObs = document.getElementById('mdlBtnSalvarObs');
  // "Atualizar chamado" (observação + anexos, SEM mudar o status) só aparece na
  // APROVAÇÃO — lá o botão principal exige uma decisão, então é preciso um jeito
  // de só anexar/observar (ex.: fotos antes de emitir a OS). Nos demais fluxos o
  // próprio "ATUALIZAR" já atualiza sem mudar o status (basta não trocar a
  // situação), então o botão extra seria redundante (duplicado).
  if (btnObs) btnObs.style.display = emAprovacaoModal ? '' : 'none';
  if (typeof atualizarBotaoOrdemServicoModal === 'function') atualizarBotaoOrdemServicoModal(c);
  document.querySelectorAll('.modal-extra-aprovacao').forEach(el => { el.style.display = emAprovacaoModal ? '' : 'none'; });
  if (emAprovacaoModal) atualizarCamposModalAprovacao();
  gomPreencherSeletorEvento_(c);
  gomAtualizarBotaoAbrirOsMemorial_(c);
  gomConfigurarOverrideAdmin_(c);

  new bootstrap.Modal(document.getElementById('modalAnalise')).show();
}

// Mostra o botão "Abrir OS e enviar ao Memorial" na validação final de um
// chamado em "Serviço Realizado" que ainda não tem OS (caso do Atendimento
// Emergencial, cujo serviço é feito antes de qualquer OS). Um clique gera o
// número da OS e encaminha ao Memorial na mesma ação.
// Detecta, pela timeline já carregada, se o chamado passou por "Atendimento
// Emergencial". Retorna null quando a timeline ainda não chegou (indefinido).
function gomChamadoPassouEmergencial_(chamado) {
  const cache = window.gomTimelineChamadoAtual_;
  if (!cache || String(cache.id) !== String(chamado.id) || !Array.isArray(cache.eventos)) return null;
  return cache.eventos.some(function (e) {
    const alvo = normalizarTextoBase([e && e.statusNovo, e && e.status_novo, e && e.statusAnterior, e && e.titulo, e && e.acao].join(' '));
    return alvo.indexOf('atendimento emergencial') >= 0 || alvo.indexOf('emergencial') >= 0;
  });
}

function gomAtualizarBotaoAbrirOsMemorial_(chamado) {
  const box = document.getElementById('mdlAbrirOsBox');
  if (!box) return;
  const st = normalizarSituacaoSistema(chamado.situacao || chamado.status);
  const semOs = !String(chamado.numeroOs || '').trim();
  const podeAlterar = (typeof window.gomPerfilPodeAlterarStatus !== 'function') || window.gomPerfilPodeAlterarStatus(chamado);
  const base = st === 'Serviço Realizado' && semOs && podeAlterar
    && telaAtual !== 'historico' && telaAtual !== 'campo';
  // Só mostra para chamados emergenciais. Enquanto a timeline não chega
  // (retorno null), exibe de forma otimista e refina quando ela carregar.
  const emergencial = gomChamadoPassouEmergencial_(chamado);
  const visivel = base && (emergencial === null ? true : emergencial === true);
  box.style.display = visivel ? '' : 'none';
  const valorEl = document.getElementById('mdlValorOsEmergencial');
  if (valorEl && visivel && !valorEl.value) {
    valorEl.value = (typeof gomMoedaFormatar === 'function') ? (gomMoedaFormatar(chamado.valorOrcamento) || '') : (chamado.valorOrcamento || '');
  }
}

// Núcleo reutilizável: apenas ABRE a OS (gera o número) e baixa o documento —
// NÃO altera o status do chamado nem o envia ao Memorial. Ele continua em
// "Serviço Realizado" até que a validação normal ("Registrar validação" →
// Validar e enviar para Memorial) seja registrada separadamente. Usado tanto
// pelo modal do chamado quanto pelo card de validação inline da tela
// Aprovação — por isso recebe o id explicitamente. valorOs (opcional): valor
// digitado no campo "Valor da OS" do Atendimento Emergencial, incorporado à
// OS gerada.
async function gomAbrirOsChamadoCore_(id, botao, valorOs) {
  const chamado = (window.listaChamadosGlobal || []).find(function (x) { return String(x.id) === String(id); }) || {};
  if (typeof window.gomPerfilPodeAlterarStatus === 'function' && !window.gomPerfilPodeAlterarStatus(chamado)) {
    alert('Seu perfil não pode validar este chamado neste estágio.');
    return;
  }
  if (!confirm('Abrir a OS do chamado #' + id + '?\n\nO número será gerado e o documento baixado automaticamente. O chamado NÃO é enviado ao Memorial — ele continua em Serviço Realizado até você registrar a validação.')) return;

  const payload = { id: id, abrirOs: true };
  if (valorOs) payload.valorOrcamento = valorOs;

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Abrindo OS...');
  else if (botao) botao.disabled = true;

  google.script.run
    .withSuccessHandler(async function (resposta) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      // Baixa o documento da OS assim que o número é gerado — "abrir" já entrega
      // o arquivo pronto, sem precisar de um segundo clique.
      const numeroGerado = resposta && resposta.numeroOs;
      if (numeroGerado && typeof window.gomBaixarOsChamadoObjeto_ === 'function') {
        const chamadoParaDocx = Object.assign({}, chamado, { numeroOs: numeroGerado });
        if (valorOs) chamadoParaDocx.valorOrcamento = valorOs;
        try { await window.gomBaixarOsChamadoObjeto_(chamadoParaDocx, null); } catch (e) {}
      }
      // Não fecha o modal nem muda de tela: o chamado segue aberto para que a
      // validação (Concluído / Garantia de Serviço) seja feita em seguida.
      const modalAberto = String(idChamadoAberto) === String(id);
      refreshChamados(function () {
        if (modalAberto && typeof atualizarModalChamadoAbertoAposRefresh_ === 'function') atualizarModalChamadoAbertoAposRefresh_();
        if (typeof renderizarTela === 'function') renderizarTela();
      });
    })
    .withFailureHandler(function (err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível abrir a OS.');
      else alert((err && err.message) || err);
    })
    .atualizarChamadoWorkflow(payload);
}
window.gomAbrirOsChamadoCore_ = gomAbrirOsChamadoCore_;

// Wrapper usado pelo botão do modal do chamado (lê o valor da OS digitado na caixa).
function gomAbrirOsChamado_(botao) {
  const valorEl = document.getElementById('mdlValorOsEmergencial');
  const valorOs = valorEl ? String(valorEl.value || '').trim() : '';
  return gomAbrirOsChamadoCore_(idChamadoAberto, botao, valorOs);
}
window.gomAbrirOsChamado_ = gomAbrirOsChamado_;

function getStatusPermitidosModal(chamado) {
  const st = normalizarSituacaoSistema(chamado.situacao || chamado.status);
  // Gate por perfil (fallback caso o módulo de fluxo não carregue): a Secretaria não
  // altera status de execução da Empresa, e a Empresa não altera estados da Secretaria.
  const perfilGom = String((window.GomAuth && window.GomAuth.perfil) || (window.usuarioAtualGom && window.usuarioAtualGom.perfil) || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (perfilGom && perfilGom !== 'ADMIN_GOM') {
    const ehExecucaoEmpresa = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Garantia de Serviço'].indexOf(st) >= 0;
    if (ehExecucaoEmpresa ? perfilGom !== 'EMPRESA' : perfilGom === 'EMPRESA') return [];
  }
  const contexto = (telaAtual === 'empresa') ? 'empresa' : (telaAtual === 'fila' ? 'fila' : (telaAtual === 'triagem' ? 'triagem' : 'modal'));
  if (isFluxoAprovacaoModal_(chamado)) return [];

  // Remove "Cancelado" das opções quando o perfil não pode cancelar (só Secretaria).
  const filtrarCancelado = function (lista) {
    if (typeof gomPodeCancelarChamado_ === 'function' && gomPodeCancelarChamado_()) return lista;
    return (lista || []).filter(function (s) { return normalizarSituacaoSistema(s) !== 'Cancelado'; });
  };

  if (typeof gomProximosStatusFluxo === 'function') {
    return filtrarCancelado(gomProximosStatusFluxo(st, contexto));
  }

  // Fallback local, para evitar lista completa caso algum script carregue fora de ordem.
  const mapa = {
    'Em análise': ['Visita agendada', 'Atendimento Emergencial', 'Solicitado Orçamento', 'Aguardando visita', 'Garantia de Obra', 'Devolvido para a escola', 'Cancelado'],
    'Aguardando visita': ['Visita agendada', 'Atendimento Emergencial', 'Solicitado Orçamento', 'Garantia de Obra', 'Devolvido para a escola', 'Cancelado'],
    'Visita agendada': ['Atendimento Emergencial', 'Solicitado Orçamento', 'Garantia de Obra', 'Devolvido para a escola', 'Cancelado'],
    'Solicitado Orçamento': ['Orçamento Realizado'],
    'OS emitida': ['Serviço Realizado'],
    'Atendimento Emergencial': ['Serviço Realizado'],
    'Garantia de Obra': ['Serviço Realizado'],
    'Garantia de Serviço': ['Serviço Realizado'],
    'Serviço Realizado': ['Concluído', 'Garantia de Serviço']
  };
  return filtrarCancelado(mapa[st] || []);
}

function preencherSelectStatusModal(chamado) {
  const select = document.getElementById('mdlSelectStatus');
  if (!select) return;

  if (isFluxoAprovacaoModal_(chamado)) {
    select.innerHTML = [
      '<option value="">Selecione...</option>',
      '<option value="aprovar">Aprovar e emitir OS</option>',
      '<option value="ajuste">Devolver para ajuste</option>',
      '<option value="negar">Negar orçamento</option>',
      '<option value="devolver_escola">Devolver para escola</option>'
    ].join('');
    select.value = '';
    select.onchange = atualizarCamposModalAprovacao;
    return;
  }

  select.onchange = null;
  const atual = normalizarSituacaoSistema(chamado.situacao || chamado.status);

  // Validação de Serviço Realizado: apenas duas decisões, com rótulos claros.
  if (atual === 'Serviço Realizado') {
    select.innerHTML = [
      '<option value="" disabled selected>-- Selecionar decisão --</option>',
      '<option value="Concluído">Validar e enviar para Memorial</option>',
      '<option value="Garantia de Serviço">Garantia de Serviço (retorna à empresa)</option>'
    ].join('');
    select.value = '';
    return;
  }

  const aguardandoVisitaNaFila = (telaAtual === 'fila' || atual === 'Aguardando visita') && atual === 'Aguardando visita';
  const permitidos = getStatusPermitidosModal(chamado).filter(s => s !== atual);
  const opcoes = aguardandoVisitaNaFila ? permitidos : [atual].concat(permitidos);
  select.innerHTML = (aguardandoVisitaNaFila ? '<option value="" disabled selected>-- Selecionar encaminhamento --</option>' : '')
    + opcoes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  select.value = aguardandoVisitaNaFila ? '' : atual;
}

// ── Marcação de eventos especiais (ex.: tempestade) ──────────────────────────
// Perfil normalizado do usuário GOM atual (SECRETARIA, ADMIN_GOM, EMPRESA...).
function gomPerfilGomAtual_() {
  var p = String((window.GomAuth && window.GomAuth.perfil) || (window.usuarioAtualGom && window.usuarioAtualGom.perfil) || '')
    .trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (p === 'ADMINISTRADOR_GOM') p = 'ADMIN_GOM';
  if (p === 'GOM') p = 'SECRETARIA';
  return p;
}

// A marcação de evento só pode ser definida/alterada pela Secretaria.
// O Administrador GOM mantém acesso total, como nas demais ações do sistema.
function gomPodeEditarEvento_() {
  var p = gomPerfilGomAtual_();
  return p === 'SECRETARIA' || p === 'ADMIN_GOM';
}
window.gomPodeEditarEvento_ = gomPodeEditarEvento_;

// O cancelamento de chamado também é exclusivo da Secretaria (e do Admin GOM).
function gomPodeCancelarChamado_() {
  var p = gomPerfilGomAtual_();
  return p === 'SECRETARIA' || p === 'ADMIN_GOM';
}
window.gomPodeCancelarChamado_ = gomPodeCancelarChamado_;

// Renderiza o selo do evento associado ao chamado (retorna '' se não houver).
function gomRenderBadgeEvento_(idEvento) {
  var ev = (typeof window.gomEventoPorId === 'function') ? window.gomEventoPorId(idEvento) : null;
  if (!ev) return '';
  var cor = ev.cor || '#0284c7';
  var icone = ev.icone || 'bi-tag-fill';
  return '<span class="evento-marca" style="--evento-cor: ' + escapeHtml(cor) + ';" title="' + escapeHtml(ev.descricao || ev.nome) + '">'
    + '<i class="bi ' + escapeHtml(icone) + '"></i>' + escapeHtml(ev.nome) + '</span>';
}
window.gomRenderBadgeEvento_ = gomRenderBadgeEvento_;

// Preenche o seletor de evento do modal e o selo do cabeçalho a partir do chamado.
function gomPreencherSeletorEvento_(chamado) {
  var eventos = window.EVENTOS_ESPECIAIS || [];
  var atual = String((chamado && chamado.evento) || '').trim();
  var badge = document.getElementById('mdlEventoBadge');
  if (badge) badge.innerHTML = gomRenderBadgeEvento_(atual);
  var select = document.getElementById('mdlSelectEvento');
  var col = document.getElementById('mdlEventoCol');
  // Só a Secretaria (e o Admin GOM) pode definir o evento — os demais perfis
  // continuam vendo o selo, mas sem o seletor.
  if (col) col.style.display = (eventos.length && gomPodeEditarEvento_()) ? '' : 'none';
  if (!select) return;
  var opcoes = ['<option value="">— Sem evento —</option>'];
  for (var i = 0; i < eventos.length; i++) {
    var ev = eventos[i] || {};
    var sel = String(ev.id) === atual ? ' selected' : '';
    opcoes.push('<option value="' + escapeHtml(ev.id) + '"' + sel + '>' + escapeHtml(ev.nome || ev.id) + '</option>');
  }
  select.innerHTML = opcoes.join('');
  select.value = atual;
}
window.gomPreencherSeletorEvento_ = gomPreencherSeletorEvento_;

// ── Override de status do Administrador GOM ──────────────────────────────────
// O super admin pode forçar QUALQUER chamado para qualquer status, ignorando as
// regras de fluxo (forcarTransicao). Ex.: chamado marcado como "Concluído" sem OS
// emitida volta para "Em análise" para a equipe corrigir e gerar a OS.
var GOM_STATUS_OVERRIDE_ADMIN = [
  'Em análise', 'Aguardando visita', 'Visita agendada', 'Solicitado Orçamento',
  'Orçamento Realizado', 'OS emitida', 'Atendimento Emergencial', 'Garantia de Obra',
  'Garantia de Serviço', 'Serviço Realizado', 'Concluído', 'Devolvido para a escola',
  'A cargo da unidade escolar', 'Cancelado'
];

function gomEhAdminGom_() {
  var p = String((window.GomAuth && window.GomAuth.perfil) || (window.usuarioAtualGom && window.usuarioAtualGom.perfil) || '')
    .trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (p === 'ADMINISTRADOR_GOM') p = 'ADMIN_GOM';
  return p === 'ADMIN_GOM';
}

function gomConfigurarOverrideAdmin_(chamado) {
  var box = document.getElementById('mdlAdminForcarBox');
  var sel = document.getElementById('mdlAdminForcarStatus');
  var obs = document.getElementById('mdlAdminForcarObs');
  if (!box || !sel) return;
  if (!gomEhAdminGom_()) { box.style.display = 'none'; return; }
  var atual = normalizarSituacaoSistema(chamado.situacao || chamado.status);
  sel.innerHTML = GOM_STATUS_OVERRIDE_ADMIN.map(function (s) {
    var marca = (s === atual) ? ' selected' : '';
    return '<option value="' + escapeHtml(s) + '"' + marca + '>' + escapeHtml(s) + (s === atual ? ' (atual)' : '') + '</option>';
  }).join('');
  if (obs) obs.value = '';
  box.style.display = '';
}

function gomForcarStatusAdmin_(botao) {
  if (!gomEhAdminGom_()) return;
  var sel = document.getElementById('mdlAdminForcarStatus');
  var status = sel ? sel.value : '';
  if (!status) return;
  var chamado = (window.listaChamadosGlobal || []).find(function (x) { return String(x.id) === String(idChamadoAberto); }) || {};
  var atual = normalizarSituacaoSistema(chamado.situacao || chamado.status);
  if (normalizarSituacaoSistema(status) === atual) { alert('O chamado já está neste status.'); return; }
  var obsEl = document.getElementById('mdlAdminForcarObs');
  var obs = String((obsEl && obsEl.value) || '').trim();
  if (!obs) {
    alert('Informe o MOTIVO do ajuste antes de forçar o status. A justificativa é obrigatória e fica registrada na timeline do chamado.');
    if (obsEl) obsEl.focus();
    return;
  }
  if (!confirm('Forçar o status do chamado #' + idChamadoAberto + ' para "' + status + '"?\n\nIsso IGNORA as regras de fluxo.')) return;
  var payload = {
    id: idChamadoAberto,
    situacao: status,
    observacoes: '[AJUSTE ADMIN] ' + obs,
    forcarTransicao: true
  };
  var btn = botao;
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, 'Forçando...');
  else if (btn) btn.disabled = true;
  google.script.run
    .withSuccessHandler(function () {
      var modal = bootstrap.Modal.getInstance(document.getElementById('modalAnalise'));
      if (modal) modal.hide();
      refreshChamados(function () { if (typeof renderizarTela === 'function') renderizarTela(); });
    })
    .withFailureHandler(function (err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
      else if (btn) btn.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível forçar o status.');
      else alert((err && err.message) || err);
    })
    .atualizarChamadoWorkflow(payload);
}
window.gomForcarStatusAdmin_ = gomForcarStatusAdmin_;

async function salvarStatusDoModal(botao) {
  const select = document.getElementById('mdlSelectStatus');
  const chamado = (window.listaChamadosGlobal || []).find(x => String(x.id) === String(idChamadoAberto)) || {};
  const emAprovacao = isFluxoAprovacaoModal_(chamado);
  const btn = botao || document.getElementById('mdlBtnAtualizar');

  // Defense in depth: bloqueia alteração de status por perfil sem permissão no estágio atual
  // (ex.: Secretaria não altera status de chamado em atendimento pela Empresa).
  if (typeof window.gomPerfilPodeAlterarStatus === 'function' && !window.gomPerfilPodeAlterarStatus(chamado)) {
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(new Error('Sem permissão'), 'Seu perfil não pode alterar o status deste chamado neste estágio.');
    else alert('Seu perfil não pode alterar o status deste chamado neste estágio.');
    return;
  }
  const obs = document.getElementById('mdlNovaObservacao').value;
  const numeroOs = document.getElementById('mdlNumeroOs');
  const dataPrev = document.getElementById('mdlDataPrevistaConclusao');

  if (emAprovacao) {
    const decisao = select ? select.value : '';
    if (!decisao) {
      alert('Selecione uma decisão do orçamento.');
      return;
    }

    const payload = {
      id: idChamadoAberto,
      decisao: decisao,
      parecerInterno: obs,
      observacoes: obs
    };

    if (decisao === 'aprovar') {
      // Número da OS é gerado automaticamente na camada de dados.
      if (dataPrev && dataPrev.value) payload.dataPrevistaConclusao = gomModalDataParaISO_(dataPrev.value);
    }

    try {
      const anexosAtualizacao = await coletarAnexosModalAtualizacao_();
      if (anexosAtualizacao.length) payload.anexosAtualizacao = anexosAtualizacao;
    } catch (erroAnexo) {
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erroAnexo, 'Não foi possível preparar os anexos.');
      else alert((erroAnexo && erroAnexo.message) || erroAnexo);
      return;
    }

    if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, 'Registrando decisão...');
    else if (btn) btn.disabled = true;

    google.script.run
      .withSuccessHandler(function() {
        limparAnexosModalAtualizacao_();
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalAnalise'));
        if (modal) modal.hide();
        refreshChamados(function() {
          if (typeof renderizarTela === 'function') renderizarTela();
        });
      })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
        else if (btn) btn.disabled = false;
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível registrar a decisão.');
        else alert((err && err.message) || err);
      })
      .salvarDecisaoAprovacao(payload);
    return;
  }

  const status = select ? select.value : '';
  const chamadoAtual = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(idChamadoAberto); }) || {};
  const statusAtual = normalizarSituacaoSistema(chamadoAtual.situacao || chamadoAtual.status);
  const statusMudou = status && status !== statusAtual;

  // "Devolvido para a escola": o MOTIVO (observação) é obrigatório — ele vai por
  // e-mail à escola. Depois o chamado segue para o Memorial (status terminal).
  if (statusMudou && normalizarSituacaoSistema(status) === 'Devolvido para a escola' && !String(obs || '').trim()) {
    alert('Para devolver o chamado à escola, informe o MOTIVO da devolução no campo "Nova observação". Ele será enviado por e-mail à escola.');
    return;
  }

  // "Cancelado": o MOTIVO do cancelamento é obrigatório — fica registrado na
  // timeline do chamado. Depois o chamado segue para o Memorial (status terminal).
  if (statusMudou && normalizarSituacaoSistema(status) === 'Cancelado') {
    if (!gomPodeCancelarChamado_()) {
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(new Error('Sem permissão'), 'Somente a Secretaria pode cancelar chamados.');
      else alert('Somente a Secretaria pode cancelar chamados.');
      return;
    }
    if (!String(obs || '').trim()) {
      alert('Para cancelar o chamado, informe o MOTIVO do cancelamento no campo "Nova observação". A justificativa é obrigatória e fica registrada na timeline do chamado.');
      const inputObsCancel = document.getElementById('mdlNovaObservacao');
      if (inputObsCancel) inputObsCancel.focus();
      return;
    }
    if (!confirm('Cancelar o chamado #' + idChamadoAberto + '?\n\nO chamado será encerrado e enviado para o Memorial. Esta ação registra o motivo informado na timeline.')) return;
  }

  // Só inclui situacao no payload se realmente mudou — evita transição indesejada
  const payload = { id: idChamadoAberto, observacoes: obs };
  if (statusMudou) payload.situacao = status;
  // Valor da OS do Atendimento Emergencial: se o campo estiver visível (chamado
  // sem OS, ainda em Serviço Realizado) e preenchido, incorpora à OS gerada.
  const valorOsEmergencial = document.getElementById('mdlValorOsEmergencial');
  if (statusAtual === 'Serviço Realizado' && valorOsEmergencial && String(valorOsEmergencial.value || '').trim()) {
    payload.valorOrcamento = valorOsEmergencial.value.trim();
  }
  // Número de OS novo não é digitado manualmente. Para legado sem número, use o bloco específico de regularização.
  if (dataPrev && dataPrev.value) payload.dataPrevistaConclusao = gomModalDataParaISO_(dataPrev.value);

  // Data de agendamento de visita (campo exclusivo da fila)
  // Compara com o valor original para detectar mudança real
  const dataAgend = document.getElementById('mdlDataAgendamentoVisita');
  const valorAgendAtual = dataAgend ? gomModalDataParaISO_(dataAgend.value) : '';
  const valorAgendOriginal = gomModalDataParaISO_(chamadoAtual.dataAgendamentoVisitaRaw || chamadoAtual.dataAgendamentoVisita || '');
  const agendamentoMudou = !!(valorAgendAtual && valorAgendAtual !== valorAgendOriginal);
  if (agendamentoMudou) { payload.dataAgendamentoVisita = valorAgendAtual; payload.dataAgendamento = valorAgendAtual; payload.dataVisita = valorAgendAtual; }

  // Marcação de evento especial (ex.: tempestade) — só envia quando muda.
  const selEvento = document.getElementById('mdlSelectEvento');
  const eventoAtual = selEvento ? String(selEvento.value || '').trim() : '';
  const eventoOriginal = String(chamadoAtual.evento || '').trim();
  const eventoMudou = !!selEvento && gomPodeEditarEvento_() && eventoAtual !== eventoOriginal;
  if (eventoMudou) payload.evento = eventoAtual;

  let anexosAtualizacao = [];
  try {
    anexosAtualizacao = await coletarAnexosModalAtualizacao_();
    if (anexosAtualizacao.length) payload.anexosAtualizacao = anexosAtualizacao;
  } catch (erroAnexo) {
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erroAnexo, 'Não foi possível preparar os anexos.');
    else alert((erroAnexo && erroAnexo.message) || erroAnexo);
    return;
  }

  if (!obs && !statusMudou && !payload.numeroOs && !payload.dataPrevistaConclusao && !agendamentoMudou && !eventoMudou && !anexosAtualizacao.length) {
    alert('Preencha ao menos a observação, anexe um arquivo ou altere algum campo antes de atualizar.');
    return;
  }

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, 'Atualizando...');
  else if (btn) btn.disabled = true;

  google.script.run
    .withSuccessHandler(function() {
      limparAnexosModalAtualizacao_();
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalAnalise'));
      if (modal) modal.hide();
      const camposLocais = {};
      if (statusMudou) camposLocais.situacao = status;
      if (eventoMudou) camposLocais.evento = eventoAtual;
      if (obs) camposLocais.observacoes = (chamadoAtual.observacoes ? chamadoAtual.observacoes + '\n' : '') + obs;
      if (payload.dataAgendamentoVisita) { camposLocais.dataAgendamentoVisita = payload.dataAgendamentoVisita; camposLocais.dataAgendamentoVisitaRaw = payload.dataAgendamentoVisita; camposLocais.dataAgendamento = payload.dataAgendamentoVisita; camposLocais.dataVisita = payload.dataAgendamentoVisita; }
      refreshChamados(null, Object.keys(camposLocais).length ? { id: idChamadoAberto, campos: camposLocais } : null);
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
      else if (btn) btn.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível atualizar o chamado.');
      else alert((err && err.message) || err);
    })
    .atualizarChamadoWorkflow(payload);
}


/**
 * Salva observação sem alterar o status do chamado.
 * Também salva data de agendamento de visita se preenchida.
 */
async function salvarApenasObservacao(botao) {
  const obs = document.getElementById('mdlNovaObservacao') ? document.getElementById('mdlNovaObservacao').value.trim() : '';
  const dataAgend = document.getElementById('mdlDataAgendamentoVisita');
  const valorAgendObs = dataAgend ? gomModalDataParaISO_(dataAgend.value) : '';
  const chamadoAtual = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id) === String(idChamadoAberto); }) || {};
  const valorAgendOriginalObs = gomModalDataParaISO_(chamadoAtual.dataAgendamentoVisitaRaw || chamadoAtual.dataAgendamentoVisita || '');
  // Só considera mudança real se o valor é diferente do que já está salvo
  const agendamentoMudouObs = !!(valorAgendObs && valorAgendObs !== valorAgendOriginalObs);

  // Marcação de evento especial (ex.: tempestade) — só envia quando muda.
  const selEventoObs = document.getElementById('mdlSelectEvento');
  const eventoAtualObs = selEventoObs ? String(selEventoObs.value || '').trim() : '';
  const eventoOriginalObs = String(chamadoAtual.evento || '').trim();
  const eventoMudouObs = !!selEventoObs && gomPodeEditarEvento_() && eventoAtualObs !== eventoOriginalObs;

  let anexosAtualizacao = [];
  try {
    anexosAtualizacao = await coletarAnexosModalAtualizacao_();
  } catch (erroAnexo) {
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erroAnexo, 'Não foi possível preparar os anexos.');
    else alert((erroAnexo && erroAnexo.message) || erroAnexo);
    return;
  }

  if (!obs && !agendamentoMudouObs && !eventoMudouObs && !anexosAtualizacao.length) {
    alert('Preencha a observação, anexe um arquivo ou altere a data de agendamento da visita antes de salvar.');
    return;
  }

  const payload = { id: idChamadoAberto };
  if (obs) payload.observacoes = obs;
  if (agendamentoMudouObs) { payload.dataAgendamentoVisita = valorAgendObs; payload.dataAgendamento = valorAgendObs; payload.dataVisita = valorAgendObs; }
  if (eventoMudouObs) payload.evento = eventoAtualObs;
  if (anexosAtualizacao.length) payload.anexosAtualizacao = anexosAtualizacao;

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando...');
  else if (botao) botao.disabled = true;

  google.script.run
    .withSuccessHandler(function() {
      if (typeof gomResetButtonLoading === 'function') gomMostrarSucessoBotao ? gomMostrarSucessoBotao(botao, 'Salvo') : gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (document.getElementById('mdlNovaObservacao')) document.getElementById('mdlNovaObservacao').value = '';
      var tinhaAnexosNovos = anexosAtualizacao.length > 0;
      limparAnexosModalAtualizacao_();
      const camposLocais = {};
      if (obs) camposLocais.observacoes = (chamadoAtual.observacoes ? chamadoAtual.observacoes + '\n' : '') + obs;
      if (eventoMudouObs) camposLocais.evento = eventoAtualObs;
      if (agendamentoMudouObs) { camposLocais.dataAgendamentoVisita = valorAgendObs; camposLocais.dataAgendamentoVisitaRaw = valorAgendObs; camposLocais.dataAgendamento = valorAgendObs; camposLocais.dataVisita = valorAgendObs; }
      if (typeof gomAtualizarChamadoLocal === 'function') gomAtualizarChamadoLocal(idChamadoAberto, camposLocais);
      if (tinhaAnexosNovos) sinalizarAtualizacaoAnexosModal_();
      // Refresh em background sem fechar o modal e atualiza a área de anexos assim que o backend confirmar.
      if (typeof refreshChamados === 'function') {
        refreshChamados(function() { atualizarModalChamadoAbertoAposRefresh_(); }, null);
      }
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar a observação.');
      else alert((err && err.message) || err);
    })
    .atualizarChamadoWorkflow(payload);
}

window.salvarApenasObservacao = salvarApenasObservacao;
window.salvarNumeroOsLegadoChamado = salvarNumeroOsLegadoChamado;
window.abrirEdicaoObservacoesChamado = abrirEdicaoObservacoesChamado;
window.cancelarEdicaoObservacoesChamado = cancelarEdicaoObservacoesChamado;
window.salvarEdicaoObservacoesChamado = salvarEdicaoObservacoesChamado;
window.atualizarCamposModalAprovacao = atualizarCamposModalAprovacao;
window.salvarStatusDoModal = salvarStatusDoModal;

// Retorna um chamado da Empresa (orçamento/emergencial/garantias) para a
// Secretaria, na fila de agendamento de visita ("Aguardando visita"). Sem travas:
// não exige equipe, data nem observação — basta confirmar.
async function voltarChamadoParaSecretaria(id, botao) {
  id = id || (typeof idChamadoAberto !== 'undefined' ? idChamadoAberto : '');
  const c = (window.listaChamadosGlobal || []).find(function (x) { return String(x.id) === String(id); }) || {};
  if (!c.id) return;
  if (!confirm('Voltar este chamado para a Secretaria, na fila de agendamento de visita?\n\nUnidade: ' + (c.unidade || ('#' + c.id)))) return;
  const btn = botao || null;
  const payload = {
    id: c.id,
    situacao: 'Aguardando visita',
    observacoes: '[VOLTA À SECRETARIA] Chamado retornado para reagendamento de visita.',
    forcarTransicao: true
  };
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btn, 'Voltando...');
  else if (btn) btn.disabled = true;
  google.script.run
    .withSuccessHandler(function () {
      const modal = bootstrap.Modal.getInstance(document.getElementById('modalAnalise'));
      if (modal) modal.hide();
      refreshChamados(null, { id: c.id, campos: { situacao: 'Aguardando visita', status: 'Aguardando visita' } });
    })
    .withFailureHandler(function (err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btn);
      else if (btn) btn.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível voltar o chamado para a Secretaria.');
      else alert((err && err.message) || err);
    })
    .atualizarChamadoWorkflow(payload);
}
window.voltarChamadoParaSecretaria = voltarChamadoParaSecretaria;

window.recarregarTimelineModal = recarregarTimelineModal;
