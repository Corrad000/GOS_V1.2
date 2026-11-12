'use client';

import { Categoria } from '@/app/services/questionarioService';

interface QuestCategoryProps {
  categories: Categoria[];
  selectedCategory: Categoria | null;
  onSelectCategory: (cat: Categoria) => void;
  loading: boolean;
  onOpenCreateCategoryModal: () => void;
  onOpenEditCategoryModal: (cat: Categoria, e: React.MouseEvent) => void;
  onDeleteCategory: (catId: string, e: React.MouseEvent) => void;
}

export function QuestCategory({
  categories,
  selectedCategory,
  onSelectCategory,
  loading,
  onOpenCreateCategoryModal,
  onOpenEditCategoryModal,
  onDeleteCategory,
}: QuestCategoryProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-xs text-gray-400 font-mono">
        Caricamento categorie in corso...
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono">
            1. Seleziona Categoria Master Questionario
          </h3>
          <p className="text-[11px] text-gray-400 mt-0.5">Seleziona l'area strategica per gestire i moduli e le domande associate.</p>
        </div>
        <button
          onClick={onOpenCreateCategoryModal}
          className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
        >
          + Nuova Categoria
        </button>
      </div>

      {categories.length === 0 ? (
        <div className="p-6 text-center text-xs text-gray-400 font-mono">
          Nessuna categoria trovata nella tabella `gos_categorie`. Clicca su "+ Nuova Categoria" per crearne una.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {categories.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <div
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
                className={`p-4 rounded-xl border cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-950/40'
                    : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'
                }`}
              >
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider">{cat.nome}</h4>
                  <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                    {cat.descrizione || 'Nessuna descrizione'}
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-900/60">
                  <button
                    onClick={(e) => onOpenEditCategoryModal(cat, e)}
                    className="text-[10px] font-mono text-amber-400 hover:text-amber-300 px-2.5 py-0.5 bg-amber-950/50 hover:bg-amber-900/50 rounded border border-amber-900/50 transition-all cursor-pointer"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={(e) => onDeleteCategory(cat.id, e)}
                    className="text-[10px] font-mono text-red-400 hover:text-red-300 px-2.5 py-0.5 bg-red-950/50 hover:bg-red-900/50 rounded border border-red-900/50 transition-all cursor-pointer"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
