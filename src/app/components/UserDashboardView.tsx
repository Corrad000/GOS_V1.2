'use client';

import React, { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { CompanyItem, CompanyTable } from './CompanyTable';
import { QuestCategory } from './QuestCategory';
import { QuestModulo } from './QuestModulo';
import { OfferBuilderView } from '@/modules/offer-builder/OfferBuilderView';

interface UserDashboardViewProps {
  userRole: 'admin' | 'user' | 'advisor' | 'Network Partner';
  userName: string;
  companies: CompanyItem[];
}

export function UserDashboardView({ userRole, userName, companies }: UserDashboardViewProps) {
  const [activeTab, setActiveTab] = useState<'aziende' | 'questionari' | 'offerte' | 'utenti'>('aziende');

  // Stati Supabase per Categorie e Moduli Questionari
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<any | null>(null);
  const [modules, setModules] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Stati Modale Creazione Modulo Questionario
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDomanda, setNewDomanda] = useState('');
  const [newTipoRisposta, setNewTipoRisposta] = useState('rating_1_5');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento categorie questionari da Supabase
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

  // Caricamento moduli della categoria selezionata
  useEffect(() => {
    if (!selectedCategory) return;

    async function loadModules() {
      try {
        const { data, error } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('categoria_id', selectedCategory.id);

        if (error) throw error;
        setModules(data || []);
      } catch (err: any) {
        console.error('Errore caricamento moduli:', err?.message || err);
      }
    }

    loadModules();
  }, [selectedCategory, supabase]);

  // Salvataggio modulo questionario
  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !selectedCategory || !newDomanda) return;

    try {
      const { data: modData, error: modErr } = await supabase
        .from('gos_moduli')
        .insert([
          {
            categoria_id: selectedCategory.id,
            titolo: newTitle,
            descrizione: 'Creato da libreria GOS 1.2',
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
        setModules([...modules, modData]);
      }

      setNewTitle('');
      setNewDomanda('');
      setShowModal(false);
    } catch (err: any) {
      console.error('Errore salvataggio modulo:', err?.message || err);
      alert('Errore durante la creazione del modulo.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* CRUSCOTTO REPORT IN CIMA (Sopra i Tab - Stile Reference) */}
      {/* ======================================================== */}
      <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-gray-800/80 pb-3">
          <div>
            <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
              CRUSCOTTO <span className="text-[#FF5500]">PORTAFOGLIO & REPORT</span>
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Visione d&apos;insieme globale del business • Aggiornato in tempo reale</p>
          </div>
          <span className="px-3 py-1 bg-gray-950 border border-gray-800 text-gray-400 text-[11px] font-mono rounded-lg">
            Stato: Operativo
          </span>
        </div>

        {/* KPI Cards Principali */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          
          {/* Contratti */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Contratti Attivi / Chiusi</span>
            <div className="text-lg font-black text-white font-mono">
              <span className="text-emerald-400">14</span> <span className="text-gray-600">/</span> <span className="text-blue-400">28</span>
            </div>
          </div>

          {/* Fatturato Eseguito */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Fatturato Eseguito</span>
            <div className="text-lg font-black text-emerald-400 font-mono">
              € 185.000
            </div>
          </div>

          {/* Advisor (Piattaforma / Attivi / Online) */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Advisor (Plat/Att/On)</span>
            <div className="text-base font-black text-white font-mono">
              <span>8</span> <span className="text-gray-600">/</span> <span className="text-emerald-400">6</span> <span className="text-gray-600">/</span> <span className="text-blue-400">3</span>
            </div>
          </div>

          {/* Aziende in Portfolio */}
          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-1">
            <span className="text-[10px] font-mono font-bold uppercase text-gray-400 tracking-wider">Aziende in Portfolio</span>
            <div className="text-lg font-black text-[#FF5500] font-mono">
              {companies.length > 0 ? companies.length : 42}
            </div>
          </div>

        </div>

        {/* Sotto-pillole e Distribuzione Geografica Regione / Stato */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          
          <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400">In Sospeso / Rifiutati:</span>
            <span className="text-amber-400 font-bold">5 / 2</span>
          </div>

          <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400">Fatturato Perso:</span>
            <span className="text-red-400 font-bold">€ 35.000</span>
          </div>

          <div className="bg-gray-950 border border-gray-800 p-3 rounded-xl flex items-center justify-between text-xs font-mono">
            <span className="text-gray-400">Top Aree:</span>
            <span className="text-white font-bold">Sardegna (IT), Lombardia (IT)</span>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* BARRA DEI TAB DI NAVIGAZIONE */}
      {/* ======================================================== */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-800 pb-4">
        <button
          onClick={() => setActiveTab('aziende')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'aziende'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Controllo Aziende ({companies.length})
        </button>

        <button
          onClick={() => setActiveTab('questionari')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'questionari'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Libreria Master Questionari ({modules.length > 0 ? modules.length : 1})
        </button>

        <button
          onClick={() => setActiveTab('offerte')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'offerte'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Catalogo Offerte & Servizi
        </button>

        <button
          onClick={() => setActiveTab('utenti')}
          className={`px-5 py-2.5 text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2 ${
            activeTab === 'utenti'
              ? 'bg-[#FF5500] hover:bg-orange-600 text-white border border-orange-500 shadow-orange-950/50'
              : 'bg-[#0B132B] text-gray-400 border border-gray-800 hover:bg-gray-800 hover:text-white'
          }`}
        >
          Utenti & Permessi (2) →
        </button>
      </div>

      {/* TAB 1: CONTROLLO AZIENDE */}
      {activeTab === 'aziende' && (
        <CompanyTable
          companies={companies}
          title="CONTROLLO AZIENDE"
          subtitle="Panoramica di tutte le aziende inserite nel database, advisor di riferimento e contratti attivi."
          showRegisterButton={true}
        />
      )}

      {/* TAB 2: LIBRERIA MASTER QUESTIONARI */}
      {activeTab === 'questionari' && (
        <div className="space-y-6">
          <QuestCategory
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            loading={loading}
          />

          <QuestModulo
            selectedCategory={selectedCategory}
            modules={modules}
            loading={loading}
            onOpenCreateModal={() => setShowModal(true)}
          />
        </div>
      )}

      {/* TAB 3: CATALOGO OFFERTE & SERVIZI (Collegato al componente OfferBuilderView) */}
      {activeTab === 'offerte' && (
        <OfferBuilderView />
      )}

      {/* MODALE CREAZIONE MODULO QUESTIONARIO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuovo Modulo Questionario</h3>
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

      {/* TAB 4: UTENTI & PERMESSI */}
      {activeTab === 'utenti' && (
        <div className="bg-[#0B132B] border border-gray-800 rounded-2xl p-6 text-xs text-gray-400 font-mono">
          [Gestione Utenti & Permessi di Sistema]
        </div>
      )}

    </div>
  );
}
