'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { CompanyItem, CompanyTable } from './CompanyTable';
import { QuestCategory } from './QuestCategory';
import { QuestModulo } from './QuestModulo';
import { ModuleEditView } from './ModuleEditView';
import { CatalogDashboardView } from '@/modules/offer-builder/CatalogDashboardView';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';

interface UserDashboardViewProps {
  userRole: 'admin' | 'user' | 'advisor' | 'Network Partner';
  userName: string;
  companies: CompanyItem[];
}

export function UserDashboardView({ userRole, userName, companies }: UserDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'aziende' | 'questionari' | 'offerte' | 'utenti'>('aziende');

  // Stati Supabase per Categorie e Moduli Questionari Master
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stato per la pagina Edit Module delle domande del modulo selezionato
  const [activeConfigModule, setActiveConfigModule] = useState<any | null>(null);

  // Metriche Reali Cruscotto
  const [stats, setStats] = useState({
    totalCompanies: companies.length,
    totalModules: 0,
    totalCategories: 0,
    activeAdvisors: 1
  });

  // Stati Modale Modulo Questionario Master
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDomanda, setNewDomanda] = useState('');
  const [newTipoRisposta, setNewTipoRisposta] = useState('rating_1_5');

  // Stati Modale Categoria Master (Creazione)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Stati Modale Categoria Master (Modifica)
  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [editCategoryDesc, setEditCategoryDesc] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchSystemStats() {
      try {
        const { count: modCount } = await supabase.from('gos_moduli').select('*', { count: 'exact', head: true }).is('company_code', null);
        const { count: catCount } = await supabase.from('gos_categorie').select('*', { count: 'exact', head: true });
        const { count: profCount } = await supabase.from('gos_profiles').select('*', { count: 'exact', head: true });

        setStats({
          totalCompanies: companies.length,
          totalModules: modCount || 0,
          totalCategories: catCount || 0,
          activeAdvisors: profCount || 1
        });
      } catch (err) {
        console.error('Errore recupero metriche:', err);
      }
    }
    fetchSystemStats();
  }, [companies, supabase]);

  useEffect(() => {
    if (activeTab !== 'questionari') return;

    async function loadCategories() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('gos_categorie').select('*').order('nome');
        if (error) throw error;
        setCategories(data || []);
        if (data && data.length > 0 && !selectedCategory) {
          setSelectedCategory(data[0]);
        }
      } catch (err: any) {
        console.error('Errore caricamento categorie:', err?.message || err);
      } finally {
        setLoading(false);
      }
    }
    loadCategories();
  }, [activeTab, supabase]);

  useEffect(() => {
    if (!selectedCategory) return;

    async function loadModules() {
      try {
        const { data, error } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('categoria_id', selectedCategory.id)
          .is('company_code', null);

        if (error) throw error;
        setModules(data || []);
      } catch (err: any) {
        console.error('Errore caricamento moduli:', err?.message || err);
      }
    }
    loadModules();
  }, [selectedCategory, supabase]);

  // Creazione Categoria Master
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('gos_categorie')
        .insert([{ nome: newCategoryName, descrizione: newCategoryDesc }])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setCategories(prev => [...prev, data]);
        setSelectedCategory(data);
        setStats(prev => ({ ...prev, totalCategories: prev.totalCategories + 1 }));
      }

      setNewCategoryName('');
      setNewCategoryDesc('');
      setShowCategoryModal(false);
    } catch (err: any) {
      alert('Errore nella creazione della categoria: ' + (err.message || err));
    }
  };

  const handleOpenEditCategory = (cat: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setEditCategoryName(cat.nome);
    setEditCategoryDesc(cat.descrizione || '');
    setShowEditCategoryModal(true);
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editCategoryName.trim()) return;

    try {
      const { error } = await supabase
        .from('gos_categorie')
        .update({ nome: editCategoryName, descrizione: editCategoryDesc })
        .eq('id', editingCategory.id);

      if (error) throw error;

      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, nome: editCategoryName, descrizione: editCategoryDesc } : c));
      if (selectedCategory?.id === editingCategory.id) {
        setSelectedCategory({ ...selectedCategory, nome: editCategoryName, descrizione: editCategoryDesc });
      }

      setShowEditCategoryModal(false);
      setEditingCategory(null);
    } catch (err: any) {
      alert('Errore durante l\'aggiornamento della categoria: ' + (err.message || err));
    }
  };

  const handleDeleteCategory = async (catId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Sei sicuro di voler eliminare questa categoria e tutti i moduli associati?')) return;

    try {
      const { error } = await supabase.from('gos_categorie').delete().eq('id', catId);
      if (error) throw error;

      setCategories(prev => prev.filter(c => c.id !== catId));
      if (selectedCategory?.id === catId) {
        setSelectedCategory(null);
        setModules([]);
      }
      setStats(prev => ({ ...prev, totalCategories: Math.max(0, prev.totalCategories - 1) }));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione della categoria: ' + (err.message || err));
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !selectedCategory || !newDomanda) return;

    try {
      const codiceModulo = await generateGlobalActivityCode('MASTER', 'QST');

      const { data: modData, error: modErr } = await supabase
        .from('gos_moduli')
        .insert([
          {
            categoria_id: selectedCategory.id,
            company_code: null,
            codice_modulo: codiceModulo,
            titolo: newTitle,
            descrizione: 'Creato da libreria master GOS',
            stato: 'Attivo',
            versione: '1.0'
          }
        ])
        .select()
        .single();

      if (modErr) throw modErr;

      if (modData) {
        await supabase.from('gos_domande').insert([
          {
            modulo_id: modData.id,
            sezione: selectedCategory.nome,
            testo_domanda: newDomanda,
            tipo_risposta: newTipoRisposta,
            peso: 1.0,
            ordine: 1
          }
        ]);
        setModules(prev => [modData, ...prev]);
        setStats(prev => ({ ...prev, totalModules: prev.totalModules + 1 }));
      }

      setNewTitle('');
      setNewDomanda('');
      setShowModal(false);
    } catch (err: any) {
      console.error('Errore salvataggio modulo:', err?.message || err);
      alert('Errore durante la creazione del modulo.');
    }
  };

  const handleDeleteModule = async (modId: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo modulo?')) return;

    try {
      const { error } = await supabase.from('gos_moduli').delete().eq('id', modId);
      if (error) throw error;

      setModules(prev => prev.filter(m => m.id !== modId));
      setStats(prev => ({ ...prev, totalModules: Math.max(0, prev.totalModules - 1) }));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione del modulo: ' + (err.message || err));
    }
  };

  // Calcolo reale del fatturato totale sommando il campo fatturato di ogni azienda
  const totalPortfolioRevenue = companies.reduce((acc, c: any) => acc + Number(c.fatturato || c.revenue || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* CRUSCOTTO REPORT IN CIMA */}
      <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-gray-800/80 pb-3">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              CRUSCOTTO <span className="text-[#FF5500]">PORTAFOGLIO & REPORT</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Visione d&apos;insieme globale del business • Sincronizzato con Supabase</p>
          </div>
          <span className="px-3 py-1 bg-gray-950 border border-gray-800 text-emerald-400 text-[11px] font-mono rounded-lg">
            ● Live DB
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Moduli / Categorie</span>
            <div className="text-lg font-black text-white font-mono">
              <span className="text-emerald-400">{stats.totalModules}</span> <span className="text-gray-600">/</span> <span className="text-blue-400">{stats.totalCategories}</span>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Fatturato Totale Portfolio</span>
            <div className="text-lg font-black text-emerald-400 font-mono">
              € {totalPortfolioRevenue.toLocaleString('it-IT')}
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Profili / Advisor</span>
            <div className="text-base font-black text-white font-mono">
              <span className="text-emerald-400">{stats.activeAdvisors}</span> <span className="text-gray-400 font-normal text-xs">attivi</span>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Aziende in Portfolio</span>
            <div className="text-lg font-black text-[#FF5500] font-mono">
              {companies.length}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DEI TAB */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 pb-4">
        <button
          onClick={() => { setActiveTab('aziende'); setActiveConfigModule(null); }}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'aziende'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Controllo Aziende ({companies.length})
        </button>

        <button
          onClick={() => { setActiveTab('questionari'); setActiveConfigModule(null); }}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'questionari'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Libreria Master Questionari ({modules.length > 0 ? modules.length : stats.totalModules})
        </button>

        <button
          onClick={() => { setActiveTab('offerte'); setActiveConfigModule(null); }}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'offerte'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Catalogo Offerte & Servizi
        </button>

        <button
          onClick={() => { setActiveTab('utenti'); setActiveConfigModule(null); }}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'utenti'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Utenti & Permessi ({stats.activeAdvisors}) →
        </button>
      </div>

      {activeTab === 'aziende' && (
        <CompanyTable
          companies={companies}
          title="CONTROLLO AZIENDE"
          subtitle="Panoramica di tutte le aziende inserite nel database, advisor di riferimento e contratti attivi."
          showRegisterButton={true}
        />
      )}

      {activeTab === 'questionari' && (
        <div className="space-y-6">
          {!activeConfigModule ? (
            <>
              <QuestCategory
                categories={categories}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                loading={loading}
                onOpenCreateCategoryModal={() => setShowCategoryModal(true)}
                onOpenEditCategoryModal={handleOpenEditCategory}
                onDeleteCategory={handleDeleteCategory}
              />

              <QuestModulo
                selectedCategory={selectedCategory}
                modules={modules}
                loading={loading}
                onOpenCreateModal={() => setShowModal(true)}
                onDeleteModule={handleDeleteModule}
                onConfigureModule={(mod: any) => setActiveConfigModule(mod)}
              />
            </>
          ) : (
            <ModuleEditView
              modulo={activeConfigModule}
              onBack={() => setActiveConfigModule(null)}
            />
          )}
        </div>
      )}

      {activeTab === 'offerte' && (
        <CatalogDashboardView />
      )}

      {/* MODALE CREAZIONE MODULO MASTER */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuovo Modulo Master</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Categoria attiva: <strong className="text-[#FF5500]">{selectedCategory?.nome}</strong></p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateModule} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo del Modulo</label>
                <input
                  type="text"
                  placeholder="Es. Analisi Redditività Operativa v1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Domanda Iniziale</label>
                <input
                  type="text"
                  placeholder="Es. Qual è il margine EBITDA target per il prossimo trimestre?"
                  value={newDomanda}
                  onChange={(e) => setNewDomanda(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Tipo di Risposta Attesa</label>
                <select
                  value={newTipoRisposta}
                  onChange={(e) => setNewTipoRisposta(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                >
                  <option value="rating_1_5">Valutazione numerica (1 a 5)</option>
                  <option value="text">Testo libero</option>
                  <option value="boolean">Sì / No (Booleana)</option>
                  <option value="choice">Selezione multipla</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider">Salva in Supabase</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CREAZIONE CATEGORIA MASTER */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuova Categoria Master</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Aggiungi una nuova area strategica di questionari</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Nome Categoria</label>
                <input
                  type="text"
                  placeholder="Es. Risk Management & Sicurezza"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione Obiettivo</label>
                <textarea
                  rows={3}
                  placeholder="Descrivi l'ambito di analisi di questa categoria..."
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider">Salva Categoria</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE MODIFICA CATEGORIA MASTER */}
      {showEditCategoryModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Modifica Categoria Master</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Aggiorna i dati dell'area strategica</p>
              </div>
              <button onClick={() => setShowEditCategoryModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleUpdateCategory} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Nome Categoria</label>
                <input
                  type="text"
                  value={editCategoryName}
                  onChange={(e) => setEditCategoryName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione Obiettivo</label>
                <textarea
                  rows={3}
                  value={editCategoryDesc}
                  onChange={(e) => setEditCategoryDesc(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowEditCategoryModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider">Salva Modifiche</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'utenti' && (
        <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 text-xs text-gray-400 font-mono">
          [Gestione Utenti & Permessi di Sistema sincronizzata con gos_profiles]
        </div>
      )}

    </div>
  );
}
