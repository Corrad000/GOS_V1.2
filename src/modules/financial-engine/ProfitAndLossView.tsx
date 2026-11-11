'use client';

import React from 'react';

export interface PnLRowData {
  label: string;
  values: [number, number, number, number, number];
  isSubtotal?: boolean;
  isTotal?: boolean;
  isNegative?: boolean;
  colorClass?: string;
  indent?: boolean;
}

interface ProfitAndLossProps {
  pnlRows?: PnLRowData[];
  corporateTaxRate?: number;
}

export function ProfitAndLossView({ pnlRows = [], corporateTaxRate = 24 }: ProfitAndLossProps) {
  const safeRows = pnlRows || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase">Profit & Loss (Conto Economico Pluriennale)</h3>
          <p className="text-xs text-gray-400 mt-0.5">Prospetto economico completo a 5 anni derivato dai driver di input.</p>
        </div>
        <span className="px-3 py-1 bg-gray-950 border border-gray-800 text-emerald-400 font-mono text-xs rounded-lg">
          Imposte: {corporateTaxRate}%
        </span>
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
        <table className="w-full text-left text-xs whitespace-nowrap font-mono">
          <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="p-4 min-w-[260px]">Voce Contabile (P&L)</th>
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
                  Nessun dato P&L disponibile. Compila i driver di input per generare il prospetto.
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
                      const formattedVal = Math.round(val).toLocaleString('it-IT');
                      const textCol = row.colorClass || (row.isNegative ? 'text-red-400' : 'text-white');
                      return (
                        <td key={yIdx} className={`p-4 text-center font-mono ${textCol}`}>
                          {val < 0 ? `- € ${Math.abs(val).toLocaleString('it-IT')}` : `€ ${formattedVal}`}
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
