import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Sliders,
  UserPlus,
  RotateCcw,
  Plus,
  Users,
  Search,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
  FileSpreadsheet,
  Link2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  INITIAL_MONTHS,
  INITIAL_RECORDS,
  sanitizeRecordsToOfficial17,
  applyImportedToOfficialRecords,
} from './data/initialData';
import {
  AppraisalRecord,
  MonthConfig,
  GroupADWeights,
  GroupPMWeights,
  EmployeeGroup,
  calculateFinalScore,
} from './types/appraisal';
import { fetchFromGoogleSheetGViz } from './utils/googleSheetsParser';
import { SummaryStats } from './components/SummaryStats';
import { EmployeeDetailCard } from './components/EmployeeDetailCard';
import { AppraisalTable } from './components/AppraisalTable';
import { WeightSettingsModal } from './components/WeightSettingsModal';
import { NewMonthModal } from './components/NewMonthModal';
import { EmployeeModal } from './components/EmployeeModal';
import { TacoLogo } from './components/TacoLogo';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';

const STORAGE_KEY_RECORDS = 'taco_appraisal_records_v2';
const STORAGE_KEY_MONTHS = 'taco_appraisal_months_v2';
const STORAGE_KEY_APPSCRIPT_URL = 'taco_appraisal_appscript_url';
const STORAGE_KEY_SPREADSHEET_URL = 'taco_appraisal_spreadsheet_url';
const STORAGE_KEY_REALTIME_ENABLED = 'taco_appraisal_realtime_enabled';
const STORAGE_KEY_REALTIME_INTERVAL = 'taco_appraisal_realtime_interval';
const ROSTER_VERSION = 'v3.3_official_17';

