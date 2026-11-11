'use client';

import React from 'react';

export interface LoanItem {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  durationYears: number;
}

interface DebtPlanProps {
  loans: LoanItem[];
  setLoans: React.Dispatch<React.SetStateAction<LoanItem[]>>;
}

export function DebtPlanView({ loans, setLoans }: DebtPlanProps) {
  const addLoan = () => {
    setLoans([
      ...loans,
      {
        id: Math.random().toString(36).substring(2, 9),
        name: `Nuovo Mutuo / Finanziamento ${loans.length + 1}`,
        principal: 100000,
        interestRate: 4.5,
        durationYears: 5
      }
    ]);
  };

  const updateLoan = (index: number, field: keyof LoanItem, value: any) => {
    const updated = [...loans];
    updated[index] = { ...updated[index], [field]: value };
    setLoans(updated);
  };

  const removeLoan = (index: number) => {
    setLoans(loans.filter((_, i) => i !== index));
  };

  const years = [1, 2, 3, 4, 5];
  const consolidatedSchedule = years.map((y) => {
    let totalOpening = 0;
    let totalPrincipalRepayment = 0;
    let totalInterestPayment = 0;
    let totalClosing = 0;

    loans.forEach((loan) => {
      const annualPrincipal = loan.durationYears > 0 ? loan.principal / loan.durationYears : 0;
      let runningDebt = loan.principal;

      for (let yr = 1; yr < y; yr++) {
        runningDebt = Math.max(0, runningDebt - annualPrincipal);
      }

      const openingDebt = runningDebt;
      const principalRepayment = openingDebt > 0 ? annualPrincipal : 0;
      const interestPayment = openingDebt > 0 ? openingDebt * (loan.interestRate / 100) : 0;
      const closingDebt = Math.max(0, openingDebt - principalRepayment);

      totalOpening += openingDebt;
      totalPrincipalRepayment += principalRepayment;
      totalInterestPayment += interestPayment;
      totalClosing += closingDebt;
    });

    return {
      year: y,
      openingDebt: totalOpening,
      principalRepayment: totalPrincipalRepayment,
      interestPayment: totalInterestPayment,
      totalPayment: totalPrincipalRepayment + totalInterestPayment,
      closingDebt: totalClosing
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase">Gestione Multipla Finanziamenti & Mutui</h3>
          <p className="text-xs text-gray-400">Configura i singoli prestiti e visualizza il prospetto consolidato di ammortamento sui primi 5 anni.</p>
        </div>
        <button
          onClick={addLoan}
          className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow uppercase tracking-wider"
        >
          + Aggiungi Mutuo / Finanziamento
        </button>
      </div>

      <div className="space-y-4">
        {loans.map((loan, idx) => (
          <div key={loan.id || idx} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4 relative">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">Finanziamento #{idx + 1}</span>
              {loans.length > 1 && (
                <button
                  onClick={() => removeLoan(idx)}
                  className="px-2.5 py-1 bg-red-950 text-red-400 text-xs font-bold rounded-lg hover:bg-red-900 cursor-pointer"
                >
                  Rimuovi Mutuo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-gray-400 block mb-1 uppercase font-bold text-[10px]">Nome / Descrizione</label>
                <input
                  type="text"
                  value={loan.name}
                  onChange={(e) => updateLoan(idx, 'name', e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 px-3.5 py-2.5 rounded-xl text-white font-medium"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 uppercase font-bold text-[10px]">Capitale Iniziale (€)</label>
                <input
                  type="number"
                  value={loan.principal}
                  onChange={(e) => updateLoan(idx, 'principal', Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-800 px-3.5 py-2.5 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 uppercase font-bold text-[10px]">Tasso d'Interesse (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={loan.interestRate}
                  onChange={(e) => updateLoan(idx, 'interestRate', Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-800 px-3.5 py-2.5 rounded-xl text-[#FF5500] font-mono font-bold"
                />
              </div>

              <div>
                <label className="text-gray-400 block mb-1 uppercase font-bold text-[10px]">Durata (Anni)</label>
                <input
                  type="number"
                  value={loan.durationYears}
                  onChange={(e) => updateLoan(idx, 'durationYears', Number(e.target.value))}
                  className="w-full bg-gray-900 border border-gray-800 px-3.5 py-2.5 rounded-xl text-white font-mono"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gray-950 border border-gray-800 rounded-2xl overflow-x-auto shadow-sm">
        <div className="p-4 border-b border-gray-900">
          <h4 className="text-sm font-bold text-white uppercase">Prospetto Consolidato di Ammortamento (Primi 5 Anni)</h4>
        </div>
        <table className="w-full text-left text-xs whitespace-nowrap font-mono">
          <thead className="bg-gray-900 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="p-4">Periodo</th>
              <th className="p-4 text-right">Debito Iniziale (€)</th>
              <th className="p-4 text-right">Quota Capitale Tot. (€)</th>
              <th className="p-4 text-right">Interessi Tot. (€)</th>
              <th className="p-4 text-right">Rata Totale (€)</th>
              <th className="p-4 text-right">Debito Residuo Tot. (€)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900 text-gray-300">
            {consolidatedSchedule.map((row) => (
              <tr key={row.year} className="hover:bg-gray-900/40 transition-colors">
                <td className="p-4 font-bold text-white">Anno {row.year}</td>
                <td className="p-4 text-right">€ {Math.round(row.openingDebt).toLocaleString('it-IT')}</td>
                <td className="p-4 text-right text-red-400">- € {Math.round(row.principalRepayment).toLocaleString('it-IT')}</td>
                <td className="p-4 text-right text-amber-400">- € {Math.round(row.interestPayment).toLocaleString('it-IT')}</td>
                <td className="p-4 text-right text-white font-bold">€ {Math.round(row.totalPayment).toLocaleString('it-IT')}</td>
                <td className="p-4 text-right text-emerald-400 font-bold">€ {Math.round(row.closingDebt).toLocaleString('it-IT')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
