// ============================================================
// ControleServicos.Code.gs
// Backend do Dashboard de Controle de Serviços
//
// Mudança em relação ao original: o doGet NÃO serve mais o HTML.
// O HTML agora mora no GitHub Pages (controle-servicos.html) e
// consome este Web App como uma API que devolve JSON.
//
// Publicação (ver docs/LEIA-ME-CONTROLE-SERVICOS.md):
//   Implantar → Nova implantação → Tipo: App da Web
//   Executar como: Eu  |  Quem tem acesso: Qualquer pessoa
//   Copie a URL /exec e cole na constante API_URL do HTML.
// ============================================================

// Servido via fetch() pela página no GitHub Pages.
// Retorna o mesmo payload de antes, agora como resposta JSON.
function doGet(e) {
  const json = getDados();
  return ContentService
    .createTextOutput(json)
    .setMimeType(ContentService.MimeType.JSON);
}

// Monta o payload { rows, medicoesSerie } a partir da planilha.
function getDados() {
  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Plan1');
  const data  = sheet.getDataRange().getValues();

  // Linha 5 (índice 4) = cabeçalhos | Linha 6 em diante = dados
  const HEADER           = 4;
  const REAJUSTE         = 1 + (5.00547 / 100); // fator aplicado a partir da 6ª medição
  const MEDICOES_CONTRATO = 12;                 // o contrato vai até a 12ª medição

  // Converte um valor de célula (número ou texto "1.234,56") em número.
  const parseValor = v => (typeof v === 'string')
    ? parseFloat(v.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0
    : parseFloat(v) || 0;

  // Teto do contrato de manutenção (célula A3) = valor máximo da soma das O.S.
  const valorContrato = parseValor(data[2][0]); // linha 3, coluna A (índice [2][0])

  // Valor executado pela Secretaria de Esporte (célula BF2 = índice [1][57]).
  // Desconta do saldo a emitir, pois também consome o teto do contrato.
  const valorEsporte = parseValor(data[1][57]);

  // Valor de garantia de obra (célula BF3 = índice [2][57]).
  // Também desconta do saldo a emitir.
  const valorGarantia = parseValor(data[2][57]);

  // Mapa de medições: label, índice 0-based da coluna de VALOR, e se aplica reajuste.
  // Obs.: uma nova coluna foi inserida entre G e H (valor reajustado da O.S),
  // o que empurrou todas as colunas a partir daí em +1. As colunas de valor
  // das medições agora são O, Q, S, … (antes N, P, R).
  const MEDICOES = [
    { label: '1ª',  col: 14, reajuste: false }, // O
    { label: '2ª',  col: 16, reajuste: false }, // Q
    { label: '3ª',  col: 18, reajuste: false }, // S
    { label: '4ª',  col: 32, reajuste: false }, // AG
    { label: '5ª',  col: 34, reajuste: false }, // AI
    { label: '6ª',  col: 36, reajuste: true  }, // AK
    { label: '7ª',  col: 38, reajuste: true  }, // AM
    { label: '8ª',  col: 40, reajuste: true  }, // AO
    { label: '9ª',  col: 42, reajuste: true  }, // AQ
    { label: '10ª', col: 44, reajuste: true  }, // AS
    { label: '11ª', col: 46, reajuste: true  }, // AU
    { label: '12ª', col: 48, reajuste: true  }, // AW
    { label: '13ª', col: 50, reajuste: true  }, // AY
    { label: '14ª', col: 52, reajuste: true  }, // BA
    { label: '15ª', col: 55, reajuste: true  }, // BD
  ];

  const rows          = [];
  let   totalEmitido  = 0; // soma dos valores das O.S. (consome o teto do contrato)
  const totalMedicoes = {};
  MEDICOES.forEach(m => totalMedicoes[m.label] = 0);

  for (let i = HEADER + 1; i < data.length; i++) {
    const row = data[i];

    const unidade = row[0] ? row[0].toString().trim() : '';
    if (!unidade || unidade === 'UNIDADE ESCOLAR') continue;

    const valorOs        = parseFloat(row[6]) || 0;  // col G – Valor contratado (original)
    const valorExecutado = parseFloat(row[9]) || 0;  // col J – Valor pago/executado (pode ser > ou < que G)
    const valorPendente  = parseFloat(row[10]) || 0; // col K – A Executar

    if (valorOs <= 0) continue;

    // O teto do contrato é consumido pelo valor REAJUSTADO da O.S (nova col H = índice 7).
    // Se a célula H estiver vazia, usa o valor original (col G) como fallback.
    const valorOsReaj = parseFloat(row[7]) || valorOs; // col H – valor da O.S reajustado
    totalEmitido += valorOsReaj;

    // Derivar status quando campo E está em branco
    let status = row[4] ? row[4].toString().trim() : '';
    if (!status) {
      if (valorExecutado > 0 && valorPendente > 0)       status = 'EM ANDAMENTO';
      else if (valorExecutado === 0 && valorPendente > 0) status = 'PENDENTE';
      else if (valorExecutado > 0 && valorPendente <= 0)  status = 'CONCLUÍDA';
    }

    // Acumular valores por medição, aplicando reajuste onde devido
    MEDICOES.forEach(m => {
      const v = parseFloat(row[m.col]) || 0;
      if (v > 0) {
        totalMedicoes[m.label] += m.reajuste ? v * REAJUSTE : v;
      }
    });

    rows.push({
      unidade      : unidade,
      tipo         : row[1] ? row[1].toString().trim() : '',
      servico      : row[2] ? row[2].toString().trim() : '',
      status       : status,
      os            : row[5] ? row[5].toString().trim() : '',
      valor_os      : valorOs,
      valor_emitido : valorOsReaj, // col H – valor reajustado (consome o teto)
      valor_pago    : valorExecutado,
      valor_aberto  : valorPendente
    });
  }

  // Série de medições para o gráfico (só as com valor > 0)
  const medicoesSerie = MEDICOES
    .filter(m => totalMedicoes[m.label] > 0)
    .map(m => ({
      label    : m.label + ' Med.',
      valor    : Math.round(totalMedicoes[m.label] * 100) / 100,
      reajuste : m.reajuste
    }));

  // ── Controle do teto do contrato e projeção de saldo ────────
  // Medições já realizadas = quantas das 12 do contrato têm valor lançado.
  const medicoesFeitas = MEDICOES
    .slice(0, MEDICOES_CONTRATO)
    .filter(m => totalMedicoes[m.label] > 0)
    .length;

  const restantes     = Math.max(0, MEDICOES_CONTRATO - medicoesFeitas);
  // Saldo a emitir = teto − emitido (col H) − Sec. Esporte (BF2) − garantia de obra (BF3)
  const saldo         = valorContrato - totalEmitido - valorEsporte - valorGarantia;
  const mediaRestante = restantes > 0 ? saldo / restantes : 0; // média por medição restante

  // Total comprometido do teto = O.S emitidas + Sec. Esporte + garantia de obra
  const totalComprometido = totalEmitido + valorEsporte + valorGarantia;

  const round2 = v => Math.round(v * 100) / 100;
  const contrato = {
    valorContrato     : round2(valorContrato),
    totalEmitido      : round2(totalEmitido),
    valorEsporte      : round2(valorEsporte),
    valorGarantia     : round2(valorGarantia),
    totalComprometido : round2(totalComprometido),
    saldo             : round2(saldo),
    medicoesFeitas  : medicoesFeitas,
    medicoesContrato: MEDICOES_CONTRATO,
    restantes       : restantes,
    mediaRestante   : round2(mediaRestante)
  };

  return JSON.stringify({ rows, medicoesSerie, contrato });
}
