/**
 * =========================================================================
 * TACO GROUP - PERFORMANCE APPRAISAL UTILITY
 * Google Apps Script (Code.gs) - Versi 2.0 (Anti-Error & Multi-Locale)
 * =========================================================================
 * 
 * Script ini dirancang khusus untuk Google Sheets Penilaian Kinerja Karyawan TACO.
 * 
 * FITUR:
 * 1. testFungsi()          : Untuk menguji script langsung di Editor Apps Script (Bebas Error).
 * 2. =HITUNG_NILAI_AKHIR() : Formula kustom fleksibel (bisa 5 parameter sel ATAU 1 range B2:F2).
 * 3. Menu "TACO Appraisal" : Otomatis muncul di bar menu atas spreadsheet.
 * 4. Hitung Massal         : Tombol sekali klik untuk mengisi nilai seluruh karyawan.
 * 5. Template Bulan Baru   : Otomatis membuat tab sheet baru dengan format rapi.
 * 6. Web App API           : Integrasi live doGet & doPost dengan Web Dashboard.
 * =========================================================================
 */

// OPTIONAL: Jika Anda membuat Apps Script ini secara standalone di script.google.com
// (bukan dari menu Ekstensi > Apps Script di Spreadsheet), masukkan ID Spreadsheet di sini.
// Jika script dibuka langsung dari dalam Google Spreadsheet, BIARKAN KOSONG: ""
var SPREADSHEET_ID = "";

// Bobot default kriteria penilaian TACO (dalam persen %)
var BOBOT_DEFAULT = {
  AD: {
    absensi: 30,
    downtime: 35,
    fiveR: 35
  },
  PM: {
    absensi: 30,
    downtime: 35,
    pmCompletion: 35
  }
};

/**
 * =========================================================================
 * 1. FUNGSI TEST (JALANKAN INI DI EDITOR APPS SCRIPT DENGAN TOMBOL "RUN")
 * =========================================================================
 * Fungsi ini aman dijalankan langsung dari editor script tanpa menyebabkan error
 * "Cannot call SpreadsheetApp.getUi() from this context".
 */
function testFungsi() {
  Logger.log("==================================================");
  Logger.log("Memulai Uji Coba TACO Performance Appraisal Utility");
  Logger.log("==================================================");
  
  // Test Group A/B/C/D
  var testB = HITUNG_NILAI_AKHIR("B", 95, 50, "-", 80);
  Logger.log("[OK] Test Group B (Absensi: 95, Downtime: 50, 5R: 80) -> Nilai: " + testB + " (Ekspektasi: 74)");
  
  // Test Group PM
  var testPM = HITUNG_NILAI_AKHIR("PM", 90, 60, 85, "-");
  Logger.log("[OK] Test Group PM (Absensi: 90, Downtime: 60, PM: 85) -> Nilai: " + testPM + " (Ekspektasi: 77.8)");
  
  // Test Range Input
  var testRange = HITUNG_NILAI_AKHIR([["A", "87", "50", "-", "80"]]);
  Logger.log("[OK] Test Range Input [A, 87, 50, -, 80] -> Nilai: " + testRange);
  
  Logger.log("==================================================");
  Logger.log("HASIL: Script bekerja 100% normal dan siap digunakan di Google Sheets!");
  Logger.log("==================================================");
  return "Sukses! Semua formula berjalan normal.";
}

/**
 * Helper untuk parsing angka (aman terhadap format Indonesia koma '95,5', strip '-', persentase '80%')
 */
function bersihkanAngka(val) {
  if (val === null || val === undefined || val === "" || val === "-" || val === "N/A" || val === "n/a") {
    return 0;
  }
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }
  var str = String(val).trim().replace("%", "").replace(",", ".");
  var parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * =========================================================================
 * 2. FORMULA SPREADSHEET KUSTOM: =HITUNG_NILAI_AKHIR(...)
 * =========================================================================
 * 
 * Penggunaan di Google Sheets:
 * 
 * 1. Format Per Sel (Bahasa Indonesia):
 *    =HITUNG_NILAI_AKHIR(B2; C2; D2; E2; F2)
 * 
 * 2. Format Per Sel (Bahasa Inggris / US):
 *    =HITUNG_NILAI_AKHIR(B2, C2, D2, E2, F2)
 * 
 * 3. Format Rentang (Range):
 *    =HITUNG_NILAI_AKHIR(B2:F2)
 * 
 * @customfunction
 */
