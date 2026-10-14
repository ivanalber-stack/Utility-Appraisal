import React, { useState, useEffect } from 'react';
import { X, UserPlus, UserCheck, ShieldAlert, Award } from 'lucide-react';
import { AppraisalRecord, EmployeeGroup, MonthConfig, calculateFinalScore } from '../types/appraisal';

interface EmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordToEdit: AppraisalRecord | null;
  currentMonth: MonthConfig;
  onSave: (record: AppraisalRecord) => void;
}

export const EmployeeModal: React.FC<EmployeeModalProps> = ({
  isOpen,
  onClose,
  recordToEdit,
  currentMonth,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [group, setGroup] = useState<EmployeeGroup>('A');
  const [absensi, setAbsensi] = useState<number>(100);
  const [downtime, setDowntime] = useState<number>(50);
  const [fiveR, setFiveR] = useState<number>(80);
  const [pmCompletion, setPmCompletion] = useState<number>(80);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (recordToEdit) {
      setName(recordToEdit.name);
      setGroup(recordToEdit.group);
      setAbsensi(recordToEdit.absensi ?? 100);
      setDowntime(recordToEdit.downtime ?? 50);
      setFiveR(recordToEdit.fiveR ?? 80);
      setPmCompletion(recordToEdit.pmCompletion ?? 80);
      setNotes(recordToEdit.notes ?? '');
    } else {
      setName('');
      setGroup('A');
      setAbsensi(95);
      setDowntime(50);
      setFiveR(80);
      setPmCompletion(80);
      setNotes('');
    }
  }, [recordToEdit, isOpen]);

  if (!isOpen) return null;

  const isPM = group === 'PM';

  const previewRecord: AppraisalRecord = {
    id: recordToEdit?.id || 'temp',
    monthId: currentMonth.id,
    name: name || 'Nama Karyawan',
    group,
    absensi,
    downtime,
    pmCompletion: isPM ? pmCompletion : null,
    fiveR: isPM ? null : fiveR,
    notes,
  };

  const previewScore = calculateFinalScore(previewRecord, currentMonth);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const finalRecord: AppraisalRecord = {
      id: recordToEdit ? recordToEdit.id : `rec-${Date.now()}`,
      monthId: currentMonth.id,
      name: name.trim(),
      group,
      absensi: Number(absensi),
      downtime: Number(downtime),
      pmCompletion: isPM ? Number(pmCompletion) : null,
      fiveR: isPM ? null : Number(fiveR),
      notes: notes.trim(),
    };

    onSave(finalRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              {recordToEdit ? <UserCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                {recordToEdit ? 'Edit Penilaian Karyawan' : 'Tambah Karyawan Baru'}
              </h2>
              <p className="text-xs text-slate-400">
                Periode: {currentMonth.name}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nama Lengkap Karyawan
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Shigit Darmawan"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Group / Shift Operasional
              </label>
              <span className="text-[11px] text-slate-400">
                {isPM ? 'Group PM Terkunci' : 'Group A - D dapat diubah sesuai sheet'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {(['A', 'B', 'C', 'D', 'PM'] as EmployeeGroup[]).map((grp) => {
                const isMemberAsep = Boolean(recordToEdit && (recordToEdit.name.toLowerCase().includes('asep jumhari') || recordToEdit.group === 'PM'));
                const isDisabled = isMemberAsep ? grp !== 'PM' : grp === 'PM';
                return (
                  <button
                    key={grp}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setGroup(grp)}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                      group === grp
                        ? grp === 'PM'
                          ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                          : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : isDisabled
                        ? 'bg-slate-900/60 text-slate-600 border-slate-800 cursor-not-allowed opacity-40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700/60'
                    }`}
                  >
                    {grp === 'PM' ? 'Group PM' : `Group ${grp}`}
                  </button>
                );
              })}
            </div>
          </div>

          {/* KPI Inputs */}
          <div className="border border-slate-700/80 rounded-xl p-4 bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-700/60 pb-2">
              <span className="font-semibold text-slate-200">Skor Indikator KPI (0 - 100)</span>
              <span>Skala Penilaian Standar</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Absensi (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={absensi}
                  onChange={(e) => setAbsensi(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg font-mono text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Downtime (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={downtime}
                  onChange={(e) => setDowntime(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-lg font-mono text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Conditional KPI based on Group rule */}
            {isPM ? (
              <div className="p-3 bg-amber-950/50 border border-amber-800/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-amber-200">
                    PM Completion (%)
                  </label>
                  <span className="text-[10px] text-amber-400 uppercase font-mono tracking-wider">
                    Khusus Group PM
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={pmCompletion}
                  onChange={(e) => setPmCompletion(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-amber-700/80 rounded-lg font-mono text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[11px] text-amber-300/80">
                  Kriteria 5R tidak dihitung untuk Group PM.
                </p>
              </div>
            ) : (
              <div className="p-3 bg-indigo-950/50 border border-indigo-800/70 rounded-lg space-y-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-indigo-200">
                    5R (Ringkas, Rapi, Resik, Rawat, Rajin) (%)
                  </label>
                  <span className="text-[10px] text-indigo-400 uppercase font-mono tracking-wider">
                    Khusus Group A–D
                  </span>
                </div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={fiveR}
                  onChange={(e) => setFiveR(Number(e.target.value))}
                  className="w-full px-3 py-1.5 text-sm bg-slate-800 border border-indigo-700/80 rounded-lg font-mono text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-indigo-300/80">
                  PM Completion tidak dihitung untuk Group {group}.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Catatan / Evaluasi Singkat (Opsional)
            </label>
            <textarea
              rows={2}
              placeholder="Catatan performa shift, kedisiplinan kerja, atau rekomendasi..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Live Preview Score */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 text-white">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs text-slate-300">Estimasi Nilai Akhir:</p>
                <p className="text-xs text-slate-500">Berdasarkan bobot aktif bulan {currentMonth.name}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-xl font-bold tabular-nums text-white">
                {previewScore}
              </span>
              <span className="text-xs text-slate-400 ml-1">/ 100</span>
            </div>
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
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Simpan Data Karyawan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
