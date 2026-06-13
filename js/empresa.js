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
  document.querySelectorAll('#empresaDiaSaveBar button, .empresa-os-form-inline select, .empresa-os-observacao-wrap textarea, .empresa-data-individual-input').forEach(function(el) {
    if (disabled) {
      el.disabled = true;
      el.classList.add('gom-btn-disabled-context');
    } else {
      if (!el.classList.contains('gom-btn-loading')) el.disabled = false;
      el.classList.remove('gom-btn-disabled-context');
    }
  });
}


function empresaDataIsoParaBr_(valor) {
  if (!valor) return '';
  if (typeof gomDataParaBR === 'function') return gomDataParaBR(valor);
  var m = String(valor).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(valor || '');
}

function empresaHojeIso_() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function aplicarEquipeDiaEmpresaLocal_(payload) {
  payload = payload || {};
  var id = String(payload.id || '').trim();
  if (!id) return;

  var dataIso = '';
  if (payload.dataAtendimento) dataIso = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAtendimento) : payload.dataAtendimento;
  if (!dataIso && payload.dataEquipe) dataIso = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataEquipe) : payload.dataEquipe;
  if (!dataIso && payload.dataEquipeDia) dataIso = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataEquipeDia) : payload.dataEquipeDia;
  if (!dataIso) dataIso = empresaHojeIso_();

  var dataBr = empresaDataIsoParaBr_(dataIso);
  var hoje = empresaHojeIso_();

  function aplicar(item) {
    if (!item || String(item.id || '').trim() !== id) return;
    if (payload.equipe !== undefined) item.equipe = String(payload.equipe || '').trim();
    item.dataEquipeRaw = dataIso;
    item.dataEquipe = dataBr;
    item.dataAtendimentoRaw = dataIso;
    item.dataAtendimento = dataBr;
    item.dataEquipeDiaRaw = dataIso;
    item.dataEquipeDia = dataBr;
    item.temEquipeDiaValida = !!(item.equipe && dataIso === hoje);
    if (payload.observacoes !== undefined && String(payload.observacoes || '').trim()) {
      item.observacoes = String(payload.observacoes || '').trim();
    }
  }

  (window.listaChamadosGlobal || []).forEach(aplicar);
  if (window.dadosCampoGlobal && Array.isArray(window.dadosCampoGlobal.chamados)) {
    window.dadosCampoGlobal.chamados.forEach(aplicar);
  }
}

