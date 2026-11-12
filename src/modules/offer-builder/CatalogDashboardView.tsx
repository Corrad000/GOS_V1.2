'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function CatalogDashboardView() {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [loadingMods, setLoadingMods] = useState(false);

  // Stati per la gestione CRUD categorie
  const [isAddingCat, setIsAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Stati per la modale/form di aggiunta / modifica modulo
  const [showAddModuleModal, setShowAddModuleModal] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null); // <-- Supporto Modifica
  const [modTitle, setModTitle] = useState('');
  const [modSubcategory, setModSubcategory] = useState('');
  const [modDescription, setModDescription] = useState('');
  const [modFee, setModFee] = useState('');
  const [modWeeks, setModWeeks] = useState('4');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento categorie da gos_offerte_categorie
  useEffect(() => {
    async function fetchCategories() {
      setLoadingCats(true);
      try {
        const { data, error } = await supabase
          .from('gos_offerte_categorie')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) throw error;
        if (data && data.length > 0) {
          setCategories(data);
          setSelectedCategory(data[0]);
        }
      } catch (err) {
        console.warn('Errore caricamento gos_offerte_categorie:', err);
      } finally {
        setLoadingCats(false);
      }
    }

    fetchCategories();
  }, [supabase]);

  // Caricamento moduli della categoria selezionata da gos_offerte_moduli
  useEffect(() => {
    if (!selectedCategory) return;

    async function fetchModulesForCategory() {
      setLoadingMods(true);
      try {
        const { data, error } = await supabase
          .from('gos_offerte_moduli')
          .select('*')
          .eq('categoria_id', selectedCategory.id);

        if (error) throw error;
        setModules(data || []);
      } catch (err) {
        console.warn('Errore caricamento gos_offerte_moduli:', err);
        setModules([]);
      } finally {
        setLoadingMods(false);
      }
    }

    fetchModulesForCategory();
  }, [selectedCategory, supabase]);

  // Aggiunta Categoria Master su gos_offerte_categorie
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('gos_offerte_categorie')
        .insert([{ nome: newCatName.trim() }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCategories([...categories, data]);
        if (!selectedCategory) setSelectedCategory(data);
      }
      setNewCatName('');
      setIsAddingCat(false);
    } catch (err: any) {
      alert('Errore creazione categoria: ' + err.message);
    }
  };

  // Modifica Categoria Master
  const handleUpdateCategory = async (catId: string) => {
    if (!editingCatName.trim()) return;

    try {
      const { error } = await supabase
        .from('gos_offerte_categorie')
        .update({ nome: editingCatName.trim() })
        .eq('id', catId);

      if (error) throw error;

      setCategories(categories.map(c => c.id === catId ? { ...c, nome: editingCatName.trim() } : c));
      if (selectedCategory?.id === catId) {
        setSelectedCategory({ ...selectedCategory, nome: editingCatName.trim() });
      }
      setEditingCatId(null);
      setEditingCatName('');
    } catch (err: any) {
      alert('Errore aggiornamento categoria: ' + err.message);
    }
  };

  // Eliminazione Categoria Master
  const handleDeleteCategory = async (catId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questa categoria e i moduli associati?')) return;

    try {
      const { error } = await supabase
        .from('gos_offerte_categorie')
        .delete()
        .eq('id', catId);

      if (error) throw error;

      const remaining = categories.filter(c => c.id !== catId);
      setCategories(remaining);
      if (selectedCategory?.id === catId) {
        setSelectedCategory(remaining[0] || null);
      }
    } catch (err: any) {
      alert('Errore eliminazione categoria: ' + err.message);
    }
  };

  // Apertura modale per Creazione nuovo modulo
  const handleOpenCreateModal = () => {
    setEditingModuleId(null);
    setModTitle('');
    setModSubcategory('');
    setModDescription('');
    setModFee('');
    setModWeeks('4');
    setShowAddModuleModal(true);
  };

  // Apertura modale per Modifica modulo esistente
  const handleOpenEditModal = (mod: any) => {
    setEditingModuleId(mod.id);
    setModTitle(mod.title || '');
    setModSubcategory(mod.subcategory || '');
    setModDescription(mod.description || '');
    setModFee(mod.fee !== undefined ? String(mod.fee) : '');
    setModWeeks(mod.estimatedWeeks !== undefined ? String(mod.estimatedWeeks) : '4');
    setShowAddModuleModal(true);
  };

  // Salvataggio (Creazione o Aggiornamento) Modulo Offerta su gos_offerte_moduli
  const handleSaveModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modTitle.trim() || !selectedCategory) return;

    try {
      const modulePayload = {
        categoria_id: selectedCategory.id,
        title: modTitle.trim(),
        subcategory: modSubcategory.trim() || 'Generale',
        description: modDescription.trim(),
        fee: parseFloat(modFee) || 0,
        estimatedWeeks: parseInt(modWeeks) || 4
      };

      if (editingModuleId) {
        // AGGIORNAMENTO MODULO ESISTENTE
        const { error } = await supabase
          .from('gos_offerte_moduli')
          .update(modulePayload)
          .eq('id', editingModuleId);

        if (error) throw error;

        setModules(modules.map(m => m.id === editingModuleId ? { ...m, ...modulePayload } : m));
        alert('Modulo offerta aggiornato con successo!');
      } else {
        // CREAZIONE NUOVO MODULO
        const { data, error } = await supabase
          .from('gos_offerte_moduli')
          .insert([{ ...modulePayload, created_at: new Date().toISOString() }])
          .select()
          .single();

        if (error) throw error;

        const created = data || { id: Date.now().toString(), ...modulePayload };
        setModules([...modules, created]);
        alert('Modulo offerta creato con successo!');
      }

      // Reset e chiusura modale
      setShowAddModuleModal(false);
      setEditingModuleId(null);
      setModTitle('');
      setModSubcategory('');
      setModDescription('');
      setModFee('');
      setModWeeks('4');
    } catch (err: any) {
      alert('Errore salvataggio modulo: ' + (err.message || 'Impossibile completare l\'operazione.'));
    }
  };

  // Eliminazione Modulo
  const handleDeleteModule = async (modId: string) => {
    if (!confirm('Eliminare questo modulo dal catalogo master?')) return;

    try {
      const { error } = await supabase
        .from('gos_offerte_moduli')
        .delete()
        .eq('id', modId);

      if (error) throw error;
      setModules(modules.filter(m => m.id !== modId));
    } catch (err: any) {
      setModules(modules.filter(m => m.id !== modId));
    }
  };

  return (
    <div className="space-y-6 font-sans text-gray-100">
      
      {/* SEZIONE 1: MASTER CATEGORIE */}
      <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex justify-between items-center border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Catalogo Offerte & Servizi — Categorie Master</h3>
            <p className="text-xs text-gray-400 mt-0.5">Seleziona l&apos;area strategica per gestire i moduli e i listini componibili associati.</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingCat(!isAddingCat)}
            className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
          >
            {isAddingCat ? 'Annulla' : '+ Nuova Categoria'}
          </button>
        </div>

        {/* Form inserimento nuova categoria */}
        {isAddingCat && (
          <form onSubmit={handleAddCategory} className="flex gap-2 pt-2">
            <input
              type="text"
              placeholder="Nome nuova categoria master..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500] font-mono"
              required
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Salva Categoria
            </button>
          </form>
        )}

        {loadingCats ? (
          <div className="text-xs text-gray-400 font-mono py-4">Caricamento categorie da Supabase...</div>
        ) : categories.length === 0 ? (
          <div className="text-xs text-gray-500 font-mono py-6 text-center border border-dashed border-gray-800 rounded-xl">
            Nessuna categoria configurata. Clicca su &quot;+ Nuova Categoria&quot; per iniziare.
          </div>
        ) : (
          <div className="flex flex-wrap gap-3 pt-2">
            {categories.map((cat, idx) => {
              const isSelected = selectedCategory?.id === cat.id;
              const isEditing = editingCatId === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => !isEditing && setSelectedCategory(cat)}
                  className={`group px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-3 ${
                    isSelected
                      ? 'bg-[#FF5500] text-white border-orange-500 shadow-md'
                      : 'bg-gray-950 text-gray-300 border-gray-800 hover:text-white hover:border-gray-700'
                  }`}
                >
                  <span className={`font-mono text-[10px] px-1.5 py-0.5 rounded ${isSelected ? 'bg-black/30 text-white' : 'bg-gray-900 text-gray-400'}`}>
                    {idx + 1}.0
                  </span>

                  {isEditing ? (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editingCatName}
                        onChange={(e) => setEditingCatName(e.target.value)}
                        className="bg-gray-900 border border-orange-500 px-2 py-1 rounded text-white text-xs font-mono focus:outline-none"
                      />
                      <button type="button" onClick={() => handleUpdateCategory(cat.id)} className="text-emerald-400 font-bold px-1">✓</button>
                      <button type="button" onClick={() => setEditingCatId(null)} className="text-gray-400 font-bold px-1">✕</button>
                    </div>
                  ) : (
                    <>
                      <span>{cat.nome}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 pl-2 border-l border-white/20">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditingCatName(cat.nome); }}
                          className="text-gray-300 hover:text-white text-[10px]"
                        >
                          ✎
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }}
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

      {/* SEZIONE 2: DETTAGLIO MODULI */}
      {selectedCategory && (
        <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-orange-950 text-orange-400 border border-orange-800 font-mono text-[10px] font-bold rounded uppercase">
                  Area Attiva
                </span>
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  Moduli di Offerta per: {selectedCategory.nome}
                </h3>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Componi i blocchi di servizio e i listini associati a questa categoria master.</p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
            >
              + Aggiungi Modulo Offerta
            </button>
          </div>

          {loadingMods ? (
            <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento moduli in corso...</div>
          ) : modules.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
              <p className="text-sm text-gray-400">Nessun modulo di offerta configurato in questa categoria.</p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
              >
                Crea il primo modulo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {modules.map((mod, idx) => (
                <div key={mod.id || idx} className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-3 flex flex-col justify-between">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <span className="px-2.5 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-[10px] font-bold rounded uppercase">
                        {idx + 1}.{idx + 1} — {mod.subcategory || 'Standard'}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(mod)}
                          className="text-amber-400 hover:text-amber-300 text-xs font-bold px-2 py-0.5 bg-amber-950/50 border border-amber-900 rounded cursor-pointer"
                        >
                          Modifica
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteModule(mod.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold px-2 py-0.5 bg-red-950/50 border border-red-900 rounded cursor-pointer"
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-white">{mod.title}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{mod.description || 'Nessuna descrizione specificata.'}</p>
                  </div>

                  <div className="pt-3 border-t border-gray-900 flex justify-between items-center font-mono text-xs">
                    <span className="text-emerald-400 font-extrabold">EUR {Number(mod.fee || 0).toLocaleString()}</span>
                    <span className="text-gray-400">{mod.estimatedWeeks || 4} settimane</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODALE AGGIUNTA / MODIFICA MODULO */}
      {showAddModuleModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  {editingModuleId ? 'Modifica Modulo Offerta' : `Aggiungi Modulo a ${selectedCategory?.nome}`}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Gestione diretta su gos_offerte_moduli</p>
              </div>
              <button onClick={() => setShowAddModuleModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSaveModule} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo Modulo *</label>
                <input
                  type="text"
                  placeholder="Es. Analisi di mercato e contesto CIS"
                  value={modTitle}
                  onChange={(e) => setModTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Sottocategoria / Sotto-paragrafo</label>
                <input
                  type="text"
                  placeholder="Es. Contesto di mercato"
                  value={modSubcategory}
                  onChange={(e) => setModSubcategory(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Fee / Prezzo (EUR)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Es. 5000"
                    value={modFee}
                    onChange={(e) => setModFee(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Durata (Settimane)</label>
                  <input
                    type="number"
                    placeholder="Es. 4"
                    value={modWeeks}
                    onChange={(e) => setModWeeks(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione / Deliverables</label>
                <textarea
                  rows={3}
                  placeholder="Dettagli operativi del modulo..."
                  value={modDescription}
                  onChange={(e) => setModDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowAddModuleModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider">
                  {editingModuleId ? 'Salva Modifiche' : 'Crea Modulo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
