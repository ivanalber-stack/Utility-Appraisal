import React, { useState } from 'react';
import {
  User,
  Award,
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { RadarChart } from './RadarChart';
import {
  AppraisalRecord,
  MonthConfig,
  calculateFinalScore,
  EmployeeGroup,
} from '../types/appraisal';

interface EmployeeDetailCardProps {
  currentRecord: AppraisalRecord;
  allRecords: AppraisalRecord[];
  allMonths: MonthConfig[];
  currentMonth: MonthConfig;
  onSelectEmployee: (recordId: string) => void;
  onEditEmployee: (record: AppraisalRecord) => void;
}

export const EmployeeDetailCard: React.FC<EmployeeDetailCardProps> = ({
  currentRecord,
  allRecords,
  allMonths,
  currentMonth,
  onSelectEmployee,
  onEditEmployee,
}) => {
  const [showBenchmark, setShowBenchmark] = useState(true);

  // Group average calculation for the current month
  const sameGroupRecords = allRecords.filter(
    (r) => r.monthId === currentMonth.id && r.group === currentRecord.group
  );

  const groupAverage = {
    absensi: Math.round(
      sameGroupRecords.reduce((acc, r) => acc + r.absensi, 0) /
        (sameGroupRecords.length || 1)
    ),
    downtime: Math.round(
      sameGroupRecords.reduce((acc, r) => acc + r.downtime, 0) /
        (sameGroupRecords.length || 1)
    ),
    specialMetric: Math.round(
      sameGroupRecords.reduce((acc, r) => {
        if (r.group === 'PM') {
          return acc + (r.pmCompletion ?? 0);
        }
        return acc + (r.fiveR ?? 0);
      }, 0) / (sameGroupRecords.length || 1)
    ),
  };

  const finalScore = calculateFinalScore(currentRecord, currentMonth);

  const isPM = currentRecord.group === 'PM';

  // Compute criteria breakdown
  const criteriaRows = [
    {
      name: 'Absensi',
      score: currentRecord.absensi,
      weight: isPM
        ? currentMonth.weightsPM.absensi
        : currentMonth.weightsAD.absensi,
      notes: 'Kehadiran dan kedisiplinan kerja',
      avg: groupAverage.absensi,
    },
    {
      name: 'Downtime',
      score: currentRecord.downtime,
      weight: isPM
        ? currentMonth.weightsPM.downtime
        : currentMonth.weightsAD.downtime,
      notes: 'Pencapaian target penurunan downtime',
      avg: groupAverage.downtime,
    },
    isPM
      ? {
          name: 'PM Completion',
          score: currentRecord.pmCompletion ?? 0,
          weight: currentMonth.weightsPM.pmCompletion,
          notes: 'Penyelesaian rencana kerja Preventive Maintenance',
          avg: groupAverage.specialMetric,
        }
      : {
          name: '5R (Ringkas, Rapi, Resik, Rawat, Rajin)',
          score: currentRecord.fiveR ?? 0,
          weight: currentMonth.weightsAD.fiveR,
          notes: 'Penerapan budaya 5R di area kerja lini',
          avg: groupAverage.specialMetric,
        },
  ];

  // Month history for this specific person
  const personHistory = allMonths
    .map((m) => {
      const rec = allRecords.find(
        (r) => r.monthId === m.id && r.name.toLowerCase() === currentRecord.name.toLowerCase()
      );
      if (!rec) return null;
      return {
        month: m.name,
        monthId: m.id,
        score: calculateFinalScore(rec, m),
        rec,
      };
    })
    .filter(Boolean) as {
    month: string;
    monthId: string;
    score: number;
    rec: AppraisalRecord;
  }[];

  // Recommendations based on lowest KPI
  const lowestScoreItem = [...criteriaRows].sort((a, b) => a.score - b.score)[0];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xs overflow-hidden flex flex-col">
      {/* Top Profile Header */}
      <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-xs">
            {currentRecord.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">
                {currentRecord.name}
              </h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${
                  isPM
                    ? 'bg-amber-950/70 text-amber-300 border-amber-800/80'
                    : 'bg-indigo-950/70 text-indigo-300 border-indigo-800/80'
                }`}
              >
                Group {currentRecord.group}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Evaluasi Periode: <span className="font-semibold text-slate-200">{currentMonth.name}</span>
            </p>
          </div>
        </div>

        {/* Action & Score */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Nilai Akhir</span>
            <div className="flex items-baseline gap-1 justify-end">
              <span className="font-mono text-2xl font-bold text-white tabular-nums">
                {finalScore}
              </span>
              <span className="text-xs text-slate-400 font-medium">/ 100</span>
            </div>
          </div>
          <button
            onClick={() => onEditEmployee(currentRecord)}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors border border-slate-700/60"
            title="Edit nilai karyawan"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Spider Web (Radar Chart) Section */}
      <div className="p-5 flex-1 flex flex-col items-center border-b border-slate-800 bg-slate-900/30">
        <div className="w-full flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <BarChart3 className="w-4 h-4 text-indigo-400" />
            <span>Grafik Laba-Laba (Radar Chart)</span>
          </div>
          <button
            type="button"
            onClick={() => setShowBenchmark(!showBenchmark)}
            className={`text-xs px-2.5 py-1 rounded-md border transition-all ${
              showBenchmark
                ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800/80'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {showBenchmark ? '✓ Rata-rata Group Aktif' : '+ Bandingkan Group'}
          </button>
        </div>

        {/* The Spider Web Chart */}
        <RadarChart
          record={currentRecord}
          monthConfig={currentMonth}
          groupAverage={groupAverage}
          showBenchmark={showBenchmark}
        />

        <div className="w-full mt-3 p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>
              {isPM
                ? 'Group PM: Menilai Absensi, Downtime & PM Completion (5R dikecualikan).'
                : `Group ${currentRecord.group}: Menilai Absensi, Downtime & 5R (PM Completion dikecualikan).`}
            </span>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown Grid */}
      <div className="p-5 bg-slate-900/40 border-b border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Rincian Bobot &amp; Kontribusi Skor
        </h3>

        <div className="space-y-2.5">
          {criteriaRows.map((item, idx) => {
            const contribution = Math.round(((item.score * item.weight) / 100) * 10) / 10;
            const isTargetMet = item.score >= 80;

            return (
              <div
                key={idx}
                className="p-3 rounded-xl border border-slate-800/80 bg-slate-800/40 hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-slate-200">{item.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">
                      Bobot: <strong className="text-slate-200">{item.weight}%</strong>
                    </span>
                    <span className="font-mono font-bold text-white tabular-nums">
                      {item.score} / 100
                    </span>
                  </div>
                </div>

                {/* Progress visual */}
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      item.score >= 90
                        ? 'bg-emerald-500'
                        : item.score >= 80
                        ? 'bg-blue-500'
                        : item.score >= 70
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, item.score)}%` }}
                  />
                  {/* Target 80 line */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-slate-500 z-10"
                    style={{ left: '80%' }}
                    title="Target 80%"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Kontribusi skor akhir: +{contribution} poin</span>
                  <span className={isTargetMet ? 'text-emerald-400 font-medium' : 'text-amber-400 font-medium'}>
                    {isTargetMet ? 'Target tercapai (≥80)' : 'Di bawah target (<80)'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-Month History (if 2+ months exist) */}
      {personHistory.length > 1 && (
        <div className="p-5 bg-slate-900/40 border-b border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
              Perkembangan Nilai Antar Bulan
            </span>
            <span className="text-xs text-slate-400">
              {personHistory.length} periode tercatat
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {personHistory.map((hist) => {
              const isSelected = hist.monthId === currentMonth.id;
              return (
                <div
                  key={hist.monthId}
                  className={`p-2.5 rounded-lg border text-xs transition-all ${
                    isSelected
                      ? 'bg-indigo-950/60 border-indigo-700/80 text-white'
                      : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600 text-slate-300'
                  }`}
                >
                  <p className="text-[11px] text-slate-400 truncate">{hist.month}</p>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-mono font-bold text-sm text-white tabular-nums">
                      {hist.score}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      / 100
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Notes or Recommendation */}
      <div className="p-5 bg-slate-950/50 text-xs">
        <span className="font-semibold text-slate-300 block mb-1">
          Catatan &amp; Fokus Peningkatan:
        </span>
        <p className="text-slate-400 italic">
          {currentRecord.notes ||
            `Fokus perbaikan prioritas untuk ${currentRecord.name} ada pada kriteria ${lowestScoreItem?.name} (skor saat ini: ${lowestScoreItem?.score}). Tingkatkan pemantauan pada shift berikutnya.`}
        </p>
      </div>
    </div>
  );
};
