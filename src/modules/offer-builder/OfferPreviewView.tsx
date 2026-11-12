'use client';

import React from 'react';
import { offerReportService } from '@/services/pdf/OfferReportService';

interface OfferPreviewViewProps {
  companyData: any;
  selectedModules: any[];
  onBackToBuilder: () => void;
}

export function OfferPreviewView({ companyData, selectedModules, onBackToBuilder }: OfferPreviewViewProps) {
  const totalFee = selectedModules.reduce((acc, m) => acc + Number(m.fee || m.prezzo || 0), 0);
  const totalWeeks = selectedModules.reduce((acc, m) => acc + Number(m.estimatedWeeks || m.tempi_realizzazione || 4), 0);

  // Funzione per generare e stampare il PDF tramite l'OfferReportService
  const handlePrintPdf = () => {
    const offerPayload = {
      code: `OFF-${companyData?.codice_azienda || 'GOS'}-${Date.now().toString().slice(-4)}`,
      title: `Proposta Commerciale & Advisory — ${companyData?.ragione_sociale || 'Azienda'}`,
      submissionDate: new Date().toISOString(),
      status: 'Bozza',
      attentionName: companyData?.referente || 'Direzione Generale',
      attentionEmail: companyData?.email || 'N/D',
      totalFee: totalFee,
      notes: 'Offerta soggetta a conferma e validità di 30 giorni dalla data di emissione.',
      modules: selectedModules.map(m => ({
        title: m.title || m.titolo || 'Modulo Servizio',
        description: m.description || m.descrizione || '',
        category: m.category || m.categoria || 'Advisory',
        estimatedWeeks: Number(m.estimatedWeeks || m.tempi_realizzazione || 4),
        fee: Number(m.fee || m.prezzo || 0)
      }))
    };

    try {
      offerReportService.printOfferReport(
        offerPayload,
        companyData?.ragione_sociale || 'Azienda Cliente',
        companyData?.advisor_nome || 'Corrado Pinna'
      );
    } catch (err: any) {
      console.error('Errore generazione PDF offerta:', err);
      alert('Impossibile generare il PDF dell\'offerta.');
    }
  };

  return (
    <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-8 space-y-8 shadow-2xl max-w-4xl mx-auto">
      {/* Intestazione Anteprima */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <span className="px-2.5 py-1 bg-orange-950 text-orange-400 border border-orange-800 font-mono text-[10px] font-bold rounded uppercase">
            Anteprima Proposta Commerciale
          </span>
          <h2 className="text-2xl font-extrabold text-white uppercase tracking-tight mt-1">
            Offerta Servizi & Advisory
          </h2>
        </div>
        <button
          type="button"
          onClick={onBackToBuilder}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-xl text-xs font-bold transition-all cursor-pointer"
        >
          &larr; Torna al Builder
        </button>
      </div>

      {/* Dati Cliente */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-950 p-6 rounded-xl border border-gray-800 text-xs">
        <div className="space-y-1">
          <span className="text-gray-500 font-mono uppercase text-[10px]">Cliente / Committente</span>
          <div className="text-sm font-bold text-white">{companyData?.ragione_sociale || 'Azienda Cliente'}</div>
          <div className="text-gray-400">P.IVA / C.F.: {companyData?.partita_iva || companyData?.codice_fiscale || 'N/D'}</div>
          <div className="text-gray-400">{companyData?.indirizzo || ''}</div>
        </div>
        <div className="space-y-1 md:text-right">
          <span className="text-gray-500 font-mono uppercase text-[10px]">Riferimenti Emittente</span>
          <div className="text-sm font-bold text-[#FF5500]">Glaring LLP</div>
          <div className="text-gray-400">Advisor: {companyData?.advisor_nome || 'Corrado Pinna'}</div>
          <div className="text-gray-400">Data: {new Date().toLocaleDateString('it-IT')}</div>
        </div>
      </div>

      {/* Contenuto in chiaro dei moduli */}
      <div className="space-y-6">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-gray-800 pb-2">
          1. Dettaglio Moduli & Deliverables
        </h3>

        {selectedModules.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 italic">
            Nessun modulo incluso in questa proposta. Torna al builder per selezionarli.
          </div>
        ) : (
          <div className="space-y-6">
            {selectedModules.map((mod, idx) => (
              <div key={mod.id || idx} className="bg-gray-950 border border-gray-800 p-6 rounded-xl space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-[10px] font-bold rounded uppercase">
                      Modulo {idx + 1} — {mod.subcategory || 'Standard'}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">{mod.title || mod.titolo}</h4>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-sm font-extrabold text-emerald-400">EUR {Number(mod.fee || mod.prezzo || 0).toLocaleString()}</div>
                    <div className="text-[11px] text-gray-400">{mod.estimatedWeeks || mod.tempi_realizzazione || 4} settimane</div>
                  </div>
                </div>

                <div className="space-y-2 text-xs pt-2 border-t border-gray-900">
                  <div>
                    <strong className="text-gray-400 uppercase text-[10px] block font-mono">Descrizione & Obiettivi:</strong>
                    <p className="text-gray-200 leading-relaxed mt-0.5">{mod.description || mod.descrizione || 'Nessuna descrizione.'}</p>
                  </div>

                  {mod.note && (
                    <div className="pt-2">
                      <strong className="text-gray-400 uppercase text-[10px] block font-mono">Note Operative / Condizioni:</strong>
                      <p className="text-gray-300 leading-relaxed mt-0.5">{mod.note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Riepilogo Economico & Temporale */}
      <div className="bg-gray-950 border border-gray-800 p-6 rounded-xl space-y-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider border-b border-gray-800 pb-2">
          2. Riepilogo Finanziario & Tempistiche
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs pt-2">
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex justify-between items-center">
            <span className="text-gray-400 uppercase">Valore Totale Proposta:</span>
            <span className="text-emerald-400 text-base font-extrabold">EUR {totalFee.toLocaleString()}</span>
          </div>

          <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex justify-between items-center">
            <span className="text-gray-400 uppercase">Durata Stimata Complessiva:</span>
            <span className="text-white text-base font-extrabold">{totalWeeks} settimane</span>
          </div>
        </div>
      </div>

      {/* Pulsanti Azione Finale */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
        <button
          type="button"
          onClick={onBackToBuilder}
          className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl cursor-pointer"
        >
          Modifica Offerta
        </button>
        <button
          type="button"
          onClick={handlePrintPdf}
          className="px-6 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider"
        >
          Esporta / Stampa Proposta PDF
        </button>
      </div>
    </div>
  );
}
