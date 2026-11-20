'use client';

import React, { useState } from 'react';

export type StatoAzione = 'scaduta' | 'oggi' | 'programmata' | 'senza_azione';
export type FaseTrattativa = 'lead' | 'qualifica' | 'proposta' | 'negoziazione' | 'chiusura';
export type StatoTrattativa = 'attiva' | 'in_pausa' | 'vinta' | 'persa';

export interface AzioneProgrammata {
  titolo: string;
  data: string;
}

export interface TrattativaDettaglio {
  id: string;
  nome: string;
  azienda: {
    id: string;
    nome: string;
  };
  codiceOfferta?: string;
  valore: number;
  azioneNecessaria: string;
  azioneProgrammata: AzioneProgrammata | null;
  statoAzione: StatoAzione;
  ultimaModifica: string;
  fase: FaseTrattativa;
  statoTrattativa: StatoTrattativa;
  probabilita: number;
  chiusuraPrevista?: string;
}

export interface ModuloTrattativa {
  id: string;
  codice: string;
  titolo: string;
  importo: number;
  stato: 'confermato' | 'in_revisione' | 'opzionale';
}

export interface EventoTimeline {
  id: string;
  quando: string;
  tipo: 'nota' | 'email' | 'chiamata' | 'incontro' | 'documento' | 'followup' | 'completata' | 'sistema';
  titolo: string;
  dettaglio?: string;
  autore: string;
}

export interface VoceRegistro {
  id: string;
  quando: string;
  autore: string;
  azione: string;
  daStato: string;
  aStato: string;
  motivo?: string;
}

export interface OffertaCollegata {
  codice: string;
  versione: number;
  importo: number;
  stato: 'inviata' | 'bozza' | 'archiviata' | 'in_approvazione';
  inviataIl?: string;
}

export interface ContattoTrattativa {
  nome: string;
  ruolo: string;
  email?: string;
  telefono?: string;
}

export interface DatiSchedaTrattativa {
  trattativa: TrattativaDettaglio;
  moduli: ModuloTrattativa[];
  timeline: EventoTimeline[];
  registro: VoceRegistro[];
  offerte: OffertaCollegata[];
  contatti: ContattoTrattativa[];
}

export interface SchedaTrattativaProps {
  dati: DatiSchedaTrattativa;
  onTornaAzienda: () => void;
  onRegistraAttivita: (payload: {
    tipo: EventoTimeline['tipo'];
    titolo: string;
    dettaglio?: string;
    prossimaAzione?: string;
  }) => Promise<void> | void;
  onProgrammaFollowUp: (payload: {
    titolo: string;
    data: string;
  }) => Promise<void> | void;
  onConfermaAzioneFatta: () => Promise<void> | void;
  onNuovaOfferta: () => void;
  onCambiaStato: (nuovoStato: StatoTrattativa) => Promise<void> | void;
  onCambiaFase?: (nuovaFase: FaseTrattativa) => Promise<void> | void;
  onApriOfferta?: (codiceOfferta: string) => void;
}

const FASI: { id: FaseTrattativa; label: string; probDefault: number }[] = [
  { id: 'lead', label: 'Lead', probDefault: 0.2 },
  { id: 'qualifica', label: 'Qualifica', probDefault: 0.4 },
  { id: 'proposta', label: 'Proposta', probDefault: 0.6 },
  { id: 'negoziazione', label: 'Negoziazione', probDefault: 0.8 },
  { id: 'chiusura', label: 'Chiusura', probDefault: 1.0 },
];

const STATI: { id: StatoTrattativa; label: string; activeClass: string }[] = [
  { id: 'attiva', label: 'Attiva', activeClass: 'bg-emerald-600 text-white border-emerald-300 ring-2 ring-emerald-400/40' },
  { id: 'in_pausa', label: 'In pausa', activeClass: 'bg-amber-600 text-white border-amber-300 ring-2 ring-amber-400/40' },
  { id: 'vinta', label: 'Vinta', activeClass: 'bg-sky-600 text-white border-sky-300 ring-2 ring-sky-400/40' },
  { id: 'persa', label: 'Persa', activeClass: 'bg-rose-600 text-white border-rose-300 ring-2 ring-rose-400/40' },
];

