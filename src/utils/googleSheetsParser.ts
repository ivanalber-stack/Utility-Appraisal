import { AppraisalRecord, EmployeeGroup, MonthConfig, calculateFinalScore } from '../types/appraisal';
import { matchOfficialMember } from '../data/initialData';

/**
 * Ekstrak ID Spreadsheet dari URL Google Sheets
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Membersihkan angka dari format persentase, koma, dsb.
 * Mengembalikan null jika sel kosong, "-", atau bukan angka.
 */
export function parseNullableNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;
  const str = String(val).trim().replace('%', '').replace(',', '.');
  if (str === '' || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') {
    return null;
  }
  const parsed = parseFloat(str);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Normalisasi nama bulan menjadi monthId (contoh: "Oktober 2026" -> "2026-10")
 */
export function normalizeMonthToId(monthStr: string, fallbackId: string): string {
  if (!monthStr) return fallbackId;
  const m = monthStr.toLowerCase().trim();
  if (m.includes('sep') || m.includes('09')) return '2026-09';
  if (m.includes('okt') || m.includes('oct') || m.includes('10')) return '2026-10';
  if (m.includes('nov') || m.includes('11')) return '2026-11';
  if (m.includes('des') || m.includes('dec') || m.includes('12')) return '2026-12';
  if (m.includes('jan') || m.includes('01')) return '2027-01';
  if (m.includes('feb') || m.includes('02')) return '2027-02';
  if (m.includes('mar') || m.includes('03')) return '2027-03';
  if (m.includes('apr') || m.includes('04')) return '2027-04';
  if (m.includes('mei') || m.includes('may') || m.includes('05')) return '2027-05';
  if (m.includes('jun') || m.includes('06')) return '2027-06';
  if (m.includes('jul') || m.includes('07')) return '2027-07';
  if (m.includes('agu') || m.includes('aug') || m.includes('08')) return '2027-08';
  return fallbackId;
}

interface GVizCell {
  v?: unknown;
  f?: string;
}

interface GVizRow {
  c?: (GVizCell | null)[];
}

/**
 * Mengambil data secara langsung dari Google Spreadsheet publik melalui Google Visualization API (GViz).
 * Menjamin hanya 17 anggota tim resmi yang diproses, mengikuti kolom Bulan, dan menjaga nilai kosong tetap null.
 */
