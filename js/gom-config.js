// Hotfix v8.2: formata valores para input[type=date].
// Fica em Scripts_Config porque este arquivo é carregado antes dos demais.
window.formatarInputDate = window.formatarInputDate || function(valor) {
  if (valor === null || valor === undefined || valor === '') return '';

  if (valor instanceof Date && !isNaN(valor.getTime())) {
    return valor.getFullYear() + '-' + String(valor.getMonth() + 1).padStart(2, '0') + '-' + String(valor.getDate()).padStart(2, '0');
  }

  if (typeof valor === 'number' && !isNaN(valor)) {
    var dataNumero = new Date(valor);
    if (!isNaN(dataNumero.getTime())) {
      return dataNumero.getFullYear() + '-' + String(dataNumero.getMonth() + 1).padStart(2, '0') + '-' + String(dataNumero.getDate()).padStart(2, '0');
    }
  }

  var texto = String(valor || '').trim();
  if (!texto) return '';

  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

  var br = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (br) {
    var ano = Number(br[3]);
    if (ano < 100) ano += 2000;
    return String(ano).padStart(4, '0') + '-' + String(Number(br[2])).padStart(2, '0') + '-' + String(Number(br[1])).padStart(2, '0');
  }

  var data = new Date(texto);
  if (!isNaN(data.getTime())) {
    return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
  }

  return '';
};

var formatarInputDate = window.formatarInputDate;


// =====================================================
// GOM | Configuração global do frontend
// Arquivo carregado antes dos demais scripts.
// Mantém variáveis no objeto window para evitar duplicidade
// quando o Apps Script recompila/inclui arquivos HTML.
// =====================================================

window.escapeHtml = window.escapeHtml || function(valor) {
  return String(valor == null ? '' : valor)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

window.escapeJsAttr = window.escapeJsAttr || function(valor) {
  return String(valor == null ? '' : valor)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '&quot;')
    .replace(/\r?\n/g, ' ');
};

window.normalizarTextoBase = window.normalizarTextoBase || function(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
};

// Helpers expostos também como var para compatibilidade com chamadas diretas.
var escapeHtml = window.escapeHtml;
var escapeJsAttr = window.escapeJsAttr;
var normalizarTextoBase = window.normalizarTextoBase;

// Estado global seguro.
var listaEscolasGlobal = window.listaEscolasGlobal = Array.isArray(window.listaEscolasGlobal) ? window.listaEscolasGlobal : [];
var listaEquipesGlobal = window.listaEquipesGlobal = Array.isArray(window.listaEquipesGlobal) ? window.listaEquipesGlobal : [];
var listaEquipesEmpresaGlobal = window.listaEquipesEmpresaGlobal = Array.isArray(window.listaEquipesEmpresaGlobal) ? window.listaEquipesEmpresaGlobal : []; // Equipes da Empresa
var listaChamadosGlobal = window.listaChamadosGlobal = Array.isArray(window.listaChamadosGlobal) ? window.listaChamadosGlobal : [];
var listaObrasGlobal = window.listaObrasGlobal = Array.isArray(window.listaObrasGlobal) ? window.listaObrasGlobal : [];
var dadosCampoGlobal = window.dadosCampoGlobal = window.dadosCampoGlobal || { chamados: [], historico: [], kpis: {} };

var telaAtual = window.telaAtual = window.telaAtual || 'dashboard';
var statusFiltroClicado = window.statusFiltroClicado = window.statusFiltroClicado || null;
var campoFiltroAtual = window.campoFiltroAtual = window.campoFiltroAtual || null;
var alertasFiltroAtual = window.alertasFiltroAtual = window.alertasFiltroAtual || 'todos';
var idChamadoAberto = window.idChamadoAberto = window.idChamadoAberto || null;
var idObraAberta = window.idObraAberta = window.idObraAberta || null;

var dadosCarregados = window.dadosCarregados = Boolean(window.dadosCarregados);
var basesCarregadas = window.basesCarregadas = Boolean(window.basesCarregadas);
var obrasCarregadas = window.obrasCarregadas = Boolean(window.obrasCarregadas);
var campoCarregado = window.campoCarregado = Boolean(window.campoCarregado);
var carregandoChamados = window.carregandoChamados = false;
var carregandoObras = window.carregandoObras = false;
var carregandoCampo = window.carregandoCampo = false;
var ultimaRespostaChamadosRaw = window.ultimaRespostaChamadosRaw = window.ultimaRespostaChamadosRaw || null;

var empresaModoAtual = window.empresaModoAtual = window.empresaModoAtual || 'diario';
var empresaDetalheAberto = window.empresaDetalheAberto = window.empresaDetalheAberto || null;
var usuarioAtualGom = window.usuarioAtualGom = window.usuarioAtualGom || null;
var permissoesCarregadas = window.permissoesCarregadas = Boolean(window.permissoesCarregadas);

var TELAS_WEB = window.TELAS_WEB = ['dashboard','triagem','fila','aprovacao','empresa','campo','alertas','obras','historico','relatorios','cadastro','acompanhar','configuracoes'];
var TELAS_CHAMADOS = window.TELAS_CHAMADOS = ['triagem','fila','aprovacao','empresa','historico'];

