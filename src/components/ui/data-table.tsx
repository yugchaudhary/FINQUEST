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
      <div className="w-full rounded-xl border border-[#2a2a3a] bg-[#16161f] p-8 text-center text-[#9ca3af]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#2a2a3a] bg-[#16161f]">
      <table className="w-full text-left text-sm text-[#f4f4f5]">
        <thead className="bg-[#1e1e2d] text-xs uppercase text-[#9ca3af] border-b border-[#2a2a3a]">
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
              className={`border-b border-[#2a2a3a] transition-colors hover:bg-[#1e1e2d]/50 ${
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
