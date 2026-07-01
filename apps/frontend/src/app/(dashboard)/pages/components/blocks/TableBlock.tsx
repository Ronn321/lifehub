'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';

type ColumnType = 'text' | 'number' | 'date';
type TableFunction = 'sum' | 'avg' | 'min' | 'max' | 'count';

interface Column {
  id: string;
  name: string;
  type: ColumnType;
}

interface Row {
  id: string;
  cells: Record<string, string>;
}

interface TableData {
  columns: Column[];
  rows: Row[];
  functions: Record<string, TableFunction>;
}

interface TableBlockProps {
  columns: Column[];
  rows: Row[];
  functions: Record<string, TableFunction>;
  onChange: (data: TableData) => void;
}

function calculateFunction(values: string[], type: TableFunction): string {
  const nums = values.map(Number).filter((n) => !isNaN(n));
  if (nums.length === 0) return '-';

  switch (type) {
    case 'sum':  return nums.reduce((a, b) => a + b, 0).toFixed(2);
    case 'avg':  return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
    case 'min':  return Math.min(...nums).toFixed(2);
    case 'max':  return Math.max(...nums).toFixed(2);
    case 'count': return nums.length.toString();
    default: return '-';
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function TableBlock({ columns, rows, functions, onChange }: TableBlockProps) {
  const [editingCell, setEditingCell] = useState<{ rowId: string; colId: string } | null>(null);
  const [showColMenu, setShowColMenu] = useState<string | null>(null);

  const updateCell = (rowId: string, colId: string, value: string) => {
    const newRows = rows.map((row) =>
      row.id === rowId ? { ...row, cells: { ...row.cells, [colId]: value } } : row
    );
    onChange({ columns, rows: newRows, functions });
  };

  const addColumn = () => {
    const newCol: Column = { id: generateId(), name: `Spalte ${columns.length + 1}`, type: 'text' };
    onChange({ columns: [...columns, newCol], rows, functions });
  };

  const removeColumn = (colId: string) => {
    if (columns.length <= 1) return;
    const newCols = columns.filter((c) => c.id !== colId);
    const newRows = rows.map((row) => {
      const newCells = { ...row.cells };
      delete newCells[colId];
      return { ...row, cells: newCells };
    });
    const newFunctions = { ...functions };
    delete newFunctions[colId];
    onChange({ columns: newCols, rows: newRows, functions: newFunctions });
    setShowColMenu(null);
  };

  const updateColumnName = (colId: string, name: string) => {
    const newCols = columns.map((c) => (c.id === colId ? { ...c, name } : c));
    onChange({ columns: newCols, rows, functions });
  };

  const setColumnFunction = (colId: string, fn: TableFunction | null) => {
    const newFunctions = { ...functions };
    if (fn) {
      newFunctions[colId] = fn;
    } else {
      delete newFunctions[colId];
    }
    onChange({ columns, rows, functions: newFunctions });
  };

  const addRow = () => {
    const newRow: Row = { id: generateId(), cells: {} };
    onChange({ columns, rows: [...rows, newRow], functions });
  };

  const removeRow = (rowId: string) => {
    if (rows.length <= 1) return;
    onChange({ columns, rows: rows.filter((r) => r.id !== rowId), functions });
  };

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900">
              {columns.map((col) => (
                <th key={col.id} className="relative border-b border-r border-zinc-200 dark:border-zinc-800 px-3 py-2 text-left font-medium">
                  <div className="flex items-center gap-2">
                    <input
                      value={col.name}
                      onChange={(e) => updateColumnName(col.id, e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-medium w-full"
                    />
                    <button
                      onClick={() => setShowColMenu(showColMenu === col.id ? null : col.id)}
                      className="text-fg-muted hover:text-fg"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </div>
                  {showColMenu === col.id && (
                    <div className="absolute top-full left-0 z-10 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 p-2 min-w-[140px]">
                      <div className="text-[10px] text-fg-muted mb-1">Typ</div>
                      <div className="flex gap-1 mb-2">
                        {(['text', 'number', 'date'] as ColumnType[]).map((t) => (
                          <button
                            key={t}
                            onClick={() => {
                              const newCols = columns.map((c) => (c.id === col.id ? { ...c, type: t } : c));
                              onChange({ columns: newCols, rows, functions });
                              setShowColMenu(null);
                            }}
                            className={`px-2 py-0.5 text-[10px] rounded ${
                              col.type === t ? 'bg-brand-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                      <div className="text-[10px] text-fg-muted mb-1">Funktion</div>
                      <div className="space-y-0.5">
                        {(['sum', 'avg', 'min', 'max', 'count'] as TableFunction[]).map((fn) => (
                          <button
                            key={fn}
                            onClick={() => { setColumnFunction(col.id, fn); setShowColMenu(null); }}
                            className={`block w-full text-left px-2 py-0.5 text-[10px] rounded ${
                              functions[col.id] === fn ? 'bg-brand-500 text-white' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            {fn.toUpperCase()}
                          </button>
                        ))}
                        {functions[col.id] && (
                          <button
                            onClick={() => { setColumnFunction(col.id, null); setShowColMenu(null); }}
                            className="block w-full text-left px-2 py-0.5 text-[10px] text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950"
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                      <div className="border-t border-zinc-200 dark:border-zinc-800 mt-1 pt-1">
                        <button
                          onClick={() => removeColumn(col.id)}
                          className="flex items-center gap-1 px-2 py-0.5 text-[10px] text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950 w-full"
                        >
                          <Trash2 className="h-3 w-3" /> Löschen
                        </button>
                      </div>
                    </div>
                  )}
                </th>
              ))}
              <th className="border-b border-zinc-200 dark:border-zinc-800 px-2 py-2">
                <button
                  onClick={addColumn}
                  className="text-fg-muted hover:text-brand-500 transition-colors"
                  title="Spalte hinzufügen"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="group">
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={`border-b border-r border-zinc-200 dark:border-zinc-800 px-2 py-1 ${
                      col.type === 'number' ? 'text-right' : ''
                    }`}
                    onDoubleClick={() => setEditingCell({ rowId: row.id, colId: col.id })}
                  >
                    {editingCell?.rowId === row.id && editingCell?.colId === col.id ? (
                      <input
                        autoFocus
                        type={col.type === 'date' ? 'date' : col.type === 'number' ? 'number' : 'text'}
                        value={row.cells[col.id] ?? ''}
                        onChange={(e) => updateCell(row.id, col.id, e.target.value)}
                        onBlur={() => setEditingCell(null)}
                        onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                        className="w-full bg-brand-50 dark:bg-brand-950 border border-brand-300 dark:border-brand-700 rounded px-1 outline-none text-sm"
                      />
                    ) : (
                      <span className="text-sm">{row.cells[col.id] ?? ''}</span>
                    )}
                  </td>
                ))}
                <td className="border-b border-zinc-200 dark:border-zinc-800 px-2 py-1">
                  <button
                    onClick={() => removeRow(row.id)}
                    className="opacity-0 group-hover:opacity-100 text-fg-muted hover:text-red-500 transition-all"
                    title="Zeile löschen"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {Object.keys(functions).length > 0 && (
            <tfoot>
              <tr className="bg-zinc-50 dark:bg-zinc-900 font-medium">
                {columns.map((col) => {
                  const fn = functions[col.id];
                  if (!fn) return <td key={col.id} className="border-t border-r border-zinc-200 dark:border-zinc-800 px-2 py-1" />;
                  const values = rows.map((r) => r.cells[col.id] ?? '');
                  return (
                    <td key={col.id} className="border-t border-r border-zinc-200 dark:border-zinc-800 px-2 py-1 text-right text-xs">
                      <span className="text-fg-muted">{fn.toUpperCase()}: </span>
                      <span className="font-medium">{calculateFunction(values, fn)}</span>
                    </td>
                  );
                })}
                <td className="border-t border-zinc-200 dark:border-zinc-800" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={addRow}
          className="text-xs text-fg-muted hover:text-brand-500 transition-colors flex items-center gap-1"
        >
          <Plus className="h-3 w-3" /> Zeile hinzufügen
        </button>
      </div>
    </div>
  );
}