function marcarEncaminhamentoDiaEmpresaAlterado(id) {
  id = String(id || '').trim();
  if (!id) return;

  var form = document.getElementById('formEquipeDia_' + id.replace(/[^A-Za-z0-9_-]/g, '_')) || document.getElementById('formEquipeDia_' + id);
  if (!form) return;

  var payload = formToObject(form);
  payload.id = id;
  delete payload.numeroOs;
  if (payload.dataAtendimento) payload.dataAtendimento = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAtendimento) : payload.dataAtendimento;
  if (payload.dataAtendimento) { payload.dataEquipe = payload.dataAtendimento; payload.dataEquipeDia = payload.dataAtendimento; }

  var idSeguro = id.replace(/[^A-Za-z0-9_-]/g, '_');
  var equipeEl = form.querySelector('select[name="equipe"]');
  var dataEl = document.getElementById('empresaDataAtendimento_' + idSeguro) || form.querySelector('input[name="dataAtendimento"]');
  var equipeOriginal = String(form.getAttribute('data-equipe-original') || '').trim();
  var dataOriginal = String(form.getAttribute('data-data-original') || '').trim();
  var equipeAtualForm = String(payload.equipe || '').trim();
  var dataAtualForm = String(payload.dataAtendimento || '').trim();
  var equipeMudou = equipeAtualForm !== equipeOriginal;
  var dataFoiTocada = !!(dataEl && dataEl.dataset && dataEl.dataset.tocado === '1');
  var dataMudou = !!(dataFoiTocada && dataAtualForm && dataAtualForm !== dataOriginal);

  // A data pré-setada com hoje não cria alteração sozinha.
  // Observação também não salva sozinha: só acompanha mudança de equipe/data.
  if (!equipeMudou && !dataMudou) {
    delete (window.empresaDiaAlterados || {})[id];
    var rowSemMudanca = form.closest ? form.closest('.empresa-os-list-row-v2') : null;
    if (rowSemMudanca) rowSemMudanca.classList.remove('empresa-dia-alterado');
    atualizarEstadoEncaminhamentosDiaEmpresa();
    return;
  }

  if (equipeMudou && dataAtualForm && !payload.dataAtendimento) {
    payload.dataAtendimento = dataAtualForm;
    payload.dataEquipe = dataAtualForm;
    payload.dataEquipeDia = dataAtualForm;
  }

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
  valorDate = typeof gomDataParaISO === 'function' ? gomDataParaISO(valorDate) : valorDate;
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
    if (payload.dataAgendamento) {
      payload.dataAgendamento = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAgendamento) : payload.dataAgendamento;
      payload.dataEquipe = payload.dataAgendamento;
    }
    // Data de atendimento aplicada pela data global → vai para o registro do histórico
    if (payload.dataAtendimento) {
      payload.dataAtendimento = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAtendimento) : payload.dataAtendimento;
      payload.dataEquipe = payload.dataAtendimento; payload.dataEquipeDia = payload.dataAtendimento;
    }
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
      .withSuccessHandler(function() {
        aplicarEquipeDiaEmpresaLocal_(listaPayload[indice]);
        indice++;
        salvarProximo();
      })
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

  // Usa a data do input como fallback para itens sem dataAtendimento explícita
  var inputData = document.getElementById('gomEmpresaDataGlobal');
  var dataFallback = inputData ? (typeof gomDataParaISO === 'function' ? gomDataParaISO(inputData.value) : inputData.value) : '';
  if (dataFallback) {
    lista.forEach(function(item) {
      if (!item.dataAtendimento) {
        item.dataAtendimento = dataFallback;
        item.dataEquipe = dataFallback;
        item.dataEquipeDia = dataFallback;
      }
    });
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
    var agend   = formatarDataAgendamentoConfirmacao(item.dataAtendimento || item.dataEquipe || item.dataEquipeDia);
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
  var comAgendamento = lista.filter(function(i) { return !!(i.dataAtendimento || i.dataEquipe || i.dataEquipeDia); });

  var msgAgendamento = '';
  if (comAgendamento.length === 1) {
    var agend = formatarDataAgendamentoConfirmacao(comAgendamento[0].dataAtendimento || comAgendamento[0].dataEquipe || comAgendamento[0].dataEquipeDia);
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




// =============================================================
// V40 - Gerencial OS: carregamento determinístico
// Garante que a aba Gerencial OS não dependa de abrir outra aba antes.
// Recarrega chamados/histórico ao entrar na aba e evita filtros invisíveis.
// =============================================================
function gomEmpresaGerencialStatusPermitidos_() {
  return window.STATUS_EMPRESA_GERENCIAL || ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
}

function gomEmpresaGerencialResetarFiltros_() {
  window.empresaGerencialBusca = '';
  window.empresaGerencialStatus = 'Todos';
  window.empresaGerencialPrazo = 'Todos';
}

function carregarGerencialOsEmpresaAtualizado_(opcoes) {
  opcoes = opcoes || {};
  if (window.empresaGerencialAtualizando && !opcoes.forcar) return;
  var agora = Date.now();
  if (!opcoes.forcar && window.empresaGerencialUltimoRefresh && (agora - window.empresaGerencialUltimoRefresh < 2500)) return;

  window.empresaGerencialAtualizando = true;
  window.empresaGerencialUltimoRefresh = agora;

  try {
    if (typeof carregarHistoricoCampoEmpresaSePreciso === 'function') carregarHistoricoCampoEmpresaSePreciso({ forcar: !!opcoes.forcar });
  } catch(e) {}

  if (typeof carregarChamados === 'function') {
    carregarChamados({
      renderizar: true,
      forcar: true,
      callback: function() {
        window.empresaGerencialAtualizando = false;
        try { if (typeof carregarHistoricoCampoEmpresaSePreciso === 'function') carregarHistoricoCampoEmpresaSePreciso({ forcar: !!opcoes.forcar }); } catch(e) {}
        if (window.telaAtual === 'empresa' && (window.empresaModoAtual || '') === 'gerencial' && typeof renderizarTela === 'function') {
          setTimeout(function(){ renderizarTela(); }, 0);
        }
      }
    });
  } else {
    window.empresaGerencialAtualizando = false;
  }
}
window.carregarGerencialOsEmpresaAtualizado_ = carregarGerencialOsEmpresaAtualizado_;

function setEmpresaModo(modo, botao) {
  modo = modo || 'diario';
  if ((window.empresaModoAtual || 'diario') === 'diario' && modo !== 'diario' && totalEncaminhamentosDiaAlterados_ && totalEncaminhamentosDiaAlterados_() > 0) {
    if (!confirm('Existem encaminhamentos do dia não salvos. Deseja sair da execução diária e descartar essas alterações?')) return;
    window.empresaDiaAlterados = {};
  }
  window.empresaModoAtual = modo;
  if (typeof empresaModoAtual !== 'undefined') empresaModoAtual = window.empresaModoAtual;
  try { sessionStorage.setItem('gom:empresaModoAtual', window.empresaModoAtual); localStorage.setItem('gom:empresaModoAtual', window.empresaModoAtual); } catch(e) {}

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

  if (window.empresaModoAtual === 'gerencial') {
    carregarHistoricoCampoEmpresaSePreciso({ forcar: true });
    empresaForcarAtualizacaoGerencialOs_();
  }
  gomEmpresaAtualizarVisibilidadeData_();
  renderizarTela();
}

function empresaForcarAtualizacaoGerencialOs_() {
  if (window.empresaGerencialAtualizando) return;
  window.empresaGerencialAtualizando = true;
  var finalizar = function() {
    window.empresaGerencialAtualizando = false;
    if (window.telaAtual === 'empresa' && (window.empresaModoAtual || 'diario') === 'gerencial' && typeof renderizarTela === 'function') {
      renderizarTela();
    }
  };
  try {
    if (typeof refreshChamados === 'function') {
      refreshChamados(finalizar);
    } else {
      finalizar();
    }
  } catch (e) {
    window.empresaGerencialAtualizando = false;
  }
}

// Mostra o campo de data global só na Execução diária (e Orçamentos, opcional).
// Atualiza o rótulo conforme o modo.
function gomEmpresaAtualizarVisibilidadeData_() {
  var wrap = document.getElementById('gomDataGlobalWrap_empresa');
  var label = document.getElementById('gomDataGlobalLabel_empresa');
  if (!wrap) return;
  var modo = window.empresaModoAtual || 'diario';
  if (modo === 'diario') {
    // Campo de data global oculto na Execução diária da Empresa.
    // Os cards continuam recebendo a data de hoje diretamente em cada linha,
    // sem marcar alteração e sem salvar automaticamente.
    wrap.style.display = 'none';

    // Para voltar a exibir o campo futuramente, restaurar o bloco abaixo:
    // wrap.style.display = '';
    // if (label) label.textContent = 'Data padrão dos cards:';
    // var btnAplicar = wrap.querySelector('button');
    // if (btnAplicar) btnAplicar.style.display = 'none';
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
  var dataEscolhida = typeof gomDataParaISO === 'function' ? gomDataParaISO(input.value) : input.value;
  if (!dataEscolhida) { alert('Data inválida. Use o formato dd/mm/aaaa.'); return; }
  var btn = document.querySelector('#gomDataGlobalWrap_empresa button');

  var ids = Object.keys(window.empresaDiaAlterados || {});
  if (!ids.length) {
    alert('Selecione a equipe de um ou mais chamados primeiro; ao salvar, esta data vai junto automaticamente.');
    return;
  }
  ids.forEach(function(id) {
    window.empresaDiaAlterados[id] = window.empresaDiaAlterados[id] || {};
    window.empresaDiaAlterados[id].dataAtendimento = dataEscolhida;
    window.empresaDiaAlterados[id].dataEquipe = dataEscolhida;
    window.empresaDiaAlterados[id].dataEquipeDia = dataEscolhida;
    var idSeguro = String(id || '').replace(/[^A-Za-z0-9_-]/g, '_');
    var dataEl = document.getElementById('empresaDataAtendimento_' + idSeguro);
    if (dataEl) dataEl.value = dataEscolhida;
  });

  if (btn) {
    // Salva o HTML original para restaurar depois
    if (!btn.dataset.gomOriginalHtml) btn.dataset.gomOriginalHtml = btn.innerHTML;
    btn.classList.add('gom-btn-success');
    btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Aplicada a ' + ids.length;
    // Limpa timer anterior e cria novo
    if (btn._gomTimer) clearTimeout(btn._gomTimer);
    btn._gomTimer = setTimeout(function() {
      btn.classList.remove('gom-btn-success');
      if (btn.dataset.gomOriginalHtml) {
        btn.innerHTML = btn.dataset.gomOriginalHtml;
        delete btn.dataset.gomOriginalHtml;
      }
      btn._gomTimer = null;
    }, 2000);
  }
}
window.gomEmpresaAplicarDataGlobal = gomEmpresaAplicarDataGlobal;

// Pré-preenche o campo com a data de hoje ao entrar na Empresa.
function gomEmpresaPrePreencherDataHoje_() {
  var input = document.getElementById('gomEmpresaDataGlobal');
  if (input && !input.value) {
    var h = new Date();
    var iso = h.getFullYear() + '-' + String(h.getMonth()+1).padStart(2,'0') + '-' + String(h.getDate()).padStart(2,'0');
    input.value = iso;
  }
  // Quando a data muda, reseta o botão para "Aplicar" (sai do estado "Aplicada")
  if (input && !input._gomListenerAdded) {
    input._gomListenerAdded = true;
    input.addEventListener('change', function() {
      var btn = document.querySelector('#gomDataGlobalWrap_empresa button');
      if (!btn) return;
      if (btn._gomTimer) { clearTimeout(btn._gomTimer); btn._gomTimer = null; }
      btn.classList.remove('gom-btn-success');
      if (btn.dataset.gomOriginalHtml) {
        btn.innerHTML = btn.dataset.gomOriginalHtml;
        delete btn.dataset.gomOriginalHtml;
      }
    });
  }
}
window.gomEmpresaPrePreencherDataHoje_ = gomEmpresaPrePreencherDataHoje_;

function renderEmpresaView(listaRender) {
  var modo = window.empresaModoAtual || 'diario';
  setTimeout(function() { gomEmpresaAtualizarVisibilidadeData_(); gomEmpresaPrePreencherDataHoje_(); }, 0);
  var listaBase = listaRender || [];

  if (modo === 'equipes') return renderGestaoEquipes({ origem: 'empresa' });

  if (modo === 'agenda') return renderAgendaAcompanhamentoEmpresa();

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
    var statusGerencial = gomEmpresaGerencialStatusPermitidos_();
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


window.empresaAgendaFiltroAtual = window.empresaAgendaFiltroAtual || 'todos';

function empresaAgendaHtml_(v) {
  if (typeof escapeHtml === 'function') return escapeHtml(v);
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function empresaAgendaJs_(v) {
  if (typeof escapeJsAttr === 'function') return escapeJsAttr(v);
  return String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
}

function empresaAgendaTexto_(v) {
  if (typeof normalizarTextoBase === 'function') return normalizarTextoBase(v);
  return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function empresaAgendaStatus_(v) {
  return typeof normalizarSituacaoSistema === 'function' ? normalizarSituacaoSistema(v) : String(v || '').trim();
}

function empresaAgendaCor_(st) {
  return typeof getCorStatus === 'function' ? getCorStatus(st) : '#075f82';
}

function empresaAgendaDataISO_(valor) {
  if (!valor) return '';
  if (valor instanceof Date && !isNaN(valor)) {
    return valor.getFullYear() + '-' + String(valor.getMonth() + 1).padStart(2, '0') + '-' + String(valor.getDate()).padStart(2, '0');
  }
  var s = String(valor || '').trim();
  if (!s) return '';
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return br[3] + '-' + String(br[2]).padStart(2, '0') + '-' + String(br[1]).padStart(2, '0');
  var d = new Date(s);
  if (!isNaN(d)) return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  return '';
}

function empresaAgendaDataBr_(iso) {
  var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso || 'Sem data definida';
  return m[3] + '/' + m[2] + '/' + m[1];
}

function empresaAgendaDiaSemana_(iso) {
  if (!iso || iso === 'sem-data') return 'Pendência de organização';
  var partes = String(iso).split('-').map(Number);
  var d = new Date(partes[0], partes[1] - 1, partes[2]);
  if (isNaN(d)) return '';
  return d.toLocaleDateString('pt-BR', { weekday: 'long' });
}

function empresaAgendaHojeISO_() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

function empresaAgendaDataOrdenacao_(iso) {
  if (!iso) return 99999999;
  return Number(String(iso).replace(/-/g, '')) || 99999999;
}

function empresaAgendaData_(item) {
  var candidatos = [
    item.dataAtendimentoRaw,
    item.dataAtendimento,
    item.data_atendimento,
    item.dataEquipeRaw,
    item.dataEquipe,
    item.dataEquipeDiaRaw,
    item.dataEquipeDia,
    item.data_equipe,
    item.data_equipe_dia,
    item.previsaoOs,
    item.previsao_os,
    item.dataPrevisaoOs,
    item.data_previsao_os,
    item.dataPrevistaConclusaoRaw,
    item.dataPrevistaConclusao,
    item.data_prevista_conclusao,
    item.dataHoraUltimaAcao,
    item.dataHora,
    item.data
  ];
  for (var i = 0; i < candidatos.length; i++) {
    var iso = empresaAgendaDataISO_(candidatos[i]);
    if (iso) return iso;
  }
  return '';
}

function empresaAgendaEquipe_(item) {
  return item.equipe || item.equipeDia || item.equipeAtual || item.nomeEquipe || item.responsavel || '';
}

function empresaAgendaOs_(item) {
  return item.numeroOs || item.numero_os || item.os || '';
}

function empresaAgendaDescricao_(item) {
  var s = String(item.detalhamento || item.descricao || item.problema || item.observacoes || '').replace(/\s+/g, ' ').trim();
  if (!s) return 'Sem descrição resumida informada.';
  return s.length > 220 ? s.slice(0, 220) + '…' : s;
}

function empresaAgendaTipo_(st) {
  var t = empresaAgendaTexto_(st);
  if (t.indexOf('orcamento') >= 0) return 'orcamentos';
  if (t.indexOf('os emitida') >= 0 || t.indexOf('os sem numeracao') >= 0) return 'os';
  if (t.indexOf('emergencial') >= 0) return 'emergenciais';
  if (t.indexOf('garantia') >= 0) return 'garantia';
  if (t.indexOf('execucao') >= 0 || t.indexOf('em execucao') >= 0) return 'execucao';
  return 'outros';
}

function empresaAgendaStatusValido_(st) {
  var t = empresaAgendaTexto_(st);
  if (t.indexOf('orcamento') >= 0) return true;
  if (t.indexOf('os emitida') >= 0 || t.indexOf('os sem numeracao') >= 0) return true;
  if (t.indexOf('emergencial') >= 0) return true;
  if (t.indexOf('garantia') >= 0) return true;
  if (t.indexOf('execucao') >= 0 || t.indexOf('em execucao') >= 0) return true;
  return false;
}

function empresaAgendaLista_() {
  var termo = typeof termoPesquisa === 'function' ? termoPesquisa() : empresaAgendaTexto_(document.getElementById('pesquisa') && document.getElementById('pesquisa').value || '');
  return (window.listaChamadosGlobal || []).filter(function(item) {
    var st = empresaAgendaStatus_(item.situacao || item.status || item['Situação'] || item['Status']);
    if (!empresaAgendaStatusValido_(st)) return false;
    var texto = empresaAgendaTexto_([item.id, item.unidade, item.detalhamento, item.descricao, st, item.observacoes, empresaAgendaEquipe_(item), empresaAgendaOs_(item), empresaAgendaData_(item)].join(' '));
    return !termo || texto.indexOf(termo) >= 0;
  }).map(function(item) {
    var st = empresaAgendaStatus_(item.situacao || item.status);
    return Object.assign({}, item, {
      _empresaAgendaStatus: st,
      _empresaAgendaTipo: empresaAgendaTipo_(st),
      _empresaAgendaData: empresaAgendaData_(item),
      _empresaAgendaEquipe: empresaAgendaEquipe_(item),
      _empresaAgendaOs: empresaAgendaOs_(item),
      _empresaAgendaDescricao: empresaAgendaDescricao_(item)
    });
  }).sort(function(a, b) {
    return empresaAgendaDataOrdenacao_(a._empresaAgendaData) - empresaAgendaDataOrdenacao_(b._empresaAgendaData)
      || String(a._empresaAgendaEquipe || '').localeCompare(String(b._empresaAgendaEquipe || ''), 'pt-BR')
      || String(a.unidade || '').localeCompare(String(b.unidade || ''), 'pt-BR')
      || Number(a.id || 0) - Number(b.id || 0);
  });
}

function empresaAgendaFiltrar_(lista) {
  var f = window.empresaAgendaFiltroAtual || 'todos';
  var hoje = empresaAgendaHojeISO_();
  if (f === 'hoje') return lista.filter(function(i){ return i._empresaAgendaData === hoje; });
  if (f === 'orcamentos') return lista.filter(function(i){ return i._empresaAgendaTipo === 'orcamentos'; });
  if (f === 'os') return lista.filter(function(i){ return i._empresaAgendaTipo === 'os' || i._empresaAgendaTipo === 'execucao'; });
  if (f === 'emergenciais') return lista.filter(function(i){ return i._empresaAgendaTipo === 'emergenciais'; });
  if (f === 'garantia') return lista.filter(function(i){ return i._empresaAgendaTipo === 'garantia'; });
  if (f === 'pendencias') return lista.filter(function(i){ return !i._empresaAgendaEquipe || !i._empresaAgendaData; });
  return lista;
}

function empresaAgendaContar_(lista) {
  var hoje = empresaAgendaHojeISO_();
  lista = lista || [];
  return {
    total: lista.length,
    hoje: lista.filter(function(i){ return i._empresaAgendaData === hoje; }).length,
    orcamentos: lista.filter(function(i){ return i._empresaAgendaTipo === 'orcamentos'; }).length,
    os: lista.filter(function(i){ return i._empresaAgendaTipo === 'os' || i._empresaAgendaTipo === 'execucao'; }).length,
    emergenciais: lista.filter(function(i){ return i._empresaAgendaTipo === 'emergenciais'; }).length,
    garantia: lista.filter(function(i){ return i._empresaAgendaTipo === 'garantia'; }).length,
    pendencias: lista.filter(function(i){ return !i._empresaAgendaEquipe || !i._empresaAgendaData; }).length,
    semEquipe: lista.filter(function(i){ return !i._empresaAgendaEquipe; }).length,
    semData: lista.filter(function(i){ return !i._empresaAgendaData; }).length
  };
}

function empresaAgendaKpi_(chave, titulo, valor, cor, ativo, desc, icone) {
  var caption = Number(valor) === 1 ? 'chamado' : 'chamados';
  return [
    '<div class="kpi-box agenda-kpi-box empresa-agenda-kpi ' + (ativo ? 'ativo' : '') + '" style="--kpi-color:' + empresaAgendaHtml_(cor || 'var(--primary)') + ';" onclick="setEmpresaAgendaFiltro(\'' + empresaAgendaJs_(chave) + '\')" title="' + empresaAgendaHtml_(desc) + '">',
      '<div class="kpi-box-head"><span class="kpi-icon"><i class="bi ' + empresaAgendaHtml_(icone || 'bi-funnel') + '"></i></span><span class="kpi-pulse"></span></div>',
      '<div class="kpi-title">' + empresaAgendaHtml_(titulo) + '</div>',
      '<div class="kpi-value-row"><div class="kpi-value">' + empresaAgendaHtml_(valor) + '</div><span class="kpi-caption">' + caption + '</span></div>',
      '<div class="kpi-help">' + empresaAgendaHtml_(desc) + '</div>',
    '</div>'
  ].join('');
}

function empresaAgendaRenderKpis_(listaCompleta) {
  var grid = document.getElementById('kpiGrid');
  if (!grid) return;
  var f = window.empresaAgendaFiltroAtual || 'todos';
  var c = empresaAgendaContar_(listaCompleta || []);
  grid.innerHTML = ''
    + empresaAgendaKpi_('todos', 'Agenda Empresa', c.total, 'var(--primary)', f === 'todos', 'Chamados que estão sob responsabilidade da empresa.', 'bi-calendar2-week')
    + empresaAgendaKpi_('hoje', 'Hoje', c.hoje, 'var(--visita)', f === 'hoje', 'Atendimentos da empresa vinculados ao dia atual.', 'bi-calendar-day')
    + empresaAgendaKpi_('orcamentos', 'Orçamentos', c.orcamentos, 'var(--orcamento)', f === 'orcamentos', 'Solicitações de orçamento que dependem da empresa.', 'bi-cash-coin')
    + empresaAgendaKpi_('os', 'OS / Execução', c.os, 'var(--os)', f === 'os', 'Ordens de serviço e chamados em execução pela empresa.', 'bi-file-earmark-check')
    + empresaAgendaKpi_('emergenciais', 'Emergenciais', c.emergenciais, 'var(--emergencial)', f === 'emergenciais', 'Atendimentos emergenciais sob responsabilidade da empresa.', 'bi-lightning-charge')
    + empresaAgendaKpi_('garantia', 'Garantia', c.garantia, '#f97316', f === 'garantia', 'Chamados vinculados à garantia de obra.', 'bi-shield-check')
    + empresaAgendaKpi_('pendencias', 'Pendências', c.pendencias, '#f59e0b', f === 'pendencias', 'Itens da empresa sem equipe ou sem data/previsão.', 'bi-exclamation-circle');
}

function empresaAgendaResumo_(listaCompleta) {
  var c = empresaAgendaContar_(listaCompleta || []);
  return [
    '<div class="fila-agenda-resumo fila-agenda-resumo-v14 empresa-agenda-resumo">',
      '<span><strong>' + c.total + '</strong> total empresa</span>',
      '<span><strong>' + c.hoje + '</strong> hoje</span>',
      '<span><strong>' + c.orcamentos + '</strong> orçamentos</span>',
      '<span><strong>' + c.os + '</strong> OS / execução</span>',
      '<span><strong>' + c.emergenciais + '</strong> emergenciais</span>',
      '<span><strong>' + c.garantia + '</strong> garantia</span>',
      '<span class="' + (c.pendencias ? 'is-alerta' : '') + '"><strong>' + c.pendencias + '</strong> pendências</span>',
    '</div>'
  ].join('');
}

function renderAgendaAcompanhamentoEmpresa() {
  var listaCompleta = empresaAgendaLista_();
  var lista = empresaAgendaFiltrar_(listaCompleta);
  empresaAgendaRenderKpis_(listaCompleta);
  var contador = document.getElementById('contador');
  if (contador) contador.textContent = lista.length + ' em acompanhamento';

  var grupos = {};
  lista.forEach(function(item) {
    var k = item._empresaAgendaData || 'sem-data';
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(item);
  });
  var chaves = Object.keys(grupos).sort(function(a, b) {
    if (a === 'sem-data') return 1;
    if (b === 'sem-data') return -1;
    return empresaAgendaDataOrdenacao_(a) - empresaAgendaDataOrdenacao_(b);
  });
  var atualizado = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  var html = [
    '<div class="fila-agenda-shell agenda-list-mode agenda-v14 empresa-agenda-shell">',
      '<div class="fila-agenda-toolbar agenda-list-toolbar empresa-agenda-toolbar">',
        '<div><h5><i class="bi bi-building me-2"></i>Agenda / Acompanhamento da Empresa</h5><p>Somente chamados sob responsabilidade da empresa: orçamento, OS, emergencial, garantia e execução.</p></div>',
        '<div class="text-muted small fw-bold"><i class="bi bi-clock-history me-1"></i>Atualizado às ' + empresaAgendaHtml_(atualizado) + '</div>',
      '</div>',
      '<div class="fila-agenda-list-view empresa-agenda-list-view">'
  ];

  if (!listaCompleta.length) {
    html.push('<div class="empty-state"><h5>Nenhum chamado sob responsabilidade da empresa.</h5><p class="text-muted">Orçamentos, OS, emergenciais, garantias e execuções aparecerão aqui.</p></div>');
  } else if (!lista.length) {
    html.push('<div class="empty-state"><h5>Nenhum registro neste filtro.</h5><p class="text-muted">Clique em outro KPI ou limpe a busca.</p></div>');
  }

  chaves.forEach(function(chave) {
    var itens = grupos[chave] || [];
    var titulo = chave === 'sem-data' ? 'Sem data definida' : empresaAgendaDataBr_(chave);
    var subtitulo = chave === 'sem-data' ? 'Registros que precisam de data/previsão' : empresaAgendaDiaSemana_(chave);
    html.push('<section class="fila-agenda-dia-list ' + (chave === 'sem-data' ? 'is-sem-data' : '') + '">');
    html.push('<div class="fila-agenda-dia-list-head"><div><strong>' + empresaAgendaHtml_(titulo) + '</strong><small>' + empresaAgendaHtml_(subtitulo) + '</small></div><span>' + itens.length + ' atendimento' + (itens.length === 1 ? '' : 's') + '</span></div>');
    html.push('<div class="fila-agenda-rows">');
    itens.forEach(function(item) {
      var id = empresaAgendaHtml_(item.id || '-');
      var idJs = empresaAgendaJs_(item.id || '');
      var st = item._empresaAgendaStatus || 'Sem status';
      var eq = item._empresaAgendaEquipe || 'Equipe não definida';
      var os = item._empresaAgendaOs || 'Sem OS';
      var tituloData = chave === 'sem-data' ? 'Sem data' : empresaAgendaDataBr_(chave);
      html.push('<article class="fila-agenda-row empresa-agenda-row" style="--card-accent:' + empresaAgendaHtml_(empresaAgendaCor_(st)) + '">');
        html.push('<div class="fila-agenda-row-main">');
          html.push('<div class="fila-agenda-row-unidade"><strong>' + empresaAgendaHtml_(item.unidade || 'Unidade não informada') + '</strong><small>#' + id + ' · Empresa</small></div>');
          html.push('<p>' + empresaAgendaHtml_(item._empresaAgendaDescricao) + '</p>');
        html.push('</div>');
        html.push('<div class="fila-agenda-row-info">');
          html.push('<span class="fila-agenda-status" style="--status-accent:' + empresaAgendaHtml_(empresaAgendaCor_(st)) + '">' + empresaAgendaHtml_(st) + '</span>');
          html.push('<span class="' + (!item._empresaAgendaEquipe ? 'is-pendente' : '') + '"><i class="bi bi-people"></i>' + empresaAgendaHtml_(eq) + '</span>');
          html.push('<span><i class="bi bi-file-earmark-check"></i>' + empresaAgendaHtml_(os) + '</span>');
          html.push('<span><i class="bi bi-calendar3"></i>' + empresaAgendaHtml_(tituloData) + '</span>');
        html.push('</div>');
        html.push('<div class="fila-agenda-row-action"><button type="button" class="btn btn-light btn-sm border fw-bold" onclick="abrirModalAnalise(\'' + idJs + '\')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir chamado</button></div>');
      html.push('</article>');
    });
    html.push('</div></section>');
  });
  html.push('</div></div>');
  return html.join('');
}

window.setEmpresaAgendaFiltro = function(filtro) {
  window.empresaAgendaFiltroAtual = filtro || 'todos';
  window.statusFiltroClicado = null;
  if (typeof statusFiltroClicado !== 'undefined') statusFiltroClicado = null;
  if (typeof renderizarTela === 'function') renderizarTela();
};

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
        window.gomWarn && window.gomWarn('[GOM] Não foi possível carregar histórico de campo para a empresa:', e);
      }
      if (window.telaAtual === 'empresa' && (window.empresaModoAtual || 'diario') === 'gerencial') renderizarTela();
    })
    .withFailureHandler(function(err) {
      window.empresaHistoricoCarregando = false;
      window.gomWarn && window.gomWarn('[GOM] Falha ao carregar histórico de campo para a empresa:', err);
    })
    .gomListarCampoWebV3Json();
}

function usuarioPodeGerenciarEquipeSecretaria_() {
  var usuario = (typeof getUsuarioGom === 'function') ? getUsuarioGom() : (window.usuarioAtualGom || {});
  var perfil = String((usuario && (usuario.perfil || usuario.perfilLabel || usuario.modo)) || '').toUpperCase();
  if (!usuario || usuario.restrito === false || usuario.modo === 'ABERTO') return true;
  return perfil.indexOf('ADMIN') >= 0 || perfil.indexOf('GOM') >= 0 || perfil.indexOf('SECRETARIA') >= 0 || perfil.indexOf('CONFERENTE') >= 0;
}

function getOrigemEquipesGerencialAtual_() {
  return window.equipesGerenciaisOrigemAtual === 'empresa' ? 'empresa' : 'admin';
}

function setOrigemEquipesGerencialAtual_(origem) {
  window.equipesGerenciaisOrigemAtual = origem === 'empresa' ? 'empresa' : 'admin';
}

function getTipoEquipesGerencialAtual_() {
  var origem = getOrigemEquipesGerencialAtual_();
  if (origem === 'empresa') {
    window.empresaEquipesTipoAtual = 'empresa';
    window.adminEquipesTipoAtual = 'empresa';
    return 'empresa';
  }
  var podeSecretaria = usuarioPodeGerenciarEquipeSecretaria_();
  if (!podeSecretaria) {
    window.adminEquipesTipoAtual = 'empresa';
    return 'empresa';
  }
  window.adminEquipesTipoAtual = window.adminEquipesTipoAtual || 'empresa';
  return window.adminEquipesTipoAtual === 'secretaria' ? 'secretaria' : 'empresa';
}

function setTipoEquipesGerencial(tipo, botao) {
  var origem = getOrigemEquipesGerencialAtual_();
  if (origem === 'empresa') {
    window.empresaEquipesTipoAtual = 'empresa';
    alert('No Painel da Empresa, esta aba gerencia somente equipes da empresa. Para visualizar/alterar equipes da Secretaria/GOM, use a tela Mais > Gerenciar Equipes.');
    tipo = 'empresa';
  }
  if (tipo === 'secretaria' && !usuarioPodeGerenciarEquipeSecretaria_()) {
    alert('Seu perfil pode gerenciar somente equipes da empresa.');
    tipo = 'empresa';
  }
  if (origem === 'empresa') window.empresaEquipesTipoAtual = 'empresa';
  else window.adminEquipesTipoAtual = tipo === 'secretaria' ? 'secretaria' : 'empresa';
  document.querySelectorAll('#empresaEquipeTipoTabs .nav-link').forEach(function(btn) { btn.classList.remove('active'); });
  if (botao) botao.classList.add('active');
  carregarEquipesGerenciais({ forcar: true });
}

function parseJsonEquipes_(res) {
  if (!res) return { ok: false, erro: 'Resposta vazia.' };
  if (typeof res === 'string') {
    try { return JSON.parse(res); }
    catch (e) { return { ok: false, erro: 'JSON inválido: ' + e.message }; }
  }
  return res;
}

function renderGestaoEquipes(opcoes) {
  opcoes = opcoes || {};
  var origem = opcoes.origem === 'empresa' ? 'empresa' : 'admin';
  setOrigemEquipesGerencialAtual_(origem);

  if (origem === 'empresa') {
    window.empresaEquipesTipoAtual = 'empresa';
    window.adminEquipesTipoAtual = window.adminEquipesTipoAtual || 'empresa';
  }

  setTimeout(function() { carregarEquipesGerenciais(); }, 0);
  var tipo = getTipoEquipesGerencialAtual_();
  var podeSecretaria = origem === 'admin' && usuarioPodeGerenciarEquipeSecretaria_();
  var tituloTipo = tipo === 'secretaria' ? 'Secretaria/GOM' : 'Empresa';
  var tituloTela = origem === 'empresa' ? 'Equipes da Empresa' : 'Gerenciamento de Equipes';
  var descricaoTela = origem === 'empresa'
    ? 'A empresa cadastra e mantém somente as próprias equipes e seus integrantes. Equipes da Secretaria/GOM ficam em Mais > Gerenciar Equipes.'
    : 'Tela administrativa para visualizar e manter separadamente equipes da empresa e equipes internas da Secretaria/GOM.';
  var alertaTela = origem === 'empresa'
    ? 'Painel da Empresa: esta aba mostra somente equipes da empresa. A equipe não visualiza nem altera equipes da Secretaria/GOM por aqui.'
    : (podeSecretaria ? 'Perfil administrativo: você pode alternar entre equipes da empresa e equipes internas da Secretaria/GOM.' : 'Perfil restrito: você pode gerenciar somente equipes da empresa.');

  return [
    '<div class="equipes-gerencial-page">',
      '<div class="equipes-gerencial-head bg-white rounded shadow-sm border-start border-4 border-info p-3 mb-3">',
        '<div>',
          '<h5 class="fw-bold text-primary mb-1"><i class="bi bi-diagram-3-fill me-2"></i>' + escapeHtml(tituloTela) + '</h5>',
          '<p class="text-muted small mb-0">' + escapeHtml(descricaoTela) + '</p>',
        '</div>',
        '<button type="button" class="btn btn-light border fw-bold btn-sm" onclick="carregarEquipesGerenciais({forcar:true, botao:this})"><i class="bi bi-arrow-clockwise me-1"></i>Atualizar</button>',
      '</div>',
      (origem === 'admin' ? '<ul class="nav nav-pills bg-white shadow-sm p-2 rounded-pill d-inline-flex mb-3" id="empresaEquipeTipoTabs">' +
        '<li class="nav-item"><button type="button" class="nav-link rounded-pill px-4 fw-bold ' + (tipo === 'empresa' ? 'active' : '') + '" onclick="setTipoEquipesGerencial(\'empresa\', this)"><i class="bi bi-building-check me-2"></i>Equipes da empresa</button></li>' +
        (podeSecretaria ? '<li class="nav-item"><button type="button" class="nav-link rounded-pill px-4 fw-bold ' + (tipo === 'secretaria' ? 'active' : '') + '" onclick="setTipoEquipesGerencial(\'secretaria\', this)"><i class="bi bi-person-badge-fill me-2"></i>Equipes da Secretaria/GOM</button></li>' : '') +
      '</ul>' : '<div class="empresa-equipes-lock bg-white shadow-sm rounded-pill d-inline-flex align-items-center gap-2 px-3 py-2 mb-3"><i class="bi bi-building-check text-primary"></i><strong>Equipes da empresa</strong><span class="text-muted small">visualização restrita a este tipo</span></div>'),
      '<div class="equipes-gerencial-alert mb-3">',
        '<i class="bi bi-shield-check"></i>',
        '<span>' + escapeHtml(alertaTela) + '</span>',
      '</div>',
      '<div class="row g-3 align-items-start">',
        '<div class="col-lg-4">',
          '<div class="bg-white p-4 rounded shadow-sm border-top border-4 border-info mb-3">',
            '<h5 class="fw-bold text-dark mb-3"><i class="bi bi-plus-circle-fill text-info me-2"></i>Cadastrar equipe</h5>',
            '<form onsubmit="salvarEquipeGerencialForm(event)">',
              '<input type="hidden" id="tipoNovaEquipeGerencial" value="' + escapeHtml(tipo) + '">',
              '<div class="mb-2"><label class="form-label text-muted small fw-bold">TIPO</label><input type="text" class="form-control bg-light" value="' + escapeHtml(tituloTipo) + '" disabled></div>',
              '<div class="mb-3"><label class="form-label text-muted small fw-bold">NOME DA EQUIPE</label><input type="text" id="nomeNovaEquipeGerencial" class="form-control form-control-lg bg-light" placeholder="Ex: Equipe Elétrica" required></div>',
              '<button type="submit" class="btn btn-info text-white w-100 fw-bold shadow-sm"><i class="bi bi-check2-circle me-1"></i>Salvar equipe</button>',
            '</form>',
          '</div>',
          '<div class="bg-white p-4 rounded shadow-sm border-top border-4 border-primary">',
            '<h5 class="fw-bold text-dark mb-3"><i class="bi bi-person-plus-fill text-primary me-2"></i>Adicionar integrante</h5>',
            '<form onsubmit="salvarMembroEquipeGerencialForm(event)">',
              '<div class="mb-2"><label class="form-label text-muted small fw-bold">EQUIPE</label><select id="selectEquipeMembroGerencial" class="form-select bg-light" required><option value="">Carregando equipes...</option></select></div>',
              '<div class="mb-2"><label class="form-label text-muted small fw-bold">NOME DO INTEGRANTE</label><input type="text" id="nomeMembroGerencial" class="form-control bg-light" placeholder="Nome da pessoa" required></div>',
              '<div class="mb-2"><label class="form-label text-muted small fw-bold">FUNÇÃO</label><input type="text" id="funcaoMembroGerencial" class="form-control bg-light" placeholder="Ex: Encanador, eletricista, ajudante"></div>',
              '<div class="row g-2 mb-3"><div class="col-md-6"><label class="form-label text-muted small fw-bold">TELEFONE</label><input type="text" id="telefoneMembroGerencial" class="form-control bg-light" placeholder="Opcional"></div><div class="col-md-6"><label class="form-label text-muted small fw-bold">E-MAIL</label><input type="email" id="emailMembroGerencial" class="form-control bg-light" placeholder="Opcional"></div></div>',
              '<button type="submit" class="btn btn-primary w-100 fw-bold shadow-sm"><i class="bi bi-person-check me-1"></i>Adicionar integrante</button>',
            '</form>',
          '</div>',
        '</div>',
        '<div class="col-lg-8">',
          '<div class="bg-white p-4 rounded shadow-sm h-100 border-top border-4 border-secondary">',
            '<div class="d-flex justify-content-between align-items-center gap-2 flex-wrap mb-3">',
              '<h5 class="fw-bold text-dark mb-0"><i class="bi bi-card-checklist text-secondary me-2"></i>Equipes e integrantes</h5>',
              '<span class="badge bg-primary px-3 py-2" id="contadorEquipesGerenciais">0 equipes</span>',
            '</div>',
            '<div class="input-group mb-3"><span class="input-group-text bg-light border-end-0"><i class="bi bi-search"></i></span><input type="text" id="buscaEquipesGerenciais" class="form-control border-start-0" placeholder="Buscar equipe, integrante, função, telefone ou e-mail..." oninput="renderizarListaEquipesGerenciais()"></div>',
            '<div id="listaEquipesGerenciaisHtml" class="equipes-gerencial-lista"><div class="text-center text-muted py-4"><div class="spinner-border text-primary mb-3"></div><div class="fw-bold">Carregando equipes...</div></div></div>',
          '</div>',
        '</div>',
      '</div>',
    '</div>'
  ].join('');
}

function inicializarGerenciamentoEquipes() {
  setOrigemEquipesGerencialAtual_('admin');
  window.adminEquipesTipoAtual = window.adminEquipesTipoAtual || 'empresa';
  var painel = document.getElementById('painelEquipesGerencial');
  if (painel) painel.innerHTML = renderGestaoEquipes({ origem: 'admin' });
}

function carregarEquipesGerenciais(opcoes) {
  opcoes = opcoes || {};
  var tipo = getTipoEquipesGerencialAtual_();
  if (window.equipesGerenciaisCarregando && !opcoes.forcar) return;
  if (!opcoes.forcar && Array.isArray(window.equipesGerenciaisGlobal) && window.equipesGerenciaisTipo === tipo) {
    renderizarListaEquipesGerenciais();
    return;
  }
  window.equipesGerenciaisCarregando = true;
  window.equipesGerenciaisTipo = tipo;
  var botao = opcoes.botao || null;
  if (botao && typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Atualizando...');

  google.script.run
    .withSuccessHandler(function(res) {
      window.equipesGerenciaisCarregando = false;
      if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      var payload = parseJsonEquipes_(res);
      if (!payload.ok) {
        var box = document.getElementById('listaEquipesGerenciaisHtml');
        if (box) box.innerHTML = '<div class="alert alert-danger"><strong>Erro:</strong> ' + escapeHtml(payload.erro || 'Não foi possível carregar equipes.') + '</div>';
        return;
      }
      window.equipesGerenciaisGlobal = payload.equipes || [];
      window.equipesGerenciaisTipo = payload.tipo || tipo;
      renderizarListaEquipesGerenciais();
    })
    .withFailureHandler(function(err) {
      window.equipesGerenciaisCarregando = false;
      if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      var box = document.getElementById('listaEquipesGerenciaisHtml');
      if (box) box.innerHTML = '<div class="alert alert-danger"><strong>Erro:</strong> ' + escapeHtml((err && err.message) || err || 'Falha ao carregar equipes.') + '</div>';
    })
    .gomListarEquipesGerencialV1Json({ tipo: tipo });
}

function atualizarSelectEquipesGerenciais_() {
  var select = document.getElementById('selectEquipeMembroGerencial');
  if (!select) return;
  var equipes = Array.isArray(window.equipesGerenciaisGlobal) ? window.equipesGerenciaisGlobal.filter(function(eq) { return eq.ativo !== false; }) : [];
  if (!equipes.length) {
    select.innerHTML = '<option value="">Cadastre uma equipe primeiro</option>';
    return;
  }
  select.innerHTML = '<option value="">Selecione...</option>' + equipes.map(function(eq) {
    return '<option value="' + escapeHtml(eq.id) + '">' + escapeHtml(eq.nome) + '</option>';
  }).join('');
}

function renderizarListaEquipesGerenciais() {
  var container = document.getElementById('listaEquipesGerenciaisHtml');
  if (!container) return;
  var buscaInput = document.getElementById('buscaEquipesGerenciais');
  var termo = typeof normalizarTextoBase === 'function' ? normalizarTextoBase(buscaInput ? buscaInput.value : '') : String(buscaInput ? buscaInput.value : '').toLowerCase();
  var equipes = Array.isArray(window.equipesGerenciaisGlobal) ? window.equipesGerenciaisGlobal.slice() : [];

  var filtradas = equipes.filter(function(eq) {
    var membros = Array.isArray(eq.membros) ? eq.membros : [];
    var texto = [eq.nome, eq.tipo, eq.ativo ? 'ativo' : 'inativo'].concat(membros.map(function(m) {
      return [m.nome, m.funcao, m.telefone, m.email, m.ativo ? 'ativo' : 'inativo'].join(' ');
    })).join(' ');
    texto = typeof normalizarTextoBase === 'function' ? normalizarTextoBase(texto) : texto.toLowerCase();
    return !termo || texto.indexOf(termo) >= 0;
  });

  var contador = document.getElementById('contadorEquipesGerenciais');
  if (contador) contador.textContent = filtradas.length + ' equipe' + (filtradas.length === 1 ? '' : 's');
  atualizarSelectEquipesGerenciais_();

  if (!filtradas.length) {
    container.innerHTML = '<div class="empty-state"><h5>Nenhuma equipe encontrada.</h5><p>Cadastre uma equipe para começar a vincular integrantes.</p></div>';
    return;
  }

  container.innerHTML = filtradas.map(renderCardEquipeGerencial_).join('');
}

function renderCardEquipeGerencial_(eq) {
  var membros = Array.isArray(eq.membros) ? eq.membros : [];
  var ativos = membros.filter(function(m) { return m.ativo !== false; }).length;
  var id = escapeJsAttr(eq.id);
  var tipoLabel = eq.tipo === 'secretaria' ? 'Secretaria/GOM' : 'Empresa';
  return [
    '<div class="equipe-gerencial-card ' + (eq.ativo === false ? 'inativa' : '') + '">',
      '<div class="equipe-gerencial-card-head">',
        '<div><strong>' + escapeHtml(eq.nome || 'Equipe sem nome') + '</strong><span>' + escapeHtml(tipoLabel) + ' · ' + ativos + ' integrante(s) ativo(s)</span></div>',
        '<div class="d-flex align-items-center gap-2 flex-wrap">',
          '<span class="badge ' + (eq.ativo === false ? 'bg-secondary' : 'bg-success') + '">' + (eq.ativo === false ? 'Inativa' : 'Ativa') + '</span>',
          '<button type="button" class="btn btn-light border btn-sm fw-bold" onclick="alterarStatusEquipeGerencial(\'' + id + '\',' + (eq.ativo === false ? 'true' : 'false') + ', this)">' + (eq.ativo === false ? '<i class="bi bi-toggle-on me-1"></i>Reativar' : '<i class="bi bi-toggle-off me-1"></i>Inativar') + '</button>',
        '</div>',
      '</div>',
      '<div class="equipe-gerencial-membros">',
        (membros.length ? membros.map(function(m) { return renderLinhaMembroEquipeGerencial_(m); }).join('') : '<div class="text-muted small py-2"><i class="bi bi-person-dash me-1"></i>Nenhum integrante cadastrado nesta equipe.</div>'),
      '</div>',
    '</div>'
  ].join('');
}

function renderLinhaMembroEquipeGerencial_(m) {
  var id = escapeJsAttr(m.id);
  var contato = [m.telefone, m.email].filter(Boolean).join(' · ');
  return [
    '<div class="equipe-membro-row ' + (m.ativo === false ? 'inativo' : '') + '">',
      '<div class="equipe-membro-info">',
        '<strong><i class="bi bi-person-fill me-1"></i>' + escapeHtml(m.nome || 'Sem nome') + '</strong>',
        '<span>' + escapeHtml([m.funcao || 'Função não informada', contato].filter(Boolean).join(' · ')) + '</span>',
      '</div>',
      '<button type="button" class="btn btn-light border btn-sm fw-bold" onclick="alterarStatusMembroEquipeGerencial(\'' + id + '\',' + (m.ativo === false ? 'true' : 'false') + ', this)">' + (m.ativo === false ? '<i class="bi bi-person-check me-1"></i>Reativar' : '<i class="bi bi-person-x me-1"></i>Inativar') + '</button>',
    '</div>'
  ].join('');
}

function salvarEquipeGerencialForm(e) {
  e.preventDefault();
  var form = e.target;
  var botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  var input = document.getElementById('nomeNovaEquipeGerencial');
  var tipoInput = document.getElementById('tipoNovaEquipeGerencial');
  var nome = input ? input.value.trim() : '';
  var tipo = tipoInput ? tipoInput.value : getTipoEquipesGerencialAtual_();
  if (!nome) return;
  if (tipo === 'secretaria' && !usuarioPodeGerenciarEquipeSecretaria_()) {
    alert('Seu perfil pode gerenciar somente equipes da empresa.');
    return;
  }
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando...');
  else if (botao) botao.disabled = true;
  google.script.run
    .withSuccessHandler(function(res) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      var payload = parseJsonEquipes_(res);
      if (!payload.ok) { alert(payload.erro || 'Não foi possível salvar a equipe.'); return; }
      if (input) input.value = '';
      carregarEquipesGerenciais({ forcar: true });
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar a equipe.');
      else alert((err && err.message) || err);
    })
    .gomSalvarEquipeGerencialV1Json({ nome: nome, tipo: tipo });
}

function salvarMembroEquipeGerencialForm(e) {
  e.preventDefault();
  var form = e.target;
  var botao = typeof gomEncontrarBotaoSubmit === 'function' ? gomEncontrarBotaoSubmit(form) : form.querySelector('button[type="submit"], button');
  var equipeId = (document.getElementById('selectEquipeMembroGerencial') || {}).value || '';
  var nome = ((document.getElementById('nomeMembroGerencial') || {}).value || '').trim();
  var funcao = ((document.getElementById('funcaoMembroGerencial') || {}).value || '').trim();
  var telefone = ((document.getElementById('telefoneMembroGerencial') || {}).value || '').trim();
  var email = ((document.getElementById('emailMembroGerencial') || {}).value || '').trim();
  if (!equipeId || !nome) { alert('Selecione a equipe e informe o nome do integrante.'); return; }
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando...');
  else if (botao) botao.disabled = true;
  google.script.run
    .withSuccessHandler(function(res) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      var payload = parseJsonEquipes_(res);
      if (!payload.ok) { alert(payload.erro || 'Não foi possível salvar o integrante.'); return; }
      ['nomeMembroGerencial','funcaoMembroGerencial','telefoneMembroGerencial','emailMembroGerencial'].forEach(function(id) { var el = document.getElementById(id); if (el) el.value = ''; });
      carregarEquipesGerenciais({ forcar: true });
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar o integrante.');
      else alert((err && err.message) || err);
    })
    .gomSalvarMembroEquipeGerencialV1Json({ equipeId: equipeId, nome: nome, funcao: funcao, telefone: telefone, email: email });
}

function alterarStatusEquipeGerencial(id, ativo, botao) {
  if (!id) return;
  if (!ativo && !confirm('Inativar esta equipe? Ela deixará de aparecer nas listas de seleção.')) return;
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, ativo ? 'Reativando...' : 'Inativando...');
  else if (botao) botao.disabled = true;
  google.script.run
    .withSuccessHandler(function(res) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      var payload = parseJsonEquipes_(res);
      if (!payload.ok) { alert(payload.erro || 'Não foi possível alterar a equipe.'); return; }
      carregarEquipesGerenciais({ forcar: true });
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      alert((err && err.message) || err);
    })
    .gomAlterarStatusEquipeGerencialV1Json({ id: id, ativo: ativo });
}

