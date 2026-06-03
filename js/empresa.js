window.empresaDiaAlterados = window.empresaDiaAlterados || {};

function totalEncaminhamentosDiaAlterados_() {
  return Object.keys(window.empresaDiaAlterados || {}).length;
}

function atualizarEstadoEncaminhamentosDiaEmpresa() {
  var total = totalEncaminhamentosDiaAlterados_();
  var bar = document.getElementById('empresaDiaSaveBar');
  var texto = document.getElementById('empresaDiaSaveBarText');
  var contador = document.getElementById('empresaDiaAlteracoesCount');

  if (contador) contador.textContent = String(total);
  if (bar) bar.style.display = total > 0 ? 'flex' : 'none';
  if (texto) {
    texto.textContent = total > 0
      ? total + ' encaminhamento(s) do dia aguardando salvamento.'
      : 'Nenhum encaminhamento pendente.';
  }
}

function setBotoesEncaminhamentoDiaEmpresa_(disabled) {
  document.querySelectorAll('#empresaDiaSaveBar button, .empresa-os-form-inline select, .empresa-os-observacao-wrap textarea').forEach(function(el) {
    if (disabled) {
      el.disabled = true;
      el.classList.add('gom-btn-disabled-context');
    } else {
      if (!el.classList.contains('gom-btn-loading')) el.disabled = false;
      el.classList.remove('gom-btn-disabled-context');
    }
  });
}

function marcarEncaminhamentoDiaEmpresaAlterado(id) {
  id = String(id || '').trim();
  if (!id) return;

  var form = document.getElementById('formEquipeDia_' + id.replace(/[^A-Za-z0-9_-]/g, '_')) || document.getElementById('formEquipeDia_' + id);
  if (!form) return;

  var payload = formToObject(form);
  payload.id = id;
  delete payload.numeroOs;



  // Enriquecer com unidade vinda do listaChamadosGlobal
  // (a unidade é texto renderizado no HTML, não um campo do form)
  var itemGlobal = (window.listaChamadosGlobal || []).find(function(c) {
    return String(c.id || '').trim() === id;
  });
  if (itemGlobal && itemGlobal.unidade) payload.unidade = itemGlobal.unidade;

  window.empresaDiaAlterados = window.empresaDiaAlterados || {};
  // Preserva a data de atendimento já aplicada pela data global do cabeçalho
  var dataAtendPrev = (window.empresaDiaAlterados[id] || {}).dataAtendimento;
  if (dataAtendPrev && !payload.dataAtendimento) payload.dataAtendimento = dataAtendPrev;
  window.empresaDiaAlterados[id] = payload;

  var row = form.closest ? form.closest('.empresa-os-list-row-v2') : null;
  if (row) row.classList.add('empresa-dia-alterado');

  atualizarEstadoEncaminhamentosDiaEmpresa();
}

function descartarEncaminhamentosDiaEmpresa(botao) {
  if (totalEncaminhamentosDiaAlterados_() > 0 && !confirm('Deseja descartar os encaminhamentos do dia que ainda não foram salvos?')) return;
  window.empresaDiaAlterados = {};
  if (typeof renderizarTela === 'function') renderizarTela();
}

// ─── Helpers de data para o modal de confirmação ─────────────────────────────

var DIAS_SEMANA_PT = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
var MESES_PT = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];

function formatarDataAgendamentoConfirmacao(valorDate) {
  if (!valorDate) return null;
  var partes = String(valorDate).split('-');
  if (partes.length !== 3) return null;
  var ano = parseInt(partes[0], 10);
  var mes = parseInt(partes[1], 10) - 1;
  var dia = parseInt(partes[2], 10);
  var d = new Date(ano, mes, dia);
  if (isNaN(d.getTime())) return null;
  return {
    diaSemana: DIAS_SEMANA_PT[d.getDay()],
    diaNum: dia,
    mesNome: MESES_PT[mes],
    ano: ano,
    texto: 'dia ' + dia + ' de ' + MESES_PT[mes] + ' de ' + ano + ' (' + DIAS_SEMANA_PT[d.getDay()] + ')'
  };
}

function _confirmarESalvarEncaminhamentos(botao, lista) {
  if (botao && typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando encaminhamentos...');
  setBotoesEncaminhamentoDiaEmpresa_(true);

  var listaPayload = lista.map(function(item) {
    var payload = Object.assign({}, item);
    payload.id = String(payload.id || '').trim();
    delete payload.numeroOs;
    if (payload.dataAgendamento) payload.dataAgendamentoVisita = payload.dataAgendamento;
    // Data de atendimento aplicada pela data global → vai para o registro do histórico
    if (payload.dataAtendimento) payload.dataAgendamentoVisita = payload.dataAtendimento;
    return payload;
  });

  var indice = 0;
  function salvarProximo() {
    if (indice >= listaPayload.length) {
      window.empresaDiaAlterados = {};
      setBotoesEncaminhamentoDiaEmpresa_(false);
      if (botao && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Salvo');
      else if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      refreshChamados(function() {
        if (window.telaAtual === 'empresa' && typeof renderizarTela === 'function') renderizarTela();
        if (window.telaAtual === 'campo' && typeof refreshCampo === 'function') refreshCampo();
      });
      return;
    }
    google.script.run
      .withSuccessHandler(function() { indice++; salvarProximo(); })
      .withFailureHandler(function(err) {
        setBotoesEncaminhamentoDiaEmpresa_(false);
        if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar os encaminhamentos do dia.');
        else alert((err && err.message) || err);
      })
      .salvarEquipeDiaEmpresa(listaPayload[indice]);
  }
  salvarProximo();
}

function salvarEncaminhamentosDiaEmpresa(botao) {
  var lista = Object.keys(window.empresaDiaAlterados || {}).map(function(k) { return window.empresaDiaAlterados[k]; });

  if (!lista.length) {
    alert('Não há encaminhamentos do dia pendentes para salvar.');
    return;
  }

  var semEquipe = lista.filter(function(item) { return !String(item.equipe || '').trim(); });
  if (semEquipe.length) {
    alert('Selecione a equipe do dia em todos os encaminhamentos antes de salvar.');
    return;
  }

  // Enriquecer lista com dados do listaChamadosGlobal (unidade e outros campos
  // que podem não estar no buffer caso o item tenha sido marcado antes da correção)
  lista = lista.map(function(item) {
    var idStr = String(item.id || '').trim();
    var global = (window.listaChamadosGlobal || []).find(function(c) {
      return String(c.id || '').trim() === idStr;
    });
    if (global && global.unidade && !item.unidade) item.unidade = global.unidade;
    return item;
  });

  // Montar resumo para o modal de confirmação
  var linhasConfirmacao = lista.map(function(item) {
    var unidade = escapeHtml(String(item.unidade || 'Unidade não informada'));
    var equipe  = escapeHtml(String(item.equipe  || '—'));
    var agend   = formatarDataAgendamentoConfirmacao(item.dataAgendamento);
    var dataStr = agend
      ? '<strong>' + agend.texto + '</strong>'
      : '<span class="text-muted">sem agendamento</span>';
    return '<li class="mb-2">'
      + '<span class="fw-bold">' + unidade + '</span><br>'
      + '<span class="text-muted small">Equipe: </span><strong>' + equipe + '</strong>'
      + ' &nbsp;|&nbsp; <span class="text-muted small">Data: </span>' + dataStr
      + '</li>';
  });

  // Verificar se há agendamentos com data preenchida para destacar no alerta
  var comAgendamento = lista.filter(function(i) { return !!i.dataAgendamento; });

  var msgAgendamento = '';
  if (comAgendamento.length === 1) {
    var agend = formatarDataAgendamentoConfirmacao(comAgendamento[0].dataAgendamento);
    if (agend) {
      msgAgendamento = '<div class="alert alert-info mt-3 mb-0 py-2 px-3 small">'
        + '<i class="bi bi-calendar-check-fill me-1"></i>'
        + 'Agendamento: <strong>' + agend.texto + '</strong> &nbsp;|&nbsp; '
        + 'Equipe: <strong>' + escapeHtml(String(comAgendamento[0].equipe || '—')) + '</strong>'
        + '</div>';
    }
  } else if (comAgendamento.length > 1) {
    msgAgendamento = '<div class="alert alert-info mt-3 mb-0 py-2 px-3 small">'
      + '<i class="bi bi-calendar-check-fill me-1"></i>'
      + comAgendamento.length + ' encaminhamento(s) com data de agendamento definida.'
      + '</div>';
  }

  // Exibir modal de confirmação (Bootstrap)
  var modalId = 'modalConfirmacaoAgendamento';
  var modalExistente = document.getElementById(modalId);
  if (modalExistente) modalExistente.remove();

  var modalHtml = '<div class="modal fade" id="' + modalId + '" tabindex="-1" aria-hidden="true">'
    + '<div class="modal-dialog modal-dialog-centered">'
    + '<div class="modal-content">'
    + '<div class="modal-header bg-primary text-white">'
    +   '<h5 class="modal-title fw-bold"><i class="bi bi-check2-circle me-2"></i>Confirmar encaminhamentos do dia</h5>'
    +   '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>'
    + '</div>'
    + '<div class="modal-body">'
    +   '<p class="mb-2">Você está prestes a salvar <strong>' + lista.length + ' encaminhamento(s)</strong>:</p>'
    +   '<ul class="list-unstyled ps-2">' + linhasConfirmacao.join('') + '</ul>'
    +   msgAgendamento
    + '</div>'
    + '<div class="modal-footer">'
    +   '<button type="button" class="btn btn-light border fw-bold" data-bs-dismiss="modal">'
    +     '<i class="bi bi-x-circle me-1"></i>Cancelar'
    +   '</button>'
    +   '<button type="button" class="btn btn-primary fw-bold" id="btnConfirmarAgendamento">'
    +     '<i class="bi bi-check2-circle me-1"></i>Confirmar e salvar'
    +   '</button>'
    + '</div>'
    + '</div></div></div>';

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  var modal = new bootstrap.Modal(document.getElementById(modalId));

  document.getElementById('btnConfirmarAgendamento').addEventListener('click', function() {
    modal.hide();
    _confirmarESalvarEncaminhamentos(botao, lista);
  });

  document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
    document.getElementById(modalId).remove();
  });

  modal.show();
}


