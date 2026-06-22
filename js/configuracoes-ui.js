(function() {
  window.configuracoesGlobal = Array.isArray(window.configuracoesGlobal) ? window.configuracoesGlobal : [];
  window.configuracoesGrupoAtual = window.configuracoesGrupoAtual || 'Todos';
  window.configuracoesCarregadas = Boolean(window.configuracoesCarregadas);
  window.configuracoesCarregando = false;
  window.configuracoesAlteradas = window.configuracoesAlteradas || {};

  function parseJsonConfig_(res) {
    if (!res) return { ok: false, erro: 'Resposta vazia.' };
    if (typeof res === 'string') {
      try { return JSON.parse(res); }
      catch(e) { return { ok: false, erro: 'JSON inválido: ' + e.message }; }
    }
    return res;
  }

  function chaveParaId_(chave) {
    const texto = String(chave || '');
    let saida = '';
    for (let i = 0; i < texto.length; i++) {
      const c = texto.charAt(i);
      const ok = (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9') || c === '_' || c === '-';
      saida += ok ? c : '_';
    }
    return saida || 'config';
  }

  function procurarConfig_(chave) {
    chave = String(chave || '').trim();
    return (Array.isArray(window.configuracoesGlobal) ? window.configuracoesGlobal : []).find(function(item) {
      return String(item.chave || '').trim() === chave;
    }) || null;
  }



  /* ==========================================================
     v17.1 - Editor intuitivo de listas de e-mail
     ========================================================== */
  // ── Chaves de template de e-mail (editor rico) ────────────────────────────
  const CONFIG_EMAIL_TEMPLATE_CORPO_KEYS = [
    'EMAIL_VISITA_CORPO',
    'EMAIL_SLA_CORPO'
  ];

  const CONFIG_EMAIL_TEMPLATE_ASSUNTO_KEYS = [
    'EMAIL_VISITA_ASSUNTO',
    'EMAIL_SLA_ASSUNTO'
  ];

  // Mapa de variáveis disponíveis por template de corpo
  const CONFIG_EMAIL_VARIAVEIS = {
    'EMAIL_VISITA_CORPO':   ['{{escola}}','{{data_visita}}','{{equipe}}','{{lista_chamados}}','{{numero}}'],
    'EMAIL_SLA_CORPO':      ['{{numero}}','{{escola}}','{{etapa}}','{{dias_atraso}}','{{status}}','{{link}}'],
    'EMAIL_VISITA_ASSUNTO': ['{{escola}}','{{data_visita}}','{{equipe}}','{{numero}}'],
    'EMAIL_SLA_ASSUNTO':    ['{{numero}}','{{escola}}','{{etapa}}','{{dias_atraso}}','{{status}}']
  };

  // ── Editor de e-mail em pop-up: agrupa assunto + destinatários + corpo ──────
  // Cada tipo de e-mail vira um card com botão "Editar", abrindo um modal único.
  const CONFIG_EMAIL_MODAL_DEFS = {
    visita: {
      titulo: 'E-mail de visita agendada',
      icone: 'bi-calendar-check-fill',
      descricao: 'Enviado automaticamente à escola quando uma visita técnica é agendada.',
      ativoKey: 'EMAIL_VISITA_ATIVO',
      assuntoKey: 'EMAIL_VISITA_ASSUNTO',
      destinatariosKey: 'EMAIL_VISITA_DESTINATARIOS_EXTRA',
      destinatariosLabel: 'Quem recebe em cópia (CC)',
      destinatariosHint: 'A escola recebe automaticamente. Os e-mails abaixo entram sempre em cópia.',
      corpoKey: 'EMAIL_VISITA_CORPO'
    },
    sla: {
      titulo: 'E-mail de alerta de SLA',
      icone: 'bi-hourglass-split',
      descricao: 'Enviado quando um chamado ultrapassa o prazo configurado da etapa.',
      ativoKey: 'EMAIL_SLA_ATIVO',
      assuntoKey: 'EMAIL_SLA_ASSUNTO',
      destinatariosKey: 'EMAIL_SLA_DESTINATARIOS',
      destinatariosLabel: 'Quem recebe os alertas',
      destinatariosHint: 'Lista de e-mails que recebem os alertas diários de SLA.',
      corpoKey: 'EMAIL_SLA_CORPO'
    }
  };

  // Chaves controladas pelo pop-up (não aparecem como linhas soltas na lista).
  const CONFIG_EMAIL_MODAL_KEYS = (function() {
    const set = {};
    Object.keys(CONFIG_EMAIL_MODAL_DEFS).forEach(function(t) {
      const d = CONFIG_EMAIL_MODAL_DEFS[t];
      [d.ativoKey, d.assuntoKey, d.destinatariosKey, d.corpoKey].forEach(function(k) { set[k] = true; });
    });
    return set;
  })();

  function isConfigEmailModalKey_(chave) {
    return CONFIG_EMAIL_MODAL_KEYS[String(chave || '').trim()] === true;
  }

  function isConfigEmailTempoCorpo_(chave) {
    return CONFIG_EMAIL_TEMPLATE_CORPO_KEYS.indexOf(String(chave || '').trim()) >= 0;
  }
  function isConfigEmailTempoAssunto_(chave) {
    return CONFIG_EMAIL_TEMPLATE_ASSUNTO_KEYS.indexOf(String(chave || '').trim()) >= 0;
  }

  // Renderiza campo de assunto com chips de variáveis
  function renderEmailAssuntoEditor_(item, id, chave, valor) {
    var variaveis = CONFIG_EMAIL_VARIAVEIS[chave] || [];
    var chips = variaveis.map(function(v) {
      return '<button type="button" class="cfg-email-var-chip" title="Inserir variável" '
        + 'onclick="gomCfgEmailInserirVarAssunto(\'' + escapeJsAttr(id) + '\',\'' + escapeJsAttr(v) + '\')">'
        + escapeHtml(v) + '</button>';
    }).join('');
    return '<div class="cfg-email-assunto-wrap">'
      + '<input id="cfg_valor_' + escapeHtml(id) + '" class="form-control form-control-sm fw-bold cfg-email-assunto-input" '
      + 'value="' + escapeHtml(valor) + '" placeholder="Assunto do e-mail" '
      + 'oninput="marcarConfiguracaoAlterada(\'' + escapeJsAttr(chave) + '\')">'
      + (chips ? '<div class="cfg-email-vars"><span class="cfg-email-vars-label">Inserir:</span>' + chips + '</div>' : '')
      + '</div>';
  }

  // Renderiza editor rico de corpo HTML com toolbar e preview
  function renderEmailCorpoEditor_(item, id, chave, valor) {
    var variaveis = CONFIG_EMAIL_VARIAVEIS[chave] || [];
    var chips = variaveis.map(function(v) {
      return '<button type="button" class="cfg-email-var-chip" title="Inserir variável no cursor" '
        + 'onclick="gomCfgEmailInserirVarCorpo(\'' + escapeJsAttr(id) + '\',\'' + escapeJsAttr(v) + '\')">'
        + escapeHtml(v) + '</button>';
    }).join('');

    return '<div class="cfg-email-editor-wrap" id="cfg_editor_wrap_' + escapeHtml(id) + '">'

      // Toolbar de formatação
      + '<div class="cfg-email-toolbar">'
        + '<button type="button" class="cfg-email-tb-btn" title="Negrito" onclick="gomCfgEmailCmd(\'' + escapeJsAttr(id) + '\',\'bold\')"><i class="bi bi-type-bold"></i></button>'
        + '<button type="button" class="cfg-email-tb-btn" title="Itálico" onclick="gomCfgEmailCmd(\'' + escapeJsAttr(id) + '\',\'italic\')"><i class="bi bi-type-italic"></i></button>'
        + '<button type="button" class="cfg-email-tb-btn" title="Sublinhado" onclick="gomCfgEmailCmd(\'' + escapeJsAttr(id) + '\',\'underline\')"><i class="bi bi-type-underline"></i></button>'
        + '<span class="cfg-email-tb-sep"></span>'
        + '<button type="button" class="cfg-email-tb-btn" title="Lista com marcadores" onclick="gomCfgEmailCmd(\'' + escapeJsAttr(id) + '\',\'insertUnorderedList\')"><i class="bi bi-list-ul"></i></button>'
        + '<button type="button" class="cfg-email-tb-btn" title="Lista numerada" onclick="gomCfgEmailCmd(\'' + escapeJsAttr(id) + '\',\'insertOrderedList\')"><i class="bi bi-list-ol"></i></button>'
        + '<span class="cfg-email-tb-sep"></span>'
        + '<button type="button" class="cfg-email-tb-btn" title="Link" onclick="gomCfgEmailInserirLink(\'' + escapeJsAttr(id) + '\')"><i class="bi bi-link-45deg"></i></button>'
        + '<span class="cfg-email-tb-sep"></span>'
        + '<button type="button" class="cfg-email-tb-btn cfg-email-tb-preview-btn" title="Pré-visualizar e-mail" onclick="gomCfgEmailPreview(\'' + escapeJsAttr(id) + '\',\'' + escapeJsAttr(chave) + '\')"><i class="bi bi-eye"></i> Preview</button>'
      + '</div>'

      // Área editável (contenteditable = editor rico)
      + '<div id="cfg_editor_' + escapeHtml(id) + '" class="cfg-email-body-editor" contenteditable="true" '
        + 'data-chave="' + escapeHtml(chave) + '" '
        + 'oninput="gomCfgEmailSincronizar(\'' + escapeJsAttr(id) + '\',\'' + escapeJsAttr(chave) + '\')">'
        + valor  // HTML já vem do banco
      + '</div>'

      // Input oculto que o sistema de configurações lê/salva
      + '<textarea id="cfg_valor_' + escapeHtml(id) + '" class="cfg-email-hidden-value" '
        + 'oninput="marcarConfiguracaoAlterada(\'' + escapeJsAttr(chave) + '\')" aria-hidden="true">'
        + escapeHtml(valor)
      + '</textarea>'

      // Chips de variáveis
      + (chips
          ? '<div class="cfg-email-vars"><span class="cfg-email-vars-label"><i class="bi bi-braces me-1"></i>Variáveis:</span>' + chips + '</div>'
          : '')

      // Área de preview (oculta até clicar)
      + '<div id="cfg_preview_' + escapeHtml(id) + '" class="cfg-email-preview" style="display:none"></div>'

    + '</div>';
  }

  // Sincroniza contenteditable → textarea oculto (que vai para o banco)
  window.gomCfgEmailSincronizar = function(id, chave) {
    var editor = document.getElementById('cfg_editor_' + id);
    var hidden = document.getElementById('cfg_valor_' + id);
    if (editor && hidden) {
      hidden.value = editor.innerHTML;
      if (typeof marcarConfiguracaoAlterada === 'function') marcarConfiguracaoAlterada(chave);
    }
  };

  // Executa comando de formatação no editor rico
  window.gomCfgEmailCmd = function(id, cmd) {
    var editor = document.getElementById('cfg_editor_' + id);
    if (!editor) return;
    editor.focus();
    document.execCommand(cmd, false, null);
    window.gomCfgEmailSincronizar(id, editor.dataset.chave || '');
  };

  // Insere link no editor rico
  window.gomCfgEmailInserirLink = function(id) {
    var url = prompt('URL do link:');
    if (!url) return;
    var editor = document.getElementById('cfg_editor_' + id);
    if (!editor) return;
    editor.focus();
    document.execCommand('createLink', false, url);
    window.gomCfgEmailSincronizar(id, editor.dataset.chave || '');
  };

  // Insere variável no editor rico (no cursor)
  window.gomCfgEmailInserirVarCorpo = function(id, variavel) {
    var editor = document.getElementById('cfg_editor_' + id);
    if (!editor) return;
    editor.focus();
    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(variavel));
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    } else {
      editor.innerHTML += variavel;
    }
    window.gomCfgEmailSincronizar(id, editor.dataset.chave || '');
  };

  // Insere variável no input de assunto (na posição do cursor)
  window.gomCfgEmailInserirVarAssunto = function(id, variavel) {
    var input = document.getElementById('cfg_valor_' + id);
    if (!input) return;
    var ini = input.selectionStart || 0;
    var fim = input.selectionEnd || ini;
    var antes = input.value.slice(0, ini);
    var depois = input.value.slice(fim);
    input.value = antes + variavel + depois;
    input.selectionStart = input.selectionEnd = ini + variavel.length;
    input.focus();
    input.dispatchEvent(new Event('input'));
  };

  // Mostra/esconde preview do e-mail com substituição de variáveis de exemplo
  window.gomCfgEmailPreview = function(id, chave) {
    var editor = document.getElementById('cfg_editor_' + id);
    var preview = document.getElementById('cfg_preview_' + id);
    if (!editor || !preview) return;
    if (preview.style.display !== 'none') { preview.style.display = 'none'; return; }
    var exemplos = {
      '{{escola}}': 'EMEF Profª Maria José',
      '{{data_visita}}': '25/06/2026',
      '{{equipe}}': 'Equipe Alfa',
      '{{numero}}': '1247',
      '{{etapa}}': 'Análise',
      '{{dias_atraso}}': '5',
      '{{status}}': 'Em análise',
      '{{link}}': '#',
      '{{lista_chamados}}': '<ul><li>#1247 — Cobertura: Telhado com infiltração no bloco B</li><li>#1251 — Elétrica: Tomadas sem energia na sala 4</li></ul>'
    };
    var html = editor.innerHTML;
    Object.keys(exemplos).forEach(function(v) {
      html = html.split(v).join(exemplos[v]);
    });
    preview.innerHTML = '<div class="cfg-email-preview-label"><i class="bi bi-eye me-1"></i>Pré-visualização (dados de exemplo)</div>'
      + '<div class="cfg-email-preview-body">' + html + '</div>';
    preview.style.display = '';
    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const CONFIG_EMAIL_LIST_KEYS = [
    'EMAILS_ADMIN_GOM',
    'EMAILS_SECRETARIA',
    'EMAILS_EMPRESA_ADICIONAIS',
    'EMAILS_ESCOLA',
    'EMAIL_VISITA_DESTINATARIOS_EXTRA',
    'EMAIL_SLA_DESTINATARIOS'
  ];

  function isConfigEmailList_(chave) {
    return CONFIG_EMAIL_LIST_KEYS.indexOf(String(chave || '').trim()) >= 0;
  }

  function normalizarListaEmailsConfig_(valor) {
    const vistos = {};
    return String(valor || '')
      .split(/[;,\n\r\t ]+/)
      .map(function(email) { return String(email || '').trim().toLowerCase(); })
      .filter(function(email) {
        if (!email) return false;
        if (vistos[email]) return false;
        vistos[email] = true;
        return true;
      });
  }

  function validarEmailConfig_(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
  }

  function getEmailsConfigAtual_(chave) {
    const id = chaveParaId_(chave);
    const input = document.getElementById('cfg_valor_' + id);
    return normalizarListaEmailsConfig_(input ? input.value : '');
  }

  function setEmailsConfigAtual_(chave, emails, marcar) {
    const id = chaveParaId_(chave);
    const input = document.getElementById('cfg_valor_' + id);
    const lista = normalizarListaEmailsConfig_((emails || []).join(','));
    if (input) input.value = lista.join(', ');
    renderizarChipsEmailsConfig_(chave, lista);
    if (marcar) marcarConfiguracaoAlterada(chave);
  }

  function renderizarChipsEmailsConfig_(chave, emails) {
    const id = chaveParaId_(chave);
    const chips = document.getElementById('cfg_email_chips_' + id);
    const count = document.getElementById('cfg_email_count_' + id);
    if (count) count.textContent = emails.length + ' e-mail' + (emails.length === 1 ? '' : 's');
    if (!chips) return;

    if (!emails.length) {
      chips.innerHTML = '<span class="config-email-empty"><i class="bi bi-inbox me-1"></i>Nenhum e-mail cadastrado neste perfil.</span>';
      return;
    }

    chips.innerHTML = emails.map(function(email) {
      const invalido = validarEmailConfig_(email) ? '' : ' invalido';
      return '<span class="config-email-chip' + invalido + '"><i class="bi bi-envelope-check"></i><span>' + escapeHtml(email) + '</span><button type="button" title="Remover" onclick="removerEmailConfig(\'' + escapeJsAttr(chave) + '\',\'' + escapeJsAttr(email) + '\')"><i class="bi bi-x"></i></button></span>';
    }).join('');
  }

  function renderEmailChipsHtml_(chave, emails) {
    if (!emails.length) return '<span class="config-email-empty"><i class="bi bi-inbox me-1"></i>Nenhum e-mail cadastrado neste perfil.</span>';
    return emails.map(function(email) {
      const invalido = validarEmailConfig_(email) ? '' : ' invalido';
      return '<span class="config-email-chip' + invalido + '"><i class="bi bi-envelope-check"></i><span>' + escapeHtml(email) + '</span><button type="button" title="Remover" onclick="removerEmailConfig(\'' + escapeJsAttr(chave) + '\',\'' + escapeJsAttr(email) + '\')"><i class="bi bi-x"></i></button></span>';
    }).join('');
  }

  function renderEmailListEditorConfig_(item, id, chave, valor, opcoes) {
    const emails = normalizarListaEmailsConfig_(valor);
    const tituloInterno = (opcoes && opcoes.tituloInterno) || 'Usuários deste perfil';
    const ajuda = (opcoes && opcoes.ajuda)
      || 'Na planilha será salvo automaticamente como lista separada por vírgulas. O sistema também aceita vírgula, ponto e vírgula, espaço ou quebra de linha.';
    return ''
      + '<div class="config-email-editor" data-chave="' + escapeHtml(chave) + '">'
      + '<input type="hidden" id="cfg_valor_' + escapeHtml(id) + '" value="' + escapeHtml(emails.join(', ')) + '">'
      + '<div class="config-email-toolbar"><span><i class="bi bi-people-fill me-1"></i>' + escapeHtml(tituloInterno) + '</span><strong id="cfg_email_count_' + escapeHtml(id) + '">' + emails.length + ' e-mail' + (emails.length === 1 ? '' : 's') + '</strong></div>'
      + '<div class="config-email-chips" id="cfg_email_chips_' + escapeHtml(id) + '">' + renderEmailChipsHtml_(chave, emails) + '</div>'
      + '<div class="config-email-add">'
        + '<input id="cfg_email_input_' + escapeHtml(id) + '" class="form-control form-control-sm" type="email" placeholder="Digite um e-mail e pressione Enter" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adicionarEmailConfig(\'' + escapeJsAttr(chave) + '\');}">'
        + '<button type="button" class="btn btn-primary btn-sm fw-bold" onclick="adicionarEmailConfig(\'' + escapeJsAttr(chave) + '\')"><i class="bi bi-plus-circle me-1"></i>Adicionar</button>'
      + '</div>'
      + '<div class="config-email-bulk">'
        + '<textarea id="cfg_email_bulk_' + escapeHtml(id) + '" class="form-control form-control-sm" rows="2" placeholder="Cole vários e-mails aqui, separados por vírgula, ponto e vírgula, espaço ou quebra de linha"></textarea>'
        + '<button type="button" class="btn btn-light border btn-sm fw-bold" onclick="importarEmailsConfig(\'' + escapeJsAttr(chave) + '\')"><i class="bi bi-clipboard-plus me-1"></i>Importar lista</button>'
      + '</div>'
      + '<div class="config-email-help"><i class="bi bi-info-circle me-1"></i>' + escapeHtml(ajuda) + '</div>'
      + '</div>';
  }

  window.adicionarEmailConfig = function(chave) {
    const id = chaveParaId_(chave);
    const input = document.getElementById('cfg_email_input_' + id);
    const valor = input ? input.value : '';
    const novos = normalizarListaEmailsConfig_(valor);
    if (!novos.length) return;

    const invalidos = novos.filter(function(email) { return !validarEmailConfig_(email); });
    if (invalidos.length) {
      alert('Revise o(s) e-mail(s) inválido(s):\n' + invalidos.join('\n'));
      return;
    }

    const atuais = getEmailsConfigAtual_(chave);
    setEmailsConfigAtual_(chave, atuais.concat(novos), true);
    if (input) input.value = '';
  };

  window.importarEmailsConfig = function(chave) {
    const id = chaveParaId_(chave);
    const textarea = document.getElementById('cfg_email_bulk_' + id);
    const valor = textarea ? textarea.value : '';
    const novos = normalizarListaEmailsConfig_(valor);
    if (!novos.length) return;

    const invalidos = novos.filter(function(email) { return !validarEmailConfig_(email); });
    if (invalidos.length) {
      alert('Revise o(s) e-mail(s) inválido(s):\n' + invalidos.join('\n'));
      return;
    }

    const atuais = getEmailsConfigAtual_(chave);
    setEmailsConfigAtual_(chave, atuais.concat(novos), true);
    if (textarea) textarea.value = '';
  };

  window.removerEmailConfig = function(chave, email) {
    const alvo = String(email || '').trim().toLowerCase();
    const atualizados = getEmailsConfigAtual_(chave).filter(function(item) { return item !== alvo; });
    setEmailsConfigAtual_(chave, atualizados, true);
  };

  window.limparEmailsConfig = function(chave) {
    if (!confirm('Remover todos os e-mails deste perfil?')) return;
    setEmailsConfigAtual_(chave, [], true);
  };

  /* ==========================================================
     Editor de e-mail em pop-up (assunto + destinatários + corpo)
     ========================================================== */

  function emailModalAtivo_(def) {
    const item = procurarConfig_(def.ativoKey);
    const valor = item ? formatarValorConfigParaTela_(item) : 'SIM';
    return String(valor || 'SIM').trim().toUpperCase().indexOf('N') !== 0;
  }

  function emailModalContagemDestinatarios_(def) {
    const item = procurarConfig_(def.destinatariosKey);
    const valor = item ? formatarValorConfigParaTela_(item) : '';
    return normalizarListaEmailsConfig_(valor).length;
  }

  // Cards (um por tipo de e-mail) exibidos no topo do grupo "E-mail".
  function renderEmailCompositorCards_() {
    const cards = Object.keys(CONFIG_EMAIL_MODAL_DEFS).map(function(tipo) {
      const def = CONFIG_EMAIL_MODAL_DEFS[tipo];
      const ativo = emailModalAtivo_(def);
      const qtd = emailModalContagemDestinatarios_(def);
      const destLabel = qtd === 1 ? '1 destinatário' : qtd + ' destinatários';
      return ''
        + '<div class="cfg-email-card">'
          + '<div class="cfg-email-card-icon"><i class="bi ' + escapeHtml(def.icone) + '"></i></div>'
          + '<div class="cfg-email-card-body">'
            + '<div class="cfg-email-card-titulo">' + escapeHtml(def.titulo)
              + '<span class="cfg-email-card-status ' + (ativo ? 'on' : 'off') + '">'
                + '<i class="bi ' + (ativo ? 'bi-broadcast' : 'bi-slash-circle') + '"></i>'
                + (ativo ? 'Envio ativo' : 'Envio desativado') + '</span>'
            + '</div>'
            + '<div class="cfg-email-card-desc">' + escapeHtml(def.descricao) + '</div>'
            + '<div class="cfg-email-card-meta"><i class="bi bi-people-fill me-1"></i>' + escapeHtml(destLabel) + '</div>'
          + '</div>'
          + '<button type="button" class="btn btn-primary fw-bold cfg-email-card-btn" onclick="gomAbrirEditorEmail(\'' + escapeJsAttr(tipo) + '\')">'
            + '<i class="bi bi-pencil-square me-1"></i>Editar e-mail</button>'
        + '</div>';
    }).join('');
    return '<div class="cfg-email-compositor">'
      + '<div class="cfg-email-compositor-head"><i class="bi bi-stars me-2"></i>'
        + 'Edite cada e-mail num só lugar — assunto, quem recebe e o corpo da mensagem.</div>'
      + cards
      + '</div>';
  }

  // Switch SIM/NÃO ligado a um cfg_valor_<id> oculto (lido pelo fluxo de salvar).
  function renderEmailAtivoSwitch_(chave, valorTela) {
    const id = chaveParaId_(chave);
    const ligado = String(valorTela || 'SIM').trim().toUpperCase().indexOf('N') !== 0;
    return '<div class="cfg-email-modal-ativo">'
      + '<label class="form-check form-switch m-0">'
        + '<input class="form-check-input" type="checkbox" id="emailEditorAtivoChk_' + escapeHtml(id) + '" '
        + (ligado ? 'checked ' : '') + 'onchange="gomCfgEmailToggleAtivo(\'' + escapeJsAttr(chave) + '\')">'
      + '</label>'
      + '<input type="hidden" id="cfg_valor_' + escapeHtml(id) + '" value="' + (ligado ? 'SIM' : 'NÃO') + '">'
      + '<span class="cfg-email-modal-ativo-text">Envio automático <strong id="emailEditorAtivoTxt_' + escapeHtml(id) + '">'
        + (ligado ? 'ativado' : 'desativado') + '</strong></span>'
      + '</div>';
  }

  window.gomCfgEmailToggleAtivo = function(chave) {
    const id = chaveParaId_(chave);
    const chk = document.getElementById('emailEditorAtivoChk_' + id);
    const hidden = document.getElementById('cfg_valor_' + id);
    const txt = document.getElementById('emailEditorAtivoTxt_' + id);
    const ligado = !!(chk && chk.checked);
    if (hidden) hidden.value = ligado ? 'SIM' : 'NÃO';
    if (txt) txt.textContent = ligado ? 'ativado' : 'desativado';
    marcarConfiguracaoAlterada(chave);
  };

  function itemConfig_(chave) {
    return procurarConfig_(chave) || { chave: chave, valor: '', grupo: 'E-mail', descricao: '', ativo: 'SIM' };
  }

  function secaoEditorEmail_(titulo, icone, conteudo, hint) {
    return '<div class="cfg-email-modal-secao">'
      + '<div class="cfg-email-modal-secao-titulo"><i class="bi ' + escapeHtml(icone) + ' me-2"></i>' + escapeHtml(titulo) + '</div>'
      + (hint ? '<div class="cfg-email-modal-secao-hint">' + escapeHtml(hint) + '</div>' : '')
      + conteudo
      + '</div>';
  }

  window.gomAbrirEditorEmail = function(tipo) {
    const def = CONFIG_EMAIL_MODAL_DEFS[tipo];
    const corpoEl = document.getElementById('emailEditorCorpo');
    const tituloEl = document.getElementById('emailEditorTitulo');
    const salvarBtn = document.getElementById('emailEditorSalvar');
    const modalEl = document.getElementById('modalEmailEditor');
    if (!def || !corpoEl || !modalEl) return;

    if (tituloEl) tituloEl.innerHTML = '<i class="bi ' + escapeHtml(def.icone) + ' me-2"></i>' + escapeHtml(def.titulo);
    if (salvarBtn) salvarBtn.dataset.tipo = tipo;

    const itAtivo   = itemConfig_(def.ativoKey);
    const itAssunto = itemConfig_(def.assuntoKey);
    const itDest    = itemConfig_(def.destinatariosKey);
    const itCorpo   = itemConfig_(def.corpoKey);

    corpoEl.innerHTML = ''
      + '<div class="cfg-email-modal-topo">'
        + '<div class="cfg-email-modal-topo-desc"><i class="bi bi-info-circle me-1"></i>' + escapeHtml(def.descricao) + '</div>'
        + renderEmailAtivoSwitch_(def.ativoKey, formatarValorConfigParaTela_(itAtivo))
      + '</div>'
      + secaoEditorEmail_('Assunto', 'bi-card-heading',
          renderEmailAssuntoEditor_(itAssunto, chaveParaId_(def.assuntoKey), def.assuntoKey, formatarValorConfigParaTela_(itAssunto)))
      + secaoEditorEmail_(def.destinatariosLabel, 'bi-people-fill',
          renderEmailListEditorConfig_(itDest, chaveParaId_(def.destinatariosKey), def.destinatariosKey, formatarValorConfigParaTela_(itDest),
            { tituloInterno: def.destinatariosLabel, ajuda: 'Digite um e-mail e pressione Enter, ou cole vários separados por vírgula. Aceita vírgula, ponto e vírgula, espaço ou quebra de linha.' }),
          def.destinatariosHint)
      + secaoEditorEmail_('Corpo da mensagem', 'bi-body-text',
          renderEmailCorpoEditor_(itCorpo, chaveParaId_(def.corpoKey), def.corpoKey, formatarValorConfigParaTela_(itCorpo)));

    if (window.bootstrap && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(modalEl).show();
    } else {
      modalEl.classList.add('show');
      modalEl.style.display = 'block';
    }
  };

  window.gomSalvarEditorEmail = function(btn) {
    const alvo = btn || document.getElementById('emailEditorSalvar');
    const tipo = alvo && alvo.dataset ? alvo.dataset.tipo : '';
    const def = CONFIG_EMAIL_MODAL_DEFS[tipo];
    if (!def) return;

    // Garante que o corpo (contenteditable) esteja sincronizado no campo oculto.
    if (typeof window.gomCfgEmailSincronizar === 'function') {
      window.gomCfgEmailSincronizar(chaveParaId_(def.corpoKey), def.corpoKey);
    }

    // Marca as 4 chaves como alteradas (lê os cfg_valor_* dentro do modal).
    [def.ativoKey, def.assuntoKey, def.destinatariosKey, def.corpoKey].forEach(function(k) {
      marcarConfiguracaoAlterada(k);
    });

    const modalEl = document.getElementById('modalEmailEditor');
    // coletarConfiguracoesAlteradas() roda de forma síncrona dentro de salvar,
    // lendo o DOM do modal antes de fecharmos — seguro fechar logo após.
    salvarConfiguracoesTela(btn);
    if (modalEl && window.bootstrap && bootstrap.Modal) {
      bootstrap.Modal.getOrCreateInstance(modalEl).hide();
    }
  };

  function doisDigitos_(valor) {
    valor = Number(valor || 0);
    return valor < 10 ? '0' + valor : String(valor);
  }

  function formatarHoraConfig_(valor, fallback) {
    fallback = fallback || '11:00';
    if (valor === null || valor === undefined || valor === '') return fallback;

    if (valor instanceof Date && !isNaN(valor.getTime())) {
      return doisDigitos_(valor.getHours()) + ':' + doisDigitos_(valor.getMinutes());
    }

    const texto = String(valor).trim();
    if (!texto) return fallback;

    // Já está no formato correto: 11:00 ou 11:00:00.
    const matchHoraDireta = texto.match(/^\d{1,2}:\d{2}(?::\d{2})?$/);
    if (matchHoraDireta) {
      const partes = texto.split(':');
      return doisDigitos_(partes[0]) + ':' + doisDigitos_(partes[1]);
    }

    // Quando a planilha salva como horário, o Apps Script pode mandar como Date/string tipo:
    // Sat Dec 30 1899 11:00:00 GMT-0300 ou 1899-12-30T14:00:00.000Z.
    const data = new Date(texto);
    if (!isNaN(data.getTime())) {
      return doisDigitos_(data.getHours()) + ':' + doisDigitos_(data.getMinutes());
    }

    // Último fallback: procura qualquer HH:MM dentro da string.
    const matchHoraInterna = texto.match(/(\d{1,2}):(\d{2})/);
    if (matchHoraInterna) {
      return doisDigitos_(matchHoraInterna[1]) + ':' + doisDigitos_(matchHoraInterna[2]);
    }

    return texto;
  }

  function formatarDataConfig_(valor) {
    if (!valor) return '';
    const data = valor instanceof Date ? valor : new Date(String(valor));
    if (isNaN(data.getTime())) return String(valor || '');
    return doisDigitos_(data.getDate()) + '/' + doisDigitos_(data.getMonth() + 1) + '/' + data.getFullYear();
  }

  function formatarValorConfigParaTela_(itemOuValor, chaveOpcional) {
    const item = itemOuValor && typeof itemOuValor === 'object' && !(itemOuValor instanceof Date) && Object.prototype.hasOwnProperty.call(itemOuValor, 'chave')
      ? itemOuValor
      : { chave: chaveOpcional || '', valor: itemOuValor };

    const chave = String(item.chave || chaveOpcional || '').trim();
    const valor = item.valor;

    if (chave === 'HORARIO_LIMITE_CAMPO') return formatarHoraConfig_(valor, '11:00');

    if (valor instanceof Date && !isNaN(valor.getTime())) {
      // Valores de hora pura no Google Sheets costumam vir como 30/12/1899.
      if (valor.getFullYear() <= 1900) return formatarHoraConfig_(valor, '');
      return formatarDataConfig_(valor);
    }

    return String(valor === null || valor === undefined ? '' : valor);
  }

  function formatarValorConfigParaSalvar_(chave, valor) {
    chave = String(chave || '').trim();
    if (chave === 'HORARIO_LIMITE_CAMPO') return formatarHoraConfig_(valor, '11:00');
    return String(valor === null || valor === undefined ? '' : valor);
  }

  function obterValorConfigInput_(chave) {
    const input = document.getElementById('cfg_valor_' + chaveParaId_(chave));
    if (input) return input.value;
    const item = procurarConfig_(chave);
    return item ? formatarValorConfigParaTela_(item) : '';
  }

  function obterAtivoConfigInput_(chave) {
    const input = document.getElementById('cfg_ativo_' + chaveParaId_(chave));
    if (input) return input.value;
    const item = procurarConfig_(chave);
    return item ? String(item.ativo || 'SIM') : 'SIM';
  }

  function montarPayloadConfiguracao_(chave) {
    const item = procurarConfig_(chave);
    if (!item) return null;
    return {
      chave: String(item.chave || '').trim(),
      valor: formatarValorConfigParaSalvar_(item.chave, obterValorConfigInput_(item.chave)),
      grupo: item.grupo || 'Sistema',
      descricao: item.descricao || '',
      ativo: obterAtivoConfigInput_(item.chave)
    };
  }

  function atualizarItemMemoria_(chave) {
    const item = procurarConfig_(chave);
    if (!item) return;
    item.valor = formatarValorConfigParaSalvar_(chave, obterValorConfigInput_(chave));
    item.ativo = obterAtivoConfigInput_(chave);
  }

  function totalAlteracoes_() {
    return Object.keys(window.configuracoesAlteradas || {}).length;
  }

  function atualizarEstadoSalvar_() {
    const total = totalAlteracoes_();
    const alert = document.getElementById('configSaveAlert');
    const count = document.getElementById('configAlteracoesCount');
    const bar = document.getElementById('configSaveBar');
    const barText = document.getElementById('configSaveBarText');
    if (count) count.textContent = String(total);
    if (alert) alert.style.display = total > 0 ? 'flex' : 'none';
    if (bar) bar.style.display = total > 0 ? 'flex' : 'none';
    if (barText) barText.textContent = total > 0 ? total + ' alteração(ões) aguardando salvamento.' : 'Nenhuma alteração pendente.';
  }

  function setBotoesConfiguracoes_(disabled) {
    document.querySelectorAll('#configSaveBar button').forEach(function(btn) {
      if (disabled) {
        btn.disabled = true;
        btn.classList.add('gom-btn-disabled-context');
      } else {
        if (!btn.classList.contains('gom-btn-loading')) btn.disabled = false;
        btn.classList.remove('gom-btn-disabled-context');
      }
    });
  }

  window.inicializarConfiguracoes = function() {
    if (window.configuracoesCarregadas) {
      renderizarConfiguracoes();
      atualizarEstadoSalvar_();
      return;
    }
    carregarConfiguracoes({ forcar: true });
  };

  window.carregarConfiguracoes = function(opcoes) {
    opcoes = opcoes || {};
    const botao = opcoes.botao || null;
    if (window.configuracoesCarregando) return;
    window.configuracoesCarregando = true;
    if (botao && typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Carregando...');

    const painel = document.getElementById('painelConfiguracoes');
    if (painel) {
      painel.innerHTML = '<div class="text-center w-100 py-5 text-muted"><div class="spinner-border text-primary mb-3"></div><div class="fw-bold">Carregando configurações...</div></div>';
    }

    google.script.run
      .withSuccessHandler(function(res) {
        window.configuracoesCarregando = false;
        const payload = parseJsonConfig_(res);
        if (!payload.ok) {
          mostrarErroConfiguracoes(payload.erro || 'Não foi possível carregar as configurações.');
          return;
        }
        const dados = payload.dados || payload; // suporta {dados:{...}} (Apps Script) e {configuracoes:[...]} (Supabase)
        window.configuracoesGlobal = Array.isArray(dados.configuracoes) ? dados.configuracoes : [];
        window.configuracoesAlteradas = {};
        window.configuracoesCarregadas = true;
        renderizarConfiguracoes();
        atualizarEstadoSalvar_();
        if (botao && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Atualizado');
        else if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
      })
      .withFailureHandler(function(err) {
        window.configuracoesCarregando = false;
        if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        mostrarErroConfiguracoes(err && err.message ? err.message : String(err));
      })
      .gomListarConfiguracoesWebV1Json();
  };

  window.recarregarConfiguracoes = function(botao) {
    if (totalAlteracoes_() > 0 && !confirm('Existem alterações não salvas. Deseja recarregar e perder essas alterações?')) return;
    window.configuracoesAlteradas = {};
    window.configuracoesCarregadas = false;
    carregarConfiguracoes({ forcar: true, botao: botao || (typeof gomGetBotaoAtivo === 'function' ? gomGetBotaoAtivo() : null) });
  };

  window.descartarAlteracoesConfiguracoes = function(botao) {
    if (totalAlteracoes_() > 0 && !confirm('Descartar alterações não salvas?')) return;
    window.configuracoesAlteradas = {};
    window.configuracoesCarregadas = false;
    carregarConfiguracoes({ forcar: true, botao: botao || (typeof gomGetBotaoAtivo === 'function' ? gomGetBotaoAtivo() : null) });
  };

  window.mostrarErroConfiguracoes = function(mensagem) {
    const painel = document.getElementById('painelConfiguracoes');
    if (painel) painel.innerHTML = '<div class="alert alert-danger"><strong>Erro:</strong> ' + escapeHtml(mensagem || 'Falha ao carregar configurações.') + '</div>';
  };

  window.setConfigGrupo = function(grupo) {
    window.configuracoesGrupoAtual = grupo || 'Todos';
    renderizarConfiguracoes();
  };

  window.marcarConfiguracaoAlterada = function(chave) {
    chave = String(chave || '').trim();
    if (!chave) return;
    atualizarItemMemoria_(chave);
    window.configuracoesAlteradas[chave] = true;
    atualizarEstadoSalvar_();
    renderizarKpisConfiguracoes(window.configuracoesGlobal || []);
  };

  window.renderizarConfiguracoes = function() {
    const lista = Array.isArray(window.configuracoesGlobal) ? window.configuracoesGlobal : [];
    const grupos = ['Todos'];
    lista.forEach(function(item) {
      const grupo = item.grupo || 'Sistema';
      if (grupos.indexOf(grupo) === -1) grupos.push(grupo);
    });

    renderizarKpisConfiguracoes(lista);
    renderizarGruposConfiguracoes(grupos);

    const termoInput = document.getElementById('pesquisaConfiguracoes');
    const termo = normalizarTextoBase(termoInput ? termoInput.value : '');
    const grupoAtual = window.configuracoesGrupoAtual || 'Todos';

    const filtrada = lista.filter(function(item) {
      const texto = normalizarTextoBase([item.chave, item.valor, item.grupo, item.descricao, item.ativo].join(' '));
      const okGrupo = grupoAtual === 'Todos' || String(item.grupo || '') === grupoAtual;
      const okBusca = !termo || texto.indexOf(termo) >= 0;
      return okGrupo && okBusca;
    });

    const contador = document.getElementById('contadorConfiguracoes');
    if (contador) contador.textContent = filtrada.length + ' configurações';

    const painel = document.getElementById('painelConfiguracoes');
    if (!painel) return;
    if (!filtrada.length) {
      painel.innerHTML = '<div class="text-center w-100 py-5 text-muted"><h5>Nenhuma configuração encontrada.</h5></div>';
      atualizarEstadoSalvar_();
      return;
    }

    const porGrupo = {};
    filtrada.forEach(function(item) {
      const grupo = item.grupo || 'Sistema';
      if (!porGrupo[grupo]) porGrupo[grupo] = [];
      porGrupo[grupo].push(item);
    });

    painel.innerHTML = Object.keys(porGrupo).map(function(grupo) {
      var itens = porGrupo[grupo];
      var compositor = '';
      var visiveis = itens;
      if (grupo === 'E-mail') {
        compositor = renderEmailCompositorCards_();
        visiveis = itens.filter(function(it) { return !isConfigEmailModalKey_(it.chave); });
      }
      return '<div class="config-group-card">'
        + '<div class="config-group-head"><h5><i class="bi ' + escapeHtml(getIconeConfigGrupo(grupo)) + ' me-2"></i>' + escapeHtml(grupo) + '</h5><span>' + itens.length + ' itens</span></div>'
        + '<div class="config-list">' + compositor + visiveis.map(renderLinhaConfiguracao).join('') + '</div>'
        + '</div>';
    }).join('');

    atualizarEstadoSalvar_();
  };

  window.renderizarKpisConfiguracoes = function(lista) {
    const el = document.getElementById('configKpis');
    if (!el) return;
    const total = lista.length;
    const ativos = lista.filter(function(i) { return String(i.ativo || '').toUpperCase() === 'SIM'; }).length;
    const emailEmpresa = (lista.find(function(i) { return i.chave === 'EMAIL_EMPRESA'; }) || {}).valor || 'Não definido';
    const horarioItem = lista.find(function(i) { return i.chave === 'HORARIO_LIMITE_CAMPO'; }) || { chave: 'HORARIO_LIMITE_CAMPO', valor: '11:00' };
    const horario = formatarValorConfigParaTela_(horarioItem) || '11:00';
    el.innerHTML = ''
      + kpiConfigHtml(
          'bi-sliders',
          'Parâmetros cadastrados',
          total,
          'configurações',
          'var(--primary)',
          'Quantidade total de regras e parâmetros disponíveis para ajustar o comportamento do sistema sem alterar código.'
        )
      + kpiConfigHtml(
          'bi-toggle-on',
          'Parâmetros ativos',
          ativos,
          'em uso',
          'var(--visita)',
          'Quantidade de configurações marcadas como SIM. Somente parâmetros ativos devem ser considerados pelas rotinas do sistema.'
        )
      + kpiConfigHtml(
          'bi-clock-fill',
          'Horário limite do campo',
          escapeHtml(horario),
          'até esse horário',
          'var(--orcamento)',
          'Horário máximo para a empresa registrar a equipe do dia nas unidades em atendimento. Após esse horário, o sistema pode gerar alerta ou cobrança automática.'
        )
      + kpiConfigHtml(
          'bi-envelope-check-fill',
          'E-mail da empresa',
          emailEmpresa && emailEmpresa !== 'Não definido' ? 'OK' : 'Pendente',
          emailEmpresa && emailEmpresa !== 'Não definido' ? 'configurado' : 'preencher',
          emailEmpresa && emailEmpresa !== 'Não definido' ? 'var(--concluido)' : 'var(--emergencial)',
          'Indica se o e-mail usado para avisos, cobranças e alertas direcionados à empresa está preenchido nas configurações.'
        );
  };

  window.kpiConfigHtml = function(icone, titulo, valor, legenda, cor, detalhe) {
    return '<div class="kpi-box config-kpi-explicado" style="--kpi-color: ' + cor + ';" title="' + escapeHtml(detalhe || titulo) + '">'
      + '<div class="kpi-box-head"><span class="kpi-icon"><i class="bi ' + escapeHtml(icone) + '"></i></span><span class="kpi-pulse"></span></div>'
      + '<div class="kpi-title">' + escapeHtml(titulo) + '</div>'
      + '<div class="kpi-value-row"><div class="kpi-value config-kpi-value">' + escapeHtml(valor) + '</div><span class="kpi-caption">' + escapeHtml(legenda) + '</span></div>'
      + '<div class="config-kpi-detail" style="margin-top:8px;color:#64748b;font-size:.72rem;font-weight:700;line-height:1.28;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">' + escapeHtml(detalhe || '') + '</div>'
      + '</div>';
  };

  window.renderizarGruposConfiguracoes = function(grupos) {
    const el = document.getElementById('configGrupoFiltros');
    if (!el) return;
    const atual = window.configuracoesGrupoAtual || 'Todos';
    el.innerHTML = grupos.map(function(grupo) {
      const ativo = grupo === atual ? ' active' : '';
      return '<button class="config-grupo-btn' + ativo + '" onclick="setConfigGrupo(\'' + escapeJsAttr(grupo) + '\')"><i class="bi ' + escapeHtml(getIconeConfigGrupo(grupo)) + '"></i><span>' + escapeHtml(grupo) + '</span></button>';
    }).join('');
  };

  window.getIconeConfigGrupo = function(grupo) {
    const mapa = {
      'Todos': 'bi-grid-1x2-fill',
      'Empresa': 'bi-buildings-fill',
      'Prazos/SLA': 'bi-hourglass-split',
      'Alertas': 'bi-exclamation-diamond-fill',
      'Sistema': 'bi-gear-fill',
      'Anexos': 'bi-paperclip',
      'Status': 'bi-diagram-3-fill',
      'Personalizadas': 'bi-pencil-square',
      'Permissões': 'bi-shield-lock-fill',
      'E-mail': 'bi-envelope-fill'
    };
    return mapa[grupo] || 'bi-sliders';
  };

  window.renderLinhaConfiguracao = function(item) {
    const chave = String(item.chave || '').trim();
    const id = chaveParaId_(chave);
    const valorTela = formatarValorConfigParaTela_(item);
    const valor = escapeHtml(valorTela);
    const ativo = String(item.ativo || 'SIM').toUpperCase() === 'NÃO' ? 'NÃO' : 'SIM';
    const descricao = escapeHtml(item.descricao || '');
    const padrao = escapeHtml(item.padrao || '');
    const alterada = window.configuracoesAlteradas && window.configuracoesAlteradas[chave];
    const editorValor = isConfigEmailList_(chave)
      ? renderEmailListEditorConfig_(item, id, chave, valorTela)
      : isConfigEmailTempoCorpo_(chave)
        ? renderEmailCorpoEditor_(item, id, chave, valorTela)
        : isConfigEmailTempoAssunto_(chave)
          ? renderEmailAssuntoEditor_(item, id, chave, valorTela)
          : '<input id="cfg_valor_' + escapeHtml(id) + '" class="form-control form-control-sm fw-bold" value="' + valor + '" placeholder="Valor da configuração" oninput="marcarConfiguracaoAlterada(\'' + escapeJsAttr(chave) + '\')">';
    const classeEmail = isConfigEmailList_(chave) ? ' config-row-email-list' : (isConfigEmailTempoCorpo_(chave) ? ' config-row-email-template' : '');

    return '<div class="config-row' + classeEmail + (alterada ? ' alterada' : '') + '" data-chave="' + escapeHtml(chave) + '">'
      + '<div class="config-row-main">'
      + '<div class="config-key"><i class="bi bi-key-fill"></i><span>' + escapeHtml(chave) + '</span>' + (alterada ? '<span class="config-dirty-pill">Alterado</span>' : '') + '</div>'
      + '<div class="config-desc">' + descricao + (padrao ? '<br><span>Padrão: ' + padrao + '</span>' : '') + '</div>'
      + '</div>'
      + '<div class="config-value">' + editorValor + '</div>'
      + '<div class="config-active"><select id="cfg_ativo_' + escapeHtml(id) + '" class="form-select form-select-sm fw-bold" onchange="marcarConfiguracaoAlterada(\'' + escapeJsAttr(chave) + '\')"><option value="SIM"' + (ativo === 'SIM' ? ' selected' : '') + '>SIM</option><option value="NÃO"' + (ativo === 'NÃO' ? ' selected' : '') + '>NÃO</option></select></div>'
      + '</div>';
  };

  window.coletarConfiguracoesAlteradas = function() {
    const alteradas = Object.keys(window.configuracoesAlteradas || {});
    return alteradas.map(montarPayloadConfiguracao_).filter(Boolean);
  };

  window.salvarConfiguracaoLinha = function(chave) {
    marcarConfiguracaoAlterada(chave);
    salvarConfiguracoesTela();
  };

  window.salvarConfiguracoesTela = function(botao) {
    const lista = coletarConfiguracoesAlteradas();
    if (!lista.length) {
      alert('Não há alterações pendentes para salvar.');
      return;
    }
    salvarConfiguracoesPayload_(lista, function() {
      window.configuracoesAlteradas = {};
    }, botao || (typeof gomGetBotaoAtivo === 'function' ? gomGetBotaoAtivo() : null));
  };

  function salvarConfiguracoesPayload_(lista, antesRenderizar, botao) {
    setBotoesConfiguracoes_(true);
    if (botao && typeof gomSetButtonLoading === 'function') gomSetButtonLoading(botao, 'Salvando configurações...');
    google.script.run
      .withSuccessHandler(function(res) {
        setBotoesConfiguracoes_(false);
        const payload = parseJsonConfig_(res);
        if (!payload.ok) {
          if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
          alert('Erro ao salvar configurações: ' + (payload.erro || 'Erro desconhecido'));
          atualizarEstadoSalvar_();
          return;
        }
        if (typeof antesRenderizar === 'function') antesRenderizar();
        const dados = payload.dados || payload; // suporta {dados:{...}} (Apps Script) e {configuracoes:[...]} (Supabase)
        window.configuracoesGlobal = Array.isArray(dados.configuracoes) ? dados.configuracoes : [];
        window.configuracoesCarregadas = true;
        renderizarConfiguracoes();
        if (botao && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'Salvo');
        else if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        alert('Configurações salvas com sucesso.');
      })
      .withFailureHandler(function(err) {
        setBotoesConfiguracoes_(false);
        if (botao && typeof gomResetButtonLoading === 'function') gomResetButtonLoading(botao);
        atualizarEstadoSalvar_();
        alert('Erro ao salvar configurações: ' + (err && err.message ? err.message : String(err)));
      })
      .gomSalvarConfiguracoesWebV1Json({ configuracoes: lista });
  }

  window.configTemAlteracoesPendentes = function() {
    return totalAlteracoes_() > 0;
  };

  window.confirmarSaidaConfiguracoesSeNecessario = function() {
    if (!window.configTemAlteracoesPendentes || !window.configTemAlteracoesPendentes()) return true;
    return confirm('Existem alterações não salvas em Configurações. Deseja sair sem salvar?');
  };

  window.addEventListener('beforeunload', function(event) {
    if (window.configTemAlteracoesPendentes && window.configTemAlteracoesPendentes()) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

})();
