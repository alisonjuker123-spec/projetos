// ============================================================
// CONFIGURAÇÃO — cole aqui o ID da sua planilha do Google Sheets
// O ID está na URL: docs.google.com/spreadsheets/d/ID_AQUI/edit
// ============================================================
const SPREADSHEET_ID = 'COLE_AQUI_O_ID_DA_PLANILHA';

// ============================================================
// ENTRY POINT — serve a página web
// ============================================================
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Dashboard Contratos 3º CRPM')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0');
}

// ============================================================
// LEITURA COMPLETA DOS DADOS DA PLANILHA
// ============================================================
function getDashboardData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();

    const SUMMARY = new Set([
      'Painel Consolidado','Base Detalhada por Unidade',
      'Resumo por Empresa','Resumo por Unidade','Resumo por Tipo',
      'Painel postos de Serviços','Base Detalhada Serviços',
      'Resumo Empresa PRODUSERV','Resumo Tipo PRODUSERV','EMPENHOS'
    ]);

    const result = {
      painel:[], base:[], res_emp:[], res_uni:[], res_tipo:[],
      serv_painel:[], serv_base:[], serv_res_emp:[], serv_res_tipo:[],
      empenhos:[], nfs:{}, fileName: ss.getName()
    };

    sheets.forEach(function(sheet) {
      const name = sheet.getName();
      const rows = sheetToObjects_(sheet);
      if      (name === 'Painel Consolidado')          result.painel      = rows;
      else if (name === 'Base Detalhada por Unidade')  result.base        = rows;
      else if (name === 'Resumo por Empresa')          result.res_emp     = rows;
      else if (name === 'Resumo por Unidade')          result.res_uni     = rows;
      else if (name === 'Resumo por Tipo')             result.res_tipo    = rows;
      else if (name === 'Painel postos de Serviços')   result.serv_painel = rows;
      else if (name === 'Base Detalhada Serviços')     result.serv_base   = rows;
      else if (name === 'Resumo Empresa PRODUSERV')    result.serv_res_emp= rows;
      else if (name === 'Resumo Tipo PRODUSERV')       result.serv_res_tipo=rows;
      else if (name === 'EMPENHOS')                    result.empenhos    = rows;
      else if (!SUMMARY.has(name)) {
        result.nfs[name] = readNFSheet_(sheet);
      }

    });

    return JSON.stringify(result);
  } catch(e) {
    return JSON.stringify({error: e.toString()});
  }
}

// ============================================================
// GRAVAR NOTA FISCAL
// ============================================================
function gravarNF(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = findSheet_(ss, params.gms, params.sheetTitle);
    if (!sheet) return {error: 'Aba não encontrada: ' + params.gms};

    const data = sheet.getDataRange().getValues();
    const nfStart = findNFStartRow_(data);
    if (nfStart < 0) return {error: 'Seção de execução não encontrada na aba'};

    // Encontra linha do empenho ou última linha preenchida
    let targetRow = -1;
    if (params.empenhoNumero) {
      for (let i = nfStart; i < data.length; i++) {
        if (String(data[i][1]).trim() === String(params.empenhoNumero).trim()) {
          targetRow = i + 1; break;
        }
      }
    }
    if (targetRow < 0) {
      let last = nfStart;
      for (let i = data.length - 1; i >= nfStart; i--) {
        if (data[i].some(c => c !== '' && c !== null)) { last = i; break; }
      }
      targetRow = last + 2;
    }

    const r = targetRow;
    // Fórmulas em inglês (padrão do Apps Script)
    sheet.getRange(r, 5).setFormula(`=IF(B${r}="","",C${r}-IFERROR(VALUE(I${r}),0)-IFERROR(VALUE(G${r}),0))`);
    sheet.getRange(r, 6).setFormula(`=IF(B${r}="","",IF(E${r}<=0,"Pago",IF(AND(D${r}<>"",D${r}<TODAY()),"Vencido Aberto","Aberto e Vigente")))`);
    sheet.getRange(r, 8).setValue(params.numeroNF);
    sheet.getRange(r, 9).setValue(params.valorNF);
    sheet.getRange(r, 10).setValue(params.dataNF);
    sheet.getRange(r, 11).setFormula(`=IF(J${r}="","",YEAR(J${r}))`);
    if (params.estornoValor > 0) sheet.getRange(r, 7).setValue(params.estornoValor);

    SpreadsheetApp.flush();
    return {success: true, row: r, sheet: sheet.getName()};
  } catch(e) {
    return {error: e.toString()};
  }
}