export function normalizzaFase(raw?: string): FaseTrattativa {
  const v = String(raw || '').toLowerCase().trim();
  if (v.includes('qualif')) return 'qualifica';
  if (v.includes('propost')) return 'proposta';
  if (v.includes('negoz')) return 'negoziazione';
  if (v.includes('chius')) return 'chiusura';
  return 'lead';
}

export function normalizzaStato(raw?: string): StatoTrattativa {
  const v = String(raw || '').toLowerCase().trim().replace(/\s+/g, '_');
  if (v.includes('pausa') || v === 'paused') return 'in_pausa';
  if (v.includes('vint') || v === 'won') return 'vinta';
  if (v.includes('pers') || v === 'lost') return 'persa';
  return 'attiva';
}

function formatEuro(valore: number): string {
  return `${Math.round(valore).toLocaleString('it-IT')} €`;
}

function formatDataBreve(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
}

function formatDataOra(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}, ${d.toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}

export const SchedaTrattativa: React.FC<SchedaTrattativaProps> = ({
  dati,
  onTornaAzienda,
  onRegistraAttivita,
  onProgrammaFollowUp,
  onConfermaAzioneFatta,
  onNuovaOfferta,
  onCambiaStato,
  onCambiaFase,
  onApriOfferta,
}) => {
  const { trattativa, timeline, registro, offerte, contatti } = dati;

  const faseCorrente = normalizzaFase(trattativa.fase);
  const statoCorrente = normalizzaStato(trattativa.statoTrattativa);

  const [tabAttivo, setTabAttivo] = useState<'timeline' | 'registro' | 'offerte' | 'contatti'>('timeline');
  const [modalTipo, setModalTipo] = useState<'attivita' | 'followup' | null>(null);

  const [attivitaTipo, setAttivitaTipo] = useState<EventoTimeline['tipo']>('chiamata');
  const [attivitaTitolo, setAttivitaTitolo] = useState('');
  const [attivitaDettaglio, setAttivitaDettaglio] = useState('');
  const [attivitaProssimaAzione, setAttivitaProssimaAzione] = useState('');
  const [savingAttivita, setSavingAttivita] = useState(false);

  const [followupTitolo, setFollowupTitolo] = useState('');
  const [followupData, setFollowupData] = useState('');
  const [savingFollowup, setSavingFollowup] = useState(false);
  const [completingAction, setCompletingAction] = useState(false);

  const valorePesato = Math.round(trattativa.valore * trattativa.probabilita);
  const probabilitaPct = Math.round(trattativa.probabilita * 100);

  const haAzioneDaFare = Boolean(
    trattativa.azioneProgrammata ||
      (trattativa.azioneNecessaria &&
        trattativa.azioneNecessaria.trim() !== '' &&
        trattativa.azioneNecessaria.toLowerCase() !== 'nessuna azione da fare')
  );

  const handleSubmitAttivita = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attivitaTitolo.trim() || savingAttivita) return;
    setSavingAttivita(true);
    try {
      await onRegistraAttivita({
        tipo: attivitaTipo,
        titolo: attivitaTitolo.trim(),
        dettaglio: attivitaDettaglio.trim() || undefined,
        prossimaAzione: attivitaProssimaAzione.trim() || undefined,
      });
      setAttivitaTitolo('');
      setAttivitaDettaglio('');
      setAttivitaProssimaAzione('');
      setModalTipo(null);
      setTabAttivo('timeline');
    } finally {
      setSavingAttivita(false);
    }
  };

  const handleSubmitFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followupTitolo.trim() || !followupData || savingFollowup) return;
    setSavingFollowup(true);
    try {
      await onProgrammaFollowUp({
        titolo: followupTitolo.trim(),
        data: followupData,
      });
      setFollowupTitolo('');
      setFollowupData('');
      setModalTipo(null);
      setTabAttivo('timeline');
    } finally {
      setSavingFollowup(false);
    }
  };

  const handleClickConfermaFatto = async () => {
    if (!haAzioneDaFare || completingAction) return;
    setCompletingAction(true);
    try {
      await onConfermaAzioneFatta();
    } finally {
      setCompletingAction(false);
    }
  };

  return (
    <section className="bg-[#0B132B] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl text-gray-100">
      {/* Breadcrumb & Torna */}
      <div className="px-6 py-3.5 bg-gray-950/90 border-b border-gray-800 flex flex-wrap items-center justify-between gap-3">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
          <button type="button" onClick={onTornaAzienda} className="hover:text-white transition cursor-pointer">
            Aziende
          </button>
          <span className="text-gray-600">/</span>
          <button type="button" onClick={onTornaAzienda} className="hover:text-white transition cursor-pointer">
            {trattativa.azienda.nome}
          </button>
          <span className="text-gray-600">/</span>
          <button type="button" onClick={onTornaAzienda} className="hover:text-white transition cursor-pointer">
            Trattative
          </button>
          <span className="text-gray-600">/</span>
          <span className="text-[#FF5500] font-semibold">{trattativa.nome}</span>
        </nav>

        <button
          type="button"
          onClick={onTornaAzienda}
          className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-semibold text-gray-200 transition cursor-pointer"
        >
          ← Torna alle trattative
        </button>
      </div>

      {/* Header principale + Stato */}
      <div className="px-6 py-5 bg-gradient-to-r from-[#111E42] via-[#0B132B] to-[#0F172A] border-b border-gray-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-extrabold tracking-tight text-white">
              {trattativa.nome}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#FF5500]/20 text-[#FF8547] border border-[#FF5500]/50">
              {faseCorrente}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-300">
            <span>{trattativa.azienda.nome}</span>
            {trattativa.codiceOfferta && (
              <>
                <span className="text-gray-600">·</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  Offerta {trattativa.codiceOfferta}
                </span>
              </>
            )}
            {trattativa.chiusuraPrevista && (
              <>
                <span className="text-gray-600">·</span>
                <span className="text-gray-400">
                  Chiusura prevista {formatDataBreve(trattativa.chiusuraPrevista)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Selettore Stato Trattativa */}
        <div className="flex flex-col items-start lg:items-end gap-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Stato trattativa
          </span>
          <div
            role="group"
            aria-label="Stato trattativa"
            className="inline-flex rounded-xl bg-gray-950 p-1 border border-gray-700 gap-1"
          >
            {STATI.map((s) => {
              const attivo = statoCorrente === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onCambiaStato(s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    attivo
                      ? s.activeClass
                      : 'bg-gray-900/80 text-gray-300 border-gray-800 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stepper Fase Pipeline */}
      <div className="px-6 py-4 bg-gray-950/70 border-b border-gray-800 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-gray-400">
          <span className="font-bold uppercase tracking-wider">Fase pipeline commerciale</span>
          <span className="font-mono text-emerald-400 font-semibold">
            Probabilità fase: {probabilitaPct}%
          </span>
        </div>
        <div
          role="group"
          aria-label="Fase pipeline"
          className="grid grid-cols-2 sm:grid-cols-5 gap-2"
        >
          {FASI.map((f, idx) => {
            const currentIdx = FASI.findIndex((x) => x.id === faseCorrente);
            const isCurrent = faseCorrente === f.id;
            const isCompleted = currentIdx > idx;

            return (
              <button
                key={f.id}
                type="button"
                disabled={!onCambiaFase}
                onClick={() => onCambiaFase && onCambiaFase(f.id)}
                className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-between border ${
                  isCurrent
                    ? 'bg-[#FF5500] text-white border-orange-300 ring-2 ring-orange-400/40 shadow-md cursor-pointer'
                    : isCompleted
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/70 hover:bg-emerald-900/60 cursor-pointer'
                      : 'bg-gray-900 text-gray-300 border-gray-800 hover:border-gray-600 hover:text-white cursor-pointer'
                }`}
              >
                <span>{f.label}</span>
                <span className="font-mono text-[10px] opacity-90">
                  {Math.round(f.probDefault * 100)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Corpo principale 2 colonne */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* Colonna sinistra: Azioni + Tab + Riquadro temporale in basso a sinistra */}
        <div className="lg:col-span-8 p-6 lg:border-r border-gray-800 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => setModalTipo('attivita')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#FF5500] hover:bg-orange-600 text-white shadow transition cursor-pointer"
              >
                + Registra attività
              </button>
              <button
                type="button"
                onClick={() => setModalTipo('followup')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 hover:bg-gray-800 text-white border border-gray-700 transition cursor-pointer"
              >
                ⏱ Programma follow-up
              </button>
              <button
                type="button"
                onClick={onNuovaOfferta}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/60 transition cursor-pointer"
              >
                + Nuova offerta
              </button>
            </div>

            <div className="flex gap-6 border-b border-gray-800 text-xs font-bold">
              {(
                [
                  { id: 'timeline', label: 'Timeline', count: timeline.length },
                  { id: 'registro', label: 'Registro', count: registro.length },
                  { id: 'offerte', label: 'Offerte', count: offerte.length },
                  { id: 'contatti', label: 'Contatti', count: contatti.length },
                ] as const
              ).map((t) => {
                const active = tabAttivo === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTabAttivo(t.id)}
                    className={`pb-3 -mb-px transition flex items-center gap-1.5 cursor-pointer border-b-2 ${
                      active
                        ? 'border-[#FF5500] text-white'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <span>{t.label}</span>
                    <span className="px-1.5 py-0.5 rounded-md bg-gray-900 text-[10px] font-mono text-gray-300">
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {tabAttivo === 'timeline' && (
              <div className="space-y-3">
                {timeline.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/60 p-6 text-center space-y-1.5">
                    <p className="text-sm font-semibold text-gray-300">Nessuna attività o follow-up registrato</p>
                    <p className="text-xs text-gray-500">
                      Clicca su &ldquo;+ Registra attività&rdquo; o &ldquo;Programma follow-up&rdquo; per aggiornare la cronologia.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {timeline.map((ev) => (
                      <li
                        key={ev.id}
                        className="p-3.5 rounded-xl bg-gray-950/90 border border-gray-800 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border ${
                                ev.tipo === 'followup'
                                  ? 'bg-amber-950/70 text-amber-300 border-amber-700/60'
                                  : ev.tipo === 'completata'
                                    ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700/60'
                                    : 'bg-gray-900 text-[#FF7A33] border-gray-700'
                              }`}
                            >
                              {ev.tipo}
                            </span>
                            <p className="text-sm font-bold text-white">{ev.titolo}</p>
                          </div>
                          {ev.dettaglio && <p className="text-xs text-gray-400">{ev.dettaglio}</p>}
                          <p className="text-[11px] text-gray-500">Autore: {ev.autore}</p>
                        </div>
                        <span className="text-[11px] font-mono text-gray-400 shrink-0">
                          {formatDataOra(ev.quando)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {tabAttivo === 'registro' && (
              <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950/70">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900 text-[10px] uppercase tracking-wider text-gray-400">
                      <th className="py-2.5 px-3.5">Quando</th>
                      <th className="py-2.5 px-3.5">Autore</th>
                      <th className="py-2.5 px-3.5">Azione</th>
                      <th className="py-2.5 px-3.5">Variazione</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/70">
                    {registro.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 px-3.5 text-center text-gray-500">
                          Nessuna voce di registro.
                        </td>
                      </tr>
                    ) : (
                      registro.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-900/50">
                          <td className="py-2.5 px-3.5 font-mono text-gray-400 whitespace-nowrap">
                            {formatDataOra(r.quando)}
                          </td>
                          <td className="py-2.5 px-3.5 text-gray-200">{r.autore}</td>
                          <td className="py-2.5 px-3.5 font-semibold text-white">{r.azione}</td>
                          <td className="py-2.5 px-3.5 font-mono text-emerald-400">
                            {r.daStato} → {r.aStato}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {tabAttivo === 'offerte' && (
              <div className="space-y-3">
                {offerte.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/60 p-6 text-center">
                    <p className="text-xs text-gray-400">Nessuna offerta collegata a questa azienda.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-800 border border-gray-800 rounded-xl bg-gray-950/70">
                    {offerte.map((off) => (
                      <div
                        key={`${off.codice}-v${off.versione}`}
                        className="p-4 flex items-center justify-between gap-4"
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-white">
                            {off.codice}{' '}
                            <span className="text-gray-500 font-normal">v{off.versione}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">
                            Stato: <span className="text-emerald-400 font-semibold uppercase">{off.stato}</span>
                            {off.inviataIl ? ` · ${formatDataBreve(off.inviataIl)}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold text-white">
                            {formatEuro(off.importo)}
                          </span>
                          {onApriOfferta && (
                            <button
                              type="button"
                              onClick={() => onApriOfferta(off.codice)}
                              className="px-3 py-1.5 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-700 text-xs font-bold text-gray-200 cursor-pointer"
                            >
                              Apri
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tabAttivo === 'contatti' && (
              <div className="space-y-2.5">
                {contatti.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950/60 p-6 text-center">
                    <p className="text-xs text-gray-400">Nessun referente associato alla trattativa.</p>
                  </div>
                ) : (
                  contatti.map((c, i) => (
                    <div
                      key={`${c.nome}-${i}`}
                      className="p-4 rounded-xl bg-gray-950/70 border border-gray-800 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-bold text-white">{c.nome}</p>
                        <p className="text-xs text-gray-400">{c.ruolo}</p>
                      </div>
                      <div className="text-right text-xs font-mono text-gray-400">
                        {c.email && <p>{c.email}</p>}
                        {c.telefono && <p>{c.telefono}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Riquadro temporale in basso a sinistra: tutto ciò che è stato fatto e programmato */}
          <div className="pt-4 border-t border-gray-800">
            <div className="rounded-xl bg-gray-950/90 border border-gray-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
                  Cronologia temporale attività & aggiornamenti
                </h4>
                <span className="text-[10px] font-mono text-gray-500">
                  {timeline.length} eventi
                </span>
              </div>

              {timeline.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Ancora nessuna registrazione temporale su questa trattativa.
                </p>
              ) : (
                <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {timeline.map((ev) => (
                    <li
                      key={`log-${ev.id}`}
                      className="flex items-start justify-between gap-3 text-xs border-b border-gray-900 pb-2 last:border-b-0 last:pb-0"
                    >
                      <div className="space-y-0.5">
                        <span className="font-mono text-[10px] text-[#FF7A33] uppercase mr-2">
                          [{ev.tipo}]
                        </span>
                        <span className="font-semibold text-gray-200">{ev.titolo}</span>
                        {ev.dettaglio && (
                          <p className="text-[11px] text-gray-400">{ev.dettaglio}</p>
                        )}
                      </div>
                      <span className="font-mono text-[11px] text-gray-400 whitespace-nowrap shrink-0">
                        {formatDataOra(ev.quando)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Colonna destra: Valore & Prossima Azione con conferma "Fatto" */}
        <aside className="lg:col-span-4 p-6 bg-gray-950/50 space-y-6">
          <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Valore trattativa
            </p>
            <p className="text-3xl font-extrabold font-mono text-white">
              {formatEuro(trattativa.valore)}
            </p>
            <p className="text-xs text-emerald-400 font-mono">
              Probabilità {probabilitaPct}% · ponderato {formatEuro(valorePesato)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-gray-900/90 border border-gray-800 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                Prossima azione
              </p>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  trattativa.azioneProgrammata
                    ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
                    : haAzioneDaFare
                      ? 'bg-sky-950/80 text-sky-300 border-sky-700/60'
                      : 'bg-gray-950 text-gray-500 border-gray-800'
                }`}
              >
                {trattativa.azioneProgrammata
                  ? formatDataOra(trattativa.azioneProgrammata.data)
                  : haAzioneDaFare
                    ? 'In corso'
                    : 'Completata'}
              </span>
            </div>

            <p className="text-sm font-bold text-white">
              {haAzioneDaFare
                ? trattativa.azioneProgrammata?.titolo || trattativa.azioneNecessaria
                : 'Nessuna azione pendente'}
            </p>

            <p className="text-xs text-gray-400">
              {trattativa.azioneProgrammata
                ? `Follow-up fissato per ${formatDataOra(trattativa.azioneProgrammata.data)}`
                : haAzioneDaFare
                  ? trattativa.azioneNecessaria
                  : 'Usa "Registra attività" o "Programma follow-up" per impostare la prossima azione.'}
            </p>

            {haAzioneDaFare && (
              <div className="pt-2 border-t border-gray-800 flex justify-end">
                <button
                  type="button"
                  disabled={completingAction}
                  onClick={handleClickConfermaFatto}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-50"
                >
                  {completingAction ? 'Conferma...' : '✓ Segna come fatto'}
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-gray-800/80 text-xs text-gray-500">
            Ultima modifica {formatDataOra(trattativa.ultimaModifica)}
          </div>
        </aside>
      </div>

      {/* Modale Registra Attività */}
      {modalTipo === 'attivita' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Registra Attività — {trattativa.nome}
              </h3>
              <button
                type="button"
                onClick={() => setModalTipo(null)}
                className="text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitAttivita} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Tipo attività
                </label>
                <select
                  value={attivitaTipo}
                  onChange={(e) => setAttivitaTipo(e.target.value as EventoTimeline['tipo'])}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                >
                  <option value="chiamata">Chiamata</option>
                  <option value="incontro">Incontro / Call</option>
                  <option value="email">Email</option>
                  <option value="nota">Nota operativa</option>
                  <option value="documento">Documento / Offerta</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Titolo attività
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Call conoscitiva con direzione"
                  value={attivitaTitolo}
                  onChange={(e) => setAttivitaTitolo(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Dettaglio / Esito
                </label>
                <textarea
                  rows={2}
                  placeholder="Note sull'esito o punti emersi..."
                  value={attivitaDettaglio}
                  onChange={(e) => setAttivitaDettaglio(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Aggiorna prossima azione (opzionale)
                </label>
                <input
                  type="text"
                  placeholder="Es. Inviare proposta economica aggiornata"
                  value={attivitaProssimaAzione}
                  onChange={(e) => setAttivitaProssimaAzione(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalTipo(null)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingAttivita}
                  className="px-4 py-2 rounded-xl bg-[#FF5500] hover:bg-orange-600 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingAttivita ? 'Salvataggio...' : 'Salva attività'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale Programma Follow-up */}
      {modalTipo === 'followup' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-white">
                Programma Follow-up — {trattativa.nome}
              </h3>
              <button
                type="button"
                onClick={() => setModalTipo(null)}
                className="text-gray-400 hover:text-white text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitFollowUp} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Titolo follow-up
                </label>
                <input
                  type="text"
                  required
                  placeholder="Es. Richiamare per riscontro offerta"
                  value={followupTitolo}
                  onChange={(e) => setFollowupTitolo(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                  Data e ora
                </label>
                <input
                  type="datetime-local"
                  required
                  value={followupData}
                  onChange={(e) => setFollowupData(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  onClick={() => setModalTipo(null)}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold cursor-pointer"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={savingFollowup}
                  className="px-4 py-2 rounded-xl bg-[#FF5500] hover:bg-orange-600 text-white font-bold cursor-pointer disabled:opacity-50"
                >
                  {savingFollowup ? 'Programmazione...' : 'Conferma follow-up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};
