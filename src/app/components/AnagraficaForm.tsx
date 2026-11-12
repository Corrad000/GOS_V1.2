'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Client standard di Supabase per evitare problemi di cookie in locale
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AnagraficaFormProps {
  initialData?: any; // Aggiunto per ricevere i dati dell'azienda corrente in modifica
  onSave: (company: any) => void;
  onCancel: () => void;
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
  const [advisorNome, setAdvisorNome] = useState(initialData?.advisor_nome || 'Corrado Pinna (Administrator)');
  const [fatturato, setFatturato] = useState(initialData?.fatturato !== undefined ? initialData.fatturato : 250000);
  const [note, setNote] = useState(initialData?.note || '');
  
  // Stato per la lista degli utenti/advisor presi da gos_profiles
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Caricamento dinamico dei profili / advisor da gos_profiles
  useEffect(() => {
    async function fetchProfiles() {
      setLoadingProfiles(true);
      try {
        const { data, error } = await supabase
          .from('gos_profiles')
          .select('id, nome, email, role');

        if (error) throw error;
        if (data && data.length > 0) {
          setProfiles(data);
          // Seleziona di default il primo se non c'è già un advisor impostato e non siamo in modifica
          if (!initialData && !advisorNome) {
            const defaultAdvisor = `${data[0].nome || data[0].email} (${data[0].role || 'Advisor'})`;
            setAdvisorNome(defaultAdvisor);
          }
        }
      } catch (err: any) {
        console.error('Errore nel recupero dei profili da gos_profiles:', err);
      } finally {
        setLoadingProfiles(false);
      }
    }

    fetchProfiles();
  }, [initialData, advisorNome]);

  const handleSaveDirect = async () => {
    if (!ragioneSociale.trim()) {
      alert('Inserisci la Ragione Sociale obbligatoria.');
      return;
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      alert('ERRORE: Variabili d\'ambiente Supabase non lette da Next.js!');
      return;
    }

    console.log('--- TENTATIVO SCRITTURA SUPABASE ---');
    setLoading(true);
    setErrorMessage(null);

    const companyPayload = {
      ragione_sociale: ragioneSociale.trim(),
      codice_azienda: initialData?.codice_azienda || `AZ-${Math.floor(Math.random() * 90000 + 10000)}`,
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
      stato: initialData?.stato || 'ATTIVA'
    };

    try {
      let resultData;
      if (initialData?.id) {
        // Modalità UPDATE se l'azienda esiste già
        const { data, error } = await supabase
          .from('gos_aziende')
          .update(companyPayload)
          .eq('id', initialData.id)
          .select()
          .single();

        if (error) throw error;
        resultData = data;
      } else {
        // Modalità INSERT se è una nuova azienda
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
    } catch (err: any) {
      console.error('ERRORE CATCH:', err);
      const msg = err.message || JSON.stringify(err) || 'Errore sconosciuto';
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
        
        {/* Ragione Sociale */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Ragione Sociale *</label>
          <input
            type="text"
            value={ragioneSociale}
            onChange={(e) => setRagioneSociale(e.target.value)}
            placeholder="Es. Opus Automazione S.p.A."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Categoria / Settore */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Categoria / Settore</label>
          <input
            type="text"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            placeholder="Manifatturiero / Industriale"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Partita IVA / VAT */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Partita IVA / VAT</label>
          <input
            type="text"
            value={partitaIva}
            onChange={(e) => setPartitaIva(e.target.value)}
            placeholder="Es. IT01234567890"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Codice Fiscale */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Codice Fiscale</label>
          <input
            type="text"
            value={codiceFiscale}
            onChange={(e) => setCodiceFiscale(e.target.value)}
            placeholder="Es. 01234567890"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Indirizzo Completo */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Indirizzo Completo</label>
          <input
            type="text"
            value={indirizzo}
            onChange={(e) => setIndirizzo(e.target.value)}
            placeholder="Es. Via industriale 12"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Codice Postale (CAP) */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Codice Postale (CAP)</label>
          <input
            type="text"
            value={cap}
            onChange={(e) => setCap(e.target.value)}
            placeholder="Es. 09100"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Città / Sede */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Città / Sede</label>
          <input
            type="text"
            value={citta}
            onChange={(e) => setCitta(e.target.value)}
            placeholder="Es. Cagliari"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Nazione */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Nazione</label>
          <input
            type="text"
            value={nazione}
            onChange={(e) => setNazione(e.target.value)}
            placeholder="Italia"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Sito Web */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Sito Web</label>
          <input
            type="text"
            value={sitoWeb}
            onChange={(e) => setSitoWeb(e.target.value)}
            placeholder="Es. https://www.azienda.it"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Responsabile / Referente */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Responsabile / Referente</label>
          <input
            type="text"
            value={referente}
            onChange={(e) => setReferente(e.target.value)}
            placeholder="Es. Mario Rossi"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* E-mail di Contatto */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">E-mail di Contatto</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Es. m.rossi@azienda.it"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Telefono */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Telefono</label>
          <input
            type="text"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Es. +39 070 123456"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Assegna Advisor Responsabile (Dinamico da gos_profiles) */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Assegna Advisor Responsabile</label>
          <select
            value={advisorNome}
            onChange={(e) => setAdvisorNome(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          >
            {advisorNome && !profiles.some(p => `${p.nome || p.email} (${p.role || 'Advisor'})` === advisorNome) && (
              <option value={advisorNome}>{advisorNome}</option>
            )}
            {loadingProfiles ? (
              <option value="">Caricamento advisor...</option>
            ) : profiles.length === 0 ? (
              <option value="Corrado Pinna (Administrator)">Corrado Pinna (Administrator)</option>
            ) : (
              profiles.map((p) => {
                const displayName = `${p.nome || p.email} (${p.role || 'Advisor'})`;
                return (
                  <option key={p.id} value={displayName}>
                    {displayName}
                  </option>
                );
              })
            )}
          </select>
        </div>

        {/* Fatturato Stimato / Annuo (€) */}
        <div className="space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Fatturato Stimato / Annuo (€)</label>
          <input
            type="number"
            value={fatturato}
            onChange={(e) => setFatturato(Number(e.target.value))}
            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
          />
        </div>

        {/* Note Preliminari / Obiettivi Strategici */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-gray-300 font-medium uppercase tracking-wider text-[10px]">Note Preliminari / Obiettivi Strategici</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dettagli sulle esigenze di consulenza o accordi iniziali..."
            className="w-full bg-gray-900 border border-gray-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-amber-500 font-mono resize-none"
          ></textarea>
        </div>

      </div>

      {/* Pulsanti Azione */}
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
          {loading ? 'SALVATAGGIO...' : (initialData ? 'SALVA MODIFICHE' : 'CONFERMA E REGISTRA AZIENDA')}
        </button>
      </div>
    </div>
  );
}
