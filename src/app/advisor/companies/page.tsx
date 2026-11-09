'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

interface Company {
  id: string;
  ragione_sociale: string;
  partita_iva: string;
  codice_azienda: string;
  advisor_assegnato: string;
  fatturato: number;
  stato: string;
}

export default function CompaniesHubPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Campi del form per la nuova azienda
  const [ragioneSociale, setRagioneSociale] = useState('');
  const [partitaIva, setPartitaIva] = useState('');
  const [codiceAzienda, setCodiceAzienda] = useState('');
  const [advisorAssegnato, setAdvisorAssegnato] = useState('Corrado Pinna');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento aziende da Supabase all'avvio
  useEffect(() => {
    async function fetchCompanies() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('gos_aziende')
          .select('*')
          .order('created_at', { ascending: false });

        if (data && !error) {
          setCompanies(data);
        }
      } catch (err) {
        console.error('Errore di connessione a Supabase:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompanies();
  }, [supabase]);

  // Funzione per registrare la nuova azienda su Supabase
  async function handleRegisterCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!ragioneSociale || !partitaIva) return;

    try {
      const { data, error } = await supabase
        .from('gos_aziende')
        .insert([
          {
            ragione_sociale: ragioneSociale,
            partita_iva: partitaIva,
            codice_azienda: codiceAzienda || 'NEW',
            advisor_assegnato: advisorAssegnato,
            stato: 'Attiva'
          }
        ])
        .select();

      if (error) {
        throw error;
      }

      if (data) {
        setCompanies([data[0], ...companies]);
      }

      // Reset form e chiusura modale
      setRagioneSociale('');
      setPartitaIva('');
      setCodiceAzienda('');
      setIsModalOpen(false);
      setMessage('Azienda registrata con successo su Supabase.');
    } catch (err: any) {
      setMessage(`Errore durante il salvataggio: ${err.message}`);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-8 font-sans text-gray-100 bg-gray-950 min-h-screen">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">CONTROLLO AZIENDE</h1>
          <p className="text-xs text-gray-400 mt-1">
            Panoramica di tutte le aziende inserite nel sistema, advisor di riferimento e contratti attivi.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2"
        >
          <span>+ Registra Nuova Azienda</span>
        </button>
      </div>

      {message && (
        <div className="p-3 bg-gray-900 border border-gray-800 rounded-xl text-xs text-amber-400">
          {message}
        </div>
      )}

      {/* TABELLA AZIENDE */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-gray-400 text-xs font-mono">Caricamento dati da Supabase...</div>
        ) : companies.length === 0 ? (
          <div className="p-10 text-center text-gray-400 text-xs">Nessuna azienda trovata nel database. Clicca su Registra Nuova Azienda per iniziare.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950 uppercase text-gray-400 font-mono text-[10px] border-b border-gray-800">
                <tr>
                  <th className="p-4">Azienda / P.IVA</th>
                  <th className="p-4">Advisor Assegnato</th>
                  <th className="p-4">Stato</th>
                  <th className="p-4 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {companies.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-850/50 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-white block">{c.ragione_sociale}</span>
                      <span className="text-[10px] text-gray-400 font-mono">{c.partita_iva}</span>
                    </td>
                    <td className="p-4">{c.advisor_assegnato || 'Corrado Pinna'}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {c.stato || 'Attiva'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <Link
                        href={`/advisor/companies/${c.id}`}
                        className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-semibold transition-all inline-block"
                      >
                        👁 Dettagli
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALE DI REGISTRAZIONE NUOVA AZIENDA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <h3 className="text-white font-bold text-base">Registra Nuova Azienda</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterCompany} className="space-y-4">
              <div>
                <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Ragione Sociale</label>
                <input
                  type="text"
                  placeholder="Es. Superpower S.r.l."
                  value={ragioneSociale}
                  onChange={(e) => setRagioneSociale(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Partita IVA / Codice Fiscale</label>
                <input
                  type="text"
                  placeholder="Es. IT01234567890"
                  value={partitaIva}
                  onChange={(e) => setPartitaIva(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] text-gray-400 font-mono uppercase mb-1">Codice Identificativo Breve</label>
                <input
                  type="text"
                  placeholder="Es. SUPER"
                  value={codiceAzienda}
                  onChange={(e) => setCodiceAzienda(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white uppercase"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Salva e Registra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
