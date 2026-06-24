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

  // Estados em que o serviço está em execução pela Empresa. A partir deles,
  // somente a Empresa (ou ADMIN_GOM) pode avançar o status.
  var STATUS_EXECUCAO_EMPRESA = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Garantia de Serviço'];

  function perfilAtual() {
    var p = '';
    try { p = (window.GomAuth && window.GomAuth.perfil) || ''; } catch (e) {}
    if (!p) { try { p = (window.usuarioAtualGom && window.usuarioAtualGom.perfil) || ''; } catch (e2) {} }
    return String(p || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  }

  // Define se o perfil atual pode AVANÇAR o status a partir do estado informado.
  // Estados de execução pertencem à Empresa; os demais pertencem à Secretaria/GOM.
  function perfilPodeAlterar(status) {
    var perfil = perfilAtual();
    if (perfil === 'ADMIN_GOM') return true; // administrador pode tudo
    var ehExecucaoEmpresa = STATUS_EXECUCAO_EMPRESA.indexOf(norm(status)) >= 0;
    if (ehExecucaoEmpresa) return perfil === 'EMPRESA';
    // Demais estados (triagem, orçamento, visita, validação): fluxo da Secretaria/GOM.
    return perfil !== 'EMPRESA';
  }
  window.gomPerfilPodeAlterarStatus = function (chamado) {
    chamado = chamado || {};
    return perfilPodeAlterar(chamado.situacao || chamado.status);
  };

  // Esconde o seletor "Alterar situação" e o botão de atualização quando o perfil
  // atual não pode alterar o status, deixando o modal apenas em modo de acompanhamento.
  function aplicarModoSomenteLeituraStatus(ativar, status) {
    var select = document.getElementById('mdlSelectStatus');
    var bloco = select ? (select.closest ? select.closest('.col-md-5') : select.parentNode) : null;
    if (bloco) bloco.style.display = ativar ? 'none' : '';
    var btn = document.getElementById('mdlBtnAtualizar');
    if (btn) btn.style.display = ativar ? 'none' : '';
    var aviso = document.getElementById('mdlAvisoSomenteLeituraStatus');
    if (ativar) {
      var msg = (STATUS_EXECUCAO_EMPRESA.indexOf(norm(status)) >= 0)
        ? 'Chamado em atendimento pela Empresa — somente a Empresa pode alterar o status.'
        : 'Somente leitura — seu perfil não pode alterar o status deste chamado neste estágio.';
      if (!aviso && btn && btn.parentNode) {
        aviso = document.createElement('div');
        aviso.id = 'mdlAvisoSomenteLeituraStatus';
        aviso.className = 'text-muted small fst-italic me-auto d-flex align-items-center';
        btn.parentNode.insertBefore(aviso, btn.parentNode.firstChild);
      }
      if (aviso) { aviso.innerHTML = '<i class="bi bi-lock me-1"></i>' + html(msg); aviso.style.display = ''; }
    } else if (aviso) {
      aviso.style.display = 'none';
    }
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
      'Duplicado': [],
      'Unificado': []
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
    if (!perfilPodeAlterar(st)) return []; // gate por perfil: nenhuma transição disponível
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

    // Gate por perfil: se o usuário não pode avançar este status, modal fica somente leitura.
    if (!perfilPodeAlterar(atual)) {
      select.innerHTML = '';
      select.onchange = null;
      aplicarModoSomenteLeituraStatus(true, atual);
      return;
    }
    aplicarModoSomenteLeituraStatus(false, atual);

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