function setEmpresaModo(modo, botao) {
  modo = modo || 'diario';
  if ((window.empresaModoAtual || 'diario') === 'diario' && modo !== 'diario' && totalEncaminhamentosDiaAlterados_ && totalEncaminhamentosDiaAlterados_() > 0) {
    if (!confirm('Existem encaminhamentos do dia não salvos. Deseja sair da execução diária e descartar essas alterações?')) return;
    window.empresaDiaAlterados = {};
  }
  window.empresaModoAtual = modo;
  if (typeof empresaModoAtual !== 'undefined') empresaModoAtual = window.empresaModoAtual;

  // Ao trocar de aba dentro da Empresa, limpamos filtros que poderiam esconder dados.
  window.statusFiltroClicado = null;
  if (typeof statusFiltroClicado !== 'undefined') statusFiltroClicado = null;

  const buscaGeral = document.getElementById('pesquisa');
  if (buscaGeral) buscaGeral.value = '';

  if (window.empresaModoAtual !== 'gerencial') {
    window.empresaGerencialBusca = '';
    window.empresaGerencialStatus = 'Todos';
    window.empresaGerencialPrazo = 'Todos';
  }

  var tabs = document.querySelectorAll('#empresaModoTabs .nav-link');
  Array.prototype.forEach.call(tabs, function(b) { b.classList.remove('active'); });
  if (botao) botao.classList.add('active');

  if (window.empresaModoAtual === 'gerencial') carregarHistoricoCampoEmpresaSePreciso();
  gomEmpresaAtualizarVisibilidadeData_();
  renderizarTela();
}

// Mostra o campo de data global só na Execução diária (e Orçamentos, opcional).
// Atualiza o rótulo conforme o modo.
function gomEmpresaAtualizarVisibilidadeData_() {
  var wrap = document.getElementById('gomDataGlobalWrap_empresa');
  var label = document.getElementById('gomDataGlobalLabel_empresa');
  if (!wrap) return;
  var modo = window.empresaModoAtual || 'diario';
  if (modo === 'diario') {
    wrap.style.display = '';
    if (label) label.textContent = 'Data de atendimento para todos:';
  } else {
    wrap.style.display = 'none';
  }
}
window.gomEmpresaAtualizarVisibilidadeData_ = gomEmpresaAtualizarVisibilidadeData_;

