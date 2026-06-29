/* ============================================================================
 * GOM | SME — Ordem de Serviço DOCX sem dependência externa
 * ----------------------------------------------------------------------------
 * Gera um .docx real no navegador, com o brasão embutido em word/media.
 * Não depende de banco, CDN ou biblioteca externa.
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

  var BRASAO_OS_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAGYAAABtCAYAAABTGBShAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFxEAABcRAcom8z8AAB/DSURBVHhe7d0FuDVV1QdwkFBJke6URhCkU+luKZUuAeluEOluRKUbpUOkG+lO6e5Gif19v81d77cZz7333DnB9fne9Tz7uWfmzMyZ2av+K/bcYdJQGpQ0lDGDlIYyZpDSUMYMUhrKmEFK/xWM+eqrr9Ldd9+dXn755Z49KT3wwANp0003Tfvss0/e/uSTT9Jee+2Vfve736Unn3wy7zv66KPTxhtvnM4666y8jT799NP03nvv9WwNXhqUjHnsscfS5Zdfnl566aW8fdBBB6UTTjghrb/++nli0Zprrpm23nrrNPnkk6drrrkmnXTSSWnaaadN6667btpiiy3Sww8/nJZYYol05JFHph/96Efp3//+d2bwJptskpm3yy675Ov4jcsuuyx9+OGHeXuw0LfOmM8++yxddNFF6eCDD05PPPFE3nfTTTelY489Ni211FLp6quvTjPMMEPabrvt8gQ/88wz+RjMmmSSSdIcc8yRhh9++DTssMOmYYYZZsj4zne+k7773e+mH/7wh5lBmPL555+nFVdcMR133HFpwgknTPfdd1/+bptttkk/+9nP8nUx/qqrrkovvvhi3v62qOuM8eC04d13383bjz/+eDrggAPS7rvvnid+hx12SMsvv3w2UST7lFNOSTfeeGP+/Otf/zpLPvr444/T2muvnX7+859/gyHV8YMf/CA999xz+RxEo4yjjjoq7bvvvmmVVVbJf4cbbrh0yCGHpJVXXjltuOGG+doXX3xxz1ndp64whvTRjKA///nP6a9//Wv+TIrnmWeezIy//e1v6cEHH0x33XVXNi/MF2k2UT/96U/TFVdckc8Jcg3a0oghMX7/+9/3HP01EQqTjuF8D6bfcsst2RzutNNOaeGFF86+a8YZZ0yXXHJJPueNN95Im222WT7+gw8+yPs6TR1njIf+05/+lPbYY49sItZYY4202GKLpW233bbniJTuv//+bEp+85vfpLXWWistuuii6S9/+UuW2GmmmSYzZ7/99kvXXnttzxlf07333ptGHnnkhgyJcdppp/Uc/TW5LlDAJ00xxRRp//33TyeffHLWSP7ozDPP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';

  function texto(v) { return String(v == null ? '' : v).trim(); }
  function xml(v) {
    return texto(v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
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
    return parseNumero(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  var UNIDADES = ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'];
  var DEZ_A_DEZENOVE = ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'];
  var DEZENAS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
  var CENTENAS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];
  function extensoAte999(n) {
    n = Math.floor(Number(n) || 0);
    if (n === 0) return '';
    if (n === 100) return 'cem';
    var partes = [], c = Math.floor(n / 100), resto = n % 100;
    if (c) partes.push(CENTENAS[c]);
    if (resto) {
      if (resto < 10) partes.push(UNIDADES[resto]);
      else if (resto < 20) partes.push(DEZ_A_DEZENOVE[resto - 10]);
      else {
        var d = Math.floor(resto / 10), u = resto % 10;
        partes.push(DEZENAS[d] + (u ? ' e ' + UNIDADES[u] : ''));
      }
    }
    return partes.join(' e ');
  }
  function inteiroPorExtenso(n) {
    n = Math.floor(Number(n) || 0);
    if (n === 0) return 'zero';
    var partes = [], milhoes = Math.floor(n / 1000000), milhares = Math.floor((n % 1000000) / 1000), resto = n % 1000;
    if (milhoes) partes.push(milhoes === 1 ? 'um milhão' : extensoAte999(milhoes) + ' milhões');
    if (milhares) partes.push(milhares === 1 ? 'mil' : extensoAte999(milhares) + ' mil');
    if (resto) partes.push(extensoAte999(resto));
    return partes.join(', ').replace(/, ([^,]*)$/, ' e $1');
  }
  function valorPorExtensoBR(valor) {
    var n = Math.round(parseNumero(valor) * 100), reais = Math.floor(n / 100), centavos = n % 100, partes = [];
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
  // Quantidade de dias entre HOJE (data de início da OS) e a data prevista de
  // conclusão do chamado. Retorna null se não houver data prevista válida.
  function prazoDiasAteConclusao_(chamado) {
    var ms = null;
    if (chamado && chamado.dataPrevistaConclusaoRaw) ms = Number(chamado.dataPrevistaConclusaoRaw);
    else if (chamado && chamado.data_prevista_conclusao) { var d1 = new Date(chamado.data_prevista_conclusao); if (!isNaN(d1.getTime())) ms = d1.getTime(); }
    else if (chamado && chamado.dataPrevistaConclusao) {
      var m = String(chamado.dataPrevistaConclusao).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (m) ms = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])).getTime();
    }
    if (ms == null || isNaN(ms)) return null;
    var fim = new Date(ms); fim.setHours(0, 0, 0, 0);
    var ini = new Date(); ini.setHours(0, 0, 0, 0);
    return Math.round((fim.getTime() - ini.getTime()) / 86400000);
  }
  function extrairProcesso(origem) {
    var s = texto(origem);
    if (!s) return '';
    var m = s.match(/(\d{4,6}\s*[\/\-]\s*\d{4}|\d{5,8}\s*\/\s*\d{4})/);
    if (m) return m[1].replace(/\s+/g, '');
    return s.replace(/^solar\s*/i, '').trim();
  }
  function slug(v) {
    return texto(v).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 70) || 'chamado';
  }
  function quebrarServicos(detalhamento, observacoes) {
    var base = texto(detalhamento) || texto(observacoes) || 'Serviços conforme solicitação e orçamento aprovado.';
    var partes = base.split(/\r?\n|;|•|\u2022/g).map(function (x) { return texto(x).replace(/^[-–—•\s]+/, '').trim(); }).filter(Boolean);
    if (!partes.length) partes = ['Serviços conforme solicitação e orçamento aprovado.'];
    return partes.slice(0, 12);
  }
  function quebrarNumeroOS(numeroOs) {
    var s = texto(numeroOs), m = s.match(/^(\d+)\s*\/\s*(\d{4})$/);
    if (m) return { numero: m[1], ano: m[2], completo: m[1] + '/' + m[2] };
    return { numero: s || '____', ano: new Date().getFullYear(), completo: s || '____/' + new Date().getFullYear() };
  }

  async function carregarConfigsOS_() {
    var mapa = Object.assign({}, CONFIG_PADRAO_OS);
    try {
      var chaves = ['OS_EMPRESA_NOME', 'OS_PC_NUMERO', 'OS_PREGAO_ELETRONICO', 'OS_ATA_REGISTRO_PRECOS', 'OS_PRAZO_EXECUCAO', 'NOME_EMPRESA'];
      var r = await window.SB.from('configuracoes').select('chave,valor').in('chave', chaves);
      if (!r.error) (r.data || []).forEach(function (row) { mapa[row.chave] = texto(row.valor); });
    } catch (e) {}
    if (!texto(mapa.OS_EMPRESA_NOME) && texto(mapa.NOME_EMPRESA)) mapa.OS_EMPRESA_NOME = texto(mapa.NOME_EMPRESA);
    return mapa;
  }

  // ───────────────────── DOCX mínimo via OOXML + ZIP sem dependências ───────
  function utf8(s) { return new TextEncoder().encode(String(s)); }
  function b64bytes(base64) {
    var bin = atob(base64), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function concatBytes(arrays) {
    var total = arrays.reduce(function (n, a) { return n + a.length; }, 0), out = new Uint8Array(total), off = 0;
    arrays.forEach(function (a) { out.set(a, off); off += a.length; });
    return out;
  }
  function u16(n) { return new Uint8Array([n & 255, (n >>> 8) & 255]); }
  function u32(n) { return new Uint8Array([n & 255, (n >>> 8) & 255, (n >>> 16) & 255, (n >>> 24) & 255]); }
  var CRC_TABLE = null;
  function crc32(bytes) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Uint32Array(256);
      for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        CRC_TABLE[n] = c >>> 0;
      }
    }
    var crc = 0 ^ (-1);
    for (var i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 255];
    return (crc ^ (-1)) >>> 0;
  }
  function zipDateTime() {
    var d = new Date();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2);
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    return { time: time, date: date };
  }
  function criarZip(files) {
    var locals = [], centrals = [], offset = 0, dt = zipDateTime();
    files.forEach(function (f) {
      var name = utf8(f.name), data = typeof f.data === 'string' ? utf8(f.data) : f.data;
      var crc = crc32(data), size = data.length;
      var local = concatBytes([u32(0x04034b50), u16(20), u16(0), u16(0), u16(dt.time), u16(dt.date), u32(crc), u32(size), u32(size), u16(name.length), u16(0), name, data]);
      var central = concatBytes([u32(0x02014b50), u16(20), u16(20), u16(0), u16(0), u16(dt.time), u16(dt.date), u32(crc), u32(size), u32(size), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(offset), name]);
      locals.push(local); centrals.push(central); offset += local.length;
    });
    var centralStart = offset;
    var centralData = concatBytes(centrals);
    var end = concatBytes([u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(centralData.length), u32(centralStart), u16(0)]);
    return concatBytes(locals.concat([centralData, end]));
  }

  function r(t, opts) {
    opts = opts || {};
    var rp = '<w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>';
    if (opts.bold) rp += '<w:b/>';
    if (opts.color) rp += '<w:color w:val="' + opts.color + '"/>';
    rp += '<w:sz w:val="' + (opts.size || 24) + '"/><w:szCs w:val="' + (opts.size || 24) + '"/></w:rPr>';
    return '<w:r>' + rp + '<w:t xml:space="preserve">' + xml(t) + '</w:t></w:r>';
  }
  function pxml(inner, opts) {
    opts = opts || {};
    var pr = '<w:pPr>';
    if (opts.align) pr += '<w:jc w:val="' + opts.align + '"/>';
    if (opts.after || opts.before) pr += '<w:spacing' + (opts.before ? ' w:before="' + opts.before + '"' : '') + (opts.after ? ' w:after="' + opts.after + '"' : '') + '/>';
    if (opts.firstLine || opts.left) pr += '<w:ind' + (opts.left ? ' w:left="' + opts.left + '"' : '') + (opts.firstLine ? ' w:firstLine="' + opts.firstLine + '"' : '') + '/>';
    pr += '</w:pPr>';
    return '<w:p>' + pr + inner + '</w:p>';
  }
  function imgParagraph() {
    var cx = 780000, cy = 835000;
    return '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/></w:pPr><w:r><w:drawing>' +
      '<wp:inline xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" distT="0" distB="0" distL="0" distR="0">' +
      '<wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:effectExtent l="0" t="0" r="0" b="0"/><wp:docPr id="1" name="Brasão"/><wp:cNvGraphicFramePr/>' +
      '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">' +
      '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="1" name="brasao.png"/><pic:cNvPicPr/></pic:nvPicPr>' +
      '<pic:blipFill><a:blip xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:embed="rIdBrasao"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>' +
      '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic>' +
      '</a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
  }

  function criarDocumentXml_(chamado, cfg) {
    var numeroOs = quebrarNumeroOS(chamado.numeroOs || chamado.numero_os || chamado.auxiliar);
    var processo = extrairProcesso(chamado.sistema || chamado.origem || '');
    var valor = chamado.valorOrcamento || chamado.valor_orcamento || 0;
    var valorNum = parseNumero(valor);
    var valorTexto = valorNum > 0 ? moedaBR(valor) + ' (' + valorPorExtensoBR(valor) + ')' : 'conforme orçamento aprovado por esta divisão';
    var endereco = texto(chamado.enderecoEscola || chamado.endereco);
    var unidade = texto(chamado.unidade || chamado.unidade_escolar || 'UNIDADE NÃO INFORMADA');
    var unidadeTrecho = unidade + (endereco ? ' - situada ' + endereco + ' - Ribeirão Preto - SP' : '');
    var servicos = quebrarServicos(chamado.detalhamento, chamado.observacoes);
    var paragrafo = 'Venho, pelo presente, informar que Vossa Senhoria está autorizado (a) a efetuar os serviços abaixo indicados, de manutenção corretiva e adequações do prédio da ' + unidadeTrecho + ', ';
    paragrafo += valorNum > 0 ? 'no valor total de ' + valorTexto : valorTexto;
    paragrafo += ' conforme planilha aprovada por esta divisão, observando-se o disposto nas demais cláusulas da Ata de Registro de Preços em referência.';

    var body = '';
    body += imgParagraph();
    body += pxml(r('Prefeitura Municipal de Ribeirão Preto', { bold: true, size: 30, color: '6B6B6B' }), { align: 'center', after: 20 });
    body += pxml(r('Estado de São Paulo', { size: 24, color: '6B6B6B' }), { align: 'center', after: 80 });
    body += pxml(r('Secretaria Municipal da Educação', { size: 26, color: '6B6B6B' }), { align: 'center', after: 320 });
    body += pxml(r('ORDEM DE SERVIÇO Nº ' + numeroOs.completo, { bold: true, size: 26 }), { align: 'center', after: 180 });
    body += pxml(r('Processo Nº ' + (processo || '________________')), { after: 40 });
    body += pxml(r('PC Nº ' + (cfg.OS_PC_NUMERO || '________________') + '     Pregão Eletrônico Nº ' + (cfg.OS_PREGAO_ELETRONICO || '________________')), { after: 40 });
    body += pxml(r('Ata de Registro de Preços Nº ' + (cfg.OS_ATA_REGISTRO_PRECOS || '________________')), { after: 40 });
    var diasPrazo = prazoDiasAteConclusao_(chamado);
    var prazoTexto = (diasPrazo != null && diasPrazo > 0)
      ? (diasPrazo + (diasPrazo === 1 ? ' DIA' : ' DIAS'))
      : (cfg.OS_PRAZO_EXECUCAO || '45 DIAS');
    body += pxml(r('Prazo de execução: ' + prazoTexto), { after: 40 });
    body += pxml(r('Data de início: ' + dataBRHoje_()), { after: 220 });
    body += pxml(r(dataAtualPorExtenso_()), { after: 300 });
    body += pxml(r('À ' + (cfg.OS_EMPRESA_NOME || CONFIG_PADRAO_OS.OS_EMPRESA_NOME), { bold: true }), { after: 40 });
    body += pxml(r('Ilustríssimo (a) Senhor (a),'), { after: 220 });
    body += pxml(r(paragrafo), { align: 'both', firstLine: 720, after: 240 });
    servicos.forEach(function (item) { body += pxml(r('· ' + item.replace(/[.;]+$/, '') + ';'), { left: 720, after: 80 }); });
    body += pxml(r('Atenciosamente'), { before: 360, after: 720 });
    body += pxml(r('Secretaria Municipal de Educação'), { align: 'center', after: 20 });
    body += pxml(r('Gerência de Obras de Manutenção'), { align: 'center' });
    body += '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1200" w:right="1080" w:bottom="1080" w:left="1080" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr>';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><w:body>' + body + '</w:body></w:document>';
  }

  function criarDocxBlob_(chamado, cfg) {
    var files = [
      { name: '[Content_Types].xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>' },
      { name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>' },
      { name: 'word/_rels/document.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdBrasao" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/brasao.png"/><Relationship Id="rIdStyles" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'word/styles.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman"/><w:sz w:val="24"/></w:rPr></w:style></w:styles>' },
      { name: 'docProps/core.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Ordem de Serviço GOM</dc:title><dc:creator>GOM SME</dc:creator></cp:coreProperties>' },
      { name: 'docProps/app.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes"><Application>GOM SME</Application></Properties>' },
      { name: 'word/document.xml', data: criarDocumentXml_(chamado, cfg) },
      { name: 'word/media/brasao.png', data: b64bytes(BRASAO_OS_BASE64) }
    ];
    var zipBytes = criarZip(files);
    return new Blob([zipBytes], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  function baixarBlob_(blob, nomeArquivo) {
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
    if (!chamado) { alert('Não foi possível identificar o chamado aberto.'); return; }
    if (!podeBaixarOSChamado_(chamado)) { alert('A Ordem de Serviço só pode ser gerada para chamados com OS emitida e por perfis autorizados.'); return; }
    var numeroOs = texto(chamado.numeroOs || chamado.numero_os || chamado.auxiliar);
    if (!numeroOs) { alert('Informe o número da OS antes de gerar o documento.'); return; }

    var textoOriginal = botao ? botao.innerHTML : '';
    try {
      if (botao) { botao.disabled = true; botao.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Gerando DOCX...'; }
      var cfg = await carregarConfigsOS_();
      var blob = criarDocxBlob_(chamado, cfg);
      var arquivo = 'OS_' + slug(numeroOs) + '_' + slug(chamado.unidade || 'unidade') + '.docx';
      baixarBlob_(blob, arquivo);
      if (botao && typeof gomMostrarSucessoBotao === 'function') gomMostrarSucessoBotao(botao, 'DOCX gerado');
    } catch (e) {
      console.error('[GOM] Erro ao gerar OS DOCX:', e);
      alert('Erro ao gerar Ordem de Serviço em DOCX: ' + (e && e.message ? e.message : e));
    } finally {
      if (botao) setTimeout(function () { botao.disabled = false; botao.innerHTML = textoOriginal || '<i class="bi bi-file-earmark-word me-1"></i>Baixar OS'; }, 900);
    }
  }

  window.atualizarBotaoOrdemServicoModal = atualizarBotaoOrdemServicoModal;
  window.baixarOrdemServicoChamadoModal = baixarOrdemServicoChamadoModal;
})();