export default function App() {
  // Load stored months or fallback to default
  const [months, setMonths] = useState<MonthConfig[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MONTHS);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_MONTHS;
  });

  // Load stored records and sanitize strictly to 17 official team members per month
  const [records, setRecords] = useState<AppraisalRecord[]>(() => {
    try {
      const savedVersion = localStorage.getItem('taco_roster_version');
      if (savedVersion !== ROSTER_VERSION) {
        localStorage.setItem('taco_roster_version', ROSTER_VERSION);
        localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_RECORDS));
        return INITIAL_RECORDS;
      }
      const saved = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeRecordsToOfficial17(parsed, INITIAL_MONTHS);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_RECORDS;
  });

  // Current active month
  const [currentMonthId, setCurrentMonthId] = useState<string>(() => {
    return months[0]?.id || '2026-09';
  });

  // Current active month config
  const currentMonth = useMemo(() => {
    return months.find((m) => m.id === currentMonthId) || months[0] || INITIAL_MONTHS[0];
  }, [months, currentMonthId]);

  // Current selected employee record ID for radar display
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  // Unified Group filter across radar spotlight, employee selector, and table
  const [activeGroupFilter, setActiveGroupFilter] = useState<'ALL' | EmployeeGroup>('ALL');

  // Modals state
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false);
  const [isNewMonthModalOpen, setIsNewMonthModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AppraisalRecord | null>(null);

  // Link Google Apps Script URL
  const [appsScriptUrl, setAppsScriptUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_APPSCRIPT_URL) || '';
    } catch (e) {
      return '';
    }
  });

  const handleSaveAppsScriptUrl = (url: string) => {
    setAppsScriptUrl(url);
    try {
      localStorage.setItem(STORAGE_KEY_APPSCRIPT_URL, url);
    } catch (e) {
      console.error(e);
    }
  };

  // Link Google Spreadsheet URL
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_SPREADSHEET_URL) || '';
    } catch (e) {
      return '';
    }
  });

  const handleSaveSpreadsheetUrl = (url: string) => {
    setSpreadsheetUrl(url);
    try {
      localStorage.setItem(STORAGE_KEY_SPREADSHEET_URL, url);
    } catch (e) {
      console.error(e);
    }
  };

  // Real-time synchronization state
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REALTIME_ENABLED);
      return saved !== null ? saved === 'true' : true;
    } catch (e) {
      return true;
    }
  });

  const handleToggleRealTime = (enabled: boolean) => {
    setIsRealTimeEnabled(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_REALTIME_ENABLED, String(enabled));
    } catch (e) {
      console.error(e);
    }
  };

  const [realTimeInterval, setRealTimeInterval] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REALTIME_INTERVAL);
      return saved ? Number(saved) : 10000;
    } catch (e) {
      return 10000;
    }
  });

  const handleChangeRealTimeInterval = (interval: number) => {
    setRealTimeInterval(interval);
    try {
      localStorage.setItem(STORAGE_KEY_REALTIME_INTERVAL, String(interval));
    } catch (e) {
      console.error(e);
    }
  };

  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleImportRecords = (importedRecords: AppraisalRecord[]) => {
    setRecords((prev) => {
      return applyImportedToOfficialRecords(prev, importedRecords, months, currentMonth.id);
    });
  };

  const handleClearCurrentMonthScores = () => {
    setRecords((prev) =>
      prev.map((r) =>
        r.monthId === currentMonth.id
          ? {
              ...r,
              absensi: null,
              downtime: null,
              pmCompletion: null,
              fiveR: null,
              finalScore: null,
              notes: '',
            }
          : r
      )
    );
    setSyncFeedback({
      type: 'success',
      message: `Nilai periode ${currentMonth.name} berhasil dikosongkan. 17 data anggota tim siap diisi/disinkronkan.`,
    });
  };

  const handleResetToOfficial17 = () => {
    setRecords(INITIAL_RECORDS);
    try {
      localStorage.setItem('taco_roster_version', ROSTER_VERSION);
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(INITIAL_RECORDS));
    } catch (e) {
      console.error(e);
    }
    setSyncFeedback({
      type: 'success',
      message: 'Berhasil mereset data ke 17 anggota tim resmi TACO (September terisi & Oktober kosong).',
    });
  };

  const handleSyncFromGoogleSheets = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent ?? false;
    const scriptUrl = appsScriptUrl.trim();
    const sheetUrl = spreadsheetUrl.trim();

    if (!scriptUrl && !sheetUrl) {
      if (!isSilent) setIsGoogleSheetsModalOpen(true);
      return;
    }

    if (!isSilent) {
      setIsSyncing(true);
      setSyncFeedback(null);
    }

    let successCount = 0;
    let source = '';

    try {
      // 1. Coba ambil lewat Apps Script Web App jika URL /exec tersedia
      if (scriptUrl && scriptUrl.includes('/exec')) {
        source = 'Google Apps Script';
        const fetchUrl = scriptUrl.includes('?')
          ? `${scriptUrl}&month=${encodeURIComponent(currentMonth.id)}&t=${Date.now()}`
          : `${scriptUrl}?month=${encodeURIComponent(currentMonth.id)}&t=${Date.now()}`;

        const res = await fetch(fetchUrl, { redirect: 'follow' });
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.records) && json.records.length > 0) {
            handleImportRecords(json.records);
            successCount = json.records.length;
            setLastSyncTime(new Date());
          }
        }
      }

      // 2. Fallback: Coba ambil langsung dari Google Spreadsheet via GViz API jika Apps Script belum diisi / kosong
      if (successCount === 0 && sheetUrl) {
        source = 'Google Spreadsheet (GViz)';
        const parsedRecords = await fetchFromGoogleSheetGViz(sheetUrl, currentMonth);
        if (parsedRecords && parsedRecords.length > 0) {
          handleImportRecords(parsedRecords);
          successCount = parsedRecords.length;
          setLastSyncTime(new Date());
        }
      }

      if (successCount > 0) {
        if (!isSilent) {
          setSyncFeedback({
            type: 'success',
            message: `Sukses! Berhasil sinkronisasi ${successCount} data karyawan secara real-time via ${source}.`,
          });
        }
      } else if (!isSilent) {
        setSyncFeedback({
          type: 'error',
          message: 'Tidak ada data karyawan yang berhasil ditarik. Pastikan Google Sheets memiliki data dan hak akses dibagikan ke publik ("Anyone with the link can view") atau deploy Apps Script sebagai Web App ("Anyone").',
        });
      }
    } catch (err: unknown) {
      if (!isSilent) {
        const msg = err instanceof Error ? err.message : String(err);
        setSyncFeedback({
          type: 'error',
          message: `Gagal sinkronisasi data: ${msg}`,
        });
      }
    } finally {
      if (!isSilent) {
        setIsSyncing(false);
        setTimeout(() => {
          setSyncFeedback(null);
        }, 7000);
      }
    }
  };

  // Real-time automatic polling timer
  useEffect(() => {
    if (!isRealTimeEnabled) return;
    if (!appsScriptUrl && !spreadsheetUrl) return;

    const intervalId = setInterval(() => {
      handleSyncFromGoogleSheets({ silent: true });
    }, realTimeInterval);

    return () => clearInterval(intervalId);
  }, [isRealTimeEnabled, realTimeInterval, appsScriptUrl, spreadsheetUrl, currentMonth.id]);

  // Real-time sync on Window Focus (ketika user berpindah dari Google Sheets tab kembali ke web dashboard ini)
  useEffect(() => {
    if (!isRealTimeEnabled) return;
    if (!appsScriptUrl && !spreadsheetUrl) return;

    const handleWindowFocus = () => {
      handleSyncFromGoogleSheets({ silent: true });
    };

    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [isRealTimeEnabled, appsScriptUrl, spreadsheetUrl, currentMonth.id]);

  // Save to localStorage when state updates
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MONTHS, JSON.stringify(months));
    } catch (e) {
      console.error(e);
    }
  }, [months]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_RECORDS, JSON.stringify(records));
    } catch (e) {
      console.error(e);
    }
  }, [records]);



  // Records for active month
  const activeMonthRecords = useMemo(() => {
    return records.filter((r) => r.monthId === currentMonth.id);
  }, [records, currentMonth.id]);

  // Filtered employees for dropdown based on active group
  const displayedEmployeeOptions = useMemo(() => {
    if (activeGroupFilter === 'ALL') return activeMonthRecords;
    return activeMonthRecords.filter((r) => r.group === activeGroupFilter);
  }, [activeMonthRecords, activeGroupFilter]);

  // Ensure a selected employee exists for active month & group filter
  useEffect(() => {
    if (displayedEmployeeOptions.length > 0) {
      const exists = displayedEmployeeOptions.find((r) => r.id === selectedRecordId);
      if (!exists) {
        setSelectedRecordId(displayedEmployeeOptions[0].id);
      }
    } else if (activeMonthRecords.length > 0) {
      setSelectedRecordId(activeMonthRecords[0].id);
    } else {
      setSelectedRecordId(null);
    }
  }, [displayedEmployeeOptions, activeMonthRecords, selectedRecordId]);

  // Selected record object
  const selectedRecord = useMemo(() => {
    if (!selectedRecordId) return activeMonthRecords[0] || null;
    return activeMonthRecords.find((r) => r.id === selectedRecordId) || activeMonthRecords[0] || null;
  }, [activeMonthRecords, selectedRecordId]);

  // Handle switching group filter cleanly
  const handleSelectGroup = (grp: 'ALL' | EmployeeGroup) => {
    setActiveGroupFilter(grp);
    if (grp !== 'ALL') {
      const firstInGroup = activeMonthRecords.find((r) => r.group === grp);
      if (firstInGroup) {
        setSelectedRecordId(firstInGroup.id);
      }
    }
  };

  // Handler: Update Weights for a month
  const handleSaveWeights = (
    monthId: string,
    weightsAD: GroupADWeights,
    weightsPM: GroupPMWeights
  ) => {
    setMonths((prev) =>
      prev.map((m) =>
        m.id === monthId ? { ...m, weightsAD, weightsPM } : m
      )
    );
  };

  // Handler: Add new month
  const handleAddNewMonth = (
    newMonth: MonthConfig,
    copyFromMonthId: string | null,
    resetScores: boolean
  ) => {
    setMonths((prev) => [...prev, newMonth]);
    setCurrentMonthId(newMonth.id);

    if (copyFromMonthId) {
      const sourceRecords = records.filter((r) => r.monthId === copyFromMonthId);
      const newClonedRecords: AppraisalRecord[] = sourceRecords.map((src, idx) => ({
        id: `rec-${newMonth.id}-${idx + 1}-${Date.now()}`,
        monthId: newMonth.id,
        name: src.name,
        group: src.group,
        absensi: resetScores ? 0 : src.absensi,
        downtime: resetScores ? 0 : src.downtime,
        pmCompletion: src.group === 'PM' ? (resetScores ? 0 : src.pmCompletion) : null,
        fiveR: src.group !== 'PM' ? (resetScores ? 0 : src.fiveR) : null,
        notes: resetScores ? '' : src.notes,
      }));
      setRecords((prev) => [...prev, ...newClonedRecords]);
      if (newClonedRecords.length > 0) {
        setSelectedRecordId(newClonedRecords[0].id);
      }
    }
  };

  // Handler: Add or Edit Employee
  const handleSaveEmployee = (savedRecord: AppraisalRecord) => {
    setRecords((prev) => {
      const existsIndex = prev.findIndex((r) => r.id === savedRecord.id);
      if (existsIndex >= 0) {
        const updated = [...prev];
        updated[existsIndex] = savedRecord;
        return updated;
      } else {
        return [...prev, savedRecord];
      }
    });
    setSelectedRecordId(savedRecord.id);
  };

  // Handler: Delete Employee
  const handleDeleteEmployee = (id: string) => {
    if (window.confirm('Yakin ingin menghapus data karyawan ini dari periode berjalan?')) {
      setRecords((prev) => prev.filter((r) => r.id !== id));
      if (selectedRecordId === id) {
        const remaining = activeMonthRecords.filter((r) => r.id !== id);
        setSelectedRecordId(remaining[0]?.id || null);
      }
    }
  };

  // Handler: Reset to factory default (from image)
  const handleResetData = () => {
    if (
      window.confirm(
        'Kembalikan seluruh data ke awal (September 2026 sesuai data spreadsheet)? Perubahan kustom Anda akan direset.'
      )
    ) {
      localStorage.removeItem(STORAGE_KEY_MONTHS);
      localStorage.removeItem(STORAGE_KEY_RECORDS);
      setMonths(INITIAL_MONTHS);
      setRecords(INITIAL_RECORDS);
      setCurrentMonthId('2026-09');
      setSelectedRecordId(INITIAL_RECORDS[0].id);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-16">
      {/* Top Header / Bar */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            {/* Zone 1: Brand & Subtitle */}
            <div className="flex items-center gap-3">
              <div className="bg-white px-3 py-1.5 rounded-lg shadow-xs flex items-center border border-slate-200/20 shrink-0">
                <TacoLogo size="md" variant="standard" />
              </div>
              <div className="h-7 w-px bg-slate-800 hidden sm:block" />
              <div>
                <h1 className="text-base font-bold text-white leading-tight">
                  Performance Appraisal Utility
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">
                  Evaluasi Kinerja Karyawan &amp; Analisis Radar
                </p>
              </div>
            </div>

            {/* Zone 2: Month Period Selector & Employee Quick Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <Calendar className="w-4 h-4 text-slate-400 ml-2" />
                <select
                  value={currentMonthId}
                  onChange={(e) => setCurrentMonthId(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-200 pr-2 py-1 focus:outline-hidden cursor-pointer"
                >
                  {months.map((m) => (
                    <option key={m.id} value={m.id} className="bg-slate-800 text-slate-100">
                      {m.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsNewMonthModalOpen(true)}
                  className="px-2 py-1 text-[11px] font-semibold text-indigo-300 bg-indigo-950/80 hover:bg-indigo-900/80 border border-indigo-800/80 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                  title="Tambah periode bulan baru"
                >
                  <Plus className="w-3 h-3" />
                  <span>Bulan Baru</span>
                </button>
              </div>
            </div>

            {/* Zone 3: Actions */}
            <div className="flex items-center gap-2">
              {isRealTimeEnabled && (appsScriptUrl || spreadsheetUrl) && (
                <div
                  className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/70 text-emerald-300 text-xs font-mono"
                  title={lastSyncTime ? `Sinkronisasi real-time aktif. Terakhir update: ${lastSyncTime.toLocaleTimeString()}` : 'Sinkronisasi real-time otomatis aktif'}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="text-[11px] font-semibold text-emerald-300">LIVE ({(realTimeInterval / 1000)}s)</span>
                </div>
              )}

              {spreadsheetUrl && (
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border text-emerald-300 bg-emerald-950/70 border-emerald-700/80 hover:bg-emerald-900/80 hover:text-emerald-100"
                  title="Buka Google Spreadsheet di tab baru"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Buka Sheet ↗</span>
                </a>
              )}

              {(appsScriptUrl || spreadsheetUrl) && (
                <button
                  type="button"
                  onClick={() => handleSyncFromGoogleSheets()}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-2xs border text-cyan-300 bg-cyan-950/70 border-cyan-700/80 hover:bg-cyan-900/80 hover:text-cyan-200"
                  title="Tarik data nilai terbaru langsung dari Google Sheets"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : 'text-cyan-400'}`} />
                  <span className="hidden sm:inline">{isSyncing ? 'Menarik...' : 'Sync Nilai'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsGoogleSheetsModalOpen(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-2xs border ${
                  appsScriptUrl || spreadsheetUrl
                    ? 'text-emerald-300 bg-emerald-950/70 border-emerald-700/80 hover:bg-emerald-900/80 hover:text-emerald-200'
                    : 'text-indigo-300 bg-indigo-950/70 border-indigo-800/80 hover:bg-indigo-900/80 hover:text-indigo-200'
                }`}
                title="Input Link Google Spreadsheet / Apps Script & Real-Time"
              >
                {appsScriptUrl || spreadsheetUrl ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden md:inline">Sheets Terhubung</span>
                    <span className="md:hidden">Sheets</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="hidden md:inline">Input Link Sheets</span>
                    <span className="md:hidden">Link Sheets</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setIsWeightModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700/80 hover:text-white transition-colors shadow-2xs"
              >
                <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Atur Bobot ({currentMonth.name})</span>
                <span className="sm:hidden">Bobot</span>
              </button>

              <button
                type="button"
                onClick={handleClearCurrentMonthScores}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/60 border border-amber-800/80 rounded-lg hover:bg-amber-900/80 hover:text-amber-100 transition-colors shadow-2xs"
                title={`Kosongkan nilai penilaian untuk ${currentMonth.name} (tetap 17 anggota tim)`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden xl:inline">Kosongkan Nilai ({currentMonth.name})</span>
                <span className="xl:hidden">Kosongkan</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingRecord(null);
                  setIsEmployeeModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tambah Karyawan</span>
                <span className="sm:hidden">+</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Sync Feedback Toast / Banner */}
        {syncFeedback && (
          <div
            className={`mb-5 p-3.5 rounded-xl border flex items-start justify-between gap-3 text-xs transition-all ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-700/90 text-emerald-200'
                : 'bg-rose-950/80 border-rose-700/90 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {syncFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{syncFeedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-white font-bold ml-2 text-sm leading-none"
            >
              ×
            </button>
          </div>
        )}
        {/* KPI Strip */}
        <SummaryStats
          records={records}
          currentMonth={currentMonth}
          onOpenWeightSettings={() => setIsWeightModalOpen(true)}
        />

        {/* Unified Filter & Employee Selector Bar */}
        <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-2xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Single Unified Group Filter Tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Filter Group:</span>
            <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700 text-xs">
              {(['ALL', 'A', 'B', 'C', 'D', 'PM'] as const).map((grp) => {
                const count = grp === 'ALL'
                  ? activeMonthRecords.length
                  : activeMonthRecords.filter((r) => r.group === grp).length;
                const isSelected = activeGroupFilter === grp;
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => handleSelectGroup(grp)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      isSelected
                        ? grp === 'PM'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-indigo-600 text-white shadow-2xs'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/60'
                    }`}
                  >
                    {grp === 'ALL' ? 'Semua Group' : `Group ${grp}`}
                    <span className="text-[10px] ml-1 opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Clean Employee Name Selector */}
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-indigo-400 shrink-0" />
            <label htmlFor="employee-select" className="text-xs font-semibold text-slate-300 whitespace-nowrap">
              Nama Karyawan:
            </label>
            <div className="relative min-w-[240px]">
              <select
                id="employee-select"
                value={selectedRecord?.id || ''}
                onChange={(e) => setSelectedRecordId(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 text-xs font-medium bg-slate-800/90 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {activeGroupFilter === 'ALL' ? (
                  // Grouped cleanly with optgroup without repeating "Group X" on each line
                  (['A', 'B', 'C', 'D', 'PM'] as EmployeeGroup[]).map((grp) => {
                    const groupEmployees = activeMonthRecords.filter((r) => r.group === grp);
                    if (groupEmployees.length === 0) return null;
                    return (
                      <optgroup key={grp} label={`Group ${grp}`} className="bg-slate-900 text-slate-300 font-semibold">
                        {groupEmployees.map((r) => {
                          const score = calculateFinalScore(r, currentMonth);
                          return (
                            <option key={r.id} value={r.id} className="bg-slate-850 text-slate-100 font-normal">
                              {r.name} (Skor: {score})
                            </option>
                          );
                        })}
                      </optgroup>
                    );
                  })
                ) : (
                  // Filtered group employees
                  displayedEmployeeOptions.map((r) => {
                    const score = calculateFinalScore(r, currentMonth);
                    return (
                      <option key={r.id} value={r.id} className="bg-slate-800 text-slate-100">
                        {r.name} (Skor: {score})
                      </option>
                    );
                  })
                )}
              </select>
            </div>
          </div>
        </div>

        {/* 2-Column Balanced Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Spotlight Employee & Spider Web (Radar Chart) */}
          <div className="lg:col-span-5 sticky lg:top-24 space-y-4">
            {selectedRecord ? (
              <EmployeeDetailCard
                currentRecord={selectedRecord}
                allRecords={records}
                allMonths={months}
                currentMonth={currentMonth}
                onSelectEmployee={(id) => setSelectedRecordId(id)}
                onEditEmployee={(rec) => {
                  setEditingRecord(rec);
                  setIsEmployeeModalOpen(true);
                }}
              />
            ) : (
              <div className="bg-slate-900/90 p-8 rounded-2xl border border-slate-800 text-center text-slate-400 text-xs">
                Belum ada karyawan untuk periode {currentMonth.name}.
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecord(null);
                      setIsEmployeeModalOpen(true);
                    }}
                    className="px-3 py-1.5 text-xs text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
                  >
                    Tambah Karyawan Sekarang
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Complete Appraisal Spreadsheet Table */}
          <div className="lg:col-span-7">
            <AppraisalTable
              records={records}
              currentMonth={currentMonth}
              selectedRecordId={selectedRecord?.id || null}
              activeGroupFilter={activeGroupFilter}
              onSelectGroup={handleSelectGroup}
              onSelectRecord={(rec) => setSelectedRecordId(rec.id)}
              onEditRecord={(rec) => {
                setEditingRecord(rec);
                setIsEmployeeModalOpen(true);
              }}
              onDeleteRecord={handleDeleteEmployee}
              onAddRecord={() => {
                setEditingRecord(null);
                setIsEmployeeModalOpen(true);
              }}
              onOpenCodeGs={() => setIsGoogleSheetsModalOpen(true)}
              appsScriptUrl={appsScriptUrl}
              spreadsheetUrl={spreadsheetUrl}
              onSyncFromSheets={() => handleSyncFromGoogleSheets()}
              isSyncing={isSyncing}
              isRealTimeEnabled={isRealTimeEnabled}
              lastSyncTime={lastSyncTime}
            />
          </div>
        </div>

        {/* Footer info & Reset option */}
        <footer className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            <span>Sistem Performance Appraisal Karyawan Operasional · Periode {currentMonth.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition-colors"
              title="Buka Google Apps Script (Code.gs)"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Google Apps Script (Code.gs)</span>
            </button>
            <button
              type="button"
              onClick={handleResetData}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset ke data awal spreadsheet (September 2026)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset ke Data Awal Gambar</span>
            </button>
          </div>
        </footer>
      </main>

      {/* Modals */}
      <WeightSettingsModal
        isOpen={isWeightModalOpen}
        onClose={() => setIsWeightModalOpen(false)}
        currentMonth={currentMonth}
        allMonths={months}
        onSaveWeights={handleSaveWeights}
      />

      <NewMonthModal
        isOpen={isNewMonthModalOpen}
        onClose={() => setIsNewMonthModalOpen(false)}
        existingMonths={months}
        onAddNewMonth={handleAddNewMonth}
      />

      <EmployeeModal
        isOpen={isEmployeeModalOpen}
        onClose={() => {
          setIsEmployeeModalOpen(false);
          setEditingRecord(null);
        }}
        recordToEdit={editingRecord}
        currentMonth={currentMonth}
        onSave={handleSaveEmployee}
      />

      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => setIsGoogleSheetsModalOpen(false)}
        currentMonth={currentMonth}
        records={records}
        appsScriptUrl={appsScriptUrl}
        onSaveAppsScriptUrl={handleSaveAppsScriptUrl}
        spreadsheetUrl={spreadsheetUrl}
        onSaveSpreadsheetUrl={handleSaveSpreadsheetUrl}
        isRealTimeEnabled={isRealTimeEnabled}
        onToggleRealTime={handleToggleRealTime}
        realTimeInterval={realTimeInterval}
        onChangeRealTimeInterval={handleChangeRealTimeInterval}
        lastSyncTime={lastSyncTime}
        onSyncNow={() => handleSyncFromGoogleSheets()}
        isSyncing={isSyncing}
        onImportRecords={handleImportRecords}
        onResetToOfficial17={handleResetToOfficial17}
      />
    </div>
  );
}