// Aplica a data escolhida em todos os campos de agendamento da lista visível.
// Como o agendamento individual foi removido, esta é a forma de definir a data
// de atendimento — ela entra no buffer e vai junto ao salvar os encaminhamentos.
function gomEmpresaAplicarDataGlobal() {
  var input = document.getElementById('gomEmpresaDataGlobal');
  if (!input || !input.value) { alert('Selecione uma data antes de aplicar.'); return; }
  var dataEscolhida = input.value;

  // Marca a data no buffer de cada chamado que já tem equipe selecionada/alterada
  var ids = Object.keys(window.empresaDiaAlterados || {});
  if (!ids.length) {
    alert('A data será salva com os encaminhamentos.\n\nSelecione a equipe de um ou mais chamados primeiro; ao salvar, esta data de atendimento vai junto.');
    return;
  }
  ids.forEach(function(id) {
    window.empresaDiaAlterados[id] = window.empresaDiaAlterados[id] || {};
    window.empresaDiaAlterados[id].dataAtendimento = dataEscolhida;
  });
  var btn = document.querySelector('#gomDataGlobalWrap_empresa button');
  if (btn && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(btn, 'Aplicada a ' + ids.length, 1500);
}
window.gomEmpresaAplicarDataGlobal = gomEmpresaAplicarDataGlobal;

// Pré-preenche o campo com a data de hoje ao entrar na Empresa.
function gomEmpresaPrePreencherDataHoje_() {
  var input = document.getElementById('gomEmpresaDataGlobal');
  if (input && !input.value) {
    var h = new Date();
    input.value = h.getFullYear() + '-' + String(h.getMonth()+1).padStart(2,'0') + '-' + String(h.getDate()).padStart(2,'0');
  }
}
window.gomEmpresaPrePreencherDataHoje_ = gomEmpresaPrePreencherDataHoje_;

function renderEmpresaView(listaRender) {
  var modo = window.empresaModoAtual || 'diario';
  setTimeout(function() { gomEmpresaAtualizarVisibilidadeData_(); gomEmpresaPrePreencherDataHoje_(); }, 0);
  var listaBase = listaRender || [];

  if (modo === 'equipes') return renderGestaoEquipes();

  if (modo === 'orcamentos') {
    var listaOrc = listaBase.filter(function(i) {
      return normalizarSituacaoSistema(i.situacao || i.status) === 'Solicitado Orçamento';
    });
    if (!listaOrc.length) {
      return '<div class="empty-state"><h5>Nenhum orçamento solicitado.</h5><p>Quando a triagem solicitar orçamento, ele aparecerá aqui para a empresa responder.</p></div>';
    }
    return renderListaOrcamentoEmpresa(listaOrc);
  }

  if (modo === 'gerencial') {
    var statusGerencial = window.STATUS_EMPRESA_GERENCIAL || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Serviço Realizado'];
    var listaGer = listaBase.filter(function(i) {
      return statusGerencial.indexOf(normalizarSituacaoSistema(i.situacao || i.status)) !== -1;
    });
    return renderGerencialOsEmpresa(listaGer);
  }

  var statusDiario = window.STATUS_EMPRESA_DIARIO || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
  var listaDia = listaBase.filter(function(i) {
    return statusDiario.indexOf(normalizarSituacaoSistema(i.situacao || i.status)) !== -1;
  });
  if (!listaDia.length) {
    return '<div class="empty-state"><h5>Nenhuma OS ou emergência para execução diária.</h5><p>A execução diária deve ser preenchida somente quando houver OS, emergência ou garantia ativa para atendimento.</p></div>';
  }
  return renderListaExecucaoDiaria(listaDia);
}

function carregarHistoricoCampoEmpresaSePreciso(opcoes) {
  opcoes = opcoes || {};
  var dados = window.dadosCampoGlobal || { historico: [] };
  if (!opcoes.forcar && (window.empresaHistoricoCarregando || (Array.isArray(dados.historico) && dados.historico.length > 0))) return;
  if (!google || !google.script || !google.script.run || typeof google.script.run.gomListarCampoWebV3Json !== 'function') return;

  window.empresaHistoricoCarregando = true;
  google.script.run
    .withSuccessHandler(function(res) {
      window.empresaHistoricoCarregando = false;
      try {
        var payload = typeof res === 'string' ? JSON.parse(res) : res;
        window.dadosCampoGlobal = payload && payload.dados ? payload.dados : { chamados: [], historico: [], kpis: {} };
      } catch (e) {
        console.warn('[GOM] Não foi possível carregar histórico de campo para a empresa:', e);
      }
      if (window.telaAtual === 'empresa' && (window.empresaModoAtual || 'diario') === 'gerencial') renderizarTela();
    })
    .withFailureHandler(function(err) {
      window.empresaHistoricoCarregando = false;
      console.warn('[GOM] Falha ao carregar histórico de campo para a empresa:', err);
    })
    .gomListarCampoWebV3Json();
}

function renderGestaoEquipes() {
  setTimeout(renderizarListaEquipes, 0);
  return [
    '<div class="row align-items-start mt-2">',
      '<div class="col-md-5">',
        '<div class="bg-white p-4 rounded shadow-sm border-top border-4 border-info">',
          '<h5 class="fw-bold text-dark mb-3"><i class="bi bi-person-plus-fill text-info me-2"></i>Cadastrar Equipe</h5>',
          '<form onsubmit="salvarEquipeForm(event)">',
            '<div class="mb-3"><label class="form-label text-muted small fw-bold">NOME DA EQUIPE OU TÉCNICO</label><input type="text" id="nomeNovaEquipe" class="form-control form-control-lg bg-light" placeholder="Ex: Equipe Alfa" required></div>',
            '<button type="submit" class="btn btn-info text-white w-100 fw-bold shadow-sm">ADICIONAR EQUIPE</button>',
          '</form>',
        '</div>',
      '</div>',
      '<div class="col-md-7">',
        '<div class="bg-white p-4 rounded shadow-sm h-100 border-top border-4 border-secondary">',
          '<h5 class="fw-bold text-dark mb-3"><i class="bi bi-card-checklist text-secondary me-2"></i>Equipes Disponíveis</h5>',
          '<div id="listaEquipesCadastradasHtml" class="d-flex flex-wrap gap-2"></div>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');
}

function renderCardOrcamentoEmpresa(item) {
  var id = escapeHtml(item.id);
  var idJs = escapeJsAttr(item.id);
  var unidade = escapeHtml(item.unidade || 'Unidade não informada');
  var detalhe = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  var obs = escapeHtml(item.observacoes || '');
  var valor = escapeHtml(item.valorOrcamento || '');
  var dataPrevInput = escapeHtml(formatarInputDateEmpresa(item.dataPrevistaConclusao || item.dataPrevistaConclusaoRaw));
  var miniaturasAnexos = typeof renderMiniaturasAnexosChamado === 'function' ? renderMiniaturasAnexosChamado(item, 4) : '';
  return [
    '<div class="empresa-card st-orcamento" style="--card-accent: var(--orcamento);">',
      '<div class="empresa-card-head"><span class="badge-status">Solicitado Orçamento</span><span class="card-id">#' + id + '</span></div>',
      '<h5 class="empresa-unidade" onclick="abrirModalAnalise(\'' + idJs + '\')">' + unidade + '</h5>',
      '<div class="card-detail">' + detalhe + '</div>',
      miniaturasAnexos,
      '<form onsubmit="enviarOrcamentoEmpresa(event,\'' + idJs + '\')" class="row g-2 mt-2 align-items-end">',
        '<div class="col-md-4"><label class="form-label small fw-bold">Valor do orçamento</label><input class="form-control form-control-sm" name="valorOrcamento" value="' + valor + '" placeholder="R$ 0,00" required></div>',
        '<div class="col-md-4"><label class="form-label small fw-bold">Previsão de conclusão</label><input class="form-control form-control-sm" type="date" name="dataPrevistaConclusao" value="' + dataPrevInput + '"></div>',
        '<div class="col-md-4"><label class="form-label small fw-bold"><i class="bi bi-paperclip me-1"></i>Anexos do orçamento</label><input class="form-control form-control-sm" type="file" name="anexosOrcamento" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></div>',
        '<div class="col-12"><label class="form-label small fw-bold">Observações da empresa <span class="text-muted fw-normal">(opcional)</span></label><textarea class="form-control form-control-sm" name="observacoes" rows="2">' + obs + '</textarea></div>',
        '<div class="col-12"><button class="btn btn-primary btn-sm fw-bold mt-2"><i class="bi bi-send-check me-1"></i> Devolver orçamento para aprovação</button></div>',
      '</form>',
    '</div>'
  ].join('');
}

function renderListaOrcamentoEmpresa(lista) {
  return [
    '<div class="empresa-lista-os empresa-lista-compacta empresa-lista-dia-v2 empresa-lista-orcamento-v2">',
      '<div class="empresa-lista-head empresa-lista-head-v2 empresa-lista-head-orcamento">',
        '<div>Unidade / descrição</div>',
        '<div>Valor e previsão</div>',
        '<div>Anexos do orçamento</div>',
        '<div>Observações (opcional)</div>',
      '</div>',
      (lista || []).map(renderLinhaOrcamentoEmpresa).join(''),
    '</div>'
  ].join('');
}

function renderLinhaOrcamentoEmpresa(item) {
  var id = escapeHtml(item.id);
  var idJs = escapeJsAttr(item.id);
  var unidade = escapeHtml(item.unidade || 'Unidade não informada');
  var detalheCompleto = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  var detalheCurto = escapeHtml(resumirTextoEmpresa(item.detalhamento || 'Sem detalhamento informado.', 135));
  var obs = escapeHtml(item.observacoes || '');
  var valor = escapeHtml(item.valorOrcamento || '');
  var dataPrevInput = escapeHtml(formatarInputDateEmpresa(item.dataPrevistaConclusao || item.dataPrevistaConclusaoRaw));
  var cor = getCorStatus('Solicitado Orçamento');
  var miniaturasAnexos = typeof renderMiniaturasAnexosChamado === 'function' ? renderMiniaturasAnexosChamado(item, 3) : '';
  var formId = 'formOrcamento_' + String(item.id || '').replace(/[^A-Za-z0-9_-]/g, '_');

  return [
    '<div class="empresa-os-list-row empresa-os-list-row-v2 st-orcamento" style="--card-accent:' + cor + ';">',
      '<div class="empresa-os-unidade" data-label="Unidade / descrição">',
        '<details class="empresa-expand">',
          '<summary><span class="empresa-unidade-link">' + unidade + '</span><span class="empresa-os-id">#' + id + '</span></summary>',
          '<div class="empresa-expand-body">',
            '<div class="modal-label">Descrição completa</div>',
            '<div class="card-detail mb-2">' + detalheCompleto + '</div>',
            '<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="abrirModalAnalise(\'' + idJs + '\')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir detalhes completos</button>',
          '</div>',
        '</details>',
        '<div class="empresa-os-desc">' + detalheCurto + '</div>',
        miniaturasAnexos,
      '</div>',
      '<div class="empresa-os-info" data-label="Valor e previsão">',
        '<label class="empresa-field-label"><i class="bi bi-cash-coin me-1"></i>Valor do orçamento</label>',
        '<input class="form-control form-control-sm fw-bold" name="valorOrcamento" form="' + formId + '" value="' + valor + '" placeholder="R$ 0,00" required>',
        '<label class="empresa-field-label mt-2"><i class="bi bi-calendar-check me-1"></i>Previsão de conclusão</label>',
        '<input class="form-control form-control-sm" type="date" name="dataPrevistaConclusao" form="' + formId + '" value="' + dataPrevInput + '">',
      '</div>',
      '<div class="empresa-os-agendamento-wrap" data-label="Anexos do orçamento">',
        '<label class="empresa-field-label"><i class="bi bi-paperclip me-1"></i>Anexos do orçamento</label>',
        '<input class="form-control form-control-sm" type="file" name="anexosOrcamento" form="' + formId + '" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">',
      '</div>',
      '<form id="' + formId + '" class="empresa-os-form-inline" data-label="Observações (opcional)" onsubmit="enviarOrcamentoEmpresa(event,\'' + idJs + '\')">',
        '<label class="empresa-field-label"><i class="bi bi-chat-left-text me-1"></i>Observações <span class="text-muted fw-normal">(opcional)</span></label>',
        '<textarea class="form-control form-control-sm" name="observacoes" rows="2" placeholder="Observações da empresa...">' + obs + '</textarea>',
        '<button type="submit" class="btn btn-primary btn-sm fw-bold mt-2"><i class="bi bi-send-check me-1"></i>Devolver orçamento</button>',
      '</form>',
    '</div>'
  ].join('');
}

function renderListaExecucaoDiaria(lista) {
  setTimeout(atualizarEstadoEncaminhamentosDiaEmpresa, 0);
  return [
    '<div class="empresa-lista-os empresa-lista-compacta empresa-lista-dia-v2 empresa-lista-dia-sem-acao">',
      '<div class="empresa-lista-head empresa-lista-head-v2">',
        '<div>Unidade / descrição</div>',
        '<div>Status, OS e encaminhamento</div>',
        '<div>Equipe do dia</div>',
        '<div>Observação do dia</div>',
      '</div>',
      (lista || []).map(renderLinhaExecucaoDiaria).join(''),
    '</div>',
    '<div class="empresa-dia-save-bar" id="empresaDiaSaveBar" style="display:none;">',
      '<div>',
        '<strong><i class="bi bi-pencil-square me-1"></i>Encaminhamentos do dia pendentes</strong>',
        '<span id="empresaDiaSaveBarText">Nenhum encaminhamento pendente.</span>',
      '</div>',
      '<div class="d-flex gap-2 flex-wrap justify-content-end">',
        '<button class="btn btn-light border fw-bold btn-sm" type="button" onclick="descartarEncaminhamentosDiaEmpresa(this)"><i class="bi bi-x-circle me-1"></i>Descartar</button>',
        '<button class="btn btn-primary fw-bold btn-sm" type="button" onclick="salvarEncaminhamentosDiaEmpresa(this)"><i class="bi bi-check2-circle me-1"></i>Salvar Encaminhamentos do dia</button>',
      '</div>',
    '</div>'
  ].join('');
}

function renderLinhaExecucaoDiaria(item) {
  var id = escapeHtml(item.id);
  var idRaw = String(item.id || '').trim();
  var idJs = escapeJsAttr(item.id);
  var st = normalizarSituacaoSistema(item.situacao || item.status);
  var unidade = escapeHtml(item.unidade || 'Unidade não informada');
  var detalheCompleto = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  var detalheCurto = escapeHtml(resumirTextoEmpresa(item.detalhamento || 'Sem detalhamento informado.', 135));
  var dataEnc = escapeHtml(item.dataHoraEncaminhamento || item.dataHoraUltimaAcao || item.dataHora || item.data || 'Sem data');
  var numeroOsBruto = String(item.numeroOs || '').trim();
  var numeroOs = escapeHtml(numeroOsBruto);
  var classe = getClasseStatus(st);
  var cor = getCorStatus(st);
  var formIdSeguro = String(item.id || '').replace(/[^A-Za-z0-9_-]/g, '_');
  var formId = 'formEquipeDia_' + formIdSeguro;
  var alterado = (window.empresaDiaAlterados || {})[idRaw] || {};
  var equipeAtual = Object.prototype.hasOwnProperty.call(alterado, 'equipe')
    ? String(alterado.equipe || '')
    : (item.temEquipeDiaValida ? String(item.equipe || '') : '');
  var observacaoAtual = Object.prototype.hasOwnProperty.call(alterado, 'observacoes')
    ? String(alterado.observacoes || '')
    : '';
  var rowAlterada = Object.prototype.hasOwnProperty.call(window.empresaDiaAlterados || {}, idRaw) ? ' empresa-dia-alterado' : '';
  var alertaOs = st === 'OS emitida' && !numeroOsBruto
    ? '<span class="empresa-os-alert"><i class="bi bi-exclamation-triangle-fill"></i> OS sem número</span>'
    : '';
  var miniaturasAnexos = typeof renderMiniaturasAnexosChamado === 'function' ? renderMiniaturasAnexosChamado(item, 3) : '';

  var opts = '<option value="">-- Selecionar equipe --</option>';
  (window.listaEquipesGlobal || []).forEach(function(e) {
    var nome = String(e && e.nome ? e.nome : e);
    var selected = equipeAtual === nome ? ' selected' : '';
    opts += '<option value="' + escapeHtml(nome) + '"' + selected + '>' + escapeHtml(nome) + '</option>';
  });

  return [
    '<div class="empresa-os-list-row empresa-os-list-row-v2 ' + classe + rowAlterada + '" style="--card-accent:' + cor + ';">',
      '<div class="empresa-os-unidade" data-label="Unidade / descrição">',
        '<details class="empresa-expand">',
          '<summary><span class="empresa-unidade-link">' + unidade + '</span><span class="empresa-os-id">#' + id + '</span></summary>',
          '<div class="empresa-expand-body">',
            '<div class="modal-label">Descrição completa</div>',
            '<div class="card-detail mb-2">' + detalheCompleto + '</div>',
            '<button type="button" class="btn btn-light btn-sm border fw-bold" onclick="abrirModalAnalise(\'' + idJs + '\')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir detalhes completos</button>',
          '</div>',
        '</details>',
        '<div class="empresa-os-desc">' + detalheCurto + '</div>',
        miniaturasAnexos,
      '</div>',
      '<div class="empresa-os-info" data-label="Status, OS e encaminhamento">',
        '<div class="empresa-os-status"><span class="badge-status">' + escapeHtml(st) + '</span>' + alertaOs + '</div>',
        '<div class="empresa-os-meta-line"><i class="bi bi-hash"></i><strong>OS:</strong> ' + (numeroOs || 'sem número') + '</div>',
        '<div class="empresa-os-meta-line"><i class="bi bi-calendar3"></i><strong>Encaminhamento:</strong> ' + dataEnc + '</div>',
      '</div>',
      '<form id="' + formId + '" class="empresa-os-form-inline" data-label="Equipe do dia" onsubmit="event.preventDefault(); marcarEncaminhamentoDiaEmpresaAlterado(\'' + idJs + '\')">',
        '<label class="empresa-field-label">Equipe do dia</label>',
        '<select class="form-select form-select-sm fw-bold" name="equipe" required onchange="marcarEncaminhamentoDiaEmpresaAlterado(\'' + idJs + '\')">' + opts + '</select>',
      '</form>',
      '<div class="empresa-os-observacao-wrap" data-label="Observação do dia">',
        '<label class="empresa-field-label">Observação do dia</label>',
        '<textarea class="form-control form-control-sm empresa-os-obs" form="' + formId + '" name="observacoes" rows="2" placeholder="Observação do dia" oninput="marcarEncaminhamentoDiaEmpresaAlterado(\'' + idJs + '\')">' + escapeHtml(observacaoAtual) + '</textarea>',
      '</div>',
    '</div>'
  ].join('');
}

function renderGerencialOsEmpresa(lista) {
  carregarHistoricoCampoEmpresaSePreciso();

  var statusGerencial = window.STATUS_EMPRESA_GERENCIAL || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Serviço Realizado'];
  var listaBase = Array.isArray(lista) ? lista.slice() : [];

  // Blindagem: se algum re-render chegar sem lista, remonta direto da lista global.
  if (!listaBase.length && Array.isArray(window.listaChamadosGlobal)) {
    listaBase = window.listaChamadosGlobal.filter(function(i) {
      return statusGerencial.indexOf(normalizarSituacaoSistema(i.situacao || i.status)) !== -1;
    });
  }

  var resumo = calcularResumoGerencialOsEmpresa(listaBase || []);
  var listaFiltrada = filtrarGerencialOsEmpresa(listaBase || []);
  var buscaAtual = valorCampoGerencial_(window.empresaGerencialBusca || '');

  return [
    '<div class="empresa-gerencial-wrap">',
      '<div class="empresa-gerencial-resumo">',
        '<div class="empresa-mini-kpi"><span>OS em acompanhamento</span><strong>' + escapeHtml(resumo.total) + '</strong><small>ordens, emergências e garantias</small></div>',
        resumo.vencidas > 0 ? '<div class="empresa-mini-kpi perigo"><span>Previsão vencida</span><strong>' + escapeHtml(resumo.vencidas) + '</strong><small>atendimentos fora do prazo</small></div>' : '',
        resumo.realizados > 0 ? '<div class="empresa-mini-kpi ok"><span>Serviço realizado</span><strong>' + escapeHtml(resumo.realizados) + '</strong><small>aguardando validação/finalização</small></div>' : '',
      '</div>',
      '<div class="empresa-gerencial-filtros-v7">',
        '<div class="input-group empresa-gerencial-busca"><span class="input-group-text bg-light border-end-0"><i class="bi bi-search"></i></span><input id="empresaGerencialBusca" type="text" class="form-control border-start-0" placeholder="Buscar unidade, OS, equipe ou descrição..." value="' + escapeHtml(buscaAtual) + '" oninput="setEmpresaGerencialBusca(this)"></div>',
        '<select class="form-select" id="empresaGerencialStatus" onchange="setEmpresaGerencialStatus(this)">' + montarOptionsGerencialEmpresa(['Todos','OS emitida','Atendimento Emergencial','Garantia de Obra','Serviço Realizado'], window.empresaGerencialStatus || 'Todos') + '</select>',
        '<select class="form-select" id="empresaGerencialPrazo" onchange="setEmpresaGerencialPrazo(this)">' + montarOptionsGerencialEmpresa(['Todos','Vencidas','Sem previsão','No prazo'], window.empresaGerencialPrazo || 'Todos') + '</select>',
        '<button type="button" class="btn btn-light border fw-bold" onclick="limparFiltrosGerencialEmpresa()"><i class="bi bi-x-circle me-1"></i>Limpar</button>',
      '</div>',
      '<div class="empresa-gerencial-tabela-v7">',
        '<div class="empresa-gerencial-lista">',
          '<div class="empresa-gerencial-head">',
            '<div>Unidade / OS</div>',
            '<div>Status e previsão</div>',
            '<div>Datas e prazo</div>',
            '<div>Equipe e histórico</div>',
            '<div>Ações</div>',
          '</div>',
          listaFiltrada.length ? listaFiltrada.map(renderLinhaGerencialOsEmpresa).join('') : '<div class="empty-state"><h5>Nenhuma OS encontrada para os filtros atuais.</h5></div>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');
}

function montarOptionsGerencialEmpresa(opcoes, atual) {
  var html = '';
  (opcoes || []).forEach(function(s) {
    html += '<option value="' + escapeHtml(s) + '"' + (String(atual) === String(s) ? ' selected' : '') + '>' + escapeHtml(s) + '</option>';
  });
  return html;
}

function renderLinhaGerencialOsEmpresa(item) {
  var id = escapeHtml(item.id);
  var idBruto = String(item.id || '');
  var idJs = escapeJsAttr(item.id);
  var st = normalizarSituacaoSistema(item.situacao || item.status);
  var unidade = escapeHtml(item.unidade || 'Unidade não informada');
  var detalhe = escapeHtml(resumirTextoEmpresa(item.detalhamento || 'Sem detalhamento informado.', 180));
  var detalheCompleto = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
  var numeroOs = escapeHtml(item.numeroOs || '');
  var osTexto = numeroOs || 'Sem número';
  var classe = getClasseStatus(st);
  var cor = getCorStatus(st);
  var dataSol = escapeHtml(item.dataHora || item.data || '-');
  var dataEnc = escapeHtml(item.dataHoraEncaminhamento || item.dataHoraUltimaAcao || '-');
  var dataPrev = escapeHtml(item.dataPrevistaConclusao || '-');
  var dataConc = escapeHtml(item.dataConclusaoOs || item.dataConclusao || '-');
  var dataPrevInput = escapeHtml(formatarInputDateEmpresa(item.dataPrevistaConclusao || item.dataPrevistaConclusaoRaw));
  var prazoInfo = getPrazoInfoGerencial(item);
  var historico = getHistoricoEquipeEmpresaPorId(item.id);
  var ultima = historico && historico.length ? historico[0] : null;
  var ultimaEquipe = escapeHtml(ultima && ultima.equipe ? ultima.equipe : (item.equipe || 'Sem equipe registrada'));
  var ultimaObs = escapeHtml(resumirTextoEmpresa((ultima && ultima.observacoes) || item.observacoes || 'Sem observações registradas.', 120));
  var dias = escapeHtml(calcularDiasGerencial(item.dataHoraEncaminhamento || item.dataHoraUltimaAcao || item.dataHora || item.data));
  var alertaOs = st === 'OS emitida' && !String(item.numeroOs || '').trim()
    ? '<div class="empresa-aviso mb-2"><i class="bi bi-info-circle-fill"></i> OS ainda sem numeração informada pela GOM.</div>'
    : '';
  var miniaturasAnexos = typeof renderMiniaturasAnexosChamado === 'function' ? renderMiniaturasAnexosChamado(item, 3) : '';
  var statusPrevId = 'empresaPrevStatus_' + idBruto.replace(/[^A-Za-z0-9_-]/g, '_');

  return [
    '<div class="empresa-gerencial-row ' + classe + '" style="--card-accent:' + cor + ';">',
      '<div class="empresa-gerencial-unidade" data-label="Unidade / OS">',
        '<details class="empresa-expand">',
          '<summary><span class="empresa-unidade-link">' + unidade + '</span><span class="empresa-os-id">#' + id + '</span></summary>',
          '<div class="empresa-expand-body"><div class="modal-label">Descrição completa</div><div class="card-detail">' + detalheCompleto + '</div>' + miniaturasAnexos + '</div>',
        '</details>',
        '<div class="empresa-os-desc">' + detalhe + '</div>',
      '</div>',
      '<div class="empresa-gerencial-status" data-label="Status e previsão">',
        '<span class="badge-status">' + escapeHtml(st) + '</span>',
        '<div class="empresa-os-meta-line"><i class="bi bi-hash"></i><strong>OS:</strong> ' + escapeHtml(osTexto) + '</div>',
        alertaOs,
        '<div class="empresa-gerencial-form empresa-previsao-auto">',
          '<label>Previsão</label>',
          '<input class="form-control form-control-sm" type="date" name="dataPrevistaConclusao" value="' + dataPrevInput + '" data-original="' + dataPrevInput + '" onchange="salvarPrevisaoGerencialOsFront(this,\'' + idJs + '\')" onblur="salvarPrevisaoGerencialOsFront(this,\'' + idJs + '\')">',
          '<small id="' + statusPrevId + '" class="empresa-autosave-msg">Salva automaticamente ao alterar.</small>',
        '</div>',
      '</div>',
      '<div class="empresa-gerencial-datas" data-label="Datas e prazo">',
        '<div><strong>Solicitação:</strong> ' + dataSol + '</div>',
        '<div><strong>Encaminhamento:</strong> ' + dataEnc + '</div>',
        '<div><strong>Previsão:</strong> ' + dataPrev + '</div>',
        '<div><strong>Conclusão:</strong> ' + dataConc + '</div>',
        '<span class="empresa-prazo-pill ' + prazoInfo.classe + '">' + prazoInfo.texto + '</span>',
        '<small>' + dias + ' em acompanhamento</small>',
      '</div>',
      '<div class="empresa-gerencial-historico" data-label="Equipe e histórico">',
        '<div class="empresa-hist-atual"><strong>Equipe atual:</strong> ' + ultimaEquipe + '</div>',
        '<div class="empresa-hist-obs">' + ultimaObs + '</div>',
        renderHistoricoEquipeEmpresaResumo(historico),
      '</div>',
      '<div class="empresa-gerencial-acoes" data-label="Ações">',
        '<button type="button" class="btn btn-light border btn-sm fw-bold" onclick="abrirModalAnalise(\'' + idJs + '\')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir chamado</button>',
        '<form onsubmit="finalizarOsEmpresaFront(event,\'' + idJs + '\')" class="empresa-finaliza-form">',
          '<textarea class="form-control form-control-sm" name="observacoes" rows="2" placeholder="Observação de finalização"></textarea>',
          '<input class="form-control form-control-sm" type="file" name="anexosServico" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx">',
          '<button class="btn btn-success btn-sm fw-bold"><i class="bi bi-check2-circle me-1"></i>Finalizar OS</button>',
        '</form>',
      '</div>',
    '</div>'
  ].join('');
}

function calcularResumoGerencialOsEmpresa(lista) {
  var hoje = new Date();
  var semNumero = 0;
  var vencidas = 0;
  var realizados = 0;
  (lista || []).forEach(function(item) {
    var st = normalizarSituacaoSistema(item.situacao || item.status);
    if (st === 'OS emitida' && !String(item.numeroOs || '').trim()) semNumero++;
    if (st === 'Serviço Realizado') realizados++;
    var p = parseDataEmpresa(item.dataPrevistaConclusao || item.dataPrevistaConclusaoRaw);
    if (p && p.getTime() < inicioDiaEmpresa(hoje).getTime() && st !== 'Serviço Realizado') vencidas++;
  });
  return { total: (lista || []).length, semNumero: semNumero, vencidas: vencidas, realizados: realizados };
}

function filtrarGerencialOsEmpresa(lista) {
  var busca = normalizarTextoBase(valorCampoGerencial_(window.empresaGerencialBusca || ''));
  var filtroStatus = window.empresaGerencialStatus || 'Todos';
  var filtroPrazo = window.empresaGerencialPrazo || 'Todos';

  return (lista || []).filter(function(item) {
    var st = normalizarSituacaoSistema(item.situacao || item.status);
    if (filtroStatus !== 'Todos' && st !== filtroStatus) return false;

    var prazoInfo = getPrazoInfoGerencial(item);
    if (filtroPrazo === 'Vencidas' && prazoInfo.tipo !== 'vencida') return false;
    if (filtroPrazo === 'Sem previsão' && prazoInfo.tipo !== 'sem-previsao') return false;
    if (filtroPrazo === 'No prazo' && prazoInfo.tipo !== 'no-prazo') return false;

    if (!busca) return true;
    var historico = getHistoricoEquipeEmpresaPorId(item.id);
    var textoHistorico = historico.map(function(h) { return [h.equipe, h.observacoes, h.dataAtendimento, h.tipoRegistro].join(' '); }).join(' ');
    var texto = normalizarTextoBase([item.id, item.unidade, item.detalhamento, item.numeroOs, item.equipe, item.observacoes, st, textoHistorico].join(' '));
    return texto.indexOf(busca) !== -1;
  });
}

function valorCampoGerencial_(valor) {
  if (valor && typeof valor === 'object' && typeof valor.value !== 'undefined') return String(valor.value || '');
  if (valor && typeof valor === 'object') return '';
  return String(valor || '');
}

function setEmpresaGerencialBusca(valor) {
  window.empresaGerencialBusca = valorCampoGerencial_(valor);
  renderizarTela();
}
function setEmpresaGerencialStatus(valor) {
  window.empresaGerencialStatus = valorCampoGerencial_(valor) || 'Todos';
  renderizarTela();
}
function setEmpresaGerencialPrazo(valor) {
  window.empresaGerencialPrazo = valorCampoGerencial_(valor) || 'Todos';
  renderizarTela();
}
function limparFiltrosGerencialEmpresa() {
  window.empresaGerencialBusca = '';
  window.empresaGerencialStatus = 'Todos';
  window.empresaGerencialPrazo = 'Todos';
  renderizarTela();
}

function getHistoricoEquipeEmpresaPorId(id) {
  var dados = window.dadosCampoGlobal || { historico: [] };
  return (Array.isArray(dados.historico) ? dados.historico : [])
    .filter(function(h) { return String(h.id) === String(id); })
    .sort(function(a, b) { return Number(b.dataHoraRegistroRaw || 0) - Number(a.dataHoraRegistroRaw || 0); });
}

function renderHistoricoEquipeEmpresaResumo(historico) {
  if (!historico || historico.length === 0) {
    var msg = window.empresaHistoricoCarregando ? 'Carregando histórico de equipes...' : 'Sem histórico diário registrado ainda.';
    return '<div class="empresa-hist-lista vazia">' + escapeHtml(msg) + '</div>';
  }
  var html = '<div class="empresa-hist-lista">';
  historico.slice(0, 4).forEach(function(h) {
    html += '<div class="empresa-hist-item"><span>' + escapeHtml(h.dataAtendimento || h.dataHoraRegistro || '-') + '</span><strong>' + escapeHtml(h.equipe || 'Sem equipe') + '</strong><small>' + escapeHtml(resumirTextoEmpresa(h.observacoes || h.tipoRegistro || '', 70)) + '</small></div>';
  });
  if (historico.length > 4) html += '<div class="empresa-hist-more">+' + (historico.length - 4) + ' registro(s) anteriores</div>';
  html += '</div>';
  return html;
}

function getPrazoInfoGerencial(item) {
  var st = normalizarSituacaoSistema(item.situacao || item.status);
  if (st === 'Serviço Realizado') return { tipo: 'realizado', classe: 'ok', texto: 'Serviço realizado' };
  var data = parseDataEmpresa(item.dataPrevistaConclusao || item.dataPrevistaConclusaoRaw);
  if (!data) return { tipo: 'sem-previsao', classe: 'neutro', texto: 'Sem previsão' };
  var hoje = inicioDiaEmpresa(new Date());
  var d = inicioDiaEmpresa(data);
  if (d.getTime() < hoje.getTime()) return { tipo: 'vencida', classe: 'vencida', texto: 'Previsão vencida' };
  if (d.getTime() === hoje.getTime()) return { tipo: 'hoje', classe: 'alerta', texto: 'Vence hoje' };
  return { tipo: 'no-prazo', classe: 'ok', texto: 'No prazo' };
}

function parseDataEmpresa(valor) {
  if (!valor) return null;
  if (valor instanceof Date) return valor;
  if (typeof valor === 'number') return new Date(valor);
  var s = String(valor || '').trim();
  if (!s) return null;
  var iso = s.slice(0, 10);
  if (iso.length === 10 && iso.charAt(4) === '-' && iso.charAt(7) === '-') {
    var pIso = iso.split('-');
    return new Date(Number(pIso[0]), Number(pIso[1]) - 1, Number(pIso[2]));
  }
  if ((s.indexOf('/') === 2 || s.indexOf('-') === 2) && s.length >= 10) {
    var sep = s.indexOf('/') === 2 ? '/' : '-';
    var p = s.slice(0, 10).split(sep);
    return new Date(Number(p[2]), Number(p[1]) - 1, Number(p[0]));
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function inicioDiaEmpresa(data) {
  return new Date(data.getFullYear(), data.getMonth(), data.getDate());
}

function calcularDiasGerencial(valor) {
  var data = parseDataEmpresa(valor);
  if (!data) return 'Sem data';
  var diff = inicioDiaEmpresa(new Date()).getTime() - inicioDiaEmpresa(data).getTime();
  var dias = Math.max(0, Math.floor(diff / 86400000));
  return dias === 1 ? '1 dia' : String(dias) + ' dias';
}

async function enviarOrcamentoEmpresa(e, id) {
  e.preventDefault();
  var form = e.target;
  var botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Enviando orçamento...');
  else if (botao) botao.disabled = true;
  var payload = formToObject(form);
  payload.id = id;
  delete payload.numeroOs;

  try {
    payload.anexosOrcamento = await arquivosInputParaBase64(form.querySelector('[name="anexosOrcamento"]'));
    google.script.run
      .withSuccessHandler(function() {
        if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Orçamento enviado');
        else if (botao) botao.disabled = false;
        // OTIMISTA: orçamento muda status para 'Orçamento Realizado' e sai da aba.
        // Aplica local e re-renderiza na hora, sem reler os 50+ chamados.
        if (typeof window.gomAtualizarChamadoLocal === 'function') {
          window.gomAtualizarChamadoLocal(id, { situacao: 'Orçamento Realizado', valorOrcamento: payload.valorOrcamento || '' });
          if (typeof renderizarTela === 'function') renderizarTela();
        } else {
          refreshChamados();
        }
      })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        else if (botao) botao.disabled = false;
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível devolver o orçamento.');
        else alert((err && err.message) || err);
      })
      .salvarRespostaOrcamentoEmpresa(payload);
  } catch (erro) {
    if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
    else if (botao) botao.disabled = false;
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erro, 'Não foi possível preparar os anexos.');
    else alert((erro && erro.message) || erro);
  }
}

