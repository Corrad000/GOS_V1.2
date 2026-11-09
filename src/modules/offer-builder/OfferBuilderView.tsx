'use client';

import { useState } from 'react';
import { OfferCreateView } from './OfferCreateView';

export interface OfferModule {
  id: string;
  category: string;
  subcategory: string;
  title: string;
  description: string;
  estimatedWeeks: number;
  fee: number;
}

export interface CommercialOffer {
  id: string;
  code: string;
  title: string;
  submissionDate: string;
  status: 'In attesa' | 'Approvata' | 'Attiva' | 'Rifiutata' | 'Pagata' | 'Non pagata';
  attentionName: string;
  attentionEmail: string;
  modules: OfferModule[];
  totalFee: number;
  notes: string;
}

interface OfferBuilderViewProps {
  companyName: string;
  advisorName: string;
}

const AVAILABLE_CATALOG_MODULES: OfferModule[] = [
  { id: 'm1', category: 'Strategy & Governance', subcategory: 'Audit & Diagnostica', title: 'Audit Strategico & Diagnostica Aziendale', description: 'Analisi preliminare di bilancio, assetto organizzativo e posizionamento di mercato.', estimatedWeeks: 3, fee: 8500 },
  { id: 'm2', category: 'Commercial Development', subcategory: 'Sales & Marketing', title: 'Costituzione Dipartimento Marketing & Vendite', description: 'Definizione della rete commerciale, playbook, CRM e KPI di vendita.', estimatedWeeks: 8, fee: 18000 },
  { id: 'm3', category: 'Financial Control', subcategory: 'Budgeting & P&L', title: 'Controllo di Gestione & Budgeting Quinquennale', description: 'Implementazione motore economico-finanziario, CE, Cash Flow e Piano Debiti.', estimatedWeeks: 4, fee: 12000 },
  { id: 'm4', category: 'Operations', subcategory: 'Supply Chain & Opex', title: 'Riorganizzazione Operations & Supply Chain', description: 'Efficientamento dei processi produttivi e logistici, riduzione dei costi operativi (Opex).', estimatedWeeks: 6, fee: 15000 },
  { id: 'm5', category: 'Executive Advisory', subcategory: 'Advisory Continuativo', title: 'Executive Advisory & Governance di Progetto', description: 'Affiancamento strategico continuativo, comitati di pilotaggio e supervisione esecutiva.', estimatedWeeks: 12, fee: 24000 }
];

