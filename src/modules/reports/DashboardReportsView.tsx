'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function DashboardReportsView() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState({
    contratti: { attivi: 0, chiusi: 0, sospesi: 0, rifiutati: 0 },
    fatturato: { eseguito: 0, perso: 0 },
    advisor: { totale: 0, attivi: 0, online: 0 },
    aziendeTotali: 0,
    geografia: [] as { regione: string; stato: string; count: number }[]
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchReportMetrics() {
      setLoading(true);
      try {
        // Qui collegheremo le query alle rispettive tabelle Supabase (es. contratti, aziende, advisor)
        // Per ora impostiamo dati strutturati di riscontro operativo immediato:
        setReportData({
          contratti: { attivi: 14, chiusi: 28, sospesi: 5, rifiutati: 2 },
          fatturato: { eseguito: 185000, perso: 35000 },
          advisor: { totale: 8, attivi: 6, online: 3 },
          aziendeTotali: 42,
          geografia: [
            { regione: 'Sardegna', stato: 'Italia', count: 18 },
            { regione: 'Lombardia', stato: 'Italia', count: 14 },
            { regione: 'Lazio', stato: 'Italia', count: 7 },
            { regione: 'Dubai', stato: 'Emirati Arabi Uniti', count: 3 }
          ]
        });
      } catch (err) {
        console.error('Errore caricamento metriche cruscotto:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReportMetrics();
  }, [supabase]);

  if (loading) {
    return <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento cruscotto report in corso...</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER SEZIONE */}
      <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-2 shadow-xl">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Cruscotto Report & Analitiche</h3>
        <p className="text-xs text-gray-400">Panoramica strategica dei contratti, volumi di fatturato, network advisor e distribuzione geografica delle aziende.</p>
      </div>

      {/* GRIGLIA KPI PRINCIPALI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Contratti */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase text-[#FF5500] tracking-wider block">Stato Contratti</span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="bg-gray-900 p-2.5 rounded-xl border border-gray-800">
              <span className="text-gray-400 block text-[10px]">Attivi / Chiusi</span>
              <strong className="text-emerald-400 text-sm">{reportData.contratti.attivi} / {reportData.contratti.chiusi}</strong>
            </div>
            <div className="bg-gray-900 p-2.5 rounded-xl border border-gray-800">
              <span className="text-gray-400 block text-[10px]">Sosp. / Rifiut.</span>
              <strong className="text-amber-400 text-sm">{reportData.contratti.sospesi} / {reportData.contratti.rifiutati}</strong>
            </div>
          </div>
        </div>

        {/* Fatturato */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase text-[#FF5500] tracking-wider block">Performance Fatturato</span>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center bg-gray-900 p-2 rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px]">Eseguito:</span>
              <strong className="text-emerald-400">EUR {reportData.fatturato.eseguito.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between items-center bg-gray-900 p-2 rounded-xl border border-gray-800">
              <span className="text-gray-400 text-[10px]">Perso:</span>
              <strong className="text-red-400">EUR {reportData.fatturato.perso.toLocaleString()}</strong>
            </div>
          </div>
        </div>

        {/* Advisor */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase text-[#FF5500] tracking-wider block">Network Advisor</span>
          <div className="grid grid-cols-3 gap-1 text-center text-xs font-mono">
            <div className="bg-gray-900 p-2 rounded-xl border border-gray-800">
              <span className="text-gray-400 block text-[9px]">Tot</span>
              <strong className="text-white text-sm">{reportData.advisor.totale}</strong>
            </div>
            <div className="bg-gray-900 p-2 rounded-xl border border-gray-800">
              <span className="text-gray-400 block text-[9px]">Attivi</span>
              <strong className="text-emerald-400 text-sm">{reportData.advisor.attivi}</strong>
            </div>
            <div className="bg-gray-900 p-2 rounded-xl border border-gray-800">
              <span className="text-gray-400 block text-[9px]">Online</span>
              <strong className="text-blue-400 text-sm">{reportData.advisor.online}</strong>
            </div>
          </div>
        </div>

        {/* Aziende */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <span className="text-[10px] font-mono font-bold uppercase text-[#FF5500] tracking-wider block">Aziende in Portfolio</span>
          <div className="flex items-baseline justify-between bg-gray-900 p-3 rounded-xl border border-gray-800">
            <span className="text-gray-400 text-xs">Totale Aziende</span>
            <strong className="text-2xl font-black text-white font-mono">{reportData.aziendeTotali}</strong>
          </div>
        </div>

      </div>

      {/* DISTRIBUZIONE GEOGRAFICA AZIENDE */}
      <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Area Geografica Aziende (Regione & Stato)</h4>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400 font-mono uppercase text-[10px]">
                <th className="py-3 px-4">Regione</th>
                <th className="py-3 px-4">Stato</th>
                <th className="py-3 px-4 text-right">Numero Aziende</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60 font-mono">
              {reportData.geografia.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-950/50">
                  <td className="py-3 px-4 font-bold text-white">{item.regione}</td>
                  <td className="py-3 px-4 text-gray-300">{item.stato}</td>
                  <td className="py-3 px-4 text-right text-[#FF5500] font-bold">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