// ============================================================
// GRAVAR EMPENHO
// ============================================================
function gravarEmpenho(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = findSheet_(ss, params.gms, params.sheetTitle);
    if (!sheet) return {error: 'Aba não encontrada: ' + params.gms};

    const data = sheet.getDataRange().getValues();
    const nfStart = findNFStartRow_(data);
    if (nfStart < 0) return {error: 'Seção de execução não encontrada'};

    // Última linha com dados + 1
    let lastRow = nfStart;
    for (let i = data.length - 1; i >= nfStart; i--) {
      if (data[i].some(c => c !== '' && c !== null)) { lastRow = i + 1; break; }
    }
    const r = lastRow + 1;

    sheet.getRange(r, 1).setValue(params.unidade);
    sheet.getRange(r, 2).setValue(params.numero);
    sheet.getRange(r, 3).setValue(params.valor);
    if (params.vencimento) {
      const d = new Date(params.vencimento + 'T12:00:00');
      if (!isNaN(d)) sheet.getRange(r, 4).setValue(d);
    }
    sheet.getRange(r, 5).setFormula(`=IF(B${r}="","",C${r}-IFERROR(VALUE(I${r}),0)-IFERROR(VALUE(G${r}),0))`);
    sheet.getRange(r, 6).setFormula(`=IF(B${r}="","",IF(E${r}<=0,"Pago",IF(AND(D${r}<>"",D${r}<TODAY()),"Vencido Aberto","Aberto e Vigente")))`);
    sheet.getRange(r, 11).setFormula(`=IF(J${r}="","",YEAR(J${r}))`);

    SpreadsheetApp.flush();
    return {success: true, row: r, sheet: sheet.getName()};
  } catch(e) {
    return {error: e.toString()};
  }
}

// ============================================================
// HELPERS INTERNOS
// ============================================================
function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0].map(String);
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(c => c === '' || c === null || c === undefined)) continue;
    const obj = {};
    headers.forEach((h, j) => {
      let v = row[j];
      if (v instanceof Date) v = v.toISOString();
      obj[h] = (v === null || v === undefined) ? '' : v;
    });
    rows.push(obj);
  }
  return rows;
}

