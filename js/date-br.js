/* ============================================================================
   GOM | Datas em padrão brasileiro
   Mantém a exibição para o usuário em dd/mm/aaaa e converte para ISO no envio.
   ============================================================================ */
(function gomDatasBrasileiras(){
  'use strict';
  function pad2(v){ return String(v).padStart(2, '0'); }
  function dataParaISO(valor){
    if (!valor) return '';
    if (valor instanceof Date && !isNaN(valor.getTime())) return valor.getFullYear() + '-' + pad2(valor.getMonth()+1) + '-' + pad2(valor.getDate());
    var s = String(valor || '').trim();
    if (!s) return '';

    // Nunca usar new Date('aaaa-mm-dd') para campos de dia, porque o navegador
    // pode interpretar como UTC e, no Brasil, gravar/exibir D-1.
    var iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3];

    var br = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) return br[3] + '-' + pad2(br[2]) + '-' + pad2(br[1]);

    var brHifen = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (brHifen) return brHifen[3] + '-' + pad2(brHifen[2]) + '-' + pad2(brHifen[1]);

    var dataHoraIso = s.match(/^(\d{4})-(\d{2})-(\d{2})[T\s]/);
    if (dataHoraIso) return dataHoraIso[1] + '-' + dataHoraIso[2] + '-' + dataHoraIso[3];

    var dataHoraBr = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[\sT]/);
    if (dataHoraBr) return dataHoraBr[3] + '-' + pad2(dataHoraBr[2]) + '-' + pad2(dataHoraBr[1]);

    // Último recurso apenas para datas completas com timezone explícito.
    var d = new Date(s);
    if (!isNaN(d.getTime())) return d.getFullYear() + '-' + pad2(d.getMonth()+1) + '-' + pad2(d.getDate());
    return '';
  }
  function dataParaBR(valor){
    var iso = dataParaISO(valor);
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? (m[3] + '/' + m[2] + '/' + m[1]) : String(valor || '');
  }
  function mascararDataInput(input){
    if (!input) return;
    if (String(input.type || '').toLowerCase() === 'date') return;
    var v = String(input.value || '').replace(/\D/g, '').slice(0, 8);
    if (v.length >= 5) v = v.slice(0,2) + '/' + v.slice(2,4) + '/' + v.slice(4);
    else if (v.length >= 3) v = v.slice(0,2) + '/' + v.slice(2);
    input.value = v;
  }
  function normalizarInput(input){
    if (!input) return '';
    var iso = dataParaISO(input.value);
    if (String(input.type || '').toLowerCase() === 'date') {
      if (iso) input.value = iso;
    } else if (iso) {
      input.value = dataParaBR(iso);
    }
    return iso;
  }
  window.gomDataParaISO = dataParaISO;
  window.gomDataParaBR = dataParaBR;
  window.gomMascaraDataBrInput = mascararDataInput;
  window.gomNormalizarDataBrInput = normalizarInput;
  window.gomHojeISO = function(){ return dataParaISO(new Date()); };
  window.gomHojeBR = function(){ return dataParaBR(new Date()); };

  function atualizarDatasBrNaTela(root){
    try {
      (root || document).querySelectorAll('.gom-date-br-input').forEach(function(input){
        if (!input || !input.value) return;
        var iso = dataParaISO(input.value);
        if (!iso) return;
        if (String(input.type || '').toLowerCase() === 'date') input.value = iso;
        else input.value = dataParaBR(iso);
      });
    } catch(e) {}
  }
  window.gomAtualizarDatasBrNaTela = atualizarDatasBrNaTela;

  document.addEventListener('focusin', function(ev){
    if (ev.target && ev.target.classList && ev.target.classList.contains('gom-date-br-input') && ev.target.value) {
      if (String(ev.target.type || '').toLowerCase() === 'date') return;
      ev.target.value = dataParaBR(ev.target.value);
    }
  });
  document.addEventListener('shown.bs.modal', function(ev){ atualizarDatasBrNaTela(ev.target || document); });
  document.addEventListener('DOMContentLoaded', function(){ atualizarDatasBrNaTela(document); });

})();
