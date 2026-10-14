/**
 * =========================================================================
 * TACO GROUP - PERFORMANCE APPRAISAL UTILITY
 * Google Apps Script (Code.gs)
 * =========================================================================
 * Script ini digunakan untuk Google Spreadsheet penilaian kinerja karyawan TACO:
 * 1. Custom Formula Spreadsheet: =HITUNG_NILAI_AKHIR(...)
 * 2. Menu Otomatis di Google Sheets: "TACO Appraisal"
 * 3. Pembuatan Template Sheet Baru Otomatis dengan Formula & Validasi
 * 4. Web App API (doGet & doPost) untuk integrasi dengan Web Dashboard
 * =========================================================================
 */

// Default bobot kriteria penilaian (dalam persen %)
const DEFAULT_WEIGHTS = {
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
 * Custom Function: Menghitung Nilai Akhir Karyawan TACO secara otomatis.
 *
 * Contoh penggunaan di sel Google Sheets:
 * =HITUNG_NILAI_AKHIR(B2, C2, D2, E2, F2)
 *
 * @param {string} group Group karyawan: "PM" atau "A", "B", "C", "D"
 * @param {number} absensi Nilai absensi (0 - 100)
 * @param {number} downtime Nilai downtime (0 - 100)
 * @param {number} pmCompletion Nilai PM Completion (khusus Group PM)
 * @param {number} fiveR Nilai 5R (khusus Group A, B, C, D)
 * @return {number} Nilai akhir terbobot (0 - 100) dibulatkan 1 desimal.
 * @customfunction
 */
function HITUNG_NILAI_AKHIR(group, absensi, downtime, pmCompletion, fiveR) {
  if (!group) return "";
  
  var grp = String(group).trim().toUpperCase();
  var numAbs = parseFloat(absensi) || 0;
  var numDown = parseFloat(downtime) || 0;
  
  if (grp === "PM") {
    var numPM = parseFloat(pmCompletion) || 0;
    var wPM = DEFAULT_WEIGHTS.PM;
    var totalW = wPM.absensi + wPM.downtime + wPM.pmCompletion;
    if (totalW === 0) return 0;
    var score = (numAbs * wPM.absensi + numDown * wPM.downtime + numPM * wPM.pmCompletion) / totalW;
    return Math.round(score * 10) / 10;
  } else {
    // Group A, B, C, D
    var num5R = parseFloat(fiveR) || (pmCompletion !== "" && !isNaN(pmCompletion) ? parseFloat(pmCompletion) : 0);
    var wAD = DEFAULT_WEIGHTS.AD;
    var totalW = wAD.absensi + wAD.downtime + wAD.fiveR;
    if (totalW === 0) return 0;
    var score = (numAbs * wAD.absensi + numDown * wAD.downtime + num5R * wAD.fiveR) / totalW;
    return Math.round(score * 10) / 10;
  }
}

/**
 * Event onOpen: Menambahkan Menu Khusus "TACO Appraisal" ke toolbar Google Sheets
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("TACO Appraisal")
    .addItem("Hitung Nilai Akhir (Sheet Aktif)", "hitungSemuaNilaiAkhir")
    .addSeparator()
    .addItem("Buat Template Sheet Bulan Baru", "buatTemplateSheetBulanBaru")
    .addItem("Format & Rapikan Tabel", "rapikanTabelAktif")
    .addSeparator()
    .addItem("Petunjuk Penggunaan & Formula", "tampilkanPetunjuk")
    .addToUi();
}

/**
 * Menghitung dan mengisi kolom Nilai Akhir di seluruh baris sheet aktif
 */
function hitungSemuaNilaiAkhir() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert("Sheet masih kosong atau hanya memiliki baris header.");
    return;
  }

  // Cari index kolom berdasarkan baris header (baris 1)
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var colIdx = {
    group: -1,
    absensi: -1,
    downtime: -1,
    pmCompletion: -1,
    fiveR: -1,
    nilaiAkhir: -1
  };

  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).toLowerCase().trim();
    if (h.indexOf("group") !== -1) colIdx.group = i;
    else if (h.indexOf("absen") !== -1) colIdx.absensi = i;
    else if (h.indexOf("downtime") !== -1) colIdx.downtime = i;
    else if (h.indexOf("pm") !== -1 && h.indexOf("comp") !== -1) colIdx.pmCompletion = i;
    else if (h.indexOf("5r") !== -1) colIdx.fiveR = i;
    else if (h.indexOf("nilai") !== -1 || h.indexOf("akhir") !== -1 || h.indexOf("score") !== -1) colIdx.nilaiAkhir = i;
  }

  if (colIdx.group === -1 || colIdx.absensi === -1 || colIdx.downtime === -1) {
    SpreadsheetApp.getUi().alert("Kolom wajib (Group, Absensi, Downtime) tidak ditemukan pada baris header.");
    return;
  }

  // Jika kolom Nilai Akhir belum ada, buat di kolom terakhir
  if (colIdx.nilaiAkhir === -1) {
    var newCol = sheet.getLastColumn() + 1;
    sheet.getRange(1, newCol).setValue("Nilai Akhir").setFontWeight("bold").setBackground("#E74A25").setFontColor("#FFFFFF");
    colIdx.nilaiAkhir = newCol - 1;
  }

  var dataRange = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn());
  var values = dataRange.getValues();

  for (var r = 0; r < values.length; r++) {
    var grp = values[r][colIdx.group];
    var abs = values[r][colIdx.absensi];
    var down = values[r][colIdx.downtime];
    var pm = colIdx.pmCompletion !== -1 ? values[r][colIdx.pmCompletion] : "";
    var f5 = colIdx.fiveR !== -1 ? values[r][colIdx.fiveR] : "";

    var score = HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
    values[r][colIdx.nilaiAkhir] = score;
  }

  dataRange.setValues(values);
  SpreadsheetApp.getUi().alert("Berhasil menghitung Nilai Akhir untuk " + values.length + " karyawan.");
}

