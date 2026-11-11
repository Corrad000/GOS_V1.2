'use client';

import React from 'react';

interface DashboardHeaderSummaryProps {
  metrics: {
    contrattiAttivi: number;
    contrattiChiusi: number;
    contrattiSospesiRifiutati: number;
    fatturatoEseguito: number;
    fatturatoPerso: number;
    advisorOnline: number;
    advisorTotali: number;
    aziendeTotali: number;
  };
}

export function DashboardHeaderSummary({ metrics }: DashboardHeaderSummaryProps) {
  return (
    <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl mb-6">
      
      {/* Intestazione del Cruscotto */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-gray-800/80 pb-3">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            CRUSCOTTO <span className="text-[#FF5500]">PORTAFOHLIO & REPORT</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Visione d&apos;insieme globale del business • Aggiornato in tempo reale</p>
        </div>
        <span className="px-3 py-1 bg-gray-950 border border-gray-800 text-gray-400 text-[11px] font-mono rounded-lg">
          Stato: Operativo
        </span>
      </div>

      {/* KPI Cards Principali (Stile Reference) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        
        {/* Card 1: Contratti Attivi / Chiusi */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Contratti Attivi / Chiusi</span>
          <div className="text-lg font-black text-white font-mono">
            <span className="text-emerald-400">{metrics.contrattiAttivi}</span> <span className="text-gray-600">/</span> <span className="text-blue-400">{metrics.contrattiChiusi}</span>
          </div>
        </div>

        {/* Card 2: Fatturato Eseguito */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Fatturato Eseguito</span>
          <div className="text-lg font-black text-emerald-400 font-mono">
            € {metrics.fatturatoEseguito.toLocaleString()}
          </div>
        </div>

        {/* Card 3: Advisor Online / Totali */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Advisor Online / Tot</span>
          <div className="text-lg font-black text-white font-mono">
            <span className="text-blue-400">{metrics.advisorOnline}</span> <span className="text-gray-600">/</span> <span>{metrics.advisorTotali}</span>
          </div>
        </div>

        {/* Card 4: Aziende in Portfolio */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Aziende in Portfolio</span>
          <div className="text-lg font-black text-[#FF5500] font-mono">
            {metrics.aziendeTotali}
          </div>
        </div>

      </div>

      {/* Sotto-pillole di riepilogo rapido */}
      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-mono text-gray-300">
        <div className="bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-400"></span>
          <span>In Sospeso/Rifiutati: <strong>{metrics.contrattiSospesiRifiutati}</strong></span>
        </div>
        <div className="bg-gray-950 border border-gray-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400"></span>
          <span>Fatturato Perso: <strong className="text-red-400">€ {metrics.fatturatoPerso.toLocaleString()}</strong></span>
        </div>
      </div>

    </div>
  );
}
