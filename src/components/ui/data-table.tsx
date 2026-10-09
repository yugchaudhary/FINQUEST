'use client';

import React from 'react';

export interface Column<T> {
  header: React.ReactNode;
  accessorKey: keyof T | string;
  cell?: (item: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor?: (item: T, index: number) => string;
  emptyMessage?: React.ReactNode;
  onRowClick?: (item: T) => void;
  striped?: boolean;
}

export function DataTable<T>({ 
  data, 
  columns, 
  keyExtractor, 
  emptyMessage = 'No data available',
  onRowClick,
  striped = false
}: DataTableProps<T>) {
  
  if (!data || data.length === 0) {
    return (
      <div className="w-full rounded-xl border border-border bg-surface p-8 text-center text-slate-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-left text-sm text-foreground">
        <thead className="bg-surface-2 text-xs uppercase text-slate-500 border-b border-border">
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} scope="col" className={`px-6 py-4 font-medium ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, rowIdx) => (
            <tr 
              key={keyExtractor ? keyExtractor(item, rowIdx) : rowIdx} 
              onClick={() => onRowClick?.(item)}
              className={`border-b border-border transition-colors hover:bg-surface-2/50 ${
                onRowClick ? 'cursor-pointer' : ''
              } ${striped && rowIdx % 2 !== 0 ? 'bg-[#1a1a24]' : ''}`}
            >
              {columns.map((col, colIdx) => (
                <td key={colIdx} className={`px-6 py-4 ${col.className || ''}`}>
                  {col.cell ? col.cell(item) : (item as any)[col.accessorKey]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
