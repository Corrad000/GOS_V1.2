'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProjectDetailView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'questionari' | 'business' | 'cronoprogramma' | 'governance'>('questionari');
  
  // Stato per la gestione dei moduli questionario di progetto
  const [showModuliSelector, setShowModuliSelector] = useState(false);

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header con pulsante di ritorno corretto all'Hub Azienda */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-900 border border-gray-800 text-blue-400 font-mono text-xs font-bold rounded-lg">
                PRJ-001
              </span>
              <span className="px-3 py-1 bg-blue-950 border border-blue-800 text-blue-300 text-xs font-semibold rounded-lg uppercase">
                IN_CORSO
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white">Piano Strategico di Intervento & Operation</h1>
            <p className="text-xs text-gray-400">Riorganizzazione e sviluppo commerciale</p>
          </div>

          <button
            onClick={() => {
              // Navigazione pulita verso l'hub o la lista aziende
              router.push('/admin'); // Sostituisci con la rotta esatta dell'hub azienda es. /aziende
            }}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            ← Torna all'Hub Azienda
          </button>
        </div>

        {/* Tab di navigazione interna */}
        <div className="flex gap-6 border-b border-gray-800 pb-4 text-sm font-semibold">
          <button
            onClick={() => { setActiveTab('questionari'); setShowModuliSelector(false); }}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'questionari' ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            📋 Questionari & Assessment
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'business' ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            📊 Business Plan & Finanziario
          </button>
          <button
            onClick={() => setActiveTab('cronoprogramma')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'cronoprogramma' ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            📅 Cronoprogramma & Task
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'governance' ? 'text-white border-b-2 border-purple-500' : 'text-gray-400 hover:text-gray-200'}`}
          >
            👥 Ruoli & Governance
          </button>
        </div>

        {/* Sezione Contenuto Tab Questionari */}
        {activeTab === 'questionari' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-base font-bold text-white">Moduli Questionari del Progetto</h3>
                <p className="text-xs text-gray-400 mt-0.5">Compilazione guidata a due colonne (Moduli Master Q e salvataggio su DB).</p>
              </div>
              <button
                onClick={() => setShowModuliSelector(true)}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all cursor-pointer"
              >
                + Nuovo Modulo Q
              </button>
            </div>

            {/* Sostituzione dinamica: Vista vuota vs Selettore Moduli Master */}
            {!showModuliSelector ? (
              <div className="p-12 text-center border border-gray-800/80 bg-gray-950 rounded-xl">
                <p className="text-sm text-gray-400">Nessun questionario compilato per questo progetto.</p>
                <p className="text-xs text-gray-500 mt-1">Clicca su &quot;+ Nuovo Modulo Q&quot; per avviare l&apos;assessment attingendo dalla libreria master.</p>
              </div>
            ) : (
              <div className="p-6 bg-gray-950 border border-purple-500/40 rounded-xl space-y-4">
                <div className="flex justify-between items-center border-b border-gray-800 pb-3">
                  <h4 className="text-sm font-bold text-purple-400 uppercase">Seleziona Modulo Master da Attivare</h4>
                  <button
                    onClick={() => setShowModuliSelector(false)}
                    className="text-xs text-gray-400 hover:text-white cursor-pointer"
                  >
                    ✕ Chiudi
                  </button>
                </div>
                <div className="space-y-2">
                  {/* Esempio di scelta rapida dai moduli master sincronizzati */}
                  <div className="p-4 bg-gray-900 border border-gray-800 rounded-xl flex justify-between items-center hover:border-purple-500 transition-all cursor-pointer">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase">MOD-001</span>
                      <h5 className="text-sm font-bold text-white mt-0.5">Assessment Organizzativo & Commerciale</h5>
                    </div>
                    <span className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg">Seleziona →</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </main>
  );
}
