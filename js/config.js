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

/* ============================================================================
 * Armazenamento de anexos no Google Drive (via Web App GomDriveAPI.gs)
 * ----------------------------------------------------------------------------
 * URL: a URL /exec pública do Web App (Implantar → App da Web →
 *      Executar como: eu / Acesso: Qualquer pessoa).
 * TOKEN: deve ser IDÊNTICO ao GOM_DRIVE_CONFIG.TOKEN do GomDriveAPI.gs.
 * Enquanto a URL estiver vazia, o sistema avisa ao tentar anexar arquivos.
 * ========================================================================== */
const GOM_DRIVE = {
  URL: 'https://script.google.com/macros/s/AKfycbzGf9lnIDmlcBdEVT9EzJ5ykQZwqFniWGOCnr6AovtXrUGx7eFPfyVzwQdaurb_T4XR/exec',
  TOKEN: '4ccb06a273d04df2a17dddc25b0d351a9cbada8dfa6e487a901db81bb03ab819'
};
window.GOM_DRIVE = GOM_DRIVE;

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
