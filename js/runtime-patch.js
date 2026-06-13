(function gomRuntimePatch(){
  'use strict';
  window.STATUS_OBRAS = window.STATUS_OBRAS || ['Aguardando','Em projeto','Em licitação','Em execução','Suspensa','Concluída','Arquivada'];
  window.PRIORIDADES_OBRAS = window.PRIORIDADES_OBRAS || ['P0','P1','P2','P3'];
  window.STATUS_TODOS = window.STATUS_TODOS || [
    'Em análise','Aguardando visita','Solicitado Orçamento','Orçamento Realizado','OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço','Serviço Realizado','Devolvido para a escola','Concluído','Encaminhado para outra gerência ou Unidade escolar.','A cargo da unidade escolar','Duplicado'
  ];

  // Alguns arquivos usam os nomes diretamente. Criamos bindings globais seguros.
  try { if (typeof STATUS_OBRAS === 'undefined') window.eval('var STATUS_OBRAS = window.STATUS_OBRAS;'); } catch(e) {}
  try { if (typeof PRIORIDADES_OBRAS === 'undefined') window.eval('var PRIORIDADES_OBRAS = window.PRIORIDADES_OBRAS;'); } catch(e) {}
  try { if (typeof STATUS_TODOS === 'undefined') window.eval('var STATUS_TODOS = window.STATUS_TODOS;'); } catch(e) {}


  if (typeof window.formatarInputDate !== 'function') {
    window.formatarInputDate = function(valor) {
      if (valor === null || valor === undefined || valor === '') return '';
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
      if (!isNaN(data.getTime())) return data.getFullYear() + '-' + String(data.getMonth() + 1).padStart(2, '0') + '-' + String(data.getDate()).padStart(2, '0');
      return '';
    };
  }
  try { if (typeof formatarInputDate === 'undefined') window.eval('var formatarInputDate = window.formatarInputDate;'); } catch(e) {}

  if (typeof window.formToObject !== 'function') {
    window.formToObject = function(form) {
      const fd = new FormData(form);
      const obj = {};
      fd.forEach((value, key) => {
        if (obj[key] !== undefined) obj[key] = Array.isArray(obj[key]) ? obj[key].concat(value) : [obj[key], value];
        else obj[key] = value;
      });
      Object.keys(obj).forEach(k => { if (Array.isArray(obj[k])) obj[k] = obj[k].join(', '); });
      return obj;
    };
  }

  if (typeof window.arquivosInputParaBase64 !== 'function') {
    window.arquivosInputParaBase64 = async function(input) {
      if (!input || !input.files) return [];
      const files = Array.from(input.files || []);
      const limiteArquivos = 5;
      const limiteBytes = 8 * 1024 * 1024;
      if (files.length > limiteArquivos) throw new Error('Selecione no máximo ' + limiteArquivos + ' arquivos.');
      files.forEach(file => { if (file.size > limiteBytes) throw new Error('O arquivo "' + file.name + '" ultrapassa 8 MB.'); });
      return Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ nome: file.name, mimeType: file.type || 'application/octet-stream', tamanho: file.size, base64: String(reader.result || '').split(',').pop() });
        reader.onerror = () => reject(new Error('Não foi possível ler o arquivo: ' + file.name));
        reader.readAsDataURL(file);
      })));
    };
  }

  if (typeof window.inicializarTelaCadastro !== 'function') {
    window.inicializarTelaCadastro = function() {
      const preencher = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const atual = el.value;
        const escolas = Array.isArray(window.listaEscolasGlobal) ? window.listaEscolasGlobal : [];
        el.innerHTML = '<option value="">Selecione...</option>' + escolas.map(e => `<option value="${escapeHtml(e.nome || e)}">${escapeHtml(e.nome || e)}</option>`).join('');
        if (atual) el.value = atual;
      };
      preencher('selectUnidade');
      preencher('selectUnidadeEscola');
      preencher('selectUnidadeEscolaWeb');
      const sS = document.getElementById('selectSituacaoCadastro');
      if (sS) sS.innerHTML = (window.STATUS_TODOS || []).map(s => `<option value="${escapeHtml(s)}" ${s==='Em análise'?'selected':''}>${escapeHtml(s)}</option>`).join('');
    };
  }

  if (typeof window.setTipoEscola !== 'function') {
    window.setTipoEscola = function() {
      const nome = document.getElementById('selectUnidade')?.value || document.getElementById('selectUnidadeEscola')?.value || document.getElementById('selectUnidadeEscolaWeb')?.value || '';
      const e = (window.listaEscolasGlobal || []).find(x => (x.nome || x) === nome);
      ['inputTipo','inputTipoEscola','inputTipoEscolaWeb'].forEach(id => { const input = document.getElementById(id); if (input) input.value = e ? (e.tipo || '') : ''; });
    };
    window.setTipoEscolaWeb = window.setTipoEscola;
  }

  if (typeof window.toggleCamposSistema !== 'function') {
    window.toggleCamposSistema = function() {
      const s = document.getElementById('selectSistema')?.value;
      const solar = document.getElementById('divSolar'); if (solar) solar.style.display = s === 'Solar' ? 'block' : 'none';
      const solicitacao = document.getElementById('divSolicitacaoPor'); if (solicitacao) solicitacao.style.display = s === 'Solicitação por' ? 'block' : 'none';
    };
  }

  if (typeof window.setEmpresaModo !== 'function') {
    window.setEmpresaModo = function(modo, botao) {
      window.empresaModoAtual = modo || 'diario';
      document.querySelectorAll('#empresaModoTabs .nav-link').forEach(b => b.classList.remove('active'));
      if (botao) botao.classList.add('active');
      if (typeof window.renderizarTela === 'function') window.renderizarTela();
    };
  }

  if (typeof window.renderEmpresaView !== 'function') {
    window.renderEmpresaView = function(listaRender) {
      const modo = window.empresaModoAtual || 'diario';
      if (modo === 'equipes') {
        setTimeout(() => { if (typeof renderizarListaEquipes === 'function') renderizarListaEquipes(); }, 0);
        return `<div class="row align-items-start mt-2"><div class="col-md-5"><div class="bg-white p-4 rounded shadow-sm border-top border-4 border-info"><h5 class="fw-bold text-dark mb-3"><i class="bi bi-person-plus-fill text-info me-2"></i>Cadastrar Equipe</h5><form onsubmit="salvarEquipeForm(event)"><div class="mb-3"><label class="form-label text-muted small fw-bold">NOME DA EQUIPE OU TÉCNICO</label><input type="text" id="nomeNovaEquipe" class="form-control form-control-lg bg-light" placeholder="Ex: Equipe Alfa" required></div><button type="submit" class="btn btn-info text-white w-100 fw-bold shadow-sm">ADICIONAR EQUIPE</button></form></div></div><div class="col-md-7"><div class="bg-white p-4 rounded shadow-sm h-100 border-top border-4 border-secondary"><h5 class="fw-bold text-dark mb-3"><i class="bi bi-card-checklist text-secondary me-2"></i>Equipes Disponíveis</h5><div id="listaEquipesCadastradasHtml" class="d-flex flex-wrap gap-2"></div></div></div></div>`;
      }
      const filtrarModo = (item) => {
        const st = normalizarSituacaoSistema(item.situacao || item.status);
        if (modo === 'orcamentos') return st === 'Solicitado Orçamento';
        if (modo === 'gerencial') return ['OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço','Serviço Realizado'].includes(st);
        return ['OS emitida','Atendimento Emergencial','Garantia de Obra','Garantia de Serviço'].includes(st);
      };
      const lista = (listaRender || []).filter(filtrarModo);
      if (!lista.length) return '<div class="empty-state"><h5>Nenhuma demanda encontrada para esta visualização.</h5></div>';
      return '<div class="empresa-grid">' + lista.map(item => (typeof renderEmpresaCard === 'function' ? renderEmpresaCard(item, modo) : renderEmpresaCardFallback(item, modo))).join('') + '</div>';
    };
  }

  if (typeof window.renderEmpresaCardFallback !== 'function') {
    window.renderEmpresaCardFallback = function(item, modo) {
      const id = escapeHtml(item.id || '');
      const st = normalizarSituacaoSistema(item.situacao || item.status);
      const classe = getClasseStatus(st);
      const cor = getCorStatus(st);
      const unidade = escapeHtml(item.unidade || 'Unidade não informada');
      const detalhe = escapeHtml(item.detalhamento || 'Sem detalhamento informado.');
      const data = escapeHtml(item.dataHoraUltimaAcao || item.dataHora || item.data || 'Sem data');
      const os = escapeHtml(item.numeroOs || '');
      const semOs = st === 'OS emitida' && !String(item.numeroOs || '').trim();
      const aviso = semOs ? '<div class="empresa-aviso"><i class="bi bi-exclamation-triangle-fill"></i> OS emitida sem numeração preenchida.</div>' : '';
      const equipeOptions = '<option value="">-- Equipe do dia --</option>' + (window.listaEquipesGlobal || []).map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');
      if (st === 'Solicitado Orçamento') {
        return `<div class="empresa-card ${classe}" style="--card-accent:${cor};"><div class="empresa-card-head"><span class="badge bg-warning text-dark">${escapeHtml(st)}</span><span class="card-id">#${id}</span></div><h5 class="empresa-unidade" onclick="abrirModalAnalise('${id}')">${unidade}</h5><div class="card-detail">${detalhe}</div><form onsubmit="enviarOrcamentoEmpresa(event,'${id}')" class="mt-3"><div class="row g-2"><div class="col-md-4"><label class="form-label small fw-bold">Valor</label><input class="form-control form-control-sm" name="valorOrcamento" placeholder="R$ 0,00" required></div><div class="col-md-8"><label class="form-label small fw-bold">Observações</label><textarea class="form-control form-control-sm" name="observacoes" rows="2"></textarea></div><div class="col-12"><label class="form-label small fw-bold">Anexos do orçamento</label><input class="form-control form-control-sm" type="file" name="anexosOrcamento" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"></div></div><button class="btn btn-primary btn-sm fw-bold mt-3"><i class="bi bi-send-check me-1"></i>Devolver orçamento</button></form></div>`;
      }
      return `<div class="empresa-card ${classe}" style="--card-accent:${cor};"><div class="empresa-card-head"><span class="badge bg-info text-dark">${escapeHtml(st)}</span><span class="card-id">#${id}</span></div><h5 class="empresa-unidade" onclick="abrirModalAnalise('${id}')">${unidade}</h5><div class="card-detail">${detalhe}</div>${aviso}<div class="fila-meta-grid"><div class="fila-meta-item"><span class="fila-meta-label">Encaminhamento</span><span class="fila-meta-value">${data}</span></div><div class="fila-meta-item"><span class="fila-meta-label">Nº OS</span><span class="fila-meta-value">${os || 'Sem número'}</span></div></div><form onsubmit="salvarEquipeDiaEmpresaFront(event,'${id}')" class="empresa-os-form"><select class="form-select form-select-sm" name="equipe" required>${equipeOptions}</select><input type="hidden" name="numeroOs" value="${os}"><textarea class="form-control form-control-sm mt-2" name="observacoes" rows="1" placeholder="Observação do dia"></textarea><button class="btn btn-primary btn-sm fw-bold mt-2"><i class="bi bi-save me-1"></i>Salvar equipe do dia</button></form></div>`;
    };
  }

  if (typeof window.renderizarCampo !== 'function') {
    window.renderizarCampo = function() {
      const painel = document.getElementById('painelDados');
      if (painel) painel.innerHTML = '<div class="empty-state"><h5>Painel de campo carregado.</h5><p>Use a tela Empresa para registrar a equipe do dia.</p></div>';
    };
  }
  if (typeof window.carregarCampo !== 'function') {
    window.carregarCampo = function(opcoes) {
      window.campoCarregado = true;
      if (!window.dadosCampoGlobal) window.dadosCampoGlobal = { chamados: [], historico: [], kpis: {} };
      if (!opcoes || opcoes.renderizar !== false) window.renderizarCampo();
    };
  }

  if (typeof window.renderizarListaEquipes !== 'function') {
    window.renderizarListaEquipes = function() {
      const box = document.getElementById('listaEquipesCadastradasHtml');
      if (!box) return;
      const equipes = window.listaEquipesGlobal || [];
      box.innerHTML = equipes.length ? equipes.map(eq => `<span class="badge bg-light border border-info text-dark p-2 fs-6"><i class="bi bi-person-workspace text-info me-1"></i>${escapeHtml(eq)}</span>`).join('') : '<span class="text-muted small">Nenhuma equipe cadastrada.</span>';
    };
  }
})();