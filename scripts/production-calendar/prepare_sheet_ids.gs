/** @OnlyCurrentDoc */

// Bound staging preview. All outbound requests go to the fixed staging receiver.
// Set the Apps Script property WTF_TRACKER_SPREADSHEET_ID to the intended file ID first.
const PREVIEW_TABS = ['Production Tracker Podcast', 'WTF & Nikhil Kamath IPs', 'Calendar'];
const PREVIEW_URL = 'https://beta-staging.wtfhq.in/beta/api/production-sheet-preview';

function sheetColumn_(n) {
  let letters = '';
  while (n > 0) {
    n--;
    letters = String.fromCharCode(65 + n % 26) + letters;
    n = Math.floor(n / 26);
  }
  return letters;
}

// Sheets dates are serials in the spreadsheet's time zone. Use the same representation as D1.
function sheetScalar_(v, tz) {
  if (v instanceof Date) {
    const local = Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm:ss.SSS");
    return Date.parse(local + 'Z') / 86400000 + 25569;
  }
  return v === '' ? null : v;
}

function stagingSnapshot_(book) {
  const tabs = {};
  for (const name of PREVIEW_TABS) {
    const sheet = book.getSheetByName(name) || (name === 'Production Tracker Podcast' && book.getSheetByName('Production Tracker [Podcast]'));
    if (!sheet) throw new Error('Missing approved tab: ' + name);
    const range = sheet.getDataRange();
    const values = range.getValues(), formulas = range.getFormulas();
    const idIndex = values[0].indexOf('_wtf_row_id');

    const cells = {};
    values.forEach((row, ri) => row.forEach((v, ci) => {
      if (ci === idIndex) return;
      if ((v !== '' && v !== null) || formulas[ri][ci]) {
        cells[sheetColumn_(ci+1) + (ri+1)] = [sheetScalar_(v, book.getSpreadsheetTimeZone()), formulas[ri][ci] || ''];
      }
    }));
    tabs[name] = {cells};
  }
  return {version:1,sheetId:book.getId(),tabs};
}

function fetchStagingPreview_() {
  const token = PropertiesService.getScriptProperties().getProperty('WTF_STAGING_PREVIEW_TOKEN');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw Error('Set WTF_STAGING_PREVIEW_TOKEN in Script Properties.');
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (book.getId() !== PropertiesService.getScriptProperties().getProperty('WTF_TRACKER_SPREADSHEET_ID')) {
    throw Error('Check WTF_TRACKER_SPREADSHEET_ID in Script Properties.');
  }
  const snapshot = stagingSnapshot_(book);
  const response = UrlFetchApp.fetch(PREVIEW_URL, {
    method:'post', contentType:'application/json', headers:{Authorization:'Bearer '+token},
    payload:JSON.stringify(snapshot), followRedirects:false, muteHttpExceptions:true
  });
  if (response.getResponseCode() !== 200) throw Error('Staging preview failed (HTTP '+response.getResponseCode()+').');
  const result = JSON.parse(response.getContentText());
  if (result.mode !== 'preview' || result.sheets.length !== PREVIEW_TABS.length) throw Error('Unexpected staging response.');
  return result;
}

// Run this from the editor or from the menu in the bound spreadsheet.
function previewProductionStaging() {
  const result = fetchStagingPreview_();
  const lines = [];
  for (const s of result.sheets) {
    lines.push(s.tab);
    for (const kind of ['added','changed','removed']) {
      lines.push(kind+' cells ('+s.delta[kind].length+'): '+s.delta[kind].join(', '));
    }
    for (const r of s.review) lines.push(r.stagingSource+' → '+(r.candidate || 'Review match'));
    lines.push('');
  }
  const safe = lines.join('\n').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  SpreadsheetApp.getUi().showModalDialog(HtmlService.createHtmlOutput('<pre style="white-space:pre-wrap">'+safe+'</pre>')
    .setWidth(660).setHeight(460),'Staging preview · no Production records changed');
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('WTF Production').addItem('Preview staging changes','previewProductionStaging').addToUi();
}

// For an optional later schedule, select this function in the Apps Script Triggers UI.
function scheduledStagingPreview() {
  const result = fetchStagingPreview_();
  const summary = result.sheets.map(s => ({
    tab:s.tab,added:s.delta.added.length,changed:s.delta.changed.length,removed:s.delta.removed.length
  }));
  console.log(JSON.stringify({mode:'preview',sheets:summary}));
}
