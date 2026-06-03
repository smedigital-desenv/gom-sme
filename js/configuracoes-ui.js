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
  const CONFIG_EMAIL_LIST_KEYS = [
    'EMAILS_ADMIN_GOM',
    'EMAILS_GOM_OPERACIONAL',
    'EMAILS_EMPRESA_ADICIONAIS',
    'EMAILS_CAMPO',
    'EMAILS_CONFERENTE'
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

  function renderEmailListEditorConfig_(item, id, chave, valor) {
    const emails = normalizarListaEmailsConfig_(valor);
    return ''
      + '<div class="config-email-editor" data-chave="' + escapeHtml(chave) + '">'
      + '<input type="hidden" id="cfg_valor_' + escapeHtml(id) + '" value="' + escapeHtml(emails.join(', ')) + '">'
      + '<div class="config-email-toolbar"><span><i class="bi bi-people-fill me-1"></i>Usuários deste perfil</span><strong id="cfg_email_count_' + escapeHtml(id) + '">' + emails.length + ' e-mail' + (emails.length === 1 ? '' : 's') + '</strong></div>'
      + '<div class="config-email-chips" id="cfg_email_chips_' + escapeHtml(id) + '">' + renderEmailChipsHtml_(chave, emails) + '</div>'
      + '<div class="config-email-add">'
        + '<input id="cfg_email_input_' + escapeHtml(id) + '" class="form-control form-control-sm" type="email" placeholder="Digite um e-mail e pressione Enter" onkeydown="if(event.key===\'Enter\'){event.preventDefault();adicionarEmailConfig(\'' + escapeJsAttr(chave) + '\');}">'
        + '<button type="button" class="btn btn-primary btn-sm fw-bold" onclick="adicionarEmailConfig(\'' + escapeJsAttr(chave) + '\')"><i class="bi bi-plus-circle me-1"></i>Adicionar</button>'
      + '</div>'
      + '<div class="config-email-bulk">'
        + '<textarea id="cfg_email_bulk_' + escapeHtml(id) + '" class="form-control form-control-sm" rows="2" placeholder="Cole vários e-mails aqui, separados por vírgula, ponto e vírgula, espaço ou quebra de linha"></textarea>'
        + '<button type="button" class="btn btn-light border btn-sm fw-bold" onclick="importarEmailsConfig(\'' + escapeJsAttr(chave) + '\')"><i class="bi bi-clipboard-plus me-1"></i>Importar lista</button>'
      + '</div>'
      + '<div class="config-email-help"><i class="bi bi-info-circle me-1"></i>Na planilha será salvo automaticamente como lista separada por vírgulas. O sistema também aceita vírgula, ponto e vírgula, espaço ou quebra de linha.</div>'
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
        const dados = payload.dados || {};
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
      return '<div class="config-group-card">'
        + '<div class="config-group-head"><h5><i class="bi ' + escapeHtml(getIconeConfigGrupo(grupo)) + ' me-2"></i>' + escapeHtml(grupo) + '</h5><span>' + porGrupo[grupo].length + ' itens</span></div>'
        + '<div class="config-list">' + porGrupo[grupo].map(renderLinhaConfiguracao).join('') + '</div>'
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
      'Permissões': 'bi-shield-lock-fill'
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
      : '<input id="cfg_valor_' + escapeHtml(id) + '" class="form-control form-control-sm fw-bold" value="' + valor + '" placeholder="Valor da configuração" oninput="marcarConfiguracaoAlterada(\'' + escapeJsAttr(chave) + '\')">';
    const classeEmail = isConfigEmailList_(chave) ? ' config-row-email-list' : '';

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
        const dados = payload.dados || {};
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