/* ============================================================================
 * GOM | SME — Documento de Ordem de Serviço
 * ----------------------------------------------------------------------------
 * Gera um arquivo Word compatível (.doc) no navegador, preenchido com os dados
 * do chamado/OS. Fase inicial: download para envio manual por e-mail.
 * ========================================================================== */
(function () {
  'use strict';

  var CONFIG_PADRAO_OS = {
    OS_EMPRESA_NOME: 'ATLÂNTICA CONSTRUÇÕES, COMÉRCIO E SERVIÇOS LTDA',
    OS_PC_NUMERO: '0290/2024',
    OS_PREGAO_ELETRONICO: '0157/2024',
    OS_ATA_REGISTRO_PRECOS: '177-01/2024',
    OS_PRAZO_EXECUCAO: '45 DIAS'
  };

  function texto(v) {
    return String(v == null ? '' : v).trim();
  }

  function escapeHtml(v) {
    return texto(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeDoc(v) {
    return escapeHtml(v).replace(/\r?\n/g, '<br>');
  }

  function normalizarPerfilOS_(perfil) {
    var p = texto(perfil).toUpperCase().replace(/[\s-]+/g, '_');
    if (p === 'ADMINISTRADOR_GOM') p = 'ADMIN_GOM';
    if (p === 'GOM') p = 'SECRETARIA';
    return p;
  }

  function usuarioPodeGerarOS_() {
    var perfil = '';
    try { perfil = (window.GomAuth && window.GomAuth.perfil) || ''; } catch (e) {}
    if (!perfil) {
      try { perfil = (window.usuarioAtualGom && window.usuarioAtualGom.perfil) || ''; } catch (e2) {}
    }
    perfil = normalizarPerfilOS_(perfil);
    return perfil === 'ADMIN_GOM' || perfil === 'SECRETARIA';
  }

  function normalizarStatus_(st) {
    if (typeof window.normalizarSituacaoSistema === 'function') return window.normalizarSituacaoSistema(st);
    if (window.GomMap && typeof window.GomMap.normalizarStatus === 'function') return window.GomMap.normalizarStatus(st);
    return texto(st);
  }

  function podeBaixarOSChamado_(chamado) {
    if (!usuarioPodeGerarOS_()) return false;
    if (!chamado) return false;
    var status = normalizarStatus_(chamado.situacao || chamado.status);
    return status === 'OS emitida' || !!texto(chamado.numeroOs || chamado.numero_os || chamado.auxiliar);
  }

  function obterChamadoAberto_() {
    var id = '';
    try { id = window.idChamadoAberto || idChamadoAberto || ''; } catch (e) {}
    if (!id) {
      var el = document.getElementById('mdlId');
      id = el ? el.textContent : '';
    }
    return (window.listaChamadosGlobal || []).find(function (x) {
      return String(x && x.id) === String(id);
    }) || null;
  }

  function atualizarBotaoOrdemServicoModal(chamado) {
    var btn = document.getElementById('mdlBtnBaixarOS');
    if (!btn) return;
    btn.style.display = podeBaixarOSChamado_(chamado) ? '' : 'none';
  }

  function parseNumero(valor) {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') return isFinite(valor) ? valor : 0;
    var s = String(valor).replace(/[^0-9,.-]/g, '');
    if (s.indexOf(',') > -1 && s.indexOf('.') > -1) s = s.replace(/\./g, '').replace(',', '.');
    else if (s.indexOf(',') > -1) s = s.replace(',', '.');
    var n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  function moedaBR(valor) {
    var n = parseNumero(valor);
    return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  var UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  var DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  var CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

  function extensoAte999(n) {
    n = Math.floor(Number(n) || 0);
    if (n === 0) return '';
    if (n === 100) return 'cem';
    var partes = [];
    var c = Math.floor(n / 100);
    var resto = n % 100;
    if (c) partes.push(CENTENAS[c]);
    if (resto) {
      if (resto < 10) partes.push(UNIDADES[resto]);
      else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
      else {
        var d = Math.floor(resto / 10);
        var u = resto % 10;
        partes.push(DEZENAS[d] + (u ? ' e ' + UNIDADES[u] : ''));
      }
    }
    return partes.join(' e ');
  }

  function inteiroPorExtenso(n) {
    n = Math.floor(Number(n) || 0);
    if (n === 0) return 'zero';
    var partes = [];
    var milhoes = Math.floor(n / 1000000);
    var milhares = Math.floor((n % 1000000) / 1000);
    var resto = n % 1000;
    if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : extensoAte999(milhoes) + ' milhões');
    if (milhares) partes.push(milhares === 1 ? 'mil' : extensoAte999(milhares) + ' mil');
    if (resto) partes.push(extensoAte999(resto));
    return partes.join(', ').replace(/, ([^,]*)$/, ' e $1');
  }

  function valorPorExtensoBR(valor) {
    var n = Math.round(parseNumero(valor) * 100);
    var reais = Math.floor(n / 100);
    var centavos = n % 100;
    var partes = [];
    if (reais) partes.push(inteiroPorExtenso(reais) + ' ' + (reais === 1 ? 'real' : 'reais'));
    if (centavos) partes.push(inteiroPorExtenso(centavos) + ' ' + (centavos === 1 ? 'centavo' : 'centavos'));
    return partes.length ? partes.join(' e ') : 'zero real';
  }

  function dataAtualPorExtenso_() {
    var d = new Date();
    var meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return 'Ribeirão Preto, ' + String(d.getDate()).padStart(2, '0') + ' de ' + meses[d.getMonth()] + ' de ' + d.getFullYear() + '.';
  }

  function dataBRHoje_() {
    var d = new Date();
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
  }

  function extrairProcesso(origem) {
    var s = texto(origem);
    if (!s) return '';
    var m = s.match(/(\d{4,6}\s*[\/\-]\s*\d{4}|\d{5,8}\s*\/\s*\d{4})/);
    if (m) return m[1].replace(/\s+/g, '');
    return s.replace(/^solar\s*/i, '').trim();
  }

  function slug(v) {
    return texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) || 'chamado';
  }

  function quebrarServicos(detalhamento, observacoes) {
    var base = texto(detalhamento) || texto(observacoes) || 'Serviços conforme solicitação e orçamento aprovado.';
    var partes = base.split(/\r?\n|;|•|\u2022/g)
      .map(function (x) { return texto(x).replace(/^[-–—•\s]+/, '').trim(); })
      .filter(Boolean);
    if (!partes.length) partes = ['Serviços conforme solicitação e orçamento aprovado.'];
    return partes.slice(0, 12);
  }

  function quebrarNumeroOS(numeroOs) {
    var s = texto(numeroOs);
    var m = s.match(/^(\d+)\s*\/\s*(\d{4})$/);
    if (m) return { numero: m[1], ano: m[2], completo: m[1] + '/' + m[2] };
    return { numero: s || '____', ano: new Date().getFullYear(), completo: s || '____/' + new Date().getFullYear() };
  }

  async function carregarConfigsOS_() {
    var mapa = Object.assign({}, CONFIG_PADRAO_OS);
    try {
      var chaves = ['OS_EMPRESA_NOME', 'OS_PC_NUMERO', 'OS_PREGAO_ELETRONICO', 'OS_ATA_REGISTRO_PRECOS', 'OS_PRAZO_EXECUCAO', 'NOME_EMPRESA'];
      var r = await window.SB.from('configuracoes').select('chave,valor').in('chave', chaves);
      if (!r.error) {
        (r.data || []).forEach(function (row) { mapa[row.chave] = texto(row.valor); });
      }
    } catch (e) {}
    if (!texto(mapa.OS_EMPRESA_NOME) && texto(mapa.NOME_EMPRESA)) mapa.OS_EMPRESA_NOME = texto(mapa.NOME_EMPRESA);
    return mapa;
  }

  function montarHtmlOS_(chamado, cfg) {
    var numeroOs = quebrarNumeroOS(chamado.numeroOs || chamado.numero_os || chamado.auxiliar);
    var processo = extrairProcesso(chamado.sistema || chamado.origem || '');
    var valor = chamado.valorOrcamento || chamado.valor_orcamento || 0;
    var valorNum = parseNumero(valor);
    var valorLinha = valorNum > 0
      ? 'no valor total de <strong>' + escapeHtml(moedaBR(valor)) + '</strong> (' + escapeHtml(valorPorExtensoBR(valor)) + ')'
      : 'conforme orçamento aprovado por esta divisão';
    var endereco = texto(chamado.enderecoEscola || chamado.endereco);
    var unidade = texto(chamado.unidade || chamado.unidade_escolar);
    var unidadeTrecho = '<strong>' + escapeHtml(unidade || 'UNIDADE NÃO INFORMADA') + '</strong>';
    if (endereco) unidadeTrecho += ' - situada ' + escapeHtml(endereco) + ' - Ribeirão Preto - SP';
    var servicos = quebrarServicos(chamado.detalhamento, chamado.observacoes).map(function (item) {
      return '<li>' + escapeDoc(item) + ';</li>';
    }).join('');

    return '<!DOCTYPE html><html><head><meta charset="UTF-8">'
      + '<title>Ordem de Serviço ' + escapeHtml(numeroOs.completo) + '</title>'
      + '<style>'
      + '@page{size:A4;margin:2.4cm 2.2cm 2.2cm 2.2cm;}'
      + 'body{font-family:"Times New Roman",serif;font-size:12pt;color:#000;line-height:1.35;}'
      + '.cab{text-align:center;line-height:1.2;margin-bottom:28px;}'
      + '.cab .p1{font-size:13pt;font-weight:bold;}.cab .p2,.cab .p3{font-size:12pt;}'
      + '.titulo{text-align:center;font-weight:bold;font-size:13pt;margin:18px 0 12px;text-transform:uppercase;}'
      + '.meta{margin-top:8px;margin-bottom:22px;}.meta div{margin:2px 0;}'
      + '.data{text-align:left;margin:14px 0 28px;}'
      + '.dest{font-weight:bold;margin-bottom:18px;}'
      + '.paragrafo{text-align:justify;text-indent:2.5cm;margin:0 0 18px;}'
      + 'ul{margin-top:16px;margin-left:32px;}li{margin:6px 0;}'
      + '.fecho{margin-top:38px;} .assinatura{text-align:center;margin-top:54px;line-height:1.35;}'
      + '</style></head><body>'
      + '<div class="cab"><div class="p1">Prefeitura Municipal de Ribeirão Preto</div>'
      + '<div class="p2">Estado de São Paulo</div><div class="p3">Secretaria Municipal da Educação</div></div>'
      + '<div class="titulo">ORDEM DE SERVIÇO Nº ' + escapeHtml(numeroOs.completo) + '</div>'
      + '<div class="meta">'
      + '<div>Processo Nº ' + escapeHtml(processo || '________________') + '</div>'
      + '<div>PC Nº ' + escapeHtml(cfg.OS_PC_NUMERO || '________________') + ' &nbsp;&nbsp;&nbsp;&nbsp; Pregão Eletrônico Nº ' + escapeHtml(cfg.OS_PREGAO_ELETRONICO || '________________') + '</div>'
      + '<div>Ata de Registro de Preços Nº ' + escapeHtml(cfg.OS_ATA_REGISTRO_PRECOS || '________________') + '</div>'
      + '<div>Prazo de execução: ' + escapeHtml(cfg.OS_PRAZO_EXECUCAO || '45 DIAS') + '</div>'
      + '<div>Data de início: ' + escapeHtml(dataBRHoje_()) + '</div>'
      + '</div>'
      + '<div class="data">' + escapeHtml(dataAtualPorExtenso_()) + '</div>'
      + '<div class="dest">À ' + escapeHtml(cfg.OS_EMPRESA_NOME || CONFIG_PADRAO_OS.OS_EMPRESA_NOME) + '<br>Ilustríssimo (a) Senhor (a),</div>'
      + '<p class="paragrafo">Venho, pelo presente, informar que Vossa Senhoria está autorizado (a) a efetuar os serviços abaixo indicados, de manutenção corretiva e adequações do prédio da ' + unidadeTrecho + ', ' + valorLinha + ' conforme planilha aprovada por esta divisão, observando-se o disposto nas demais cláusulas da Ata de Registro de Preços em referência.</p>'
      + '<ul>' + servicos + '</ul>'
      + '<div class="fecho">Atenciosamente</div>'
      + '<div class="assinatura">Secretaria Municipal de Educação<br>Gerência de Obras de Manutenção</div>'
      + '</body></html>';
  }

  function baixarHtmlComoWord_(html, nomeArquivo) {
    var blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      if (a && a.parentNode) a.parentNode.removeChild(a);
    }, 1500);
  }

  async function baixarOrdemServicoChamadoModal(botao) {
    var chamado = obterChamadoAberto_();
    if (!chamado) {
      alert('Não foi possível identificar o chamado aberto.');
      return;
    }
    if (!podeBaixarOSChamado_(chamado)) {
      alert('A Ordem de Serviço só pode ser gerada para chamados com OS emitida e por perfis autorizados.');
      return;
    }
    var numeroOs = texto(chamado.numeroOs || chamado.numero_os || chamado.auxiliar);
    if (!numeroOs) {
      alert('Informe o número da OS antes de gerar o documento.');
      return;
    }

    var textoOriginal = botao ? botao.innerHTML : '';
    try {
      if (botao) {
        botao.disabled = true;
        botao.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Gerando OS...';
      }
      var cfg = await carregarConfigsOS_();
      var html = montarHtmlOS_(chamado, cfg);
      var arquivo = 'OS_' + slug(numeroOs) + '_' + slug(chamado.unidade || 'unidade') + '.doc';
      baixarHtmlComoWord_(html, arquivo);
      if (botao && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'OS gerada');
    } catch (e) {
      console.error('[GOM] Erro ao gerar OS:', e);
      alert('Erro ao gerar Ordem de Serviço: ' + (e && e.message ? e.message : e));
    } finally {
      if (botao) {
        setTimeout(function () {
          botao.disabled = false;
          botao.innerHTML = textoOriginal || '<i class="bi bi-file-earmark-word me-1"></i>Baixar OS';
        }, 900);
      }
    }
  }

  window.atualizarBotaoOrdemServicoModal = atualizarBotaoOrdemServicoModal;
  window.baixarOrdemServicoChamadoModal = baixarOrdemServicoChamadoModal;
})();