function salvarEquipeDiaEmpresaFront(e, id) {
  e.preventDefault();
  var form = e.target;
  var botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando encaminhamento...');
  else if (botao) botao.disabled = true;
  var payload = formToObject(form);
  payload.id = id;
  delete payload.numeroOs;
  // Capturar data de agendamento do input fora do form (vinculado via form=)

  google.script.run
    .withSuccessHandler(function() { refreshChamados(function() { if (window.telaAtual === 'empresa' && typeof renderizarTela === 'function') renderizarTela(); if (window.telaAtual === 'campo' && typeof refreshCampo === 'function') refreshCampo(); }); })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar o dia.');
      else alert((err && err.message) || err);
    })
    .salvarEquipeDiaEmpresa(payload);
}

function salvarPrevisaoGerencialOsFront(input, id) {
  if (!input) return;
  var valor = String(input.value || '');
  var original = String(input.getAttribute('data-original') || '');
  if (valor === original) return;

  var statusId = 'empresaPrevStatus_' + String(id || '').replace(/[^A-Za-z0-9_-]/g, '_');
  var statusEl = document.getElementById(statusId) || (input.parentNode ? input.parentNode.querySelector('.empresa-autosave-msg') : null);
  if (statusEl) {
    statusEl.textContent = 'Salvando previsão...';
    statusEl.className = 'empresa-autosave-msg salvando';
  }

  input.disabled = true;
  google.script.run
    .withSuccessHandler(function() {
      input.disabled = false;
      input.setAttribute('data-original', valor);
      if (statusEl) {
        statusEl.textContent = 'Previsão salva automaticamente.';
        statusEl.className = 'empresa-autosave-msg salvo';
      }
      if (Array.isArray(window.listaChamadosGlobal)) {
        window.listaChamadosGlobal.forEach(function(item) {
          if (String(item.id) === String(id)) {
            item.dataPrevistaConclusao = valor;
            item.dataPrevistaConclusaoRaw = valor;
          }
        });
      }
      setTimeout(function() {
        if (window.telaAtual === 'empresa' && (window.empresaModoAtual || '') === 'gerencial') {
          refreshChamados(function() { if (typeof renderizarTela === 'function') renderizarTela(); });
        }
      }, 250);
    })
    .withFailureHandler(function(err) {
      input.disabled = false;
      if (statusEl) {
        statusEl.textContent = 'Erro ao salvar previsão.';
        statusEl.className = 'empresa-autosave-msg erro';
      }
      alert((err && err.message) || err);
    })
    .atualizarPrevisaoOsEmpresa({ id: id, dataPrevistaConclusao: valor });
}

