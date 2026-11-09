'use client';

import { useState } from 'react';
import { OfferModule, CommercialOffer } from './OfferBuilderView';

interface OfferCreateViewProps {
  companyName: string;
  advisorName: string;
  nextOfferCode: string;
  availableModules: OfferModule[];
  onSave: (newOffer: CommercialOffer) => void;
  onCancel: () => void;
}

export function OfferCreateView({
  companyName,
  advisorName,
  nextOfferCode,
  availableModules,
  onSave,
  onCancel
}: OfferCreateViewProps) {
  const [offerTitle, setOfferTitle] = useState('');
  const [attentionName, setAttentionName] = useState('');
  const [attentionEmail, setAttentionEmail] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [selectedModules, setSelectedModules] = useState<OfferModule[]>([]);

  const handleAddModule = (mod: OfferModule) => {
    if (!selectedModules.some(m => m.id === mod.id)) {
      setSelectedModules([...selectedModules, mod]);
    }
  };

  const handleRemoveModule = (id: string) => {
    setSelectedModules(selectedModules.filter(m => m.id !== id));
  };

  const totalFee = selectedModules.reduce((acc, m) => acc + m.fee, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim() || selectedModules.length === 0) {
      alert('Inserisci un titolo e seleziona almeno un modulo.');
      return;
    }

    const newOffer: CommercialOffer = {
      id: `off-${Date.now()}`,
      code: nextOfferCode,
      title: offerTitle,
      submissionDate: new Date().toISOString().split('T')[0],
      status: 'In attesa',
      attentionName: attentionName || 'Referente Aziendale',
      attentionEmail: attentionEmail || 'cliente@azienda.it',
      modules: selectedModules,
      totalFee: totalFee,
      notes: offerDescription
    };

    onSave(newOffer);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-950 border border-indigo-500/40 p-8 rounded-2xl space-y-8 shadow-2xl">
      
      {/* Header Pagina Creazione */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-black text-white uppercase tracking-wider">Composizione Nuova Offerta Commerciale</h3>
          <p className="text-xs text-gray-400 mt-1">Configora i moduli strategici e definisci il perimetro economico per {companyName}.</p>
        </div>
        <span className="px-3.5 py-1.5 bg-indigo-950 border border-indigo-800 text-indigo-300 font-mono text-xs font-bold rounded-xl shadow-inner">
          Codice: {nextOfferCode}
        </span>
      </div>

      {/* Dati Generali */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div>
          <label className="block text-gray-400 mb-1.5 font-bold uppercase text-[10px] tracking-wider">Cliente (Azienda)</label>
          <input
            type="text"
            value={companyName}
            disabled
            className="w-full bg-gray-900 border border-gray-800 px-3.5 py-2.5 rounded-xl text-gray-400 cursor-not-allowed font-medium"
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1.5 font-bold uppercase text-[10px] tracking-wider">Titolo Proposta</label>
          <input
            type="text"
            placeholder="Es. Proposta di Intervento Strategico & Operations"
            value={offerTitle}
            onChange={e => setOfferTitle(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1.5 font-bold uppercase text-[10px] tracking-wider">Alla Cortese Attenzione di</label>
          <input
            type="text"
            placeholder="Es. Mario Rossi"
            value={attentionName}
            onChange={e => setAttentionName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1.5 font-bold uppercase text-[10px] tracking-wider">Email Destinatario</label>
          <input
            type="email"
            placeholder="mario.rossi@azienda.it"
            value={attentionEmail}
            onChange={e => setAttentionEmail(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-400 mb-1.5 font-bold uppercase text-[10px] tracking-wider">Descrizione / Note e Condizioni</label>
          <textarea
            rows={3}
            placeholder="Sintesi degli obiettivi, scadenze e condizioni generali di erogazione..."
            value={offerDescription}
            onChange={e => setOfferDescription(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Selezione Moduli dal Catalogo */}
      <div className="space-y-4 pt-6 border-t border-gray-800">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Catalogo Moduli Disponibili</h4>
          <span className="text-[11px] font-mono text-indigo-400 font-bold">{selectedModules.length} moduli selezionati</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableModules.map(mod => {
            const isSelected = selectedModules.some(m => m.id === mod.id);
            return (
              <div key={mod.id} className={`p-4 rounded-xl border transition-all flex justify-between items-start gap-4 ${isSelected ? 'bg-indigo-950/40 border-indigo-500/70 shadow-md' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                <div>
                  <span className="text-[9px] font-mono uppercase text-indigo-400 font-semibold tracking-wide block">{mod.category} › {mod.subcategory}</span>
                  <h5 className="text-xs font-bold text-white mt-1">{mod.title}</h5>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{mod.description}</p>
                  <div className="mt-3 flex items-center gap-3 font-mono text-xs">
                    <span className="text-emerald-400 font-extrabold">€ {mod.fee.toLocaleString()}</span>
                    <span className="text-gray-500">•</span>
                    <span className="text-gray-400">{mod.estimatedWeeks} settimane</span>
                  </div>
                </div>
                <div>
                  {!isSelected ? (
                    <button type="button" onClick={() => handleAddModule(mod)} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold rounded-xl shadow cursor-pointer transition-all">
                      + Aggiungi
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleRemoveModule(mod.id)} className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-[10px] font-bold rounded-xl cursor-pointer transition-all">
                      Rimuovi
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Riepilogo Totale e Azioni di Uscita / Salvataggio */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-6 border-t border-gray-800 gap-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Valore Totale Fee Professionali</span>
          <span className="text-2xl font-black text-emerald-400 font-mono">€ {totalFee.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button type="button" onClick={onCancel} className="flex-1 md:flex-none px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer transition-all">
            Annulla
          </button>
          <button type="submit" className="flex-1 md:flex-none px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg cursor-pointer transition-all">
            Salva e Genera Offerta
          </button>
        </div>
      </div>

    </form>
  );
}
