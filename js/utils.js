function escapeHtml(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsAttr(valor) {
  return String(valor == null ? '' : valor)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, ' ');
}

function normalizarTextoBase(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizarSituacaoSistema(valor) {
  const textoOriginal = String(valor || '').trim();
  const textoNormalizado = normalizarTextoBase(textoOriginal);
  if (!textoNormalizado || textoNormalizado === 'recebido' || textoNormalizado === 'avaliar') return 'Em análise';
  if (textoNormalizado === 'aguardando visita' || textoNormalizado === 'aguardando visita tecnica') return 'Aguardando visita';
  if (textoNormalizado === 'devolvido escola' || textoNormalizado === 'devolvido para escola' || textoNormalizado === 'devolvido para a escola') return 'Devolvido para a escola';
  if (textoNormalizado === 'garantia obra - griffo' || textoNormalizado === 'garantia griffo' || textoNormalizado.includes('griffo')) return 'Garantia de Obra';
  const statusCanonico = STATUS_TODOS.find(s => normalizarTextoBase(s) === textoNormalizado);
  return statusCanonico || textoOriginal;
}

function getCorStatus(st) {
  return CORES_STATUS[normalizarSituacaoSistema(st)] || '#002b5e';
}

function getClasseStatus(st) {
  const status = normalizarSituacaoSistema(st);
  const mapaClasses = {
    'Em análise': 'st-analise',
    'Solicitado Orçamento': 'st-orcamento',
    'Orçamento Realizado': 'st-orcamento-realizado',
    'Aguardando visita': 'st-aguardando-visita',
    'Devolvido para a escola': 'st-devolvido',
    'Em atendimento': 'st-atendimento',
    'Atendimento Emergencial': 'st-emergencial',
    'OS emitida': 'st-os',
    'Serviço Realizado': 'st-servico-realizado',
    'Garantia de Obra': 'st-garantia',
    'Garantia de Serviço': 'st-garantia-servico',
    'Visita Técnica': 'st-visita',
    'Concluído': 'st-concluido',
    'Encaminhado para outra gerência ou Unidade escolar.': 'st-encaminhado',
    'A cargo da unidade escolar': 'st-unidade',
    'Duplicado': 'st-duplicado',
    'Unificado': 'st-duplicado'
  };
  return mapaClasses[status] || 'st-default';
}

function getKpiIcon(key) {
  const mapaIcones = {
    'todos': 'bi-grid-1x2-fill',
    'Todos': 'bi-grid-1x2-fill',
    'Todos na tela': 'bi-grid-1x2-fill',
    'Entrada hoje': 'bi-calendar-check-fill',
    'A revisar': 'bi-exclamation-diamond-fill',
    'Em análise': 'bi-search-heart',
    'Solicitado Orçamento': 'bi-cash-coin',
    'Orçamento Realizado': 'bi-receipt-cutoff',
    'Aguardando visita': 'bi-hourglass-split',
    'Fila de visita': 'bi-hourglass-split',
    'Devolvido para a escola': 'bi-reply-fill',
    'Em atendimento': 'bi-tools',
    'Atendimento Emergencial': 'bi-exclamation-triangle-fill',
    'OS emitida': 'bi-file-earmark-check-fill',
    'Serviço Realizado': 'bi-clipboard2-check-fill',
    'Garantia de Obra': 'bi-shield-check',
    'Garantia de Serviço': 'bi-arrow-repeat',
    'Visita Técnica': 'bi-person-walking',
    'Concluído': 'bi-check-circle-fill',
    'Encaminhado para outra gerência ou Unidade escolar.': 'bi-send-fill',
    'A cargo da unidade escolar': 'bi-building-fill-gear',
    'Duplicado': 'bi-copy',
    'Unificado': 'bi-collection',
    'Todas as obras': 'bi-buildings-fill',
    'Aguardando': 'bi-hourglass-split',
    'Em projeto': 'bi-pencil-square',
    'Em licitação': 'bi-megaphone-fill',
    'Em execução': 'bi-hammer',
    'Suspensa': 'bi-pause-circle-fill',
    'Concluída': 'bi-check-circle-fill',
    'Arquivada': 'bi-archive-fill',
    'OS emitidas': 'bi-file-earmark-check-fill',
    'Emergenciais': 'bi-exclamation-triangle-fill',
    'OS sem número': 'bi-exclamation-diamond-fill',
    'Em campo': 'bi-geo-alt-fill',
    'Pendentes hoje': 'bi-clock-history',
    'Preenchidos hoje': 'bi-check-circle-fill',
    'Total de alertas': 'bi-exclamation-diamond-fill',
    'Críticos': 'bi-exclamation-triangle-fill',
    'Alta prioridade': 'bi-clock-history',
    'Campo': 'bi-geo-alt-fill',
    'Orçamentos': 'bi-cash-coin',
    'Aprovações': 'bi-receipt-cutoff'
  };
  return mapaIcones[key || 'todos'] || 'bi-circle-fill';
}

const KPI_DESCRICOES_GOM = {
  'Todos na tela': 'Total de registros exibidos nesta tela, considerando o fluxo atual.',
  'Todos': 'Total de registros exibidos nesta tela.',
  'Em análise': 'Chamados novos, ainda sem encaminhamento inicial pela equipe interna.',
  'Solicitado Orçamento': 'Chamados enviados para a empresa elaborar orçamento.',
  'Orçamento Realizado': 'Orçamentos devolvidos pela empresa, aguardando aprovação interna.',
  'Aguardando visita': 'Chamados aguardando visita técnica para definir o próximo encaminhamento.',
  'Fila de visita': 'Chamados aguardando visita técnica, ordenados pela entrada mais antiga.',
  'Entrada hoje': 'Registros que entraram nesta fila na data atual.',
  'A revisar': 'Registros com data, horário ou controle de fila inconsistentes.',
  'Devolvido para a escola': 'Chamados devolvidos para a unidade escolar, encerrados no fluxo interno.',
  'Em atendimento': 'Chamados em atendimento operacional.',
  'Atendimento Emergencial': 'Demandas encaminhadas como prioridade alta ou risco imediato.',
  'OS emitida': 'Chamados aprovados com ordem de serviço liberada para execução.',
  'Serviço Realizado': 'Serviços informados como realizados pela empresa, aguardando validação/finalização.',
  'Garantia de Obra': 'Demandas vinculadas a serviço em garantia de obra.',
  'Garantia de Serviço': 'Serviço validado pela GOM como garantia: retorna à empresa para correção sem novo orçamento.',
  'Visita Técnica': 'Registros tratados como vistoria técnica.',
  'Concluído': 'Chamados finalizados e enviados ao Memorial.',
  'Encaminhado para outra gerência ou Unidade escolar.': 'Chamados direcionados para outro setor ou unidade responsável.',
  'A cargo da unidade escolar': 'Chamados cuja solução ficou sob responsabilidade da unidade escolar.',
  'Duplicado': 'Chamados identificados como repetidos.',
  'Unificado': 'Chamados unificados em um único chamado principal da unidade.',
  'Todas as obras': 'Total de obras, ampliações e intervenções estruturais cadastradas.',
  'Aguardando': 'Obras ainda sem avanço definido ou aguardando próxima ação.',
  'Em projeto': 'Obras em fase de projeto, estudo técnico ou definição inicial.',
  'Em licitação': 'Obras em etapa de processo licitatório ou contratação.',
  'Em execução': 'Obras com execução em andamento.',
  'Suspensa': 'Obras paralisadas temporariamente ou aguardando liberação.',
  'Concluída': 'Obras concluídas.',
  'Arquivada': 'Obras encerradas ou arquivadas para histórico.',
  'OS emitidas': 'Ordens de serviço liberadas para a empresa executar.',
  'Emergenciais': 'Atendimentos emergenciais em andamento ou pendentes de informação.',
  'OS sem número': 'Ordens de serviço emitidas sem numeração preenchida.',
  'Em campo': 'Unidades com atendimento em campo ou execução em andamento.',
  'Pendentes hoje': 'Atendimentos sem equipe registrada no dia atual.',
  'Preenchidos hoje': 'Atendimentos que já receberam equipe e informação diária hoje.',
  'Parâmetros cadastrados': 'Quantidade total de configurações disponíveis no sistema.',
  'Parâmetros ativos': 'Configurações marcadas como ativas e consideradas pelo sistema.',
  'Horário limite do campo': 'Horário máximo para a empresa registrar a equipe do dia. Após isso, pode haver alerta/cobrança.',
  'E-mail da empresa': 'E-mail usado para avisos e cobranças automáticas enviados à empresa.',
  'Total de alertas': 'Todas as pendências encontradas automaticamente no fluxo.',
  'Críticos': 'Pendências que podem comprometer rastreabilidade, prazo ou operação diária.',
  'Alta prioridade': 'Itens parados acima do prazo configurado.',
  'Campo': 'Unidades em atendimento sem informação diária da equipe.',
  'Orçamentos': 'Orçamentos solicitados que ainda não retornaram.',
  'Aprovações': 'Orçamentos realizados aguardando decisão interna.'
};

function getKpiDescricao(key, title, fallback) {
  const candidatos = [key, title, normalizarSituacaoSistema(key), normalizarSituacaoSistema(title)]
    .map(v => String(v == null ? '' : v).trim())
    .filter(Boolean);

  for (const c of candidatos) {
    if (KPI_DESCRICOES_GOM[c]) return KPI_DESCRICOES_GOM[c];
  }

  if (fallback && !String(fallback).toLowerCase().startsWith('filtrar')) return String(fallback);
  return 'Indicador operacional desta tela. Passe o mouse para consultar o significado e clique para filtrar quando disponível.';
}

function montarKpiCard(key, title, valor, cor, ativo, tooltip, clicavel = true) {
  if (Number(valor) <= 0) return '';
  const filtro = key === null ? 'null' : JSON.stringify(String(key));
  const tituloSeguro = escapeHtml(title);
  const valorSeguro = escapeHtml(valor);
  const unidadeCaption = telaAtual === 'obras' ? ['obra', 'obras'] : ['chamado', 'chamados'];
  const caption = Number(valor) === 1 ? unidadeCaption[0] : unidadeCaption[1];
  const icone = getKpiIcon(key || title);
  const descricao = getKpiDescricao(key, title, tooltip);
  const descricaoSeguro = escapeHtml(descricao);
  const tooltipSeguro = descricaoSeguro;
  const clique = clicavel ? `onclick='filtrarPorStatus(${filtro})'` : '';
  return `
    <div class="kpi-box ${ativo ? 'ativo' : ''} ${clicavel ? '' : 'info'}" style="--kpi-color: ${cor};" ${clique} title="${tooltipSeguro}" aria-label="${tituloSeguro}: ${descricaoSeguro}">
      <div class="kpi-box-head">
        <span class="kpi-icon"><i class="bi ${icone}"></i></span>
        <span class="kpi-pulse"></span>
      </div>
      <div class="kpi-title">${tituloSeguro}</div>
      <div class="kpi-value-row">
        <div class="kpi-value">${valorSeguro}</div>
        <span class="kpi-caption">${caption}</span>
      </div>
      <div class="kpi-help">${descricaoSeguro}</div>
    </div>`;
}

function termoPesquisa() {
  const el = document.getElementById('pesquisa');
  return normalizarTextoBase(el ? el.value : '');
}

function parseDataOrdenacao(item) {
  const raw = Number(item && (item.dataEntradaFilaRaw || item.dataOrdenacaoFila || item.dataRaw || item.dataOrdenacao));
  if (raw && !isNaN(raw)) return raw;
  return parseDataHoraBR(item ? (item.dataHoraEntradaFila || item.dataEntradaFila || item.dataHora || item.data) : '') || Number.MAX_SAFE_INTEGER;
}

function parseDataHoraBR(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return null;
  const match = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  let ano = Number(match[3]);
  if (ano < 100) ano += 2000;
  const data = new Date(ano, Number(match[2]) - 1, Number(match[1]), match[4] !== undefined ? Number(match[4]) : 0, match[5] !== undefined ? Number(match[5]) : 0, match[6] !== undefined ? Number(match[6]) : 0);
  const timestamp = data.getTime();
  return isNaN(timestamp) ? null : timestamp;
}

function hojeBr() { return new Date().toLocaleDateString('pt-BR'); }

function ehMesmoDia(timestamp, dataReferencia) {
  if (!timestamp || timestamp === Number.MAX_SAFE_INTEGER) return false;
  const data = new Date(timestamp);
  return data.getFullYear() === dataReferencia.getFullYear()
    && data.getMonth() === dataReferencia.getMonth()
    && data.getDate() === dataReferencia.getDate();
}

function formatarTempoFila(timestamp) {
  if (!timestamp || timestamp === Number.MAX_SAFE_INTEGER) return 'Entrada não registrada';
  const diff = Date.now() - timestamp;
  if (diff < 0) return 'Entrada futura';
  const minuto = 60 * 1000, hora = 60 * minuto, dia = 24 * hora;
  const dias = Math.floor(diff / dia);
  const horas = Math.floor((diff % dia) / hora);
  const minutos = Math.floor((diff % hora) / minuto);
  if (dias > 0) return `${dias}d ${horas}h`;
  if (horas > 0) return `${horas}h ${minutos}min`;
  return `${Math.max(minutos, 0)}min`;
}

function deveRevisarFila(item) {
  const timestamp = parseDataOrdenacao(item);
  if (!timestamp || timestamp === Number.MAX_SAFE_INTEGER) return true;
  if (timestamp > Date.now() + (5 * 60 * 1000)) return true;
  return Boolean(item && item.precisaRevisaoFila);
}


function formatarInputDate(valor) {
  if (valor === null || valor === undefined || valor === '') return '';

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return valor.getFullYear() + '-' + String(valor.getMonth() + 1).padStart(2, '0') + '-' + String(valor.getDate()).padStart(2, '0');
  }

  if (typeof valor === 'number' && !isNaN(valor)) {
    const dataNumero = new Date(valor);
    if (!isNaN(dataNumero.getTime())) {
      return dataNumero.getFullYear() + '-' + String(dataNumero.getMonth() + 1).padStart(2, '0') + '-' + String(dataNumero.getDate()).padStart(2, '0');
    }
  }

  const texto = String(valor || '').trim();
  if (!texto) return '';

  // Formato já compatível com input[type=date]: yyyy-mm-dd
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  // Formato brasileiro: dd/mm/yyyy ou dd-mm-yyyy
  const br = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (br) {
    let ano = Number(br[3]);
    if (ano < 100) ano += 2000;
    return String(ano).padStart(4, '0') + '-' + String(Number(br[2])).padStart(2, '0') + '-' + String(Number(br[1])).padStart(2, '0');
  }

  const data = new Date(texto);
  if (!isNaN(data.getTime())) {
    return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
  }

  return '';
}


