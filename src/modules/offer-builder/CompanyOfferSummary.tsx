'use client';

import React from 'react';

interface CompanyOfferSummaryProps {
  selectedModules: any[];
  onRemoveModule: (moduleId: string) => void;
  onOpenPicker: () => void;
}

export function CompanyOfferSummary({ selectedModules, onRemoveModule, onOpenPicker }: CompanyOfferSummaryProps) {
  // Calcolo totali offerta
  const totalFee = selectedModules.reduce((acc, m) => acc + Number(m.fee || m.prezzo || 0), 0);
  const totalWeeks = selectedModules.reduce((acc, m) => acc + Number(m.estimatedWeeks || m.tempi_realizzazione || 4), 0);

  return (
    <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <span className="px-2.5 py-0.5 bg-orange-950 text-orange-400 border border-orange-800 font-mono text-[10px] font-bold rounded uppercase">
            Composizione Offerta
          </span>
          <h3 className="text-base font-bold text-white uppercase tracking-wider mt-1">
            Moduli Selezionati per l&apos;Azienda
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Riepilogo dei blocchi di servizio inclusi in questa proposta commerciale.</p>
        </div>

        <button
          type="button"
          onClick={onOpenPicker}
          className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
        >
          + Aggiungi Modulo da Catalogo
        </button>
      </div>

      {selectedModules.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
          <p className="text-sm text-gray-400">Nessun modulo aggiunto a questa offerta.</p>
          <button
            type="button"
            onClick={onOpenPicker}
            className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            Scegli il primo modulo dal catalogo
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedModules.map((mod, idx) => (
              <div key={mod.id || idx} className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-3 flex flex-col justify-between">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <span className="px-2.5 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-[10px] font-bold rounded uppercase">
                      {idx + 1}.0 — {mod.subcategory || 'Standard'}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveModule(mod.id)}
                      className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-0.5 bg-red-950/50 border border-red-900 rounded cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  </div>
                  <h4 className="text-sm font-bold text-white">{mod.title || mod.titolo}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{mod.description || mod.descrizione || 'Nessuna descrizione specificata.'}</p>
                </div>

                <div className="pt-3 border-t border-gray-900 flex justify-between items-center font-mono text-xs">
                  <span className="text-emerald-400 font-extrabold">EUR {Number(mod.fee || mod.prezzo || 0).toLocaleString()}</span>
                  <span className="text-gray-400">{mod.estimatedWeeks || 4} settimane</span>
                </div>
              </div>
            ))}
          </div>

          {/* BOX TOTALI COMPLESSIVI */}
          <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex justify-between items-center font-mono">
            <span className="text-xs text-gray-400 uppercase font-bold">Totale Complessivo Proposta:</span>
            <div className="flex gap-6 text-sm">
              <span className="text-emerald-400 font-extrabold">EUR {totalFee.toLocaleString()}</span>
              <span className="text-gray-300 font-bold">{totalWeeks} settimane stimate</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