export function OfferBuilderView({ companyName, advisorName }: OfferBuilderViewProps) {
  const [offers, setOffers] = useState<CommercialOffer[]>([
    {
      id: 'off-1',
      code: 'FCO-0001',
      title: 'Proposta di Riorganizzazione Strategica & Commerciale',
      submissionDate: '2026-10-15',
      status: 'Approvata',
      attentionName: 'Mario Rossi',
      attentionEmail: 'm.rossi@superpower.it',
      modules: [AVAILABLE_CATALOG_MODULES[0], AVAILABLE_CATALOG_MODULES[1]],
      totalFee: 26500,
      notes: 'Offerta sottomessa e approvata dal CdA.'
    }
  ]);

  // Gestione vista: 'list' | 'create'
  const [currentView, setCurrentView] = useState<'list' | 'create'>('list');
  const [selectedOfferForPreview, setSelectedOfferForPreview] = useState<CommercialOffer | null>(null);

  const nextOfferCode = `FCO-000${offers.length + 1}`;

  const handleSaveNewOffer = (newOffer: CommercialOffer) => {
    setOffers([newOffer, ...offers]);
    setCurrentView('list');
  };

  const updateOfferStatus = (id: string, newStatus: CommercialOffer['status']) => {
    setOffers(offers.map(o => o.id === id ? { ...o, status: newStatus } : o));
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER SEZIONE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-white">Offer Builder — Proposte Commerciali</h2>
          <p className="text-xs text-gray-400">Gestione e composizione modulare delle offerte commerciali per {companyName}.</p>
        </div>
        
        {currentView === 'list' && (
          <button
            onClick={() => setCurrentView('create')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <span>+ Nuova Offerta</span>
          </button>
        )}
      </div>

      {/* RENDER CONDIZIONALE: VISTA CREAZIONE vs VISTA LISTA */}
      {currentView === 'create' ? (
        <OfferCreateView
          companyName={companyName}
          advisorName={advisorName}
          nextOfferCode={nextOfferCode}
          availableModules={AVAILABLE_CATALOG_MODULES}
          onSave={handleSaveNewOffer}
          onCancel={() => setCurrentView('list')}
        />
      ) : (
        <div className="space-y-4 bg-gray-950 p-6 rounded-xl border border-gray-800 shadow-xl">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Storico Offerte Commerciali ({offers.length})</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-900 uppercase text-gray-400 font-mono text-[10px]">
                <tr>
                  <th className="p-3">Codice</th>
                  <th className="p-3">Titolo / Oggetto</th>
                  <th className="p-3">Destinatario</th>
                  <th className="p-3">Data Sottomissione</th>
                  <th className="p-3">Totale Fee</th>
                  <th className="p-3">Stato Offerta</th>
                  <th className="p-3 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {offers.map(off => (
                  <tr key={off.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="p-3 font-mono font-bold text-indigo-400">{off.code}</td>
                    <td className="p-3 font-bold text-white">{off.title}</td>
                    <td className="p-3 text-gray-300">{off.attentionName} <br/><span className="text-[10px] text-gray-500">{off.attentionEmail}</span></td>
                    <td className="p-3 font-mono text-gray-400">{off.submissionDate}</td>
                    <td className="p-3 font-mono font-bold text-emerald-400">€ {off.totalFee.toLocaleString()}</td>
                    <td className="p-3">
                      <select
                        value={off.status}
                        onChange={(e) => updateOfferStatus(off.id, e.target.value as CommercialOffer['status'])}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border cursor-pointer ${
                          off.status === 'Approvata' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' :
                          off.status === 'Attiva' ? 'bg-blue-950 text-blue-300 border-blue-800' :
                          off.status === 'Pagata' ? 'bg-green-950 text-green-300 border-green-800' :
                          off.status === 'Rifiutata' || off.status === 'Non pagata' ? 'bg-red-950 text-red-300 border-red-800' :
                          'bg-amber-950 text-amber-300 border-amber-800'
                        }`}
                      >
                        <option value="In attesa">In attesa</option>
                        <option value="Approvata">Approvata</option>
                        <option value="Attiva">Attiva</option>
                        <option value="Rifiutata">Rifiutata</option>
                        <option value="Pagata">Pagata</option>
                        <option value="Non pagata">Non pagata</option>
                      </select>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedOfferForPreview(off)}
                        className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-700 text-gray-200 text-xs font-bold rounded-xl cursor-pointer transition-all"
                      >
                        📄 Anteprima / Stampa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- MODALE ANTEPRIMA STAMPA OFFERTA --- */}
      {selectedOfferForPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-black w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between px-8 py-4 bg-gray-100 border-b border-gray-200">
              <div>
                <h3 className="font-black text-sm uppercase">Proposta Commerciale — {selectedOfferForPreview.code}</h3>
                <p className="text-[10px] text-gray-600">{companyName} — Stato: {selectedOfferForPreview.status}</p>
              </div>
              <button
                onClick={() => setSelectedOfferForPreview(null)}
                className="text-gray-600 hover:text-black font-bold px-3 py-1 bg-gray-200 rounded-lg cursor-pointer text-xs"
              >
                ✕ Chiudi
              </button>
            </div>

            <div className="p-10 overflow-y-auto space-y-8 flex-1 font-sans">
              <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black uppercase">Glaring LLP — Executive Proposal</h1>
                  <p className="text-xs font-bold text-indigo-700 mt-1">{selectedOfferForPreview.title}</p>
                </div>
                <div className="text-right font-mono text-xs text-gray-700 space-y-1">
                  <div><strong>Codice:</strong> {selectedOfferForPreview.code}</div>
                  <div><strong>Cliente:</strong> {companyName}</div>
                  <div><strong>Alla c.a.:</strong> {selectedOfferForPreview.attentionName} ({selectedOfferForPreview.attentionEmail})</div>
                  <div><strong>Advisor:</strong> {advisorName}</div>
                  <div><strong>Data:</strong> {selectedOfferForPreview.submissionDate}</div>
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-xs font-black uppercase text-gray-500 tracking-wider">Moduli e Servizi Inclusi</h2>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-100 border-b border-gray-300">
                      <th className="p-2.5 text-left font-black">Modulo Strategico</th>
                      <th className="p-2.5 text-left font-black">Categoria</th>
                      <th className="p-2.5 text-left font-black">Durata</th>
                      <th className="p-2.5 text-right font-black">Fee Professionale</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOfferForPreview.modules.map(m => (
                      <tr key={m.id} className="border-b border-gray-200">
                        <td className="p-2.5 font-bold">{m.title}<div className="text-[10px] font-normal text-gray-600">{m.description}</div></td>
                        <td className="p-2.5 text-gray-600 font-mono text-[10px]">{m.category}</td>
                        <td className="p-2.5 font-mono">{m.estimatedWeeks} settimane</td>
                        <td className="p-2.5 text-right font-mono font-bold">€ {m.fee.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                <div>
                  <span className="block text-[10px] font-bold text-gray-500 uppercase">Stato Attuale Proposta</span>
                  <span className="text-sm font-black text-indigo-700">{selectedOfferForPreview.status}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] font-bold text-gray-500 uppercase">Valore Totale Proposta (Fee)</span>
                  <span className="text-lg font-black text-emerald-700 font-mono">€ {selectedOfferForPreview.totalFee.toLocaleString()}</span>
                </div>
              </div>

              {selectedOfferForPreview.notes && (
                <div className="text-[11px] text-gray-600 pt-4 border-t border-gray-200">
                  <strong>Note & Condizioni:</strong> {selectedOfferForPreview.notes}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 px-8 py-4 bg-gray-100 border-t border-gray-200">
              <button
                onClick={() => setSelectedOfferForPreview(null)}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-black text-xs font-bold rounded-xl cursor-pointer"
              >
                Indietro
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>🖨️ Stampa / Esporta PDF Offerta</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
