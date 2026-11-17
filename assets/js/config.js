/*
  SPORTS SPHERE — site settings
  ---------------------------------------------------------------
  Where should the website read its events, stats, sponsors, news and results from?

  • Leave sheetId empty  → the site reads the files in the /content folder.
  • Paste a Google Sheet ID → the site reads that Google Sheet instead, live.
      The Sheet must be shared as "Anyone with the link can view" and have tabs named:
      events, stats, sponsors, news, results, settings
      (same columns as the files in /content). See content/HOW-TO-UPDATE.md.

  The Sheet ID is the long code in its URL:
  https://docs.google.com/spreadsheets/d/  THIS_PART  /edit
*/
window.SS_CONFIG = {
  sheetId: ""
};
