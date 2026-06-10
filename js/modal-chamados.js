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
  var st = normalizarSituacaoSistema(chamado && (chamado.situacao || chamado.status));
  return window.telaAtual === 'aprovacao' || st === 'Orçamento Realizado';
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
    var precisaOs = decisao === 'aprovar';
    numeroOs.disabled = !precisaOs;
    numeroOs.required = precisaOs;
    numeroOs.placeholder = precisaOs ? 'Obrigatório ao aprovar' : 'Não se aplica nesta decisão';
    if (!precisaOs) numeroOs.value = '';
  }

  if (dataPrev) {
    var precisaPrevisao = decisao === 'aprovar';
    dataPrev.disabled = !precisaPrevisao;
  }
}

function limparAnexosModalAtualizacao_() {
  var input = document.getElementById('mdlAnexosAtualizacao');
  if (input) input.value = '';
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

function abrirModalAnalise(id) {
  const c = listaChamadosGlobal.find(x => String(x.id) === String(id));
  if (!c) return;
  idChamadoAberto = c.id;
  document.getElementById('mdlId').innerText = c.id;
  document.getElementById('mdlUnidade').innerText = c.unidade || '';
  document.getElementById('mdlSistema').innerText = c.sistema || '';
  document.getElementById('mdlData').innerText = c.dataHoraEncaminhamento || c.dataHoraEntradaFila || c.dataHora || c.data || '';
  document.getElementById('mdlDetalhe').innerText = c.detalhamento || 'Sem detalhe';
  document.getElementById('mdlObservacoes').innerText = c.observacoes || 'Sem observações';
  document.getElementById('mdlAnexosBox').innerHTML = renderAnexosDetalhesChamadoModal_(c);
  carregarTimelineChamadoModal_(c.id);
  preencherSelectStatusModal(c);
  const emAprovacaoModal = isFluxoAprovacaoModal_(c);
  setTextoModalFluxo_(emAprovacaoModal);
  const workflow = document.getElementById('mdlWorkflowBox');
  if (workflow) workflow.style.display = telaAtual === 'historico' ? 'none' : '';
  const inputObs = document.getElementById('mdlNovaObservacao');
  if (inputObs) inputObs.value = '';
  limparAnexosModalAtualizacao_();
  const numeroOs = document.getElementById('mdlNumeroOs');
  if (numeroOs) numeroOs.value = c.numeroOs || '';
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
  // Botão "Salvar observação" — sempre visível quando não é aprovação
  const btnObs = document.getElementById('mdlBtnSalvarObs');
  if (btnObs) btnObs.style.display = emAprovacaoModal ? 'none' : '';
  document.querySelectorAll('.modal-extra-aprovacao').forEach(el => { el.style.display = emAprovacaoModal ? '' : 'none'; });
  if (emAprovacaoModal) atualizarCamposModalAprovacao();
  new bootstrap.Modal(document.getElementById('modalAnalise')).show();
}

function getStatusPermitidosModal(chamado) {
  const st = normalizarSituacaoSistema(chamado.situacao || chamado.status);
  if (telaAtual === 'triagem' || st === 'Em análise') return ['Atendimento Emergencial', 'Solicitado Orçamento', 'Aguardando visita', 'Devolvido para a escola'];
  if (telaAtual === 'fila' || st === 'Aguardando visita') return ['Devolvido para a escola', 'Atendimento Emergencial', 'Solicitado Orçamento'];
  if (st === 'Serviço Realizado') return ['Concluído', 'Garantia de Obra', 'Devolvido para a escola'];
  return STATUS_TODOS;
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
  const opcoes = [atual].concat(getStatusPermitidosModal(chamado).filter(s => s !== atual));
  select.innerHTML = opcoes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  select.value = atual;
}

async function salvarStatusDoModal(botao) {
  const select = document.getElementById('mdlSelectStatus');
  const chamado = (window.listaChamadosGlobal || []).find(x => String(x.id) === String(idChamadoAberto)) || {};
  const emAprovacao = isFluxoAprovacaoModal_(chamado);
  const btn = botao || document.getElementById('mdlBtnAtualizar');
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
      payload.numeroOs = numeroOs ? String(numeroOs.value || '').trim() : '';
      if (!payload.numeroOs) {
        alert('Informe o número da OS para aprovar o orçamento.');
        if (numeroOs) numeroOs.focus();
        return;
      }
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

  // Só inclui situacao no payload se realmente mudou — evita transição indesejada
  const payload = { id: idChamadoAberto, observacoes: obs };
  if (statusMudou) payload.situacao = status;
  if (numeroOs && numeroOs.value) payload.numeroOs = numeroOs.value;
  if (dataPrev && dataPrev.value) payload.dataPrevistaConclusao = gomModalDataParaISO_(dataPrev.value);

  // Data de agendamento de visita (campo exclusivo da fila)
  // Compara com o valor original para detectar mudança real
  const dataAgend = document.getElementById('mdlDataAgendamentoVisita');
  const valorAgendAtual = dataAgend ? gomModalDataParaISO_(dataAgend.value) : '';
  const valorAgendOriginal = gomModalDataParaISO_(chamadoAtual.dataAgendamentoVisitaRaw || chamadoAtual.dataAgendamentoVisita || '');
  const agendamentoMudou = !!(valorAgendAtual && valorAgendAtual !== valorAgendOriginal);
  if (agendamentoMudou) { payload.dataAgendamentoVisita = valorAgendAtual; payload.dataAgendamento = valorAgendAtual; payload.dataVisita = valorAgendAtual; }

  let anexosAtualizacao = [];
  try {
    anexosAtualizacao = await coletarAnexosModalAtualizacao_();
    if (anexosAtualizacao.length) payload.anexosAtualizacao = anexosAtualizacao;
  } catch (erroAnexo) {
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erroAnexo, 'Não foi possível preparar os anexos.');
    else alert((erroAnexo && erroAnexo.message) || erroAnexo);
    return;
  }

  if (!obs && !statusMudou && !payload.numeroOs && !payload.dataPrevistaConclusao && !agendamentoMudou && !anexosAtualizacao.length) {
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

  let anexosAtualizacao = [];
  try {
    anexosAtualizacao = await coletarAnexosModalAtualizacao_();
  } catch (erroAnexo) {
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erroAnexo, 'Não foi possível preparar os anexos.');
    else alert((erroAnexo && erroAnexo.message) || erroAnexo);
    return;
  }

  if (!obs && !agendamentoMudouObs && !anexosAtualizacao.length) {
    alert('Preencha a observação, anexe um arquivo ou altere a data de agendamento da visita antes de salvar.');
    return;
  }

  const payload = { id: idChamadoAberto };
  if (obs) payload.observacoes = obs;
  if (agendamentoMudouObs) { payload.dataAgendamentoVisita = valorAgendObs; payload.dataAgendamento = valorAgendObs; payload.dataVisita = valorAgendObs; }
  if (anexosAtualizacao.length) payload.anexosAtualizacao = anexosAtualizacao;

  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando...');
  else if (botao) botao.disabled = true;

  google.script.run
    .withSuccessHandler(function() {
      if (typeof gomResetButtonLoading === 'function') gomMostrarSucessoBotao ? gomMostrarSucessoBotao(botao, 'Salvo') : gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (document.getElementById('mdlNovaObservacao')) document.getElementById('mdlNovaObservacao').value = '';
      limparAnexosModalAtualizacao_();
      const camposLocais = {};
      if (obs) camposLocais.observacoes = (chamadoAtual.observacoes ? chamadoAtual.observacoes + '\n' : '') + obs;
      if (agendamentoMudouObs) { camposLocais.dataAgendamentoVisita = valorAgendObs; camposLocais.dataAgendamentoVisitaRaw = valorAgendObs; camposLocais.dataAgendamento = valorAgendObs; camposLocais.dataVisita = valorAgendObs; }
      if (typeof gomAtualizarChamadoLocal === 'function') gomAtualizarChamadoLocal(idChamadoAberto, camposLocais);
      // Refresh em background sem fechar o modal
      if (typeof refreshChamados === 'function') refreshChamados(null, null);
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
window.atualizarCamposModalAprovacao = atualizarCamposModalAprovacao;
window.salvarStatusDoModal = salvarStatusDoModal;

window.recarregarTimelineModal = recarregarTimelineModal;