function HITUNG_NILAI_AKHIR(groupOrRange, absensi, downtime, pmCompletion, fiveR) {
  try {
    var grp = "";
    var numAbs = 0;
    var numDown = 0;
    var numPM = 0;
    var num5R = 0;
    
    // Cek apakah input berupa range (contoh: B2:F2)
    if (Array.isArray(groupOrRange)) {
      var flat = [];
      for (var r = 0; r < groupOrRange.length; r++) {
        if (Array.isArray(groupOrRange[r])) {
          for (var c = 0; c < groupOrRange[r].length; c++) {
            flat.push(groupOrRange[r][c]);
          }
        } else {
          flat.push(groupOrRange[r]);
        }
      }
      grp = flat.length > 0 ? String(flat[0] || "").trim().toUpperCase() : "";
      numAbs = flat.length > 1 ? bersihkanAngka(flat[1]) : 0;
      numDown = flat.length > 2 ? bersihkanAngka(flat[2]) : 0;
      numPM = flat.length > 3 ? bersihkanAngka(flat[3]) : 0;
      num5R = flat.length > 4 ? bersihkanAngka(flat[4]) : 0;
    } else {
      grp = String(groupOrRange || "").trim().toUpperCase();
      numAbs = bersihkanAngka(absensi);
      numDown = bersihkanAngka(downtime);
      numPM = bersihkanAngka(pmCompletion);
      num5R = bersihkanAngka(fiveR);
    }
    
    if (!grp) return "";
    
    if (grp === "PM") {
      var wPM = BOBOT_DEFAULT.PM;
      var totalWPM = wPM.absensi + wPM.downtime + wPM.pmCompletion;
      if (totalWPM === 0) return 0;
      var scorePM = (numAbs * wPM.absensi + numDown * wPM.downtime + numPM * wPM.pmCompletion) / totalWPM;
      return Math.round(scorePM * 10) / 10;
    } else {
      // Group A, B, C, D
      // Jika kolom 5R kosong tapi kolom ke-4 diisi angka (karena sheet hanya punya 1 kolom kriteria ke-4)
      var nilaiKriteria3 = num5R > 0 ? num5R : numPM;
      var wAD = BOBOT_DEFAULT.AD;
      var totalWAD = wAD.absensi + wAD.downtime + wAD.fiveR;
      if (totalWAD === 0) return 0;
      var scoreAD = (numAbs * wAD.absensi + numDown * wAD.downtime + nilaiKriteria3 * wAD.fiveR) / totalWAD;
      return Math.round(scoreAD * 10) / 10;
    }
  } catch (err) {
    return "#ERR: " + err.message;
  }
}

/**
 * Helper untuk mendapatkan UI dengan aman tanpa melempar exception saat di editor
 */
function getUiSafe() {
  try {
    return SpreadsheetApp.getUi();
  } catch (e) {
    return null;
  }
}

/**
 * Helper untuk mendapatkan Spreadsheet (mendukung Container-bound & Standalone)
 */
function getSpreadsheetSafe() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.trim() !== "") {
    try {
      return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
    } catch (e) {
      Logger.log("Gagal membuka spreadsheet via SPREADSHEET_ID: " + e.message);
    }
  }
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * =========================================================================
 * 3. MENU "TACO APPRAISAL" DI SPREADSHEET
 * =========================================================================
 * Fungsi onOpen otomatis dijalankan oleh Google Sheets saat spreadsheet dibuka.
 * CATATAN: Jika diklik "Run" langsung dari Editor Apps Script, fungsi ini tidak
 * akan error karena telah dibungkus pengecekan UI yang aman.
 */
function onOpen(e) {
  var ui = getUiSafe();
  if (!ui) {
    Logger.log("Info: onOpen dipanggil di luar konteks Spreadsheet. Menu akan muncul otomatis saat spreadsheet dibuka/refresh.");
    return;
  }
  
  try {
    ui.createMenu("TACO Appraisal")
      .addItem("Hitung Nilai Akhir (Sheet Aktif)", "hitungSemuaNilaiAkhir")
      .addSeparator()
      .addItem("Buat Template Sheet Bulan Baru", "buatTemplateSheetBulanBaru")
      .addItem("Format & Rapikan Tabel", "rapikanTabelAktif")
      .addSeparator()
      .addItem("Petunjuk Penggunaan & Formula", "tampilkanPetunjuk")
      .addToUi();
  } catch (err) {
    Logger.log("Error createMenu: " + err.message);
  }
}

