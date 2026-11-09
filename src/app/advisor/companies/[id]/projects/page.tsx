'use client';

import { use, useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

function CompanyProjectsContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const companyId = resolvedParams.id;

  const [companyName, setCompanyName] = useState<string>('Cliente');
  const [companyCode, setCompanyCode] = useState<string>('AZ-001');
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [titolo, setTitolo] = useState('');
  const [codiceProgetto, setCodiceProgetto] = useState('');
  const [descrizione, setDescrizione] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchCompanyAndProjects();
  }, [companyId]);

  async function fetchCompanyAndProjects() {
    setLoading(true);
    try {
      // 1. Legge l'anagrafica dell'azienda corrente
      const { data: compData } = await supabase
        .from('gos_aziende')
        .select('*')
        .eq('id', companyId)
        .single();

      let exactCode = `AZ-${companyId.slice(0, 4).toUpperCase()}`;
      let currentCompName = 'Cliente';

      if (compData) {
        currentCompName = compData.nome || compData.ragione_sociale || 'Cliente';
        // Usa lo stesso criterio dell'Hub Azienda (es. campo codice o i primi caratteri dell'id maiuscoli)
        exactCode = compData.codice || compData.cod_azienda || compData.cod || companyId.slice(0, 8).toUpperCase();
      }

      setCompanyName(currentCompName);
      setCompanyCode(exactCode);

      // 2. Recupera i progetti associati
      const { data: projData } = await supabase
        .from('gos_progetti')
        .select('*')
        .eq('azienda_id', companyId);

      if (projData) {
        setProjectsList(projData);
        // Codice progetto basato esattamente sul codice ufficiale dell'azienda: [Codice Azienda]/PRJ-00X
        const nextNum = projData.length + 1;
        const formattedCode = `${exactCode}/PRJ-${String(nextNum).padStart(3, '0')}`;
        setCodiceProgetto(formattedCode);
      }
    } catch (err: any) {
      console.error('Errore caricamento dati:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!titolo) return;

    try {
      const payload: any = {
        nome: titolo,
        titolo: titolo,
        descrizione: descrizione,
        codice_progetto: codiceProgetto,
        stato: 'IN_CORSO',
        azienda_id: companyId
      };

      let { error } = await supabase.from('gos_progetti').insert([payload]);

      if (error) {
        delete payload.azienda_id;
        const res2 = await supabase.from('gos_progetti').insert([payload]);
        if (res2.error) throw res2.error;
      }

      setTitolo('');
      setDescrizione('');
      fetchCompanyAndProjects();
    } catch (err: any) {
      alert('Errore inserimento: ' + err.message);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      
      {/* Header dinamico */}
      <div className="flex justify-between items-center border-b border-gray-800 pb-6">
        <div>
          <p className="text-xs font-mono font-bold text-blue-400 uppercase tracking-wider">GOS 1.2 — Incarichi & Progetti ({companyCode})</p>
          <h1 className="text-3xl font-extrabold text-white mt-1">Gestione Progetti di {companyName}</h1>
        </div>
        <Link
          href={`/advisor/companies/${companyId}`}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all shadow-sm"
        >
          ← Torna all'Hub Azienda
        </Link>
      </div>

      {/* Maschera di Creazione */}
      <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Crea Nuovo Progetto</h3>
        <form onSubmit={handleCreateProject} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Codice Progetto (Automatico)</label>
            <input
              type="text"
              value={codiceProgetto}
              readOnly
              className="w-full bg-gray-950/60 border border-gray-800 rounded-xl p-3 text-sm text-blue-400 font-mono cursor-not-allowed select-none"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-mono text-gray-400 uppercase tracking-wider mb-1">Titolo / Nome Progetto</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Inserisci il nome del progetto strategico..."
                value={titolo}
                onChange={(e) => setTitolo(e.target.value)}
                required
                className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl transition-colors shadow-sm whitespace-nowrap"
              >
                + Crea Progetto
              </button>
            </div>
          </div>
        </form>
        <input
          type="text"
          placeholder="Breve descrizione o obiettivi del progetto..."
          value={descrizione}
          onChange={(e) => setDescrizione(e.target.value)}
          className="w-full bg-gray-950 border border-gray-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Lista Progetti */}
      <div className="space-y-4">
        <h3 className="text-sm font-mono font-bold text-gray-400 uppercase tracking-wider">Progetti Associati ({projectsList.length})</h3>
        {loading ? (
          <p className="text-sm text-gray-500">Caricamento...</p>
        ) : projectsList.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl text-center text-gray-400">
            Nessun progetto associato a questo cliente. Usa il modulo sopra per crearne uno.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projectsList.map((proj) => (
              <div key={proj.id} className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="px-2.5 py-1 bg-gray-950 border border-gray-800 text-blue-400 font-mono text-xs font-bold rounded-lg">
                      {proj.codice_progetto || proj.codice || `${companyCode}/PRJ-001`}
                    </span>
                    <span className="px-2.5 py-1 bg-blue-950 border border-blue-800 text-blue-300 text-xs font-semibold rounded-lg uppercase">
                      {proj.stato || 'IN_CORSO'}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-base mt-2">{proj.nome || proj.titolo}</h4>
                  <p className="text-xs text-gray-400">{proj.descrizione || 'Nessuna descrizione.'}</p>
                </div>
                
                <div className="pt-4 border-t border-gray-800 flex justify-end">
                  <Link
                    href={`/advisor/projects/${proj.id}`}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl transition-all shadow-sm"
                  >
                    Apri Tab Operativi →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10">
      <Suspense fallback={<div className="text-center py-20 text-gray-400 text-sm">Caricamento...</div>}>
        <CompanyProjectsContent params={params} />
      </Suspense>
    </main>
  );
}
