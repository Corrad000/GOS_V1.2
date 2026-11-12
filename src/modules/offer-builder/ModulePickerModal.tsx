'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

interface ModulePickerModalProps {
  selectedCategory: any;
  isOpen: boolean;
  onClose: () => void;
  onSelectModule: (module: any) => void;
}

export function ModulePickerModal({ selectedCategory, isOpen, onClose, onSelectModule }: ModulePickerModalProps) {
  const [catalogModules, setCatalogModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!isOpen || !selectedCategory) return;

    async function fetchModules() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gos_offerte_moduli')
          .select('*')
          .eq('categoria_id', selectedCategory.id);

        if (error) throw error;
        setCatalogModules(data || []);
      } catch (err) {
        console.warn('Errore caricamento moduli da catalogo:', err);
        setCatalogModules([]);
      } finally {
        setLoading(false);
      }
    }

    fetchModules();
  }, [isOpen, selectedCategory, supabase]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
              Seleziona Modulo da Catalogo: {selectedCategory?.nome}
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Scegli tra i moduli esistenti nel database master</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs font-mono text-gray-400">Ricerca moduli in corso su Supabase...</div>
        ) : catalogModules.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
            <p className="text-xs text-gray-400">Nessun modulo esistente trovato in questa categoria nel catalogo master.</p>
            <p className="text-[11px] text-gray-500">Crea prima i moduli nella Dashboard Master dei cataloghi.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {catalogModules.map((mod) => (
              <div key={mod.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex justify-between items-center hover:border-[#FF5500] transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-[10px] font-bold rounded uppercase">
                      {mod.subcategory || 'Standard'}
                    </span>
                    <h4 className="text-xs font-bold text-white">{mod.title}</h4>
                  </div>
                  <p className="text-[11px] text-gray-400 line-clamp-1">{mod.description || 'Nessuna descrizione.'}</p>
                  <div className="flex gap-4 font-mono text-[11px] pt-1">
                    <span className="text-emerald-400 font-bold">EUR {Number(mod.fee || 0).toLocaleString()}</span>
                    <span className="text-gray-400">{mod.estimatedWeeks || 4} settimane</span>
                  </div>
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
