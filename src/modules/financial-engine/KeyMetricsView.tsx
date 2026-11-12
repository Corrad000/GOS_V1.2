'use client';

import React from 'react';

export interface KpiRowData {
  label: string;
  values: [number, number, number, number, number];
  isPercentage?: boolean;
  isCurrency?: boolean;
}

interface KeyMetricsProps {
  kpiRows: KpiRowData[];
}

export function KeyMetricsView({ kpiRows }: KeyMetricsProps) {
  const safeRows = kpiRows || [];

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
      <div className="border-b border-gray-800 pb-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight">Key Metrics & KPI Pluriennali</h3>
        <p className="text-xs text-gray-400 mt-0.5">Indicatori chiave di redditività, marginalità e performance economico-finanziaria sull'orizzonte quinquennale.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-950 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Indicatore KPI</th>
              <th className="py-3 px-3 text-center">Anno 1</th>
              <th className="py-3 px-3 text-center">Anno 2</th>
              <th className="py-3 px-3 text-center">Anno 3</th>
              <th className="py-3 px-3 text-center">Anno 4</th>
              <th className="py-3 px-3 text-center">Anno 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-mono">
            {safeRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-950/40 transition-colors">
                <td className="py-3 px-4 font-sans font-bold text-gray-200">{row.label}</td>
                {row.values.map((val, yIdx) => {
                  const formattedVal = row.isCurrency
                    ? `€ ${Math.round(val || 0).toLocaleString('it-IT')}`
                    : row.isPercentage
                    ? `${Number(val || 0).toFixed(2)} %`
                    : (val || 0).toLocaleString('it-IT');

                  const isPositive = (val || 0) >= 0;
                  const colorClass = row.isCurrency
                    ? 'text-white font-bold'
                    : isPositive
                    ? 'text-emerald-400 font-bold'
                    : 'text-red-400 font-bold';

                  return (
                    <td key={yIdx} className={`py-3 px-3 text-center ${colorClass}`}>
                      {formattedVal}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
