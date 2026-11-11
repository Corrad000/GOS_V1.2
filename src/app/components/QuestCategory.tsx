'use client';

import { Categoria } from '@/app/services/questionarioService';

interface QuestCategoryProps {
  categories: Categoria[];
  selectedCategory: Categoria | null;
  onSelectCategory: (cat: Categoria) => void;
  loading: boolean;
}

export function QuestCategory({
  categories,
  selectedCategory,
  onSelectCategory,
  loading,
}: QuestCategoryProps) {
  if (loading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-xs text-gray-400 font-mono">
        Caricamento categorie in corso...
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-xs text-gray-400 font-mono">
        Nessuna categoria trovata nella tabella `gos_categorie`.
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
      <h3 className="text-xs font-bold text-gray-300 uppercase tracking-widest font-mono">
        1. Seleziona Categoria Questionario
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const isSelected = selectedCategory?.id === cat.id;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              className={`p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg shadow-amber-950/40'
                  : 'bg-gray-950 border-gray-800 text-gray-300 hover:border-gray-700 hover:text-white'
              }`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider">{cat.nome}</h4>
              <p className="text-[11px] text-gray-400 mt-1 line-clamp-1">
                {cat.descrizione || 'Nessuna descrizione'}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
