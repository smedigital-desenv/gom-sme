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
  const HEADER   = 4;
  const REAJUSTE = 1 + (5.00547 / 100); // fator aplicado a partir da 6ª medição

  // Mapa de medições: label, índice 0-based, e se aplica reajuste
  const MEDICOES = [
    { label: '1ª',  col: 12, reajuste: false },
    { label: '2ª',  col: 14, reajuste: false },
    { label: '3ª',  col: 16, reajuste: false },
    { label: '4ª',  col: 30, reajuste: false },
    { label: '5ª',  col: 32, reajuste: false },
    { label: '6ª',  col: 34, reajuste: true  },
    { label: '7ª',  col: 36, reajuste: true  },
    { label: '8ª',  col: 38, reajuste: true  },
    { label: '9ª',  col: 40, reajuste: true  },
    { label: '10ª', col: 42, reajuste: true  },
    { label: '11ª', col: 44, reajuste: true  },
    { label: '12ª', col: 46, reajuste: true  },
    { label: '13ª', col: 48, reajuste: true  },
    { label: '14ª', col: 50, reajuste: true  },
    { label: '15ª', col: 53, reajuste: true  },
  ];

  const rows          = [];
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

  return JSON.stringify({ rows, medicoesSerie });
}