function salvarDadosGerenciaisOsFront(e, id) {
  e.preventDefault();
  var payload = formToObject(e.target);
  payload.id = id;
  delete payload.numeroOs;
  google.script.run
    .withSuccessHandler(function() { refreshChamados(); })
    .withFailureHandler(function(err) { alert((err && err.message) || err); })
    .atualizarChamadoWorkflow(payload);
}

async function finalizarOsEmpresaFront(e, id) {
  e.preventDefault();
  var form = e.target;
  var botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Finalizando OS...');
  else if (botao) botao.disabled = true;
  var payload = formToObject(form);
  payload.id = id;
  delete payload.numeroOs;
  // Capturar data de agendamento do input fora do form (vinculado via form=)

  try {
    payload.anexosServico = await arquivosInputParaBase64(form.querySelector('[name="anexosServico"]'));
    google.script.run
      .withSuccessHandler(function() { refreshChamados(function() { carregarHistoricoCampoEmpresaSePreciso({ forcar: true }); if (window.telaAtual === 'empresa' && typeof renderizarTela === 'function') renderizarTela(); }); })
      .withFailureHandler(function(err) {
        if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        else if (botao) botao.disabled = false;
        if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível finalizar a OS.');
        else alert((err && err.message) || err);
      })
      .finalizarOsEmpresa(payload);
  } catch (erro) {
    if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
    else if (botao) botao.disabled = false;
    if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(erro, 'Não foi possível preparar os anexos.');
    else alert((erro && erro.message) || erro);
  }
}

