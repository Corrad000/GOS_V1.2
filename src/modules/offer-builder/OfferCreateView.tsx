'use client';

import { useState, useEffect } from 'react';
import { OfferModule, CommercialOffer } from './OfferBuilderView';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';

interface OfferCreateViewProps {
  companyCode?: string;
  companyName: string;
  companyAddress?: string;     // <-- Aggiunto
  companyVat?: string;         // <-- Aggiunto
  companyPhone?: string;       // <-- Aggiunto
  companyContact?: string;     // <-- Aggiunto
  companyEmail?: string;       // <-- Aggiunto
  advisorName: string;
  nextOfferCode: string;
  availableModules: OfferModule[];
  initialOffer?: CommercialOffer | null;
  onSave: (newOffer: CommercialOffer) => void;
  onCancel: () => void;
}

export function OfferCreateView({
  companyCode,
  companyName,
  companyAddress,
  companyVat,
  companyPhone,
  companyContact,
  companyEmail,
  advisorName,
  nextOfferCode,
  availableModules,
  initialOffer,
  onSave,
  onCancel
}: OfferCreateViewProps) {
  const [offerTitle, setOfferTitle] = useState(initialOffer ? initialOffer.title : '');
  
  // Stati anagrafici precompilati con i dati ereditati dall'azienda (o modificabili all'occorrenza)
  const [attentionName, setAttentionName] = useState(initialOffer ? initialOffer.attentionName : (companyContact || 'Referente Aziendale'));
  const [attentionEmail, setAttentionEmail] = useState(initialOffer ? initialOffer.attentionEmail : (companyEmail || 'cliente@azienda.it'));
  const [clientAddress, setClientAddress] = useState(companyAddress || '');
  const [clientVat, setClientVat] = useState(companyVat || '');
  const [clientPhone, setClientPhone] = useState(companyPhone || '');
  
  // Campi strutturati richiesti
  const [offerDescription, setOfferDescription] = useState(initialOffer ? initialOffer.notes : '');
  const [offerNotes, setOfferNotes] = useState(initialOffer?.notes || '');
  const [offerTempi, setOfferTempi] = useState('');
  const [offerFee, setOfferFee] = useState(initialOffer ? String(initialOffer.totalFee) : '');
  const [offerValuta, setOfferValuta] = useState('EUR');

  const [selectedModules, setSelectedModules] = useState<OfferModule[]>(initialOffer ? initialOffer.modules : []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Categorie Master estratte dinamicamente
  const categories = Array.from(new Set(availableModules.map(m => m.category)));
  const [activeCategory, setActiveCategory] = useState<string>(categories[0] || '');

  // LOGICA DI AUTO-NUMERAZIONE GERARCHICA DEI PARAGRAFI
  const processedCategories = categories.map((catName, catIdx) => {
    const catNum = catIdx + 1;
    const catModules = availableModules.filter(m => m.category === catName);
    const assignedModulesWithIndex = catModules.map((mod, modIdx) => ({
      ...mod,
      autoIndex: `${catNum}.${modIdx + 1}`
    }));
    return {
      categoryName: catName,
      categoryNumber: catNum,
      modules: assignedModulesWithIndex
    };
  });

  const activeCategoryObj = processedCategories.find(c => c.categoryName === activeCategory);
  const filteredModules = activeCategoryObj ? activeCategoryObj.modules : [];
  const activeCategoryNumber = activeCategoryObj ? activeCategoryObj.categoryNumber : 1;

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
        notes: `Indirizzo: ${clientAddress} | P.IVA: ${clientVat} | Telefono: ${clientPhone} | Descrizione: ${offerDescription} | Note: ${offerNotes} | Tempi: ${offerTempi} | Valuta: ${offerValuta}`
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
        notes: `Indirizzo: ${clientAddress} | P.IVA: ${clientVat} | Telefono: ${clientPhone} | Descrizione: ${offerDescription} | Note: ${offerNotes} | Tempi: ${offerTempi} | Valuta: ${offerValuta}`
      };
      onSave(fallbackOffer);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* ANAGRAFICA AZIENDA EREDITATA DA GOS_AZIENDE */}
      <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-3">
        <span className="text-[10px] font-mono font-bold uppercase text-[#FF5500] tracking-wider block">
          Anagrafica Cliente (Ereditata da gos_aziende)
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-gray-400 mb-1 font-bold uppercase text-[9px]">Ragione Sociale</label>
            <input
              type="text"
              value={companyName}
              disabled
              className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-gray-300 font-medium cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1 font-bold uppercase text-[9px]">Partita IVA / Codice Fiscale</label>
            <input
              type="text"
              placeholder="Inserisci P.IVA..."
              value={clientVat}
              onChange={e => setClientVat(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-1 font-bold uppercase text-[9px]">Indirizzo Sede</label>
            <input
              type="text"
              placeholder="Inserisci indirizzo completo..."
              value={clientAddress}
              onChange={e => setClientAddress(e.target.value)}
              className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Dati Generali & Campi Strutturati */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
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
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Telefono Aziendale / Contatto</label>
          <input
            type="text"
            placeholder="Es. +39 070 123456"
            value={clientPhone}
            onChange={e => setClientPhone(e.target.value)}
            className="w-full bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-white focus:border-[#FF5500] focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px] tracking-wider">Alla Cortese Attenzione di (Referente)</label>
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

      {/* FLUSSO GERARCHICO: CATEGORIE MASTER -> MODULI CON NUMERAZIONE AUTOMATICA */}
      <div className="space-y-4 pt-4 border-t border-gray-800">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">Selezione Categoria Master & Moduli</h4>
            <span className="px-2 py-0.5 bg-orange-950 text-orange-400 font-mono text-[10px] font-bold rounded border border-orange-800">
              Par. {activeCategoryNumber}
            </span>
          </div>
          <span className="text-[11px] font-mono text-[#FF5500] font-bold">{selectedModules.length} moduli inseriti nell&apos;offerta</span>
        </div>

        {/* Tab Categorie Master con indicatore numerico del paragrafo */}
        <div className="flex flex-wrap gap-2">
          {processedCategories.map((cat) => (
            <button
              key={cat.categoryName}
              type="button"
              onClick={() => setActiveCategory(cat.categoryName)}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                activeCategory === cat.categoryName
                  ? 'bg-[#FF5500] text-white shadow'
                  : 'bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800'
              }`}
            >
              <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${activeCategory === cat.categoryName ? 'bg-black/30 text-white' : 'bg-gray-950 text-gray-400'}`}>
                {cat.categoryNumber}.0
              </span>
              <span>{cat.categoryName}</span>
            </button>
          ))}
        </div>

        {/* Moduli della Categoria Selezionata con auto-indice (es. 3.1, 3.2) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredModules.map(mod => {
            const isSelected = selectedModules.some(m => m.id === mod.id);
            return (
              <div key={mod.id} className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between space-y-2.5 ${isSelected ? 'bg-orange-950/30 border-orange-500/70 shadow' : 'bg-gray-900 border-gray-800 hover:border-gray-700'}`}>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-[#FF5500] font-bold tracking-wide">
                      Par. {(mod as any).autoIndex} — {mod.subcategory}
                    </span>
                  </div>
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
