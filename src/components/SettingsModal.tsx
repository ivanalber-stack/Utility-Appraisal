import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Link2,
  FileSpreadsheet,
  Sliders,
  FileCode,
  Users,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Radio,
  Timer,
  Activity,
  Zap,
  Info,
} from 'lucide-react';
import {
  AppraisalRecord,
  MonthConfig,
  GroupADWeights,
  GroupPMWeights,
} from '../types/appraisal';
import { OFFICIAL_TEAM_MEMBERS } from '../data/initialData';

export type SettingsTab = 'sheets' | 'weights' | 'codegs' | 'team';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: SettingsTab;
  currentMonth: MonthConfig;
  allMonths: MonthConfig[];
  records: AppraisalRecord[];
  appsScriptUrl: string;
  onSaveAppsScriptUrl: (url: string) => void;
  spreadsheetUrl: string;
  onSaveSpreadsheetUrl: (url: string) => void;
  isRealTimeEnabled: boolean;
  onToggleRealTime: (enabled: boolean) => void;
  realTimeInterval: number;
  onChangeRealTimeInterval: (interval: number) => void;
  lastSyncTime: Date | null;
  onSyncNow: () => Promise<void>;
  isSyncing: boolean;
  onSaveWeights: (monthId: string, weightsAD: GroupADWeights, weightsPM: GroupPMWeights) => void;
  onClearCurrentMonthScores: () => void;
  onResetToOfficial17: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  activeTab: propActiveTab = 'sheets',
  currentMonth,
  allMonths,
  records,
  appsScriptUrl,
  onSaveAppsScriptUrl,
  spreadsheetUrl,
  onSaveSpreadsheetUrl,
  isRealTimeEnabled,
  onToggleRealTime,
  realTimeInterval,
  onChangeRealTimeInterval,
  lastSyncTime,
  onSyncNow,
  isSyncing,
  onSaveWeights,
  onClearCurrentMonthScores,
  onResetToOfficial17,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(propActiveTab);

  // Sync tab if opened from specific source
  useEffect(() => {
    if (isOpen) {
      setActiveTab(propActiveTab);
    }
  }, [isOpen, propActiveTab]);

  // Sheets & Web App inputs
  const [inputSpreadsheetUrl, setInputSpreadsheetUrl] = useState(spreadsheetUrl);
  const [inputAppsScriptUrl, setInputAppsScriptUrl] = useState(appsScriptUrl);
  const [isSheetSaved, setIsSheetSaved] = useState(false);
  const [isScriptSaved, setIsScriptSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    setInputSpreadsheetUrl(spreadsheetUrl);
  }, [spreadsheetUrl]);

  useEffect(() => {
    setInputAppsScriptUrl(appsScriptUrl);
  }, [appsScriptUrl]);

  // Weights management state
  const [selectedWeightMonthId, setSelectedWeightMonthId] = useState(currentMonth.id);
  const targetWeightMonth = allMonths.find((m) => m.id === selectedWeightMonthId) || currentMonth;
  const [weightsAD, setWeightsAD] = useState<GroupADWeights>(targetWeightMonth.weightsAD);
  const [weightsPM, setWeightsPM] = useState<GroupPMWeights>(targetWeightMonth.weightsPM);
  const [isWeightsSaved, setIsWeightsSaved] = useState(false);

  useEffect(() => {
    setSelectedWeightMonthId(currentMonth.id);
    setWeightsAD(currentMonth.weightsAD);
    setWeightsPM(currentMonth.weightsPM);
  }, [currentMonth]);

  const handleMonthChange = (newMonthId: string) => {
    setSelectedWeightMonthId(newMonthId);
    const m = allMonths.find((item) => item.id === newMonthId);
    if (m) {
      setWeightsAD(m.weightsAD);
      setWeightsPM(m.weightsPM);
    }
  };

  const totalAD = weightsAD.absensi + weightsAD.downtime + weightsAD.fiveR;
  const isADValid = totalAD === 100;
  const totalPM = weightsPM.absensi + weightsPM.downtime + weightsPM.pmCompletion;
  const isPMValid = totalPM === 100;

  const handleSaveWeightsClick = () => {
    if (!isADValid || !isPMValid) return;
    onSaveWeights(selectedWeightMonthId, weightsAD, weightsPM);
    setIsWeightsSaved(true);
    setTimeout(() => setIsWeightsSaved(false), 2500);
  };

  const handleSaveSpreadsheet = () => {
    onSaveSpreadsheetUrl(inputSpreadsheetUrl.trim());
    setIsSheetSaved(true);
    setTimeout(() => setIsSheetSaved(false), 2500);
  };

  const handleSaveAppsScript = () => {
    onSaveAppsScriptUrl(inputAppsScriptUrl.trim());
    setIsScriptSaved(true);
    setTimeout(() => setIsScriptSaved(false), 2500);
  };

  // Google Apps Script Complete Source Code (Code.gs)
  const codeGsSource = `/**
 * =========================================================================
 * TACO GROUP - PERFORMANCE APPRAISAL UTILITY
 * Google Apps Script (Code.gs) - Versi 3.3 (17 Karyawan Resmi & Real-Time)
 * =========================================================================
 * 
 * Fitur Utama:
 * 1. Terkunci Tepat 17 Anggota Tim Resmi: Hanya 17 karyawan operasional TACO
 *    yang dihitung dan disinkronkan, mencegah total baris membengkak menjadi 70.
 * 2. Nilai Kosong Tetap Kosong: Sesuai bulan (misal Oktober), jika nilai kriteria
 *    di sheet masih kosong, nilai akhir tetap null/kosong (bukan angka 0).
 * 3. Group Dinamis: Group A, B, C, D dapat berganti sesuai sheet, sedangkan
 *    Group PM (Asep Jumhari) tetap terkunci.
 * 4. Mendukung Baris Merged Kolom Bulan: Otomatis membaca periode per seksi.
 * 5. Sinkronisasi Real-Time: Endpoint Web App doGet(e) untuk Dashboard Vercel.
 * 6. Auto-Calculate onEdit: Nilai Akhir otomatis dihitung seketika saat kriteria diisi.
 * =========================================================================
 */

// Bobot Standar Penilaian TACO (%)
var DEFAULT_WEIGHTS = {
  AD: {
    absensi: ${currentMonth.weightsAD.absensi},
    downtime: ${currentMonth.weightsAD.downtime},
    fiveR: ${currentMonth.weightsAD.fiveR}
  },
  PM: {
    absensi: ${currentMonth.weightsPM.absensi},
    downtime: ${currentMonth.weightsPM.downtime},
    pmCompletion: ${currentMonth.weightsPM.pmCompletion}
  }
};

// 17 Anggota Tim Resmi Operasional TACO (Presisi)
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
 * Mencocokkan nama mentah dari baris sheet ke salah satu dari 17 anggota tim
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

  var simplify = function(str) {
    return str
      .toLowerCase()
      .replace(/^(m\\.|muh\\.|moh\\.|moch\\.|muhammad\\s+|mohamad\\s+|muhamad\\s+)/i, "")
      .replace(/shigit/g, "sigit")
      .replace(/[^a-z0-9]/g, "");
  };

  var targetSimplified = simplify(clean);
  if (!targetSimplified) return null;

  for (var j = 0; j < OFFICIAL_MEMBERS.length; j++) {
    var official = OFFICIAL_MEMBERS[j];
    var officialSimplified = simplify(official.name);
    if (officialSimplified === targetSimplified ||
        officialSimplified.indexOf(targetSimplified) !== -1 ||
        targetSimplified.indexOf(officialSimplified) !== -1) {
      return official;
    }
  }
  return null;
}

function parseAngka(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === "number") return isNaN(val) ? null : val;
  var str = String(val).trim().replace("%", "").replace(",", ".");
  if (str === "" || str === "-" || str === "N/A" || str === "null") return null;
  var num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function normalisasiBulan(bulanStr, fallback) {
  if (!bulanStr) return fallback;
  var b = String(bulanStr).toLowerCase().trim();
  if (b.indexOf("sep") !== -1 || b.indexOf("09") !== -1) return "2026-09";
  if (b.indexOf("okt") !== -1 || b.indexOf("oct") !== -1 || b.indexOf("10") !== -1) return "2026-10";
  if (b.indexOf("nov") !== -1 || b.indexOf("11") !== -1) return "2026-11";
  if (b.indexOf("des") !== -1 || b.indexOf("dec") !== -1 || b.indexOf("12") !== -1) return "2026-12";
  if (b.indexOf("jan") !== -1 || b.indexOf("01") !== -1) return "2027-01";
  return fallback;
}

function cariHeaderKolom(headers) {
  var map = { bulan: -1, name: -1, group: -1, absensi: -1, downtime: -1, pmCompletion: -1, fiveR: -1, nilaiAkhir: -1, notes: -1 };
  for (var c = 0; c < headers.length; c++) {
    var h = String(headers[c] || "").toLowerCase().trim();
    if (h.indexOf("bulan") !== -1 || h === "month" || h === "periode") map.bulan = c;
    else if (h.indexOf("nama") !== -1 || h === "name" || h === "karyawan") map.name = c;
    else if (h.indexOf("group") !== -1 || h === "grup" || h === "grp") map.group = c;
    else if (h.indexOf("absen") !== -1) map.absensi = c;
    else if (h.indexOf("down") !== -1) map.downtime = c;
    else if (h.indexOf("pm") !== -1 && h.indexOf("group") === -1) map.pmCompletion = c;
    else if (h.indexOf("5r") !== -1 || h.indexOf("5 r") !== -1) map.fiveR = c;
    else if (h.indexOf("nilai") !== -1 || h.indexOf("akhir") !== -1 || h === "score") map.nilaiAkhir = c;
    else if (h.indexOf("catatan") !== -1 || h.indexOf("note") !== -1) map.notes = c;
  }
  if (map.name === -1) map.name = 1;
  if (map.group === -1) map.group = map.name + 1;
  if (map.absensi === -1) map.absensi = map.group + 1;
  if (map.downtime === -1) map.downtime = map.absensi + 1;
  if (map.pmCompletion === -1) map.pmCompletion = map.downtime + 1;
  if (map.fiveR === -1) map.fiveR = map.pmCompletion + 1;
  if (map.nilaiAkhir === -1) map.nilaiAkhir = map.fiveR + 1;
  return map;
}

/**
 * FORMULA KUSTOM SPREADSHEET:
 * Gunakan di sel: =HITUNG_NILAI_AKHIR(C2; D2; E2; F2; G2)
 */
function HITUNG_NILAI_AKHIR(group, absensi, downtime, pmCompletion, fiveR) {
  try {
    var grp = String(group || "").trim().toUpperCase();
    if (!grp) return "";

    var numAbs = parseAngka(absensi);
    var numDown = parseAngka(downtime);
    if (numAbs === null || numDown === null) return "";

    if (grp === "PM") {
      var numPM = parseAngka(pmCompletion);
      if (numPM === null) return "";
      var wPM = DEFAULT_WEIGHTS.PM;
      var totalPM = wPM.absensi + wPM.downtime + wPM.pmCompletion;
      if (totalPM === 0) return "";
      return Math.round(((numAbs * wPM.absensi + numDown * wPM.downtime + numPM * wPM.pmCompletion) / totalPM) * 10) / 10;
    } else {
      var num5R = parseAngka(fiveR !== undefined && fiveR !== "" ? fiveR : pmCompletion);
      if (num5R === null) return "";
      var wAD = DEFAULT_WEIGHTS.AD;
      var totalAD = wAD.absensi + wAD.downtime + wAD.fiveR;
      if (totalAD === 0) return "";
      return Math.round(((numAbs * wAD.absensi + numDown * wAD.downtime + num5R * wAD.fiveR) / totalAD) * 10) / 10;
    }
  } catch (err) {
    return "";
  }
}

/**
 * RECALCULATE OTOMATIS SAAT USER MENGETIK NILAI DI SPREADSHEET (onEdit)
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
    var map = cariHeaderKolom(headers);
    if (map.nilaiAkhir === -1 || map.group === -1) return;

    var isScoreCol = (
      col === map.group + 1 ||
      col === map.absensi + 1 ||
      col === map.downtime + 1 ||
      col === map.pmCompletion + 1 ||
      col === map.fiveR + 1
    );

    if (isScoreCol) {
      var rowValues = sheet.getRange(row, 1, 1, lastCol).getValues()[0];
      var grp = String(rowValues[map.group] || "").trim().toUpperCase();
      var abs = rowValues[map.absensi];
      var down = rowValues[map.downtime];
      var pm = map.pmCompletion !== -1 ? rowValues[map.pmCompletion] : "";
      var f5 = map.fiveR !== -1 ? rowValues[map.fiveR] : "";

      if (grp) {
        var score = HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
        sheet.getRange(row, map.nilaiAkhir + 1).setValue(score);
      }
    }
  } catch (err) {
    Logger.log("Error onEdit: " + err.toString());
  }
}

/**
 * ENDPOINT WEB APP (HTTP GET) UNTUK SINKRONISASI REAL-TIME
 */
function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var requestedMonth = (e && e.parameter && e.parameter.month) ? String(e.parameter.month).trim().toLowerCase() : "";
    var sheets = ss.getSheets();
    var result = {
      status: "success",
      appName: "Performance Appraisal Utility",
      updatedAt: new Date().toISOString(),
      records: []
    };

    var seenMap = {};

    for (var s = 0; s < sheets.length; s++) {
      var sheet = sheets[s];
      var sheetName = sheet.getName();
      var lastRow = sheet.getLastRow();
      var lastCol = sheet.getLastColumn();
      if (lastRow < 2 || lastCol < 3) continue;

      var currentSectionMonth = normalisasiBulan(sheetName, requestedMonth || "2026-10");
      var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      var map = cariHeaderKolom(headers);
      var rows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

      for (var r = 0; r < rows.length; r++) {
        var row = rows[r];
        var rawName = String(row[map.name] || "").trim();
        if (!rawName) continue;

        var official = cariMemberResmi(rawName);
        if (!official) continue;

        var targetMonth = currentSectionMonth;
        if (map.bulan !== -1) {
          var bVal = String(row[map.bulan] || "").trim();
          if (bVal) {
            targetMonth = normalisasiBulan(bVal, currentSectionMonth);
            currentSectionMonth = targetMonth;
          }
        }

        if (requestedMonth && targetMonth !== requestedMonth) continue;

        var dedupKey = targetMonth + "_" + official.name.toLowerCase();
        if (seenMap[dedupKey]) continue;
        seenMap[dedupKey] = true;

        var isPM = official.group === "PM" || official.name.toLowerCase().indexOf("asep jumhari") !== -1;
        var rawGrp = String(row[map.group] || "").trim().toUpperCase();
        var grp = isPM ? "PM" : (["A", "B", "C", "D"].indexOf(rawGrp) !== -1 ? rawGrp : official.group);

        var abs = parseAngka(row[map.absensi]);
        var down = parseAngka(row[map.downtime]);
        var pmVal = map.pmCompletion !== -1 ? row[map.pmCompletion] : "";
        var f5Val = map.fiveR !== -1 ? row[map.fiveR] : "";
        var pm = parseAngka(pmVal);
        var f5 = parseAngka(f5Val) !== null ? parseAngka(f5Val) : (grp !== "PM" ? pm : null);

        var finalScore = null;
        if (abs !== null && down !== null) {
          var calculated = HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5);
          finalScore = (calculated !== "" && typeof calculated === "number") ? calculated : null;
        }

        result.records.push({
          id: targetMonth + "-rec-" + official.id,
          monthId: targetMonth,
          name: official.name,
          group: grp,
          absensi: abs,
          downtime: down,
          pmCompletion: grp === "PM" ? pm : null,
          fiveR: grp !== "PM" ? f5 : null,
          finalScore: finalScore,
          notes: map.notes !== -1 ? String(row[map.notes] || "") : ""
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

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("TACO Appraisal")
      .addItem("Hitung Nilai Akhir Sheet Ini", "hitungManualSemua")
      .addToUi();
  } catch (e) {}
}

function hitungManualSemua() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var map = cariHeaderKolom(headers);
  if (map.nilaiAkhir === -1) {
    map.nilaiAkhir = lastCol;
    sheet.getRange(1, lastCol + 1).setValue("Nilai Akhir");
    lastCol++;
  }
  var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  var scores = [];
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var grp = String(row[map.group] || "").trim().toUpperCase();
    var abs = row[map.absensi];
    var down = row[map.downtime];
    var pm = map.pmCompletion !== -1 ? row[map.pmCompletion] : "";
    var f5 = map.fiveR !== -1 ? row[map.fiveR] : "";
    scores.push([HITUNG_NILAI_AKHIR(grp, abs, down, pm, f5)]);
  }
  sheet.getRange(2, map.nilaiAkhir + 1, scores.length, 1).setValues(scores);
  SpreadsheetApp.getUi().alert("Berhasil menghitung " + scores.length + " baris nilai akhir!");
}
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(codeGsSource);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const downloadCodeGs = () => {
    const blob = new Blob([codeGsSource], { type: 'text/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Code.gs');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-4 text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/95 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-950/90 border border-indigo-700/80 flex items-center justify-center text-indigo-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">
                Pengaturan Sistem Appraisal
              </h2>
              <p className="text-xs text-slate-400">
                Koneksi Google Sheets, Bobot Kriteria, Kode Apps Script, &amp; 17 Tim Resmi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-950/60 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'sheets'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Link2 className="w-4 h-4" />
            <span>Koneksi Sheets &amp; Real-Time</span>
            {spreadsheetUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('weights')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'weights'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Atur Bobot Penilaian</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('codegs')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'codegs'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Kode Google Apps Script (Code.gs)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'team'
                ? 'border-indigo-500 text-indigo-400 bg-indigo-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>17 Karyawan Resmi &amp; Reset</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: KONEKSI SHEETS & REAL-TIME */}
          {activeTab === 'sheets' && (
            <div className="space-y-6">
              {/* Google Spreadsheet URL Input & Open Button */}
              <div className="p-5 rounded-xl bg-slate-850/80 bg-slate-800/40 border border-slate-700/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-sm text-white">1. Link Google Spreadsheet</span>
                  </div>
                  {spreadsheetUrl && (
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-300 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700 rounded-lg transition-colors self-start sm:self-auto"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Buka Sheet di Tab Baru ↗</span>
                    </a>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  Masukkan link Google Spreadsheet Anda. Pastikan akses dibagikan ke <em>&quot;Siapa saja yang memiliki link dapat melihat&quot;</em> agar data dapat dibaca otomatis.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={inputSpreadsheetUrl}
                    onChange={(e) => setInputSpreadsheetUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveSpreadsheet}
                    className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isSheetSaved ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Tersimpan!</span>
                      </>
                    ) : (
                      <span>Simpan Link Sheet</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Google Apps Script Web App URL Input */}
              <div className="p-5 rounded-xl bg-slate-850/80 bg-slate-800/40 border border-slate-700/80 space-y-4">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-sm text-white">2. Link Google Apps Script (Web App URL)</span>
                </div>

                <p className="text-xs text-slate-400">
                  Deploy script sebagai Web App (Akses: <em>&quot;Anyone&quot;</em>) lalu tempelkan URL <code className="text-cyan-300">/exec</code> di sini untuk sinkronisasi dua arah real-time berkecepatan tinggi.
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={inputAppsScriptUrl}
                    onChange={(e) => setInputAppsScriptUrl(e.target.value)}
                    className="flex-1 px-3.5 py-2 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-cyan-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleSaveAppsScript}
                    className="px-4 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isScriptSaved ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-300" />
                        <span>Tersimpan!</span>
                      </>
                    ) : (
                      <span>Simpan Apps Script</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Real-Time Sync Configuration */}
              <div className="p-5 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-emerald-400">
                      <Radio className="w-4 h-4 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">Otomasi Sinkronisasi Real-Time</h4>
                      <p className="text-xs text-slate-400">
                        Menarik nilai baru dari Google Sheets secara otomatis di latar belakang
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-slate-300">
                      {isRealTimeEnabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onToggleRealTime(!isRealTimeEnabled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        isRealTimeEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                          isRealTimeEnabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-emerald-900/40">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Interval Refresh Otomatis:
                    </label>
                    <select
                      value={realTimeInterval}
                      onChange={(e) => onChangeRealTimeInterval(Number(e.target.value))}
                      disabled={!isRealTimeEnabled}
                      className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-100 disabled:opacity-50 cursor-pointer"
                    >
                      <option value={5000}>Setiap 5 detik (Sangat Cepat)</option>
                      <option value={10000}>Setiap 10 detik (Rekomendasi Standar)</option>
                      <option value={30000}>Setiap 30 detik (Sedang)</option>
                      <option value={60000}>Setiap 1 menit (Hemat Kuota)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                      Status Terakhir Disinkronkan:
                    </label>
                    <div className="flex items-center justify-between px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300">
                      <span className="font-mono">
                        {lastSyncTime ? lastSyncTime.toLocaleTimeString() : 'Belum pernah sync'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onSyncNow()}
                        disabled={isSyncing}
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Syncing...' : 'Sync Sekarang'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ATUR BOBOT PENILAIAN */}
          {activeTab === 'weights' && (
            <div className="space-y-6">
              {/* Target Month Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60">
                <div>
                  <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">
                    Pilih Periode Bulan Penilaian
                  </label>
                  <p className="text-xs text-slate-400">
                    Bobot diatur khusus untuk periode bulan yang dipilih di bawah ini.
                  </p>
                </div>
                <select
                  value={selectedWeightMonthId}
                  onChange={(e) => handleMonthChange(e.target.value)}
                  className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 border border-indigo-700/80 rounded-lg text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                >
                  {allMonths.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Group A - D Weights */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                  <div>
                    <h4 className="text-sm font-bold text-white">Bobot Group A, B, C, &amp; D</h4>
                    <p className="text-xs text-slate-400">
                      Kriteria: Absensi + Downtime + 5R (Total wajib 100%)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                    <span className="text-slate-400">Total:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md ${
                        isADValid
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                          : 'bg-rose-950 text-rose-400 border border-rose-700'
                      }`}
                    >
                      {totalAD}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Absensi (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsAD.absensi}
                      onChange={(e) =>
                        setWeightsAD({ ...weightsAD, absensi: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Downtime (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsAD.downtime}
                      onChange={(e) =>
                        setWeightsAD({ ...weightsAD, downtime: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      5R (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsAD.fiveR}
                      onChange={(e) =>
                        setWeightsAD({ ...weightsAD, fiveR: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Group PM Weights */}
              <div className="p-5 rounded-xl bg-slate-800/40 border border-slate-700/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-700/80">
                  <div>
                    <h4 className="text-sm font-bold text-white">Bobot Group PM (Preventive Maintenance)</h4>
                    <p className="text-xs text-slate-400">
                      Kriteria: Absensi + Downtime + PM Completion (Total wajib 100%)
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                    <span className="text-slate-400">Total:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md ${
                        isPMValid
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                          : 'bg-rose-950 text-rose-400 border border-rose-700'
                      }`}
                    >
                      {totalPM}%
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Absensi (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsPM.absensi}
                      onChange={(e) =>
                        setWeightsPM({ ...weightsPM, absensi: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Downtime (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsPM.downtime}
                      onChange={(e) =>
                        setWeightsPM({ ...weightsPM, downtime: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      PM Completion (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={weightsPM.pmCompletion}
                      onChange={(e) =>
                        setWeightsPM({ ...weightsPM, pmCompletion: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-1.5 text-sm font-semibold bg-slate-900 border border-slate-700 rounded-lg text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Save Weights Button */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleSaveWeightsClick}
                  disabled={!isADValid || !isPMValid}
                  className="px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  {isWeightsSaved ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Bobot Berhasil Disimpan!</span>
                    </>
                  ) : (
                    <span>Simpan Perubahan Bobot</span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: KODE GOOGLE APPS SCRIPT (CODE.GS) */}
          {activeTab === 'codegs' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-850/80 bg-slate-800/40 border border-slate-700/80">
                <div>
                  <h4 className="text-sm font-bold text-white">Google Apps Script (Code.gs)</h4>
                  <p className="text-xs text-slate-400">
                    Gunakan kode ini di Google Sheets (Extensions &gt; Apps Script) untuk sinkronisasi otomatis 17 karyawan &amp; real-time calculation.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-2xs"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Salin Kode GS</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={downloadCodeGs}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto max-h-[380px] overflow-y-auto select-all">
                <pre>{codeGsSource}</pre>
              </div>

              {/* 4-Step Deployment Guide */}
              <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-900/50 space-y-2 text-xs">
                <h5 className="font-semibold text-indigo-300 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-400" />
                  <span>Cara Memasang Kode di Google Spreadsheet:</span>
                </h5>
                <ol className="list-decimal list-inside space-y-1 text-slate-300">
                  <li>Buka Google Spreadsheet Anda &gt; Menu <strong>Ekstensi (Extensions)</strong> &gt; <strong>Apps Script</strong>.</li>
                  <li>Hapus semua isi di file <code className="text-indigo-300 font-mono">Code.gs</code>, lalu paste kode di atas.</li>
                  <li>Klik tombol <strong>Deploy (Terapkan)</strong> &gt; <strong>New deployment (Penerapan baru)</strong>.</li>
                  <li>Pilih jenis <strong>Web app</strong>, atur <em>Execute as: Me</em>, dan <em>Who has access: Anyone</em>. Salin URL Web App dan masukkan di tab Koneksi Sheets.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 4: 17 KARYAWAN RESMI & RESET */}
          {activeTab === 'team' && (
            <div className="space-y-6">
              {/* Info banner */}
              <div className="p-4 rounded-xl bg-slate-850/80 bg-slate-800/40 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-bold text-white">Daftar 17 Anggota Tim Resmi Operasional</h4>
                  <p className="text-xs text-slate-400">
                    Sistem mengunci tepat 17 orang agar jumlah tidak membengkak ke 70. Group A, B, C, D dapat disesuaikan via sheet, Group PM terkunci untuk Asep Jumhari.
                  </p>
                </div>
                <div className="px-3 py-1 bg-indigo-950 border border-indigo-800 rounded-lg text-xs font-semibold text-indigo-300 shrink-0">
                  Total: 17 Karyawan
                </div>
              </div>

              {/* Official 17 Table / Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-[300px] overflow-y-auto p-1">
                {OFFICIAL_TEAM_MEMBERS.map((m) => (
                  <div
                    key={m.idSuffix}
                    className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-mono text-[10px]">
                        {m.idSuffix}
                      </span>
                      <span className="font-semibold text-white truncate max-w-[150px]">
                        {m.name}
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        m.group === 'PM'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-indigo-950 text-indigo-300 border border-indigo-800'
                      }`}
                    >
                      Group {m.group}
                    </span>
                  </div>
                ))}
              </div>

              {/* Action Buttons: Kosongkan Nilai & Reset */}
              <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Kosongkan seluruh nilai kriteria untuk periode ${currentMonth.name}? 17 anggota tim tetap dipertahankan.`)) {
                      onClearCurrentMonthScores();
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-950/70 hover:bg-amber-900 border border-amber-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Kosongkan Nilai Periode Ini ({currentMonth.name})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset seluruh data aplikasi ke konfigurasi awal 17 anggota resmi?')) {
                      onResetToOfficial17();
                    }
                  }}
                  className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-rose-300 bg-rose-950/70 hover:bg-rose-900 border border-rose-800 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                  <span>Reset ke 17 Anggota Resmi Awal</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
