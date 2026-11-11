'use client';

import { useState, useEffect } from 'react';
import { OfferModule, CommercialOffer } from './OfferBuilderView';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';

interface OfferCreateViewProps {
  companyCode?: string;
  companyName: string;
  advisorName: string;
  nextOfferCode: string;
  availableModules: OfferModule[];
  initialOffer?: CommercialOffer | null; // <-- Supporto modifica
  onSave: (newOffer: CommercialOffer) => void;
  onCancel: () => void;
}

export function OfferCreateView({
  companyCode,
  companyName,
  advisorName,
  nextOfferCode,
  availableModules,
  initialOffer,
  onSave,
  onCancel
}: OfferCreateViewProps) {
  const [offerTitle, setOfferTitle] = useState(initialOffer ? initialOffer.title : '');
  const [attentionName, setAttentionName] = useState(initialOffer ? initialOffer.attentionName : '');
  const [attentionEmail, setAttentionEmail] = useState(initialOffer ? initialOffer.attentionEmail : '');
  
  // Campi strutturati richiesti
  const [offerDescription, setOfferDescription] = useState(initialOffer ? initialOffer.notes : '');
  const [offerNotes, setOfferNotes] = useState(initialOffer?.notes || '');
  const [offerTempi, setOfferTempi] = useState('');
  const [offerFee, setOfferFee] = useState(initialOffer ? String(initialOffer.totalFee) : '');
  const [offerValuta, setOfferValuta] = useState('EUR');

  const [selectedModules, setSelectedModules] = useState<OfferModule[]>(initialOffer ? initialOffer.modules : []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = Array.from(new Set(availableModules.map(m => m.category)));
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || '');

  const handleAddModule = (mod: OfferModule) => {
    if (!selectedModules.some(m => m.id === mod.id)) {
      setSelectedModules([...selectedModules, mod]);
    }
  };

  const handleRemoveModule = (id: string) => {
    setSelectedModules(selectedModules.filter(m => m.id !== id));
  };

  const computedModulesFee = selectedModules.reduce((acc, m) => acc + m.fee, 0);
  const totalFee = offerFee ? parseFloat(offerFee) || 0 : computedModulesFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) {
      alert('Inserisci un titolo per l\'offerta.');
      return;
    }

    setIsSubmitting(true);

    try {
      const baseCompanyCode = companyCode || 'AZ-00024';
      const offerCode = initialOffer ? initialOffer.code : await generateGlobalActivityCode(baseCompanyCode, 'OFF');

      const savedOffer: CommercialOffer = {
        id: initialOffer ? initialOffer.id : `off-${Date.now()}`,
        code: offerCode,
        title: offerTitle,
        submissionDate: initialOffer ? initialOffer.submissionDate : new Date().toISOString().split('T')[0],
        status: initialOffer ? initialOffer.status : 'In attesa',
        attentionName: attentionName || 'Referente Aziendale',
        attentionEmail: attentionEmail || 'cliente@azienda.it',
        modules: selectedModules,
        totalFee: totalFee,
        notes: `Descrizione: ${offerDescription} | Note: ${offerNotes} | Tempi: ${offerTempi} | Valuta: ${offerValuta}`
      };

      onSave(savedOffer);
    } catch (err) {
      console.error('Errore salvataggio offerta:', err);
      const fallbackOffer: CommercialOffer = {
        id: initialOffer ? initialOffer.id : `off-${Date.now()}`,
        code: initialOffer ? initialOffer.code : nextOfferCode,
        title: offerTitle,
        submissionDate: initialOffer ? initialOffer.submissionDate : new Date().toISOString().split('T')[0],
        status: initialOffer ? initialOffer.status : 'In attesa',
        attentionName: attentionName || 'Referente Aziendale',
        attentionEmail: attentionEmail || 'cliente@azienda.it',
        modules: selectedModules,
        totalFee: totalFee,
        notes: `Descrizione: ${offerDescription} | Note: ${offerNotes} | Tempi: ${offerTempi} | Valuta: ${offerValuta}`
      };
      onSave(fallbackOffer);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredModules = availableModules.filter(m => m.category === activeCategory);

  return (
    <form onSubmit={handleSubmit} className="bg-gray-950 border border-[#FF5500]/40 p-6 rounded-2xl space-y-5 shadow-xl">
      
      {/* Header Pagina Creazione / Modifica */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            {initialOffer ? `Modifica Offerta — ${initialOffer.code}` : 'Composizione Nuova Offerta Commerciale'}
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Configura i moduli strategici e definisci il perimetro economico per {companyName}.</p>
        </div>
        <span className="px-3 py-1 bg-orange-950 border border-orange-800 text-orange-300 font-mono text-[11px] font-bold rounded-lg">
          {initialOffer ? initialOffer.code : 'Codice Auto-Sequenziale DB'}
        </span>
      </div>

      {/* Dati Generali & Campi Strutturati */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Cliente (Azienda)</label>
          <input
            type="text"
            value={companyName}
            disabled
            className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl text-gray-400 cursor-not-allowed font-medium"
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Titolo del Modulo / Proposta</label>
          <input
            type="text"
            placeholder="Es. Proposta di Intervento Strategico & Operations"
            value={offerTitle}
            onChange={e => setOfferTitle(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Alla Cortese Attenzione di</label>
          <input
            type="text"
            placeholder="Es. Mario Rossi"
            value={attentionName}
            onChange={e => setAttentionName(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
            required
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Email Destinatario</label>
          <input
            type="email"
            placeholder="mario.rossi@azienda.it"
            value={attentionEmail}
            onChange={e => setAttentionEmail(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
            required
          />
        </div>

        {/* Prezzo senza valuta e selettore valuta separato */}
        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Prezzo (Senza Valuta)</label>
          <input
            type="number"
            step="0.01"
            placeholder="Es. 5000 (o calcolato dai moduli)"
            value={offerFee}
            onChange={e => setOfferFee(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Valuta</label>
          <select
            value={offerValuta}
            onChange={e => setOfferValuta(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
          >
            <option value="EUR">EUR (€)</option>
            <option value="USD">USD ($)</option>
            <option value="GBP">GBP (£)</option>
            <option value="AED">AED (د.إ)</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Tempi di Realizzazione</label>
          <input
            type="text"
            placeholder="Es. 4-6 settimane / 30 giorni"
            value={offerTempi}
            onChange={e => setOfferTempi(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Note Operative</label>
          <input
            type="text"
            placeholder="Eventuali note o vincoli particolari..."
            value={offerNotes}
            onChange={e => setOfferNotes(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Descrizione del Modulo / Deliverables</label>
          <textarea
            rows={2}
            placeholder="Sintesi degli obiettivi, deliverables e condizioni generali di erogazione..."
            value={offerDescription}
            onChange={e => setOfferDescription(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
          />
        </div>
      </div>

      {/* FLUSSO GERARCHICO: CATEGORIE MASTER -> MODULI */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Selezione Categoria Master & Moduli</h4>
          <span className="text-[11px] font-mono text-[#FF5500] font-bold">{selectedModules.length} moduli inseriti nell&apos;offerta</span>
        </div>

        {/* Tab Categorie Master */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeCategory === cat
                  ? 'bg-[#FF5500] text-white shadow'
                  : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Moduli della Categoria Selezionata */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredModules.map(mod => {
            const isSelected = selectedModules.some(m => m.id === mod.id);
            return (
              <div key={mod.id} className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${isSelected ? 'bg-orange-950/30 border-orange-500/70 shadow' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase text-[#FF5500] font-semibold tracking-wide block">{mod.subcategory}</span>
                  <h5 className="text-xs font-bold text-white">{mod.title}</h5>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{mod.description}</p>
                  <div className="pt-1 flex items-center gap-3 font-mono text-xs">
                    <span className="text-emerald-400 font-extrabold">{offerValuta} {mod.fee.toLocaleString()}</span>
                    <span className="text-gray-500">|</span>
                    <span className="text-gray-400">{mod.estimatedWeeks} settimane</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800 flex justify-end">
                  {!isSelected ? (
                    <button type="button" onClick={() => handleAddModule(mod)} className="px-3 py-1.5 bg-[#FF5500] hover:bg-orange-600 text-white text-[10px] font-bold rounded-xl cursor-pointer transition-all">
                      + Aggiungi all&apos;offerta
                    </button>
                  ) : (
                    <button type="button" onClick={() => handleRemoveModule(mod.id)} className="px-3 py-1.5 bg-red-950 hover:bg-red-900 text-red-300 border border-red-800 text-[10px] font-bold rounded-xl cursor-pointer transition-all">
                      Rimuovi dall&apos;offerta
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Riepilogo Totale e Azioni */}
      <div className="flex flex-col md:flex-row justify-between items-center pt-4 border-t border-gray-800 gap-4">
        <div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Valore Totale Fee Professionali</span>
          <span className="text-xl font-black text-emerald-400 font-mono">{offerValuta} {totalFee.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button type="button" onClick={onCancel} className="flex-1 md:flex-none px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer transition-all">
            Annulla
          </button>
          <button type="submit" disabled={isSubmitting} className="flex-1 md:flex-none px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all disabled:opacity-50">
            {isSubmitting ? 'Salvataggio in corso...' : (initialOffer ? 'Aggiorna Offerta' : 'Salva e Genera Offerta')}
          </button>
        </div>
      </div>

    </form>
  );
}
