'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface QuestionnairePickerModalProps {
  isOpen: boolean;
  selectedCategory: any;
  onClose: () => void;
  onSelectModule: (module: any) => void;
}

export function QuestionnairePickerModal({
  isOpen,
  selectedCategory,
  onClose,
  onSelectModule
}: QuestionnairePickerModalProps) {
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchCatalogModules() {
      if (!isOpen || !selectedCategory?.id) return;

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('categoria_id', selectedCategory.id)
          .is('company_code', null); // Solo i moduli master della libreria

        if (error) throw error;
        setModules(data || []);
      } catch (err) {
        console.error('Errore caricamento moduli master:', err);
        setModules([]);
      } finally {
        setLoading(false);
      }
    }

    fetchCatalogModules();
  }, [isOpen, selectedCategory?.id, supabase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl my-8">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Libreria Master — <span className="text-[#FF5500]">{selectedCategory?.nome || selectedCategory?.titolo}</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Seleziona un modulo precompilato da aggiungere al questionario</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-gray-400">Caricamento moduli da Supabase...</div>
        ) : modules.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
            <p className="text-xs text-gray-400">Nessun modulo trovato in questa categoria nella libreria master.</p>
            <p className="text-[11px] text-gray-500">Crea prima i moduli nella sezione catalogo.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {modules.map((mod) => (
              <div key={mod.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-[#FF5500] transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-[10px] font-bold rounded uppercase">
                      {mod.codice_modulo || 'MOD'}
                    </span>
                    <h4 className="text-xs font-bold text-white">{mod.titolo}</h4>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1">{mod.descrizione || 'Nessuna descrizione.'}</p>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectModule(mod)}
                  className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider whitespace-nowrap"
                >
                  + Aggiungi
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl cursor-pointer text-xs">Chiudi</button>
        </div>
      </div>
    </div>
  );
}