function arquivosInputParaBase64(input) {
  const files = Array.from(input?.files || []);
  const limiteArquivos = 5;
  const limiteBytes = 8 * 1024 * 1024;
  if (files.length > limiteArquivos) return Promise.reject(new Error(`Selecione no máximo ${limiteArquivos} arquivo(s).`));
  for (const file of files) {
    if (file.size > limiteBytes) return Promise.reject(new Error(`O arquivo "${file.name}" ultrapassa 8 MB.`));
  }
  return Promise.all(files.map(file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ nome: file.name, mimeType: file.type || 'application/octet-stream', tamanho: file.size, base64: String(reader.result).split(',').pop() });
    reader.onerror = () => reject(new Error('Não foi possível ler o arquivo: ' + file.name));
    reader.readAsDataURL(file);
  })));
}

function formToObject(form) {
  const fd = new FormData(form);
  const obj = {};
  fd.forEach((v, k) => { if (!(v instanceof File)) obj[k] = v; });
  return obj;
}

function extrairLinksAnexos(valor) {
  const texto = String(valor || '').trim();
  if (!texto) return [];
  try {
    const json = JSON.parse(texto);
    if (Array.isArray(json)) return json.map((item, idx) => ({ nome: item.nome || item.name || `Anexo ${idx + 1}`, url: item.url || item.link || '' })).filter(item => item.url);
  } catch (e) {}
  const encontrados = [];
  texto.split(/\n+/).filter(Boolean).forEach((linha, idx) => {
    const urls = linha.match(/https?:\/\/[^\s,;]+/g) || [];
    if (!urls.length) return;
    const url = urls[urls.length - 1];
    const nome = linha.replace(url, '').replace(/[|:;,-]+$/g, '').replace(/^[|:;,-]+/g, '').trim() || `Anexo ${idx + 1}`;
    encontrados.push({ nome, url });
  });
  return encontrados;
}