function renderizarListaEquipes() {
  var container = document.getElementById('listaEquipesCadastradasHtml');
  if(!container) return;
  if (!(window.listaEquipesGlobal || []).length) {
    container.innerHTML = '<span class="text-muted small">Nenhuma equipe cadastrada ainda.</span>';
    return;
  }
  container.innerHTML = (window.listaEquipesGlobal || []).map(function(eq) {
    var nome = escapeHtml(eq && eq.nome ? eq.nome : eq);
    return '<span class="badge bg-light border border-info text-dark p-2 fs-6"><i class="bi bi-person-workspace text-info me-1"></i> ' + nome + '</span>';
  }).join('');
}

function salvarEquipeForm(e) {
  e.preventDefault();
  var form = e.target;
  var botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Adicionando equipe...');
  else if (botao) botao.disabled = true;
  var input = document.getElementById('nomeNovaEquipe');
  var nome = input ? input.value : '';
  google.script.run
    .withSuccessHandler(function() {
      window.listaEquipesGlobal = window.listaEquipesGlobal || [];
      window.listaEquipesGlobal.push(nome);
      if (input) input.value = '';
      renderizarListaEquipes();
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar a equipe.');
      else alert((err && err.message) || err);
    })
    .salvarNovaEquipe(nome);
}

