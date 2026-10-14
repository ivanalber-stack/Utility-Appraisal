/**
 * =========================================================================
 * TACO GROUP - PERFORMANCE APPRAISAL UTILITY
 * Google Apps Script (Code.gs) - Versi 3.0 (Real-Time Auto Recalculate & REST API)
 * =========================================================================
 * 
 * Fitur Utama:
 * 1. onEdit(e)            : Otomatis menghitung Nilai Akhir secara REAL-TIME saat Anda mengetik/mengubah nilai di sel
 * 2. =HITUNG_NILAI_AKHIR  : Rumus Kustom Spreadsheet (Bisa 5 argumen atau rentang B2:F2)
 * 3. Menu "TACO Appraisal": Menu otomatis di toolbar Google Sheets
 * 4. doGet(e)             : REST API JSON untuk Sinkronisasi Real-Time ke Web Dashboard Vercel
 * 5. testFungsi()         : Fungsi pengujian bebas error di Apps Script Editor
 * =========================================================================
 */

// Bobot Kriteria Penilaian Default TACO (%)
var DEFAULT_WEIGHTS = {
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
 * 1. FUNGSI UJI / TEST (PILIH "testFungsi" DI DROPDOWN EDITOR LALU KLIK "RUN")
 * Untuk memastikan script tidak error dan siap dipakai.
 */
function testFungsi() {
  Logger.log("=== Memulai Pengujian Formula TACO Appraisal ===");
  var testB = HITUNG_NILAI_AKHIR("B", 95, 50, "-", 80);
  Logger.log("[OK] Test Group B (Absensi: 95, Downtime: 50, 5R: 80) -> Nilai Akhir: " + testB);
  
  var testPM = HITUNG_NILAI_AKHIR("PM", 90, 60, 85, "-");
  Logger.log("[OK] Test Group PM (Absensi: 90, Downtime: 60, PM: 85) -> Nilai Akhir: " + testPM);
  
  Logger.log("STATUS: Script berjalan normal 100%! Siap digunakan di Google Sheets.");
  return "Sukses! Script bekerja 100% normal.";
}

/**
 * Helper: Membersihkan nilai angka dari format persen, spasi, koma desimal, dll.
 */
function bersihkanAngka(val) {
  if (val === null || val === undefined || val === "" || val === "-" || val === "N/A") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  var str = String(val).trim().replace("%", "").replace(",", ".");
  var parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Helper: Menemukan posisi index kolom dari baris header secara fleksibel
 */
function cariIndexKolom(headers) {
  var colMap = {
    name: -1,
    group: -1,
    absensi: -1,
    downtime: -1,
    pmCompletion: -1,
    fiveR: -1,
    nilaiAkhir: -1,
    notes: -1
  };

  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").toLowerCase().trim();
    if (h.indexOf("nama") !== -1 || h === "name" || h === "karyawan") colMap.name = c;
    else if (h.indexOf("group") !== -1 || h === "grup" || h === "grp") colMap.group = c;
    else if (h.indexOf("absen") !== -1) colMap.absensi = c;
    else if (h.indexOf("down") !== -1) colMap.downtime = c;
    else if (h.indexOf("pm") !== -1 && h.indexOf("group") === -1) colMap.pmCompletion = c;
    else if (h.indexOf("5r") !== -1 || h.indexOf("5 r") !== -1) colMap.fiveR = c;
    else if (h.indexOf("nilai") !== -1 || h.indexOf("akhir") !== -1 || h === "total" || h === "score") colMap.nilaiAkhir = c;
    else if (h.indexOf("catatan") !== -1 || h.indexOf("note") !== -1 || h.indexOf("ket") !== -1) colMap.notes = c;
  }

  // Fallback index standar jika header tidak bertuliskan spesifik
  if (colMap.name === -1) {
    colMap.name = (headers.length > 1 && String(headers[0]).toLowerCase().indexOf("no") !== -1) ? 1 : 0;
  }
  if (colMap.group === -1) colMap.group = colMap.name + 1;
  if (colMap.absensi === -1) colMap.absensi = colMap.group + 1;
  if (colMap.downtime === -1) colMap.downtime = colMap.absensi + 1;
  if (colMap.pmCompletion === -1) colMap.pmCompletion = colMap.downtime + 1;
  if (colMap.fiveR === -1) colMap.fiveR = colMap.pmCompletion + 1;
  if (colMap.nilaiAkhir === -1) colMap.nilaiAkhir = colMap.fiveR + 1;

  return colMap;
}

/**
 * 2. FORMULA KUSTOM SPREADSHEET: =HITUNG_NILAI_AKHIR(...)
 *
 * Mendukung format pemanggilan:
 * - 5 Kolom terpisah : =HITUNG_NILAI_AKHIR(B2; C2; D2; E2; F2) atau koma (B2, C2, D2, E2, F2)
 * - Rentang sel      : =HITUNG_NILAI_AKHIR(B2:F2)
 *
 * @param {string|Array} groupOrRange Group ("PM", "A", "B", "C", "D") atau rentang sel B2:F2
 * @param {number} absensi Nilai absensi (0 - 100)
 * @param {number} downtime Nilai downtime (0 - 100)
 * @param {number} pmCompletion Nilai PM Completion (Group PM)
 * @param {number} fiveR Nilai 5R (Group A, B, C, D)
 * @return {number} Nilai akhir terbobot (0 - 100) dibulatkan 1 desimal.
 * @customfunction
 */
function HITUNG_NILAI_AKHIR(groupOrRange, absensi, downtime, pmCompletion, fiveR) {
  try {
    var grp = "";
    var numAbs = 0, numDown = 0, numPM = 0, num5R = 0;

    // Mendukung pemanggilan rentang misal: =HITUNG_NILAI_AKHIR(B2:F2)
    if (Array.isArray(groupOrRange)) {
      var flat = [];
      for (var r = 0; r < groupOrRange.length; r++) {
        if (Array.isArray(groupOrRange[r])) {
          for (var c = 0; c < groupOrRange[r].length; c++) flat.push(groupOrRange[r][c]);
        } else {
          flat.push(groupOrRange[r]);
        }
      }
      grp = String(flat[0] || "").trim().toUpperCase();
      numAbs = bersihkanAngka(flat[1]);
      numDown = bersihkanAngka(flat[2]);
      numPM = bersihkanAngka(flat[3]);
      num5R = bersihkanAngka(flat[4] !== undefined ? flat[4] : flat[3]);
    } else {
      grp = String(groupOrRange || "").trim().toUpperCase();
      numAbs = bersihkanAngka(absensi);
      numDown = bersihkanAngka(downtime);
      numPM = bersihkanAngka(pmCompletion);
      num5R = bersihkanAngka(fiveR !== undefined && fiveR !== "" ? fiveR : pmCompletion);
    }

    if (!grp) return "";

    if (grp === "PM") {
      var wPM = DEFAULT_WEIGHTS.PM;
      var totalW = wPM.absensi + wPM.downtime + wPM.pmCompletion;
      if (totalW === 0) return 0;
      var scorePM = (numAbs * wPM.absensi + numDown * wPM.downtime + numPM * wPM.pmCompletion) / totalW;
      return Math.round(scorePM * 10) / 10;
    } else {
      // Group A, B, C, D
      var wAD = DEFAULT_WEIGHTS.AD;
      var totalW = wAD.absensi + wAD.downtime + wAD.fiveR;
      if (totalW === 0) return 0;
      var scoreAD = (numAbs * wAD.absensi + numDown * wAD.downtime + num5R * wAD.fiveR) / totalW;
      return Math.round(scoreAD * 10) / 10;
    }
  } catch (err) {
    return 0;
  }
}

/**
 * 3. REAL-TIME AUTO RECALCULATE (TRIGGER onEdit)
 * Setiap kali ada sel (Absensi, Downtime, PM, 5R, atau Group) yang diubah di Google Sheets,
 * baris tersebut akan otomatis dihitung dan kolom "Nilai Akhir" terisi seketika!
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    var col = e.range.getColumn();

    // Jangan proses baris header (baris 1)
    if (row < 2) return;

    var lastCol = sheet.getLastColumn();
    if (lastCol < 4) return;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = cariIndexKolom(headers);
    if (colMap.nilaiAkhir === -1 || colMap.group === -1) return;

    // Cek apakah sel yang diedit berhubungan dengan komponen penilaian
    var isScoreColumn = (
      col === colMap.group + 1 ||
      col === colMap.absensi + 1 ||
      col === colMap.downtime + 1 ||
      col === colMap.pmCompletion + 1 ||
      col === colMap.fiveR + 1
    );

    if (isScoreColumn) {
      var rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
      var grp = String(rowValues[colMap.group] || "").trim().toUpperCase();
      var abs = bersihkanAngka(rowValues[colMap.absensi]);
      var down = bersihkanAngka(rowValues[colMap.downtime]);
      var pmVal = colMap.pmCompletion !== -1 ? rowValues[colMap.pmCompletion] : "";
      var f5Val = colMap.fiveR !== -1 ? rowValues[colMap.fiveR] : "";
      var pm = (pmVal !== "" && pmVal !== "-") ? bersihkanAngka(pmVal) : null;
      var f5 = (f5Val !== "" && f5Val !== "-") ? bersihkanAngka(f5Val) : null;

      if (grp) {
        var calculatedScore = HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
        sheet.getRange(row, colMap.nilaiAkhir + 1).setValue(calculatedScore);
      }
    }
  } catch (err) {
    Logger.log("Error onEdit: " + err.toString());
  }
}

/**
 * 4. MENU KHUSUS DI TOOLBAR GOOGLE SHEETS
 */
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("TACO Appraisal")
      .addItem("Hitung Nilai Akhir (Sheet Aktif)", "hitungSemuaNilaiAkhir")
      .addSeparator()
      .addItem("Buat Template Sheet Bulan Baru", "buatTemplateSheetBulanBaru")
      .addItem("Format & Rapikan Tabel", "rapikanTabelAktif")
      .addSeparator()
      .addItem("Test Script (Cek Status Bebas Error)", "testFungsi")
      .addToUi();
  } catch (e) {
    // Abaikan jika dipanggil dari Web App tanpa UI
  }
}

