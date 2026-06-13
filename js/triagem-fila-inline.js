/* ==========================================================
   GOM v6.0 - Patch final Triagem/Fila em lista com edição inline
   Carregar este arquivo por ÚLTIMO no Index.html.
   Objetivo: forçar Triagem e Fila a usarem a mesma base visual da
   Execução Diária da Empresa, com edição diretamente na linha.
   ========================================================== */
(function gomTriagemFilaInlinePatchV6(){
  'use strict';

  window.gomTriagemFilaInlinePatchV6 = true;

  function gomGetTelaAtual_() {
    return window.telaAtual || (typeof telaAtual !== 'undefined' ? telaAtual : 'dashboard');
  }

  function gomSetTelaAtual_(valor) {
    window.telaAtual = valor;
    try { if (typeof telaAtual !== 'undefined') telaAtual = valor; } catch(e) {}
  }

  function gomHtml_(valor) {
    return typeof escapeHtml === 'function' ? escapeHtml(valor) : String(valor == null ? '' : valor)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function gomJs_(valor) {
    return typeof escapeJsAttr === 'function' ? escapeJsAttr(valor) : String(valor == null ? '' : valor).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
  }

  function gomNormalizar_(valor) {
    return typeof normalizarSituacaoSistema === 'function' ? normalizarSituacaoSistema(valor) : String(valor || '').trim();
  }

  function gomTexto_(valor) {
    return typeof normalizarTextoBase === 'function' ? normalizarTextoBase(valor) : String(valor || '').toLowerCase().trim();
  }

  function gomCorStatus_(st) {
    return typeof getCorStatus === 'function' ? getCorStatus(st) : 'var(--primary)';
  }

  function gomClasseStatus_(st) {
    return typeof getClasseStatus === 'function' ? getClasseStatus(st) : 'st-default';
  }

  function gomResumo_(valor, limite) {
    var texto = String(valor || '').replace(/\s+/g, ' ').trim();
    limite = Number(limite || 135);
    if (!texto) return '';
    if (texto.length <= limite) return texto;
    return texto.slice(0, limite - 1).trim() + '…';
  }

  function gomFormatarDataInput_(valor) {
    if (typeof formatarInputDate === 'function') return formatarInputDate(valor);
    if (typeof gomFormatarInputDateModal_ === 'function') return gomFormatarInputDateModal_(valor);
    return String(valor || '').trim();
  }

  function gomStatusPermitidos_(item, contexto) {
    var st = gomNormalizar_(item && (item.situacao || item.status));
    if (contexto === 'triagem' || st === 'Em análise') {
      return ['Atendimento Emergencial', 'Solicitado Orçamento', 'Aguardando visita', 'Garantia de Obra', 'Devolvido para a escola'];
    }
    if (contexto === 'fila' || st === 'Aguardando visita' || st === 'Em atendimento') {
      return ['Em atendimento', 'Atendimento Emergencial', 'Solicitado Orçamento', 'Garantia de Obra', 'Devolvido para a escola'];
    }
    return window.STATUS_TODOS || [st];
  }

  function gomTfDataAgendaISO_(item) {
    item = item || {};
    var v = item.dataAgendamentoVisitaRaw || item.dataAgendamentoVisita || item.data_agendamento_visita || item.dataVisita || item.data_visita || '';
    if (typeof gomDataParaISO === 'function') return gomDataParaISO(v);
    var str = String(v || '').trim();
    var mIso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (mIso) return mIso[1] + '-' + mIso[2] + '-' + mIso[3];
    var mBr = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (mBr) return mBr[3] + '-' + String(mBr[2]).padStart(2,'0') + '-' + String(mBr[1]).padStart(2,'0');
    return '';
  }

  function gomTfDataAgendaBR_(item) {
    var iso = gomTfDataAgendaISO_(item);
    if (!iso) return '';
    return typeof gomDataParaBR === 'function' ? gomDataParaBR(iso) : iso.replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3/$2/$1');
  }

  function gomTfStatusExigeObsAnexo_(status, contexto) {
    if (contexto !== 'fila') return true;
    var t = gomTexto_(gomNormalizar_(status));
    return t.indexOf('orcamento') >= 0 || t.indexOf('emergencial') >= 0 || t.indexOf('os emitida') >= 0 || t.indexOf('devolvido') >= 0;
  }

  function gomTfStatusUsaEquipeDataVisita_(status, contexto) {
    if (contexto !== 'fila') return false;
    var t = gomTexto_(gomNormalizar_(status));
    // Fluxo correto: Aguardando visita é a fila de espera; ao escolher
    // "Em atendimento" a Secretaria define equipe e data da visita.
    return t === 'em atendimento';
  }

  function gomOptionsStatus_(item, contexto) {
    var atual = gomNormalizar_(item && (item.situacao || item.status));
    var vistos = {};
    // Triagem: não mostrar "Em análise" como opção — só as transições
    var baseList = contexto === 'triagem' ? [] : [atual];
    var lista = baseList.concat(gomStatusPermitidos_(item, contexto)).map(gomNormalizar_).filter(function(s) {
      if (!s || vistos[s]) return false;
      vistos[s] = true;
      return true;
    });
    var placeholder = contexto === 'triagem'
      ? '<option value="" disabled selected>-- Selecionar encaminhamento --</option>'
      : '';
    return placeholder + lista.map(function(s) {
      return '<option value="' + gomHtml_(s) + '"' + (s === atual ? ' selected' : '') + '>' + gomHtml_(s) + '</option>';
    }).join('');
  }

  function gomResumoAnexos_(item) {
    var total = 0;
    try {
      if (typeof extrairLinksAnexos === 'function') {
        total += extrairLinksAnexos(item.anexosSolicitacao || item.anexos).length;
        total += extrairLinksAnexos(item.anexosOrcamento).length;
        total += extrairLinksAnexos(item.anexosServico).length;
      }
    } catch(e) {}
    if (!total) return '<div class="empresa-os-meta-line text-muted"><i class="bi bi-paperclip"></i><strong>Anexos:</strong> nenhum</div>';
    return '<div class="empresa-os-meta-line"><i class="bi bi-paperclip"></i><strong>Anexos:</strong> ' + total + ' arquivo(s)</div>';
  }

  function gomAbrirModalLinha_(event, id) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (typeof abrirModalAnalise === 'function') abrirModalAnalise(id);
  }

  window.gomAbrirModalLinhaTriagemFilaV6 = gomAbrirModalLinha_;


  function gomTfRemoverKpiEntradaHojeFila_() {
    try {
      var tela = gomGetTelaAtual_();
      if (tela !== 'fila') return;
      if ((window.statusFiltroClicado || (typeof statusFiltroClicado !== 'undefined' ? statusFiltroClicado : null)) === 'Entrada hoje') {
        window.statusFiltroClicado = null;
        try { if (typeof statusFiltroClicado !== 'undefined') statusFiltroClicado = null; } catch(e) {}
      }
      var grid = document.getElementById('kpiGrid');
      if (!grid) return;
      Array.prototype.slice.call(grid.querySelectorAll('.kpi-box')).forEach(function(card) {
        var titulo = card.querySelector('.kpi-title');
        if (titulo && String(titulo.textContent || '').trim().toLowerCase() === 'entrada hoje') card.remove();
      });
    } catch(e) {}
  }

  function gomRenderLinhaEditavel_(item, index, contexto) {
    item = item || {};
    var idOriginal = String(item.id || '').trim();
    var idSeguro = idOriginal.replace(/[^A-Za-z0-9_-]/g, '_');
    var id = gomHtml_(idOriginal || '-');
    var idJs = gomJs_(idOriginal);
    var formId = 'gomTfForm_' + idSeguro;
    var statusId = 'gomTfStatus_' + idSeguro;

    var obsId = 'gomTfObs_' + idSeguro;
    var anexosId = 'gomTfAnexos_' + idSeguro;

    var st = gomNormalizar_(item.situacao || item.status);
    var classe = gomClasseStatus_(st);
    var cor = gomCorStatus_(st);
    var unidade = gomHtml_(item.unidade || 'Unidade não informada');
    var tipo = gomHtml_(item.tipo || 'Sem tipo');
    var origem = gomHtml_(item.sistema || item.origem || item.solicitacao || 'Solicitação');
    var dataAbertura = gomHtml_(item.dataHora || item.data || 'Sem data');
    var detalhe = gomHtml_(item.detalhamento || 'Sem detalhamento informado.');
    var detalheCurto = gomHtml_(gomResumo_(item.detalhamento || 'Sem detalhamento informado.', 145));
    var obsAtuais = gomHtml_(gomResumo_(item.observacoes || item.observacaoAntiga || 'Sem observações registradas.', 140));
    var ehFila = contexto === 'fila';
    var posicao = String(index + 1).padStart(2, '0');
    var entradaFila = gomHtml_(item.dataHoraEntradaFila || item.dataEntradaFila || item.dataHoraEncaminhamento || item.dataHoraUltimaAcao || item.dataHora || item.data || 'Sem data');
    var tempoFila = gomHtml_(typeof formatarTempoFila === 'function' ? formatarTempoFila(typeof parseDataOrdenacao === 'function' ? parseDataOrdenacao(item) : null) : '');
    var precisaRevisar = ehFila && typeof deveRevisarFila === 'function' && deveRevisarFila(item);
    var avisoFila = precisaRevisar
      ? '<span class="empresa-os-alert"><i class="bi bi-exclamation-triangle-fill"></i> Revisar entrada</span>'
      : (ehFila ? '<span class="badge-soft"><i class="bi bi-sort-down"></i> Ordem ' + posicao + '</span>' : '');
    var dataAgendaISO = gomTfDataAgendaISO_(item);
    var dataAgendaBR = gomHtml_(gomTfDataAgendaBR_(item));
    var extrasVisiveis = gomTfStatusExigeObsAnexo_(st, contexto);
    var usaCamposVisita = gomTfStatusUsaEquipeDataVisita_(st, contexto);

    return [
      '<div class="empresa-os-list-row empresa-os-list-row-v2 ' + classe + ' gom-tf-row-v6 ' + (extrasVisiveis ? 'gom-tf-row-com-extra' : 'gom-tf-row-sem-extra') + '" id="gomTfLinha_' + gomHtml_(idSeguro) + '" style="--card-accent:' + cor + ';">',

        '<div class="empresa-os-unidade gom-tf-unidade" data-label="' + (ehFila ? 'Ordem / unidade' : 'Unidade / descrição') + '">',
          '<details class="empresa-expand">',
            '<summary>',
              '<span class="empresa-unidade-link gom-tf-unidade-nome">' + unidade + '</span>',
              '<span class="empresa-os-id">#' + id + '</span>',
            '</summary>',
            '<div class="empresa-expand-body">',
              '<div class="card-detail mb-2">' + detalhe + '</div>',
              item.tipo    ? '<div class="empresa-os-meta-line"><i class="bi bi-tag"></i><strong>Tipo:</strong> ' + tipo + '</div>' : '',
              item.sistema || item.origem ? '<div class="empresa-os-meta-line"><i class="bi bi-send"></i><strong>Origem:</strong> ' + origem + '</div>' : '',
              '<div class="empresa-os-meta-line"><i class="bi bi-calendar3"></i><strong>Abertura:</strong> ' + dataAbertura + '</div>',
              item.observacoes ? '<div class="empresa-os-meta-line"><i class="bi bi-chat-left-text"></i><strong>Obs:</strong> ' + gomHtml_(gomResumo_(item.observacoes, 220)) + '</div>' : '',
              item.valorOrcamento ? '<div class="empresa-os-meta-line"><i class="bi bi-cash-coin"></i><strong>Orçamento:</strong> ' + gomHtml_(String(item.valorOrcamento)) + '</div>' : '',
              item.equipe ? '<div class="empresa-os-meta-line"><i class="bi bi-people"></i><strong>Equipe:</strong> ' + gomHtml_(item.equipe) + '</div>' : '',
              dataAgendaBR ? '<div class="empresa-os-meta-line"><i class="bi bi-calendar-check"></i><strong>Visita:</strong> ' + dataAgendaBR + '</div>' : '',
              '<div class="mt-2"><button type="button" class="btn btn-light btn-sm border fw-bold" onclick="gomAbrirModalLinhaTriagemFilaV6(event,\''+idJs+'\')"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir chamado completo</button></div>',
            '</div>',
          '</details>',
          '<div class="empresa-os-desc">' + detalheCurto + '</div>',
          '<div class="empresa-os-meta-line gom-tf-obs-atual"><i class="bi bi-chat-left-text"></i><strong>Observações:</strong> ' + obsAtuais + '</div>',
        '</div>',

        '<div class="empresa-os-info gom-tf-status" data-label="Status / equipe / data">',
          '<div class="gom-tf-status-top">',
            '<div class="empresa-os-status"><span class="badge-status">' + gomHtml_(st) + '</span>' + avisoFila + '</div>',
            '<div class="gom-tf-status-meta">',
              '<span><i class="bi bi-building"></i><strong>Tipo:</strong> ' + tipo + '</span>',
              ehFila
                ? '<span><i class="bi bi-calendar3"></i><strong>Entrada:</strong> ' + entradaFila + '</span><span><i class="bi bi-stopwatch"></i><strong>Tempo:</strong> ' + tempoFila + '</span>'
                : '<span><i class="bi bi-send"></i><strong>Origem:</strong> ' + origem + '</span><span><i class="bi bi-calendar3"></i><strong>Abertura:</strong> ' + dataAbertura + '</span>',
            '</div>',
          '</div>',
          '<div class="gom-tf-fields-compact ' + (ehFila ? 'gom-tf-fields-fila' : 'gom-tf-fields-triagem') + ' ' + (ehFila && !usaCamposVisita ? 'gom-tf-fields-sem-visita' : '') + '">',
            '<div class="gom-tf-field-group gom-tf-field-status">',
              '<label class="empresa-field-label"><i class="bi bi-arrow-left-right me-1"></i>Alterar situação</label>',
              '<select class="form-select form-select-sm fw-bold" id="' + statusId + '" name="situacao" form="' + formId + '" data-id="' + gomHtml_(idOriginal) + '" data-contexto="' + contexto + '" onchange="gomTfAtualizarBlocoObsAnexosV6(\'' + idJs + '\');gomTfMarcarLinhaAlteradaV6(\'' + idJs + '\')">'
                + gomOptionsStatus_(item, contexto) + '</select>',
            '</div>',
            ehFila ? (
              '<div id="gomTfVisitaFields_' + idSeguro + '" class="gom-tf-visita-fields ' + (usaCamposVisita ? '' : 'gom-tf-visita-hidden') + '">' +
                '<div class="gom-tf-field-group gom-tf-field-equipe">' +
                  '<label class="empresa-field-label"><i class="bi bi-people me-1"></i>Equipe da visita</label>' +
                  '<select class="form-select form-select-sm" id="gomTfEquipe_' + idSeguro + '" name="equipe" form="' + formId + '" onchange="gomTfMarcarLinhaAlteradaV6(\'' + idJs + '\')">'+
                  '<option value="">-- Selecionar equipe --</option>' +
                  (window.listaEquipesGlobal || []).map(function(eq) {
                    return '<option value="' + gomHtml_(eq) + '"' + (item.equipe === eq ? ' selected' : '') + '>' + gomHtml_(eq) + '</option>';
                  }).join('') +
                  '</select>' +
                '</div>' +
                '<div class="gom-tf-field-group gom-tf-field-data">' +
                  '<label class="empresa-field-label"><i class="bi bi-calendar3 me-1"></i>Data da visita</label>' +
                  '<div class="gom-tf-date-line"><input class="form-control form-control-sm gom-date-br-input gom-tf-data-individual" type="date" id="gomTfData_' + idSeguro + '" name="dataAgendamentoVisita" form="' + formId + '" value="' + gomHtml_(dataAgendaISO) + '" data-original="' + gomHtml_(dataAgendaISO) + '" data-contexto="' + contexto + '" onchange="gomNormalizarDataBrInput(this);gomTfMarcarLinhaAlteradaV6(\'' + idJs + '\')"></div>' +
                '</div>' +
              '</div>'
            ) : '',
          '</div>',
        '</div>',

        '<form id="' + formId + '" class="empresa-os-observacao-wrap gom-tf-form gom-tf-extra-form ' + (extrasVisiveis ? '' : 'gom-tf-extra-hidden') + '" data-label="Observações / anexos" data-extra-contexto="' + contexto + '" onsubmit="gomTfSalvarLinhaV6(event,\'' + idJs + '\')">',
          '<label class="empresa-field-label"><i class="bi bi-chat-left-text me-1"></i>Nova observação</label>',
          '<textarea class="form-control form-control-sm empresa-os-obs" id="' + obsId + '" name="observacoes" rows="2" placeholder="Registrar observação do trâmite..." oninput="gomTfMarcarLinhaAlteradaV6(\'' + idJs + '\')"></textarea>',
          '<label class="empresa-field-label mt-1"><i class="bi bi-paperclip me-1"></i>Adicionar anexos ao chamado</label>',
          '<input class="form-control form-control-sm" type="file" id="' + anexosId + '" name="anexos" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" onchange="gomTfMarcarLinhaAlteradaV6(\'' + idJs + '\')">',
          gomResumoAnexos_(item),
        '</form>',

      '</div>'
    ].join('');
  }

  function gomRenderLista_(lista, contexto) {
    var ehFila = contexto === 'fila';
    return [
      '<div class="empresa-lista-os empresa-lista-compacta empresa-lista-dia-v2 empresa-lista-dia-sem-acao gom-tf-lista-v6 ' + (ehFila ? 'gom-tf-fila-v6' : 'gom-tf-triagem-v6') + '">',
        '<div class="empresa-lista-head empresa-lista-head-v2 gom-tf-head-v6">',
          '<div>' + (ehFila ? 'Ordem / unidade' : 'Unidade / descrição') + '</div>',
          '<div>Status e encaminhamento</div>',
          '<div>' + (ehFila ? 'Observação / anexos apenas quando necessário' : 'Nova observação / anexos') + '</div>',
        '</div>',
        (lista || []).map(function(item, idx) { return gomRenderLinhaEditavel_(item, idx, contexto); }).join(''),
      '</div>',
      // Barra flutuante de salvar — igual à Empresa e Configurações.
      // Só aparece quando há alterações pendentes.
      '<div class="empresa-dia-save-bar gom-tf-save-bar" id="gomTfSaveBar_' + contexto + '" style="display:none;">',
        '<div>',
          '<strong><i class="bi bi-pencil-square me-1"></i>Alterações pendentes</strong>',
          '<span id="gomTfSaveBarText_' + contexto + '">Nenhuma alteração pendente.</span>',
        '</div>',
        '<div class="d-flex gap-2 flex-wrap justify-content-end">',
          '<button class="btn btn-light border fw-bold btn-sm" type="button" onclick="gomTfDescartarTodasV6(\'' + contexto + '\')"><i class="bi bi-x-circle me-1"></i>Descartar</button>',
          '<button class="btn btn-primary fw-bold btn-sm" type="button" onclick="gomTfSalvarTodasV6(\'' + contexto + '\')"><i class="bi bi-check2-circle me-1"></i>Salvar alterações</button>',
        '</div>',
      '</div>'
    ].join('');
  }

  window.renderListaTriagemOperacional = function(lista) { return gomRenderLista_(lista, 'triagem'); };
  window.renderListaFilaOperacional = function(lista) { return gomRenderLista_(lista, 'fila'); };


  // ── BUFFER DE ALTERAÇÕES (igual Empresa/Config) ──────────────────────────────
  // Guarda só os chamados que tiveram mudança real. A barra flutuante mostra
  // quantos e quais. Salvar dispara um único lote. Mudança de tela é otimista.
  window.gomTfAlteracoes = window.gomTfAlteracoes || {}; // { id: { contexto, situacao, observacoes, temAnexo } }

  window.gomTfAtualizarBlocoObsAnexosV6 = function(id) {
    id = String(id || '').trim();
    if (!id) return;
    var idSeguro = id.replace(/[^A-Za-z0-9_-]/g, '_');
    var contexto = gomGetTelaAtual_() === 'fila' ? 'fila' : 'triagem';
    var select = document.getElementById('gomTfStatus_' + idSeguro);
    var form = document.getElementById('gomTfForm_' + idSeguro);
    if (!form || !select) return;
    var mostrar = gomTfStatusExigeObsAnexo_(select.value, contexto);
    var usarVisita = gomTfStatusUsaEquipeDataVisita_(select.value, contexto);
    form.classList.toggle('gom-tf-extra-hidden', !mostrar);
    var blocoVisita = document.getElementById('gomTfVisitaFields_' + idSeguro);
    if (blocoVisita) blocoVisita.classList.toggle('gom-tf-visita-hidden', !usarVisita);
    var linha = document.getElementById('gomTfLinha_' + idSeguro);
    if (linha) {
      linha.classList.toggle('gom-tf-row-sem-extra', !mostrar);
      linha.classList.toggle('gom-tf-row-com-extra', mostrar);
    }
    var fields = linha ? linha.querySelector('.gom-tf-fields-compact') : null;
    if (fields) fields.classList.toggle('gom-tf-fields-sem-visita', !usarVisita);
    if (!usarVisita) {
      var equipEl = document.getElementById('gomTfEquipe_' + idSeguro);
      var dataEl = document.getElementById('gomTfData_' + idSeguro);
      if (equipEl) equipEl.value = '';
      if (dataEl) dataEl.value = '';
    }
  };

  window.gomTfMarcarLinhaAlteradaV6 = function(id) {
    id = String(id || '').trim();
    if (!id) return;
    var idSeguro = id.replace(/[^A-Za-z0-9_-]/g, '_');
    var contexto = gomGetTelaAtual_() === 'fila' ? 'fila' : 'triagem';

    var select = document.getElementById('gomTfStatus_' + idSeguro);
    var obsEl = document.getElementById('gomTfObs_' + idSeguro);
    var anexosEl = document.getElementById('gomTfAnexos_' + idSeguro);
    var dataEl = document.getElementById('gomTfData_' + idSeguro);

    var chamadoAtual = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id || '').trim() === id; }) || {};
    var statusAtual = gomNormalizar_(chamadoAtual.situacao || chamadoAtual.status);
    var novoStatus = select ? gomNormalizar_(select.value) : '';
    var extrasPermitidos = gomTfStatusExigeObsAnexo_(novoStatus, contexto);
    var usarVisita = gomTfStatusUsaEquipeDataVisita_(novoStatus, contexto);
    var obs = (extrasPermitidos && obsEl) ? String(obsEl.value || '').trim() : '';
    var temAnexo = !!(extrasPermitidos && anexosEl && anexosEl.files && anexosEl.files.length);

    var equipEl = document.getElementById('gomTfEquipe_' + idSeguro);
    var equipe = equipEl ? String(equipEl.value || '').trim() : '';
    var dataOriginal = dataEl ? String(dataEl.getAttribute('data-original') || '') : '';
    var dataValor = dataEl ? (typeof gomDataParaISO === 'function' ? gomDataParaISO(dataEl.value || '') : String(dataEl.value || '').trim()) : '';
    var dataMudou = !!(contexto === 'fila' && usarVisita && dataValor && dataValor !== dataOriginal);
    var statusMudou = novoStatus && novoStatus !== statusAtual;
    var equipeMudou = !!(contexto === 'fila' && usarVisita && equipe && equipe !== String(chamadoAtual.equipe || '').trim());
    var temMudanca = statusMudou || obs || temAnexo || equipeMudou || dataMudou;

    var linha = document.getElementById('gomTfLinha_' + idSeguro);

    if (temMudanca) {
      window.gomTfAlteracoes[id] = {
        contexto: contexto,
        situacao: statusMudou ? novoStatus : '',
        observacoes: obs,
        temAnexo: temAnexo,
        equipe: equipeMudou ? equipe : '',
        dataAgendamentoVisita: dataMudou ? dataValor : ''
      };
      if (linha) {
        if (!linha.dataset.accentOriginal) linha.dataset.accentOriginal = linha.style.getPropertyValue('--card-accent') || 'var(--primary)';
        linha.classList.add('gom-tf-alterada');
        linha.style.setProperty('--card-accent', '#0ea5e9');
      }
    } else {
      delete window.gomTfAlteracoes[id];
      if (linha) {
        linha.classList.remove('gom-tf-alterada');
        if (linha.dataset.accentOriginal) linha.style.setProperty('--card-accent', linha.dataset.accentOriginal);
        delete linha.dataset.accentOriginal;
      }
    }
    gomTfAtualizarBarraV6(contexto);
  };

  function gomTfAtualizarBarraV6(contexto) {
    var bar = document.getElementById('gomTfSaveBar_' + contexto);
    if (!bar) return;
    var ids = Object.keys(window.gomTfAlteracoes).filter(function(id) {
      return window.gomTfAlteracoes[id].contexto === contexto;
    });
    var txt = document.getElementById('gomTfSaveBarText_' + contexto);
    if (txt) {
      if (!ids.length) {
        txt.textContent = 'Nenhuma alteração pendente.';
      } else {
        // Mostra quantos e um resumo de quais (unidades)
        var nomes = ids.slice(0, 3).map(function(id) {
          var c = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id || '').trim() === id; }) || {};
          return '#' + id + ' ' + (c.unidade ? String(c.unidade).slice(0, 20) : '');
        });
        var resumo = nomes.join(', ') + (ids.length > 3 ? ' e mais ' + (ids.length - 3) : '');
        txt.textContent = ids.length + ' alteração(ões): ' + resumo;
      }
    }
    bar.style.display = ids.length ? 'flex' : 'none';
  }

  window.gomTfDescartarTodasV6 = function(contexto) {
    var ids = Object.keys(window.gomTfAlteracoes).filter(function(id) { return window.gomTfAlteracoes[id].contexto === contexto; });
    if (!ids.length) return;
    if (!confirm('Descartar ' + ids.length + ' alteração(ões) não salva(s)?')) return;
    ids.forEach(function(id) { delete window.gomTfAlteracoes[id]; });
    gomTfAtualizarBarraV6(contexto);
    if (typeof window.renderizarTela === 'function') window.renderizarTela();
  };

  // Salva TODAS as alterações pendentes em lote (1 chamada ao backend).
  // Depois aplica a mudança localmente (otimista) — o chamado muda de tela na hora.
  window.gomTfSalvarTodasV6 = async function(contexto) {
    var ids = Object.keys(window.gomTfAlteracoes).filter(function(id) { return window.gomTfAlteracoes[id].contexto === contexto; });
    if (!ids.length) { alert('Nenhuma alteração para salvar.'); return; }

    var bar = document.getElementById('gomTfSaveBar_' + contexto);
    var btnSalvar = bar ? bar.querySelector('.btn-primary') : null;

    // Triagem mantém data global. Fila usa a data individual de cada card;
    // o botão 'Aplicar para todos' apenas preenche os cards visíveis.
    var inputData = document.getElementById('gomTfDataGlobal_' + contexto);
    var dataGlobal = (contexto === 'triagem' && inputData && inputData.value)
      ? (typeof gomDataParaISO === 'function' ? gomDataParaISO(inputData.value) : inputData.value)
      : '';

    // Monta os payloads e coleta anexos (anexos exigem await)
    var payloads = [];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var idSeguro = id.replace(/[^A-Za-z0-9_-]/g, '_');
      var alteracao = window.gomTfAlteracoes[id];
      var anexosEl = document.getElementById('gomTfAnexos_' + idSeguro);
      var payload = { id: id };
      var equipeAtualLinha = document.getElementById('gomTfEquipe_' + idSeguro);
      var dataAtualLinha = document.getElementById('gomTfData_' + idSeguro);
      var equipeSelecionadaLinha = equipeAtualLinha ? String(equipeAtualLinha.value || '').trim() : '';
      var dataSelecionadaLinha = dataAtualLinha ? (typeof gomDataParaISO === 'function' ? gomDataParaISO(dataAtualLinha.value || '') : String(dataAtualLinha.value || '').trim()) : '';

      if (contexto === 'fila' && gomNormalizar_(alteracao.situacao) === 'Em atendimento') {
        if (!equipeSelecionadaLinha || !dataSelecionadaLinha) {
          alert('Para mover o chamado #' + id + ' para Em atendimento, selecione a equipe da Secretaria e a data da visita.');
          return;
        }
        payload.equipe = equipeSelecionadaLinha;
        payload.dataAgendamentoVisita = dataSelecionadaLinha;
        payload.dataAgendamento = dataSelecionadaLinha;
        payload.dataVisita = dataSelecionadaLinha;
      }

      if (alteracao.situacao) payload.situacao = alteracao.situacao;
      if (alteracao.equipe && !payload.equipe) payload.equipe = alteracao.equipe;
      if (alteracao.observacoes) payload.observacoes = alteracao.observacoes;
      if (contexto === 'triagem' && dataGlobal) { payload.dataAgendamentoVisita = dataGlobal; payload.dataAgendamento = dataGlobal; payload.dataVisita = dataGlobal; }
      if (contexto === 'fila' && alteracao.dataAgendamentoVisita) { payload.dataAgendamentoVisita = alteracao.dataAgendamentoVisita; payload.dataAgendamento = alteracao.dataAgendamentoVisita; payload.dataVisita = alteracao.dataAgendamentoVisita; }
      if (alteracao.temAnexo && anexosEl && anexosEl.files && anexosEl.files.length) {
        try {
          payload.anexos = await arquivosInputParaBase64(anexosEl);
        } catch (e) {
          if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(e, 'Falha ao preparar anexos de #' + id);
          else alert('Falha ao preparar anexos de #' + id);
          return;
        }
      }
      payloads.push(payload);
    }

    // Aplica OTIMISTA antes da resposta — tela responde na hora
    function aplicarOtimista() {
      payloads.forEach(function(p) {
        var campos = {};
        if (p.situacao) campos.situacao = p.situacao;
        if (p.observacoes) {
          var c = (window.listaChamadosGlobal || []).find(function(x) { return String(x.id||'').trim() === p.id; }) || {};
          campos.observacoes = (c.observacoes ? c.observacoes + '\n' : '') + p.observacoes;
        }
        if (p.dataAgendamentoVisita) { campos.dataAgendamentoVisita = p.dataAgendamentoVisita; campos.dataAgendamentoVisitaRaw = p.dataAgendamentoVisita; campos.dataAgendamento = p.dataAgendamentoVisita; campos.dataVisita = p.dataAgendamentoVisita; }
        if (p.equipe) campos.equipe = p.equipe;
        if (typeof window.gomAtualizarChamadoLocal === 'function' && Object.keys(campos).length) {
          window.gomAtualizarChamadoLocal(p.id, campos);
        }
      });
    }

    function executarSave_() {
      if (typeof gomSetButtonLoading === 'function') gomSetButtonLoading(btnSalvar, 'Salvando ' + payloads.length + '...');
      else if (btnSalvar) btnSalvar.disabled = true;
      google.script.run
        .withSuccessHandler(function(res) {
          var retorno = (typeof res === 'string') ? JSON.parse(res) : res;
          if (typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(btnSalvar, 'Salvo');
          else if (btnSalvar) btnSalvar.disabled = false;
          ids.forEach(function(id) { delete window.gomTfAlteracoes[id]; });
          aplicarOtimista();
          gomTfAtualizarBarraV6(contexto);
          if (typeof window.renderizarTela === 'function') window.renderizarTela();
          if (contexto === 'fila' && typeof window.gomFilaAtualizarEmBackground === 'function') {
            window.gomFilaAtualizarEmBackground(700);
          }
          if (retorno && retorno.erros && retorno.erros.length) {
            alert('Salvos: ' + (retorno.salvos || 0) + '. Falharam: ' + retorno.erros.length + '\n' +
              retorno.erros.map(function(e) { return '#' + e.id + ': ' + e.erro; }).join('\n'));
          }
        })
        .withFailureHandler(function(err) {
          if (typeof gomResetButtonLoading === 'function') gomResetButtonLoading(btnSalvar);
          else if (btnSalvar) btnSalvar.disabled = false;
          if (typeof gomMostrarErroAcao === 'function') gomMostrarErroAcao(err, 'Não foi possível salvar as alterações.');
          else alert((err && err.message) || err);
        })
        .gomAtualizarChamadosLoteV1(JSON.stringify(payloads));
    }

    // Fila: mostra modal de confirmação (como empresa); Triagem: salva direto
    if (contexto === 'fila') {
      var linhasConf = payloads.map(function(p) {
        var c = (window.listaChamadosGlobal||[]).find(function(x){return String(x.id||'')==p.id;})||{};
        var dataLinha = p.dataAgendamentoVisita
          ? (typeof gomDataParaBR === 'function' ? gomDataParaBR(p.dataAgendamentoVisita) : p.dataAgendamentoVisita)
          : '<em class="text-warning">Sem data alterada</em>';
        return '<li class="mb-2"><strong>'+escapeHtml(c.unidade||p.id)+'</strong><br>'
          + '<span class="text-muted small">Equipe: </span><strong>'+(p.equipe?escapeHtml(p.equipe):'<em class="text-warning">Sem alteração</em>')+'</strong>'
          + ' &nbsp;|&nbsp; <span class="text-muted small">Data: </span><strong>'+dataLinha+'</strong>'
          + (p.situacao ? ' &nbsp;|&nbsp; <span class="text-muted small">Situação: </span><strong>'+escapeHtml(p.situacao)+'</strong>' : '')
          + '</li>';
      }).join('');
      var modalId = 'gomTfModalConfFilaV6';
      var el = document.getElementById(modalId); if(el) el.remove();
      document.body.insertAdjacentHTML('beforeend',
        '<div class="modal fade" id="'+modalId+'" tabindex="-1" aria-hidden="true">'
        +'<div class="modal-dialog modal-dialog-centered"><div class="modal-content">'
        +'<div class="modal-header bg-primary text-white"><h5 class="modal-title fw-bold"><i class="bi bi-check2-circle me-2"></i>Confirmar encaminhamentos da fila</h5>'
        +'<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button></div>'
        +'<div class="modal-body"><p class="mb-2">Salvando <strong>'+payloads.length+' encaminhamento(s)</strong>:</p>'
        +'<ul class="list-unstyled ps-2">'+linhasConf+'</ul>'
        +'<div class="alert alert-info mt-3 mb-0 py-2 px-3 small"><i class="bi bi-calendar-check-fill me-1"></i>A data global só é usada quando você clica em <strong>Aplicar para todos</strong>. Datas individuais continuam independentes.</div>'
        +'</div>'
        +'<div class="modal-footer"><button type="button" class="btn btn-light border fw-bold" data-bs-dismiss="modal"><i class="bi bi-x-circle me-1"></i>Cancelar</button>'
        +'<button type="button" class="btn btn-primary fw-bold" id="gomTfBtnConfirmarFila"><i class="bi bi-check2-circle me-1"></i>Confirmar e salvar</button>'
        +'</div></div></div></div>'
      );
      var modalEl = document.getElementById(modalId);
      var bsModal = new bootstrap.Modal(modalEl);
      document.getElementById('gomTfBtnConfirmarFila').addEventListener('click', function() {
        bsModal.hide(); executarSave_();
      });
      modalEl.addEventListener('hidden.bs.modal', function() { modalEl.remove(); });
      bsModal.show();
    } else {
      executarSave_();
    }
  };

  // Mantém compatibilidade: o submit do form de uma linha agora só marca alteração.
  window.gomTfSalvarLinhaV6 = function(event, id) {
    if (event) event.preventDefault();
    gomTfMarcarLinhaAlteradaV6(id);
  };

  window.renderizarTela = function renderizarTelaGomTriagemFilaInlineV6() {
    var tela = gomGetTelaAtual_();

    if (tela === 'dashboard') return (typeof renderDashboard === 'function' ? renderDashboard() : null);
    if (tela === 'cadastro' || tela === 'configuracoes') return;
    if (tela === 'campo') return (typeof renderizarCampo === 'function' ? renderizarCampo() : null);
    if (tela === 'alertas') return (typeof renderizarAlertas === 'function' ? renderizarAlertas() : null);
    if (tela === 'obras') return (typeof renderizarObras === 'function' ? renderizarObras() : null);

    var painel = document.getElementById('painelDados');
    if (!painel) return;

    if (!window.dadosCarregados && typeof dadosCarregados !== 'undefined' && !dadosCarregados) {
      painel.innerHTML = '<div class="empty-state"><div class="spinner-border text-primary"></div><p class="mt-3 fw-bold">Carregando chamados...</p></div>';
      return;
    }

    var listaTela = typeof filtrarTelaChamados === 'function' ? filtrarTelaChamados(window.listaChamadosGlobal || []) : (window.listaChamadosGlobal || []);
    listaTela = typeof ordenarChamados === 'function' ? ordenarChamados(listaTela) : listaTela;
    if (typeof renderizarKPIsChamados === 'function') renderizarKPIsChamados(listaTela);
    gomTfRemoverKpiEntradaHojeFila_();

    var modoEmpresaAtual = window.empresaModoAtual || 'diario';
    var termo = (tela === 'empresa' && (modoEmpresaAtual === 'gerencial' || modoEmpresaAtual === 'equipes')) ? '' : (typeof termoPesquisa === 'function' ? termoPesquisa() : '');
    var listaRender = (listaTela || []).filter(function(item) {
      var texto = gomTexto_([item.id, item.unidade, item.detalhamento, item.situacao, item.status, item.observacoes, item.valorOrcamento, item.equipe, item.numeroOs, item.tipo].join(' '));
      if (termo && texto.indexOf(termo) === -1) return false;
      if (!window.statusFiltroClicado && (typeof statusFiltroClicado === 'undefined' || !statusFiltroClicado)) return true;
      var filtro = window.statusFiltroClicado || (typeof statusFiltroClicado !== 'undefined' ? statusFiltroClicado : null);
      if (filtro === 'Entrada hoje') return false;
      if (filtro === 'A revisar') return typeof deveRevisarFila === 'function' && deveRevisarFila(item);
      return gomNormalizar_(item.situacao || item.status) === filtro;
    });

    var contador = document.getElementById('contador');
    if (contador) {
      if (tela === 'fila') contador.innerText = listaRender.length + ' na fila';
      else if (tela === 'aprovacao') contador.innerText = listaRender.length + ' orçamento' + (listaRender.length === 1 ? '' : 's');
      else contador.innerText = listaRender.length + ' Resultados';
    }

    if (tela === 'empresa') {
      painel.innerHTML = (typeof renderEmpresaView === 'function'
        ? renderEmpresaView(listaRender)
        : '<div class="empty-state"><h5>Módulo Empresa não carregado.</h5></div>');
      return;
    }

    if (tela === 'aprovacao') {
      painel.innerHTML = typeof renderAprovacaoView === 'function' ? renderAprovacaoView(listaRender, window.listaChamadosGlobal || []) : '';
      return;
    }

    if (tela === 'historico') {
      painel.innerHTML = typeof renderMemorialView === 'function' ? renderMemorialView(listaTela) : '';
      return;
    }

    if (!listaRender.length) {
      painel.className = '';
      painel.innerHTML = '<div class="empty-state"><h5>Nenhum registro encontrado para os filtros atuais.</h5></div>';
      return;
    }

    if (tela === 'triagem') {
      painel.className = '';
      painel.innerHTML = window.renderListaTriagemOperacional(listaRender);
      setTimeout(function() { window.gomTfPrePreencherDataHoje_('triagem'); }, 0);
      return;
    }

    if (tela === 'fila') {
      painel.className = '';
      painel.innerHTML = window.renderListaFilaOperacional(listaRender);
      setTimeout(function() { window.gomTfPrePreencherDataHoje_('fila'); }, 0);
      return;
    }

    painel.innerHTML = typeof renderCardChamado === 'function' ? listaRender.map(function(item) { return renderCardChamado(item); }).join('') : '';
  };

  // ── DATA GLOBAL DO CABEÇALHO ────────────────────────────────────────────────
  // A data NÃO salva sozinha. Ela é aplicada ao buffer dos chamados que JÁ têm
  // alteração pendente (mudança de status). Quando você clica "Salvar alterações"
  // na barra flutuante, a data vai junto. Isso evita salvar os 53 chamados.
  window.gomTfAplicarDataGlobal_ = function(contexto) {
    var input = document.getElementById('gomTfDataGlobal_' + contexto);
    if (!input || !input.value) { alert('Selecione uma data antes de aplicar.'); return; }
    var iso = typeof gomDataParaISO === 'function' ? gomDataParaISO(input.value) : input.value;
    if (!iso) { alert('Data inválida. Use o formato dd/mm/aaaa.'); return; }
    var br = typeof gomDataParaBR === 'function' ? gomDataParaBR(iso) : gomFormatarDataBR_(iso);

    if (contexto === 'fila') {
      var inputs = Array.prototype.slice.call(document.querySelectorAll('#painelDados .gom-tf-data-individual'));
      if (!inputs.length) { alert('Nenhum chamado visível para aplicar a data.'); return; }
      inputs.forEach(function(el) {
        el.value = iso;
        var id = String(el.id || '').replace(/^gomTfData_/, '');
        // idSeguro pode ter caracteres tratados; preferimos pegar o form associado.
        var formId = el.getAttribute('form') || '';
        var realId = '';
        var m = formId.match(/^gomTfForm_(.+)$/);
        if (m) {
          var linha = document.getElementById('gomTfLinha_' + m[1]);
          var botaoId = linha && linha.querySelector('.empresa-os-id');
          realId = botaoId ? String(botaoId.textContent || '').replace('#','').trim() : '';
        }
        if (realId) window.gomTfMarcarLinhaAlteradaV6(realId);
      });
      var btn = document.querySelector('#gomDataGlobalWrap_' + contexto + ' button, .gom-data-global-wrap button');
      if (btn && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(btn, 'Aplicada a ' + inputs.length, 1500);
      else alert('Data aplicada a ' + inputs.length + ' chamado(s) visível(is). Clique em Salvar alterações para gravar.');
      return;
    }

    var ids = Object.keys(window.gomTfAlteracoes || {}).filter(function(id) {
      return window.gomTfAlteracoes[id].contexto === contexto;
    });

    if (!ids.length) {
      alert('A data será aplicada automaticamente aos chamados que você alterar.\n\nMude o status de um ou mais chamados primeiro; ao salvar, esta data vai junto.');
      return;
    }

    var btnTriagem = document.querySelector('#gomDataGlobalWrap_' + contexto + ' button, .gom-data-global-wrap button');
    if (btnTriagem && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(btnTriagem, 'Aplicada a ' + ids.length, 1500);
  };

  function gomFormatarDataBR_(iso) {
    var m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : iso;
  }

  // Pré-preenche o campo de data global com o dia de HOJE ao montar a tela.
  window.gomTfPrePreencherDataHoje_ = function(contexto) {
    var input = document.getElementById('gomTfDataGlobal_' + contexto);
    if (input && !input.value) {
      var hoje = new Date();
      var iso = hoje.getFullYear() + '-' +
        String(hoje.getMonth() + 1).padStart(2, '0') + '-' +
        String(hoje.getDate()).padStart(2, '0');
      input.value = typeof gomDataParaBR === 'function' ? gomDataParaBR(iso) : iso;
    }
  };

  try { if (typeof renderizarTela !== 'undefined') renderizarTela = window.renderizarTela; } catch(e) {}
  try { if (typeof renderListaTriagemOperacional !== 'undefined') renderListaTriagemOperacional = window.renderListaTriagemOperacional; } catch(e) {}
  try { if (typeof renderListaFilaOperacional !== 'undefined') renderListaFilaOperacional = window.renderListaFilaOperacional; } catch(e) {}

  window.gomLog && window.gomLog('[GOM] Patch Triagem/Fila edição inline v6 carregado.');
})();