var STATUS_TRIAGEM = window.STATUS_TRIAGEM = ['Em análise'];
var STATUS_FILA = window.STATUS_FILA = ['Aguardando visita', 'Em atendimento'];
var STATUS_APROVACAO = window.STATUS_APROVACAO = ['Orçamento Realizado', 'Serviço Realizado'];
var STATUS_EMPRESA = window.STATUS_EMPRESA = ['Solicitado Orçamento', 'OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
var STATUS_EMPRESA_DIARIO = window.STATUS_EMPRESA_DIARIO = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
var STATUS_EMPRESA_ORCAMENTO = window.STATUS_EMPRESA_ORCAMENTO = ['Solicitado Orçamento'];
var STATUS_EMPRESA_GERENCIAL = window.STATUS_EMPRESA_GERENCIAL = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
var STATUS_CAMPO = window.STATUS_CAMPO = ['OS emitida', 'Atendimento Emergencial', 'Garantia de Obra'];
var STATUS_MEMORIAL = window.STATUS_MEMORIAL = ['Concluído', 'Encaminhado para outra gerência ou Unidade escolar.', 'A cargo da unidade escolar', 'Duplicado', 'Devolvido para a escola'];

var STATUS_TODOS = window.STATUS_TODOS = [
  'Em análise',
  'Aguardando visita',
  'Solicitado Orçamento',
  'Orçamento Realizado',
  'OS emitida',
  'Atendimento Emergencial',
  'Garantia de Obra',
  'Serviço Realizado',
  'Devolvido para a escola',
  'Concluído',
  'Encaminhado para outra gerência ou Unidade escolar.',
  'A cargo da unidade escolar',
  'Duplicado'
];

var configKPIs = window.configKPIs = [
  { key: 'Em análise', title: 'Em análise', cor: 'var(--analise)' },
  { key: 'Aguardando visita', title: 'Aguardando visita', cor: 'var(--visita)' },
  { key: 'Solicitado Orçamento', title: 'Orç. solicitado', cor: 'var(--orcamento)' },
  { key: 'Orçamento Realizado', title: 'Aprovação', cor: 'var(--orcamento-realizado)' },
  { key: 'OS emitida', title: 'OS emitida', cor: 'var(--os)' },
  { key: 'Atendimento Emergencial', title: 'Emergencial', cor: 'var(--emergencial)' },
  { key: 'Garantia de Obra', title: 'Garantia', cor: 'var(--garantia)' },
  { key: 'Serviço Realizado', title: 'Serviço realizado', cor: 'var(--servico-realizado)' },
  { key: 'Devolvido para a escola', title: 'Devolvido escola', cor: 'var(--duplicado)' },
  { key: 'Concluído', title: 'Concluído', cor: 'var(--concluido)' },
  { key: 'Encaminhado para outra gerência ou Unidade escolar.', title: 'Encaminhado', cor: 'var(--encaminhado)' },
  { key: 'A cargo da unidade escolar', title: 'Cargo unidade', cor: 'var(--unidade)' },
  { key: 'Duplicado', title: 'Duplicado', cor: 'var(--duplicado)' }
];

var configObrasKPIs = window.configObrasKPIs = [
  { key: 'Aguardando', title: 'Aguardando', cor: 'var(--obra-aguardando)' },
  { key: 'Em projeto', title: 'Em projeto', cor: 'var(--obra-projeto)' },
  { key: 'Em licitação', title: 'Em licitação', cor: 'var(--obra-licitacao)' },
  { key: 'Em execução', title: 'Em execução', cor: 'var(--obra-execucao)' },
  { key: 'Suspensa', title: 'Suspensa', cor: 'var(--obra-suspensa)' },
  { key: 'Concluída', title: 'Concluída', cor: 'var(--obra-concluida)' },
  { key: 'Arquivada', title: 'Arquivada', cor: 'var(--obra-arquivada)' }
];

var CORES_STATUS = window.CORES_STATUS = {
  'Em análise': '#FFD300',
  'Aguardando visita': '#14b8a6',
  'Solicitado Orçamento': '#f59e0b',
  'Orçamento Realizado': '#fb923c',
  'Em atendimento': '#00e5ff',
  'Atendimento Emergencial': '#ec4899',
  'OS emitida': '#22d3ee',
  'Serviço Realizado': '#10b981',
  'Garantia de Obra': '#d97706',
  'Visita Técnica': '#14b8a6',
  'Devolvido para a escola': '#64748b',
  'Concluído': '#39FF14',
  'Encaminhado para outra gerência ou Unidade escolar.': '#6366f1',
  'A cargo da unidade escolar': '#84cc16',
  'Duplicado': '#475569'
};

var STATUS_OBRAS = window.STATUS_OBRAS = ['Aguardando','Em projeto','Em licitação','Em execução','Suspensa','Concluída','Arquivada'];
var PRIORIDADES_OBRAS = window.PRIORIDADES_OBRAS = ['P0','P1','P2','P3'];