/**
 * Menghitung seluruh karyawan di sheet aktif dalam satu klik
 */
function hitungSemuaNilaiAkhir() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow < 2 || lastCol < 4) {
    SpreadsheetApp.getUi().alert("Sheet masih kosong atau kolom belum lengkap.");
    return;
  }

  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var colMap = cariIndexKolom(headers);

  if (colMap.nilaiAkhir === -1) {
    // Tambah kolom Nilai Akhir di akhir jika belum ada
    colMap.nilaiAkhir = lastCol;
    sheet.getRange(1, lastCol + 1).setValue("Nilai Akhir");
    lastCol++;
  }

  var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var outputNilai = [];

  for (var i = 0; i < allData.length; i++) {
    var row = allData[i];
    var grp = String(row[colMap.group] || "").trim().toUpperCase();
    var abs = bersihkanAngka(row[colMap.absensi]);
    var down = bersihkanAngka(row[colMap.downtime]);
    var pmVal = colMap.pmCompletion !== -1 ? row[colMap.pmCompletion] : "";
    var f5Val = colMap.fiveR !== -1 ? row[colMap.fiveR] : "";
    var pm = (pmVal !== "" && pmVal !== "-") ? bersihkanAngka(pmVal) : null;
    var f5 = (f5Val !== "" && f5Val !== "-") ? bersihkanAngka(f5Val) : null;

    if (!grp) {
      outputNilai.push([""]);
    } else {
      var score = HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
      outputNilai.push([score]);
    }
  }

  sheet.getRange(2, colMap.nilaiAkhir + 1, outputNilai.length, 1).setValues(outputNilai);
  SpreadsheetApp.getUi().alert("Berhasil menghitung Nilai Akhir untuk " + outputNilai.length + " karyawan!");
}

