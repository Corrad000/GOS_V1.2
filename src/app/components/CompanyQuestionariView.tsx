'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { ModuleEditView } from './ModuleEditView';

interface CompanyQuestionariViewProps {
  companyCode: string;
  companyName: string;
}

export function CompanyQuestionariView({ companyCode, companyName }: CompanyQuestionariViewProps) {
  const [questionari, setQuestionari] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Stato per la gestione della composizione/modifica del modulo associato
  const [activeConfigQuestionario, setActiveConfigQuestionario] = useState<any | null>(null);

  // Stati per il modale di selezione dal catalogo master (con categorie)
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [masterModuli, setMasterModuli] = useState<any[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Carica i moduli già associati a questa azienda
  const loadCompanyQuestionnaires = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gos_moduli')
        .select('*')
        .eq('company_code', companyCode);

      if (error) throw error;
      setQuestionari(data || []);
    } catch (err: any) {
      setQuestionari([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (companyCode) {
      loadCompanyQuestionnaires();
    }
  }, [companyCode, supabase]);

  // 2. Carica le categorie master all'avvio del modale
  const handleOpenCatalog = async () => {
    setShowCatalogModal(true);
    setLoadingMaster(true);
    try {
      const { data: catData, error: catError } = await supabase
        .from('gos_categorie')
        .select('*')
        .order('id', { ascending: true });

      if (catError) throw catError;
      setCategories(catData || []);
      if (catData && catData.length > 0) {
        setSelectedCategory(catData[0]);
        fetchModulesForCategory(catData[0].id);
      }
    } catch (err: any) {
      console.error('Errore caricamento categorie:', err);
    } finally {
      setLoadingMaster(false);
    }
  };

  // 3. Carica i moduli master filtrati per categoria selezionata
  const fetchModulesForCategory = async (catId: any) => {
    setLoadingMaster(true);
    try {
      const { data, error } = await supabase
        .from('gos_moduli')
        .select('*')
        .eq('categoria_id', catId)
        .is('company_code', null); // Solo i moduli master

      if (error) throw error;
      setMasterModuli(data || []);
    } catch (err: any) {
      console.error('Errore caricamento moduli catalogo:', err);
      setMasterModuli([]);
    } finally {
      setLoadingMaster(false);
    }
  };

  // Cambia categoria nel modale
  const handleSelectCategory = (cat: any) => {
    setSelectedCategory(cat);
    fetchModulesForCategory(cat.id);
  };

  // 4. Aggiunge il modulo master selezionato all'azienda
  const handleAddModuleFromCatalog = async (masterMod: any) => {
    try {
      const payload = {
        company_code: companyCode,
        categoria_id: selectedCategory?.id || masterMod.categoria_id,
        codice_modulo: `${companyCode}/${masterMod.codice_modulo || 'quest'}`,
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
        setQuestionari(prev => [...prev, data]);
      }

      setShowCatalogModal(false);
      alert('Modulo aggiunto con successo all\'azienda!');
    } catch (err: any) {
      alert('Errore durante l\'aggiunta del modulo: ' + (err.message || err));
    }
  };

  // 5. Elimina un modulo assegnato all'azienda
  const handleDeleteModule = async (moduleId: string, titolo: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere il modulo "${titolo}" da questa azienda?`)) return;

    try {
      const { error } = await supabase
        .from('gos_moduli')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      setQuestionari(prev => prev.filter(q => q.id !== moduleId));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err.message || err));
    }
  };

  // Se stiamo gestendo le domande del modulo aziendale, apriamo la vista di Edit Module
  if (activeConfigQuestionario) {
    return (
      <ModuleEditView
        modulo={{
          id: activeConfigQuestionario.id,
          codice_modulo: activeConfigQuestionario.codice_modulo || `${companyCode}/quest`,
          titolo: activeConfigQuestionario.titolo,
          versione: activeConfigQuestionario.versione || '1.0',
          descrizione: activeConfigQuestionario.descrizione || activeConfigQuestionario.note
        }}
        onBack={() => setActiveConfigQuestionario(null)}
      />
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">
            Moduli Questionari dell&apos;Azienda — <span className="text-[#FF5500]">{companyName}</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Seleziona i moduli precompilati dal catalogo master e assegna l&apos;assessment all&apos;azienda (<span className="font-mono text-[#FF5500]">{companyCode}</span>).
          </p>
        </div>
        <button
          onClick={handleOpenCatalog}
          className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
        >
          + Aggiungi Modulo da Catalogo
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento questionari in corso...</div>
      ) : questionari.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
          <p className="text-sm text-gray-400">Nessun modulo questionario associato a questa azienda.</p>
          <p className="text-xs text-gray-500">Clicca su &quot;Aggiungi Modulo da Catalogo&quot; per iniziare.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {questionari.map((q) => (
            <div key={q.id} className="bg-gray-950 border border-gray-800 rounded-xl p-5 space-y-3 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-[#FF5500] font-bold block">{q.codice_modulo || `${companyCode}/quest`}</span>
                    <h4 className="text-sm font-bold text-white mt-0.5">{q.titolo}</h4>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-lg text-[10px] font-mono font-bold uppercase">
                    {q.stato || 'Attivo'}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">{q.descrizione || 'Nessuna descrizione.'}</p>
              </div>

              <div className="pt-3 border-t border-gray-900 flex justify-between items-center text-[10px] font-mono text-gray-500">
                <span>Versione: {q.versione || '1.0'}</span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveConfigQuestionario(q)} 
                    className="text-[#FF5500] font-bold hover:underline cursor-pointer"
                  >
                    Gestisci Moduli →
                  </button>
                  <button 
                    onClick={() => handleDeleteModule(q.id, q.titolo)} 
                    className="text-red-400 hover:text-red-300 font-bold cursor-pointer"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODALE SELEZIONE DAL CATALOGO MASTER (CON CATEGORIE) */}
      {showCatalogModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-3xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Seleziona Modulo da Catalogo Master</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Scegli la categoria e aggiungi i moduli precompilati all&apos;azienda</p>
              </div>
              <button onClick={() => setShowCatalogModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            {/* BARRA CATEGORIE MASTER */}
            <div className="flex flex-wrap gap-2 pb-2 border-b border-gray-800">
              {categories.map((cat) => {
                const isSelected = selectedCategory?.id === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat)}
                    className={`px-3.5 py-2 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#FF5500] border-orange-500 text-white shadow-lg'
                        : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    {cat.nome || cat.titolo}
                  </button>
                );
              })}
            </div>

            {loadingMaster ? (
              <div className="py-12 text-center text-xs font-mono text-gray-400">Caricamento moduli master in corso...</div>
            ) : masterModuli.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
                <p className="text-xs text-gray-400">Nessun modulo master trovato in questa categoria.</p>
                <p className="text-[11px] text-gray-500">Crea prima i moduli master nella libreria principale.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {masterModuli.map((mod) => (
                  <div key={mod.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-[#FF5500] transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-[10px] font-bold rounded uppercase">
                          {mod.codice_modulo || 'QST'}
                        </span>
                        <h4 className="text-xs font-bold text-white">{mod.titolo}</h4>
                      </div>
                      <p className="text-[11px] text-gray-400">{mod.descrizione || 'Nessuna descrizione.'}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddModuleFromCatalog(mod)}
                      className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider whitespace-nowrap"
                    >
                      + Aggiungi
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-gray-800">
              <button type="button" onClick={() => setShowCatalogModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl cursor-pointer text-xs">Chiudi</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
