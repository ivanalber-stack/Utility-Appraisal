import { AppraisalRecord, EmployeeGroup, MonthConfig, calculateFinalScore } from '../types/appraisal';

/**
 * Ekstrak ID Spreadsheet dari URL Google Sheets
 * Contoh: https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Membersihkan angka dari format persentase, koma, dsb.
 */
export function cleanNumber(val: unknown): number {
  if (val === null || val === undefined || val === '' || val === '-' || val === 'N/A') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace('%', '').replace(',', '.');
  const parsed = parseFloat(str);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Mengambil data secara langsung dari Google Spreadsheet publik melalui Google Visualization API (GViz)
 * Mendukung real-time tanpa perlu deployment Apps Script jika Spreadsheet dibagikan ("Siapa saja yang memiliki link")
 */
export async function fetchFromGoogleSheetGViz(
  spreadsheetUrl: string,
  currentMonth: MonthConfig
): Promise<AppraisalRecord[]> {
  const sheetId = extractSpreadsheetId(spreadsheetUrl);
  if (!sheetId) {
    throw new Error('Link Google Spreadsheet tidak valid. Pastikan link memiliki format https://docs.google.com/spreadsheets/d/...');
  }

  // Coba ambil via gviz endpoint
  const gvizUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&t=${Date.now()}`;
  
  const res = await fetch(gvizUrl);
  if (!res.ok) {
    throw new Error(`Gagal membaca Google Spreadsheet (Status: ${res.status}). Pastikan hak akses Spreadsheet diatur ke "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view).`);
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

  const cols: string[] = data.table.cols.map((c: { label?: string; id?: string }) => (c?.label || c?.id || '').toLowerCase().trim());
  
  // Mapping kolom
  const colMap = {
    name: -1,
    group: -1,
    absensi: -1,
    downtime: -1,
    pmCompletion: -1,
    fiveR: -1,
    nilaiAkhir: -1,
    notes: -1,
  };

  cols.forEach((colName, idx) => {
    if (colName.includes('nama') || colName === 'name' || colName === 'karyawan') colMap.name = idx;
    else if (colName.includes('group') || colName.includes('grup') || colName === 'grp') colMap.group = idx;
    else if (colName.includes('absen')) colMap.absensi = idx;
    else if (colName.includes('down')) colMap.downtime = idx;
    else if (colName.includes('pm') && !colName.includes('group')) colMap.pmCompletion = idx;
    else if (colName.includes('5r') || colName.includes('5 r')) colMap.fiveR = idx;
    else if (colName.includes('nilai') || colName.includes('akhir') || colName === 'total') colMap.nilaiAkhir = idx;
    else if (colName.includes('catatan') || colName.includes('note') || colName.includes('ket')) colMap.notes = idx;
  });

  // Jika baris pertama mungkin sebenarnya adalah label
  const firstRow = data.table.rows[0];
  let startRowIndex = 0;
  if (colMap.name === -1 && firstRow && Array.isArray(firstRow.c)) {
    firstRow.c.forEach((cell: { v?: unknown } | null, idx: number) => {
      const v = String(cell?.v || '').toLowerCase().trim();
      if (v.includes('nama') || v === 'name' || v === 'karyawan') colMap.name = idx;
      else if (v.includes('group') || v.includes('grup')) colMap.group = idx;
      else if (v.includes('absen')) colMap.absensi = idx;
      else if (v.includes('down')) colMap.downtime = idx;
      else if (v.includes('pm') && !v.includes('group')) colMap.pmCompletion = idx;
      else if (v.includes('5r') || v.includes('5 r')) colMap.fiveR = idx;
      else if (v.includes('nilai') || v.includes('akhir')) colMap.nilaiAkhir = idx;
    });
    if (colMap.name !== -1) {
      startRowIndex = 1;
    }
  }

  // Fallback index standar jika label kosong
  if (colMap.name === -1) colMap.name = cols.length > 1 ? 1 : 0;
  if (colMap.group === -1) colMap.group = colMap.name + 1;
  if (colMap.absensi === -1) colMap.absensi = colMap.group + 1;
  if (colMap.downtime === -1) colMap.downtime = colMap.absensi + 1;
  if (colMap.pmCompletion === -1) colMap.pmCompletion = colMap.downtime + 1;
  if (colMap.fiveR === -1) colMap.fiveR = colMap.pmCompletion + 1;
  if (colMap.nilaiAkhir === -1) colMap.nilaiAkhir = colMap.fiveR + 1;

  const records: AppraisalRecord[] = [];

  for (let r = startRowIndex; r < data.table.rows.length; r++) {
    const row = data.table.rows[r];
    if (!row || !row.c) continue;

    const getVal = (idx: number): unknown => {
      if (idx < 0 || idx >= row.c.length || !row.c[idx]) return null;
      return row.c[idx].v ?? row.c[idx].f ?? null;
    };

    const rawName = String(getVal(colMap.name) || '').trim();
    if (!rawName || rawName === '-' || rawName.toLowerCase() === 'nama karyawan' || rawName.toLowerCase() === 'name') {
      continue;
    }

    const rawGrp = String(getVal(colMap.group) || '').trim().toUpperCase();
    const group: EmployeeGroup =
      rawGrp === 'PM' || rawGrp === 'A' || rawGrp === 'B' || rawGrp === 'C' || rawGrp === 'D'
        ? (rawGrp as EmployeeGroup)
        : 'A';

    const absensi = cleanNumber(getVal(colMap.absensi));
    const downtime = cleanNumber(getVal(colMap.downtime));
    
    const pmRaw = getVal(colMap.pmCompletion);
    const pmCompletion = (pmRaw !== null && pmRaw !== '' && pmRaw !== '-') ? cleanNumber(pmRaw) : null;
    
    const f5Raw = getVal(colMap.fiveR);
    const fiveR = (f5Raw !== null && f5Raw !== '' && f5Raw !== '-') ? cleanNumber(f5Raw) : (group !== 'PM' ? pmCompletion : null);

    const nilaiAkhirRaw = getVal(colMap.nilaiAkhir);
    const finalScoreVal = cleanNumber(nilaiAkhirRaw);

    const record: AppraisalRecord = {
      id: `${currentMonth.id}-gviz-${r + 1}`,
      monthId: currentMonth.id,
      name: rawName,
      group,
      absensi,
      downtime,
      pmCompletion: group === 'PM' ? (pmCompletion ?? 0) : null,
      fiveR: group !== 'PM' ? (fiveR ?? 0) : null,
      finalScore: finalScoreVal > 0 ? finalScoreVal : 0,
      notes: String(getVal(colMap.notes) || ''),
    };

    if (record.finalScore === 0) {
      record.finalScore = calculateFinalScore(record, currentMonth);
    }

    records.push(record);
  }

  return records;
}