function alterarStatusMembroEquipeGerencial(id, ativo, botao) {
  if (!id) return;
  if (!ativo && !confirm('Inativar este integrante?')) return;
  if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, ativo ? 'Reativando...' : 'Inativando...');
  else if (botao) botao.disabled = true;
  google.script.run
    .withSuccessHandler(function(res) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      var payload = parseJsonEquipes_(res);
      if (!payload.ok) { alert(payload.erro || 'Não foi possível alterar o integrante.'); return; }
      carregarEquipesGerenciais({ forcar: true });
    })
    .withFailureHandler(function(err) {
      if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      else if (botao) botao.disabled = false;
      alert((err && err.message) || err);
    })
    .gomAlterarStatusMembroEquipeGerencialV1Json({ id: id, ativo: ativo });
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
        '<div class="col-md-4"><label class="form-label small fw-bold">Previsão de conclusão</label><input class="form-control form-control-sm gom-date-br-input" type="date" name="dataPrevistaConclusao" value="' + dataPrevInput + '" onchange="gomNormalizarDataBrInput(this)"></div>',
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
        '<input class="form-control form-control-sm gom-date-br-input" type="date" name="dataPrevistaConclusao" form="' + formId + '" value="' + dataPrevInput + '" onchange="gomNormalizarDataBrInput(this)">',
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
  var dataAtendimentoSalva = item.dataAtendimentoRaw || item.dataAtendimento || item.dataEquipeRaw || item.dataEquipe || item.dataEquipeDiaRaw || item.dataEquipeDia || '';
  var dataAtendimentoOriginalIso = dataAtendimentoSalva ? (typeof gomDataParaISO === 'function' ? gomDataParaISO(dataAtendimentoSalva) : String(dataAtendimentoSalva || '').trim()) : '';
  var dataAtendimentoAtual = Object.prototype.hasOwnProperty.call(alterado, 'dataAtendimento')
    ? String(alterado.dataAtendimento || '')
    : empresaHojeIso_();
  var dataAtendimentoInput = escapeHtml(formatarInputDateEmpresa(dataAtendimentoAtual));
  var rowAlterada = Object.prototype.hasOwnProperty.call(window.empresaDiaAlterados || {}, idRaw) ? ' empresa-dia-alterado' : '';
  var alertaOs = st === 'OS emitida' && !numeroOsBruto
    ? '<span class="empresa-os-alert"><i class="bi bi-exclamation-triangle-fill"></i> OS sem número</span>'
    : '';
  var miniaturasAnexos = typeof renderMiniaturasAnexosChamado === 'function' ? renderMiniaturasAnexosChamado(item, 3) : '';

  var equipesEmpresaDisponiveis = Array.isArray(window.listaEquipesEmpresaGlobal)
    ? window.listaEquipesEmpresaGlobal.slice()
    : [];

  // Segurança operacional: a tela da Empresa só pode listar equipes do tipo
  // "empresa". Nunca usar listaEquipesGlobal aqui, pois ela contém as equipes
  // internas da Secretaria/GOM.
  var opts = '<option value="">-- Selecionar equipe da empresa --</option>';
  if (!equipesEmpresaDisponiveis.length) {
    opts = '<option value="">Nenhuma equipe da empresa cadastrada</option>';
  } else {
    equipesEmpresaDisponiveis.forEach(function(e) {
      var nome = String(e && e.nome ? e.nome : e);
      var selected = equipeAtual === nome ? ' selected' : '';
      opts += '<option value="' + escapeHtml(nome) + '"' + selected + '>' + escapeHtml(nome) + '</option>';
    });
  }
  var selectEquipeEmpresaDisabled = equipesEmpresaDisponiveis.length ? '' : ' disabled';

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
      '<form id="' + formId + '" class="empresa-os-form-inline" data-label="Equipe do dia" data-equipe-original="' + escapeHtml(equipeAtual) + '" data-data-original="' + escapeHtml(dataAtendimentoOriginalIso) + '" onsubmit="event.preventDefault(); marcarEncaminhamentoDiaEmpresaAlterado(\'' + idJs + '\')">',
        '<label class="empresa-field-label">Equipe do dia</label>',
        '<select class="form-select form-select-sm fw-bold" name="equipe" required' + selectEquipeEmpresaDisabled + ' onchange="this.dataset.tocado=\'1\';marcarEncaminhamentoDiaEmpresaAlterado(\'' + idJs + '\')">' + opts + '</select>',
        '<label class="empresa-field-label mt-1"><i class="bi bi-calendar3 me-1"></i>Data do atendimento</label>',
        '<input class="form-control form-control-sm gom-date-br-input empresa-data-individual-input" type="date" id="empresaDataAtendimento_' + formIdSeguro + '" name="dataAtendimento" value="' + dataAtendimentoInput + '" data-original="' + escapeHtml(dataAtendimentoOriginalIso) + '" onchange="this.dataset.tocado=\'1\';gomNormalizarDataBrInput(this);marcarEncaminhamentoDiaEmpresaAlterado(\'' + idJs + '\')">',
      '</form>',
      '<div class="empresa-os-observacao-wrap" data-label="Observação do dia">',
        '<label class="empresa-field-label">Observação do dia</label>',
        '<textarea class="form-control form-control-sm empresa-os-obs" form="' + formId + '" name="observacoes" rows="2" placeholder="Observação do dia" oninput="marcarEncaminhamentoDiaEmpresaAlterado(\'' + idJs + '\')">' + escapeHtml(observacaoAtual) + '</textarea>',
      '</div>',
    '</div>'
  ].join('');
}

