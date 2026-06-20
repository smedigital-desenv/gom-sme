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

  // Teto do contrato de manutenção (célula A3) = valor máximo da soma das O.S.
  let valorContrato = data[2][0]; // linha 3, coluna A (índice [2][0])
  valorContrato = (typeof valorContrato === 'string')
    ? parseFloat(valorContrato.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0
    : parseFloat(valorContrato) || 0;

  // Mapa de medições: label, índice 0-based da coluna de VALOR, e se aplica reajuste.
  // As colunas de valor são N, P, R, … (a partir de N, de duas em duas, com salto
  // após a 3ª medição). As colunas M, O, Q, … são "Nota" e NÃO são valores.
  const MEDICOES = [
    { label: '1ª',  col: 13, reajuste: false }, // N
    { label: '2ª',  col: 15, reajuste: false }, // P
    { label: '3ª',  col: 17, reajuste: false }, // R
    { label: '4ª',  col: 31, reajuste: false }, // AF
    { label: '5ª',  col: 33, reajuste: false }, // AH
    { label: '6ª',  col: 35, reajuste: true  }, // AJ
    { label: '7ª',  col: 37, reajuste: true  }, // AL
    { label: '8ª',  col: 39, reajuste: true  }, // AN
    { label: '9ª',  col: 41, reajuste: true  }, // AP
    { label: '10ª', col: 43, reajuste: true  }, // AR
    { label: '11ª', col: 45, reajuste: true  }, // AT
    { label: '12ª', col: 47, reajuste: true  }, // AV
    { label: '13ª', col: 49, reajuste: true  }, // AX
    { label: '14ª', col: 51, reajuste: true  }, // AZ
    { label: '15ª', col: 54, reajuste: true  }, // BC
  ];

  const rows          = [];
  let   totalEmitido  = 0; // soma dos valores das O.S. (consome o teto do contrato)
  const totalMedicoes = {};
  MEDICOES.forEach(m => totalMedicoes[m.label] = 0);

  for (let i = HEADER + 1; i < data.length; i++) {
    const row = data[i];

    const unidade = row[0] ? row[0].toString().trim() : '';
    if (!unidade || unidade === 'UNIDADE ESCOLAR') continue;

    const valorOs        = parseFloat(row[6]) || 0; // col G – Valor contratado (original)
    const valorExecutado = parseFloat(row[8]) || 0; // col I – Valor pago/executado (pode ser > ou < que G)
    const valorPendente  = parseFloat(row[9]) || 0; // col J – A Executar

    if (valorOs <= 0) continue;

    // O teto do contrato é consumido pelo valor REAJUSTADO da O.S (col BF = índice 57).
    // Se a célula BF estiver vazia, usa o valor original (col G) como fallback.
    const valorOsReaj = parseFloat(row[57]) || valorOs; // col BF – valor da O.S reajustado
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
      os           : row[5] ? row[5].toString().trim() : '',
      valor_os     : valorOs,
      valor_pago   : valorExecutado,
      valor_aberto : valorPendente
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
  const saldo         = valorContrato - totalEmitido;          // quanto ainda pode ser emitido
  const mediaRestante = restantes > 0 ? saldo / restantes : 0; // média por medição restante

  const round2 = v => Math.round(v * 100) / 100;
  const contrato = {
    valorContrato   : round2(valorContrato),
    totalEmitido    : round2(totalEmitido),
    saldo           : round2(saldo),
    medicoesFeitas  : medicoesFeitas,
    medicoesContrato: MEDICOES_CONTRATO,
    restantes       : restantes,
    mediaRestante   : round2(mediaRestante)
  };

  return JSON.stringify({ rows, medicoesSerie, contrato });
}
