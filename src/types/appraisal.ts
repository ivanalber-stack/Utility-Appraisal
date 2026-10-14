export type EmployeeGroup = 'A' | 'B' | 'C' | 'D' | 'PM';

export interface GroupADWeights {
  absensi: number; // e.g. 30 (%)
  downtime: number; // e.g. 35 (%)
  fiveR: number; // e.g. 35 (%)
}

export interface GroupPMWeights {
  absensi: number; // e.g. 30 (%)
  downtime: number; // e.g. 35 (%)
  pmCompletion: number; // e.g. 35 (%)
}

export interface MonthConfig {
  id: string; // e.g. "2026-09"
  name: string; // e.g. "September 2026"
  weightsAD: GroupADWeights;
  weightsPM: GroupPMWeights;
}

export interface AppraisalRecord {
  id: string;
  monthId: string; // "2026-09"
  name: string;
  group: EmployeeGroup;
  absensi: number | null; // 0 - 100 or null if empty
  downtime: number | null; // 0 - 100 or null if empty
  pmCompletion: number | null; // only for PM, null for A-D or empty
  fiveR: number | null; // only for A-D, null for PM or empty
  notes?: string;
  finalScore?: number | null; // optional cached or calculated score (null if unassessed)
}

export interface EvaluationCriteria {
  key: 'absensi' | 'downtime' | 'fiveR' | 'pmCompletion';
  label: string;
  description: string;
  applicableTo: 'ALL' | 'AD' | 'PM';
}

export const CRITERIA_DEFINITIONS: Record<string, EvaluationCriteria> = {
  absensi: {
    key: 'absensi',
    label: 'Absensi',
    description: 'Tingkat kehadiran & disiplin kerja',
    applicableTo: 'ALL',
  },
  downtime: {
    key: 'downtime',
    label: 'Downtime',
    description: 'Pencapaian target minimalisasi downtime mesin/jalur',
    applicableTo: 'ALL',
  },
  fiveR: {
    key: 'fiveR',
    label: '5R',
    description: 'Penerapan Ringkas, Rapi, Resik, Rawat, Rajin',
    applicableTo: 'AD',
  },
  pmCompletion: {
    key: 'pmCompletion',
    label: 'PM Completion',
    description: 'Penyelesaian rencana kerja Preventive Maintenance',
    applicableTo: 'PM',
  },
};

/**
 * Calculates final score for an employee based on month weights and group rules.
 * Returns null if criteria are empty / not yet assessed.
 */
export function calculateFinalScore(
  record: AppraisalRecord,
  monthConfig: MonthConfig
): number | null {
  if (
    record.absensi === null ||
    record.absensi === undefined ||
    record.downtime === null ||
    record.downtime === undefined
  ) {
    return null;
  }

  if (record.group === 'PM') {
    if (record.pmCompletion === null || record.pmCompletion === undefined) {
      return null;
    }
    const w = monthConfig.weightsPM;
    const totalWeight = w.absensi + w.downtime + w.pmCompletion;
    if (totalWeight <= 0) return null;
    const score =
      (record.absensi * w.absensi +
        record.downtime * w.downtime +
        record.pmCompletion * w.pmCompletion) /
      totalWeight;
    return Math.round(score * 10) / 10;
  } else {
    if (record.fiveR === null || record.fiveR === undefined) {
      return null;
    }
    const w = monthConfig.weightsAD;
    const totalWeight = w.absensi + w.downtime + w.fiveR;
    if (totalWeight <= 0) return null;
    const score =
      (record.absensi * w.absensi +
        record.downtime * w.downtime +
        record.fiveR * w.fiveR) /
      totalWeight;
    return Math.round(score * 10) / 10;
  }
}

export interface GradeInfo {
  grade: 'A' | 'B' | 'C' | 'D' | '-';
  label: string;
  badgeClass: string;
  description: string;
}

export function getGradeInfo(score: number | null | undefined): GradeInfo {
  if (score === null || score === undefined) {
    return {
      grade: '-',
      label: 'Belum Dinilai',
      badgeClass: 'text-slate-400 bg-slate-800/80 border-slate-700',
      description: 'Nilai kriteria belum diisi untuk periode ini',
    };
  }

  if (score >= 90) {
    return {
      grade: 'A',
      label: 'Sangat Baik',
      badgeClass: 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80',
      description: 'Performa istimewa melampaui seluruh target KPI',
    };
  } else if (score >= 80) {
    return {
      grade: 'B',
      label: 'Baik',
      badgeClass: 'text-blue-400 bg-blue-950/70 border-blue-800/80',
      description: 'Memenuhi seluruh ekspektasi target kerja operasional',
    };
  } else if (score >= 70) {
    return {
      grade: 'C',
      label: 'Cukup',
      badgeClass: 'text-amber-400 bg-amber-950/70 border-amber-800/80',
      description: 'Memerlukan pembinaan pada beberapa aspek penilaian',
    };
  } else {
    return {
      grade: 'D',
      label: 'Kurang',
      badgeClass: 'text-rose-400 bg-rose-950/70 border-rose-800/80',
      description: 'Perlu evaluasi intensif & corrective action plan',
    };
  }
}
