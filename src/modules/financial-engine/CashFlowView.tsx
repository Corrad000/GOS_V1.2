'use client';

import React from 'react';

export interface CashFlowRowData {
  label: string;
  values: [number, number, number, number, number];
  isSubtotal?: boolean;
  isTotal?: boolean;
  isNegative?: boolean;
  colorClass?: string;
  indent?: boolean;
}

interface CashFlowProps {
  cashFlowRows?: CashFlowRowData[];
}

export function CashFlowView({ cashFlowRows = [] }: CashFlowProps) {
  const safeRows = cashFlowRows || [];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-800 pb-3">
        <h3 className="text-base font-bold text-white">Cash Flow Pluriennale (Rendiconto Finanziario)</h3>
        <p className="text-xs text-gray-400">Analisi della dinamica finanziaria, flussi operativi, di investimento e di finanziamento a 5 anni.</p>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="p-4 min-w-[260px]">Voce Cash Flow</th>
              <th className="p-4 text-center">Anno 1 (€)</th>
              <th className="p-4 text-center">Anno 2 (€)</th>
              <th className="p-4 text-center">Anno 3 (€)</th>
              <th className="p-4 text-center">Anno 4 (€)</th>
              <th className="p-4 text-center">Anno 5 (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900 text-gray-300">
            {safeRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 font-mono">
                  Nessun dato di flusso di cassa disponibile. Compila i driver di input per generare il prospetto.
                </td>
              </tr>
            ) : (
              safeRows.map((row, idx) => {
                let rowStyle = 'hover:bg-gray-900/40 transition-colors';
                if (row.isSubtotal) rowStyle = 'bg-gray-900/60 font-bold text-white border-t border-b border-gray-800';
                if (row.isTotal) rowStyle = 'bg-emerald-950/30 font-extrabold text-white border-t border-emerald-900 text-sm';

                return (
                  <tr key={idx} className={rowStyle}>
                    <td className={`p-4 ${row.indent ? 'pl-8 text-gray-400' : 'font-medium text-white'}`}>
                      {row.label}
                    </td>
                    {row.values.map((val, yIdx) => {
                      const formattedVal = Math.round(val).toLocaleString();
                      const textCol = row.colorClass || (row.isNegative ? 'text-red-400' : 'text-white');
                      return (
                        <td key={yIdx} className={`p-4 text-center font-mono ${textCol}`}>
                          {val < 0 ? `- € ${Math.abs(val).toLocaleString()}` : `€ ${formattedVal}`}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
