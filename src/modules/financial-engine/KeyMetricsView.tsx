'use client';

import React from 'react';

export interface KpiRowData {
  label: string;
  values: [number, number, number, number, number];
  isPercentage?: boolean;
}

interface KeyMetricsProps {
  kpiRows: KpiRowData[];
}

export function KeyMetricsView({ kpiRows }: KeyMetricsProps) {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-800 pb-3">
        <h3 className="text-base font-bold text-white">Key Metrics & KPI Pluriennali</h3>
        <p className="text-xs text-gray-400">Indicatori chiave di redditività e performance sull'orizzonte quinquennale.</p>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="p-4 min-w-[260px]">Indicatore KPI</th>
              <th className="p-4 text-center">Anno 1</th>
              <th className="p-4 text-center">Anno 2</th>
              <th className="p-4 text-center">Anno 3</th>
              <th className="p-4 text-center">Anno 4</th>
              <th className="p-4 text-center">Anno 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900 text-gray-300">
            {kpiRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-900/40 transition-colors">
                <td className="p-4 font-medium text-white">{row.label}</td>
                {row.values.map((val, yIdx) => (
                  <td key={yIdx} className="p-4 text-center font-mono font-bold text-amber-400">
                    {val.toFixed(2)} {row.isPercentage ? '%' : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
