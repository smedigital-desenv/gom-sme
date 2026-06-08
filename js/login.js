/* ============================================================================
 * GOM | SME — Caminho 4: Híbrido (Google OAuth + PIN Empresa)
 * Secretaria: botão "Entrar com Google" (melhor UX, mais seguro).
 * Empresa: código PIN fixo (simples, sem Google account necessário).
 * RECOMENDADO PARA PRODUÇÃO.
 * ========================================================================== */
(function () {
  'use strict';

  const TELAS = {
    ADMIN_GOM:  ['dashboard','triagem','fila','aprovacao','empresa','campo','alertas','obras','historico','relatorios','cadastro','acompanhar','configuracoes'],
    GOM:        ['dashboard','triagem','fila','aprovacao','campo','alertas','obras','historico','relatorios','cadastro','acompanhar'],
    EMPRESA:    ['empresa'],
    CAMPO:      ['campo','acompanhar','dashboard'],
    CONFERENTE: ['dashboard','historico','relatorios','obras'],
    ESCOLA:     ['acompanhar','cadastro'],
  };
  const PAGINA = { ADMIN_GOM:'dashboard', GOM:'dashboard', EMPRESA:'empresa', CAMPO:'campo', CONFERENTE:'dashboard', ESCOLA:'acompanhar' };
  const LABELS = { ADMIN_GOM:'Administrador GOM', GOM:'Equipe GOM', EMPRESA:'Empresa', CAMPO:'Campo', CONFERENTE:'Conferente', ESCOLA:'Escola' };

  window.GomAuth = {
    perfil:null, email:null, session:null,
    podeVerTela: function(t){ return (TELAS[this.perfil]||[]).indexOf(t)>=0; },
    paginaInicial: function(){ return PAGINA[this.perfil]||'dashboard'; }
  };

  window.gomAuthInit = async function() {
    // 1. Sessão Google (OAuth)
    const { data:{ session } } = await window.SB.auth.getSession();
    if (session && session.user) {
      GomAuth.session=session; GomAuth.email=session.user.email;
      await _carregarPerfil(session.user.email);
      return true;
    }
    // 2. PIN empresa
    var pinP = sessionStorage.getItem('gomPinPerfil');
    if (pinP && TELAS[pinP]) { GomAuth.perfil=pinP; GomAuth.email='empresa@pin'; return true; }
    return false;
  };

  async function _carregarPerfil(email) {
    try {
      var r = await window.SB.from('perfis').select('perfil,ativo').ilike('email',email).maybeSingle();
      GomAuth.perfil = (r.data && r.data.ativo) ? r.data.perfil : 'GOM';
    } catch(e){ GomAuth.perfil='GOM'; }
  }

  window.gomEntrarGoogle = async function() {
    var btn=document.getElementById('gomBtnGoogle');
    if(btn){ btn.disabled=true; btn.innerHTML='<span class="spinner-border spinner-border-sm me-2"></span>Redirecionando...'; }
    try {
      var { error } = await window.SB.auth.signInWithOAuth({
        provider:'google',
        options: { redirectTo: window.location.href }
      });
      if(error) throw error;
    } catch(e) {
      if(btn){ btn.disabled=false; btn.innerHTML='<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" style="margin-right:8px;">Entrar com Google'; }
      _msg('Erro ao iniciar o login: '+(e.message||e),'erro');
    }
  };

  window.gomLoginPIN = async function() {
    var pinEl=document.getElementById('gomLoginPIN'); if(!pinEl) return;
    var pin=pinEl.value.trim();
    if(!pin){ _msg('Informe o código.','erro'); return; }
    var btn=document.getElementById('gomBtnPIN');
    if(btn){ btn.disabled=true; btn.textContent='Verificando...'; }
    try {
      var r = await window.SB.from('configuracoes').select('valor').eq('chave','CODIGO_ACESSO_EMPRESA').maybeSingle();
      var pinSalvo = r.data ? String(r.data.valor||'') : '';
      if(!pinSalvo){ _msg('Nenhum código configurado para a empresa.','erro'); if(btn){btn.disabled=false;btn.textContent='Entrar com código';} return; }
      if(pin!==pinSalvo){ _msg('Código inválido.','erro'); if(btn){btn.disabled=false;btn.textContent='Entrar com código';} return; }
      sessionStorage.setItem('gomPinPerfil','EMPRESA');
      GomAuth.perfil='EMPRESA'; GomAuth.email='empresa@pin';
      _loginSucesso();
    } catch(e){ _msg('Erro: '+(e.message||e),'erro'); if(btn){btn.disabled=false;btn.textContent='Entrar com código';} }
  };

  window.gomLogout = async function() {
    sessionStorage.removeItem('gomPinPerfil');
    GomAuth.perfil=null; GomAuth.email=null; GomAuth.session=null;
    try{ await window.SB.auth.signOut(); }catch(e){}
    _mostrarTelaLogin();
  };

  window.gomAplicarPerfil = function() {
    var telas=TELAS[GomAuth.perfil]||[];
    document.querySelectorAll('[data-page]').forEach(function(b){
      if(!b.dataset.page||b.dataset.page==='mais') return;
      b.style.display=telas.indexOf(b.dataset.page)>=0?'':'none';
    });
    var label=LABELS[GomAuth.perfil]||GomAuth.perfil;
    var emailLabel=(GomAuth.email&&GomAuth.email!=='empresa@pin')?' · '+GomAuth.email:'';
    var badge=document.getElementById('perfilUsuarioBadge'), mb=document.getElementById('mobilePerfilUsuarioBadge');
    if(badge) badge.textContent=label+emailLabel;
    if(mb)    mb.textContent=label;
    _criarBotaoLogout();
    if(typeof window.loadPage==='function') window.loadPage(GomAuth.paginaInicial());
  };

  function _criarBotaoLogout(){
    if(document.getElementById('gomBtnLogoutNav')) return;
    var nav=document.querySelector('.nav-actions-primary'); if(!nav) return;
    var btn=document.createElement('button');
    btn.id='gomBtnLogoutNav'; btn.className='btn-nav'; btn.title='Sair';
    btn.innerHTML='<i class="bi bi-box-arrow-right"></i><span>Sair</span>';
    btn.onclick=window.gomLogout;
    nav.parentElement.appendChild(btn);
  }

  function _mostrarTelaLogin() {
    _ocultarApp();
    var old=document.getElementById('gomTelaLogin');
    if(old){ old.style.display='flex'; return; }
    var div=document.createElement('div');
    div.id='gomTelaLogin';
    div.style.cssText='position:fixed;inset:0;background:linear-gradient(135deg,#002b5e,#075f82);display:flex;align-items:center;justify-content:center;z-index:9999;padding:20px;';
    div.innerHTML=`
      <div style="background:#fff;border-radius:20px;box-shadow:0 20px 60px rgba(0,0,0,.4);padding:40px 36px;max-width:420px;width:100%;">
        <div style="text-align:center;margin-bottom:24px;">
          <i class="bi bi-gear-wide-connected" style="font-size:2.8rem;color:#075f82;"></i>
          <h2 style="font-weight:900;color:#002b5e;margin:8px 0 4px;">GOM | SME</h2>
          <p style="color:#64748b;font-size:.88rem;">Sistema de Gestão Operacional de Manutenção</p>
        </div>
        <div id="gomLoginMsg" style="display:none;margin-bottom:14px;border-radius:10px;padding:10px 14px;font-size:.88rem;"></div>
        <div style="display:flex;gap:8px;margin-bottom:20px;">
          <button class="btn btn-primary fw-bold flex-fill" id="gomTabSec" onclick="gomLoginAba('secretaria')">
            <i class="bi bi-building me-1"></i>Secretaria
          </button>
          <button class="btn btn-outline-secondary fw-bold flex-fill" id="gomTabEmp" onclick="gomLoginAba('empresa')">
            <i class="bi bi-tools me-1"></i>Empresa
          </button>
        </div>
        <!-- Secretaria: Google -->
        <div id="gomFormSec">
          <button id="gomBtnGoogle" class="btn btn-light border fw-bold w-100 py-3" onclick="gomEntrarGoogle()" style="font-size:1rem;border-radius:12px;">
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="20" style="margin-right:10px;vertical-align:middle;">
            Entrar com Google Institucional
          </button>
          <p class="text-muted small text-center mt-3">Use sua conta @educacao.pmrp.sp.gov.br</p>
        </div>
        <!-- Empresa: PIN -->
        <div id="gomFormEmp" style="display:none;">
          <label class="form-label fw-bold text-muted small">CÓDIGO DE ACESSO DA EMPRESA</label>
          <input type="password" id="gomLoginPIN" class="form-control mb-3"
                 placeholder="Código fornecido pela Secretaria"
                 onkeydown="if(event.key==='Enter') gomLoginPIN()">
          <button id="gomBtnPIN" class="btn btn-primary fw-bold w-100" onclick="gomLoginPIN()">
            <i class="bi bi-shield-lock-fill me-1"></i>Entrar com código
          </button>
        </div>
      </div>`;
    document.body.appendChild(div);
    window.SB.auth.onAuthStateChange(async function(event,session){
      if(event==='SIGNED_IN'&&session&&session.user){
        GomAuth.session=session; GomAuth.email=session.user.email;
        await _carregarPerfil(session.user.email);
        _loginSucesso();
      }
    });
  }

  window.gomLoginAba = function(aba) {
    document.getElementById('gomFormSec').style.display=aba==='secretaria'?'':'none';
    document.getElementById('gomFormEmp').style.display=aba==='empresa'?'':'none';
    document.getElementById('gomTabSec').className='btn fw-bold flex-fill '+(aba==='secretaria'?'btn-primary':'btn-outline-secondary');
    document.getElementById('gomTabEmp').className='btn fw-bold flex-fill '+(aba==='empresa'?'btn-primary':'btn-outline-secondary');
  };

  function _loginSucesso(){ var el=document.getElementById('gomTelaLogin'); if(el) el.remove(); _mostrarApp(); window.gomAplicarPerfil(); }
  function _msg(txt,tipo){ var el=document.getElementById('gomLoginMsg'); if(!el) return; el.style.display='block'; if(tipo==='erro'){el.style.background='#fef2f2';el.style.color='#dc2626';el.style.border='1px solid #fca5a5';}else{el.style.background='#eff6ff';el.style.color='#1d4ed8';el.style.border='1px solid #93c5fd';} el.innerHTML=txt; }
  function _ocultarApp(){['nav-header','mobile-topbar','main','mobile-bottom-nav'].forEach(function(c){var e=document.querySelector('.'+c)||document.querySelector(c);if(e)e.style.display='none';});var l=document.getElementById('loader');if(l)l.style.display='none';}
  function _mostrarApp(){['nav-header','mobile-topbar','mobile-bottom-nav'].forEach(function(c){var e=document.querySelector('.'+c);if(e)e.style.display='';});var m=document.querySelector('main');if(m)m.style.display='';}

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(async function(){
      var logado=await window.gomAuthInit();
      if(logado){ _mostrarApp(); window.gomAplicarPerfil(); return; }
      var r=await window.SB.from('configuracoes').select('valor').eq('chave','LOGIN_ATIVO').maybeSingle();
      if(r.data&&r.data.valor==='SIM') _mostrarTelaLogin();
      else{ GomAuth.perfil='ADMIN_GOM'; GomAuth.email=''; _mostrarApp(); window.gomAplicarPerfil(); }
    }, 300);
  });
})();
