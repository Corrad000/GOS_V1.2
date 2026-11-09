'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface SystemCompany {
  id: string;
  name: string;
  vatNumber: string;
  assignedAdvisor: string;
  advisorRole: string;
  revenue: number;
  activeContracts: number;
  status: 'Attiva' | 'In revisione' | 'Sospesa';
}

export default function AdminControlCenter() {
  const [activeTab, setActiveTab] = useState<'questionari' | 'offerte' | 'aziende'>('aziende');

  // Categorie precaricate per le offerte
  const [categories, setCategories] = useState<string[]>([
    'diagnostica',
    'strategia',
    'fractional',
    'cyber security',
    'compliance',
    'vendite',
    'legal',
    'glaring',
    'pagamenti'
  ]);

  // Categorie per i questionari master
  const [questionariCategories] = useState<string[]>([
    'strategia',
    'diagnostica',
    'operations',
    'commerciale',
    'finanziario',
    'compliance'
  ]);

  // Elenco aziende inserite nel sistema con i relativi dettagli
  const [companies] = useState<SystemCompany[]>([
    { id: 'c1', name: 'Opus Automazione S.p.A.', vatNumber: 'IT01234567890', assignedAdvisor: 'Corrado Pinna', advisorRole: 'Administrator', revenue: 145000, activeContracts: 3, status: 'Attiva' },
    { id: 'c2', name: '4CleanPro S.r.l.', vatNumber: 'IT09876543210', assignedAdvisor: 'Marco Rossi', advisorRole: 'Network Partner', revenue: 92000, activeContracts: 2, status: 'Attiva' },
    { id: 'c3', name: 'Glaring UK Operations', vatNumber: 'GB998877665', assignedAdvisor: 'Corrado Pinna', advisorRole: 'Administrator', revenue: 147500, activeContracts: 4, status: 'Attiva' }
  ]);

  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCat = newCategoryName.trim().toLowerCase();
    if (!formattedCat) return;

    if (!categories.includes(formattedCat)) {
      setCategories([...categories, formattedCat]);
    }
    setNewCategoryName('');
    setShowCategoryInput(false);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* HEADER PANNELLO ADMIN */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-amber-500 uppercase block mb-1">
              GOS 1.2 — PANNELLO SUPER ADMINISTRATOR
            </span>
            <h1 className="text-3xl font-extrabold text-white">Control Center di Sistema</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <Link
              href="/admin/utenti"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer flex items-center gap-2"
            >
              <span>👥 Gestione Utenti & Ruoli</span>
            </Link>
          </div>
        </div>

        {/* --- CRUSCOTTO DI SISTEMA ADMINISTRATOR --- */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Fatturato Anno */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Fatturato 2026</span>
            <div className="text-2xl font-black text-emerald-400 font-mono">€ 384.500</div>
            <span className="text-[10px] text-emerald-500 font-semibold">+18% vs anno precedente</span>
          </div>

          {/* Utenti Attivi & Online */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider block">Utenti di Sistema</span>
            <div className="flex justify-between items-baseline">
              <span className="text-2xl font-black text-white font-mono">14 Attivi</span>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                🟢 3 Online
              </span>
            </div>
            <Link href="/admin/utenti" className="text-[10px] text-amber-400 hover:underline block pt-1 font-semibold">
              Gestisci ruoli e permessi →
            </Link>
          </div>

          {/* Offerte Commerciali */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Offerte Commerciali</span>
              <span className="text-xs font-bold text-white bg-gray-800 px-2 py-0.5 rounded-md font-mono">Tot: 28</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 text-gray-300">
              <span className="text-amber-400">⏳ 8 In attesa</span>
              <span className="text-emerald-400">✓ 12 Approvate</span>
              <span className="text-red-400">✕ 4 Rifiutate</span>
              <span className="text-blue-400">📤 4 Inviate</span>
            </div>
          </div>

          {/* Progetti di Consulenza */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-2xl space-y-2 shadow-lg">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">Progetti di Consulenza</span>
              <span className="text-xs font-bold text-white bg-gray-800 px-2 py-0.5 rounded-md font-mono">Tot: 15</span>
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-mono pt-1 text-gray-300">
              <span className="text-emerald-400">⚡ 6 Attivi</span>
              <span className="text-blue-400">🏁 5 Conclusi</span>
              <span className="text-amber-400">⏸ 2 Sospesi</span>
              <span className="text-gray-400">🔒 2 Chiusi</span>
            </div>
          </div>

        </div>

        {/* BARRA TAB DI NAVIGAZIONE SISTEMA */}
        <div className="flex flex-wrap gap-3 border-b border-gray-800 pb-4 pt-2">
          <button
            onClick={() => setActiveTab('questionari')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'questionari'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg'
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
            }`}
          >
            📋 Libreria Master Questionari
          </button>

          <button
            onClick={() => setActiveTab('offerte')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'offerte'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg'
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
            }`}
          >
            📦 Libreria Master Moduli
          </button>

          <button
            onClick={() => setActiveTab('aziende')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              activeTab === 'aziende'
                ? 'bg-amber-600 text-white border-amber-500 shadow-lg'
                : 'bg-gray-900 text-gray-400 border-gray-800 hover:text-white hover:border-gray-700'
            }`}
          >
            🏢 Controllo Aziende ({companies.length})
          </button>
        </div>

        {/* --- CONTENUTO TAB: LIBRERIA MASTER QUESTIONARI --- */}
        {activeTab === 'questionari' && (
          <div className="space-y-8">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Categorie Master Questionari & Assessment</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Seleziona una categoria per gestire i questionari standard di raccolta dati.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {questionariCategories.map((cat, idx) => (
                  <Link
                    key={idx}
                    href={`/admin/questionari/${cat}`}
                    className="bg-gray-950 border border-gray-800 hover:border-amber-500/70 p-4 rounded-xl flex items-center justify-between transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 block uppercase">Libreria Questionari</span>
                      <span className="text-sm font-extrabold text-amber-400 uppercase tracking-wide group-hover:text-amber-300">
                        {cat}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg group-hover:border-amber-500/40 group-hover:text-white transition-all">
                      Gestisci →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- CONTENUTO TAB: LIBRERIA MASTER MODULI (OFFERTE) --- */}
        {activeTab === 'offerte' && (
          <div className="space-y-8">
            <div className="bg-gray-900 p-6 rounded-2xl border border-gray-800 shadow-xl space-y-5">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-sm font-black text-white uppercase tracking-wider">Categorie Master Moduli</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Clicca su una categoria per aprire la libreria dedicata e gestire i moduli standard.</p>
                </div>
                <button
                  onClick={() => setShowCategoryInput(!showCategoryInput)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  {showCategoryInput ? '✕ Chiudi' : '+ Aggiungi Categoria'}
                </button>
              </div>

              {showCategoryInput && (
                <form onSubmit={handleAddCategory} className="flex gap-3 bg-gray-950 p-4 rounded-xl border border-amber-500/40">
                  <input
                    type="text"
                    placeholder="Nome nuova categoria (es. logistica)"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button type="submit" className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer">
                    Salva Categoria
                  </button>
                </form>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {categories.map((cat, idx) => (
                  <Link
                    key={idx}
                    href={`/admin/offerte/${cat}`}
                    className="bg-gray-950 border border-gray-800 hover:border-amber-500/70 p-4 rounded-xl flex items-center justify-between transition-all cursor-pointer group shadow-sm hover:shadow-md"
                  >
                    <div>
                      <span className="text-[10px] font-mono text-gray-500 block uppercase">Libreria Master</span>
                      <span className="text-sm font-extrabold text-amber-400 uppercase tracking-wide group-hover:text-amber-300">
                        {cat}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-gray-400 bg-gray-900 border border-gray-800 px-3 py-1.5 rounded-lg group-hover:border-amber-500/40 group-hover:text-white transition-all">
                      Gestisci Moduli →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- CONTENUTO TAB: CONTROLLO AZIENDE --- */}
        {activeTab === 'aziende' && (
          <div className="bg-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
              <div>
                <h2 className="text-base font-black text-white uppercase">Controllo Aziende</h2>
                <p className="text-xs text-gray-400 mt-0.5">Panoramica di tutte le aziende inserite nel sistema, advisor di riferimento, fatturato e contratti attivi.</p>
              </div>
              <button
                onClick={() => alert('Funzione di censimento nuova azienda in arrivo.')}
                className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
              >
                + Registra Nuova Azienda
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-950 text-gray-400 uppercase font-mono text-[10px] border-b border-gray-800">
                  <tr>
                    <th className="p-3">Azienda / P.IVA</th>
                    <th className="p-3">Advisor Assegnato</th>
                    <th className="p-3">Fatturato Aziendale</th>
                    <th className="p-3">Contratti Attivi</th>
                    <th className="p-3">Stato</th>
                    <th className="p-3 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80">
                  {companies.map((comp) => (
                    <tr key={comp.id} className="hover:bg-gray-950/50 transition-colors">
                      <td className="p-3">
                        <div className="font-bold text-white text-sm">{comp.name}</div>
                        <div className="text-gray-500 font-mono text-[10px]">{comp.vatNumber}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-gray-200">{comp.assignedAdvisor}</div>
                        <div className="text-amber-400 font-mono text-[10px]">{comp.advisorRole}</div>
                      </td>
                      <td className="p-3 font-mono font-black text-emerald-400 text-sm">
                        € {comp.revenue.toLocaleString()}
                      </td>
                      <td className="p-3 font-mono font-bold text-white">
                        <span className="bg-gray-950 border border-gray-800 px-2.5 py-1 rounded-lg">
                          📄 {comp.activeContracts} Attivi
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {comp.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => alert(`Visualizza dettaglio azienda: ${comp.name}`)}
                          className="text-gray-400 hover:text-amber-400 font-bold transition-colors cursor-pointer"
                        >
                          👁️ Dettagli
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
