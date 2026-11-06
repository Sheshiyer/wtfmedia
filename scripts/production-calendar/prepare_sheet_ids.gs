/** @OnlyCurrentDoc */

// Bound staging preview. All outbound requests go to the fixed staging receiver.
// Set the Apps Script property WTF_TRACKER_SPREADSHEET_ID to the intended file ID first.
function prepareProductionPreviewIds() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  if (book.getId() !== PropertiesService.getScriptProperties().getProperty('WTF_TRACKER_SPREADSHEET_ID')) {
    throw new Error('Set WTF_TRACKER_SPREADSHEET_ID to the intended spreadsheet before running.');
  }
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    const configs = [
      {name: 'Production Tracker Podcast', headers: ['Status', 'Thought Leaders', 'Role', 'Ep Name'], key: [1, 3]},
      {name: 'WTF & Nikhil Kamath IPs', headers: ['IP', 'Episode No', 'Episode Name', 'Release Date'], key: [2, 3]},
      {name: 'Dubbing Tracker', headers: ['Episode Name', 'Original Video Date', 'Dub Episode Schedule', 'Guest'], key: [0, 3]}
    ];
    const seen = new Set();
    const plans = configs.map(config => {
      const sheet = book.getSheetByName(config.name);
      if (!sheet) throw new Error('Missing approved tab: ' + config.name);
      const grid = sheet.getDataRange().getValues();
      const header = grid[0].map(value => String(value).trim());
      if (!config.headers.every((v, i) => v === header[i])) throw new Error('Check headers on ' + config.name);
      const idHeader = '_wtf_row_id';
      const index = header.indexOf(idHeader);
      if (index !== header.lastIndexOf(idHeader)) throw new Error('Duplicate ID column on ' + config.name);
      const pending = [];
      const formulas = index < 0 ? [] : sheet.getRange(1, index+1, grid.length, 1).getFormulas();
      grid.slice(1).forEach((row, offset) => {
        if (index >= 0 && formulas[offset+1][0]) throw new Error('ID must be stored as text');
        const id = index < 0 ? '' : String(row[index]);
        if (id) {
          if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id) || seen.has(id.toLowerCase())) {
            throw new Error('Invalid or duplicate ID on ' + config.name + ' row ' + (offset+2));
          }
          seen.add(id.toLowerCase());
        } else if (config.key.some(i => row[i] !== '' && row[i] != null)) {
          if (config.name === 'Dubbing Tracker' && /^(solos|panels)$/i.test(String(row[0]).trim()) &&
              row.slice(1, 8).every(v => v === '' || v == null)) return;
          // IDs label source rows, including panel guest rows. They do not imply an episode.
          pending.push(offset+2);
        }
      });
      return {sheet, pending, col: (index < 0 ? header.length : index)+1, create: index < 0};
    });
    for (const plan of plans) {
      if (plan.create) {
        if (plan.col > plan.sheet.getMaxColumns()) plan.sheet.insertColumnAfter(plan.sheet.getMaxColumns());
        plan.sheet.getRange(1, plan.col).setValue('_wtf_row_id');
      }
      for (const row of plan.pending) plan.sheet.getRange(row, plan.col).setValue(Utilities.getUuid());
      plan.sheet.hideColumns(plan.col);
    }
    SpreadsheetApp.flush();
    return plans.map(plan => ({tab: plan.sheet.getName(), assigned: plan.pending.length}));
  } finally {
    lock.releaseLock();
  }
}

const PREVIEW_TABS = ['Production Tracker Podcast', 'WTF & Nikhil Kamath IPs', 'Calendar', 'Dubbing Tracker'];
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
    const sheet = book.getSheetByName(name);
    if (!sheet) throw new Error('Missing approved tab: ' + name);
    const range = sheet.getDataRange();
    const values = range.getValues(), formulas = range.getFormulas();
    const idIndex = values[0].indexOf('_wtf_row_id');
    if (name !== 'Calendar' && idIndex < 0) throw new Error('Missing IDs: ' + name);
    const cells = {}, ids = {};
    values.forEach((row, ri) => row.forEach((v, ci) => {
      if (ci === idIndex) {
        if (ri && v !== '') ids[String(ri + 1)] = v;
      } else if (v !== '' && v !== null || formulas[ri][ci]) {
        cells[sheetColumn_(ci+1) + (ri+1)] = [sheetScalar_(v, book.getSpreadsheetTimeZone()), formulas[ri][ci] || ''];
      }
    }));
    tabs[name] = {cells,ids};
  }
  return {version:1,sheetId:book.getId(),tabs};
}

function fetchStagingPreview_() {
  const token = PropertiesService.getScriptProperties().getProperty('WTF_STAGING_PREVIEW_TOKEN');
  if (!token || !/^[a-f0-9]{64}$/.test(token)) throw Error('Set WTF_STAGING_PREVIEW_TOKEN in Script Properties.');
  prepareProductionPreviewIds();
  const snapshot = stagingSnapshot_(SpreadsheetApp.getActiveSpreadsheet());
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
    lines.push(s.tab, 'Source rows with IDs: '+s.sourceRowsWithIds);
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

// Optional preview-only schedule. Run manually after checking the first preview.
function enableStagingPreviewSchedule() {
  fetchStagingPreview_();
  const exists = ScriptApp.getProjectTriggers().some(t => t.getHandlerFunction() === 'scheduledStagingPreview');
  if (!exists) ScriptApp.newTrigger('scheduledStagingPreview').timeBased().everyMinutes(5).create();
}

function scheduledStagingPreview() {
  const result = fetchStagingPreview_();
  const summary = result.sheets.map(s => ({
    tab:s.tab,added:s.delta.added.length,changed:s.delta.changed.length,removed:s.delta.removed.length
  }));
  console.log(JSON.stringify({mode:'preview',sheets:summary}));
}
