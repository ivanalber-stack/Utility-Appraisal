import { AppraisalRecord, MonthConfig } from '../types/appraisal';

export const INITIAL_MONTHS: MonthConfig[] = [
  {
    id: '2026-09',
    name: 'September 2026',
    weightsAD: {
      absensi: 30,
      downtime: 35,
      fiveR: 35,
    },
    weightsPM: {
      absensi: 30,
      downtime: 35,
      pmCompletion: 35,
    },
  },
  {
    id: '2026-10',
    name: 'Oktober 2026',
    weightsAD: {
      absensi: 30,
      downtime: 35,
      fiveR: 35,
    },
    weightsPM: {
      absensi: 30,
      downtime: 35,
      pmCompletion: 35,
    },
  },
];

// 17 Anggota Tim Operasional TACO (September 2026 dari sheet asli)
export const SEPTEMBER_RECORDS: AppraisalRecord[] = [
  {
    id: 'rec-sep-1',
    monthId: '2026-09',
    name: 'Shigit Darmawan',
    group: 'B',
    absensi: 95,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Konsisten dalam 5R area produksi, disiplin kehadiran terjaga.',
  },
  {
    id: 'rec-sep-2',
    monthId: '2026-09',
    name: 'Amrih Prayogo',
    group: 'A',
    absensi: 87,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Perlu peningkatan konsistensi absensi shift pagi.',
  },
  {
    id: 'rec-sep-3',
    monthId: '2026-09',
    name: 'Muhamad Fajri',
    group: 'C',
    absensi: 91,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Performa stabil, koordinasi grup berjalan baik.',
  },
  {
    id: 'rec-sep-4',
    monthId: '2026-09',
    name: 'Tri Wanto',
    group: 'D',
    absensi: 96,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Kepatuhan SOP tinggi dan kehadiran prima.',
  },
  {
    id: 'rec-sep-5',
    monthId: '2026-09',
    name: 'Muhammad Sopiyan',
    group: 'A',
    absensi: 100,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Kehadiran sempurna 100%, 5R memenuhi standar.',
  },
  {
    id: 'rec-sep-6',
    monthId: '2026-09',
    name: 'Armad',
    group: 'B',
    absensi: 95,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Kehadiran konsisten, pelaksanaan tugas shift lancar.',
  },
  {
    id: 'rec-sep-7',
    monthId: '2026-09',
    name: 'Angga Bastian',
    group: 'C',
    absensi: 87,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Perlu peningkatan kehadiran.',
  },
  {
    id: 'rec-sep-8',
    monthId: '2026-09',
    name: 'Joko Supriyanto',
    group: 'D',
    absensi: 87,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Perlu peningkatan kehadiran.',
  },
  {
    id: 'rec-sep-9',
    monthId: '2026-09',
    name: 'Muhammad Budi Prasetyo',
    group: 'PM',
    absensi: 91,
    downtime: 60,
    pmCompletion: 80,
    fiveR: null,
    notes: 'Penyelesaian PM 80%, downtime terkendali.',
  },
  {
    id: 'rec-sep-10',
    monthId: '2026-09',
    name: 'Ivan Alber',
    group: 'PM',
    absensi: 91,
    downtime: 60,
    pmCompletion: 80,
    fiveR: null,
    notes: 'Penyelesaian PM 80%, downtime terkendali.',
  },
  {
    id: 'rec-sep-11',
    monthId: '2026-09',
    name: 'Ade Setiawan',
    group: 'A',
    absensi: 91,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: '5R berjalan baik, koordinasi tim solid.',
  },
  {
    id: 'rec-sep-12',
    monthId: '2026-09',
    name: 'Sugiarto',
    group: 'D',
    absensi: 100,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Kehadiran 100% prima, implementasi 5R rapi.',
  },
  {
    id: 'rec-sep-13',
    monthId: '2026-09',
    name: 'Mohamad Syarif',
    group: 'A',
    absensi: 95,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Kehadiran baik, disiplin kerja terjaga.',
  },
  {
    id: 'rec-sep-14',
    monthId: '2026-09',
    name: 'Damba',
    group: 'B',
    absensi: 100,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Presensi 100%, eksekusi tugas shift berjalan lancar.',
  },
  {
    id: 'rec-sep-15',
    monthId: '2026-09',
    name: 'Misnan',
    group: 'C',
    absensi: 100,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Kehadiran 100%, aktif memimpin 5R ringkas dan resik.',
  },
  {
    id: 'rec-sep-16',
    monthId: '2026-09',
    name: 'Muhammad Rafi',
    group: 'C',
    absensi: 91,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Pencapaian stabil, perlu sedikit penajaman pencegahan downtime.',
  },
  {
    id: 'rec-sep-17',
    monthId: '2026-09',
    name: 'Sanudin',
    group: 'D',
    absensi: 100,
    downtime: 50,
    pmCompletion: null,
    fiveR: 80,
    notes: 'Kehadiran 100%, kerjasama tim shift D sangat solid.',
  },
];

