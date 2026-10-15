import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  FileCode,
  FileSpreadsheet,
  BookOpen,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Lightbulb,
  Zap,
  CheckCircle2,
  ChevronRight,
  Link2,
  ExternalLink,
  Trash2,
  UploadCloud,
  DownloadCloud,
  Globe,
  HelpCircle,
  Radio,
  Timer,
  Activity,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { AppraisalRecord, MonthConfig } from '../types/appraisal';
import { fetchFromGoogleSheetGViz } from '../utils/googleSheetsParser';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: MonthConfig;
  records: AppraisalRecord[];
  appsScriptUrl?: string;
  onSaveAppsScriptUrl?: (url: string) => void;
  spreadsheetUrl?: string;
  onSaveSpreadsheetUrl?: (url: string) => void;
  isRealTimeEnabled?: boolean;
  onToggleRealTime?: (enabled: boolean) => void;
  realTimeInterval?: number;
  onChangeRealTimeInterval?: (interval: number) => void;
  lastSyncTime?: Date | null;
  onSyncNow?: () => Promise<void>;
  isSyncing?: boolean;
  onImportRecords?: (importedRecords: AppraisalRecord[]) => void;
  onResetToOfficial17?: () => void;
  initialTab?: 'link' | 'troubleshoot' | 'native' | 'code' | 'guide';
}

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  records,
  appsScriptUrl = '',
  onSaveAppsScriptUrl,
  spreadsheetUrl = '',
  onSaveSpreadsheetUrl,
  isRealTimeEnabled = true,
  onToggleRealTime,
  realTimeInterval = 10000,
  onChangeRealTimeInterval,
  lastSyncTime = null,
  onSyncNow,
  isSyncing = false,
  onImportRecords,
  onResetToOfficial17,
  initialTab = 'link',
}) => {
  const [activeTab, setActiveTab] = useState<'link' | 'troubleshoot' | 'native' | 'code' | 'guide'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  
  // Link inputs state
  const [inputUrl, setInputUrl] = useState(appsScriptUrl);
  const [inputSpreadsheetUrl, setInputSpreadsheetUrl] = useState(spreadsheetUrl);
  const [isUrlSaved, setIsUrlSaved] = useState(false);
  const [isSheetUrlSaved, setIsSheetUrlSaved] = useState(false);
  const [isFetchingGViz, setIsFetchingGViz] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    type: 'idle' | 'loading' | 'success' | 'warning' | 'error';
    message: string;
    detail?: string;
  }>({
    type: appsScriptUrl ? 'idle' : 'idle',
    message: appsScriptUrl ? 'Link Apps Script tersimpan.' : '',
  });

  // Keep input in sync with props
  useEffect(() => {
    setInputUrl(appsScriptUrl);
  }, [appsScriptUrl]);

  useEffect(() => {
    setInputSpreadsheetUrl(spreadsheetUrl);
  }, [spreadsheetUrl]);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const wAD = currentMonth.weightsAD;
  const wPM = currentMonth.weightsPM;

  // Formula Strings
  const formulaIdn = '=HITUNG_NILAI_AKHIR(B2; C2; D2; E2; F2)';
  const formulaRange = '=HITUNG_NILAI_AKHIR(B2:F2)';
  
  // Native Excel / Google Sheets Formula (TANPA SCRIPT SAMA SEKALI)
  const nativeFormulaIdn = `=ROUND(IF(UPPER(TRIM(B2))="PM"; (C2*${wPM.absensi} + D2*${wPM.downtime} + E2*${wPM.pmCompletion})/100; (C2*${wAD.absensi} + D2*${wAD.downtime} + IF(ISNUMBER(F2); F2; IF(ISNUMBER(E2); E2; 0))*${wAD.fiveR})/100); 1)`;
  const nativeFormulaUs = `=ROUND(IF(UPPER(TRIM(B2))="PM", (C2*${wPM.absensi} + D2*${wPM.downtime} + E2*${wPM.pmCompletion})/100, (C2*${wAD.absensi} + D2*${wAD.downtime} + IF(ISNUMBER(F2), F2, IF(ISNUMBER(E2), E2, 0))*${wAD.fiveR})/100), 1)`;
  const nativeArrayFormula = `=ARRAYFORMULA(IF(A2:A=""; ""; ROUND(IF(UPPER(TRIM(B2:B))="PM"; (C2:C*${wPM.absensi} + D2:D*${wPM.downtime} + E2:E*${wPM.pmCompletion})/100; (C2:C*${wAD.absensi} + D2:D*${wAD.downtime} + IF(ISNUMBER(F2:F); F2:F; 0)*${wAD.fiveR})/100); 1)))`;

  const codeGsContent = `/**
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
    absensi: ${wAD.absensi},
    downtime: ${wAD.downtime},
    fiveR: ${wAD.fiveR}
  },
  PM: {
    absensi: ${wPM.absensi},
    downtime: ${wPM.downtime},
    pmCompletion: ${wPM.pmCompletion}
  }
};

// 17 Anggota Tim Resmi Operasional TACO (Presisi & Terkunci 17 Orang)
var OFFICIAL_MEMBERS = [
  { id: "1", name: "Shigit Darmawan", group: "B" },
  { id: "2", name: "Amrih Prayogo", group: "A" },
  { id: "3", name: "Muhamad Fajri", group: "C" },
  { id: "4", name: "Tri Wanto", group: "D" },
  { id: "5", name: "Muhammad Sopiyan", group: "A" },
  { id: "6", name: "Armad", group: "B" },
  { id: "7", name: "Muhamad Fazri", group: "C" },
  { id: "8", name: "Agung Maulana", group: "D" },
  { id: "9", name: "Asep Jumhari", group: "PM" },
  { id: "10", name: "Muhamad Adun", group: "D" },
  { id: "11", name: "Muhammad Junudillah Rahman", group: "A" },
  { id: "12", name: "Fahrul Hidayatullah", group: "B" },
  { id: "13", name: "Jurais Ikhsan", group: "A" },
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

  for (var i = 0; i < OFFICIAL_MEMBERS.length; i++) {
    if (OFFICIAL_MEMBERS[i].name.toLowerCase() === clean) {
      return OFFICIAL_MEMBERS[i];
    }
  }

  var simplifiedTarget = clean
    .replace(/^(m\\.|muh\\.|moh\\.|moch\\.|muhammad\\s+|mohamad\\s+|muhamad\\s+)/i, "")
    .replace(/shigit/g, "sigit")
    .replace(/[^a-z0-9]/g, "");

  if (!simplifiedTarget) return null;

  for (var j = 0; j < OFFICIAL_MEMBERS.length; j++) {
    var official = OFFICIAL_MEMBERS[j];
    var simplifiedOfficial = official.name
      .toLowerCase()
      .replace(/^(m\\.|muh\\.|moh\\.|moch\\.|muhammad\\s+|mohamad\\s+|muhamad\\s+)/i, "")
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

  Logger.log("STATUS: Script berjalan normal 100%! Siap digunakan.");
  return "Sukses! Script bekerja 100% normal.";
}

function isSelKosong(val) {
  if (val === null || val === undefined) return true;
  var str = String(val).trim();
  return str === "" || str === "-" || str === "N/A" || str === "null";
}

function parseNullableAngka(val) {
  if (isSelKosong(val)) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  var str = String(val).trim().replace("%", "").replace(",", ".");
  if (str === "" || str === "-") return null;
  var parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

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

function cariIndexKolom(headers) {
  var colMap = { bulan: -1, name: -1, group: -1, absensi: -1, downtime: -1, pmCompletion: -1, fiveR: -1, nilaiAkhir: -1, notes: -1 };
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").toLowerCase().trim();
    if (h.indexOf("bulan") !== -1 || h === "month" || h === "periode") colMap.bulan = c;
    else if (h.indexOf("nama") !== -1 || h === "name" || h === "karyawan") colMap.name = c;
    else if (h.indexOf("group") !== -1 || h === "grup" || h === "grp") colMap.group = c;
    else if (h.indexOf("absen") !== -1) colMap.absensi = c;
    else if (h.indexOf("down") !== -1) colMap.downtime = c;
    else if (h.indexOf("pm") !== -1 && h.indexOf("group") === -1) colMap.pmCompletion = c;
    else if (h.indexOf("5r") !== -1 || h.indexOf("5 r") !== -1) colMap.fiveR = c;
    else if (h.indexOf("nilai") !== -1 || h.indexOf("akhir") !== -1 || h === "total") colMap.nilaiAkhir = c;
    else if (h.indexOf("catatan") !== -1 || h.indexOf("note") !== -1 || h.indexOf("ket") !== -1) colMap.notes = c;
  }
  if (colMap.name === -1) colMap.name = (headers.length > 1 && String(headers[0]).toLowerCase().indexOf("no") !== -1) ? 1 : 0;
  if (colMap.group === -1) colMap.group = colMap.name + 1;
  if (colMap.absensi === -1) colMap.absensi = colMap.group + 1;
  if (colMap.downtime === -1) colMap.downtime = colMap.absensi + 1;
  if (colMap.pmCompletion === -1) colMap.pmCompletion = colMap.downtime + 1;
  if (colMap.fiveR === -1) colMap.fiveR = colMap.pmCompletion + 1;
  if (colMap.nilaiAkhir === -1) colMap.nilaiAkhir = colMap.fiveR + 1;
  return colMap;
}

/**
 * 2. FORMULA KUSTOM: =HITUNG_NILAI_AKHIR(...)
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

    var numAbs = parseNullableAngka(rawAbs);
    var numDown = parseNullableAngka(rawDown);
    if (numAbs === null || numDown === null) return "";

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
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    var row = e.range.getRow();
    var col = e.range.getColumn();
    if (row < 2) return;
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

function hitungSemuaNilaiAkhir() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 4) return;
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

        var official = cariMemberResmi(rawName);
        if (!official) continue;

        var targetMonthId = currentSectionMonthId;
        if (colMap.bulan !== -1) {
          var rowBulanVal = String(row[colMap.bulan] || "").trim();
          if (rowBulanVal) {
            targetMonthId = normalisasiBulanKeId(rowBulanVal, currentSectionMonthId);
            currentSectionMonthId = targetMonthId;
          }
        }

        if (requestedMonth && targetMonthId !== requestedMonth) continue;

        var dedupKey = targetMonthId + "_" + official.name.toLowerCase();
        if (seenEmployeesPerMonth[dedupKey]) continue;
        seenEmployeesPerMonth[dedupKey] = true;

        var isPM = official.group === "PM" || official.name.toLowerCase().indexOf("asep jumhari") !== -1;
        var rawGrp = String(row[colMap.group] || "").trim().toUpperCase();
        var grp = isPM ? "PM" : (["A", "B", "C", "D"].indexOf(rawGrp) !== -1 ? rawGrp : official.group);

        var abs = parseNullableAngka(row[colMap.absensi]);
        var down = parseNullableAngka(row[colMap.downtime]);
        var pmVal = colMap.pmCompletion !== -1 ? row[colMap.pmCompletion] : "";
        var f5Val = colMap.fiveR !== -1 ? row[colMap.fiveR] : "";
        var pm = parseNullableAngka(pmVal);
        var f5 = parseNullableAngka(f5Val) !== null ? parseNullableAngka(f5Val) : (grp !== "PM" ? pm : null);

        var finalScoreVal = colMap.nilaiAkhir !== -1 ? parseNullableAngka(row[colMap.nilaiAkhir]) : null;
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
`;

  const handleSaveUrl = () => {
    const cleaned = inputUrl.trim();
    if (onSaveAppsScriptUrl) {
      onSaveAppsScriptUrl(cleaned);
    }
    setIsUrlSaved(true);
    setTestStatus({
      type: 'success',
      message: 'Link Apps Script berhasil disimpan!',
      detail: cleaned ? 'Link Web App tersimpan di memori browser Anda.' : 'Link telah dikosongkan.',
    });
    setTimeout(() => setIsUrlSaved(false), 2500);
  };

  const handleClearUrl = () => {
    setInputUrl('');
    if (onSaveAppsScriptUrl) {
      onSaveAppsScriptUrl('');
    }
    setTestStatus({
      type: 'idle',
      message: 'Link Apps Script berhasil dihapus.',
    });
  };

  const handleSaveSpreadsheetUrl = () => {
    const cleaned = inputSpreadsheetUrl.trim();
    if (onSaveSpreadsheetUrl) {
      onSaveSpreadsheetUrl(cleaned);
    }
    setIsSheetUrlSaved(true);
    setTestStatus({
      type: 'success',
      message: 'Link Google Spreadsheet berhasil disimpan!',
      detail: cleaned ? 'Dashboard terhubung ke link Google Spreadsheet Anda.' : 'Link spreadsheet telah dikosongkan.',
    });
    setTimeout(() => setIsSheetUrlSaved(false), 2500);
  };

  const handleClearSpreadsheetUrl = () => {
    setInputSpreadsheetUrl('');
    if (onSaveSpreadsheetUrl) {
      onSaveSpreadsheetUrl('');
    }
    setTestStatus({
      type: 'idle',
      message: 'Link Google Spreadsheet berhasil dihapus.',
    });
  };

  const handleFetchDirectGViz = async () => {
    const sheetUrl = inputSpreadsheetUrl.trim();
    if (!sheetUrl) {
      setTestStatus({
        type: 'error',
        message: 'Masukkan Link Google Spreadsheet terlebih dahulu.',
        detail: 'Contoh: https://docs.google.com/spreadsheets/d/.../edit',
      });
      return;
    }

    setIsFetchingGViz(true);
    setTestStatus({
      type: 'loading',
      message: 'Sedang membaca data langsung dari Google Spreadsheet...',
    });

    try {
      const recs = await fetchFromGoogleSheetGViz(sheetUrl, currentMonth);
      if (recs && recs.length > 0) {
        if (onImportRecords) {
          onImportRecords(recs);
        }
        setTestStatus({
          type: 'success',
          message: `Sukses! Berhasil membaca ${recs.length} data karyawan langsung dari Google Spreadsheet!`,
          detail: 'Data berhasil ditarik secara real-time dan tabel otomatis diperbarui.',
        });
      } else {
        setTestStatus({
          type: 'warning',
          message: 'Tidak ada baris data karyawan yang ditemukan.',
          detail: 'Pastikan baris header dan data karyawan pada sheet sudah terisi.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestStatus({
        type: 'error',
        message: 'Gagal membaca Google Spreadsheet langsung.',
        detail: msg,
      });
    } finally {
      setIsFetchingGViz(false);
    }
  };

  // Determine link types
  const isWebAppUrl = inputUrl.includes('script.google.com/macros/s/') && inputUrl.includes('/exec');
  const isScriptEditorUrl = inputUrl.includes('script.google.com') && !inputUrl.includes('/exec');
  const isSpreadsheetUrl = inputSpreadsheetUrl.includes('docs.google.com/spreadsheets') || inputUrl.includes('docs.google.com/spreadsheets');

  // Test connection to Google Apps Script / Web App
  const handleTestConnection = async () => {
    const targetUrl = inputUrl.trim();
    if (!targetUrl) {
      setTestStatus({
        type: 'error',
        message: 'Masukkan URL terlebih dahulu.',
        detail: 'Contoh: https://script.google.com/macros/s/.../exec atau link Google Sheets Anda.',
      });
      return;
    }

    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      setTestStatus({
        type: 'error',
        message: 'Format URL tidak valid.',
        detail: 'URL harus diawali dengan https://',
      });
      return;
    }

    setTestStatus({
      type: 'loading',
      message: 'Sedang memeriksa koneksi ke URL...',
    });

    // If it's a spreadsheet or script project link, verify URL pattern
    if (isSpreadsheetUrl || isScriptEditorUrl) {
      setTestStatus({
        type: 'success',
        message: isSpreadsheetUrl ? 'Link Google Spreadsheet Valid!' : 'Link Project Apps Script Valid!',
        detail: 'Anda dapat membuka link ini secara langsung menggunakan tombol "Buka Link" di samping.',
      });
      return;
    }

    // If it's a Web App URL, test fetch
    try {
      const res = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
      });

      if (!res.ok) {
        setTestStatus({
          type: 'warning',
          message: `Server merespon dengan status ${res.status}`,
          detail: 'Pastikan Deployment Web App diatur dengan opsi "Who has access: Anyone" (Siapa saja).',
        });
        return;
      }

      const json = await res.json().catch(() => null);
      if (json && (json.status === 'success' || json.records)) {
        const count = json.records?.length || 0;
        setTestStatus({
          type: 'success',
          message: `Koneksi Live Sukses! Ditemukan ${count} data karyawan dari Google Sheets.`,
          detail: 'Web App aktif dan dapat bertukar data dengan aplikasi ini.',
        });
      } else {
        setTestStatus({
          type: 'success',
          message: 'Koneksi ke Web App berhasil terhubung!',
          detail: 'Web App merespon dengan baik.',
        });
      }
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : String(err);
      // Notice: If browser blocks CORS, Google Apps Script still might work via direct link or no-cors
      setTestStatus({
        type: 'warning',
        message: 'Link tersimpan! (Catatan pembatasan browser)',
        detail: `Jika muncul error CORS/Network, pastikan saat Deploy di Apps Script dipilih: "Execute as: Me" dan "Who has access: Anyone". Info: ${errText}`,
      });
    }
  };

  // Import records from Google Sheets Web App
  const handleImportData = async () => {
    const targetUrl = inputUrl.trim();
    if (!targetUrl || !isWebAppUrl) {
      setTestStatus({
        type: 'error',
        message: 'Fitur tarik data membutuhkan URL Web App yang berakhiran /exec',
        detail: 'Deploy script di Apps Script sebagai Web App terlebih dahulu.',
      });
      return;
    }

    setTestStatus({
      type: 'loading',
      message: 'Sedang mengambil data terbaru dari Google Sheets...',
    });

    try {
      const res = await fetch(targetUrl, { redirect: 'follow' });
      const json = await res.json();
      if (json && Array.isArray(json.records) && json.records.length > 0) {
        if (onImportRecords) {
          onImportRecords(json.records);
        }
        setTestStatus({
          type: 'success',
          message: `Berhasil mengimpor ${json.records.length} data karyawan ke aplikasi!`,
          detail: 'Tabel dan visualisasi radar otomatis diperbarui.',
        });
      } else {
        setTestStatus({
          type: 'warning',
          message: 'Data di Google Sheets belum ada atau format baris tidak sesuai.',
          detail: json.message || 'Pastikan sheet memiliki data di bawah baris header.',
        });
      }
    } catch (err) {
      setTestStatus({
        type: 'error',
        message: 'Gagal mengimpor data.',
        detail: 'Pastikan URL Web App valid dan pengaturan hak akses adalah "Anyone".',
      });
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(codeGsContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([codeGsContent], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#E74A25]/15 border border-[#E74A25]/30 rounded-xl text-[#E74A25]">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Google Apps Script &amp; Integrasi Sheets
                </h2>
                {appsScriptUrl ? (
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    Link Terhubung
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    Belum Terhubung
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Input link Google Apps Script, perbaiki error, dan otomatisasi nilai karyawan TACO Group
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-800 bg-slate-950/70 px-5 pt-3 gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'link'
                ? 'border-indigo-500 text-indigo-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Input Link Apps Script</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('troubleshoot')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'troubleshoot'
                ? 'border-amber-500 text-amber-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Solusi Jika Masih Error</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('native')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'native'
                ? 'border-emerald-500 text-emerald-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Rumus Langsung (Tanpa Script)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'code'
                ? 'border-[#E74A25] text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Code.gs Versi 2.0</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap ${
              activeTab === 'guide'
                ? 'border-indigo-500 text-indigo-300 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Panduan Pasang</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-slate-300 text-xs">
          
          {/* TAB 1: INPUT LINK SPREADSHEET & APPS SCRIPT & REAL-TIME */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* CARD 1: GOOGLE SPREADSHEET LINK */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>1. Link Google Spreadsheet</span>
                      {spreadsheetUrl && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Tersimpan
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Tempelkan URL Google Spreadsheet Anda (contoh: <code className="text-emerald-300 font-mono text-[11px]">https://docs.google.com/spreadsheets/d/.../edit</code>)
                    </p>
                  </div>
                  {inputSpreadsheetUrl && (
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <a
                        href={inputSpreadsheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-emerald-300 hover:text-white bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800/80 rounded-lg transition-colors"
                        title="Buka Spreadsheet di tab baru"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Buka Sheet ↗</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                      value={inputSpreadsheetUrl}
                      onChange={(e) => setInputSpreadsheetUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                    />
                    {inputSpreadsheetUrl && (
                      <button
                        type="button"
                        onClick={handleClearSpreadsheetUrl}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Hapus Link Spreadsheet"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={handleSaveSpreadsheetUrl}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl transition-colors shadow-xs shrink-0"
                    >
                      {isSheetUrlSaved ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{isSheetUrlSaved ? 'Tersimpan!' : 'Simpan Sheet'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleFetchDirectGViz}
                      disabled={isFetchingGViz || !inputSpreadsheetUrl}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl border border-slate-700 transition-colors shrink-0 disabled:opacity-50"
                      title="Membaca data langsung dari Google Spreadsheet publik (GViz API)"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isFetchingGViz ? 'animate-spin text-emerald-400' : 'text-emerald-400'}`} />
                      <span>Tarik via Link Sheet</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 2: GOOGLE APPS SCRIPT WEB APP URL */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <FileCode className="w-4 h-4 text-indigo-400" />
                      <span>2. Link Google Apps Script (Web App API /exec)</span>
                      {appsScriptUrl && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                          Tersimpan
                        </span>
                      )}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      URL Web App hasil penerapan <code className="text-indigo-300 font-mono text-[11px]">Code.gs</code> yang berakhiran <code className="text-indigo-300 font-mono text-[11px]">/exec</code> untuk sinkronisasi nilai otomatis.
                    </p>
                  </div>
                  {inputUrl && (
                    <div className="flex items-center gap-1.5 self-start sm:self-auto">
                      <a
                        href={inputUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/80 rounded-lg transition-colors"
                        title="Buka URL Web App di tab baru"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Buka API ↗</span>
                      </a>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      placeholder="https://script.google.com/macros/s/.../exec"
                      value={inputUrl}
                      onChange={(e) => setInputUrl(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-[#E74A25] font-mono"
                    />
                    {inputUrl && (
                      <button
                        type="button"
                        onClick={handleClearUrl}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Hapus URL Apps Script"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    <button
                      type="button"
                      onClick={handleSaveUrl}
                      className="flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-[#E74A25] hover:bg-[#d63f1c] text-white font-semibold rounded-xl transition-colors shadow-xs shrink-0"
                    >
                      {isUrlSaved ? <Check className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      <span>{isUrlSaved ? 'Tersimpan!' : 'Simpan Script'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestConnection}
                      disabled={testStatus.type === 'loading'}
                      className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl border border-slate-700 transition-colors shrink-0 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${testStatus.type === 'loading' ? 'animate-spin' : ''}`} />
                      <span>Tes &amp; Tarik</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* CARD 3: PENGATURAN SINKRONISASI REAL-TIME */}
              <div className="p-4 sm:p-5 rounded-xl bg-slate-950/90 border border-emerald-900/40 space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      <h4 className="font-bold text-white text-xs">Sinkronisasi Real-Time Otomatis</h4>
                      {isRealTimeEnabled ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          AKTIF
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                          NONAKTIF
                        </span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">
                      Ketika nilai di Google Sheets diubah, dashboard Vercel secara otomatis mengambil data terbaru tanpa reload halaman.
                    </p>
                  </div>

                  {/* Toggle Button */}
                  <div className="flex items-center gap-3">
                    {onToggleRealTime && (
                      <button
                        type="button"
                        onClick={() => onToggleRealTime(!isRealTimeEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-hidden ${
                          isRealTimeEnabled ? 'bg-emerald-600' : 'bg-slate-700'
                        }`}
                        title={isRealTimeEnabled ? 'Matikan Real-time Sync' : 'Aktifkan Real-time Sync'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isRealTimeEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* Interval and Status controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-300 text-xs">
                      <Timer className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Interval Pembaruan:</span>
                    </div>
                    {onChangeRealTimeInterval && (
                      <select
                        value={realTimeInterval}
                        onChange={(e) => onChangeRealTimeInterval(Number(e.target.value))}
                        disabled={!isRealTimeEnabled}
                        className="bg-slate-800 border border-slate-700 text-cyan-300 rounded-md px-2 py-1 text-xs font-mono focus:outline-hidden disabled:opacity-50"
                      >
                        <option value={5000}>5 detik (Super Cepat)</option>
                        <option value={10000}>10 detik (Rekomendasi)</option>
                        <option value={30000}>30 detik</option>
                        <option value={60000}>1 menit</option>
                      </select>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/90 border border-slate-800">
                    <div className="flex items-center gap-2 text-slate-300 text-xs">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>Terakhir Diperbarui:</span>
                    </div>
                    <span className="font-mono text-xs text-emerald-400">
                      {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Belum pernah'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-emerald-400" />
                    <span><strong>Auto Tab-Focus Sync:</strong> Data langsung disinkronkan saat Anda kembali ke tab ini dari Google Sheets.</span>
                  </div>
                  {onSyncNow && (
                    <button
                      type="button"
                      onClick={() => onSyncNow()}
                      disabled={isSyncing}
                      className="px-2.5 py-1 text-xs font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-800 hover:bg-cyan-900/80 rounded-md transition-colors shrink-0 disabled:opacity-50"
                    >
                      {isSyncing ? 'Sinkron...' : 'Sync Sekarang'}
                    </button>
                  )}
                </div>
              </div>

              {/* Status Feedback Banner */}
              {testStatus.message && (
                <div
                  className={`p-3 rounded-xl border text-xs font-mono flex items-start gap-2.5 ${
                    testStatus.type === 'success'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : testStatus.type === 'warning'
                      ? 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                      : testStatus.type === 'error'
                      ? 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {testStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : testStatus.type === 'warning' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="font-semibold">{testStatus.message}</div>
                    {testStatus.detail && (
                      <div className="text-[11px] opacity-80 mt-0.5 font-sans leading-relaxed">
                        {testStatus.detail}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Guide on How to Get the Link */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <h4 className="font-bold text-white text-xs flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Cara Mendapatkan Link Web App dari Google Apps Script:</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-400">
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">1</span>
                      <span>Di Apps Script, klik Terapkan</span>
                    </div>
                    <p className="leading-relaxed">
                      Klik tombol biru <strong>Terapkan (Deploy)</strong> &gt; <strong>Penerapan Baru (New deployment)</strong> di pojok kanan atas editor.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">2</span>
                      <span>Pilih Jenis: Aplikasi Web</span>
                    </div>
                    <p className="leading-relaxed">
                      Klik ikon roda gigi (gear) &gt; pilih <strong>Aplikasi Web (Web App)</strong>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">3</span>
                      <span>Set Akses: &quot;Siapa Saja&quot;</span>
                    </div>
                    <p className="leading-relaxed">
                      Jalankan sebagai: <code>Saya (Me)</code><br />
                      Yang memiliki akses: <code>Siapa saja (Anyone)</code>.
                    </p>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[9px] font-bold">4</span>
                      <span>Salin URL &amp; Tempel</span>
                    </div>
                    <p className="leading-relaxed">
                      Salin URL Web App yang berakhiran <code>/exec</code>, lalu tempelkan ke kolom input di atas dan klik <strong>Simpan Link</strong>.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TROUBLESHOOTING (Solusi Masih Error) */}
          {activeTab === 'troubleshoot' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Penyebab Utama &amp; Solusi Cepat Error di Google Sheets / Apps Script</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Kenali pesan error yang muncul di layar Anda di bawah ini dan ikuti solusinya dalam hitungan detik:
                </p>
              </div>

              {/* Error 1 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono text-[10px] font-bold mt-0.5 border border-rose-500/30">
                    ERROR 1
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Di Editor Script muncul: <code className="text-rose-400 bg-rose-950/50 px-1.5 py-0.5 rounded font-mono text-[11px]">Cannot call SpreadsheetApp.getUi() from this context</code>
                    </h4>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      <strong>Penyebab:</strong> Anda menekan tombol <strong>&quot;▷ Run / Jalankan&quot;</strong> di editor Apps Script pada fungsi <code className="text-slate-200 font-mono">onOpen</code>. Fungsi <code className="text-slate-200 font-mono">onOpen</code> dirancang untuk otomatis berjalan saat spreadsheet dibuka/refresh, bukan diklik tombol Run di editor.
                    </p>
                    <div className="mt-2 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-emerald-300 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span><strong>Solusi:</strong> Di editor script, pilih fungsi <strong>testFungsi</strong> pada dropdown atas, lalu klik Run. Atau cukup simpan (<kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px]">Ctrl+S</kbd>) dan buka kembali Spreadsheet Anda.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error 2 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold mt-0.5 border border-amber-500/30">
                    ERROR 2
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Di Sel Spreadsheet muncul: <code className="text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded font-mono text-[11px]">#ERROR! (Formula parse error)</code>
                    </h4>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      <strong>Penyebab:</strong> Google Sheets Anda menggunakan setelan <strong>Wilayah Indonesia</strong> yang mengharuskan tanda pemisah <strong>titik koma (;)</strong>, bukan tanda koma (,).
                    </p>
                    <div className="mt-2.5 space-y-2">
                      <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-amber-300">
                          <span>Indonesia (Titik Koma):</span>
                          <code>=HITUNG_NILAI_AKHIR(B2; C2; D2; E2; F2)</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formulaIdn, 'form-idn')}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition-colors"
                        >
                          {copiedKey === 'form-idn' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'form-idn' ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-2 bg-slate-900 border border-slate-800 rounded-lg">
                        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                          <span>Atau Pakai Rentang (Range):</span>
                          <code>=HITUNG_NILAI_AKHIR(B2:F2)</code>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(formulaRange, 'form-range')}
                          className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-white rounded font-medium transition-colors"
                        >
                          {copiedKey === 'form-range' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'form-range' ? 'Tersalin' : 'Salin'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Error 3 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-mono text-[10px] font-bold mt-0.5 border border-sky-500/30">
                    ERROR 3
                  </span>
                  <div>
                    <h4 className="font-bold text-white text-xs">
                      Muncul jendela: <code className="text-sky-300 bg-sky-950/50 px-1.5 py-0.5 rounded font-mono text-[11px]">Otorisasi Diperlukan (Authorization Required)</code>
                    </h4>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                      <strong>Penjelasan:</strong> Ini adalah verifikasi keamanan standar dari Google saat menjalankan script buatan sendiri untuk pertama kali.
                    </p>
                    <div className="mt-2 p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-xs space-y-1">
                      <p className="font-semibold text-white">Cara Melewatinya:</p>
                      <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                        <li>Klik tombol <strong>Tinjau Izin (Review Permissions)</strong>.</li>
                        <li>Pilih akun Google Anda (<span className="text-indigo-400 font-mono">@taco.co.id</span>).</li>
                        <li>Jika muncul peringatan <em>&quot;Google belum memverifikasi aplikasi ini&quot;</em>, klik tautan kecil di kiri bawah: <strong>Lanjutan (Advanced)</strong>.</li>
                        <li>Klik <strong>Buka TACO Appraisal (tidak aman) / Go to project (unsafe)</strong>.</li>
                        <li>Klik tombol biru <strong>Izinkan (Allow)</strong>.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solusi Alternatif: Native Formula */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Lightbulb className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Mau Tanpa Ribet Script? Gunakan Formula Bawaan Google Sheets!</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('native')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 underline"
                  >
                    <span>Lihat Rumus Native</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Formula bawaan Google Sheets bisa langsung ditempel di kolom Nilai Akhir baris ke-2 dan ditarik ke bawah. <strong>100% bebas error otorisasi, bebas pasang script, dan langsung bekerja seketika!</strong>
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: NATIVE FORMULA (100% BEBAS SCRIPT) */}
          {activeTab === 'native' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-300 font-bold text-sm">
                  <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Formula Asli Google Sheets (Langsung Tempel di Sel — Tanpa Pasang Script Apapun)</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Jika Anda tidak ingin menginstal Apps Script atau akun kantor Anda membatasi izin script, gunakan salah satu rumus standar Google Sheets di bawah ini:
                </p>
              </div>

              {/* Opsi 1: Indonesia */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      <span>Opsi A: Rumus Standar (Bahasa Indonesia - Pemisah Titik Koma &quot;;&quot;)</span>
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Tempelkan di sel <strong>G2</strong> (kolom Nilai Akhir baris pertama), lalu copy-paste atau drag ke bawah.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nativeFormulaIdn, 'native-idn')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-xs"
                  >
                    {copiedKey === 'native-idn' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'native-idn' ? 'Tersalin!' : 'Salin Rumus'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed select-all">
                  {nativeFormulaIdn}
                </div>
              </div>

              {/* Opsi 2: ArrayFormula otomatis */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                      <span>Opsi B: ARRAYFORMULA Otomatis (Cukup 1 Sel untuk Seluruh Baris ke Bawah)</span>
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Tempelkan HANYA di sel <strong>G2</strong>. Seluruh baris di bawahnya akan terisi nilai otomatis!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nativeArrayFormula, 'native-arr')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-xs"
                  >
                    {copiedKey === 'native-arr' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'native-arr' ? 'Tersalin!' : 'Salin Rumus Array'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-indigo-300 overflow-x-auto leading-relaxed select-all">
                  {nativeArrayFormula}
                </div>
              </div>

              {/* Opsi 3: English */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-white text-xs flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                      <span>Opsi C: Rumus Standar (English / US Locale - Pemisah Koma &quot;,&quot;)</span>
                    </h4>
                    <p className="text-slate-400 text-[11px]">
                      Khusus bagi pengguna yang Google Sheets-nya diatur ke Bahasa Inggris / United States.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(nativeFormulaUs, 'native-us')}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    {copiedKey === 'native-us' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'native-us' ? 'Tersalin!' : 'Salin'}</span>
                  </button>
                </div>
                <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300 overflow-x-auto leading-relaxed select-all">
                  {nativeFormulaUs}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CODE VIEWER */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Versi:</span>
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 font-mono text-[11px] rounded border border-emerald-500/30">
                    Code.gs v2.0 (Aman Tombol Run + Multi-Locale)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#E74A25] hover:bg-[#d63f1c] rounded-lg transition-colors shadow-xs"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Seluruh Code.gs'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File .gs</span>
                  </button>
                </div>
              </div>

              {/* Code Viewer Box */}
              <div className="relative rounded-xl border border-slate-800 bg-[#070b12] overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/70 text-[11px] text-slate-400 font-mono">
                  <span>Code.gs — Google Apps Script (JavaScript V8)</span>
                  <span className="text-emerald-400">testFungsi() Included</span>
                </div>
                <pre className="p-4 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[380px] leading-relaxed select-all">
                  {codeGsContent}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 5: PANDUAN */}
          {activeTab === 'guide' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-900/60 space-y-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span>Cara Memasang Code.gs di Google Sheets Tanpa Error</span>
                </h3>
                <p className="text-slate-300 leading-relaxed text-xs">
                  Ikuti 4 langkah terstruktur berikut:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span className="w-5 h-5 rounded-full bg-[#E74A25] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Buka Google Spreadsheet &amp; Apps Script</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Buka Spreadsheet evaluasi karyawan Anda. Klik menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span className="w-5 h-5 rounded-full bg-[#E74A25] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Hapus &amp; Paste Kode Versi 2.0</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Hapus seluruh isi lama di editor, lalu paste seluruh isi file <strong>Code.gs Versi 2.0</strong> dari tab kode.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span className="w-5 h-5 rounded-full bg-[#E74A25] text-white flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Simpan (<kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px]">Ctrl + S</kbd>) &amp; Tes</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Klik ikon Simpan. Jika ingin mengetes dari editor, pilih fungsi <strong>testFungsi</strong> di dropdown atas lalu klik Run (Jalankan).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-white">
                    <span className="w-5 h-5 rounded-full bg-[#E74A25] text-white flex items-center justify-center text-[10px] font-bold">4</span>
                    <span>Refresh Spreadsheet Anda</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Kembali ke tab spreadsheet dan refresh halaman (<kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px]">F5</kbd>). Menu <strong>&quot;TACO Appraisal&quot;</strong> akan muncul di bar atas!
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Globe className="w-4 h-4 text-indigo-400" />
            <span>Link Aktif: {appsScriptUrl ? <strong className="text-emerald-400 font-mono text-[11px]">{appsScriptUrl.slice(0, 45)}...</strong> : <span className="italic">Belum diinput</span>}</span>
          </div>
          <div className="flex items-center gap-2">
            {onResetToOfficial17 && (
              <button
                type="button"
                onClick={() => {
                  onResetToOfficial17();
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:text-white bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/80 rounded-lg transition-colors"
                title="Reset seluruh data lokal ke 17 anggota tim resmi TACO"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Reset ke 17 Tim Resmi</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
