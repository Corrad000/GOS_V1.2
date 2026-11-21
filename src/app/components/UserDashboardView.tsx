'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { CompanyItem, CompanyTable } from './CompanyTable';
import { UsersTable } from './UsersTable';
import { CatalogDashboardView } from '@/modules/offer-builder/CatalogDashboardView';

interface UserDashboardViewProps {
  userRole: 'admin' | 'user' | 'advisor' | 'Network Partner';
  userName: string;
  companies: CompanyItem[];
}

export function UserDashboardView({ userRole, userName, companies }: UserDashboardViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'aziende' | 'questionari' | 'offerte' | 'utenti'>('aziende');
  const [localCompanies, setLocalCompanies] = useState<CompanyItem[]>(companies);

  // Gallery Questionari Master (attivi / creati)
  const [categories, setCategories] = useState<any[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [masterQuestionnaires, setMasterQuestionnaires] = useState<any[]>([]);
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(false);

  // Metriche Reali Cruscotto
  const [stats, setStats] = useState({
    totalCompanies: companies.length,
    totalModules: 0,
    totalCategories: 0,
    activeAdvisors: 1
  });

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  useEffect(() => {
    async function fetchSystemStats() {
      try {
        const { count: modCount } = await supabase
          .from('gos_moduli')
          .select('*', { count: 'exact', head: true })
          .is('company_code', null);
        const { count: catCount } = await supabase
          .from('gos_categorie')
          .select('*', { count: 'exact', head: true });
        const { count: profCount } = await supabase
          .from('gos_profiles')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalCompanies: localCompanies.length,
          totalModules: modCount || 0,
          totalCategories: catCount || 0,
          activeAdvisors: profCount || 1
        });
      } catch (err) {
        console.error('Errore recupero metriche:', err);
      }
    }
    fetchSystemStats();
  }, [localCompanies, supabase]);

  useEffect(() => {
    if (activeTab !== 'questionari') return;

    async function loadQuestionnairesGallery() {
      setLoadingQuestionnaires(true);
      try {
        const [{ data: catsData, error: catsErr }, { data: modsData, error: modsErr }] = await Promise.all([
          supabase.from('gos_categorie').select('*').order('nome'),
          supabase
            .from('gos_moduli')
            .select('*')
            .is('company_code', null)
            .order('created_at', { ascending: false })
        ]);

        if (catsErr) throw catsErr;
        if (modsErr) throw modsErr;

        setCategories(catsData || []);
        setMasterQuestionnaires(modsData || []);
      } catch (err: any) {
        console.error('Errore caricamento gallery questionari master:', err?.message || err);
        setMasterQuestionnaires([]);
      } finally {
        setLoadingQuestionnaires(false);
      }
    }

    loadQuestionnairesGallery();
  }, [activeTab, supabase]);

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[String(c.id)] = c.nome;
    }
    return map;
  }, [categories]);

  const filteredQuestionnaires = useMemo(() => {
    if (filterCategoryId === 'all') return masterQuestionnaires;
    return masterQuestionnaires.filter((q) => String(q.categoria_id) === String(filterCategoryId));
  }, [masterQuestionnaires, filterCategoryId]);

  const handleDeleteQuestionnaire = async (id: string) => {
    if (!confirm('Sei sicuro di voler eliminare questo questionario master?')) return;
    try {
      const { error } = await supabase.from('gos_moduli').delete().eq('id', id);
      if (error) throw error;
      setMasterQuestionnaires((prev) => prev.filter((q) => q.id !== id));
      setStats((prev) => ({ ...prev, totalModules: Math.max(0, prev.totalModules - 1) }));
    } catch (err: any) {
      alert('Errore durante l\'eliminazione: ' + (err?.message || err));
    }
  };

  const totalPortfolioRevenue = localCompanies.reduce((acc, c: any) => acc + Number(c.fatturato || c.revenue || 0), 0);

  return (
    <div className="space-y-6">
      {/* CRUSCOTTO REPORT IN CIMA */}
      <div className="bg-[#0B132B] border border-gray-800 rounded-none p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-gray-800/80 pb-3">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              CRUSCOTTO <span className="text-[#FF5500]">PORTAFOGLIO & REPORT</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Visione d&apos;insieme globale del business • Sincronizzato con Supabase</p>
          </div>
          <span className="px-3 py-1 bg-gray-950 border border-gray-800 text-emerald-400 text-[11px] font-mono rounded-none">
            ● Live DB
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-gray-950 border border-gray-800 rounded-none p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Questionari / Categorie</span>
            <div className="text-lg font-black text-white font-mono">
              <span className="text-emerald-400">{stats.totalModules}</span> <span className="text-gray-600">/</span> <span className="text-blue-400">{stats.totalCategories}</span>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-none p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Fatturato Totale Portfolio</span>
            <div className="text-lg font-black text-emerald-400 font-mono">
              € {totalPortfolioRevenue.toLocaleString('it-IT')}
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-none p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Profili / Advisor</span>
            <div className="text-base font-black text-white font-mono">
              <span className="text-emerald-400">{stats.activeAdvisors}</span> <span className="text-gray-400 font-normal text-xs">attivi</span>
            </div>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-none p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Aziende in Portfolio</span>
            <div className="text-lg font-black text-[#FF5500] font-mono">
              {localCompanies.length}
            </div>
          </div>
        </div>
      </div>

      {/* BARRA DEI TAB */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 pb-4">
        <button
          type="button"
          onClick={() => setActiveTab('aziende')}
          className={`px-5 py-2.5 text-xs font-bold rounded-none transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'aziende'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Controllo Aziende ({localCompanies.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('questionari')}
          className={`px-5 py-2.5 text-xs font-bold rounded-none transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'questionari'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Questionari Master ({masterQuestionnaires.length > 0 ? masterQuestionnaires.length : stats.totalModules})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('offerte')}
          className={`px-5 py-2.5 text-xs font-bold rounded-none transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'offerte'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Catalogo Offerte & Servizi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('utenti')}
          className={`px-5 py-2.5 text-xs font-bold rounded-none transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
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
          companies={localCompanies}
          title="CONTROLLO AZIENDE"
          subtitle="Panoramica di tutte le aziende inserite nel database, advisor di riferimento e contratti attivi."
          showRegisterButton={true}
          onCompaniesDeleted={(deletedIds) => {
            const deletedSet = new Set(deletedIds);
            setLocalCompanies((prev) => prev.filter((c) => !deletedSet.has(c.id)));
          }}
        />
      )}

      {activeTab === 'questionari' && (
        <div className="bg-[#0B132B] border border-gray-800 rounded-none p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
            <div>
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Gallery Questionari Master Attivi / Creati
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Consulta i questionari disponibili o apri la pagina dedicata per crearne e lavorarne uno.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.push('/questionari-master?mode=new')}
              className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-none shadow transition-all cursor-pointer uppercase tracking-wider"
            >
              + Aggiungi Questionario
            </button>
          </div>

          {/* Filtro rapido per categoria */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterCategoryId('all')}
              className={`px-3 py-1.5 text-xs font-bold rounded-none border cursor-pointer transition-all ${
                filterCategoryId === 'all'
                  ? 'bg-[#FF5500] text-white border-orange-500'
                  : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
              }`}
            >
              Tutte le categorie ({masterQuestionnaires.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setFilterCategoryId(String(cat.id))}
                className={`px-3 py-1.5 text-xs font-bold rounded-none border cursor-pointer transition-all ${
                  String(filterCategoryId) === String(cat.id)
                    ? 'bg-[#FF5500] text-white border-orange-500'
                    : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
                }`}
              >
                {cat.nome}
              </button>
            ))}
          </div>

          {loadingQuestionnaires ? (
            <div className="p-8 text-center text-xs font-mono text-gray-400">
              Caricamento gallery questionari...
            </div>
          ) : filteredQuestionnaires.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-none space-y-3">
              <p className="text-sm text-gray-400">
                Nessun questionario master trovato per il filtro selezionato.
              </p>
              <button
                type="button"
                onClick={() => router.push('/questionari-master?mode=new')}
                className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-none shadow transition-all cursor-pointer uppercase tracking-wider"
              >
                + Aggiungi il primo Questionario
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredQuestionnaires.map((q) => {
                const catName =
                  categoryMap[String(q.categoria_id)] || q.categoria_nome || 'Categoria non assegnata';
                return (
                  <div
                    key={q.id}
                    className="bg-slate-800/90 hover:bg-slate-800 border border-slate-600/80 hover:border-slate-500 rounded-none p-5 flex flex-col justify-between space-y-4 shadow-md transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2 py-0.5 bg-gray-950 text-[#FF5500] border border-slate-700 font-mono text-[10px] font-bold uppercase">
                          {q.codice_modulo || 'QST'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-semibold uppercase">
                          {q.stato || 'Attivo'}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono text-amber-300 uppercase tracking-wide">
                        Categoria: {catName}
                      </div>

                      <h4 className="text-sm font-bold text-white uppercase">{q.titolo}</h4>
                      <p className="text-xs text-slate-300 line-clamp-2">
                        {q.descrizione || 'Nessuna descrizione inserita.'}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-700/80 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => handleDeleteQuestionnaire(q.id)}
                        className="px-2.5 py-1.5 bg-red-950/60 hover:bg-red-900 text-red-300 border border-red-800 text-[11px] font-bold rounded-none cursor-pointer transition-all"
                      >
                        Elimina
                      </button>

                      <button
                        type="button"
                        onClick={() => router.push(`/questionari-master?id=${q.id}`)}
                        className="px-3.5 py-1.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-none cursor-pointer transition-all"
                      >
                        Apri / Modifica →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'offerte' && (
        <CatalogDashboardView />
      )}

      {activeTab === 'utenti' && (
        <UsersTable currentUserRole={userRole} currentUserEmail={userName} />
      )}
    </div>
  );
}