function formatarInputDateEmpresa(valor) {
  if (!valor) return '';
  if (typeof valor === 'number') return new Date(valor).toISOString().slice(0,10);
  var s = String(valor);
  if (s.length >= 10 && s.charAt(4) === '-' && s.charAt(7) === '-') return s.slice(0,10);
  if (s.length >= 10 && (s.charAt(2) === '/' || s.charAt(2) === '-')) {
    var sep = s.charAt(2);
    var p = s.slice(0,10).split(sep);
    return String(p[2] || '') + '-' + String(p[1] || '') + '-' + String(p[0] || '');
  }
  return '';
}

function resumirTextoEmpresa(valor, limite) {
  var texto = String(valor || '').replace(/\s+/g, ' ').trim();
  if (texto.length <= limite) return texto;
  return texto.slice(0, limite - 1).trim() + '…';
}

window.salvarEncaminhamentosDiaEmpresa = salvarEncaminhamentosDiaEmpresa;
window.descartarEncaminhamentosDiaEmpresa = descartarEncaminhamentosDiaEmpresa;
window.marcarEncaminhamentoDiaEmpresaAlterado = marcarEncaminhamentoDiaEmpresaAlterado;
window.atualizarEstadoEncaminhamentosDiaEmpresa = atualizarEstadoEncaminhamentosDiaEmpresa;
window.setEmpresaModo = setEmpresaModo;
window.renderEmpresaView = renderEmpresaView;
window.carregarHistoricoCampoEmpresaSePreciso = carregarHistoricoCampoEmpresaSePreciso;
window.setEmpresaGerencialBusca = setEmpresaGerencialBusca;
window.setEmpresaGerencialStatus = setEmpresaGerencialStatus;
window.setEmpresaGerencialPrazo = setEmpresaGerencialPrazo;
window.limparFiltrosGerencialEmpresa = limparFiltrosGerencialEmpresa;
window.salvarPrevisaoGerencialOsFront = salvarPrevisaoGerencialOsFront;
window.salvarDadosGerenciaisOsFront = salvarDadosGerenciaisOsFront;
window.salvarEquipeDiaEmpresaFront = salvarEquipeDiaEmpresaFront;
window.salvarEquipeDiaEmpresa = salvarEquipeDiaEmpresaFront;
window.enviarOrcamentoEmpresa = enviarOrcamentoEmpresa;
window.devolverOrcamentoEmpresa = enviarOrcamentoEmpresa;
window.finalizarOsEmpresaFront = finalizarOsEmpresaFront;
window.finalizarOsEmpresa = finalizarOsEmpresaFront;
window.renderizarListaEquipes = renderizarListaEquipes;
window.salvarEquipeForm = salvarEquipeForm;