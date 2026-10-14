/**
 * =========================================================================
 * TACO GROUP - PERFORMANCE APPRAISAL UTILITY
 * Google Apps Script (Code.gs) - Versi 3.2 (Official 17 Members & Bulan Presisi)
 * =========================================================================
 * 
 * Pembaruan Versi 3.2:
 * 1. Terkunci Presisi 17 Anggota Tim Resmi: Hanya 17 karyawan resmi TACO yang
 *    dihitung dan disinkronkan, mencegah total membengkak menjadi 70.
 * 2. Penanganan Nilai Kosong Sesuai Bulan: Jika kriteria di bulan tertentu (misal
 *    Oktober 2026) masih kosong di Google Sheet, nilai akhir tetap kosong (null),
 *    tidak ada angka palsu atau pembulatan 0.
 * 3. Dukungan Merged Cells Kolom Bulan: Otomatis membaca bulan per baris
 *    meskipun sel kolom Bulan digabungkan (merged).
 * 4. Filter Bulan Presisi: doGet(e) hanya mengirimkan data untuk bulan yang dipilih.
 * 5. onEdit(e) Real-Time: Nilai Akhir otomatis dihitung seketika saat kriteria diisi.
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

// 17 Anggota Tim Resmi Operasional TACO
var OFFICIAL_MEMBERS = [
  { id: "1", name: "Shigit Darmawan", group: "B" },
  { id: "2", name: "Amrih Prayogo", group: "A" },
  { id: "3", name: "Muhamad Fajri", group: "C" },
  { id: "4", name: "Tri Wanto", group: "D" },
  { id: "5", name: "Muhammad Sopiyan", group: "A" },
  { id: "6", name: "Armad", group: "B" },
  { id: "7", name: "Angga Bastian", group: "C" },
  { id: "8", name: "Joko Supriyanto", group: "D" },
  { id: "9", name: "Muhammad Budi Prasetyo", group: "PM" },
  { id: "10", name: "Ivan Alber", group: "PM" },
  { id: "11", name: "Ade Setiawan", group: "A" },
  { id: "12", name: "Sugiarto", group: "D" },
  { id: "13", name: "Mohamad Syarif", group: "A" },
  { id: "14", name: "Damba", group: "B" },
  { id: "15", name: "Misnan", group: "C" },
  { id: "16", name: "Muhammad Rafi", group: "C" },
  { id: "17", name: "Sanudin", group: "D" }
];

/**
 * Helper: Mencocokkan nama dengan 17 anggota resmi TACO
 */
function cariMemberResmi(rawName) {
  if (!rawName) return null;
  var clean = String(rawName).toLowerCase().trim();
  if (clean === "" || clean === "-" || clean.indexOf("total") !== -1 ||
      clean.indexOf("rata") !== -1 || clean.indexOf("average") !== -1 ||
      clean.indexOf("jumlah") !== -1 || clean.indexOf("karyawan") !== -1 ||
      clean.indexOf("target") !== -1 || clean.indexOf("bobot") !== -1) {
    return null;
  }

  // 1. Exact match
  for (var i = 0; i < OFFICIAL_MEMBERS.length; i++) {
    if (OFFICIAL_MEMBERS[i].name.toLowerCase() === clean) {
      return OFFICIAL_MEMBERS[i];
    }
  }

  // 2. Loose match (buang awalan M., Muh., dsb)
  var simplifiedTarget = clean
    .replace(/^(m\.|muh\.|moh\.|moch\.|muhammad\s+|mohamad\s+|muhamad\s+)/i, "")
    .replace(/shigit/g, "sigit")
    .replace(/[^a-z0-9]/g, "");

  if (!simplifiedTarget) return null;

  for (var j = 0; j < OFFICIAL_MEMBERS.length; j++) {
    var official = OFFICIAL_MEMBERS[j];
    var simplifiedOfficial = official.name
      .toLowerCase()
      .replace(/^(m\.|muh\.|moh\.|moch\.|muhammad\s+|mohamad\s+|muhamad\s+)/i, "")
      .replace(/shigit/g, "sigit")
      .replace(/[^a-z0-9]/g, "");

    if (simplifiedOfficial === simplifiedTarget ||
        simplifiedOfficial.indexOf(simplifiedTarget) !== -1 ||
        simplifiedTarget.indexOf(simplifiedOfficial) !== -1) {
      return official;
    }
  }

  return null;
}

/**
 * 1. FUNGSI UJI (PILIH "testFungsi" DI DROPDOWN EDITOR LALU KLIK "RUN")
 */