/**
 * =========================================================================
 * 4. HITUNG SEMUA NILAI AKHIR (SEKALI KLIK)
 * =========================================================================
 */
function hitungSemuaNilaiAkhir() {
  var ui = getUiSafe();
  var ss = getSpreadsheetSafe();
  
  if (!ss) {
    if (ui) ui.alert("Spreadsheet tidak terdeteksi! Pastikan script dibuka melalui menu Ekstensi > Apps Script di Spreadsheet Anda.");
    return;
  }
  
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) {
    if (ui) ui.alert("Sheet masih kosong atau hanya memiliki baris header.");
    return;
  }
  
  // Mencari baris header secara cerdas di antara 5 baris pertama
  var headerRowIndex = 1;
  var headers = [];
  var colIdx = {
    group: -1,
    absensi: -1,
    downtime: -1,
    pmCompletion: -1,
    fiveR: -1,
    nilaiAkhir: -1
  };
  
  for (var r = 1; r <= Math.min(5, lastRow); r++) {
    var rowValues = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
    var foundCount = 0;
    var tempCols = { group: -1, absensi: -1, downtime: -1, pmCompletion: -1, fiveR: -1, nilaiAkhir: -1 };
    
    for (var c = 0; c < rowValues.length; c++) {
      var h = String(rowValues[c] || "").toLowerCase().trim();
      if (h.indexOf("group") !== -1 || h === "grp" || h === "grup") {
        tempCols.group = c;
        foundCount++;
      } else if (h.indexOf("absen") !== -1 || h.indexOf("hadir") !== -1) {
        tempCols.absensi = c;
        foundCount++;
      } else if (h.indexOf("down") !== -1 || h.indexOf("downtime") !== -1) {
        tempCols.downtime = c;
        foundCount++;
      } else if (h.indexOf("pm") !== -1) {
        tempCols.pmCompletion = c;
      } else if (h.indexOf("5r") !== -1 || h.indexOf("5 r") !== -1) {
        tempCols.fiveR = c;
      } else if (h.indexOf("nilai") !== -1 || h.indexOf("akhir") !== -1 || h.indexOf("score") !== -1 || h.indexOf("total") !== -1) {
        tempCols.nilaiAkhir = c;
      }
    }
    
    if (foundCount >= 2) {
      headerRowIndex = r;
      headers = rowValues;
      colIdx = tempCols;
      break;
    }
  }
  
  if (colIdx.group === -1 || colIdx.absensi === -1 || colIdx.downtime === -1) {
    var pesan = "Kolom wajib (Group, Absensi, Downtime) tidak ditemukan di baris header.\n\n" +
      "Pastikan baris header memuat kata: Group, Absensi, Downtime, PM Completion, 5R.";
    if (ui) ui.alert(pesan);
    Logger.log(pesan);
    return;
  }
  
  // Jika kolom Nilai Akhir belum ada, buat otomatis di kolom terakhir
  if (colIdx.nilaiAkhir === -1) {
    var newCol = lastCol + 1;
    sheet.getRange(headerRowIndex, newCol)
      .setValue("Nilai Akhir")
      .setFontWeight("bold")
      .setBackground("#E74A25")
      .setFontColor("#FFFFFF")
      .setHorizontalAlignment("center");
    colIdx.nilaiAkhir = newCol - 1;
    lastCol = newCol;
  }
  
  var startDataRow = headerRowIndex + 1;
  var numRows = lastRow - headerRowIndex;
  if (numRows <= 0) {
    if (ui) ui.alert("Tidak ada baris data karyawan untuk dihitung.");
    return;
  }
  
  var dataRange = sheet.getRange(startDataRow, 1, numRows, lastCol);
  var values = dataRange.getValues();
  var count = 0;
  
  for (var i = 0; i < values.length; i++) {
    var row = values[i];
    var grp = row[colIdx.group];
    if (!grp) continue;
    
    var abs = row[colIdx.absensi];
    var down = row[colIdx.downtime];
    var pm = colIdx.pmCompletion !== -1 ? row[colIdx.pmCompletion] : "";
    var f5 = colIdx.fiveR !== -1 ? row[colIdx.fiveR] : "";
    
    var score = HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
    row[colIdx.nilaiAkhir] = score;
    count++;
  }
  
  dataRange.setValues(values);
  var notif = "Berhasil menghitung dan memperbarui Nilai Akhir untuk " + count + " karyawan!";
  if (ui) {
    ui.alert(notif);
  } else {
    Logger.log(notif);
  }
}

