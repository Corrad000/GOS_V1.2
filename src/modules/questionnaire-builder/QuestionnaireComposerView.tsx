'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { QuestionnairePickerModal } from './QuestionnairePickerModal';

interface QuestionnaireComposerViewProps {
  companyCode: string;
  companyName: string;
  questionario: any;
  onBack: () => void;
  onOpenPreview: () => void;
}

export function QuestionnaireComposerView({
  companyCode,
  companyName,
  questionario,
  onBack,
  onOpenPreview
}: QuestionnaireComposerViewProps) {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [assignedModules, setAssignedModules] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // 1. Carica le categorie master (gos_categorie)
  useEffect(() => {
    async function loadCategories() {
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
      } catch (err: any) {
        console.warn('Errore caricamento categorie:', err?.message || JSON.stringify(err, null, 2));
      }
    }
    loadCategories();
  }, [supabase]);

  // 2. Carica i moduli già associati a questo questionario
  const loadAssignedModules = async () => {
    setLoadingModules(true);
    try {
      const { data, error } = await supabase
        .from('gos_moduli')
        .select('*')
        .eq('company_code', companyCode)
        .eq('parent_questionario_id', questionario.id);

      if (error) throw error;
      setAssignedModules(data || []);
    } catch (err: any) {
      const errorMessage = err?.message || JSON.stringify(err, null, 2) || 'Errore sconosciuto';
      console.warn('Errore caricamento moduli assegnati:', errorMessage);
      setAssignedModules([]);
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    if (questionario?.id) {
      loadAssignedModules();
    }
  }, [questionario?.id, supabase]);

  // 3. Aggiunge un modulo dal picker al questionario e clona le domande su gos_domande
  const handleAddModule = async (masterModule: any) => {
    try {
      const payload = {
        company_code: companyCode,
        parent_questionario_id: questionario.id,
        categoria_id: selectedCategory?.id || masterModule.categoria_id,
        codice_modulo: `${companyCode}/MOD-${Date.now().toString().slice(-4)}`,
        titolo: masterModule.titolo,
        descrizione: masterModule.descrizione,
        versione: masterModule.versione || '1.0',
        stato: 'Attivo',
        created_at: new Date().toISOString()
      };

      // Inserisce il nuovo modulo aziendale
      const { data: newModule, error: modError } = await supabase
        .from('gos_moduli')
        .insert([payload])
        .select()
        .single();

      if (modError) throw modError;

      if (newModule) {
        // Preleva le domande originali dal modulo master usando masterModule.id
        const { data: masterQuestions, error: qFetchError } = await supabase
          .from('gos_domande')
          .select('*')
          .eq('modulo_id', masterModule.id);

        if (!qFetchError && masterQuestions && masterQuestions.length > 0) {
          // Mappa le domande clonandole con il nuovo modulo_id aziendale
          const questionsPayload = masterQuestions.map((q: any) => ({
            modulo_id: newModule.id, // Collega al nuovo ID del modulo aziendale
            sezione: q.sezione,
            testo_domanda: q.testo_domanda,
            tipo_risposta: q.tipo_risposta,
            peso: q.peso,
            ordine: q.ordine,
            opzioni: q.opzioni,
            created_at: new Date().toISOString()
          }));

          const { error: insError } = await supabase
            .from('gos_domande')
            .insert(questionsPayload);

          if (insError) {
            console.error('Errore durante la clonazione delle domande:', insError);
          }
        }

        setAssignedModules(prev => [...prev, newModule]);
      }
      setIsPickerOpen(false);
    } catch (err: any) {
      alert('Errore durante l\'aggiunta del modulo: ' + (err.message || JSON.stringify(err)));
    }
  };

  // 4. Rimuove un modulo dal questionario
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
      alert('Errore durante la rimozione: ' + (err.message || JSON.stringify(err)));
    }
  };

  return (
    <div className="space-y-6">
      
      {/* BARRA SUPERIORE */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
              {companyCode} — COMPOSIZIONE
            </span>
            <span className="text-xs font-mono text-gray-400">{companyName}</span>
          </div>
          <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">{questionario.titolo}</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPreview}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow cursor-pointer uppercase tracking-wider flex items-center gap-2"
          >
            👁️ Anteprima &amp; Link Mail
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
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Aree &amp; Categorie Master</h3>
          <p className="text-xs text-gray-400">Seleziona la categoria di riferimento per filtrare i moduli pronti dalla libreria.</p>
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

      {/* MODULI INCLUSI NEL QUESTIONARIO */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
          <div className="space-y-1">
            <span className="px-2.5 py-1 bg-amber-950/60 border border-amber-900 text-amber-400 font-mono text-[10px] font-bold rounded uppercase">
              Moduli Assemblati
            </span>
            <h3 className="text-base font-bold text-white uppercase tracking-wider mt-1">Blocchi di Domande Inclusi</h3>
          </div>

          <button
            onClick={() => setIsPickerOpen(true)}
            className="px-5 py-3 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/50 transition-all cursor-pointer uppercase tracking-wider inline-flex items-center gap-2"
          >
            + Aggiungi Modulo da Libreria
          </button>
        </div>

        {loadingModules ? (
          <div className="p-12 text-center text-xs font-mono text-gray-400">Caricamento moduli...</div>
        ) : assignedModules.length === 0 ? (
          <div className="p-16 text-center border border-dashed border-gray-800 bg-gray-950 rounded-2xl space-y-3">
            <p className="text-sm text-gray-400">Nessun modulo inserito in questo questionario.</p>
            <button
              onClick={() => setIsPickerOpen(true)}
              className="px-6 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
            >
              Aggiungi il primo modulo
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

      {/* MODALE PICKER MODULI MASTER */}
      <QuestionnairePickerModal
        isOpen={isPickerOpen}
        selectedCategory={selectedCategory}
        onClose={() => setIsPickerOpen(false)}
        onSelectModule={handleAddModule}
      />

    </div>
  );
}
