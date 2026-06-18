/* ============================================================================
 * GOM | SME — Hotfix final dos seletores de fluxo
 * ----------------------------------------------------------------------------
 * Carregado por último para impedir que qualquer tela/modal volte a exibir
 * STATUS_TODOS no campo "Alterar situação".
 * ========================================================================== */
(function () {
  function txt(v) { return String(v == null ? '' : v).trim(); }

  function html(v) {
    if (typeof window.escapeHtml === 'function') return window.escapeHtml(v);
    return txt(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function norm(st) {
    if (typeof window.normalizarSituacaoSistema === 'function') return window.normalizarSituacaoSistema(st);
    return txt(st);
  }

  function proximos(status, contexto) {
    var st = norm(status);
    var mapa = {
      'Em análise': ['Visita agendada', 'Atendimento Emergencial', 'Solicitado Orçamento', 'Aguardando visita', 'Garantia de Obra', 'Devolvido para a escola'],
      'Aguardando visita': ['Visita agendada', 'Atendimento Emergencial', 'Solicitado Orçamento', 'Garantia de Obra', 'Devolvido para a escola'],
      'Visita agendada': ['Atendimento Emergencial', 'Solicitado Orçamento', 'Garantia de Obra', 'Devolvido para a escola'],
      'Solicitado Orçamento': ['Orçamento Realizado'],
      'Orçamento Realizado': ['OS emitida', 'Solicitado Orçamento', 'A cargo da unidade escolar', 'Devolvido para a escola'],
      'OS emitida': ['Serviço Realizado'],
      'Atendimento Emergencial': ['Serviço Realizado'],
      'Garantia de Obra': ['Serviço Realizado'],
      'Garantia de Serviço': ['Serviço Realizado'],
      'Serviço Realizado': ['Concluído', 'Garantia de Serviço'],
      'Visita Técnica': ['Devolvido para a escola', 'Atendimento Emergencial', 'Solicitado Orçamento'],
      'Devolvido para a escola': [],
      'Concluído': [],
      'Encaminhado para outra gerência ou Unidade escolar.': [],
      'A cargo da unidade escolar': [],
      'Duplicado': []
    };
    var lista = (mapa[st] || []).slice();
    if (contexto === 'empresa') {
      if (st === 'Solicitado Orçamento') lista = ['Orçamento Realizado'];
      else if (['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Garantia de Serviço'].indexOf(st) >= 0) lista = ['Serviço Realizado'];
      else if (st === 'Serviço Realizado') lista = ['Concluído', 'Garantia de Serviço'];
    }
    return lista;
  }

  function contextoAtual() {
    var tela = '';
    try { tela = window.telaAtual || (typeof telaAtual !== 'undefined' ? telaAtual : ''); } catch (e) {}
    return txt(tela) || 'modal';
  }

  function getStatusPermitidos(chamado) {
    chamado = chamado || {};
    var st = norm(chamado.situacao || chamado.status);
    var ctx = contextoAtual();
    if (ctx === 'empresa') return proximos(st, 'empresa');
    if (ctx === 'fila') return proximos(st, 'fila');
    if (ctx === 'triagem') return proximos(st, 'triagem');
    return proximos(st, 'modal');
  }

  function preencherSelect(chamado) {
    var select = document.getElementById('mdlSelectStatus');
    if (!select) return;
    chamado = chamado || {};
    var atual = norm(chamado.situacao || chamado.status);

    // Orçamento Realizado usa decisões, não lista de status crua.
    if (atual === 'Orçamento Realizado') {
      select.innerHTML = [
        '<option value="">Selecione...</option>',
        '<option value="aprovar">Aprovar e emitir OS</option>',
        '<option value="ajuste">Devolver para ajuste</option>',
        '<option value="negar">Negar orçamento</option>',
        '<option value="devolver_escola">Devolver para escola</option>'
      ].join('');
      select.value = '';
      select.onchange = (typeof window.atualizarCamposModalAprovacao === 'function') ? window.atualizarCamposModalAprovacao : null;
      return;
    }

    select.onchange = null;
    var ctx = contextoAtual();
    var permitidos = getStatusPermitidos(chamado).filter(function (s) { return norm(s) !== atual; });
    var vistos = {};
    var incluirAtual = !(ctx === 'triagem' || (ctx === 'fila' && atual === 'Aguardando visita'));
    var lista = (incluirAtual ? [atual] : []).concat(permitidos).filter(function (s) {
      s = norm(s);
      if (!s || vistos[s]) return false;
      vistos[s] = true;
      return true;
    });

    var placeholder = incluirAtual ? '' : '<option value="" disabled selected>-- Selecionar encaminhamento --</option>';
    select.innerHTML = placeholder + lista.map(function (s) {
      var selected = incluirAtual && norm(s) === atual ? ' selected' : '';
      return '<option value="' + html(s) + '"' + selected + '>' + html(s) + '</option>';
    }).join('');
    if (incluirAtual) select.value = atual;
  }

  function reprocessarModalAberto() {
    var id = '';
    try { id = window.idChamadoAberto || (typeof idChamadoAberto !== 'undefined' ? idChamadoAberto : ''); } catch (e) {}
    if (!id) {
      var el = document.getElementById('mdlId');
      id = el ? txt(el.textContent) : '';
    }
    if (!id) return;
    var chamado = (window.listaChamadosGlobal || []).find(function (x) { return String(x && x.id) === String(id); });
    if (chamado) preencherSelect(chamado);
  }

  // Expor e substituir as funções globais usadas pelo modal.
  window.gomProximosStatusFluxo = proximos;
  window.getStatusPermitidosModal = getStatusPermitidos;
  window.preencherSelectStatusModal = preencherSelect;
  try { getStatusPermitidosModal = getStatusPermitidos; } catch (e1) {}
  try { preencherSelectStatusModal = preencherSelect; } catch (e2) {}

  // Reprocessa após abrir modal, mesmo que a versão antiga tenha preenchido antes.
  if (!window.__GOM_FLUXO_STATUS_FINAL_WRAP__) {
    window.__GOM_FLUXO_STATUS_FINAL_WRAP__ = true;
    var abrirOriginal = window.abrirModalAnalise;
    if (typeof abrirOriginal === 'function') {
      window.abrirModalAnalise = function () {
        var r = abrirOriginal.apply(this, arguments);
        setTimeout(reprocessarModalAberto, 0);
        setTimeout(reprocessarModalAberto, 80);
        return r;
      };
      try { abrirModalAnalise = window.abrirModalAnalise; } catch (e3) {}
    }
  }

  document.addEventListener('shown.bs.modal', function (ev) {
    if (ev && ev.target && ev.target.id === 'modalAnalise') setTimeout(reprocessarModalAberto, 0);
  });
})();