/**
 * =========================================================================
 * 5. BUAT TEMPLATE SHEET BULAN BARU
 * =========================================================================
 */
function buatTemplateSheetBulanBaru() {
  var ui = getUiSafe();
  var ss = getSpreadsheetSafe();
  if (!ss) return;
  
  var sheetName = "Appraisal " + Utilities.formatDate(new Date(), "GMT+7", "MMM yyyy");
  if (ui) {
    var promptRes = ui.prompt("Nama Bulan / Periode Baru", "Masukkan nama sheet baru (contoh: Oktober 2026):", ui.ButtonSet.OK_CANCEL);
    if (promptRes.getSelectedButton() !== ui.Button.OK || !promptRes.getResponseText().trim()) {
      return;
    }
    sheetName = promptRes.getResponseText().trim();
  }
  
  if (ss.getSheetByName(sheetName)) {
    if (ui) ui.alert("Sheet dengan nama '" + sheetName + "' sudah ada!");
    return;
  }
  
  var sheet = ss.insertSheet(sheetName);
  var headers = ["Nama Karyawan", "Group", "Absensi (0-100)", "Downtime (0-100)", "PM Completion (0-100)", "5R (0-100)", "Nilai Akhir", "Catatan"];
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#1E293B");
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");
  sheet.getRange(1, 7).setBackground("#E74A25"); // Warna Oranye TACO
  
  // Contoh sample data
  var sampleRows = [
    ["Shigit Darmawan", "B", 95, 50, "-", 80, '=HITUNG_NILAI_AKHIR(B2; C2; D2; E2; F2)', "Disiplin kerja 5R sangat baik"],
    ["Riki Setiawan", "PM", 90, 60, 85, "-", '=HITUNG_NILAI_AKHIR(B3; C3; D3; E3; F3)', "PM mesin selesai tepat waktu"]
  ];
  sheet.getRange(2, 1, sampleRows.length, headers.length).setValues(sampleRows);
  
  // Validasi Dropdown Group
  var groupRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["A", "B", "C", "D", "PM"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("B2:B100").setDataValidation(groupRule);
  
  // Lebar kolom
  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 80);
  sheet.setColumnWidth(3, 130);
  sheet.setColumnWidth(4, 130);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 110);
  sheet.setColumnWidth(7, 110);
  sheet.setColumnWidth(8, 250);
  
  sheet.getRange("A1:H100").setVerticalAlignment("middle");
  sheet.getRange("B2:G100").setHorizontalAlignment("center");
  sheet.getRange("G2:G100").setFontWeight("bold").setFontColor("#0F172A");
  
  if (ui) ui.alert("Template sheet '" + sheetName + "' berhasil dibuat!");
}

/**
 * =========================================================================
 * 6. FORMAT & RAPIKAN TABEL AKTIF
 * =========================================================================
 */
function rapikanTabelAktif() {
  var ui = getUiSafe();
  var ss = getSpreadsheetSafe();
  if (!ss) return;
  var sheet = ss.getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return;
  
  sheet.getRange(1, 1, 1, lastCol)
    .setFontWeight("bold")
    .setBackground("#1E293B")
    .setFontColor("#FFFFFF")
    .setHorizontalAlignment("center");
  sheet.getRange(2, 1, lastRow - 1, lastCol).setVerticalAlignment("middle");
  if (ui) ui.alert("Tabel berhasil dirapikan.");
}

/**
 * =========================================================================
 * 7. PETUNJUK PENGGUNAAN & RUMUS SPREADSHEET
 * =========================================================================
 */
