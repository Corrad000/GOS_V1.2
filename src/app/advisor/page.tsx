'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface AdvisorCompany {
  id: string;
  name: string;
  vatNumber: string;
  revenue: number;
  activeContracts: number;
  status: 'Attiva' | 'In revisione' | 'Sospesa';
}

export default function AdvisorDashboard() {
  const advisorName = "Alessandro Bianchi";
  const [advisorCompanies] = useState<AdvisorCompany[]>([
    { id: 'c1', name: 'Opus Automazione S.p.A.', vatNumber: 'IT01234567890', revenue: 145000, activeContracts: 3, status: 'Attiva' },
    { id: 'c3', name: 'Glaring UK Operations', vatNumber: 'GB998877665', revenue: 147500, activeContracts: 4, status: 'Attiva' }
  ]);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER CRUSCOTTO ADVISOR CON PULSANTE NUOVA AZIENDA */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block mb-1">
              GOS 1.2 — PORTALE ADVISOR
            </span>
            <h1 className="text-3xl font-extrabold text-white">Dashboard Operativa ({advisorName})</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/advisor/companies/new"
              className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-2"
            >
              <span>+ Registra Nuova Azienda</span>
            </Link>
          </div>
        </div>

        {/* METRICHE PERSONALI ADVISOR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Fatturato Portafoglio Gestito */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Fatturato Portafoglio</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">€ 292.500</div>
            <span className="text-[10px] text-gray-400">2 Aziende seguite attivamente</span>
          </div>

          {/* Offerte Commerciali Personali */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Le Mie Offerte</span>
              <span className="text-xs font-bold text-white bg-gray-800 px-2 py-0.5 rounded-md font-mono">Tot: 5</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 text-gray-300">
              <span className="text-amber-400">⏳ 2 In attesa</span>
              <span className="text-emerald-400">✓ 3 Approvate</span>
            </div>
          </div>

          {/* Progetti Assegnati */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Progetti in Corso</span>
              <span className="text-xs font-bold text-white bg-gray-800 px-2 py-0.5 rounded-md font-mono">Tot: 3</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 text-gray-300">
              <span className="text-emerald-400">⚡ 2 Attivi</span>
              <span className="text-blue-400">🏁 1 Concluso</span>
            </div>
          </div>

        </div>

        {/* TABELLA AZIENDE ASSEGNATE ALL'ADVISOR */}
        <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
          <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <div>
              <h2 className="text-base font-black text-white uppercase">Aziende in Gestione</h2>
              <p className="text-xs text-gray-400 mt-0.5">Elenco delle aziende assegnate al tuo profilo e contratti attivi correlati.</p>
            </div>
            <Link
              href="/advisor/companies/new"
              className="text-xs font-bold text-amber-400 hover:underline"
            >
              + Aggiungi altra azienda
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-950 text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                <tr>
                  <th className="p-3">Azienda / P.IVA</th>
                  <th className="p-3">Fatturato Aziendale</th>
                  <th className="p-3">Contratti Attivi</th>
                  <th className="p-3">Stato</th>
                  <th className="p-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {advisorCompanies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-gray-950/50 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white text-sm">{comp.name}</div>
                      <div className="text-gray-500 font-mono text-[10px]">{comp.vatNumber}</div>
                    </td>
                    <td className="p-3 font-mono font-black text-emerald-400 text-sm">
                      € {comp.revenue.toLocaleString()}
                    </td>
                    <td className="p-3 font-mono font-bold text-white">
                      <span className="bg-gray-950 border border-gray-800 px-2.5 py-1 rounded-lg">
                        📄 {comp.activeContracts} Attivi
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {comp.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => alert(`Apertura workspace operativo per: ${comp.name}`)}
                        className="text-gray-400 hover:text-amber-400 font-bold transition-colors cursor-pointer"
                      >
                        📂 Gestisci Workspace →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