/**
 * Membuat sheet baru dengan format standar TACO Performance Appraisal
 */
function buatTemplateSheetBulanBaru() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt("Nama Bulan Baru", "Masukkan nama periode (contoh: Oktober 2026):", ui.ButtonSet.OK_CANCEL);

  if (response.getSelectedButton() !== ui.Button.OK || !response.getResponseText().trim()) {
    return;
  }

  var sheetName = response.getResponseText().trim();
  var existing = ss.getSheetByName(sheetName);
  if (existing) {
    ui.alert("Sheet dengan nama '" + sheetName + "' sudah ada!");
    return;
  }

  var sheet = ss.insertSheet(sheetName);

  // Headers
  var headers = ["Nama Karyawan", "Group", "Absensi (0-100)", "Downtime (0-100)", "PM Completion (0-100)", "5R (0-100)", "Nilai Akhir", "Catatan"];
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#1E293B"); // Slate-800
  headerRange.setFontColor("#FFFFFF");
  headerRange.setFontWeight("bold");
  headerRange.setHorizontalAlignment("center");

  // Format kolom Nilai Akhir header dengan warna oranye TACO
  sheet.getRange(1, 7).setBackground("#E74A25");

  // Data sample baris 2 & 3 dengan formula otomatis
  var sampleRows = [
    ["Shigit Darmawan", "B", 95, 50, "-", 80, "=HITUNG_NILAI_AKHIR(B2, C2, D2, E2, F2)", "Disiplin kerja sangat baik"],
    ["Riki Setiawan", "PM", 90, 60, 85, "-", "=HITUNG_NILAI_AKHIR(B3, C3, D3, E3, F3)", "PM mesin selesai tepat waktu"]
  ];
  sheet.getRange(2, 1, sampleRows.length, headers.length).setValues(sampleRows);

  // Validasi Dropdown untuk Group (A, B, C, D, PM)
  var groupRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["A", "B", "C", "D", "PM"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange("B2:B100").setDataValidation(groupRule);

  // Lebar kolom
  sheet.setColumnWidth(1, 200); // Nama
  sheet.setColumnWidth(2, 80);  // Group
  sheet.setColumnWidth(3, 130); // Absensi
  sheet.setColumnWidth(4, 130); // Downtime
  sheet.setColumnWidth(5, 150); // PM Completion
  sheet.setColumnWidth(6, 110); // 5R
  sheet.setColumnWidth(7, 110); // Nilai Akhir
  sheet.setColumnWidth(8, 250); // Catatan

  sheet.getRange("A1:H100").setVerticalAlignment("middle");
  sheet.getRange("B2:G100").setHorizontalAlignment("center");
  sheet.getRange("G2:G100").setFontWeight("bold").setFontColor("#0F172A");

  ui.alert("Template sheet '" + sheetName + "' berhasil dibuat dengan formula otomatis!");
}

