'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface QuestionComposerKitProps {
  companyCode: string;
  companyName: string;
  questionarioId: string;
  questionarioTitle: string;
  onBack: () => void;
}

export function QuestionComposerKit({ 
  companyCode, 
  companyName, 
  questionarioId, 
  questionarioTitle, 
  onBack 
}: QuestionComposerKitProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  
  const [assignedModules, setAssignedModules] = useState<any[]>([]);
  const [catalogModules, setCatalogModules] = useState<any[]>([]);
  
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [showPickerModal, setShowPickerModal] = useState(false);
  const [publicLinkSent, setPublicLinkSent] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Carica le categorie master dei questionari (gos_categorie)
  useEffect(() => {
    async function fetchCategories() {
      try {
        const { data, error } = await supabase
          .from('gos_categorie')
          .select('*')
          .order('id', { ascending: true });

        if (error) throw error;
        setCategories(data || []);
        if (data && data.length > 0) {
          setSelectedCategory(data[0]);
        }
      } catch (err) {
        console.error('Errore caricamento categorie master:', err);
      }
    }

    fetchCategories();
  }, [supabase]);

  // 2. Carica i moduli già associati a questo specifico questionario aziendale
  useEffect(() => {
    async function fetchAssignedModules() {
      try {
        const { data, error } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('company_code', companyCode)
          .eq('parent_questionario_id', questionarioId); // Moduli collegati a questo questionario

        if (error) throw error;
        setAssignedModules(data || []);
      } catch (err) {
        console.error('Errore caricamento moduli assegnati:', err);
      }
    }

    if (companyCode && questionarioId) {
      fetchAssignedModules();
    }
  }, [companyCode, questionarioId, supabase]);

  // 3. Quando apri il selettore, carica i moduli master della categoria selezionata
  const handleOpenPicker = async () => {
    if (!selectedCategory) return;
    setShowPickerModal(true);
    setLoadingCatalog(true);
    try {
      const { data, error } = await supabase
        .from('gos_moduli')
        .select('*')
        .eq('categoria_id', selectedCategory.id)
        .is('company_code', null); // Moduli master della libreria

      if (error) throw error;
      setCatalogModules(data || []);
    } catch (err) {
      console.error('Errore caricamento catalogo:', err);
      setCatalogModules([]);
    } finally {
      setLoadingCatalog(false);
    }
  };

  // 4. Aggiunge il modulo master scelto al questionario dell'azienda
  const handleAddModuleToQuestionario = async (masterMod: any) => {
    try {
      const payload = {
        company_code: companyCode,
        parent_questionario_id: questionarioId,
        categoria_id: selectedCategory.id,
        codice_modulo: `${companyCode}/quest-mod-${Date.now().toString().slice(-4)}`,
        titolo: masterMod.titolo,
        descrizione: masterMod.descrizione,
        versione: masterMod.versione || '1.0',
        stato: 'Attivo',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('gos_moduli')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setAssignedModules(prev => [...prev, data]);
      }
      setShowPickerModal(false);
    } catch (err: any) {
      alert('Errore durante l\'aggiunta del modulo: ' + (err.message || err));
    }
  };

  // 5. Rimuove il modulo dal questionario
  const handleRemoveModule = async (moduleId: string) => {
    if (!confirm('Vuoi rimuovere questo modulo dal questionario?')) return;
    try {
      const { error } = await supabase
        .from('gos_moduli')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;
      setAssignedModules(prev => prev.filter(m => m.id !== moduleId));
    } catch (err: any) {
      alert('Errore durante la rimozione: ' + (err.message || err));
    }
  };

  // 6. Genera e simula l'invio del link via email all'azienda
  const handleSendPublicLink = () => {
    const publicUrl = `${window.location.origin}/public/questionario/${questionarioId}`;
    navigator.clipboard.writeText(publicUrl);
    setPublicLinkSent(true);
    alert(`Link pubblico copiato negli appunti e pronto per l'invio all'azienda!\n\nURL: ${publicUrl}`);
  };

  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIORE */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
              {companyCode} — QUESTIONARIO
            </span>
            <span className="text-xs font-mono text-gray-400">{companyName}</span>
          </div>
          <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">{questionarioTitle}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleSendPublicLink}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider flex items-center gap-2"
          >
            ✉️ Invia Link Compilazione
          </button>
          <button
            onClick={onBack}
            className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl transition-all cursor-pointer border border-gray-700"
          >
            &lt;- Torna alla Lista
          </button>
        </div>
      </div>

      {/* SEZIONE CATEGORIE MASTER */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Catalogo Categorie Master
          </h3>
          <p className="text-xs text-gray-400">
            Seleziona l&apos;area strategica per esplorare e prelevare i moduli precompilati da inserire nel questionario.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FF5500] border-orange-500 text-white shadow-lg shadow-orange-950/50'
                    : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700'
                }`}
              >
                {cat.nome || cat.titolo}
              </button>
            );
          })}
        </div>
      </div>

      {/* MODULI ASSEMBLATI NEL QUESTIONARIO */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 bg-amber-950/60 border border-amber-900 text-amber-400 font-mono text-[10px] font-bold rounded uppercase">
              Composizione Assessment
            </span>
            <h3 className="text-base font-bold text-white uppercase tracking-wider mt-1">
              Moduli Inclusi nel Questionario
            </h3>
            <p className="text-xs text-gray-400">Riepilogo dei blocchi di domande assegnati a questa specifica sessione.</p>
          </div>

          <button
            onClick={handleOpenPicker}
            className="px-5 py-3 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/50 transition-all cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
          >
            + Aggiungi Modulo da Libreria
          </button>
        </div>

        {assignedModules.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-gray-800 bg-gray-950 rounded-2xl space-y-3">
            <p className="text-sm text-gray-400">Nessun modulo inserito in questo questionario.</p>
            <button
              onClick={handleOpenPicker}
              className="px-6 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
            >
              Scegli il primo modulo dalla libreria
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignedModules.map((mod) => (
              <div key={mod.id} className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono text-[#FF5500] font-bold block">{mod.codice_modulo}</span>
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded font-mono text-[10px] font-bold uppercase">
                      {mod.stato || 'Attivo'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{mod.titolo}</h4>
                  <p className="text-xs text-gray-400 line-clamp-2">{mod.descrizione || 'Nessuna descrizione.'}</p>
                </div>

                <div className="pt-3 border-t border-gray-900 flex justify-between items-center text-[10px] font-mono text-gray-500">
                  <span>Versione {mod.versione || '1.0'}</span>
                  <button
                    onClick={() => handleRemoveModule(mod.id)}
                    className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODALE SELEZIONE MODULO DA CATALOGO MASTER */}
      {showPickerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Seleziona Modulo da: <span className="text-[#FF5500]">{selectedCategory?.nome || selectedCategory?.titolo}</span>
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Scegli tra i moduli precompilati disponibili nella libreria master</p>
              </div>
              <button onClick={() => setShowPickerModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            {loadingCatalog ? (
              <div className="py-12 text-center text-xs font-mono text-gray-400">Caricamento moduli da Supabase...</div>
            ) : catalogModules.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
                <p className="text-xs text-gray-400">Nessun modulo trovato in questa categoria nella libreria.</p>
                <p className="text-[11px] text-gray-500">Crea prima i moduli nella sezione master dei cataloghi.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {catalogModules.map((mod) => (
                  <div key={mod.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-[#FF5500] transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-[10px] font-bold rounded uppercase">
                          {mod.codice_modulo || 'QST'}
                        </span>
                        <h4 className="text-xs font-bold text-white">{mod.titolo}</h4>
                      </div>
                      <p className="text-[11px] text-gray-400 line-clamp-1">{mod.descrizione || 'Nessuna descrizione.'}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddModuleToQuestionario(mod)}
                      className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider whitespace-nowrap"
                    >
                      + Aggiungi
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-800">
              <button type="button" onClick={() => setShowPickerModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl cursor-pointer text-xs">Chiudi</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