// Daftar 17 Anggota Tim Resmi Operasional TACO (Presisi & Terkunci 17 Orang)
export interface OfficialTeamMember {
  idSuffix: string;
  name: string;
  group: 'A' | 'B' | 'C' | 'D' | 'PM';
}

export const OFFICIAL_TEAM_MEMBERS: OfficialTeamMember[] = [
  { idSuffix: '1', name: 'Shigit Darmawan', group: 'B' },
  { idSuffix: '2', name: 'Amrih Prayogo', group: 'A' },
  { idSuffix: '3', name: 'Muhamad Fajri', group: 'C' },
  { idSuffix: '4', name: 'Tri Wanto', group: 'D' },
  { idSuffix: '5', name: 'Muhammad Sopiyan', group: 'A' },
  { idSuffix: '6', name: 'Armad', group: 'B' },
  { idSuffix: '7', name: 'Angga Bastian', group: 'C' },
  { idSuffix: '8', name: 'Joko Supriyanto', group: 'D' },
  { idSuffix: '9', name: 'Muhammad Budi Prasetyo', group: 'PM' },
  { idSuffix: '10', name: 'Ivan Alber', group: 'PM' },
  { idSuffix: '11', name: 'Ade Setiawan', group: 'A' },
  { idSuffix: '12', name: 'Sugiarto', group: 'D' },
  { idSuffix: '13', name: 'Mohamad Syarif', group: 'A' },
  { idSuffix: '14', name: 'Damba', group: 'B' },
  { idSuffix: '15', name: 'Misnan', group: 'C' },
  { idSuffix: '16', name: 'Muhammad Rafi', group: 'C' },
  { idSuffix: '17', name: 'Sanudin', group: 'D' },
];

/**
 * Mencocokkan string nama dari Google Sheet ke salah satu dari 17 anggota tim resmi
 */
export function matchOfficialMember(rawName: string): OfficialTeamMember | null {
  if (!rawName) return null;
  const clean = rawName.toLowerCase().trim();
  if (
    clean === '' ||
    clean === '-' ||
    clean.includes('total') ||
    clean.includes('rata') ||
    clean.includes('average') ||
    clean.includes('jumlah') ||
    clean.includes('karyawan') ||
    clean.includes('target') ||
    clean.includes('bobot') ||
    clean.includes('score')
  ) {
    return null;
  }

  // 1. Pencocokan langsung (case insensitive)
  const exact = OFFICIAL_TEAM_MEMBERS.find(
    (m) => m.name.toLowerCase() === clean
  );
  if (exact) return exact;

  // 2. Normalisasi awalan nama Indonesia (M., Muh., Moh., Moch., Sigit/Shigit)
  const simplify = (str: string) =>
    str
      .toLowerCase()
      .replace(/^(m\.|muh\.|moh\.|moch\.|muhammad\s+|mohamad\s+|muhamad\s+)/i, '')
      .replace(/shigit/g, 'sigit')
      .replace(/[^a-z0-9]/g, '');

  const simplifiedTarget = simplify(clean);
  if (!simplifiedTarget) return null;

  const found = OFFICIAL_TEAM_MEMBERS.find((m) => {
    const simplifiedOfficial = simplify(m.name);
    return (
      simplifiedOfficial === simplifiedTarget ||
      simplifiedOfficial.includes(simplifiedTarget) ||
      simplifiedTarget.includes(simplifiedOfficial)
    );
  });

  return found || null;
}

/**
 * Membuat 17 data karyawan standar kosong untuk suatu bulan
 */
export function createDefaultMonthRecords(monthId: string): AppraisalRecord[] {
  return OFFICIAL_TEAM_MEMBERS.map((m) => ({
    id: `rec-${monthId}-${m.idSuffix}`,
    monthId,
    name: m.name,
    group: m.group,
    absensi: null,
    downtime: null,
    pmCompletion: null,
    fiveR: null,
    finalScore: null,
    notes: '',
  }));
}

// Data Awal: September 2026 (terisi) & Oktober 2026 (17 orang anggota tim yang sama, nilai masih kosong / belum dinilai)
export const INITIAL_RECORDS: AppraisalRecord[] = [
  ...SEPTEMBER_RECORDS,
  ...createDefaultMonthRecords('2026-10'),
];

/**
 * Membersihkan data records agar SETIAP BULAN TEPAT MEMILIKI 17 KARYAWAN RESMI.
 * Menghilangkan baris berlebih, duplikat, atau nama yang bukan anggota tim.
 */
