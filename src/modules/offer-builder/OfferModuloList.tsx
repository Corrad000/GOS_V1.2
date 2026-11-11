'use client';

import React from 'react';

interface OfferModuloListProps {
  selectedCategory: any;
  modules: any[];
  loading: boolean;
  onOpenCreateModal: () => void;
}

export function OfferModuloList({
  selectedCategory,
  modules,
  loading,
  onOpenCreateModal
}: OfferModuloListProps) {
  return (
    <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Moduli di Offerta per: <span className="text-[#FF5500]">{selectedCategory?.nome || 'Seleziona una categoria'}</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Componi i blocchi di servizio e i listini associati a questa area.</p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
        >
          + Aggiungi Modulo Offerta
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-400 text-xs font-mono">Caricamento moduli in corso...</div>
      ) : modules.length === 0 ? (
        <div className="p-12 text-center text-gray-400 text-xs font-mono border border-dashed border-gray-800 rounded-xl">
          Nessun modulo di offerta configurato in questa categoria. Clicca su &quot;+ Aggiungi Modulo Offerta&quot; per iniziare.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((mod) => (
            <div key={mod.id} className="bg-gray-950 border border-gray-800/80 rounded-xl p-5 space-y-3 hover:border-gray-700 transition-all">
              <div className="flex justify-between items-start">
                <h4 className="text-sm font-bold text-white">{mod.titolo}</h4>
                <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-lg text-[10px] font-mono font-bold">
                  {mod.stato || 'Attivo'}
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">{mod.descrizione || 'Nessuna descrizione specificata.'}</p>
              <div className="flex justify-between items-center pt-2 border-t border-gray-900 text-[10px] font-mono text-gray-500">
                <span>Versione: <strong className="text-gray-300">{mod.versione || '1.0'}</strong></span>
                <button onClick={() => alert(`Configurazione modulo: ${mod.titolo}`)} className="text-[#FF5500] hover:underline cursor-pointer font-bold">Configura →</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
