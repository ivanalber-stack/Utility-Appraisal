import React, { useState } from 'react';
import { X, CalendarPlus, Copy, Layers } from 'lucide-react';
import { MonthConfig } from '../types/appraisal';

interface NewMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingMonths: MonthConfig[];
  onAddNewMonth: (
    newMonth: MonthConfig,
    copyFromMonthId: string | null,
    resetScores: boolean
  ) => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export const NewMonthModal: React.FC<NewMonthModalProps> = ({
  isOpen,
  onClose,
  existingMonths,
  onAddNewMonth,
}) => {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(10); // November (0-indexed = 10)
  const [selectedYear, setSelectedYear] = useState(2026);
  const [copyFromMonthId, setCopyFromMonthId] = useState<string>(
    existingMonths[existingMonths.length - 1]?.id || ''
  );
  const [resetScores, setResetScores] = useState<boolean>(false);

  if (!isOpen) return null;

  const monthLabel = `${MONTH_NAMES[selectedMonthIndex]} ${selectedYear}`;
  const monthId = `${selectedYear}-${String(selectedMonthIndex + 1).padStart(2, '0')}`;
  const isDuplicate = existingMonths.some((m) => m.id === monthId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isDuplicate) return;

    const sourceMonth = existingMonths.find((m) => m.id === copyFromMonthId);

    const newMonth: MonthConfig = {
      id: monthId,
      name: monthLabel,
      weightsAD: sourceMonth?.weightsAD ?? {
        absensi: 30,
        downtime: 35,
        fiveR: 35,
      },
      weightsPM: sourceMonth?.weightsPM ?? {
        absensi: 30,
        downtime: 35,
        pmCompletion: 35,
      },
    };

    onAddNewMonth(newMonth, copyFromMonthId || null, resetScores);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <CalendarPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Tambah Periode Bulan Baru
              </h2>
              <p className="text-xs text-slate-400">
                Buat lembar evaluasi appraisal untuk bulan berikutnya
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilih Bulan
              </label>
              <select
                value={selectedMonthIndex}
                onChange={(e) => setSelectedMonthIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={name} value={idx} className="bg-slate-800 text-slate-100">
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Pilih Tahun
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {[2025, 2026, 2027, 2028].map((yr) => (
                  <option key={yr} value={yr} className="bg-slate-800 text-slate-100">
                    {yr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isDuplicate && (
            <p className="text-xs text-rose-400 font-medium">
              Periode {monthLabel} sudah terdaftar. Silakan pilih bulan lainnya.
            </p>
          )}

          <div className="border border-slate-700/80 rounded-xl p-4 bg-slate-800/40 space-y-3">
            <label className="block text-xs font-semibold text-slate-200">
              Salin Daftar Karyawan Dari Bulan Sebelumnya
            </label>
            <div className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={copyFromMonthId}
                onChange={(e) => setCopyFromMonthId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {existingMonths.map((m) => (
                  <option key={m.id} value={m.id} className="bg-slate-800 text-slate-100">
                    Salin dari {m.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={resetScores}
                onChange={(e) => setResetScores(e.target.checked)}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 bg-slate-800 border-slate-700"
              />
              <span className="text-xs text-slate-300">
                Kosongkan nilai (beri nilai 0 untuk input penilaian baru dari awal)
              </span>
            </label>
          </div>

          <div className="text-xs text-slate-400 flex items-start gap-2">
            <Layers className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <span>
              Bobot penilaian bulan {monthLabel} akan otomatis mewarisi bobot terakhir, dan dapat Anda ubah kapan saja melalui tombol &quot;Atur Bobot&quot;.
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isDuplicate}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-xs"
            >
              Buat Periode Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
