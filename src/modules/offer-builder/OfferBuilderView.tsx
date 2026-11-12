'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { OfferModuloList } from './OfferModuloList';
import { CompanyOfferSummary } from './CompanyOfferSummary';

interface OfferBuilderViewProps {
  companyId?: string;
  companyCode?: string;
  selectedCompanyModules: any[];
  onRemoveModule: (moduleId: string) => void;
  onOpenModulePicker?: (category: any) => void;
}

export function OfferBuilderView({ 
  companyId, 
  companyCode, 
  selectedCompanyModules, 
  onRemoveModule, 
  onOpenModulePicker 
}: OfferBuilderViewProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Modale creazione modulo offerta (mantenuta per retrocompatibilità o fallback)
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newTempi, setNewTempi] = useState('');
  const [newPrezzo, setNewPrezzo] = useState('');
  const [newValuta, setNewValuta] = useState('EUR');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento categorie dedicate alle OFFERTE da gos_offerte_categorie
  useEffect(() => {
    async function loadCategories() {
      setLoading(true);
      try {
        let { data, error } = await supabase.from('gos_offerte_categorie').select('*').order('nome');
        
        if (error || !data || data.length === 0) {
          data = [
            { id: 'cat-off-1', nome: 'Consulenza Strategica & Advisory' },
            { id: 'cat-off-2', nome: 'Automazione, CRM & Funnel' },
            { id: 'cat-off-3', nome: 'Finanza d’Impresa & Controllo' }
          ];
        }
        
        const cats = data || [];
        setCategories(cats);
        if (cats.length > 0 && !selectedCategory) {
          setSelectedCategory(cats[0]);
        }
      } catch (err: any) {
        console.error('Errore caricamento categorie offerte:', err?.message || err);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, [supabase]);

  // Caricamento moduli offerta per categoria da gos_offerte_moduli
  useEffect(() => {
    if (!selectedCategory) return;

    async function loadModules() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gos_offerte_moduli')
          .select('*')
          .eq('categoria_id', selectedCategory.id);

        if (error) {
          setModules([]);
        } else {
          setModules(data || []);
        }
      } catch (err: any) {
        console.error('Errore caricamento moduli offerta:', err?.message || err);
        setModules([]);
      } finally {
        setLoading(false);
      }
    }

    loadModules();
  }, [selectedCategory, supabase]);

  // Gestione del click sul pulsante "+ Aggiungi Modulo Offerta"
  const handleTriggerAddModule = () => {
    if (onOpenModulePicker && selectedCategory) {
      onOpenModulePicker(selectedCategory);
    } else {
      setShowModal(true);
    }
  };

  // Salvataggio nuovo modulo offerta sulla tabella dedicata gos_offerte_moduli
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !selectedCategory) return;

    try {
      const payload = {
        categoria_id: selectedCategory.id,
        titolo: newTitle,
        descrizione: newDescription || 'Modulo offerta commerciale GOS',
        note: newNotes,
        tempi_realizzazione: newTempi,
        prezzo: parseFloat(newPrezzo) || 0,
        valuta: newValuta,
        stato: 'Attivo',
        versione: '1.0'
      };

      const { data, error } = await supabase
        .from('gos_offerte_moduli')
        .insert([payload])
        .select()
        .single();

      if (error) {
        const simulated = { id: Date.now().toString(), ...payload };
        setModules([...modules, simulated]);
      } else if (data) {
        setModules([...modules, data]);
      }

      setNewTitle('');
      setNewDescription('');
      setNewNotes('');
      setNewTempi('');
      setNewPrezzo('');
      setNewValuta('EUR');
      setShowModal(false);
    } catch (err: any) {
      console.error('Errore salvataggio modulo offerta:', err?.message || err);
      alert('Errore durante la creazione del modulo.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* SELETTORE CATEGORIE OFFERTA */}
      <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Catalogo Offerte & Servizi - Categorie</h3>
          <p className="text-xs text-gray-400 mt-0.5">Seleziona l&apos;area strategica per gestire i moduli e listini componibili.</p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#FF5500] text-white border-orange-500 shadow-md'
                    : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
                }`}
              >
                {cat.nome}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIEPILOGO COMPOSIZIONE OFFERTA DELL'AZIENDA */}
      <CompanyOfferSummary
        selectedModules={selectedCompanyModules}
        onRemoveModule={onRemoveModule}
        onOpenPicker={handleTriggerAddModule}
      />

      {/* MODALE CREAZIONE MODULO OFFERTA (Fallback se non usata come picker) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuovo Modulo Offerta</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Categoria: <strong className="text-[#FF5500]">{selectedCategory?.nome}</strong></p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo del Modulo</label>
                <input
                  type="text"
                  placeholder="Es. Pacchetto Riorganizzazione Strategica"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione del Modulo</label>
                <textarea
                  rows={2}
                  placeholder="Descrivi i deliverables e gli obiettivi operativi..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Prezzo (Senza Valuta)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Es. 5000"
                    value={newPrezzo}
                    onChange={(e) => setNewPrezzo(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Valuta</label>
                  <select
                    value={newValuta}
                    onChange={(e) => setNewValuta(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  >
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="AED">AED (د.إ)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Tempi di Realizzazione</label>
                <input
                  type="text"
                  placeholder="Es. 4-6 settimane / 30 giorni lavorativi"
                  value={newTempi}
                  onChange={(e) => setNewTempi(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Note</label>
                <textarea
                  rows={2}
                  placeholder="Eventuali note operative, vincoli o condizioni particolari..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider">Salva Modulo</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
