/* ============================================================================
   Agrupamento por visita — módulo compartilhado
   ----------------------------------------------------------------------------
   Reúne os chamados de uma mesma escola/visita num card guarda-chuva, igual à
   Agenda/Acompanhamento da Secretaria. É só uma REORGANIZAÇÃO VISUAL das mesmas
   linhas (os elementos/IDs continuam idênticos no DOM), então todos os editores
   e botões individuais de cada tela seguem funcionando.

   Cada tela:
     - adiciona o botão toggle: window.gomAgrupBotaoHtml('<tela>')
     - troca `lista.map(renderLinha).join('')` por
       window.gomAgrupRenderLista(lista, { tela, renderLinha, loteHtml? })

   A ação em lote (loteHtml/handler) é definida POR TELA (no arquivo da tela),
   pois reutiliza os helpers e buffers de salvar já existentes de cada uma.
   Aqui ficam só o toggle, a chave de grupo e o render genérico dos cards.
   Reusa as classes CSS já existentes: .fila-visitas-list / .fila-visita-card /
   .fila-visita-head / .fila-visita-head-main / .fila-visita-count /
   .fila-visita-lote / .fila-agenda-rows.
   ========================================================================== */
(function() {
  'use strict';

  function html_(v) {
    return typeof window.escapeHtml === 'function'
      ? window.escapeHtml(v)
      : String(v == null ? '' : v).replace(/[&<>"]/g, function(c) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
        });
  }
  function js_(v) {
    return typeof window.escapeJsAttr === 'function'
      ? window.escapeJsAttr(v)
      : String(v == null ? '' : v).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ');
  }

  // Chave de agrupamento: mesma escola/visita.
  function gomAgrupChaveVisita_(item) {
    item = item || {};
    return String(item.grupoVisita || item.escolaId || item.unidade || 'sem-escola').trim() || 'sem-escola';
  }

  // ── Estado do toggle (por tela, lembrado em sessionStorage) ────────────────
  function gomAgrupAtivo(tela) {
    try { return sessionStorage.getItem('gomAgrupVisita_' + tela) === '1'; }
    catch (e) { return false; }
  }

  window.gomAgrupToggle = function(tela) {
    var novo = !gomAgrupAtivo(tela);
    try { sessionStorage.setItem('gomAgrupVisita_' + tela, novo ? '1' : '0'); } catch (e) {}
    if (typeof window.renderizarTela === 'function') window.renderizarTela();
  };

  window.gomAgrupBotaoHtml = function(tela) {
    var on = gomAgrupAtivo(tela);
    return '<button type="button" class="btn btn-sm ' + (on ? 'btn-primary' : 'btn-outline-primary')
      + ' fw-bold gom-agrup-btn" onclick="gomAgrupToggle(\'' + js_(tela) + '\')" '
      + 'title="Reunir os chamados da mesma escola num card único">'
      + '<i class="bi bi-collection me-1"></i>' + (on ? 'Agrupado por escola' : 'Agrupar por escola')
      + '</button>';
  };

  // Toolbar pronta (botão dentro de uma faixa), para telas sem toolbar própria.
  window.gomAgrupToolbarHtml = function(tela, extra) {
    return '<div class="gom-agrup-toolbar">' + window.gomAgrupBotaoHtml(tela) + (extra || '') + '</div>';
  };

  /* --------------------------------------------------------------------------
     Núcleo: renderiza a lista, agrupada ou plana.
     opts = {
       tela:       string (chave do toggle/keys),
       renderLinha:function(item, idx) -> html  (a função de linha da própria tela),
       loteHtml?:  function(grupoItens, grupoKey) -> html  (controle "aplicar a todos")
     }
     Desligado  -> idêntico ao comportamento atual: lista.map(renderLinha).join('')
     Ligado     -> 1 card por escola, com as MESMAS linhas dentro.
     -------------------------------------------------------------------------- */
  window.gomAgrupRenderLista = function(lista, opts) {
    lista = Array.isArray(lista) ? lista : [];
    opts = opts || {};
    var renderLinha = typeof opts.renderLinha === 'function' ? opts.renderLinha : function() { return ''; };

    if (!gomAgrupAtivo(opts.tela)) {
      return lista.map(function(item, idx) { return renderLinha(item, idx); }).join('');
    }

    window.__gomAgrupGrupos = window.__gomAgrupGrupos || {};

    // opts.chaveGrupo permite a tela definir a chave de agrupamento (ex.: agrupar
    // estritamente pelo nome da escola, ignorando grupo de visita).
    var chaveFn = typeof opts.chaveGrupo === 'function' ? opts.chaveGrupo : gomAgrupChaveVisita_;

    var porEscola = {};
    var ordem = [];
    lista.forEach(function(item, idx) {
      var chave = chaveFn(item);
      if (!porEscola[chave]) { porEscola[chave] = []; ordem.push(chave); }
      porEscola[chave].push({ item: item, idx: idx });
    });

    var out = ['<div class="fila-visitas-list">'];
    ordem.forEach(function(chave) {
      var grupo = porEscola[chave];
      var escola = (grupo[0].item && grupo[0].item.unidade) || 'Unidade não informada';
      var grupoKey = String(opts.tela + '_' + chave).replace(/[^A-Za-z0-9]/g, '_');
      window.__gomAgrupGrupos[grupoKey] = {
        tela: opts.tela,
        escola: escola,
        ids: grupo.map(function(e) { return e.item.id; })
      };
      var n = grupo.length;

      out.push('<div class="fila-visita-card">');
        out.push('<div class="fila-visita-head">');
          out.push('<div class="fila-visita-head-main"><i class="bi bi-building-community"></i>'
            + '<div><strong>' + html_(escola) + '</strong>'
            + '<small><i class="bi bi-list-check me-1"></i>' + n + ' chamado' + (n === 1 ? '' : 's') + ' desta unidade</small></div></div>');
          out.push('<span class="fila-visita-count">' + n + '</span>');
        out.push('</div>');

        if (n > 1 && typeof opts.loteHtml === 'function') {
          out.push(opts.loteHtml(grupo.map(function(e) { return e.item; }), grupoKey) || '');
        }

        out.push('<div class="fila-agenda-rows">');
        grupo.forEach(function(e) { out.push(renderLinha(e.item, e.idx)); });
        out.push('</div>');
      out.push('</div>');
    });
    out.push('</div>');
    return out.join('');
  };

  // Acesso ao grupo guardado (usado pelos handlers de lote das telas).
  window.gomAgrupGrupo = function(grupoKey) {
    return (window.__gomAgrupGrupos || {})[grupoKey] || null;
  };

  // Expostos para uso interno das telas.
  window.gomAgrupAtivo = gomAgrupAtivo;
  window.gomAgrupChaveVisita_ = gomAgrupChaveVisita_;
})();
