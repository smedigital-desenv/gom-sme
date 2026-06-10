/* ============================================================================
 * GOM | SME — Configuração do Supabase
 * ----------------------------------------------------------------------------
 * A anon key é pública para uso no navegador. Quem protege os dados é a RLS
 * (políticas no banco), não o segredo da chave.
 * ========================================================================== */

const GOM_SUPABASE = {
  URL: 'https://iqldovwttomkjkoakosc.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbGRvdnd0dG9ta2prb2Frb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDU4NzksImV4cCI6MjA5NjA4MTg3OX0.4dYeK5iIEgSD7CEWyLoaqXEXvuITVNVpTlfdmCyJCI0',
  BUCKET_ANEXOS: 'anexos'
};

/* Controle de logs. Em produção, manter false. */
window.GOM_DEBUG = false;
window.gomLog = function () {
  if (!window.GOM_DEBUG) return;
  try { console.log.apply(console, arguments); } catch (e) {}
};
window.gomWarn = function () {
  if (!window.GOM_DEBUG) return;
  try { console.warn.apply(console, arguments); } catch (e) {}
};

(function () {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[GOM] supabase-js não carregou. Verifique a tag <script> do CDN antes de config.js.');
    return;
  }

  window.SB = supabase.createClient(GOM_SUPABASE.URL, GOM_SUPABASE.ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    }
  });

  window.GOM_SUPABASE = GOM_SUPABASE;
  window.gomLog('%c[GOM] Supabase conectado', 'background:#075f82;color:#fff;padding:2px 6px;border-radius:4px;');
})();
