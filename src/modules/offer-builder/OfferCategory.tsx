'use client';

import React, { useState } from 'react';

interface OfferCategoryProps {
  categories: any[];
  selectedCategory: any;
  onSelectCategory: (category: any) => void;
  loading: boolean;
  onAddCategory?: (categoryName: string) => void;
  onEditCategory?: (categoryId: string, newName: string) => void;
  onDeleteCategory?: (categoryId: string) => void;
}

export function OfferCategory({
  categories,
  selectedCategory,
  onSelectCategory,
  loading,
  onAddCategory,
  onEditCategory,
  onDeleteCategory
}: OfferCategoryProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    if (onAddCategory) {
      onAddCategory(newCategoryName.trim());
    }
    setNewCategoryName('');
    setIsAdding(false);
  };

  const handleStartEdit = (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(cat.id);
    setEditingName(cat.nome || cat.name || '');
  };

  const handleSaveEdit = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editingName.trim()) return;
    if (onEditCategory) {
      onEditCategory(catId, editingName.trim());
    }
    setEditingId(null);
    setEditingName('');
  };

  const handleDelete = (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Sei sicuro di voler eliminare questa categoria?')) {
      if (onDeleteCategory) {
        onDeleteCategory(catId);
      }
    }
  };

  return (
    <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
      <div className="flex justify-between items-center border-b border-gray-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Categorie Offerte & Servizi</h3>
          <p className="text-xs text-gray-400 mt-0.5">Gestisci le aree strategiche e i relativi paragrafi master per le offerte.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
        >
          {isAdding ? 'Annulla' : '+ Nuova Categoria'}
        </button>
      </div>

      {/* Form di aggiunta nuova categoria */}
      {isAdding && (
        <form onSubmit={handleCreate} className="flex gap-2 pt-2">
          <input
            type="text"
            placeholder="Nome nuova categoria master..."
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            className="flex-1 bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500] font-mono"
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            Salva
          </button>
        </form>
      )}

      {loading ? (
        <div className="text-xs text-gray-400 font-mono py-2">Caricamento categorie...</div>
      ) : categories.length === 0 ? (
        <div className="text-xs text-gray-500 font-mono py-4 text-center border border-dashed border-gray-800 rounded-xl">
          Nessuna categoria presente. Clicca su &quot;+ Nuova Categoria&quot; per iniziare.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5 pt-2">
          {categories.map((cat, idx) => {
            const isSelected = selectedCategory?.id === cat.id;
            const isEditing = editingId === cat.id;

            return (
              <div
                key={cat.id || idx}
                onClick={() => !isEditing && onSelectCategory(cat)}
                className={`group px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-2 ${
                  isSelected
                    ? 'bg-[#FF5500] text-white border-orange-500 shadow-md'
                    : 'bg-gray-950 text-gray-300 border-gray-800 hover:text-white hover:border-gray-700'
                }`}
              >
                <span className={`font-mono text-[10px] px-1 py-0.5 rounded ${isSelected ? 'bg-black/30 text-white' : 'bg-gray-900 text-gray-400'}`}>
                  {idx + 1}.0
                </span>

                {isEditing ? (
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-gray-900 border border-orange-500 px-2 py-1 rounded text-white text-xs font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={(e) => handleSaveEdit(cat.id, e)}
                      className="text-emerald-400 hover:text-emerald-300 font-bold px-1"
                    >
                      ✓
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                      className="text-gray-400 hover:text-white font-bold px-1"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <span>{cat.nome || cat.name}</span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 pl-2 border-l border-white/20">
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(cat, e)}
                        title="Modifica Categoria"
                        className="text-gray-300 hover:text-white text-[10px]"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(cat.id, e)}
                        title="Elimina Categoria"
                        className="text-red-300 hover:text-red-100 text-[10px]"
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
