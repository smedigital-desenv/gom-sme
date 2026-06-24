/* ============================================================================
 * GOM | SME — Anexos (Supabase Storage rápido + migração assíncrona para Drive)
 * ----------------------------------------------------------------------------
 * Fluxo v43:
 *   1) Frontend salva o arquivo rapidamente no Supabase Storage.
 *   2) Frontend grava metadados em public.anexos com migracao_status='pendente'.
 *   3) O modal atualiza sem F5 usando URL assinada temporária.
 *   4) Apps Script agendado migra para Drive e apaga o arquivo do Supabase.
 * ========================================================================== */
window.GomAnexos = (function () {
  'use strict';
  const LIMITE = 5;
  const MAX_MB = 8;

  function _bucket() {
    return (window.GOM_SUPABASE && window.GOM_SUPABASE.BUCKET_ANEXOS) || 'anexos';
  }

  function _slug(s) {
    let v = String(s || '');
    try { v = v.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) {}
    return v.replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(0, 120) || 'arquivo';
  }

  function _base64ToBlob(base64, mime) {
    const raw = String(base64 || '').split(',').pop();
    const bin = atob(raw);
    const len = bin.length;
    const chunks = [];
    const size = 1024 * 512;
    for (let i = 0; i < len; i += size) {
      const slice = bin.slice(i, i + size);
      const arr = new Uint8Array(slice.length);
      for (let j = 0; j < slice.length; j++) arr[j] = slice.charCodeAt(j);
      chunks.push(arr);
    }
    return new Blob(chunks, { type: mime || 'application/octet-stream' });
  }

  function _path(chamadoId, categoria, nome, escolaNome, meta) {
    const dt = new Date();
    const stamp = dt.getFullYear() + String(dt.getMonth() + 1).padStart(2, '0') + String(dt.getDate()).padStart(2, '0') + '_' + String(dt.getHours()).padStart(2, '0') + String(dt.getMinutes()).padStart(2, '0') + String(dt.getSeconds()).padStart(2, '0') + '_' + Math.random().toString(36).slice(2, 8);
    const arquivo = stamp + '_' + _slug(nome);
    // Estrutura de arquivamento por unidade: <escola>/chamado-<id>/<local>/<tipo>/arquivo.
    // Usada quando há local/tipo (formulário da escola). Caso contrário, mantém
    // o caminho antigo <categoria>/chamado-<id>/arquivo (empresa, cadastro interno).
    if (meta && (meta.local || meta.tipo)) {
      const segs = [_slug(escolaNome || 'escola'), 'chamado-' + String(chamadoId)];
      if (meta.local) segs.push(_slug(meta.local));
      if (meta.tipo) segs.push(_slug(meta.tipo));
      segs.push(arquivo);
      return segs.join('/');
    }
    return [String(categoria || 'solicitacao'), 'chamado-' + String(chamadoId), arquivo].join('/');
  }

  async function _urlAssinada(path) {
    if (!path || String(path).indexOf('drive:') === 0) return '';
    try {
      const s = await window.SB.storage.from(_bucket()).createSignedUrl(path, 60 * 60);
      return (s && s.data && s.data.signedUrl) || '';
    } catch (e) {
      return '';
    }
  }

  async function upload(chamadoId, categoria, arquivos, escolaNome, meta) {
    const lista = Array.isArray(arquivos) ? arquivos.filter(a => a && a.base64) : [];
    if (!lista.length) return [];
    if (lista.length > LIMITE) throw new Error(`Limite de ${LIMITE} anexos por envio.`);

    const salvos = [];
    for (let i = 0; i < lista.length; i++) {
      const arq = lista[i];
      const nomeOriginal = arq.nome || arq.name || `anexo_${i + 1}`;
      const mime = arq.mimeType || arq.type || 'application/octet-stream';
      const tamanhoEstimado = Math.floor(String(arq.base64).length * 0.75);
      if (tamanhoEstimado > MAX_MB * 1024 * 1024) throw new Error(`Arquivo ${nomeOriginal} excede ${MAX_MB} MB.`);

      const blob = _base64ToBlob(arq.base64, mime);
      const storagePath = _path(chamadoId, categoria, nomeOriginal, escolaNome, meta);

      const up = await window.SB.storage.from(_bucket()).upload(storagePath, blob, {
        contentType: mime,
        upsert: false
      });
      if (up.error) throw new Error('Falha ao salvar arquivo no Supabase Storage: ' + up.error.message);

      const insObj = {
        solicitacao_id: chamadoId,
        categoria: categoria || 'solicitacao',
        nome: nomeOriginal,
        storage_path: storagePath,
        url: null,
        mime_type: mime,
        tamanho_bytes: blob.size || tamanhoEstimado,
        origem_storage: 'supabase',
        migracao_status: 'pendente'
      };
      // local/tipo só quando informados (formulário da escola) — exigem as colunas
      // criadas em sql/26. Uploads sem meta não referenciam as colunas novas.
      if (meta && (meta.local || meta.tipo)) {
        insObj.local = meta.local || null;
        insObj.tipo = meta.tipo || null;
      }
      const ins = await window.SB.from('anexos').insert(insObj)
        .select('id,solicitacao_id,categoria,nome,storage_path,url,migracao_status').single();

      if (ins.error) {
        // Se o metadado falhar, tenta remover o arquivo para não deixar órfão.
        try { await window.SB.storage.from(_bucket()).remove([storagePath]); } catch (e) {}
        throw new Error('Arquivo salvo no Storage, mas falhou ao gravar metadado: ' + ins.error.message);
      }

      const url = await _urlAssinada(storagePath);
      salvos.push({ nome: nomeOriginal, path: storagePath, storage_path: storagePath, url, categoria, solicitacao_id: chamadoId, migracao_status: 'pendente' });
    }
    return salvos;
  }

  async function mapaPorChamado(ids) {
    const out = {};
    if (!ids || !ids.length) return out;
    const r = await window.SB.from('anexos')
      .select('solicitacao_id,categoria,nome,storage_path,url,origem_storage,migracao_status')
      .in('solicitacao_id', ids);
    if (r.error || !r.data || !r.data.length) return out;

    const precisamAssinada = r.data.filter(a => !a.url && a.storage_path && String(a.storage_path).indexOf('drive:') !== 0);
    let urlByPath = {};
    if (precisamAssinada.length) {
      try {
        const s = await window.SB.storage.from(_bucket()).createSignedUrls(precisamAssinada.map(a => a.storage_path), 60 * 60);
        (s.data || []).forEach(it => { if (it && it.path) urlByPath[it.path] = it.signedUrl; });
      } catch (e) { /* devolve sem URL se falhar */ }
    }

    r.data.forEach(a => {
      const cat = a.categoria || 'solicitacao';
      out[a.solicitacao_id] = out[a.solicitacao_id] || { solicitacao: [], orcamento: [], servico: [] };
      const url = a.url || urlByPath[a.storage_path] || '';
      (out[a.solicitacao_id][cat] = out[a.solicitacao_id][cat] || []).push({
        nome: a.nome || 'arquivo',
        url,
        path: a.storage_path || '',
        migracaoStatus: a.migracao_status || '',
        origemStorage: a.origem_storage || ''
      });
    });
    return out;
  }

  return { upload, mapaPorChamado };
})();