/**
 * Merapikan styling dan alignment tabel di sheet yang sedang aktif
 */
function rapikanTabelAktif() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 1 || lastCol < 1) return;

  sheet.getRange(1, 1, 1, lastCol).setFontWeight("bold").setBackground("#1E293B").setFontColor("#FFFFFF").setHorizontalAlignment("center");
  sheet.getRange(2, 1, lastRow - 1, lastCol).setVerticalAlignment("middle");
  SpreadsheetApp.getUi().alert("Tabel berhasil dirapikan.");
}

/**
 * Menampilkan popup petunjuk dan rumus penggunaan
 */
function tampilkanPetunjuk() {
  var msg = "PETUNJUK FORMULA TACO PERFORMANCE APPRAISAL\n\n" +
    "1. Rumus di Google Sheets:\n" +
    "   =HITUNG_NILAI_AKHIR(Group, Absensi, Downtime, PM_Completion, 5R)\n\n" +
    "2. Aturan Pembobotan Kriteria:\n" +
    "   • Group PM: Absensi (30%) + Downtime (35%) + PM Completion (35%)\n" +
    "   • Group A, B, C, D: Absensi (30%) + Downtime (35%) + 5R (35%)\n\n" +
    "3. Integrasi Web Utility:\n" +
    "   Gunakan menu 'Deploy as Web App' untuk menghubungkan sheet ini dengan aplikasi Performance Appraisal Utility secara live.";
  SpreadsheetApp.getUi().alert(msg);
}

/**
 * =========================================================================
 * WEB APP REST API (doGet & doPost)
 * Hubungkan Google Sheets dengan Web Dashboard Performance Appraisal Utility
 * =========================================================================
 */

/**
 * HTTP GET: Mengambil semua data penilaian dari Google Sheets dalam format JSON
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
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
        weightsAD: DEFAULT_WEIGHTS.AD,
        weightsPM: DEFAULT_WEIGHTS.PM
      });

      var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var r = 0; r < data.length; r++) {
        var row = data[r];
        if (!row[0] && !row[1]) continue;

        var name = String(row[0] || "").trim();
        var grp = String(row[1] || "").trim().toUpperCase();
        var abs = parseFloat(row[2]) || 0;
        var down = parseFloat(row[3]) || 0;
        var pm = row[4] !== "" && !isNaN(row[4]) ? parseFloat(row[4]) : null;
        var f5 = row[5] !== "" && !isNaN(row[5]) ? parseFloat(row[5]) : null;
        var finalScore = parseFloat(row[6]) || HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
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

/**
 * HTTP POST: Menyimpan / update data karyawan dari Web Utility ke Google Sheets
 */
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || "saveRecord";
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === "saveRecord") {
      var rec = body.record;
      var targetSheetName = body.monthName || rec.monthId || "Appraisal";
      var sheet = ss.getSheetByName(targetSheetName);

      if (!sheet) {
        // Buat sheet baru jika belum ada
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
        message: "Data karyawan berhasil ditambahkan ke Google Sheets!",
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
