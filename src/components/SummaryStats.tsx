import React from 'react';
import { Users, Award, SlidersHorizontal, TrendingUp } from 'lucide-react';
import { AppraisalRecord, MonthConfig, calculateFinalScore } from '../types/appraisal';

interface SummaryStatsProps {
  records: AppraisalRecord[];
  currentMonth: MonthConfig;
  onOpenWeightSettings: () => void;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  records,
  currentMonth,
  onOpenWeightSettings,
}) => {
  const monthRecords = records.filter((r) => r.monthId === currentMonth.id);

  const totalEmployees = monthRecords.length;

  const assessedRecords = monthRecords.filter((r) => {
    const s = r.finalScore ?? calculateFinalScore(r, currentMonth);
    return s !== null && s !== undefined && !isNaN(s);
  });

  const averageScore = assessedRecords.length
    ? Math.round(
        (assessedRecords.reduce(
          (acc, r) => acc + (r.finalScore ?? calculateFinalScore(r, currentMonth) ?? 0),
          0
        ) /
          assessedRecords.length) *
          10
      ) / 10
    : null;

  const topPerformer = assessedRecords.length
    ? [...assessedRecords].sort(
        (a, b) =>
          (b.finalScore ?? calculateFinalScore(b, currentMonth) ?? 0) -
          (a.finalScore ?? calculateFinalScore(a, currentMonth) ?? 0)
      )[0]
    : null;

  const topPerformerScore = topPerformer
    ? (topPerformer.finalScore ?? calculateFinalScore(topPerformer, currentMonth))
    : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
      {/* 1. Total Karyawan */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Total Karyawan</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
              {totalEmployees}
            </span>
            <span className="text-xs text-slate-400">orang ({currentMonth.name})</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
          <Users className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Rata-rata Skor Keseluruhan */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-2xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">Rata-rata Skor Bulan Ini</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold font-mono tracking-tight text-white tabular-nums">
              {averageScore !== null ? averageScore : '-'}
            </span>
            <span className="text-xs text-slate-400">{averageScore !== null ? '/ 100' : '(Belum dinilai)'}</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
          <Award className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Top Performer */}
      <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-2xs flex items-center justify-between">
        <div className="overflow-hidden">
          <p className="text-xs font-medium text-slate-400">Top Performer</p>
          <div className="mt-1">
            <p className="text-sm font-bold text-white truncate">
              {topPerformer ? topPerformer.name : 'Belum Ada Penilaian'}
            </p>
            <p className="text-xs text-slate-400 font-mono">
              {topPerformer && topPerformerScore !== null ? (
                <>Skor: <span className="font-semibold text-indigo-400">{topPerformerScore}</span> (Group {topPerformer.group})</>
              ) : (
                <span className="text-slate-500 italic">Nilai masih kosong</span>
              )}
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Bobot Aktif & Tombol Ubah */}
      <div
        onClick={onOpenWeightSettings}
        className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 shadow-2xs flex items-center justify-between cursor-pointer hover:border-indigo-600/60 transition-colors group"
      >
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium text-slate-400">Bobot Aktif</p>
            <span className="text-[10px] text-indigo-400 font-semibold group-hover:underline">
              Ubah
            </span>
          </div>
          <div className="mt-1 text-xs text-slate-300 space-y-0.5 font-mono">
            <p className="truncate">
              <strong className="text-slate-100">A-D:</strong> {currentMonth.weightsAD.absensi}/{currentMonth.weightsAD.downtime}/{currentMonth.weightsAD.fiveR}%
            </p>
            <p className="truncate">
              <strong className="text-slate-100">PM:</strong> {currentMonth.weightsPM.absensi}/{currentMonth.weightsPM.downtime}/{currentMonth.weightsPM.pmCompletion}%
            </p>
          </div>
        </div>
        <div className="w-10 h-10 rounded-xl bg-purple-950/80 border border-purple-800/50 flex items-center justify-center text-purple-400 shrink-0 group-hover:scale-105 transition-transform">
          <SlidersHorizontal className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
