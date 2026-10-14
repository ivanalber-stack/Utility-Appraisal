import { AppraisalRecord, EmployeeGroup, MonthConfig, calculateFinalScore } from '../types/appraisal';

export interface SyncResult {
  success: boolean;
  source: 'web_app' | 'spreadsheet_gviz';
  records: AppraisalRecord[];
  message: string;
  count: number;
}

/**
 * Ekstrak ID spreadsheet dari berbagai format link Google Sheets:
 * - https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
 * - https://docs.google.com/spreadsheets/d/e/2PACX-.../pubhtml
 */
export function extractSpreadsheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Ekstrak GID (Sheet ID) jika ada di URL
 */
export function extractGid(url: string): string | null {
  if (!url) return null;
  const match = url.match(/[#&?]gid=([0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Bersihkan nilai numerik dari string (persen, koma desimal, strip, dsb.)
 */
export function parseCleanNumber(val: unknown): number {
  if (val === null || val === undefined || val === '' || val === '-' || val === 'N/A') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim().replace('%', '').replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Normalisasi Group Karyawan
 */
export function parseEmployeeGroup(val: unknown): EmployeeGroup {
  if (!val) return 'A';
  const str = String(val).trim().toUpperCase();
  if (str === 'PM') return 'PM';
  if (str === 'A' || str === 'B' || str === 'C' || str === 'D') return str;
  // Cek jika mengandung huruf group
  if (str.includes('PM')) return 'PM';
  if (str.includes('B')) return 'B';
  if (str.includes('C')) return 'C';
  if (str.includes('D')) return 'D';
  return 'A';
}

/**
 * Tarik data secara langsung dari Google Spreadsheet menggunakan Google Visualization (GViz) API
 * Bekerja secara REAL TIME saat link spreadsheet dibagikan sebagai "Anyone with link can view"
 */
export async function fetchFromGoogleSpreadsheetGviz(
  spreadsheetUrlOrId: string,
  targetMonth: MonthConfig
): Promise<SyncResult> {
  const spreadsheetId = spreadsheetUrlOrId.includes('/')
    ? extractSpreadsheetId(spreadsheetUrlOrId)
    : spreadsheetUrlOrId;

  if (!spreadsheetId) {
    throw new Error('URL Google Spreadsheet tidak valid. Pastikan link memiliki format https://docs.google.com/spreadsheets/d/...');
  }

  const gid = extractGid(spreadsheetUrlOrId);
  const cacheBuster = Date.now();
  
  // Format URL GViz query Google Sheets
  let gvizUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&t=${cacheBuster}`;
  if (gid) {
    gvizUrl += `&gid=${gid}`;
  }

  const response = await fetch(gvizUrl);
  if (!response.ok) {
    throw new Error(`Google Spreadsheet merespon dengan status HTTP ${response.status}. Pastikan spreadsheet dibagikan dengan akses "Siapa saja yang memiliki link dapat melihat" (Anyone with the link can view).`);
  }

  const rawText = await response.text();
  const startIdx = rawText.indexOf('{');
  const endIdx = rawText.lastIndexOf('}');

  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Format respon Google Spreadsheet tidak dapat dibaca. Pastikan spreadsheet dapat diakses publik/link.');
  }

  const jsonString = rawText.substring(startIdx, endIdx + 1);
  const parsed = JSON.parse(jsonString);

  if (!parsed.table || !Array.isArray(parsed.table.rows)) {
    throw new Error('Struktur tabel tidak ditemukan dalam spreadsheet.');
  }

  const cols = parsed.table.cols || [];
  const rows = parsed.table.rows || [];

  if (rows.length === 0) {
    return {
      success: true,
      source: 'spreadsheet_gviz',
      records: [],
      message: 'Spreadsheet terhubung, tetapi belum ada data baris karyawan.',
      count: 0,
    };
  }

  // Cari index kolom
  let headerIndexMap: { [key: string]: number } = {
    name: -1,
    group: -1,
    absensi: -1,
    downtime: -1,
    pmCompletion: -1,
    fiveR: -1,
    nilaiAkhir: -1,
    notes: -1,
  };

  // 1. Cek dari table.cols label
  cols.forEach((col: { label?: string; id?: string }, idx: number) => {
    const lbl = (col.label || '').toLowerCase().trim();
    if (lbl.includes('nama') || lbl === 'name' || lbl === 'karyawan') headerIndexMap.name = idx;
    else if (lbl.includes('group') || lbl === 'grup' || lbl === 'grp') headerIndexMap.group = idx;
    else if (lbl.includes('absen')) headerIndexMap.absensi = idx;
    else if (lbl.includes('down')) headerIndexMap.downtime = idx;
    else if (lbl.includes('pm') && !lbl.includes('group')) headerIndexMap.pmCompletion = idx;
    else if (lbl.includes('5r') || lbl.includes('5 r')) headerIndexMap.fiveR = idx;
    else if (lbl.includes('nilai') || lbl.includes('akhir') || lbl === 'total') headerIndexMap.nilaiAkhir = idx;
    else if (lbl.includes('catat') || lbl.includes('note') || lbl.includes('ket')) headerIndexMap.notes = idx;
  });

  // 2. Jika table.cols kosong atau belum ketemu, cek baris pertama rows[0]
  let startRow = 0;
  if (headerIndexMap.name === -1 || headerIndexMap.group === -1) {
    const firstRowCells = rows[0]?.c || [];
    firstRowCells.forEach((cell: { v?: unknown; f?: string } | null, idx: number) => {
      const val = String(cell?.v || cell?.f || '').toLowerCase().trim();
      if (val.includes('nama') || val === 'name' || val === 'karyawan') headerIndexMap.name = idx;
      else if (val.includes('group') || val === 'grup' || val === 'grp') headerIndexMap.group = idx;
      else if (val.includes('absen')) headerIndexMap.absensi = idx;
      else if (val.includes('down')) headerIndexMap.downtime = idx;
      else if (val.includes('pm') && !val.includes('group')) headerIndexMap.pmCompletion = idx;
      else if (val.includes('5r') || val.includes('5 r')) headerIndexMap.fiveR = idx;
      else if (val.includes('nilai') || val.includes('akhir') || val === 'total') headerIndexMap.nilaiAkhir = idx;
      else if (val.includes('catat') || val.includes('note') || val.includes('ket')) headerIndexMap.notes = idx;
    });

    if (headerIndexMap.name !== -1) {
      startRow = 1; // Baris 0 adalah baris judul header
    }
  }

  // 3. Fallback jika kolom belum terpetakan
  if (headerIndexMap.name === -1) {
    headerIndexMap.name = cols.length > 1 ? 1 : 0;
  }
  if (headerIndexMap.group === -1) headerIndexMap.group = headerIndexMap.name + 1;
  if (headerIndexMap.absensi === -1) headerIndexMap.absensi = headerIndexMap.group + 1;
  if (headerIndexMap.downtime === -1) headerIndexMap.downtime = headerIndexMap.absensi + 1;
  if (headerIndexMap.pmCompletion === -1) headerIndexMap.pmCompletion = headerIndexMap.downtime + 1;
  if (headerIndexMap.fiveR === -1) headerIndexMap.fiveR = headerIndexMap.pmCompletion + 1;
  if (headerIndexMap.nilaiAkhir === -1) headerIndexMap.nilaiAkhir = headerIndexMap.fiveR + 1;

  const records: AppraisalRecord[] = [];

  for (let r = startRow; r < rows.length; r++) {
    const cells = rows[r]?.c || [];
    const getVal = (idx: number) => {
      if (idx === -1 || !cells[idx]) return '';
      const cell = cells[idx];
      return cell.v !== undefined && cell.v !== null ? cell.v : (cell.f || '');
    };

    const rawName = String(getVal(headerIndexMap.name) || '').trim();
    if (!rawName || rawName === '-' || rawName.toLowerCase() === 'nama karyawan' || rawName.toLowerCase() === 'nama') {
      continue;
    }

    const rawGroup = getVal(headerIndexMap.group);
    const group = parseEmployeeGroup(rawGroup);
    const absensi = parseCleanNumber(getVal(headerIndexMap.absensi));
    const downtime = parseCleanNumber(getVal(headerIndexMap.downtime));

    const pmRaw = headerIndexMap.pmCompletion !== -1 ? getVal(headerIndexMap.pmCompletion) : '';
    const fiveRRaw = headerIndexMap.fiveR !== -1 ? getVal(headerIndexMap.fiveR) : '';

    const pmClean = pmRaw !== '' && pmRaw !== '-' ? parseCleanNumber(pmRaw) : null;
    const fiveRClean = fiveRRaw !== '' && fiveRRaw !== '-' ? parseCleanNumber(fiveRRaw) : null;

    const rawScore = headerIndexMap.nilaiAkhir !== -1 ? parseCleanNumber(getVal(headerIndexMap.nilaiAkhir)) : 0;

    const tempRecord: AppraisalRecord = {
      id: `${targetMonth.id}-gviz-${r + 1}`,
      monthId: targetMonth.id,
      name: rawName,
      group: group,
      absensi: absensi,
      downtime: downtime,
      pmCompletion: group === 'PM' ? pmClean : null,
      fiveR: group !== 'PM' ? (fiveRClean ?? pmClean) : null,
      finalScore: 0,
      notes: headerIndexMap.notes !== -1 ? String(getVal(headerIndexMap.notes) || '') : '',
    };

    // Hitung score jika di sheet kosong atau 0
    tempRecord.finalScore = rawScore > 0 ? rawScore : calculateFinalScore(tempRecord, targetMonth);
    records.push(tempRecord);
  }

  return {
    success: true,
    source: 'spreadsheet_gviz',
    records: records,
    message: `Berhasil menarik ${records.length} data karyawan secara real-time langsung dari Google Spreadsheet!`,
    count: records.length,
  };
}

/**
 * Tarik data dari Google Apps Script Web App (/exec)
 */
export async function fetchFromGoogleAppsScript(
  webAppUrl: string,
  targetMonth: MonthConfig
): Promise<SyncResult> {
  const cleanedUrl = webAppUrl.trim();
  if (!cleanedUrl) {
    throw new Error('URL Google Apps Script kosong.');
  }

  const fetchUrl = cleanedUrl.includes('?')
    ? `${cleanedUrl}&month=${encodeURIComponent(targetMonth.id)}&t=${Date.now()}`
    : `${cleanedUrl}?month=${encodeURIComponent(targetMonth.id)}&t=${Date.now()}`;

  const res = await fetch(fetchUrl, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Google Apps Script merespon dengan status ${res.status}. Pastikan opsi deploy diset "Who has access: Anyone".`);
  }

  const json = await res.json();
  if (!json || !Array.isArray(json.records)) {
    throw new Error(json?.message || 'Format respon Apps Script tidak mengembalikan array records.');
  }

  const formatted: AppraisalRecord[] = json.records.map((r: any, idx: number) => {
    const grp = parseEmployeeGroup(r.group);
    const rec: AppraisalRecord = {
      id: r.id || `${targetMonth.id}-appscript-${Date.now()}-${idx}`,
      monthId: targetMonth.id,
      name: String(r.name || '').trim(),
      group: grp,
      absensi: parseCleanNumber(r.absensi),
      downtime: parseCleanNumber(r.downtime),
      pmCompletion: grp === 'PM' ? parseCleanNumber(r.pmCompletion) : null,
      fiveR: grp !== 'PM' ? parseCleanNumber(r.fiveR ?? r.pmCompletion) : null,
      finalScore: 0,
      notes: String(r.notes || ''),
    };
    rec.finalScore = parseCleanNumber(r.finalScore) || calculateFinalScore(rec, targetMonth);
    return rec;
  });

  return {
    success: true,
    source: 'web_app',
    records: formatted,
    message: `Berhasil sinkronisasi ${formatted.length} data karyawan dari Google Apps Script Web App!`,
    count: formatted.length,
  };
}

/**
 * Universal Auto-Sync: Coba Apps Script Web App jika ada, atau coba langsung dari link Spreadsheet!
 */
export async function syncAppraisalDataUniversal(
  targetMonth: MonthConfig,
  appsScriptUrl?: string,
  spreadsheetUrl?: string
): Promise<SyncResult> {
  const hasAppsScript = appsScriptUrl && appsScriptUrl.includes('/exec');
  const hasSpreadsheet = spreadsheetUrl && (spreadsheetUrl.includes('spreadsheets/d/') || spreadsheetUrl.length > 20);

  // 1. Coba Apps Script jika ada
  if (hasAppsScript) {
    try {
      return await fetchFromGoogleAppsScript(appsScriptUrl!, targetMonth);
    } catch (appsScriptErr) {
      console.warn('Gagal sync via Apps Script, mencoba alternatif spreadsheet...', appsScriptErr);
      if (hasSpreadsheet) {
        return await fetchFromGoogleSpreadsheetGviz(spreadsheetUrl!, targetMonth);
      }
      throw appsScriptErr;
    }
  }

  // 2. Jika tidak ada Apps Script tapi ada link Spreadsheet
  if (hasSpreadsheet) {
    return await fetchFromGoogleSpreadsheetGviz(spreadsheetUrl!, targetMonth);
  }

  throw new Error('Masukkan Link Google Spreadsheet atau Link Web App Apps Script terlebih dahulu.');
}
