'use client';

import React from 'react';

interface OfferCategoryProps {
  categories: any[];
  selectedCategory: any;
  onSelectCategory: (category: any) => void;
  loading: boolean;
  onOpenCreateCategoryModal?: () => void;
}

export function OfferCategory({
  categories,
  selectedCategory,
  onSelectCategory,
  loading
}: OfferCategoryProps) {
  return (
    <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Categorie Offerte & Servizi</h3>
          <p className="text-xs text-gray-400 mt-0.5">Seleziona un&apos;area strategica per gestire i moduli di offerta collegati.</p>
        </div>
      </div>

      {loading ? (
        <div className="text-xs text-gray-400 font-mono py-2">Caricamento categorie...</div>
      ) : (
        <div className="flex flex-wrap gap-2 pt-2">
          {categories.map((cat) => {
            const isSelected = selectedCategory?.id === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => onSelectCategory(cat)}
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
      )}
    </div>
  );
}
