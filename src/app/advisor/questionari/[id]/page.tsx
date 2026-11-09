'use client';

import { use, Suspense } from 'react';
import Link from 'next/link';

function MasterFormContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const formId = resolvedParams.id ? resolvedParams.id.toUpperCase() : 'Q01';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex justify-between items-center border-b border-gray-300 pb-6">
        <div>
          <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">GOS 1.2 — Libreria Master Q</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mt-1">Gestione Modulo: {formId}</h1>
        </div>
        <Link href="/advisor" className="px-4 py-2 bg-white border border-gray-300 text-xs font-semibold rounded-xl text-gray-700 shadow-sm hover:bg-gray-50 transition-all">
          ← Torna al Cruscotto
        </Link>
      </div>

      {/* Configurazione Parametri */}
      <div className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm space-y-6">
        <div className="space-y-2">
          <span className="px-3 py-1 bg-gray-900 text-white font-mono text-xs font-bold rounded-lg">{formId}</span>
          <h3 className="text-xl font-bold text-gray-900 mt-2">Parametri di Assessment Configurate</h3>
          <p className="text-xs text-gray-500">Gestione dei campi di rilevazione e dei pesi ponderali associati al template.</p>
        </div>

        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-3">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase border-b border-gray-200 pb-2">
            <span>Parametro / Voce</span>
            <span>Tipologia Campo</span>
            <span>Stato</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-800 py-1">
            <span>01. Assetto Societario e Governance</span>
            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">Testo / Scelta</span>
            <span className="text-emerald-600 font-semibold text-xs">Attivo</span>
          </div>
          <div className="flex justify-between items-center text-sm text-gray-800 py-1 border-t border-gray-200 pt-2">
            <span>02. Modello di Business e Ricavi</span>
            <span className="text-xs font-mono bg-blue-100 text-blue-800 px-2 py-1 rounded">Numerico / Valuta</span>
            <span className="text-emerald-600 font-semibold text-xs">Attivo</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl shadow transition-all">
            Salva Configurazione Master
          </button>
        </div>
      </div>

    </div>
  );
}

export default function MasterFormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-gray-100 text-gray-900 font-sans p-6 md:p-10">
      <Suspense fallback={<div className="text-center py-12 text-gray-500 text-sm">Caricamento modulo in corso...</div>}>
        <MasterFormContent params={params} />
      </Suspense>
    </main>
  );
}
