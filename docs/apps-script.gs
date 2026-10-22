// Google Apps Script for the KŮA Listening Lab sheet.
// Paste into the existing project bound to the sheet, replacing doPost, then redeploy
// the web app (Deploy → Manage deployments → Edit → New version) so the URL stays the same.

const AB_COLUMNS = [
  'timestamp', 'listenerName', 'collection', 'songId', 'songTitle',
  'choseVersion', 'shownAs', 'secondsA', 'secondsB', 'switches', 'revote', 'note'
];

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  if (data.type === 'abvote') {
    const sheet = ss.getSheetByName('ABnoCD') || ss.insertSheet('ABnoCD');
    if (sheet.getLastRow() === 0) sheet.appendRow(AB_COLUMNS);
    sheet.appendRow(AB_COLUMNS.map((c) => data[c] ?? ''));
  } else {
    // Legacy 1–5 rating rows from the previous Listening Lab.
    ss.getSheets()[0].appendRow([
      data.timestamp, data.listenerName, data.songNumber, data.authentic, data.production,
      data.emotional, data.replay, data.commercial, data.average, data.comments
    ]);
  }

  return ContentService.createTextOutput('ok');
}
