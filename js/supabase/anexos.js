/* ============================================================================
 * GOM | SME — Anexos (Google Drive via Web App GAS + metadados no Supabase)
 * ----------------------------------------------------------------------------
 * Upload: cada arquivo é enviado em base64 para o Web App (GomDriveAPI.gs),
 * que salva no Drive e devolve a URL pública. Os metadados continuam na
 * tabela `anexos` (storage_path = 'drive:<fileId>' e a nova coluna `url`).
 *
 * Compatibilidade retroativa: anexos antigos (Supabase Storage) não têm `url`
 * e seguem sendo lidos por URL assinada do bucket, como antes.
 *
 * Pré-requisitos:
 *   1) sql/10_anexos_drive.sql aplicado (coluna `url`)
 *   2) GOM_DRIVE.URL e GOM_DRIVE.TOKEN preenchidos em js/config.js
 * ========================================================================== */
window.GomAnexos = (function () {
  'use strict';
  const LIMITE = 5;
  const MAX_MB = 8;

  function _slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 80); }

  function _cfgDrive() {
    const c = window.GOM_DRIVE || {};
    if (!c.URL || !c.TOKEN) {
      throw new Error('Armazenamento no Drive não configurado. Preencha GOM_DRIVE.URL e GOM_DRIVE.TOKEN em js/config.js.');
    }
    return c;
  }

  // Envia UM arquivo ao Web App do Drive. Um arquivo por requisição mantém o
  // payload pequeno (limite do GAS) e permite tratar erro por arquivo.
  // IMPORTANTE: sem header Content-Type — assim a requisição é "simple request"
  // (text/plain), dispensa preflight CORS e o Apps Script aceita normalmente.
  async function _enviarParaDrive(arq, chamadoId, categoria, escolaNome) {
    const cfg = _cfgDrive();
    const corpo = JSON.stringify({
      token: cfg.TOKEN,
      acao: 'upload',
      escola: escolaNome || 'sem-escola',
      chamadoId: chamadoId,
      categoria: categoria,
      arquivos: [{
        nome: arq.nome || arq.name || 'anexo',
        mimeType: arq.mimeType || arq.type || 'application/octet-stream',
        base64: String(arq.base64).split(',').pop()
      }]
    });

    const resp = await fetch(cfg.URL, { method: 'POST', body: corpo });
    if (!resp.ok) throw new Error('Falha de rede no upload (HTTP ' + resp.status + ').');

    let json;
    try { json = await resp.json(); }
    catch (e) { throw new Error('Resposta inválida do Drive API. Verifique a publicação do Web App (acesso: Qualquer pessoa).'); }

    if (!json.ok) throw new Error('Drive recusou o upload: ' + (json.erro || 'erro desconhecido'));
    if (!json.arquivos || !json.arquivos.length) throw new Error('Drive não retornou o arquivo salvo.');
    return json.arquivos[0]; // { nome, id, url, tamanho }
  }

  // Mesma assinatura de antes — dados.js não muda.
  // upload(chamadoId, categoria, arquivos, escolaNome?)
  async function upload(chamadoId, categoria, arquivos, escolaNome) {
    const lista = Array.isArray(arquivos) ? arquivos.filter(a => a && a.base64) : [];
    if (!lista.length) return [];
    if (lista.length > LIMITE) throw new Error(`Limite de ${LIMITE} anexos por envio.`);

    const salvos = [];
    for (let i = 0; i < lista.length; i++) {
      const arq = lista[i];
      const nome = _slug(arq.nome || arq.name || `anexo_${i + 1}`);
      const tamanhoEstimado = Math.floor(String(arq.base64).length * 0.75);
      if (tamanhoEstimado > MAX_MB * 1024 * 1024) throw new Error(`Arquivo ${nome} excede ${MAX_MB} MB.`);

      const drive = await _enviarParaDrive(arq, chamadoId, categoria, escolaNome);

      const ins = await window.SB.from('anexos').insert({
        solicitacao_id: chamadoId,
        categoria: categoria,
        nome: arq.nome || drive.nome || nome,
        storage_path: 'drive:' + drive.id,
        url: drive.url,
        mime_type: arq.mimeType || arq.type || 'application/octet-stream',
        tamanho_bytes: drive.tamanho || tamanhoEstimado
      });
      if (ins.error) throw new Error('Arquivo salvo no Drive, mas falhou ao gravar metadado: ' + ins.error.message);

      salvos.push({ nome: arq.nome || drive.nome || nome, path: 'drive:' + drive.id, url: drive.url });
    }
    return salvos;
  }

  // Mapa de anexos por chamado.
  // Drive: usa a coluna `url` direto (sem chamada extra).
  // Legado (Supabase Storage): gera URLs assinadas em lote, como antes.
  async function mapaPorChamado(ids) {
    const out = {};
    if (!ids || !ids.length) return out;
    const r = await window.SB.from('anexos')
      .select('solicitacao_id,categoria,nome,storage_path,url')
      .in('solicitacao_id', ids);
    if (r.error || !r.data || !r.data.length) return out;

    // URLs assinadas só para o legado (sem `url` e sem prefixo drive:)
    const legados = r.data.filter(a => !a.url && a.storage_path && a.storage_path.indexOf('drive:') !== 0);
    let urlByPath = {};
    if (legados.length) {
      try {
        const bucket = window.GOM_SUPABASE.BUCKET_ANEXOS;
        const s = await window.SB.storage.from(bucket).createSignedUrls(legados.map(a => a.storage_path), 60 * 60);
        (s.data || []).forEach(it => { if (it && it.path) urlByPath[it.path] = it.signedUrl; });
      } catch (e) { /* sem URL assinada, ainda devolve nome */ }
    }

    r.data.forEach(a => {
      const cat = a.categoria || 'solicitacao';
      out[a.solicitacao_id] = out[a.solicitacao_id] || { solicitacao: [], orcamento: [], servico: [] };
      const url = a.url || urlByPath[a.storage_path] || '';
      (out[a.solicitacao_id][cat] = out[a.solicitacao_id][cat] || []).push({ nome: a.nome || 'arquivo', url: url });
    });
    return out;
  }

  return { upload, mapaPorChamado };
})();