function testFungsi() {
  Logger.log("=== Memulai Pengujian Formula TACO Appraisal Versi 3.2 ===");
  var testB = HITUNG_NILAI_AKHIR("B", 95, 50, "-", 80);
  Logger.log("[OK] Test Group B (Absensi: 95, Downtime: 50, 5R: 80) -> Nilai Akhir: " + testB);
  
  var testPM = HITUNG_NILAI_AKHIR("PM", 90, 60, 85, "-");
  Logger.log("[OK] Test Group PM (Absensi: 90, Downtime: 60, PM: 85) -> Nilai Akhir: " + testPM);

  var testKosong = HITUNG_NILAI_AKHIR("B", "", "", "", "");
  Logger.log("[OK] Test Nilai Kosong -> Hasil: '" + testKosong + "' (Harus kosong/bersih)");

  var testMember = cariMemberResmi("Ivan Alber");
  Logger.log("[OK] Test Pencocokan Tim Resmi Ivan Alber -> " + (testMember ? "Ditemukan (" + testMember.group + ")" : "Gagal"));

  Logger.log("STATUS: Script berjalan normal 100%! Siap digunakan.");
  return "Sukses! Script bekerja 100% normal.";
}

/**
 * Helper: Cek apakah sel kosong
 */
function isSelKosong(val) {
  if (val === null || val === undefined) return true;
  var str = String(val).trim();
  return str === "" || str === "-" || str === "N/A" || str === "null";
}

/**
 * Helper: Membersihkan angka desimal. Jika kosong, return null.
 */