export async function fetchFromGoogleSheetGViz(
  spreadsheetUrl: string,
  currentMonth: MonthConfig
): Promise<AppraisalRecord[]> {
  const sheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!sheetId) {
    throw new Error('Link Google Spreadsheet tidak valid. Pastikan link memiliki format https://docs.google.com/spreadsheets/d/...');
  }

  // Gunakan timestamp untuk cache-busting agar real-time
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&t=${Date.now()}`;
  
  const res = await fetch(gvizUrl);
  if (!res.ok) {
    throw new Error(`Gagal membaca Google Spreadsheet (Status: ${res.status}). Pastikan hak akses Spreadsheet diatur ke "Siapa saja yang memiliki link dapat melihat".`);
  }

  const text = await res.text();
  const startIdx = text.indexOf('{');
  const endIdx = text.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Format respon Google Spreadsheet tidak dikenali.');
  }

  const jsonStr = text.substring(startIdx, endIdx + 1);
  const data = JSON.parse(jsonStr);

  if (!data.table || !data.table.rows || !data.table.cols) {
    throw new Error('Tidak ada data tabel yang ditemukan di Google Spreadsheet.');
  }

  const rows: GVizRow[] = data.table.rows;
  const cols = data.table.cols;

  // Mapping index kolom
  const colMap = {
    bulan: -1,
    name: -1,
    group: -1,
    absensi: -1,
    downtime: -1,
    pmCompletion: -1,
    fiveR: -1,
    nilaiAkhir: -1,
    notes: -1,
  };

  // 1. Cek cols metadata dari GViz
  cols.forEach((c: { label?: string; id?: string }, idx: number) => {
    const colName = (c?.label || c?.id || '').toLowerCase().trim();
    if (colName.includes('bulan') || colName.includes('month') || colName.includes('periode')) colMap.bulan = idx;
    else if (colName.includes('nama') || colName === 'name' || colName === 'karyawan') colMap.name = idx;
    else if (colName.includes('group') || colName.includes('grup') || colName === 'grp') colMap.group = idx;
    else if (colName.includes('absen')) colMap.absensi = idx;
    else if (colName.includes('down')) colMap.downtime = idx;
    else if (colName.includes('pm') && !colName.includes('group')) colMap.pmCompletion = idx;
    else if (colName.includes('5r') || colName.includes('5 r')) colMap.fiveR = idx;
    else if (colName.includes('nilai') || colName.includes('akhir') || colName === 'total' || colName === 'score') colMap.nilaiAkhir = idx;
    else if (colName.includes('catatan') || colName.includes('note') || colName.includes('ket')) colMap.notes = idx;
  });

  // 2. Scan 5 baris pertama untuk mencari baris header jika belum lengkap
  let startRowIndex = 0;
  for (let r = 0; r < Math.min(5, rows.length); r++) {
    const row = rows[r];
    if (!row || !row.c) continue;

    let matchedHeadersCount = 0;
    row.c.forEach((cell, idx) => {
      const v = String(cell?.v || cell?.f || '').toLowerCase().trim();
      if (v.includes('bulan') || v.includes('month') || v.includes('periode')) {
        colMap.bulan = idx;
        matchedHeadersCount++;
      } else if (v.includes('nama') || v === 'name' || v === 'karyawan') {
        colMap.name = idx;
        matchedHeadersCount++;
      } else if (v.includes('group') || v.includes('grup') || v === 'grp') {
        colMap.group = idx;
        matchedHeadersCount++;
      } else if (v.includes('absen')) {
        colMap.absensi = idx;
        matchedHeadersCount++;
      } else if (v.includes('down')) {
        colMap.downtime = idx;
        matchedHeadersCount++;
      } else if (v.includes('pm') && !v.includes('group')) {
        colMap.pmCompletion = idx;
        matchedHeadersCount++;
      } else if (v.includes('5r') || v.includes('5 r')) {
        colMap.fiveR = idx;
        matchedHeadersCount++;
      } else if (v.includes('nilai') || v.includes('akhir')) {
        colMap.nilaiAkhir = idx;
        matchedHeadersCount++;
      }
    });

    if (matchedHeadersCount >= 2 && colMap.name !== -1) {
      startRowIndex = r + 1;
      break;
    }
  }

  // Fallbacks index jika nama tidak terdeteksi
  if (colMap.name === -1) colMap.name = cols.length > 1 ? 1 : 0;
  if (colMap.group === -1) colMap.group = colMap.name + 1;
  if (colMap.absensi === -1) colMap.absensi = colMap.group + 1;
  if (colMap.downtime === -1) colMap.downtime = colMap.absensi + 1;
  if (colMap.pmCompletion === -1) colMap.pmCompletion = colMap.downtime + 1;
  if (colMap.fiveR === -1) colMap.fiveR = colMap.pmCompletion + 1;
  if (colMap.nilaiAkhir === -1) colMap.nilaiAkhir = colMap.fiveR + 1;

  const records: AppraisalRecord[] = [];
  const seenEmployeesPerMonth: Record<string, boolean> = {};

  // Track bulan bagian saat ini (mendukung merged cells atau header per bagian bulan)
  let currentSectionMonthId = currentMonth.id;

  for (let r = startRowIndex; r < rows.length; r++) {
    const row = rows[r];
    if (!row || !row.c) continue;

    const getVal = (idx: number): unknown => {
      if (idx < 0 || idx >= row.c!.length || !row.c![idx]) return null;
      return row.c![idx]!.v ?? row.c![idx]!.f ?? null;
    };

    // Cek apakah baris ini adalah header seksi bulan (misal "BULAN OKTOBER 2026")
    const rowFullText = row.c
      .map((c) => String(c?.v || c?.f || ''))
      .join(' ')
      .trim();
    if (rowFullText.toLowerCase().includes('bulan') || rowFullText.toLowerCase().includes('periode')) {
      const detectedMonth = normalizeMonthToId(rowFullText, '');
      if (detectedMonth) {
        currentSectionMonthId = detectedMonth;
      }
    }

    const rawName = String(getVal(colMap.name) || '').trim();
    if (!rawName) continue;

    // Pastikan baris ini adalah salah satu dari 17 anggota tim resmi TACO
    const officialMember = matchOfficialMember(rawName);
    if (!officialMember) {
      // Baris ini bukan anggota tim (bisa jadi baris total, rata-rata, header, dll) -> Lewati!
      continue;
    }

    // Tentukan bulan baris ini
    let rowMonthId = currentSectionMonthId;
    if (colMap.bulan !== -1) {
      const rawMonthVal = String(getVal(colMap.bulan) || '').trim();
      if (rawMonthVal) {
        rowMonthId = normalizeMonthToId(rawMonthVal, currentSectionMonthId);
        currentSectionMonthId = rowMonthId; // Simpan untuk baris berikutnya jika sel dimerge
      }
    }

    // Cegah duplikasi anggota tim yang sama di bulan yang sama (maksimal tepat 17 orang per bulan)
    const dedupKey = `${rowMonthId}_${officialMember.name.toLowerCase()}`;
    if (seenEmployeesPerMonth[dedupKey]) {
      continue;
    }
    seenEmployeesPerMonth[dedupKey] = true;

    // Baca nilai kriteria
    const rawGrp = String(getVal(colMap.group) || '').trim().toUpperCase();
    const group: EmployeeGroup =
      rawGrp === 'PM' || rawGrp === 'A' || rawGrp === 'B' || rawGrp === 'C' || rawGrp === 'D'
        ? (rawGrp as EmployeeGroup)
        : officialMember.group;

    const absensi = parseNullableNumber(getVal(colMap.absensi));
    const downtime = parseNullableNumber(getVal(colMap.downtime));
    
    const pmRaw = getVal(colMap.pmCompletion);
    const pmCompletion = parseNullableNumber(pmRaw);
    
    const f5Raw = getVal(colMap.fiveR);
    const fiveR = parseNullableNumber(f5Raw) ?? (group !== 'PM' ? pmCompletion : null);

    const nilaiAkhirRaw = getVal(colMap.nilaiAkhir);
    const finalScoreVal = parseNullableNumber(nilaiAkhirRaw);

    // KUNCI: Cek apakah kriteria terisi. Jika kosong (misal di bulan Oktober), nilai akhir HARUS null!
    const hasCriteria = absensi !== null && downtime !== null;

    let finalScore: number | null = null;
    if (hasCriteria) {
      if (finalScoreVal !== null) {
        finalScore = finalScoreVal;
      } else {
        const tempRecord: AppraisalRecord = {
          id: `${rowMonthId}-${officialMember.idSuffix}`,
          monthId: rowMonthId,
          name: officialMember.name,
          group,
          absensi,
          downtime,
          pmCompletion: group === 'PM' ? pmCompletion : null,
          fiveR: group !== 'PM' ? fiveR : null,
        };
        finalScore = calculateFinalScore(tempRecord, currentMonth);
      }
    }

    const record: AppraisalRecord = {
      id: `${rowMonthId}-${officialMember.idSuffix}`,
      monthId: rowMonthId,
      name: officialMember.name,
      group,
      absensi,
      downtime,
      pmCompletion: group === 'PM' ? pmCompletion : null,
      fiveR: group !== 'PM' ? fiveR : null,
      finalScore,
      notes: String(getVal(colMap.notes) || ''),
    };

    records.push(record);
  }

  return records;
}
