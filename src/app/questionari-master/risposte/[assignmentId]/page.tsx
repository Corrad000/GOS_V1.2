'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export default function RisposteQuestionarioPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = String(params?.assignmentId || '').trim();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [assignment, setAssignment] = useState<any>(null);
  const [modulo, setModulo] = useState<any>(null);
  const [domande, setDomande] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!assignmentId) {
        setErrorMsg('ID compilazione non valido.');
        setLoading(false);
        return;
      }

      try {
        const { data: ass, error: assErr } = await supabase
          .from('gos_questionari_assegnati')
          .select('*')
          .eq('id', assignmentId)
          .single();

        if (assErr || !ass) {
          setErrorMsg('Compilazione questionario non trovata.');
          setLoading(false);
          return;
        }

        setAssignment(ass);

        const [{ data: mod }, { data: doms }] = await Promise.all([
          supabase.from('gos_moduli').select('*').eq('id', ass.modulo_id).single(),
          supabase
            .from('gos_domande')
            .select('*')
            .eq('modulo_id', ass.modulo_id)
            .order('ordine', { ascending: true }),
        ]);

        setModulo(mod || null);
        setDomande(doms || []);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Errore di caricamento');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [assignmentId, supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 text-gray-300 p-10 font-mono text-xs">
        Caricamento risposte...
      </main>
    );
  }

  if (errorMsg || !assignment) {
    return (
      <main className="min-h-screen bg-gray-950 text-red-300 p-10 font-mono text-sm">
        {errorMsg || 'Nessun dato disponibile'}
      </main>
    );
  }

  const risposteMap: Record<string, any> = assignment.risposte || {};
  let questionIndex = 0;

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 print:bg-white print:text-black print:p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-4 print:hidden">
          <button
            type="button"
            onClick={() => router.push(`/questionari-master?id=${assignment.modulo_id}`)}
            className="px-4 py-2 bg-[#0B132B] hover:bg-gray-800 border border-gray-700 text-xs font-bold text-white cursor-pointer"
          >
            ← Torna al Questionario Master
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-xs font-bold text-white uppercase tracking-wider cursor-pointer"
          >
            Emetti PDF
          </button>
        </div>

        <section className="bg-[#0B132B] border border-gray-800 p-6 space-y-3 print:bg-white print:border-gray-300 print:text-black">
          <div className="text-[10px] font-mono font-bold uppercase text-[#FF5500]">
            REPORT RISPOSTE QUESTIONARIO • STATO: {assignment.stato || 'Inviato'}
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white print:text-black">
            {modulo?.titolo || 'Questionario'}
          </h1>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 text-xs font-mono text-gray-300 print:text-gray-700">
            <div>
              <span className="text-gray-500 block text-[10px]">CODICE MODULO</span>
              {modulo?.codice_modulo || 'N/D'}
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">ID COMPILAZIONE</span>
              {assignment.id}
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">TOKEN</span>
              {assignment.token}
            </div>
            <div>
              <span className="text-gray-500 block text-[10px]">DATA INVIO</span>
              {assignment.submitted_at
                ? new Date(assignment.submitted_at).toLocaleString('it-IT')
                : 'Non ancora inviato'}
            </div>
          </div>
        </section>

        <section className="space-y-3">
          {domande.map((d) => {
            if (d.tipo_risposta === 'section_header') {
              return (
                <div
                  key={d.id}
                  className="bg-[#111827] border-l-4 border-l-[#FF5500] border border-gray-800 px-5 py-3 mt-5 print:bg-gray-100 print:border-gray-300 print:text-black"
                >
                  <h2 className="text-xs font-black uppercase tracking-wider text-white print:text-black">
                    {d.testo_domanda}
                  </h2>
                </div>
              );
            }

            questionIndex += 1;
            const rawVal = risposteMap[d.id];
            const hasAnswer =
              rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';
            const displayAnswer = hasAnswer ? String(rawVal) : 'Nessuna risposta fornita';

            return (
              <div
                key={d.id}
                className="bg-[#0B132B] border border-gray-800 p-4 space-y-2 print:bg-white print:border-gray-300 print:text-black"
              >
                <div className="text-xs font-bold text-white print:text-black">
                  <span className="text-[#FF5500] font-mono mr-2">#{questionIndex}</span>
                  {d.testo_domanda}
                </div>
                <div
                  className={`p-3 text-xs border ${
                    hasAnswer
                      ? 'bg-gray-950 border-gray-700 text-emerald-300 font-semibold print:bg-gray-50 print:border-gray-300 print:text-black'
                      : 'bg-gray-950/50 border-gray-800 text-gray-500 italic'
                  }`}
                >
                  {displayAnswer}
                </div>
              </div>
            );
          })}
        </section>
      </div>
    </main>
  );
}