function renderGerencialOsEmpresa(lista) {
  try { carregarHistoricoCampoEmpresaSePreciso(); } catch(e) {}
  if (!window.empresaGerencialAtualizando) { setTimeout(function(){ carregarGerencialOsEmpresaAtualizado_({ forcar: false }); }, 0); }

  var statusGerencial = gomEmpresaGerencialStatusPermitidos_();
  var listaBase = Array.isArray(lista) ? lista.slice() : [];

  // Blindagem: se algum re-render chegar sem lista, remonta direto da lista global.
  if (!listaBase.length && Array.isArray(window.listaChamadosGlobal)) {
    listaBase = window.listaChamadosGlobal.filter(function(i) {
      return statusGerencial.indexOf(normalizarSituacaoSistema(i.situacao || i.status)) !== -1;
    });
  }

  var resumo = calcularResumoGerencialOsEmpresa(listaBase || []);
  var listaFiltrada = filtrarGerencialOsEmpresa(listaBase || []);
  if (!listaFiltrada.length && listaBase.length) {
    // Blindagem contra filtros/objetos de DOM antigos que ficaram no estado e escondiam toda a lista
    // até o usuário entrar em outra aba e voltar.
    gomEmpresaGerencialResetarFiltros_();
    listaFiltrada = filtrarGerencialOsEmpresa(listaBase || []);
  }
  var buscaAtual = valorCampoGerencial_(window.empresaGerencialBusca || '');

  var avisoAtualizando = window.empresaGerencialAtualizando ? '<div class="alert alert-info py-2 px-3 mb-3"><span class="spinner-border spinner-border-sm me-2"></span>Atualizando dados do Gerencial OS...</div>' : '';
  return [
    '<div class="empresa-gerencial-wrap">',
      avisoAtualizando,
      '<div class="empresa-gerencial-resumo">',
        '<div class="empresa-mini-kpi"><span>OS em acompanhamento</span><strong>' + escapeHtml(resumo.total) + '</strong><small>ordens, emergências e garantias</small></div>',
        resumo.vencidas > 0 ? '<div class="empresa-mini-kpi perigo"><span>Previsão vencida</span><strong>' + escapeHtml(resumo.vencidas) + '</strong><small>atendimentos fora do prazo</small></div>' : '',
      '</div>',
      '<div class="empresa-gerencial-filtros-v7">',
        '<div class="input-group empresa-gerencial-busca"><span class="input-group-text bg-light border-end-0"><i class="bi bi-search"></i></span><input id="empresaGerencialBusca" type="text" class="form-control border-start-0" placeholder="Buscar unidade, OS, equipe ou descrição..." value="' + escapeHtml(buscaAtual) + '" oninput="setEmpresaGerencialBusca(this)"></div>',
        '<select class="form-select" id="empresaGerencialStatus" onchange="setEmpresaGerencialStatus(this)">' + montarOptionsGerencialEmpresa(['Todos','OS emitida','Atendimento Emergencial','Garantia de Obra'], window.empresaGerencialStatus || 'Todos') + '</select>',
        '<select class="form-select" id="empresaGerencialPrazo" onchange="setEmpresaGerencialPrazo(this)">' + montarOptionsGerencialEmpresa(['Todos','Vencidas','Sem previsão','No prazo'], window.empresaGerencialPrazo || 'Todos') + '</select>',
        '<button type="button" class="btn btn-light border fw-bold" onclick="limparFiltrosGerencialEmpresa()"><i class="bi bi-x-circle me-1"></i>Limpar</button>',
        '<button type="button" class="btn btn-primary fw-bold" onclick="carregarGerencialOsEmpresaAtualizado_({forcar:true})"><i class="bi bi-arrow-clockwise me-1"></i>Atualizar</button>',
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
          '<input class="form-control form-control-sm gom-date-br-input" type="date" name="dataPrevistaConclusao" value="' + dataPrevInput + '" data-original="' + dataPrevInput + '" onchange="gomNormalizarDataBrInput(this);salvarPrevisaoGerencialOsFront(this,\'' + idJs + '\')">',
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
  if (payload.dataAtendimento) payload.dataAtendimento = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAtendimento) : payload.dataAtendimento;
  if (payload.dataAtendimento) { payload.dataEquipe = payload.dataAtendimento; payload.dataEquipeDia = payload.dataAtendimento; }
  if (payload.dataPrevistaConclusao && typeof gomDataParaISO === 'function') payload.dataPrevistaConclusao = gomDataParaISO(payload.dataPrevistaConclusao);

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
  if (payload.dataAtendimento) payload.dataAtendimento = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAtendimento) : payload.dataAtendimento;
  if (payload.dataAtendimento) { payload.dataEquipe = payload.dataAtendimento; payload.dataEquipeDia = payload.dataAtendimento; }

  google.script.run
    .withSuccessHandler(function() {
      aplicarEquipeDiaEmpresaLocal_(payload);
      refreshChamados(function() {
        if (window.telaAtual === 'empresa' && typeof renderizarTela === 'function') renderizarTela();
        if (window.telaAtual === 'campo' && typeof refreshCampo === 'function') refreshCampo();
      });
    })
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
  var valorVisual = String(input.value || '');
  var valor = typeof gomDataParaISO === 'function' ? gomDataParaISO(valorVisual) : valorVisual;
  var original = typeof gomDataParaISO === 'function' ? gomDataParaISO(input.getAttribute('data-original') || '') : String(input.getAttribute('data-original') || '');
  if (valorVisual && !valor) {
    alert('Data inválida. Use o formato dd/mm/aaaa.');
    return;
  }
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
      input.setAttribute('data-original', typeof gomDataParaBR === 'function' ? gomDataParaBR(valor) : valor);
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
  if (payload.dataAtendimento) payload.dataAtendimento = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAtendimento) : payload.dataAtendimento;
  if (payload.dataAtendimento) { payload.dataEquipe = payload.dataAtendimento; payload.dataEquipeDia = payload.dataAtendimento; }
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
  if (payload.dataAtendimento) payload.dataAtendimento = typeof gomDataParaISO === 'function' ? gomDataParaISO(payload.dataAtendimento) : payload.dataAtendimento;
  if (payload.dataAtendimento) { payload.dataEquipe = payload.dataAtendimento; payload.dataEquipeDia = payload.dataAtendimento; }
  // Capturar data de agendamento do input fora do form (vinculado via form=)

  try {
    payload.anexosServico = await arquivosInputParaBase64(form.querySelector('[name="anexosServico"]'));
    google.script.run
      .withSuccessHandler(function() {
        if (typeof window.gomAtualizarChamadoLocal === 'function') {
          window.gomAtualizarChamadoLocal(id, { situacao: 'Serviço Realizado' });
        }
        gomEmpresaGerencialResetarFiltros_();
        refreshChamados(function() {
          try { carregarHistoricoCampoEmpresaSePreciso({ forcar: true }); } catch(e) {}
          if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
          else if (botao) botao.disabled = false;
          if (window.telaAtual === 'empresa' && typeof renderizarTela === 'function') renderizarTela();
        });
      })
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
  // Compatibilidade com a versão antiga da aba Equipes.
  renderizarListaEquipesGerenciais();
}

