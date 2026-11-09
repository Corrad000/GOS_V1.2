'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

export default function ProjectsManagementPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const [titolo, setTitolo] = useState('');
  const [codiceProgetto, setCodiceProgetto] = useState('PRJ-001');
  const [descrizione, setDescrizione] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.from('gos_projects').select('*');
      if (error) {
        throw error;
      }
      if (data) {
        setProjects(data);
      }
    } catch (err: any) {
      console.error('Errore Supabase gos_projects:', err.message);
      setErrorMsg(err.message);
      // Fallback locale di cortesia per non bloccare l'interfaccia se la tabella non esiste
      setProjects([
        {
          id: 'demo-1',
          codice_progetto: 'PRJ-001',
          titolo: 'Piano Strategico di Intervento & Operation (Demo)',
          descrizione: 'Progetto di esempio attivo per testare la navigazione.',
          stato: 'IN_CORSO'
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!titolo) return;

    try {
      const { error } = await supabase.from('gos_projects').insert([
        {
          codice_progetto: codiceProgetto,
          titolo: titolo,
          descrizione: descrizione,
          stato: 'IN_CORSO'
        }
      ]);

      if (error) throw error;

      setTitolo('');
      setDescrizione('');
      setCodiceProgetto(`PRJ-00${projects.length + 2}`);
      fetchProjects();
    } catch (err: any) {
      alert('Errore salvataggio su Supabase: ' + err.message + '\n(Assicurati che la tabella gos_projects esista nel tuo database).');
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Principale */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div>
            <p className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">GOS 1.2 — Incarichi & Progetti</p>
            <h1 className="text-3xl font-extrabold text-white mt-1">Gestione Piani Strategici</h1>
          </div>
          <Link href="/advisor" className="px-4 py-2 bg-gray-900 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 shadow-sm hover:bg-gray-800 transition-all">
            ← Torna al Cruscotto
          </Link>
        </div>

        {/* Avviso di errore se Supabase non ha la tabella pronta */}
        {errorMsg && (
          <div className="bg-amber-950/40 border border-amber-500/40 p-4 rounded-xl text-xs text-amber-200 flex items-center justify-between">
            <span>⚠️ Nota DB: Impossibile leggere la tabella <code>gos_projects</code> ({errorMsg}). È attivo un progetto di fallback dimostrativo. Crea la tabella su Supabase per salvare i dati in modo persistente.</span>
          </div>
        )}

        {/* Maschera di Creazione Nuovo Progetto */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crea Nuovo Progetto Strategico</h3>
          <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Codice (es. PRJ-001)"
              value={codiceProgetto}
              onChange={(e) => setCodiceProgetto(e.target.value)}
              required
              className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
            />
            <input
              type="text"
              placeholder="Titolo del Progetto / Incarico"
              value={titolo}
              onChange={(e) => setTitolo(e.target.value)}
              required
              className="bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
            >
              + Crea Progetto
            </button>
          </form>
          <input
            type="text"
            placeholder="Breve descrizione o obiettivi del progetto"
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
            className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Griglia / Lista Progetti Esistenti */}
        <div className="space-y-4 pt-4">
          <h3 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Elenco Progetti in Corso ({projects.length})</h3>
          
          {loading ? (
            <p className="text-sm text-gray-500">Caricamento progetti...</p>
          ) : projects.length === 0 ? (
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl text-center text-gray-400 text-sm shadow-sm">
              Nessun progetto registrato. Utilizza il modulo in alto per creare il primo incarico strategico.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4 hover:border-gray-700 transition-all">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-blue-400 font-mono text-xs font-bold rounded-lg">
                        {proj.codice_progetto || 'PRJ-001'}
                      </span>
                      <span className="px-2.5 py-1 bg-blue-950 border border-blue-800 text-blue-300 text-xs font-semibold rounded-lg uppercase">
                        {proj.stato || 'IN_CORSO'}
                      </span>
                    </div>
                    <h4 className="font-bold text-white text-lg mt-2">{proj.titolo}</h4>
                    <p className="text-xs text-gray-400 leading-relaxed">{proj.descrizione || 'Nessuna descrizione specificata.'}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-800 flex justify-end">
                    <Link
                      href={`/advisor/projects/${proj.id}`}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm flex items-center gap-1"
                    >
                      <span>Apri Dettaglio e Tab Operativi</span> →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
