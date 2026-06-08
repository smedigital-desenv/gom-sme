/* ============================================================================
 * GOM | SME — Configuração do Supabase
 * ----------------------------------------------------------------------------
 * PREENCHA as duas linhas abaixo com os dados do seu projeto:
 *   Supabase → Settings → API → "Project URL" e "anon public" key.
 *
 * A anon key é feita para uso no navegador. Quem protege os dados é a RLS
 * (políticas no banco), não o segredo da chave.
 * ========================================================================== */

const GOM_SUPABASE = {
  URL: 'https://iqldovwttomkjkoakosc.supabase.co',   // <-- cole aqui o Project URL
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbGRvdnd0dG9ta2prb2Frb3NjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MDU4NzksImV4cCI6MjA5NjA4MTg3OX0.4dYeK5iIEgSD7CEWyLoaqXEXvuITVNVpTlfdmCyJCI0',          // <-- cole aqui a anon public key
  BUCKET_ANEXOS: 'anexos'                     // bucket criado no Storage
};

/* Cria o cliente (a lib supabase-js é carregada via <script> antes deste arquivo).
   Exposto como window.SB para os módulos de dados usarem. */
(function () {
  if (typeof supabase === 'undefined' || !supabase.createClient) {
    console.error('[GOM] supabase-js não carregou. Verifique a tag <script> do CDN antes de config.js.');
    return;
  }
  window.SB = supabase.createClient(GOM_SUPABASE.URL, GOM_SUPABASE.ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } // login entra na Fase 4; por ora sem sessão
  });
  window.GOM_SUPABASE = GOM_SUPABASE;
  console.log('%c[GOM] Supabase conectado', 'background:#075f82;color:#fff;padding:2px 6px;border-radius:4px;');
})();