function salvarEquipeForm(e) {
  // Compatibilidade com a versão antiga da aba Equipes.
  return salvarEquipeGerencialForm(e);
}

function formatarInputDateEmpresa(valor) {
  if (!valor) return '';
  if (typeof gomDataParaISO === 'function') return gomDataParaISO(valor);
  if (typeof valor === 'number') {
    var dNum = new Date(valor);
    if (!isNaN(dNum.getTime())) return dNum.getFullYear() + '-' + String(dNum.getMonth()+1).padStart(2,'0') + '-' + String(dNum.getDate()).padStart(2,'0');
  }
  var s = String(valor || '').trim();
  var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];
  var br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return br[3] + '-' + String(br[2]).padStart(2,'0') + '-' + String(br[1]).padStart(2,'0');
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
window.renderAgendaAcompanhamentoEmpresa = renderAgendaAcompanhamentoEmpresa;
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
window.setTipoEquipesGerencial = setTipoEquipesGerencial;
window.carregarEquipesGerenciais = carregarEquipesGerenciais;
window.renderizarListaEquipesGerenciais = renderizarListaEquipesGerenciais;
window.inicializarGerenciamentoEquipes = inicializarGerenciamentoEquipes;
window.salvarEquipeGerencialForm = salvarEquipeGerencialForm;
window.salvarMembroEquipeGerencialForm = salvarMembroEquipeGerencialForm;
window.alterarStatusEquipeGerencial = alterarStatusEquipeGerencial;
window.alterarStatusMembroEquipeGerencial = alterarStatusMembroEquipeGerencial;