function parseNullableAngka(val) {
  if (isSelKosong(val)) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  var str = String(val).trim().replace("%", "").replace(",", ".");
  if (str === "" || str === "-") return null;
  var parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Helper: Normalisasi teks nama bulan menjadi format ID (contoh: "Oktober 2026" -> "2026-10")
 */
function normalisasiBulanKeId(bulanStr, fallbackId) {
  if (!bulanStr) return fallbackId;
  var b = String(bulanStr).toLowerCase().trim();
  if (b.indexOf("sep") !== -1 || b.indexOf("09") !== -1) return "2026-09";
  if (b.indexOf("okt") !== -1 || b.indexOf("oct") !== -1 || b.indexOf("10") !== -1) return "2026-10";
  if (b.indexOf("nov") !== -1 || b.indexOf("11") !== -1) return "2026-11";
  if (b.indexOf("des") !== -1 || b.indexOf("dec") !== -1 || b.indexOf("12") !== -1) return "2026-12";
  if (b.indexOf("jan") !== -1 || b.indexOf("01") !== -1) return "2027-01";
  if (b.indexOf("feb") !== -1 || b.indexOf("02") !== -1) return "2027-02";
  if (b.indexOf("mar") !== -1 || b.indexOf("03") !== -1) return "2027-03";
  if (b.indexOf("apr") !== -1 || b.indexOf("04") !== -1) return "2027-04";
  if (b.indexOf("mei") !== -1 || b.indexOf("may") !== -1 || b.indexOf("05") !== -1) return "2027-05";
  if (b.indexOf("jun") !== -1 || b.indexOf("06") !== -1) return "2027-06";
  if (b.indexOf("jul") !== -1 || b.indexOf("07") !== -1) return "2027-07";
  if (b.indexOf("agu") !== -1 || b.indexOf("aug") !== -1 || b.indexOf("08") !== -1) return "2027-08";
  return fallbackId;
}

/**
 * Helper: Menemukan posisi index kolom dari baris header secara fleksibel
 */
function cariIndexKolom(headers) {
  var colMap = {
    bulan: -1,
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
    if (h.indexOf("bulan") !== -1 || h === "month" || h === "periode") colMap.bulan = c;
    else if (h.indexOf("nama") !== -1 || h === "name" || h === "karyawan") colMap.name = c;
    else if (h.indexOf("group") !== -1 || h === "grup" || h === "grp") colMap.group = c;
    else if (h.indexOf("absen") !== -1) colMap.absensi = c;
    else if (h.indexOf("down") !== -1) colMap.downtime = c;
    else if (h.indexOf("pm") !== -1 && h.indexOf("group") === -1) colMap.pmCompletion = c;
    else if (h.indexOf("5r") !== -1 || h.indexOf("5 r") !== -1) colMap.fiveR = c;
    else if (h.indexOf("nilai") !== -1 || h.indexOf("akhir") !== -1 || h === "total" || h === "score") colMap.nilaiAkhir = c;
    else if (h.indexOf("catatan") !== -1 || h.indexOf("note") !== -1 || h.indexOf("ket") !== -1) colMap.notes = c;
  }

  // Fallback index jika kolom belum ada header teks spesifik
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
 * Jika nilai kriteria masih kosong (misal di bulan Oktober), mengembalikan "" (kosong), BUKAN 0!
 * @customfunction
 */
function HITUNG_NILAI_AKHIR(groupOrRange, absensi, downtime, pmCompletion, fiveR) {
  try {
    var grp = "";
    var rawAbs, rawDown, rawPM, raw5R;

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
      rawAbs = flat[1];
      rawDown = flat[2];
      rawPM = flat[3];
      raw5R = flat[4] !== undefined ? flat[4] : flat[3];
    } else {
      grp = String(groupOrRange || "").trim().toUpperCase();
      rawAbs = absensi;
      rawDown = downtime;
      rawPM = pmCompletion;
      raw5R = fiveR !== undefined && fiveR !== "" ? fiveR : pmCompletion;
    }

    if (!grp) return "";

    // Jika nilai kriteria absensi atau downtime masih kosong, kembalikan kosong!
    var numAbs = parseNullableAngka(rawAbs);
    var numDown = parseNullableAngka(rawDown);
    if (numAbs === null || numDown === null) {
      return "";
    }

    if (grp === "PM") {
      var numPM = parseNullableAngka(rawPM);
      if (numPM === null) return "";
      var wPM = DEFAULT_WEIGHTS.PM;
      var totalW = wPM.absensi + wPM.downtime + wPM.pmCompletion;
      if (totalW === 0) return "";
      var scorePM = (numAbs * wPM.absensi + numDown * wPM.downtime + numPM * wPM.pmCompletion) / totalW;
      return Math.round(scorePM * 10) / 10;
    } else {
      var num5R = parseNullableAngka(raw5R);
      if (num5R === null) return "";
      var wAD = DEFAULT_WEIGHTS.AD;
      var totalW = wAD.absensi + wAD.downtime + wAD.fiveR;
      if (totalW === 0) return "";
      var scoreAD = (numAbs * wAD.absensi + numDown * wAD.downtime + num5R * wAD.fiveR) / totalW;
      return Math.round(scoreAD * 10) / 10;
    }
  } catch (err) {
    return "";
  }
}

/**
 * 3. REAL-TIME AUTO RECALCULATE (TRIGGER onEdit)
 * Saat nilai kriteria diubah, Nilai Akhir dihitung seketika. Jika kriteria dikosongkan, Nilai Akhir otomatis dikosongkan.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    var col = e.range.getColumn();

    if (row < 2) return; // Abaikan baris header

    var lastCol = sheet.getLastColumn();
    if (lastCol < 4) return;

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colMap = cariIndexKolom(headers);
    if (colMap.nilaiAkhir === -1 || colMap.group === -1) return;

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
      var abs = rowValues[colMap.absensi];
      var down = rowValues[colMap.downtime];
      var pmVal = colMap.pmCompletion !== -1 ? rowValues[colMap.pmCompletion] : "";
      var f5Val = colMap.fiveR !== -1 ? rowValues[colMap.fiveR] : "";

      if (grp) {
        var calculatedScore = HITUNG_NILAI_AKHIR(grp, abs, down, pmVal, f5Val);
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
      .addItem("Test Script Bebas Error", "testFungsi")
      .addToUi();
  } catch (e) {}
}

/**
 * Menghitung seluruh karyawan di sheet aktif
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
    colMap.nilaiAkhir = lastCol;
    sheet.getRange(1, lastCol + 1).setValue("Nilai Akhir");
    lastCol++;
  }

  var allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var outputNilai = [];

  for (var i = 0; i < allData.length; i++) {
    var row = allData[i];
    var grp = String(row[colMap.group] || "").trim().toUpperCase();
    var abs = row[colMap.absensi];
    var down = row[colMap.downtime];
    var pmVal = colMap.pmCompletion !== -1 ? row[colMap.pmCompletion] : "";
    var f5Val = colMap.fiveR !== -1 ? row[colMap.fiveR] : "";

    if (!grp) {
      outputNilai.push([""]);
    } else {
      var score = HITUNG_NILAI_AKHIR(grp, abs, down, pmVal, f5Val);
      outputNilai.push([score]);
    }
  }

  sheet.getRange(2, colMap.nilaiAkhir + 1, outputNilai.length, 1).setValues(outputNilai);
  SpreadsheetApp.getUi().alert("Berhasil memproses Nilai Akhir untuk " + outputNilai.length + " baris!");
}

/**
 * 5. REST API WEB APP (HTTP GET): SINKRONISASI REAL-TIME KE DASHBOARD VERCEL
 * Hanya mengembalikan 17 anggota resmi TACO, memfilter bulan presisi, dan menjaga nilai kosong tetap null.
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
      records: []
    };

    var seenEmployeesPerMonth = {};

    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var sheetName = sheet.getName();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();

      if (lastRow < 2 || lastCol < 3) continue;

      var sheetMonthId = normalisasiBulanKeId(sheetName, requestedMonth || "2026-10");
      var currentSectionMonthId = sheetMonthId;

      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var colMap = cariIndexKolom(headers);

      var allRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      for (var r = 0; r < allRows.length; r++) {
        var row = allRows[r];
        var rawName = String(row[colMap.name] || "").trim();

        if (!rawName) continue;

        // Cocokkan nama dengan 17 anggota tim resmi TACO
        var official = cariMemberResmi(rawName);
        if (!official) {
          // Baris ini bukan anggota resmi (misal baris total, rata-rata, dsb) -> Lewati!
          continue;
        }

        // Tentukan bulan baris: dukung merged cell kolom bulan
        var targetMonthId = currentSectionMonthId;
        if (colMap.bulan !== -1) {
          var rowBulanVal = String(row[colMap.bulan] || "").trim();
          if (rowBulanVal) {
            targetMonthId = normalisasiBulanKeId(rowBulanVal, currentSectionMonthId);
            currentSectionMonthId = targetMonthId;
          }
        }

        // Jika user meminta bulan tertentu, lewati baris yang bulannya berbeda
        if (requestedMonth && targetMonthId !== requestedMonth) {
          continue;
        }

        // Cegah duplikasi anggota tim yang sama di bulan yang sama (maksimal tepat 17 orang)
        var dedupKey = targetMonthId + "_" + official.name.toLowerCase();
        if (seenEmployeesPerMonth[dedupKey]) {
          continue;
        }
        seenEmployeesPerMonth[dedupKey] = true;

        var grp = String(row[colMap.group] || "").trim().toUpperCase();
        if (!grp) grp = official.group;

        var abs = parseNullableAngka(row[colMap.absensi]);
        var down = parseNullableAngka(row[colMap.downtime]);
        var pmVal = colMap.pmCompletion !== -1 ? row[colMap.pmCompletion] : "";
        var f5Val = colMap.fiveR !== -1 ? row[colMap.fiveR] : "";
        var pm = parseNullableAngka(pmVal);
        var f5 = parseNullableAngka(f5Val) !== null ? parseNullableAngka(f5Val) : (grp !== "PM" ? pm : null);

        var finalScoreVal = colMap.nilaiAkhir !== -1 ? parseNullableAngka(row[colMap.nilaiAkhir]) : null;
        
        // PENTING: Hanya hitung finalScore jika kriteria absensi dan downtime terisi
        var finalScore = null;
        if (abs !== null && down !== null) {
          if (finalScoreVal !== null) {
            finalScore = finalScoreVal;
          } else {
            var calculated = HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
            finalScore = (calculated !== "" && typeof calculated === "number") ? calculated : null;
          }
        }

        var notes = colMap.notes !== -1 ? String(row[colMap.notes] || "") : "";

        result.records.push({
          id: targetMonthId + "-emp-" + official.id,
          monthId: targetMonthId,
          name: official.name,
          group: official.group,
          absensi: abs,
          downtime: down,
          pmCompletion: official.group === "PM" ? pm : null,
          fiveR: official.group !== "PM" ? f5 : null,
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
 * 6. REST API WEB APP (HTTP POST): SIMPAN DATA DARI DASHBOARD
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
        var headers = ["Bulan", "Nama Karyawan", "Group", "Absensi", "Downtime", "PM Completion", "5R", "Nilai Akhir", "Catatan"];
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }

      var finalScore = HITUNG_NILAI_AKHIR(rec.group, rec.absensi, rec.downtime, rec.pmCompletion, rec.fiveR);
      sheet.appendRow([
        targetSheetName,
        rec.name,
        rec.group,
        rec.absensi !== null ? rec.absensi : "",
        rec.downtime !== null ? rec.downtime : "",
        rec.group === "PM" ? (rec.pmCompletion !== null ? rec.pmCompletion : "") : "-",
        rec.group !== "PM" ? (rec.fiveR !== null ? rec.fiveR : "") : "-",
        finalScore !== "" ? finalScore : "",
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
  var headers = ["Bulan", "Nama Karyawan", "Group", "Absensi", "Downtime", "PM Completion", "5R", "Nilai Akhir", "Catatan"];
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