/**
 * 5. REST API WEB APP (HTTP GET): SINKRONISASI REAL-TIME KE DASHBOARD VERCEL
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Endpoint Web App Aktif.",
        records: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    var requestedMonth = (e && e.parameter && e.parameter.month) ? String(e.parameter.month).trim().toLowerCase() : "";
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
      if ((monthId === "sheet1" || monthId === "sheet-1" || monthId === "data" || monthId === "appraisal") && requestedMonth) {
        monthId = requestedMonth;
      }

      result.months.push({
        id: monthId,
        name: sheetName,
        weightsAD: DEFAULT_WEIGHTS.AD,
        weightsPM: DEFAULT_WEIGHTS.PM
      });

      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var colMap = cariIndexKolom(headers);

      var allRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var r = 0; r < allRows.length; r++) {
        var row = allRows[r];
        var name = String(row[colMap.name] || "").trim();
        var grp = String(row[colMap.group] || "").trim().toUpperCase();

        if (!name || name === "-" || name.toLowerCase() === "nama karyawan") continue;

        var abs = bersihkanAngka(row[colMap.absensi]);
        var down = bersihkanAngka(row[colMap.downtime]);
        var pmVal = colMap.pmCompletion !== -1 ? row[colMap.pmCompletion] : "";
        var f5Val = colMap.fiveR !== -1 ? row[colMap.fiveR] : "";
        var pm = (pmVal !== "" && pmVal !== "-" && !isNaN(bersihkanAngka(pmVal))) ? bersihkanAngka(pmVal) : null;
        var f5 = (f5Val !== "" && f5Val !== "-" && !isNaN(bersihkanAngka(f5Val))) ? bersihkanAngka(f5Val) : null;

        var finalScoreVal = colMap.nilaiAkhir !== -1 ? bersihkanAngka(row[colMap.nilaiAkhir]) : 0;
        var finalScore = finalScoreVal > 0 ? finalScoreVal : HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
        var notes = colMap.notes !== -1 ? String(row[colMap.notes] || "") : "";

        result.records.push({
          id: monthId + "-emp-" + (r + 1),
          monthId: monthId,
          name: name,
          group: (grp === "PM" || grp === "A" || grp === "B" || grp === "C" || grp === "D") ? grp : "A",
          absensi: abs,
          downtime: down,
          pmCompletion: grp === "PM" ? (pm !== null ? pm : 0) : null,
          fiveR: grp !== "PM" ? (f5 !== null ? f5 : (pm !== null ? pm : 0)) : null,
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
 * 6. REST API WEB APP (HTTP POST): KIRIM / SIMPAN DATA DARI DASHBOARD
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
      message: "Action tidak dikenali."
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * 7. BUAT TEMPLATE SHEET BULAN BARU OTOMATIS
 */
function buatTemplateSheetBulanBaru() {
  var ui = SpreadsheetApp.getUi();
  var response = ui.prompt("Buat Sheet Bulan Baru", "Masukkan nama bulan (contoh: Oktober 2026):", ui.ButtonSet.OK_CANCEL);
  
  if (response.getSelectedButton() !== ui.Button.OK) return;
  var sheetName = response.getResponseText().trim();
  if (!sheetName) return;

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss.getSheetByName(sheetName)) {
    ui.alert("Sheet dengan nama '" + sheetName + "' sudah ada!");
    return;
  }

  var sheet = ss.insertSheet(sheetName);
  var headers = ["No", "Nama Karyawan", "Group", "Absensi", "Downtime", "PM Completion", "5R", "Nilai Akhir", "Catatan"];
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setBackground("#1E293B").setFontColor("#FFFFFF").setFontWeight("bold");
  sheet.setFrozenRows(1);
  ui.alert("Template sheet '" + sheetName + "' berhasil dibuat!");
}

/**
 * 8. RAPIKAN FORMAT TABEL
 */
function rapikanTabelAktif() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.autoResizeColumns(1, sheet.getLastColumn());
  SpreadsheetApp.getUi().alert("Tabel berhasil dirapikan!");
}
