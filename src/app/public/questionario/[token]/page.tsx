'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

function parseOpzioni(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (typeof raw === 'string') {
    return raw
      .split(/\n|,/)
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function getSelectedChoices(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x).trim()).filter(Boolean);
  }
  if (typeof raw === 'string' && raw.trim() !== '') {
    return [raw.trim()];
  }
  return [];
}

function hasFilledValue(val: unknown): boolean {
  if (Array.isArray(val)) return val.length > 0;
  if (val === null || val === undefined) return false;
  return String(val).trim() !== '';
}

function serializeRispostaValue(val: unknown): string {
  if (Array.isArray(val)) return val.join(', ');
  if (val === null || val === undefined) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export default function PublicQuestionarioTokenPage() {
  const params = useParams();
  const token = String(params?.token || '').trim();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [mode, setMode] = useState<'bundle' | 'assigned' | null>(null);
  const [assignment, setAssignment] = useState<any>(null);
  const [moduli, setModuli] = useState<any[]>([]);
  const [aziendaId, setAziendaId] = useState<string | null>(null);
  const [titoloQuestionario, setTitoloQuestionario] = useState<string>('');
  const [descrizioneQuestionario, setDescrizioneQuestionario] = useState<string>('');
  const [domande, setDomande] = useState<any[]>([]);
  const [risposte, setRisposte] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function load() {
      if (!token) {
        setErrorMsg('Link non valido.');
        setLoading(false);
        return;
      }

      try {
        // 1. Cerca moduli assemblati per questionario aziendale (parent_questionario_id = token)
        const { data: bundleModuli, error: modErr } = await supabase
          .from('gos_moduli')
          .select('*')
          .eq('parent_questionario_id', token)
          .order('created_at', { ascending: true });

        if (!modErr && bundleModuli && bundleModuli.length > 0) {
          setMode('bundle');
          setModuli(bundleModuli);

          const firstMod = bundleModuli[0];
          setTitoloQuestionario(
            bundleModuli.length === 1
              ? firstMod.titolo || 'Questionario Aziendale'
              : `Questionario Aziendale (${bundleModuli.length} Moduli)`
          );
          setDescrizioneQuestionario(firstMod.descrizione || '');

          let resolvedAziendaId: string | null = null;
          if (firstMod.company_code) {
            const { data: az } = await supabase
              .from('gos_aziende')
              .select('id')
              .eq('company_code', firstMod.company_code)
              .maybeSingle();
            if (az?.id) resolvedAziendaId = az.id;
          }
          setAziendaId(resolvedAziendaId);

          const moduloIds = bundleModuli.map((m: any) => m.id);
          const [{ data: doms }, { data: existingComp }] = await Promise.all([
            supabase
              .from('gos_domande')
              .select('*')
              .in('modulo_id', moduloIds)
              .order('ordine', { ascending: true }),
            supabase
              .from('gos_compilazioni_moduli')
              .select('modulo_id, risposte, completato')
              .in('modulo_id', moduloIds),
          ]);

          const orderMap = new Map<string, number>();
          bundleModuli.forEach((m: any, idx: number) => orderMap.set(m.id, idx));

          const sortedDoms = (doms || []).sort((a: any, b: any) => {
            const modDiff = (orderMap.get(a.modulo_id) ?? 0) - (orderMap.get(b.modulo_id) ?? 0);
            if (modDiff !== 0) return modDiff;
            return (Number(a.ordine) || 0) - (Number(b.ordine) || 0);
          });

          const mergedRisposte: Record<string, any> = {};
          let anyCompleted = false;
          (existingComp || []).forEach((c: any) => {
            if (c?.completato) anyCompleted = true;
            if (c?.risposte && typeof c.risposte === 'object') {
              Object.assign(mergedRisposte, c.risposte);
            }
          });

          setDomande(sortedDoms);
          setRisposte(mergedRisposte);
          if (anyCompleted) setSubmitted(true);
          setLoading(false);
          return;
        }

        // 2. Fallback: questionario assegnato singolo in gos_questionari_assegnati
        const { data: ass, error: assErr } = await supabase
          .from('gos_questionari_assegnati')
          .select('*')
          .eq('token', token)
          .maybeSingle();

        if (assErr || !ass) {
          setErrorMsg('Questionario non trovato o link scaduto.');
          setLoading(false);
          return;
        }

        setMode('assigned');
        setAssignment(ass);
        setAziendaId(ass.azienda_id || null);
        setRisposte(ass.risposte || {});
        if (ass.stato === 'Compilato') setSubmitted(true);

        const [{ data: mod }, { data: doms }] = await Promise.all([
          supabase.from('gos_moduli').select('*').eq('id', ass.modulo_id).maybeSingle(),
          supabase
            .from('gos_domande')
            .select('*')
            .eq('modulo_id', ass.modulo_id)
            .order('ordine', { ascending: true }),
        ]);

        setModuli(mod ? [mod] : []);
        setTitoloQuestionario(mod?.titolo || ass?.titolo || 'Questionario');
        setDescrizioneQuestionario(mod?.descrizione || '');
        setDomande(doms || []);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Errore di caricamento');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token, supabase]);

  const handleAnswerChange = (domandaId: string, value: any) => {
    setRisposte((prev) => ({ ...prev, [domandaId]: value }));
  };

  const handleToggleChoice = (domandaId: string, option: string) => {
    setRisposte((prev) => {
      const current = getSelectedChoices(prev[domandaId]);
      const exists = current.includes(option);
      const next = exists
        ? current.filter((item) => item !== option)
        : [...current, option];
      return { ...prev, [domandaId]: next };
    });
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();

      if (mode === 'bundle' && moduli.length > 0) {
        for (const mod of moduli) {
          const modDomande = domande.filter((d) => d.modulo_id === mod.id);
          const modRisposte: Record<string, any> = {};
          for (const d of modDomande) {
            if (d.id in risposte) {
              modRisposte[d.id] = risposte[d.id];
            }
          }

          const { data: existingRow } = await supabase
            .from('gos_compilazioni_moduli')
            .select('id')
            .eq('modulo_id', mod.id)
            .maybeSingle();

          if (existingRow?.id) {
            const { error: updErr } = await supabase
              .from('gos_compilazioni_moduli')
              .update({
                azienda_id: aziendaId,
                risposte: modRisposte,
                completato: true,
                data_compilazione: nowIso,
              })
              .eq('id', existingRow.id);
            if (updErr) throw updErr;
          } else {
            const { error: insErr } = await supabase
              .from('gos_compilazioni_moduli')
              .insert({
                azienda_id: aziendaId,
                modulo_id: mod.id,
                risposte: modRisposte,
                completato: true,
                data_compilazione: nowIso,
              });
            if (insErr) throw insErr;
          }

          if (aziendaId) {
            for (const d of modDomande) {
              if (d.tipo_risposta === 'section_header') continue;
              if (!hasFilledValue(risposte[d.id])) continue;
              const serialized = serializeRispostaValue(risposte[d.id]);

              const { data: existingResp } = await supabase
                .from('gos_risposte')
                .select('id')
                .eq('azienda_id', aziendaId)
                .eq('modulo_id', mod.id)
                .eq('domanda_id', d.id)
                .maybeSingle();

              if (existingResp?.id) {
                await supabase
                  .from('gos_risposte')
                  .update({ valore_risposta: serialized })
                  .eq('id', existingResp.id);
              } else {
                await supabase.from('gos_risposte').insert({
                  azienda_id: aziendaId,
                  modulo_id: mod.id,
                  domanda_id: d.id,
                  valore_risposta: serialized,
                });
              }
            }
          }
        }
      } else if (assignment?.id) {
        const { error } = await supabase
          .from('gos_questionari_assegnati')
          .update({
            risposte,
            stato: 'Compilato',
            submitted_at: nowIso,
            updated_at: nowIso,
          })
          .eq('id', assignment.id);

        if (error) throw error;
      }

      const answeredCount = Object.values(risposte || {}).filter(hasFilledValue).length;
      const firstMod = moduli[0];

      await fetch('/api/questionari/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignmentId: assignment?.id || null,
          token,
          moduloId: firstMod?.id || assignment?.modulo_id || null,
          titolo: titoloQuestionario || firstMod?.titolo || '',
          codiceModulo: firstMod?.codice_modulo || '',
          submittedAt: nowIso,
          risposteCount: answeredCount,
        }),
      }).catch(() => {});

      setSubmitted(true);
    } catch (err: any) {
      alert("Errore durante l'invio: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-300 p-10 font-mono text-xs">
        Caricamento...
      </main>
    );
  }

  if (errorMsg) {
    return (
      <main className="min-h-screen bg-gray-950 text-red-300 p-10 font-mono text-sm">
        {errorMsg}
      </main>
    );
  }

  let questionCounter = 0;
  let lastRenderedModuloId: string | null = null;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-4">
        {titoloQuestionario && (
          <div className="space-y-2 pb-3 border-b border-gray-800">
            <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-white">
              {titoloQuestionario}
            </h1>
            {descrizioneQuestionario && (
              <p className="text-xs text-gray-400 whitespace-pre-line">
                {descrizioneQuestionario}
              </p>
            )}
          </div>
        )}

        {submitted && (
          <div className="bg-emerald-950/60 border border-emerald-700 p-4 text-xs text-emerald-200 font-medium">
            Risposte inviate correttamente.
          </div>
        )}

        {domande.map((d) => {
          const modObj = moduli.find((m) => m.id === d.modulo_id);
          const showModuleBanner =
            mode === 'bundle' && moduli.length > 1 && d.modulo_id !== lastRenderedModuloId;
          if (d.modulo_id) lastRenderedModuloId = d.modulo_id;

          if (d.tipo_risposta === 'section_header') {
            return (
              <React.Fragment key={d.id}>
                {showModuleBanner && modObj && (
                  <div className="bg-[#0F172A] border border-gray-700 px-5 py-2.5 mt-6">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                      {modObj.codice_modulo || 'Modulo'}
                    </span>
                    <span className="text-xs font-extrabold uppercase text-white">
                      {modObj.titolo}
                    </span>
                  </div>
                )}
                <div className="bg-[#111827] border-l-4 border-l-[#FF5500] border border-gray-800 px-5 py-3.5 mt-4">
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    {d.testo_domanda}
                  </h2>
                </div>
              </React.Fragment>
            );
          }

          questionCounter += 1;
          const val = risposte[d.id] ?? '';
          const min = Number(d.rating_min ?? 1) || 1;
          const max = Number(d.rating_max ?? 5) || 5;
          const scaleValues = Array.from({ length: max - min + 1 }, (_, i) => min + i);
          const choices = parseOpzioni(d.opzioni ?? d.scelte ?? d.options ?? '');
          const selectedChoices = getSelectedChoices(val);

          return (
            <React.Fragment key={d.id}>
              {showModuleBanner && modObj && (
                <div className="bg-[#0F172A] border border-gray-700 px-5 py-2.5 mt-6">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 block">
                    {modObj.codice_modulo || 'Modulo'}
                  </span>
                  <span className="text-xs font-extrabold uppercase text-white">
                    {modObj.titolo}
                  </span>
                </div>
              )}
              <div className="bg-[#0B132B] border border-gray-800 p-5 space-y-3">
                <div className="text-xs font-bold text-white">
                  <span className="text-[#FF5500] font-mono mr-2">#{questionCounter}</span>
                  {d.testo_domanda}
                </div>

                {d.tipo_risposta === 'rating_1_5' && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {scaleValues.map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => handleAnswerChange(d.id, num)}
                          className={`px-4 py-2 text-xs font-mono font-bold border cursor-pointer transition ${
                            Number(val) === num
                              ? 'bg-[#FF5500] border-[#FF5500] text-white'
                              : 'bg-gray-950 border-gray-700 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                    {(d.rating_label_min || d.rating_label_max) && (
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{d.rating_label_min || ''}</span>
                        <span>{d.rating_label_max || ''}</span>
                      </div>
                    )}
                  </div>
                )}

                {d.tipo_risposta === 'boolean' && (
                  <div className="flex gap-3">
                    {['Sì', 'No'].map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleAnswerChange(d.id, opt)}
                        className={`px-5 py-2 text-xs font-bold border cursor-pointer transition ${
                          val === opt
                            ? 'bg-[#FF5500] border-[#FF5500] text-white'
                            : 'bg-gray-950 border-gray-700 text-gray-300 hover:border-gray-500'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {d.tipo_risposta === 'choice' && (
                  <div className="space-y-2">
                    {choices.length > 0 ? (
                      choices.map((opt) => {
                        const checked = selectedChoices.includes(opt);
                        return (
                          <label
                            key={opt}
                            className={`flex items-center gap-2.5 border px-3.5 py-2.5 text-xs cursor-pointer transition ${
                              checked
                                ? 'bg-orange-950/30 border-[#FF5500] text-white'
                                : 'bg-gray-950 border-gray-800 text-gray-200 hover:border-gray-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleToggleChoice(d.id, opt)}
                              className="accent-[#FF5500]"
                            />
                            <span>{opt}</span>
                          </label>
                        );
                      })
                    ) : (
                      <input
                        type="text"
                        placeholder="Inserisci la tua risposta..."
                        value={typeof val === 'string' ? val : selectedChoices.join(', ')}
                        onChange={(e) => handleAnswerChange(d.id, e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5500]"
                      />
                    )}
                  </div>
                )}

                {(!d.tipo_risposta || d.tipo_risposta === 'text') && (
                  <textarea
                    rows={3}
                    placeholder="Scrivi qui la tua risposta..."
                    value={typeof val === 'string' ? val : ''}
                    onChange={(e) => handleAnswerChange(d.id, e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#FF5500]"
                  />
                )}
              </div>
            </React.Fragment>
          );
        })}

        <div className="flex justify-end pt-4 border-t border-gray-800">
          <button
            type="button"
            disabled={saving}
            onClick={handleSubmit}
            className="px-6 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold uppercase tracking-wider cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Invio in corso...' : 'Invia'}
          </button>
        </div>
      </div>
    </main>
  );
}