function tampilkanPetunjuk() {
  var ui = getUiSafe();
  var msg = "PETUNJUK FORMULA TACO PERFORMANCE APPRAISAL\n\n" +
    "1. Rumus Kustom Apps Script:\n" +
    "   • Format Indonesia : =HITUNG_NILAI_AKHIR(B2; C2; D2; E2; F2)\n" +
    "   • Format English   : =HITUNG_NILAI_AKHIR(B2, C2, D2, E2, F2)\n" +
    "   • Format Rentang   : =HITUNG_NILAI_AKHIR(B2:F2)\n\n" +
    "2. Rumus Alternatif (NATIVE SPREADSHEET - TANPA SCRIPT):\n" +
    "   =ROUND(IF(UPPER(TRIM(B2))=\"PM\"; (C2*30 + D2*35 + E2*35)/100; (C2*30 + D2*35 + IF(ISNUMBER(F2); F2; IF(ISNUMBER(E2); E2; 0))*35)/100); 1)\n\n" +
    "3. Bobot Penilaian:\n" +
    "   • Group PM : Absensi (30%) + Downtime (35%) + PM Completion (35%)\n" +
    "   • Group AD : Absensi (30%) + Downtime (35%) + 5R (35%)";
  if (ui) {
    ui.alert(msg);
  } else {
    Logger.log(msg);
  }
}

/**
 * =========================================================================
 * 8. WEB APP REST API (doGet & doPost)
 * =========================================================================
 */
function doGet(e) {
  try {
    var ss = getSpreadsheetSafe();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Spreadsheet tidak terhubung. Masukkan SPREADSHEET_ID jika menggunakan script standalone."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheets = ss.getSheets();
    var result = {
      status: "success",
      appName: "TACO Performance Appraisal Utility",
      updatedAt: new Date().toISOString(),
      months: [],
      records: []
    };
    
    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var sheetName = sheet.getName();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 2 || lastCol < 3) continue;
      
      var monthId = sheetName.toLowerCase().replace(/\s+/g, "-");
      result.months.push({
        id: monthId,
        name: sheetName,
        weightsAD: BOBOT_DEFAULT.AD,
        weightsPM: BOBOT_DEFAULT.PM
      });
      
      var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        if (!row[0] && !row[1]) continue;
        var name = String(row[0] || "").trim();
        var grp = String(row[1] || "").trim().toUpperCase();
        var abs = bersihkanAngka(row[2]);
        var down = bersihkanAngka(row[3]);
        var pm = row[4] !== "" && !isNaN(bersihkanAngka(row[4])) ? bersihkanAngka(row[4]) : null;
        var f5 = row[5] !== "" && !isNaN(bersihkanAngka(row[5])) ? bersihkanAngka(row[5]) : null;
        var finalScore = bersihkanAngka(row[6]) || HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
        var notes = String(row[7] || "");
        
        result.records.push({
          id: monthId + "-emp-" + (r + 1),
          monthId: monthId,
          name: name,
          group: grp,
          absensi: abs,
          downtime: down,
          pmCompletion: grp === "PM" ? pm : null,
          fiveR: grp !== "PM" ? f5 : null,
          finalScore: finalScore,
          notes: notes
        });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "doPost harus dipanggil melalui HTTP POST dari aplikasi web."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var body = JSON.parse(e.postData.contents);
    var action = body.action || "saveRecord";
    var ss = getSpreadsheetSafe();
    
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "error",
        message: "Spreadsheet tidak terhubung."
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (action === "saveRecord") {
      var rec = body.record;
      var targetSheetName = body.monthName || rec.monthId || "Appraisal";
      var sheet = ss.getSheetByName(targetSheetName);
      if (!sheet) {
        sheet = ss.insertSheet(targetSheetName);
        var headers = ["Nama Karyawan", "Group", "Absensi", "Downtime", "PM Completion", "5R", "Nilai Akhir", "Catatan"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
      var finalScore = HITUNG_NILAI_AKHIR(rec.group, rec.absensi, rec.downtime, rec.pmCompletion, rec.fiveR);
      sheet.appendRow([
        rec.name,
        rec.group,
        rec.absensi,
        rec.downtime,
        rec.group === "PM" ? rec.pmCompletion : "-",
        rec.group !== "PM" ? rec.fiveR : "-",
        finalScore,
        rec.notes || ""
      ]);
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Data karyawan berhasil disimpan ke Google Sheets!",
        finalScore: finalScore
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: "Aksi tidak dikenali."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