export function sanitizeRecordsToOfficial17(
  rawRecords: AppraisalRecord[],
  months: MonthConfig[]
): AppraisalRecord[] {
  const result: AppraisalRecord[] = [];

  for (const month of months) {
    const monthRaw = rawRecords.filter((r) => r.monthId === month.id);

    // Untuk masing-masing dari 17 anggota tim resmi
    for (const official of OFFICIAL_TEAM_MEMBERS) {
      const matched = monthRaw.find((r) => {
        const m = matchOfficialMember(r.name);
        return m && m.name === official.name;
      });

      if (matched) {
        // Cek apakah kriteria terisi
        const hasCriteria =
          matched.absensi !== null &&
          matched.absensi !== undefined &&
          matched.downtime !== null &&
          matched.downtime !== undefined;

        result.push({
          ...matched,
          id: matched.id || `rec-${month.id}-${official.idSuffix}`,
          monthId: month.id,
          name: official.name,
          group: official.group,
          finalScore: hasCriteria ? matched.finalScore : null,
        });
      } else {
        // Jika belum ada di data, buat default kosong
        result.push({
          id: `rec-${month.id}-${official.idSuffix}`,
          monthId: month.id,
          name: official.name,
          group: official.group,
          absensi: null,
          downtime: null,
          pmCompletion: null,
          fiveR: null,
          finalScore: null,
          notes: '',
        });
      }
    }
  }

  return result;
}

/**
 * Menerapkan data impor ke 17 anggota resmi per bulan.
 * Memastikan jumlah karyawan TIDAK PERNAH MELEBIHI 17 ORANG PER BULAN.
 */
export function applyImportedToOfficialRecords(
  currentRecords: AppraisalRecord[],
  importedRecords: AppraisalRecord[],
  months: MonthConfig[],
  activeMonthId: string
): AppraisalRecord[] {
  // Buat map pencarian dari data yang diimpor: key = `${monthId}_${officialName}`
  const importMap = new Map<string, AppraisalRecord>();

  for (const imp of importedRecords) {
    const matchedMember = matchOfficialMember(imp.name);
    if (!matchedMember) continue;

    // Tentukan monthId: jika imp.monthId dikenali gunakan itu, jika tidak gunakan activeMonthId
    const targetMonthId = months.some((m) => m.id === imp.monthId)
      ? imp.monthId
      : activeMonthId;

    const key = `${targetMonthId}_${matchedMember.name.toLowerCase()}`;
    importMap.set(key, {
      ...imp,
      monthId: targetMonthId,
      name: matchedMember.name,
      group: matchedMember.group,
    });
  }

  // Rekonstruksi seluruh data bulan agar setiap bulan tetap tepat 17 orang
  const updatedRecords: AppraisalRecord[] = [];

  for (const month of months) {
    const currentMonthData = currentRecords.filter((r) => r.monthId === month.id);

    for (const official of OFFICIAL_TEAM_MEMBERS) {
      const key = `${month.id}_${official.name.toLowerCase()}`;
      const imported = importMap.get(key);

      if (imported) {
        // Cek apakah nilai kriteria benar-benar terisi
        const hasCriteria =
          imported.absensi !== null &&
          imported.absensi !== undefined &&
          imported.downtime !== null &&
          imported.downtime !== undefined;

        updatedRecords.push({
          id: `rec-${month.id}-${official.idSuffix}`,
          monthId: month.id,
          name: official.name,
          group: official.group,
          absensi: imported.absensi,
          downtime: imported.downtime,
          pmCompletion: official.group === 'PM' ? imported.pmCompletion : null,
          fiveR: official.group !== 'PM' ? imported.fiveR : null,
          finalScore: hasCriteria ? imported.finalScore : null,
          notes: imported.notes || '',
        });
      } else {
        // Pertahankan record lama atau default
        const existing = currentMonthData.find((r) => {
          const m = matchOfficialMember(r.name);
          return m && m.name === official.name;
        });

        if (existing) {
          const hasCriteria =
            existing.absensi !== null &&
            existing.absensi !== undefined &&
            existing.downtime !== null &&
            existing.downtime !== undefined;

          updatedRecords.push({
            ...existing,
            id: existing.id || `rec-${month.id}-${official.idSuffix}`,
            monthId: month.id,
            name: official.name,
            group: official.group,
            finalScore: hasCriteria ? existing.finalScore : null,
          });
        } else {
          updatedRecords.push({
            id: `rec-${month.id}-${official.idSuffix}`,
            monthId: month.id,
            name: official.name,
            group: official.group,
            absensi: null,
            downtime: null,
            pmCompletion: null,
            fiveR: null,
            finalScore: null,
            notes: '',
          });
        }
      }
    }
  }

  return updatedRecords;
}
