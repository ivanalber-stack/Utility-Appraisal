import React, { useState } from 'react';
import { X, Sliders, CheckCircle2, AlertCircle, RotateCcw } from 'lucide-react';
import { MonthConfig, GroupADWeights, GroupPMWeights } from '../types/appraisal';

interface WeightSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMonth: MonthConfig;
  allMonths: MonthConfig[];
  onSaveWeights: (monthId: string, weightsAD: GroupADWeights, weightsPM: GroupPMWeights) => void;
}

export const WeightSettingsModal: React.FC<WeightSettingsModalProps> = ({
  isOpen,
  onClose,
  currentMonth,
  allMonths,
  onSaveWeights,
}) => {
  const [selectedMonthId, setSelectedMonthId] = useState(currentMonth.id);

  // Find target month config
  const targetMonth = allMonths.find((m) => m.id === selectedMonthId) || currentMonth;

  const [weightsAD, setWeightsAD] = useState<GroupADWeights>(targetMonth.weightsAD);
  const [weightsPM, setWeightsPM] = useState<GroupPMWeights>(targetMonth.weightsPM);

  // Sync state if selected month dropdown changes
  const handleMonthChange = (newMonthId: string) => {
    setSelectedMonthId(newMonthId);
    const m = allMonths.find((item) => item.id === newMonthId);
    if (m) {
      setWeightsAD(m.weightsAD);
      setWeightsPM(m.weightsPM);
    }
  };

  const totalAD = weightsAD.absensi + weightsAD.downtime + weightsAD.fiveR;
  const isTotalADValid = totalAD === 100;

  const totalPM = weightsPM.absensi + weightsPM.downtime + weightsPM.pmCompletion;
  const isTotalPMValid = totalPM === 100;

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveWeights(selectedMonthId, weightsAD, weightsPM);
    onClose();
  };

  const applyPresetAD = (abs: number, dt: number, fR: number) => {
    setWeightsAD({ absensi: abs, downtime: dt, fiveR: fR });
  };

  const applyPresetPM = (abs: number, dt: number, pm: number) => {
    setWeightsPM({ absensi: abs, downtime: dt, pmCompletion: pm });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden my-6 text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-800/80 flex items-center justify-center text-indigo-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                Pengaturan Bobot Penilaian Karyawan
              </h2>
              <p className="text-xs text-slate-400">
                Atur proporsi persentase KPI per bulan sesuai target operasional
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

        {/* Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Target Month Selector */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/60">
            <div>
              <label className="text-xs font-semibold text-indigo-300 uppercase tracking-wider block">
                Bulan Evaluasi
              </label>
              <p className="text-xs text-slate-400">
                Bobot di bawah ini akan diterapkan khusus untuk bulan yang dipilih.
              </p>
            </div>
            <select
              value={selectedMonthId}
              onChange={(e) => handleMonthChange(e.target.value)}
              className="px-3 py-1.5 text-sm font-medium bg-slate-800 border border-indigo-700/70 rounded-lg text-white shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {allMonths.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-850 text-white">
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section 1: Bobot Group A - D */}
          <div className="border border-slate-800 rounded-xl p-5 bg-slate-850/60 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">
                    Group A, B, C, &amp; D
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    (Absensi + Downtime + 5R)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  PM Completion tidak berlaku untuk Group A–D.
                </p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                <span className="text-slate-400">Total:</span>
                <span
                  className={`px-2 py-0.5 rounded-md ${
                    isTotalADValid
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/80'
                      : 'bg-rose-950/70 text-rose-400 border border-rose-800/80'
                  }`}
                >
                  {totalAD}%
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Preset:</span>
              <button
                type="button"
                onClick={() => applyPresetAD(30, 35, 35)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Standar (30/35/35)
              </button>
              <button
                type="button"
                onClick={() => applyPresetAD(40, 30, 30)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Fokus Presensi (40/30/30)
              </button>
              <button
                type="button"
                onClick={() => applyPresetAD(34, 33, 33)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Seimbang (34/33/33)
              </button>
            </div>

            {/* Sliders for AD */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Absensi</span>
                  <span className="font-mono text-indigo-400 font-semibold">{weightsAD.absensi}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weightsAD.absensi}
                    onChange={(e) =>
                      setWeightsAD({ ...weightsAD, absensi: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weightsAD.absensi}
                    onChange={(e) =>
                      setWeightsAD({ ...weightsAD, absensi: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-right font-mono text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Downtime</span>
                  <span className="font-mono text-indigo-400 font-semibold">{weightsAD.downtime}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weightsAD.downtime}
                    onChange={(e) =>
                      setWeightsAD({ ...weightsAD, downtime: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weightsAD.downtime}
                    onChange={(e) =>
                      setWeightsAD({ ...weightsAD, downtime: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-right font-mono text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>5R (Ringkas, Rapi, Resik, Rawat, Rajin)</span>
                  <span className="font-mono text-indigo-400 font-semibold">{weightsAD.fiveR}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weightsAD.fiveR}
                    onChange={(e) =>
                      setWeightsAD({ ...weightsAD, fiveR: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weightsAD.fiveR}
                    onChange={(e) =>
                      setWeightsAD({ ...weightsAD, fiveR: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-right font-mono text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Bobot Group PM */}
          <div className="border border-slate-800 rounded-xl p-5 bg-slate-900/60 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-white">
                    Group PM (Preventive Maintenance)
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    (Absensi + Downtime + PM Completion)
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  5R tidak berlaku untuk Group PM.
                </p>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                <span className="text-slate-400">Total:</span>
                <span
                  className={`px-2 py-0.5 rounded-md ${
                    isTotalPMValid
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/80'
                      : 'bg-rose-950/70 text-rose-400 border border-rose-800/80'
                  }`}
                >
                  {totalPM}%
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Preset:</span>
              <button
                type="button"
                onClick={() => applyPresetPM(30, 35, 35)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Standar (30/35/35)
              </button>
              <button
                type="button"
                onClick={() => applyPresetPM(25, 30, 45)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Fokus PM (25/30/45)
              </button>
              <button
                type="button"
                onClick={() => applyPresetPM(34, 33, 33)}
                className="text-xs px-2.5 py-1 rounded-md border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
              >
                Seimbang (34/33/33)
              </button>
            </div>

            {/* Sliders for PM */}
            <div className="space-y-3 pt-1">
              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Absensi</span>
                  <span className="font-mono text-indigo-400 font-semibold">{weightsPM.absensi}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weightsPM.absensi}
                    onChange={(e) =>
                      setWeightsPM({ ...weightsPM, absensi: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weightsPM.absensi}
                    onChange={(e) =>
                      setWeightsPM({ ...weightsPM, absensi: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-right font-mono text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>Downtime</span>
                  <span className="font-mono text-indigo-400 font-semibold">{weightsPM.downtime}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weightsPM.downtime}
                    onChange={(e) =>
                      setWeightsPM({ ...weightsPM, downtime: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weightsPM.downtime}
                    onChange={(e) =>
                      setWeightsPM({ ...weightsPM, downtime: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-right font-mono text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-slate-300 mb-1">
                  <span>PM Completion</span>
                  <span className="font-mono text-indigo-400 font-semibold">{weightsPM.pmCompletion}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={weightsPM.pmCompletion}
                    onChange={(e) =>
                      setWeightsPM({ ...weightsPM, pmCompletion: Number(e.target.value) })
                    }
                    className="w-full accent-indigo-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                  />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weightsPM.pmCompletion}
                    onChange={(e) =>
                      setWeightsPM({ ...weightsPM, pmCompletion: Number(e.target.value) })
                    }
                    className="w-16 px-2 py-1 text-xs bg-slate-800 border border-slate-700 rounded text-right font-mono text-white focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Validation Notice */}
          {(!isTotalADValid || !isTotalPMValid) && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/60 border border-amber-800/80 text-amber-300 text-xs">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-200">Perhatian Proporsi Bobot</p>
                <p className="text-amber-300/90">
                  Total bobot setiap group disarankan bernilai 100% untuk hasil kalkulasi skor appraisal yang akurat.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <button
            type="button"
            onClick={() => {
              setWeightsAD({ absensi: 30, downtime: 35, fiveR: 35 });
              setWeightsPM({ absensi: 30, downtime: 35, pmCompletion: 35 });
            }}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Kembalikan Default
          </button>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-xs"
            >
              Simpan Pengaturan Bobot
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
