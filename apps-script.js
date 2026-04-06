// ─────────────────────────────────────────────────────────────────────────────
// MediPlex — Google Apps Script
// Paste this entire file into:
//   Google Sheet → Extensions → Apps Script → replace everything → Save
// Then: Deploy → New Deployment → Web App
//   Execute as: Me
//   Who has access: Anyone
// Copy the Web App URL → add to Vercel env as APPS_SCRIPT_URL
// ─────────────────────────────────────────────────────────────────────────────

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');

    // rowIndex from client is 1-based data index
    // Sheet row = rowIndex + 1  (because row 1 is the header)
    var sheetRow = parseInt(data.rowIndex) + 1;

    // ── Column positions (1-based) ──────────────────────────────────────────
    // Make sure your sheet header row has these column names.
    // If your columns are in a different order, update the numbers below.
    //
    // Current expected column order (add these to your sheet if missing):
    //  A  Timestamp
    //  B  Child Name
    //  C  Parent Name
    //  D  Child Age
    //  E  WhatsApp
    //  F  Email
    //  G  Appointment Date
    //  H  Appointment Time
    //  I  Reason
    //  J  Visit Type
    //  K  Status
    //  L  Calendar Event ID
    //  M  Reminder 24h Sent
    //  N  Reminder 4h Sent
    //  O  Follow Up Visit
    //  P  Rescheduling Reason
    //  Q  Original Date
    //  R  attendanceStatus   ← ADD THIS
    //  S  checkInTime        ← ADD THIS
    //  T  inClinicTime       ← ADD THIS

    var COL_ATTENDANCE  = 18; // R
    var COL_CHECKIN     = 19; // S
    var COL_INCLINIC    = 20; // T

    // Write attendance status
    sheet.getRange(sheetRow, COL_ATTENDANCE).setValue(data.attendanceStatus || '');

    // Write check-in time only if provided and not already set
    if (data.checkInTime) {
      var existingCheckIn = sheet.getRange(sheetRow, COL_CHECKIN).getValue();
      if (!existingCheckIn) {
        sheet.getRange(sheetRow, COL_CHECKIN).setValue(data.checkInTime);
      }
    }

    // Write in-clinic time (always update when In Clinic is selected)
    if (data.inClinicTime) {
      sheet.getRange(sheetRow, COL_INCLINIC).setValue(data.inClinicTime);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Test function — run this manually in Apps Script to verify it works
function testWrite() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1');
  sheet.getRange(2, 18).setValue('Test OK');
  Logger.log('Write test successful');
}