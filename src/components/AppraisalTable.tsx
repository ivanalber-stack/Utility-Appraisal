import React, { useState, useMemo } from 'react';
import {
  Search,
  ArrowUpDown,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Download,
  Plus,
  FileCode,
} from 'lucide-react';
import {
  AppraisalRecord,
  MonthConfig,
  calculateFinalScore,
  EmployeeGroup,
} from '../types/appraisal';

interface AppraisalTableProps {
  records: AppraisalRecord[];
  currentMonth: MonthConfig;
  selectedRecordId: string | null;
  activeGroupFilter: 'ALL' | EmployeeGroup;
  onSelectGroup: (grp: 'ALL' | EmployeeGroup) => void;
  onSelectRecord: (record: AppraisalRecord) => void;
  onEditRecord: (record: AppraisalRecord) => void;
  onDeleteRecord: (id: string) => void;
  onAddRecord: () => void;
  onOpenCodeGs?: () => void;
  appsScriptUrl?: string;
}

export const AppraisalTable: React.FC<AppraisalTableProps> = ({
  records,
  currentMonth,
  selectedRecordId,
  activeGroupFilter,
  onSelectGroup,
  onSelectRecord,
  onEditRecord,
  onDeleteRecord,
  onAddRecord,
  onOpenCodeGs,
  appsScriptUrl,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'group' | 'absensi' | 'downtime' | 'score'>('name');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filter records for the current month
  const monthRecords = useMemo(() => {
    return records.filter((r) => r.monthId === currentMonth.id);
  }, [records, currentMonth.id]);

  // Apply filters and sorting
  const filteredRecords = useMemo(() => {
    return monthRecords
      .filter((r) => {
        const matchesName = r.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesGroup = activeGroupFilter === 'ALL' || r.group === activeGroupFilter;
        return matchesName && matchesGroup;
      })
      .map((r) => ({
        ...r,
        finalScore: calculateFinalScore(r, currentMonth),
      }))
      .sort((a, b) => {
        let valA: string | number = a[sortField as keyof typeof a] ?? 0;
        let valB: string | number = b[sortField as keyof typeof b] ?? 0;

        if (sortField === 'score') {
          valA = a.finalScore;
          valB = b.finalScore;
        }

        if (typeof valA === 'string' && typeof valB === 'string') {
          return sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }
        return sortAsc ? Number(valA) - Number(valB) : Number(valB) - Number(valA);
      });
  }, [monthRecords, searchTerm, activeGroupFilter, sortField, sortAsc, currentMonth]);

  const handleSort = (field: 'name' | 'group' | 'absensi' | 'downtime' | 'score') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['Bulan', 'Nama', 'Group', 'Absensi', 'Downtime', 'PM Completion', '5R', 'Nilai Akhir'];
    const rows = filteredRecords.map((r) => {
      return [
        `"${currentMonth.name}"`,
        `"${r.name}"`,
        `"${r.group}"`,
        r.absensi,
        r.downtime,
        r.pmCompletion !== null ? r.pmCompletion : '',
        r.fiveR !== null ? r.fiveR : '',
        r.finalScore,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `appraisal_${currentMonth.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xs overflow-hidden flex flex-col">
      {/* Table Controls Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama karyawan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-800/80 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Active Filter Indicator */}
          {activeGroupFilter !== 'ALL' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-950/70 border border-indigo-800/80 rounded-lg text-xs font-medium text-indigo-300">
              <span>Filter: Group {activeGroupFilter}</span>
              <button
                type="button"
                onClick={() => onSelectGroup('ALL')}
                className="text-indigo-400 hover:text-indigo-200 font-bold ml-1"
                title="Tampilkan semua group"
              >
                ×
              </button>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {onOpenCodeGs && (
            <button
              type="button"
              onClick={onOpenCodeGs}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shadow-2xs border ${
                appsScriptUrl
                  ? 'text-emerald-300 bg-emerald-950/70 border-emerald-700/80 hover:bg-emerald-900/80'
                  : 'text-emerald-400 bg-emerald-950/70 border-emerald-800/80 hover:bg-emerald-900/80 hover:text-emerald-300'
              }`}
              title={appsScriptUrl ? `Google Apps Script Terhubung: ${appsScriptUrl}` : 'Input Link Google Apps Script / Code.gs'}
            >
              {appsScriptUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>}
              <FileCode className="w-3.5 h-3.5 text-emerald-400" />
              <span>{appsScriptUrl ? 'Apps Script Terhubung' : 'Link Apps Script'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700/80 transition-colors"
            title="Download Spreadsheet CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={onAddRecord}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Karyawan Baru</span>
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-slate-800/60 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-2.5 px-3.5 whitespace-nowrap">Bulan</th>
              <th
                className="py-2.5 px-3.5 cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  <span>Nama</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-center cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => handleSort('group')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Group</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => handleSort('absensi')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Absensi</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th
                className="py-2.5 px-3 text-right cursor-pointer hover:text-slate-200 select-none whitespace-nowrap"
                onClick={() => handleSort('downtime')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Downtime</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <span title="Khusus Group PM">PM Completion</span>
              </th>
              <th className="py-2.5 px-3 text-right whitespace-nowrap">
                <span title="Khusus Group A–D">5R</span>
              </th>
              <th
                className="py-2.5 px-3.5 text-right cursor-pointer hover:text-slate-200 select-none whitespace-nowrap font-bold"
                onClick={() => handleSort('score')}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Nilai Akhir</span>
                  <ArrowUpDown className="w-3 h-3 text-slate-500" />
                </div>
              </th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                  Tidak ada data karyawan yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              filteredRecords.map((rec) => {
                const isSelected = selectedRecordId === rec.id;
                const isPM = rec.group === 'PM';

                return (
                  <tr
                    key={rec.id}
                    onClick={() => onSelectRecord(rec)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-950/45 font-medium'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <td className="py-2.5 px-3.5 text-slate-400 whitespace-nowrap font-mono text-[11px]">
                      {currentMonth.name}
                    </td>
                    <td className="py-2.5 px-3.5 font-medium text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block" />
                        )}
                        <span>{rec.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          isPM
                            ? 'bg-amber-950/70 text-amber-300 border-amber-800/70'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {rec.group}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                      {rec.absensi}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-300">
                      {rec.downtime}
                    </td>
                    {/* PM Completion: shown for PM, dash for A-D */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {isPM && rec.pmCompletion !== null ? (
                        <span className="font-semibold text-amber-400">
                          {rec.pmCompletion}
                        </span>
                      ) : (
                        <span className="text-slate-600 select-none">-</span>
                      )}
                    </td>
                    {/* 5R: shown for A-D, dash for PM */}
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                      {!isPM && rec.fiveR !== null ? (
                        <span className="text-slate-300">{rec.fiveR}</span>
                      ) : (
                        <span className="text-slate-600 select-none">-</span>
                      )}
                    </td>
                    {/* Final Weighted Score */}
                    <td className="py-2.5 px-3.5 text-right font-mono tabular-nums font-bold text-white">
                      {rec.finalScore}
                    </td>
                    {/* Actions */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectRecord(rec)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                          title="Tampilkan Radar Chart"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditRecord(rec)}
                          className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                          title="Edit Nilai"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteRecord(rec.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Hapus Karyawan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs text-slate-400">
        <div>
          Menampilkan <span className="font-semibold text-slate-200">{filteredRecords.length}</span> dari {monthRecords.length} total karyawan ({currentMonth.name})
        </div>
        <div className="text-[11px] text-slate-500 hidden sm:block">
          Klik baris untuk menampilkan grafik laba-laba karyawan
        </div>
      </div>
    </div>
  );
};
