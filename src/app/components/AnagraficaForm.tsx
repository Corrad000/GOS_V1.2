'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Client standard di Supabase per evitare problemi di cookie in locale
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

interface AnagraficaFormProps {
  initialData?: any;
  onSave: (company: any) => void;
  onCancel: () => void;
}

function describeError(err: unknown): string {
  if (!err) return 'Errore non specificato';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const parts: string[] = [];
    for (const key of ['message', 'code', 'details', 'hint', 'status', 'statusText']) {
      if (obj[key]) parts.push(`${key}: ${String(obj[key])}`);
    }
    if (parts.length > 0) return parts.join(' | ');
    try {
      const names = Object.getOwnPropertyNames(obj);
      const extracted = names
        .map((k) => `${k}=${String(obj[k])}`)
        .filter((entry) => !entry.endsWith('=undefined'));
      if (extracted.length > 0) return extracted.join(', ');
    } catch {
      // ignora errori di ispezione
    }
  }
  return String(err);
}

export default function AnagraficaForm({ initialData, onSave, onCancel }: AnagraficaFormProps) {
  const [ragioneSociale, setRagioneSociale] = useState(initialData?.ragione_sociale || '');
  const [categoria, setCategoria] = useState(initialData?.categoria || 'Manifatturiero / Industriale');
  const [partitaIva, setPartitaIva] = useState(initialData?.partita_iva || '');
  const [codiceFiscale, setCodiceFiscale] = useState(initialData?.codice_fiscale || '');
  const [indirizzo, setIndirizzo] = useState(initialData?.indirizzo || '');
  const [cap, setCap] = useState(initialData?.cap || '');
  const [citta, setCitta] = useState(initialData?.citta || 'Cagliari');
  const [nazione, setNazione] = useState(initialData?.nazione || 'Italia');
  const [sitoWeb, setSitoWeb] = useState(initialData?.sito_web || '');
  const [referente, setReferente] = useState(initialData?.referente || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [telefono, setTelefono] = useState(initialData?.telefono || '');
  const [advisorNome, setAdvisorNome] = useState(
    initialData?.advisor_nome || 'Corrado Pinna (Administrator)'
  );
  const [fatturato, setFatturato] = useState(
    initialData?.fatturato !== undefined ? initialData.fatturato : 250000
  );
  const [note, setNote] = useState(initialData?.note || '');

  // Stato per la lista degli utenti/advisor presi da gos_profiles
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasInitialAdvisor = Boolean(initialData?.advisor_nome);
  const appliedDefaultAdvisorRef = useRef(hasInitialAdvisor);

  // Caricamento dinamico dei profili / advisor da gos_profiles
  useEffect(() => {
    let active = true;

    async function fetchProfiles() {
      if (!supabase) {
        return;
      }

      setLoadingProfiles(true);
      try {
        const { data, error } = await supabase.from('gos_profiles').select('*');

        if (error) {
          if (active) {
            console.warn('Avviso recupero gos_profiles:', describeError(error));
          }
          return;
        }

        if (!active) return;

        if (Array.isArray(data) && data.length > 0) {
          setProfiles(data);
          if (!appliedDefaultAdvisorRef.current) {
            const first = data[0];
            const label =
              first.nome || first.full_name || first.name || first.email || 'Advisor';
            const role = first.role || first.ruolo || 'Advisor';
            setAdvisorNome(`${label} (${role})`);
            appliedDefaultAdvisorRef.current = true;
          }
        }
      } catch (err) {
        if (active) {
          console.warn('Avviso eccezione gos_profiles:', describeError(err));
        }
      } finally {
        if (active) {
          setLoadingProfiles(false);
        }
      }
    }

    void fetchProfiles();

    return () => {
      active = false;
    };
  }, [initialData]);

  const handleSaveDirect = async () => {
    if (!ragioneSociale.trim()) {
      alert('Inserisci la Ragione Sociale obbligatoria.');
      return;
    }

    if (!supabase || !supabaseUrl || !supabaseAnonKey) {
      alert("ERRORE: Variabili d'ambiente Supabase non lette da Next.js!");
      return;
    }

    console.log('--- TENTATIVO SCRITTURA SUPABASE ---');
    setLoading(true);
    setErrorMessage(null);

    const companyPayload = {
      ragione_sociale: ragioneSociale.trim(),
      codice_azienda:
        initialData?.codice_azienda || `AZ-${Math.floor(Math.random() * 90000 + 10000)}`,
      partita_iva: partitaIva,
      codice_fiscale: codiceFiscale,
      categoria: categoria,
      indirizzo: indirizzo,
      cap: cap,
      citta: citta,
      nazione: nazione,
      sito_web: sitoWeb,
      referente: referente,
      email: email,
      telefono: telefono,
      advisor_nome: advisorNome,
      fatturato: Number(fatturato),
      contratti_attivi: initialData?.contratti_attivi ?? 3,
      note: note,
      stato: initialData?.stato || 'ATTIVA',
    };

    try {
      let resultData;
      if (initialData?.id) {
        const { data, error } = await supabase
          .from('gos_aziende')
          .update(companyPayload)
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;
      } else {
        const { data, error } = await supabase
          .from('gos_aziende')
          .insert([companyPayload])
          .select()
          .single();

        if (error) throw error;
        resultData = data;
      }

      console.log('SUCCESSO SALVATAGGIO:', resultData);
      onSave(resultData || companyPayload);
    } catch (err) {
      console.error('ERRORE CATCH:', err);
      const msg = describeError(err);
      setErrorMessage(msg);
      alert('ECCEZIONE: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-gray-100 bg-gray-950 p-4">
      {errorMessage && (
        <div className="p-3 bg-red-950/85 border border-red-700 text-red-200 text-xs rounded-xl font-mono">
          <strong>Errore Rilevato:</strong> {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Ragione Sociale *
          </label>
          <input
            type="text"
            value={ragioneSociale}
            onChange={(e) => setRagioneSociale(e.target.value)}
            placeholder="Es. Opus Automazione S.p.A."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Categoria / Settore
          </label>
          <input
            type="text"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Manifatturiero / Industriale"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Partita IVA / VAT
          </label>
          <input
            type="text"
            value={partitaIva}
            onChange={(e) => setPartitaIva(e.target.value)}
            placeholder="Es. IT01234567890"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Codice Fiscale
          </label>
          <input
            type="text"
            value={codiceFiscale}
            onChange={(e) => setCodiceFiscale(e.target.value)}
            placeholder="Es. 01234567890"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Indirizzo Completo
          </label>
          <input
            type="text"
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            placeholder="Es. Via industriale 12"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Codice Postale (CAP)
          </label>
          <input
            type="text"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            placeholder="Es. 09100"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Città / Sede
          </label>
          <input
            type="text"
            value={citta}
            onChange={(e) => setCitta(e.target.value)}
            placeholder="Es. Cagliari"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Nazione
          </label>
          <input
            type="text"
            value={nazione}
            onChange={(e) => setNazione(e.target.value)}
            placeholder="Italia"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Sito Web
          </label>
          <input
            type="text"
            value={sitoWeb}
            onChange={(e) => setSitoWeb(e.target.value)}
            placeholder="Es. https://www.azienda.it"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Responsabile / Referente
          </label>
          <input
            type="text"
            value={referente}
            onChange={(e) => setReferente(e.target.value)}
            placeholder="Es. Mario Rossi"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            E-mail di Contatto
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Es. m.rossi@azienda.it"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Telefono
          </label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Es. +39 070 123456"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Assegna Advisor Responsabile
          </label>
          <select
            value={advisorNome}
            onChange={(e) => setAdvisorNome(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            {advisorNome &&
              !profiles.some((p) => {
                const label =
                  p.nome || p.full_name || p.name || p.email || 'Advisor';
                const role = p.role || p.ruolo || 'Advisor';
                return `${label} (${role})` === advisorNome;
              }) && <option value={advisorNome}>{advisorNome}</option>}
            {loadingProfiles ? (
              <option value="">Caricamento advisor...</option>
            ) : profiles.length === 0 ? (
              <option value="Corrado Pinna (Administrator)">
                Corrado Pinna (Administrator)
              </option>
            ) : (
              profiles.map((p, idx) => {
                const label =
                  p.nome || p.full_name || p.name || p.email || 'Advisor';
                const role = p.role || p.ruolo || 'Advisor';
                const displayName = `${label} (${role})`;
                return (
                  <option key={p.id || idx} value={displayName}>
                    {displayName}
                  </option>
                );
              })
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Fatturato Stimato / Annuo (€)
          </label>
          <input
            type="number"
            value={fatturato}
            onChange={(e) => setFatturato(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        <div className="md:col-span-2 space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">
            Note Preliminari / Obiettivi Strategici
          </label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dettagli sulle esigenze di consulenza o accordi iniziali..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500 font-mono resize-none"
          ></textarea>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 items-center">
        {loading && (
          <span className="text-amber-400 font-mono text-xs animate-pulse">
            Salvataggio in corso...
          </span>
        )}
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 rounded-xl font-semibold transition-all cursor-pointer text-xs disabled:opacity-50"
        >
          Annulla
        </button>
        <button
          type="button"
          onClick={handleSaveDirect}
          disabled={loading}
          className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-lg transition-all cursor-pointer text-xs disabled:opacity-50"
        >
          {loading
            ? 'SALVATAGGIO...'
            : initialData
              ? 'SALVA MODIFICHE'
              : 'CONFERMA E REGISTRA AZIENDA'}
        </button>
      </div>
    </div>
  );
}
