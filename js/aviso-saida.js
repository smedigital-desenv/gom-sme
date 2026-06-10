/* ============================================================================
 * GOM | SME — aviso-saida.js
 * Avisa o usuário ao sair da tela ou navegar sem ter salvo as alterações.
 * Carregue este arquivo APÓS os demais scripts da aplicação.
 * ========================================================================== */
(function () {
  'use strict';

  // ── Verifica se há alterações pendentes em qualquer tela ────────────────────
  function temAlteracoesPendentes() {
    // Triagem / Fila (gomTfAlteracoes)
    if (window.gomTfAlteracoes && Object.keys(window.gomTfAlteracoes).length) return true;
    // Empresa execução diária (empresaDiaAlterados)
    if (window.empresaDiaAlterados && Object.keys(window.empresaDiaAlterados).length) return true;
    // Configurações (gomConfigAlterados ou configAlterados)
    if (window.gomConfigAlterados && Object.keys(window.gomConfigAlterados).length) return true;
    if (window.configAlterados && Object.keys(window.configAlterados).length) return true;
    return false;
  }

  window.gomTemAlteracoesPendentes = temAlteracoesPendentes;

  // ── beforeunload: avisa ao fechar/atualizar o browser ──────────────────────
  window.addEventListener('beforeunload', function (e) {
    if (!temAlteracoesPendentes()) return;
    var msg = 'Você tem alterações não salvas. Deseja sair mesmo assim?';
    e.preventDefault();
    e.returnValue = msg;
    return msg;
  });

  // ── Intercepta loadPage (navegação entre telas) ────────────────────────────
  function instalarInterceptor() {
    if (typeof window.loadPage !== 'function') return; // ainda não carregou
    if (window.loadPage._gomAvisoInstalado) return;    // já instalado

    // Guarda sempre a função real/base de navegação. Se algum wrapper anterior
    // deixou essa referência, reaproveitamos. Isso evita recursão entre
    // aviso-saida.js e permissoes.js.
    var loadPageBase = window.loadPage.__gomLoadPageBase || window.__gomLoadPageBase || window.loadPage;
    window.__gomLoadPageBase = loadPageBase;

    var loadPageComAviso = function (pagina) {
      // Permissões: se existir o validador do permissoes.js, ele decide antes de navegar.
      if (typeof window.gomAutorizarNavegacao === 'function') {
        if (!window.gomAutorizarNavegacao(pagina)) return false;
      }

      if (!temAlteracoesPendentes()) {
        return loadPageBase.apply(this, arguments);
      }

      var msg = 'Você tem alterações não salvas nesta tela.\n\nDeseja sair e descartar as alterações?';
      if (confirm(msg)) {
        // Descarta todas as alterações pendentes
        window.gomTfAlteracoes     = {};
        window.empresaDiaAlterados = {};
        window.gomConfigAlterados  = {};
        window.configAlterados     = {};
        return loadPageBase.apply(this, arguments);
      }
      return false;
    };

    loadPageComAviso._gomAvisoInstalado = true;
    loadPageComAviso.__gomLoadPageBase = loadPageBase;
    window.loadPage = loadPageComAviso;
  }

  // Tenta instalar imediatamente e também após o DOM carregar (quando loadPage já existe)
  instalarInterceptor();
  document.addEventListener('DOMContentLoaded', instalarInterceptor);
  // Fallback: tenta novamente após 2s (caso loadPage seja definido assincronamente)
  setTimeout(instalarInterceptor, 2000);

})();

/* ============================================================================
 * CSS embutido para thumbnails do modal e linhas alteradas
 * (injetado em <style> no head para não precisar editar o styles.css)
 * ========================================================================== */
(function () {
  var css = `
/* ── Thumbnails no modal do chamado ──────────────────────────────────────── */
.gom-modal-anexos-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}
.gom-modal-thumb {
  position: relative;
  width: 110px;
  height: 110px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid #e2e8f0;
  background: #f8fafc;
  cursor: pointer;
  transition: transform .15s, border-color .15s, box-shadow .15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.gom-modal-thumb:hover {
  transform: scale(1.06);
  border-color: #0ea5e9;
  box-shadow: 0 4px 16px rgba(14,165,233,.25);
  z-index: 2;
}
.gom-modal-thumb img {
  width: 100%;
  height: 84px;
  object-fit: cover;
  display: block;
}
.gom-modal-thumb.sem-prev img { display: none; }
.gom-modal-thumb-label {
  display: block;
  font-size: .65rem;
  font-weight: 600;
  color: #475569;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 106px;
  text-align: center;
  background: #f8fafc;
}
/* Ícone de lupa ao hover nas imagens */
.gom-modal-thumb::after {
  content: "\\F52A"; /* Bootstrap icon: zoom-in */
  font-family: "bootstrap-icons";
  position: absolute;
  top: 6px; right: 8px;
  font-size: 1.1rem;
  color: #fff;
  text-shadow: 0 1px 4px rgba(0,0,0,.5);
  opacity: 0;
  transition: opacity .15s;
}
.gom-modal-thumb:hover::after { opacity: 1; }

/* Imagem ampliada no modal lightbox */
.gom-anexo-preview-img {
  max-width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 8px;
}

/* Links para arquivos não-imagem no modal */
.gom-modal-file-item {
  display: inline-flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 8px;
  background: #f1f5f9;
  color: #0f172a;
  text-decoration: none;
  font-size: .82rem;
  font-weight: 600;
  border: 1px solid #e2e8f0;
  transition: background .15s;
  margin: 2px 0;
}
.gom-modal-file-item:hover { background: #e0f2fe; color: #0ea5e9; }

/* ── Linhas alteradas na Triagem/Fila ────────────────────────────────────── */
.empresa-os-list-row.gom-tf-alterada,
.empresa-os-list-row-v2.gom-tf-alterada {
  outline: 2px solid #0ea5e9;
  outline-offset: -2px;
}
.gom-tf-alterada .empresa-unidade-link::after {
  content: ' ●';
  color: #0ea5e9;
  font-size: .7rem;
  vertical-align: super;
}
`;
  var s = document.createElement('style');
  s.id = 'gom-aviso-saida-css';
  if (!document.getElementById('gom-aviso-saida-css')) {
    s.textContent = css;
    document.head.appendChild(s);
  }
})();