function getDriveIdAnexo_(url) {
  const texto = String(url || '').trim();
  if (!texto) return '';
  const padroes = [
    /\/d\/([a-zA-Z0-9_-]{15,})/,
    /[?&]id=([a-zA-Z0-9_-]{15,})/,
    /open\?id=([a-zA-Z0-9_-]{15,})/,
    /file\/d\/([a-zA-Z0-9_-]{15,})/
  ];
  for (const re of padroes) {
    const m = texto.match(re);
    if (m && m[1]) return m[1];
  }
  return '';
}

function getExtensaoAnexo_(anexo) {
  const nome = String(anexo && (anexo.nome || anexo.name) || '').toLowerCase();
  const url = String(anexo && anexo.url || '').split('?')[0].toLowerCase();
  const texto = (nome + ' ' + url).trim();
  const match = texto.match(/\.([a-z0-9]{2,5})(?:$|\s|[?#&])/);
  return match ? match[1] : '';
}

function isImagemAnexo(anexo) {
  const mime = String(anexo && (anexo.mimeType || anexo.type) || '').toLowerCase();
  if (mime.indexOf('image/') === 0) return true;
  const ext = getExtensaoAnexo_(anexo);
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].indexOf(ext) >= 0;
}

function getIconeAnexoCard_(anexo) {
  const ext = getExtensaoAnexo_(anexo);
  if (ext === 'pdf') return 'bi-filetype-pdf';
  if (['doc', 'docx'].indexOf(ext) >= 0) return 'bi-filetype-docx';
  if (['xls', 'xlsx', 'csv'].indexOf(ext) >= 0) return 'bi-filetype-xlsx';
  if (['ppt', 'pptx'].indexOf(ext) >= 0) return 'bi-filetype-pptx';
  if (['zip', 'rar', '7z'].indexOf(ext) >= 0) return 'bi-file-zip';
  if (isImagemAnexo(anexo)) return 'bi-image';
  return 'bi-paperclip';
}

function getPreviewUrlAnexo(anexo, tamanho) {
  const url = String(anexo && anexo.url || '').trim();
  if (!url) return '';
  const driveId = getDriveIdAnexo_(url);
  if (driveId) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(driveId) + '&sz=w' + String(tamanho || 420);
  return isImagemAnexo(anexo) ? url : '';
}

function coletarAnexosChamado(item) {
  const grupos = [
    { titulo: 'Solicitação', valor: item && (item.anexosSolicitacao || item.anexos) },
    { titulo: 'Orçamento', valor: item && item.anexosOrcamento },
    { titulo: 'Serviço', valor: item && item.anexosServico }
  ];
  const vistos = {};
  const saida = [];

  grupos.forEach(function(grupo) {
    extrairLinksAnexos(grupo.valor).forEach(function(anexo, idx) {
      const url = String(anexo.url || '').trim();
      if (!url || vistos[url]) return;
      vistos[url] = true;
      saida.push({
        nome: anexo.nome || anexo.name || (grupo.titulo + ' ' + (idx + 1)),
        url: url,
        grupo: grupo.titulo,
        mimeType: anexo.mimeType || anexo.type || '',
        id: anexo.id || ''
      });
    });
  });

  return saida;
}

function renderMiniaturasAnexosChamado(item, limite) {
  const anexos = coletarAnexosChamado(item);
  if (!anexos.length) return '';

  limite = Number(limite || 4);
  const visiveis = anexos.slice(0, limite);
  const restantes = anexos.length - visiveis.length;

  const thumbs = visiveis.map(function(anexo, idx) {
    const imagem = isImagemAnexo(anexo);
    const preview = getPreviewUrlAnexo(anexo, 420);
    const nome = anexo.nome || ('Anexo ' + (idx + 1));
    const grupo = anexo.grupo || 'Anexo';
    const title = grupo + ': ' + nome + (imagem ? ' — clique para ampliar' : ' — clique para abrir');

    if (imagem && preview) {
      return '<button type="button" class="card-anexo-thumb is-image" title="' + escapeHtml(title) + '" aria-label="' + escapeHtml(title) + '" data-url="' + escapeHtml(anexo.url) + '" data-preview="' + escapeHtml(getPreviewUrlAnexo(anexo, 1200) || preview) + '" data-nome="' + escapeHtml(nome) + '" data-grupo="' + escapeHtml(grupo) + '" data-imagem="SIM" onclick="abrirPreviewAnexoCard(event,this)">' +
        '<img class="card-anexo-thumb-img" src="' + escapeHtml(preview) + '" alt="' + escapeHtml(nome) + '" loading="lazy" onerror="this.closest(\'.card-anexo-thumb\').classList.add(\'sem-preview\')">' +
        '<span class="card-anexo-thumb-fallback"><i class="bi bi-image"></i></span>' +
        '<span class="card-anexo-thumb-badge">' + escapeHtml(grupo) + '</span>' +
      '</button>';
    }

    return '<button type="button" class="card-anexo-thumb is-file" title="' + escapeHtml(title) + '" aria-label="' + escapeHtml(title) + '" data-url="' + escapeHtml(anexo.url) + '" data-nome="' + escapeHtml(nome) + '" data-grupo="' + escapeHtml(grupo) + '" data-imagem="NAO" onclick="abrirPreviewAnexoCard(event,this)">' +
      '<span class="card-anexo-file-icon"><i class="bi ' + getIconeAnexoCard_(anexo) + '"></i></span>' +
      '<span class="card-anexo-file-label">' + escapeHtml(resumirNomeAnexoCard_(nome)) + '</span>' +
    '</button>';
  }).join('');

  return '<div class="card-anexos-preview" onclick="event.stopPropagation()">' +
    '<div class="card-anexos-preview-head"><span><i class="bi bi-paperclip me-1"></i>Anexos</span><strong>' + anexos.length + '</strong></div>' +
    '<div class="card-anexos-thumbs">' + thumbs + (restantes > 0 ? '<button type="button" class="card-anexo-thumb card-anexo-thumb-more" title="Abrir detalhes do chamado" onclick="event.stopPropagation(); abrirModalAnalise(\'' + escapeJsAttr(item && item.id) + '\')"><span>+' + restantes + '</span><small>mais</small></button>' : '') + '</div>' +
  '</div>';
}

function resumirNomeAnexoCard_(nome) {
  nome = String(nome || 'Arquivo').trim();
  if (nome.length <= 12) return nome;
  const ext = nome.match(/\.([a-z0-9]{2,5})$/i);
  return ext ? ext[1].toUpperCase() : 'Arquivo';
}

function abrirPreviewAnexoCard(event, elemento) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const el = elemento || (event && event.currentTarget);
  if (!el) return false;
  const url = el.dataset.url || '';
  const preview = el.dataset.preview || url;
  const nome = el.dataset.nome || 'Anexo';
  const grupo = el.dataset.grupo || 'Anexo';
  const imagem = el.dataset.imagem === 'SIM';

  if (!url) return false;
  if (!imagem) {
    window.open(url, '_blank', 'noopener');
    return false;
  }

  const modalId = 'modalPreviewAnexoCard';
  const existente = document.getElementById(modalId);
  if (existente) existente.remove();

  const html = '<div class="modal fade gom-anexo-preview-modal" id="' + modalId + '" tabindex="-1" aria-hidden="true">' +
    '<div class="modal-dialog modal-dialog-centered modal-xl">' +
      '<div class="modal-content border-0 shadow-lg">' +
        '<div class="modal-header bg-primary text-white">' +
          '<div><h5 class="modal-title fw-bold mb-0"><i class="bi bi-image me-2"></i>' + escapeHtml(nome) + '</h5><small>' + escapeHtml(grupo) + '</small></div>' +
          '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Fechar"></button>' +
        '</div>' +
        '<div class="modal-body text-center">' +
          '<img class="gom-anexo-preview-img" src="' + escapeHtml(preview) + '" alt="' + escapeHtml(nome) + '">' +
        '</div>' +
        '<div class="modal-footer">' +
          '<a class="btn btn-light border fw-bold" href="' + escapeHtml(url) + '" target="_blank" rel="noopener"><i class="bi bi-box-arrow-up-right me-1"></i>Abrir arquivo original</a>' +
          '<button type="button" class="btn btn-primary fw-bold" data-bs-dismiss="modal"><i class="bi bi-x-circle me-1"></i>Fechar</button>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  document.body.insertAdjacentHTML('beforeend', html);
  const modalEl = document.getElementById(modalId);
  modalEl.addEventListener('hidden.bs.modal', function() { modalEl.remove(); });
  if (window.bootstrap && bootstrap.Modal) new bootstrap.Modal(modalEl).show();
  else window.open(url, '_blank', 'noopener');
  return false;
}

function renderAnexosGrupo(titulo, valor) {
  const anexos = extrairLinksAnexos(valor);
  if (!anexos.length) return '';
  return `<div class="anexo-grupo mb-3"><div class="modal-label">${escapeHtml(titulo)}</div><div class="anexo-lista">${anexos.map((a, i) => `<a class="anexo-link" href="${escapeHtml(a.url)}" target="_blank" rel="noopener"><i class="bi bi-paperclip"></i><span>${escapeHtml(a.nome || ('Anexo ' + (i + 1)))}</span></a>`).join('')}</div></div>`;
}

function temAnexo(item) {
  return coletarAnexosChamado(item).length > 0;
}




/* ==========================================================
   Helpers globais de processamento de botões - v9.3
   ========================================================== */
function gomEncontrarBotaoSubmit(formOuEvento) {
  var form = formOuEvento && formOuEvento.target ? formOuEvento.target : formOuEvento;
  if (!form || typeof form.querySelector !== 'function') return null;
  var btn = form.querySelector('button[type="submit"], button:not([type]), .aprovacao-submit, .empresa-os-save');
  if (btn) return btn;
  if (document.activeElement && document.activeElement.tagName === 'BUTTON') return document.activeElement;
  return null;
}

function gomGetBotaoAtivo() {
  var el = document.activeElement;
  return el && el.tagName === 'BUTTON' ? el : null;
}

function gomSetButtonLoading(botao, texto) {
  if (!botao) return;
  if (!botao.dataset.gomOriginalHtml) botao.dataset.gomOriginalHtml = botao.innerHTML;
  botao.disabled = true;
  botao.classList.add('gom-btn-loading');
  botao.setAttribute('aria-busy', 'true');
  botao.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>' + escapeHtml(texto || 'Processando...');
}

function gomResetButtonLoading(botao) {
  if (!botao) return;
  botao.disabled = false;
  botao.classList.remove('gom-btn-loading');
  botao.removeAttribute('aria-busy');
  if (botao.dataset.gomOriginalHtml) {
    botao.innerHTML = botao.dataset.gomOriginalHtml;
    delete botao.dataset.gomOriginalHtml;
  }
}

function gomMostrarErroAcao(erro, contexto) {
  var msg = erro && erro.message ? erro.message : String(erro || 'Erro desconhecido.');
  alert((contexto ? contexto + '\n\n' : '') + msg);
}

function gomMostrarSucessoBotao(botao, texto, tempo) {
  if (!botao) return;
  botao.classList.remove('gom-btn-loading');
  botao.classList.add('gom-btn-success');
  botao.removeAttribute('aria-busy');
  botao.innerHTML = '<i class="bi bi-check2-circle me-1"></i>' + escapeHtml(texto || 'Concluído');
  setTimeout(function() {
    gomResetButtonLoading(botao);
    botao.classList.remove('gom-btn-success');
  }, tempo || 1100);
}

function gomDesabilitarBotoes(container, disabled) {
  if (!container) return;
  var botoes = container.querySelectorAll('button');
  Array.prototype.forEach.call(botoes, function(btn) {
    if (disabled) {
      btn.disabled = true;
      btn.classList.add('gom-btn-disabled-context');
    } else {
      if (!btn.classList.contains('gom-btn-loading')) btn.disabled = false;
      btn.classList.remove('gom-btn-disabled-context');
    }
  });
}

window.gomEncontrarBotaoSubmit = gomEncontrarBotaoSubmit;
window.gomGetBotaoAtivo = gomGetBotaoAtivo;
window.gomSetButtonLoading = gomSetButtonLoading;
window.gomResetButtonLoading = gomResetButtonLoading;
window.gomMostrarErroAcao = gomMostrarErroAcao;
window.gomMostrarSucessoBotao = gomMostrarSucessoBotao;
window.gomDesabilitarBotoes = gomDesabilitarBotoes;



// Fluxo canônico de status para todos os seletores de alteração de situação.
// Evita que telas operacionais exibam a lista completa de status quando devem
// mostrar somente os próximos passos permitidos do fluxo.
function gomProximosStatusFluxo(status, contexto) {
  const st = normalizarSituacaoSistema(status);
  const mapa = {
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
  let lista = mapa[st] || [];

  // Ajustes de contexto: a empresa nunca deve receber opções fora da execução dela.
  if (contexto === 'empresa') {
    if (st === 'Solicitado Orçamento') lista = ['Orçamento Realizado'];
    else if (['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra', 'Garantia de Serviço'].includes(st)) lista = ['Serviço Realizado'];
    else if (st === 'Serviço Realizado') lista = ['Concluído', 'Garantia de Serviço'];
  }

  return lista.slice();
}


// Exposição explícita dos utilitários no escopo global do Web App.
// Isso evita ReferenceError quando arquivos são carregados em ordem diferente pelo Apps Script.
window.escapeHtml = window.escapeHtml || escapeHtml;
window.escapeJsAttr = window.escapeJsAttr || escapeJsAttr;
window.normalizarTextoBase = window.normalizarTextoBase || normalizarTextoBase;
window.normalizarSituacaoSistema = window.normalizarSituacaoSistema || normalizarSituacaoSistema;
window.getCorStatus = window.getCorStatus || getCorStatus;
window.getClasseStatus = window.getClasseStatus || getClasseStatus;
window.montarKpiCard = window.montarKpiCard || montarKpiCard;
window.getKpiDescricao = window.getKpiDescricao || getKpiDescricao;
window.KPI_DESCRICOES_GOM = window.KPI_DESCRICOES_GOM || KPI_DESCRICOES_GOM;
window.termoPesquisa = window.termoPesquisa || termoPesquisa;
window.parseDataOrdenacao = window.parseDataOrdenacao || parseDataOrdenacao;
window.deveRevisarFila = window.deveRevisarFila || deveRevisarFila;
window.formatarInputDate = window.formatarInputDate || formatarInputDate;
window.arquivosInputParaBase64 = window.arquivosInputParaBase64 || arquivosInputParaBase64;
window.formToObject = window.formToObject || formToObject;
window.extrairLinksAnexos = window.extrairLinksAnexos || extrairLinksAnexos;
window.renderAnexosGrupo = window.renderAnexosGrupo || renderAnexosGrupo;
window.temAnexo = window.temAnexo || temAnexo;
window.coletarAnexosChamado = window.coletarAnexosChamado || coletarAnexosChamado;
window.renderMiniaturasAnexosChamado = window.renderMiniaturasAnexosChamado || renderMiniaturasAnexosChamado;
window.abrirPreviewAnexoCard = window.abrirPreviewAnexoCard || abrirPreviewAnexoCard;
window.isImagemAnexo = window.isImagemAnexo || isImagemAnexo;
window.gomProximosStatusFluxo = window.gomProximosStatusFluxo || gomProximosStatusFluxo;


// Exposição explícita dos utilitários no escopo global do Web App.
// Isso evita ReferenceError quando arquivos são carregados em ordem diferente pelo Apps Script.
window.escapeHtml = escapeHtml;
window.escapeJsAttr = escapeJsAttr;
window.normalizarTextoBase = normalizarTextoBase;
window.normalizarSituacaoSistema = normalizarSituacaoSistema;
window.getCorStatus = getCorStatus;
window.getClasseStatus = getClasseStatus;
window.montarKpiCard = montarKpiCard;
window.getKpiDescricao = getKpiDescricao;
window.KPI_DESCRICOES_GOM = KPI_DESCRICOES_GOM;
window.termoPesquisa = termoPesquisa;
window.parseDataOrdenacao = parseDataOrdenacao;
window.deveRevisarFila = deveRevisarFila;
window.formatarInputDate = formatarInputDate;
window.arquivosInputParaBase64 = arquivosInputParaBase64;
window.formToObject = formToObject;
window.extrairLinksAnexos = extrairLinksAnexos;
window.renderAnexosGrupo = renderAnexosGrupo;
window.temAnexo = temAnexo;
window.coletarAnexosChamado = coletarAnexosChamado;
window.renderMiniaturasAnexosChamado = renderMiniaturasAnexosChamado;
window.abrirPreviewAnexoCard = abrirPreviewAnexoCard;
window.isImagemAnexo = isImagemAnexo;
window.gomProximosStatusFluxo = gomProximosStatusFluxo;

// Diagnóstico rápido no console: gomDebugFrontend()
window.gomDebugFrontend = window.gomDebugFrontend || function() {
  const info = {
    telaAtual: window.telaAtual,
    chamados: Array.isArray(window.listaChamadosGlobal) ? window.listaChamadosGlobal.length : 'não é array',
    obras: Array.isArray(window.listaObrasGlobal) ? window.listaObrasGlobal.length : 'não é array',
    campo: window.dadosCampoGlobal,
    funcoes: {
      escapeJsAttr: typeof window.escapeJsAttr,
      renderEmpresaView: typeof window.renderEmpresaView,
      setEmpresaModo: typeof window.setEmpresaModo,
      carregarChamados: typeof window.carregarChamados,
      carregarObras: typeof window.carregarObras,
      carregarCampo: typeof window.carregarCampo,
      inicializarTelaCadastro: typeof window.inicializarTelaCadastro
    }
  };
  console.table(info.funcoes);
  console.log('[GOM DEBUG]', info);
  return info;
};


window.gomEncontrarBotaoSubmit = window.gomEncontrarBotaoSubmit || gomEncontrarBotaoSubmit;
window.gomSetButtonLoading = window.gomSetButtonLoading || gomSetButtonLoading;
window.gomResetButtonLoading = window.gomResetButtonLoading || gomResetButtonLoading;
window.gomMostrarErroAcao = window.gomMostrarErroAcao || gomMostrarErroAcao;
window.gomMostrarSucessoBotao = window.gomMostrarSucessoBotao || gomMostrarSucessoBotao;