function readNFSheet_(sheet) {
  const data = sheet.getDataRange().getValues();
  const name = sheet.getName();
  const gms = data.length > 1 ? String(data[1][0] || '').trim() : '';
  const empresa = data.length > 1 ? String(data[1][2] || '').trim() : '';

  let headerIdx = -1;
  for (let i = 0; i < data.length; i++) {
    const a = String(data[i][0]||'').toLowerCase().trim();
    const b = String(data[i][1]||'').toLowerCase().trim();
    if (a === 'unidade' && (b.includes('empenho') || b.includes('valor') || b.includes('nf'))) {
      headerIdx = i; break;
    }
  }
  if (headerIdx < 0) return {gms, empresa, nfs: [], empenhos: []};

  const isNewLayout = String(data[headerIdx][1] || '').toLowerCase().includes('empenho');
  const nfs = [];
  const empenhos = [];
  const empSeen = new Set();

  for (let i = headerIdx + 1; i < data.length; i++) {
    const r = data[i];
    if (!r || r.every(c => c === '' || c === null)) continue;
    const unidade = String(r[0] || '').trim();
    if (!unidade) continue;

    if (isNewLayout) {
      const empNum = String(r[1] || '').trim();
      if (empNum && !empSeen.has(empNum)) {
        empSeen.add(empNum);
        const valorEmp = typeof r[2] === 'number' ? r[2] : parseFloat(String(r[2]||0).replace(',','.')) || 0;
        let vencStr = null;
        if (r[3] instanceof Date) vencStr = r[3].toISOString().split('T')[0];
        else if (r[3]) vencStr = String(r[3]);
        const saldoEmp = typeof r[4] === 'number' ? r[4] : parseFloat(String(r[4]||0).replace(',','.')) || 0;
        const statusEmp = String(r[5] || '');
        const extornado = typeof r[6] === 'number' && r[6] > 0;
        empenhos.push({
          contrato: gms, sheetName: name, empresa, unidade,
          numero: empNum, valor: valorEmp,
          valorPago: Math.max(0, valorEmp - saldoEmp),
          vencimento: vencStr, saldo: saldoEmp,
          status: statusEmp, extornado, rowIdx: i + 1
        });
      }
      const numeroNF = String(r[7] || '').trim();
      if (!numeroNF) continue;
      const valorNF = typeof r[8] === 'number' ? r[8] : parseFloat(String(r[8]||0).replace(',','.')) || 0;
      let dataStr = '';
      if (r[9] instanceof Date) dataStr = r[9].toLocaleDateString('pt-BR');
      else if (r[9]) dataStr = String(r[9]);
      let ano = null;
      if (typeof r[10] === 'number') ano = Math.round(r[10]);
      else if (r[9] instanceof Date) ano = r[9].getFullYear();
      nfs.push({unidade, valor: valorNF, numeroNF, data: dataStr, ano, empenho: empNum || null});
    } else {
      const valorNF = typeof r[1] === 'number' ? r[1] : parseFloat(String(r[1]||0).replace(',','.')) || 0;
      const numeroNF = String(r[2] || '').trim();
      let dataStr = '';
      if (r[3] instanceof Date) dataStr = r[3].toLocaleDateString('pt-BR');
      else if (r[3]) dataStr = String(r[3]);
      let ano = null;
      if (typeof r[4] === 'number') ano = Math.round(r[4]);
      else if (r[3] instanceof Date) ano = r[3].getFullYear();
      if (!valorNF && !numeroNF) continue;
      nfs.push({unidade, valor: valorNF, numeroNF, data: dataStr, ano, empenho: String(r[5]||'')||null});
    }
  }
  return {gms, empresa, nfs, empenhos};
}

function findSheet_(ss, gms, sheetTitle) {
  const sheets = ss.getSheets();
  if (sheetTitle) {
    const exact = sheets.find(s => s.getName() === sheetTitle);
    if (exact) return exact;
  }
  const gmsPure = String(gms).replace(/[\/\s]/g,'').toUpperCase();
  return sheets.find(s => {
    const n = s.getName().replace(/[\/\s]/g,'').toUpperCase();
    return n.includes(gmsPure) || gmsPure.includes(n);
  }) || null;
}

function findNFStartRow_(data) {
  for (let i = 0; i < data.length; i++) {
    const a = String(data[i][0]||'').toLowerCase().trim();
    const b = String(data[i][1]||'').toLowerCase().trim();
    if (a === 'unidade' && (b.includes('empenho') || b.includes('valor') || b.includes('nf'))) {
      return i + 1; // índice 0-based da primeira linha de dados
    }
  }
  return -1;
}

// ============================================================
// GRAVAR EXTORNO
// ============================================================
function gravarExtorno(params) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = findSheet_(ss, params.gms, params.sheetTitle);
    if (!sheet) return {error: 'Aba não encontrada: ' + params.gms};

    const data = sheet.getDataRange().getValues();
    const nfStart = findNFStartRow_(data);
    if (nfStart < 0) return {error: 'Seção de execução não encontrada na aba'};

    // Última linha com dados na coluna A
    let lastOccupied = nfStart - 1;
    for (let i = nfStart; i < data.length; i++) {
      if (data[i][0] !== '' && data[i][0] !== null) lastOccupied = i;
    }
    const r = lastOccupied + 2; // 1-based

    sheet.getRange(r, 1).setValue(params.unidade);
    sheet.getRange(r, 2).setValue(params.empenhoNumero);
    sheet.getRange(r, 7).setValue(params.valor);

    SpreadsheetApp.flush();
    return {success: true, row: r, sheet: sheet.getName()};
  } catch(e) {
    return {error: e.toString()};
  }
}
