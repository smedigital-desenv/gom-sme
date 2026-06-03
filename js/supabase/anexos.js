/* ============================================================================
 * GOM | SME — Anexos (Supabase Storage, no lugar do Google Drive)
 * ----------------------------------------------------------------------------
 * Bucket: GOM_SUPABASE.BUCKET_ANEXOS (privado). Caminho: chamado/<id>/<cat>/arquivo
 * Metadados ficam na tabela `anexos`. URLs de leitura são assinadas em lote.
 * ========================================================================== */
window.GomAnexos = (function () {
  'use strict';
  const LIMITE = 5;
  const MAX_MB = 8;

  function _slug(s) { return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w.-]+/g, '_').slice(0, 80); }

  function _b64ToBlob(base64, mime) {
    const bin = atob(String(base64).split(',').pop());
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime || 'application/octet-stream' });
  }

  // Recebe a lista de arquivos em base64 (mesmo formato do front: {nome/base64/mimeType}),
  // sobe pro Storage e grava em `anexos`. Sem arquivos, não toca em nada (saída rápida).
  async function upload(chamadoId, categoria, arquivos) {
    const lista = Array.isArray(arquivos) ? arquivos.filter(a => a && a.base64) : [];
    if (!lista.length) return [];
    if (lista.length > LIMITE) throw new Error(`Limite de ${LIMITE} anexos por envio.`);
    const bucket = window.GOM_SUPABASE.BUCKET_ANEXOS;
    const salvos = [];
    for (let i = 0; i < lista.length; i++) {
      const arq = lista[i];
      const nome = _slug(arq.nome || arq.name || `anexo_${i + 1}`);
      const mime = arq.mimeType || arq.type || 'application/octet-stream';
      const blob = _b64ToBlob(arq.base64, mime);
      if (blob.size > MAX_MB * 1024 * 1024) throw new Error(`Arquivo ${nome} excede ${MAX_MB} MB.`);
      const caminho = `chamado/${chamadoId}/${categoria}/${Date.now()}_${i}_${nome}`;
      const up = await window.SB.storage.from(bucket).upload(caminho, blob, { contentType: mime, upsert: false });
      if (up.error) throw new Error('Falha no upload: ' + up.error.message);
      const ins = await window.SB.from('anexos').insert({
        solicitacao_id: chamadoId, categoria: categoria,
        nome: arq.nome || nome, storage_path: caminho, mime_type: mime, tamanho_bytes: blob.size
      });
      if (ins.error) throw new Error('Falha ao gravar anexo: ' + ins.error.message);
      salvos.push({ nome: arq.nome || nome, path: caminho });
    }
    return salvos;
  }

  // Mapa de anexos por chamado, com URL assinada (1 chamada em lote pro Storage).
  // Retorno: { [solicitacao_id]: { solicitacao:[{nome,url}], orcamento:[...], servico:[...] } }
  async function mapaPorChamado(ids) {
    const out = {};
    if (!ids || !ids.length) return out;
    const r = await window.SB.from('anexos').select('solicitacao_id,categoria,nome,storage_path').in('solicitacao_id', ids);
    if (r.error || !r.data || !r.data.length) return out;

    const bucket = window.GOM_SUPABASE.BUCKET_ANEXOS;
    const paths = r.data.map(a => a.storage_path);
    let urlByPath = {};
    try {
      const s = await window.SB.storage.from(bucket).createSignedUrls(paths, 60 * 60); // 1h
      (s.data || []).forEach(it => { if (it && it.path) urlByPath[it.path] = it.signedUrl; });
    } catch (e) { /* sem URL assinada, ainda devolve nome */ }

    r.data.forEach(a => {
      const cat = a.categoria || 'solicitacao';
      out[a.solicitacao_id] = out[a.solicitacao_id] || { solicitacao: [], orcamento: [], servico: [] };
      (out[a.solicitacao_id][cat] = out[a.solicitacao_id][cat] || []).push({ nome: a.nome || 'arquivo', url: urlByPath[a.storage_path] || '' });
    });
    return out;
  }

  return { upload, mapaPorChamado };
})();
