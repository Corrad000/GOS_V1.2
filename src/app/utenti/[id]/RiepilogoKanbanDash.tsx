"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/services/supabase/client";
import {
  CardTrattativa,
  type StatoAzione,
  type TipoAzioneRapida,
  type TrattativaCard,
} from "@/modules/offer-builder/card-trattativa";

export type Fase = "lead" | "qualifica" | "proposta" | "negoziazione" | "chiusura";
export type Voce = TrattativaCard & {
  fase: Fase;
  statoTrattativa?: string;
  fermaOltre14Gg?: boolean;
  dataCreazione?: string;
};

type FiltroStatoKey = StatoAzione | "tutte" | "ferme_14";

const PESO_FASE: Record<Fase, number> = {
  lead: 0.1,
  qualifica: 0.25,
  proposta: 0.4,
  negoziazione: 0.65,
  chiusura: 1,
};

const FASI: { id: Fase; nome: string; colore: string }[] = [
  { id: "lead", nome: "Lead", colore: "border-sky-500/70 bg-sky-950/60 text-sky-200 hover:border-sky-400" },
  {
    id: "qualifica",
    nome: "Qualifica",
    colore: "border-indigo-500/70 bg-indigo-950/60 text-indigo-200 hover:border-indigo-400",
  },
  {
    id: "proposta",
    nome: "Proposta",
    colore: "border-amber-500/70 bg-amber-950/60 text-amber-200 hover:border-amber-400",
  },
  {
    id: "negoziazione",
    nome: "Negoziazione",
    colore: "border-teal-500/70 bg-teal-950/60 text-teal-200 hover:border-teal-400",
  },
  {
    id: "chiusura",
    nome: "Chiusura",
    colore: "border-emerald-500/70 bg-emerald-950/60 text-emerald-200 hover:border-emerald-400",
  },
];

const FILTRI: { id: FiltroStatoKey; nome: string; inattivoClasse: string }[] = [
  {
    id: "tutte",
    nome: "Tutte",
    inattivoClasse: "border-slate-700 bg-slate-900 text-slate-200 hover:border-slate-500",
  },
  {
    id: "scaduta",
    nome: "Scadute",
    inattivoClasse: "border-rose-700/80 bg-rose-950/50 text-rose-200 hover:border-rose-500",
  },
  {
    id: "oggi",
    nome: "Oggi",
    inattivoClasse: "border-emerald-700/80 bg-emerald-950/50 text-emerald-200 hover:border-emerald-500",
  },
  {
    id: "programmata",
    nome: "Programmate",
    inattivoClasse: "border-sky-700/80 bg-sky-950/50 text-sky-200 hover:border-sky-500",
  },
  {
    id: "senza_azione",
    nome: "Senza azione",
    inattivoClasse: "border-amber-700/80 bg-amber-950/50 text-amber-200 hover:border-amber-500",
  },
  {
    id: "ferme_14",
    nome: "Ferme > 14 gg",
    inattivoClasse: "border-purple-700/80 bg-purple-950/50 text-purple-200 hover:border-purple-500",
  },
];

function normalizzaFase(raw?: string): Fase {
  const v = String(raw || "").toLowerCase().trim();
  if (v.includes("qualif")) return "qualifica";
  if (v.includes("propost")) return "proposta";
  if (v.includes("negoz")) return "negoziazione";
  if (v.includes("chius")) return "chiusura";
  return "lead";
}

function isFermaOltre14Giorni(ultimaModifica?: string, nowMs = Date.now()): boolean {
  if (!ultimaModifica) return false;
  const t = new Date(ultimaModifica).getTime();
  if (Number.isNaN(t)) return false;
  const soglia14GgMs = 14 * 24 * 60 * 60 * 1000;
  return nowMs - t > soglia14GgMs;
}

function calcolaStatoAzione(row: any, now = new Date()): StatoAzione {
  const raw = String(row?.stato_azione || "").toLowerCase().trim();
  if (raw === "scaduta" || raw === "oggi" || raw === "programmata" || raw === "senza_azione") {
    return raw;
  }

  const dataProg = row?.azione_programmata_data ? new Date(row.azione_programmata_data) : null;
  if (dataProg && !Number.isNaN(dataProg.getTime())) {
    const stessoGiorno =
      dataProg.getFullYear() === now.getFullYear() &&
      dataProg.getMonth() === now.getMonth() &&
      dataProg.getDate() === now.getDate();
    if (stessoGiorno) return "oggi";
    if (dataProg.getTime() < now.getTime()) return "scaduta";
    return "programmata";
  }

  const haAzione =
    Boolean(row?.azione_necessaria) &&
    String(row.azione_necessaria).trim().toLowerCase() !== "nessuna azione da fare";

  return haAzione ? "programmata" : "senza_azione";
}

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export interface RiepilogoKanbanDashProps {
  dati?: Voce[];
  userId?: string;
  advisorName?: string;
  onlyOwnDeals?: boolean;
  onSelectTrattativa?: (id: string) => void;
}

export function RiepilogoKanbanDash({
  dati,
  userId,
  advisorName,
  onlyOwnDeals = false,
  onSelectTrattativa,
}: RiepilogoKanbanDashProps) {
  const router = useRouter();
  const [vociCaricate, setVociCaricate] = useState<Voce[]>(dati ?? []);
  const [loading, setLoading] = useState<boolean>(!dati);
  const [filtro, setFiltro] = useState<FiltroStatoKey>("tutte");
  const [statoFiltro, setStatoFiltro] = useState<"attive" | "tutte" | "chiuse">("attive");
  const [periodoFiltro, setPeriodoFiltro] = useState<"mese" | "trimestre" | "tutto">("mese");

  useEffect(() => {
    if (dati) {
      setVociCaricate(dati);
      setLoading(false);
      return;
    }

    let active = true;

    async function fetchTrattative() {
      setLoading(true);
      try {
        const [{ data: trattativeRows, error: errTratt }, { data: aziendeRows }] =
          await Promise.all([
            supabase.from("gos_trattative").select("*").order("created_at", { ascending: false }),
            supabase.from("gos_aziende").select("id, ragione_sociale, codice_azienda"),
          ]);

        if (!active) return;

        if (errTratt) {
          console.error("Errore caricamento gos_trattative:", errTratt);
          setVociCaricate([]);
          return;
        }

        const aziendeMap = new Map<string, string>();
        (aziendeRows || []).forEach((az: any) => {
          if (az?.id) aziendeMap.set(String(az.id), az.ragione_sociale || "Azienda");
          if (az?.codice_azienda) {
            aziendeMap.set(String(az.codice_azienda), az.ragione_sociale || "Azienda");
          }
        });

        const now = new Date();
        const nowMs = now.getTime();

        let mapped: Voce[] = (trattativeRows || []).map((row: any) => {
          const azId = String(row.azienda_id || row.company_id || row.company_code || "");
          const ultimaMod = row.ultima_modifica || row.created_at || now.toISOString();
          const statoTratt = String(row.stato_trattativa || "attiva").toLowerCase();
          return {
            id: String(row.id),
            nome: row.titolo || row.nome || "Trattativa",
            fase: normalizzaFase(row.fase),
            statoTrattativa: statoTratt,
            dataCreazione: row.created_at || ultimaMod,
            fermaOltre14Gg: isFermaOltre14Giorni(ultimaMod, nowMs),
            azienda: {
              id: azId,
              nome: aziendeMap.get(azId) || row.azienda_nome || "Azienda",
            },
            codiceOfferta: row.codice_offerta || undefined,
            valore: Number(row.valore || 0),
            azioneNecessaria: row.azione_necessaria || "Definire prossimo passo",
            azioneProgrammata:
              row.azione_programmata_titolo && row.azione_programmata_data
                ? {
                    titolo: row.azione_programmata_titolo,
                    data: row.azione_programmata_data,
                  }
                : null,
            statoAzione: calcolaStatoAzione(row, now),
            scadenzaOriginale: row.scadenza_originale || undefined,
            ultimaModifica: ultimaMod,
          };
        });

        if (onlyOwnDeals && advisorName) {
          const targetAdv = advisorName.trim().toLowerCase();
          mapped = mapped.filter(
            (m: any) => String(m.advisor_nome || "").trim().toLowerCase() === targetAdv
          );
        }

        setVociCaricate(mapped);
      } catch (err) {
        console.error("Eccezione caricamento trattative riepilogo:", err);
        if (active) setVociCaricate([]);
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchTrattative();
    return () => {
      active = false;
    };
  }, [dati, userId, advisorName, onlyOwnDeals]);

  const vociPeriodo = useMemo(() => {
    const now = new Date();
    return vociCaricate.filter((v) => {
      if (periodoFiltro === "tutto") return true;
      const d = new Date(v.dataCreazione || v.ultimaModifica || now.toISOString());
      if (Number.isNaN(d.getTime())) return true;
      if (periodoFiltro === "mese") {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }
      const novantaGiorniMs = 90 * 24 * 60 * 60 * 1000;
      return now.getTime() - d.getTime() <= novantaGiorniMs;
    });
  }, [vociCaricate, periodoFiltro]);

  const kpi = useMemo(() => {
    const attive = vociPeriodo.filter(
      (v) => v.fase !== "chiusura" && v.statoTrattativa !== "vinta" && v.statoTrattativa !== "persa"
    );
    const vintePeriodo = vociPeriodo
      .filter((v) => v.statoTrattativa === "vinta" || v.fase === "chiusura")
      .reduce((s, v) => s + v.valore, 0);

    return {
      valoreAttivo: attive.reduce((s, v) => s + v.valore, 0),
      ponderato: attive.reduce((s, v) => s + v.valore * PESO_FASE[v.fase], 0),
      vintePeriodo,
      ferme14: attive.filter((v) => v.fermaOltre14Gg).length,
      senzaAzione: vociPeriodo.filter((v) => v.statoAzione === "senza_azione").length,
    };
  }, [vociPeriodo]);

  const baseStato = useMemo(() => {
    return vociPeriodo.filter((v) => {
      const chiusa =
        v.fase === "chiusura" || v.statoTrattativa === "vinta" || v.statoTrattativa === "persa";
      if (statoFiltro === "attive") return !chiusa;
      if (statoFiltro === "chiuse") return chiusa;
      return true;
    });
  }, [vociPeriodo, statoFiltro]);

  const visibili = useMemo(() => {
    return baseStato.filter((v) => {
      if (filtro === "tutte") return true;
      if (filtro === "ferme_14") return Boolean(v.fermaOltre14Gg);
      return v.statoAzione === filtro;
    });
  }, [baseStato, filtro]);

  const handleApriTrattativa = (id: string) => {
    if (onSelectTrattativa) {
      onSelectTrattativa(id);
      return;
    }
    const voce = vociCaricate.find((x) => x.id === id);
    if (voce?.azienda.id) {
      router.push(
        `/aziende/${voce.azienda.id}?tab=trattative&trattativa=${encodeURIComponent(id)}`
      );
    }
  };

  const handleApriCliente = (aziendaId: string) => {
    if (aziendaId) {
      router.push(`/aziende/${aziendaId}`);
    }
  };

  const handleAzione = async (id: string, tipo: TipoAzioneRapida) => {
    const target = vociCaricate.find((x) => x.id === id);
    if (!target) return;

    const now = new Date();
    const nowIso = now.toISOString();

    if (tipo === "fatto") {
      setVociCaricate((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                azioneNecessaria: "Nessuna azione da fare",
                azioneProgrammata: null,
                statoAzione: "senza_azione",
                fermaOltre14Gg: false,
                ultimaModifica: nowIso,
              }
            : item
        )
      );
      await supabase
        .from("gos_trattative")
        .update({ azione_necessaria: "Nessuna azione da fare", ultima_modifica: nowIso })
        .eq("id", id);
      return;
    }

    if (tipo === "rinvia") {
      const baseDate = target.azioneProgrammata?.data
        ? new Date(target.azioneProgrammata.data)
        : now;
      const nuovaData = new Date(
        (Number.isNaN(baseDate.getTime()) ? now.getTime() : baseDate.getTime()) +
          3 * 24 * 60 * 60 * 1000
      ).toISOString();

      setVociCaricate((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                scadenzaOriginale:
                  item.scadenzaOriginale ||
                  item.azioneProgrammata?.data ||
                  item.ultimaModifica,
                azioneProgrammata: {
                  titolo: item.azioneProgrammata?.titolo || item.azioneNecessaria || "Follow-up",
                  data: nuovaData,
                },
                statoAzione: "programmata",
                fermaOltre14Gg: false,
                ultimaModifica: nowIso,
              }
            : item
        )
      );
      await supabase
        .from("gos_trattative")
        .update({ ultima_modifica: nowIso })
        .eq("id", id);
      return;
    }

    if (tipo === "programma") {
      const domani = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      setVociCaricate((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                azioneNecessaria: "Follow-up commerciale",
                azioneProgrammata: {
                  titolo: "Follow-up commerciale",
                  data: domani,
                },
                statoAzione: "programmata",
                fermaOltre14Gg: false,
                ultimaModifica: nowIso,
              }
            : item
        )
      );
      await supabase
        .from("gos_trattative")
        .update({ azione_necessaria: "Follow-up commerciale", ultima_modifica: nowIso })
        .eq("id", id);
    }
  };

  return (
    <main className="mx-auto max-w-6xl rounded-none border border-gray-800 bg-[#0B132B] text-gray-100 shadow-xl overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 px-4 py-3 bg-gray-950/70">
        <h1 className="text-base font-bold text-white">Trattative</h1>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            aria-label="Periodo"
            value={periodoFiltro}
            onChange={(e) => setPeriodoFiltro(e.target.value as "mese" | "trimestre" | "tutto")}
            className="rounded-none border border-sky-700 bg-sky-950/60 px-3 py-1 text-xs text-sky-100 focus:outline-none focus:border-[#FF5500]"
          >
            <option value="mese">Periodo: questo mese</option>
            <option value="trimestre">Periodo: ultimi 90 gg</option>
            <option value="tutto">Periodo: tutto</option>
          </select>

          <span className="rounded-none border border-indigo-700 bg-indigo-950/60 px-3 py-1 text-indigo-100">
            Venditore: {advisorName || "io"}
          </span>

          <select
            aria-label="Stato trattative"
            value={statoFiltro}
            onChange={(e) => setStatoFiltro(e.target.value as "attive" | "tutte" | "chiuse")}
            className="rounded-none border border-teal-700 bg-teal-950/60 px-3 py-1 text-xs text-teal-100 focus:outline-none focus:border-[#FF5500]"
          >
            <option value="attive">Stato: attive</option>
            <option value="tutte">Stato: tutte</option>
            <option value="chiuse">Stato: chiuse</option>
          </select>
        </div>
      </header>

      <dl className="grid grid-cols-2 border-b border-gray-800 md:grid-cols-5">
        <Kpi etichetta="Valore attivo" valore={eur.format(kpi.valoreAttivo)} />
        <Kpi etichetta="Ponderato" valore={eur.format(kpi.ponderato)} />
        <Kpi etichetta="Vinte nel periodo" valore={eur.format(kpi.vintePeriodo)} />
        <Kpi
          etichetta="Ferme da più di 14 gg"
          valore={String(kpi.ferme14)}
          allerta={kpi.ferme14 > 0}
          onClick={() => setFiltro("ferme_14")}
        />
        <Kpi
          etichetta="Senza azione"
          valore={String(kpi.senzaAzione)}
          allerta={kpi.senzaAzione > 0}
          onClick={() => setFiltro("senza_azione")}
        />
      </dl>

      <nav
        aria-label="Sezioni pipeline"
        className="sticky top-0 z-10 flex flex-wrap gap-1.5 border-b border-gray-800 bg-[#0B132B]/95 backdrop-blur px-4 py-2"
      >
        {FASI.map((f) => {
          const inFase = visibili.filter((v) => v.fase === f.id);
          const scaduteInFase = inFase.filter((v) => v.statoAzione === "scaduta").length;
          const isHot = scaduteInFase > 0;
          return (
            <a
              key={f.id}
              href={`#${f.id}`}
              className={`rounded-none border px-3 py-0.5 text-xs transition ${
                isHot
                  ? "border-rose-500 bg-rose-950 text-rose-200 hover:border-rose-400"
                  : f.colore
              }`}
            >
              {f.nome}{" "}
              <span className="font-semibold font-mono">
                {inFase.length}
                {isHot ? ` · ${scaduteInFase} scaduta` : ""}
              </span>
            </a>
          );
        })}
      </nav>

      <div
        className="flex flex-wrap gap-1.5 border-b border-gray-800 px-4 py-2"
        role="group"
        aria-label="Filtra per stato azione"
      >
        {FILTRI.map((f) => {
          const attiva = filtro === f.id;
          return (
            <button
              key={f.id}
              type="button"
              aria-pressed={attiva}
              onClick={() => setFiltro(f.id)}
              className={`rounded-none border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                attiva
                  ? "border-orange-300 bg-[#FF5500] text-white"
                  : f.inattivoClasse
              }`}
            >
              {f.nome}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-gray-400">
          Caricamento trattative in corso...
        </div>
      ) : (
        <div className="divide-y divide-gray-800/90">
          {FASI.map((f) => {
            const voci = visibili.filter((v) => v.fase === f.id);

            return (
              <section key={f.id} id={f.id} className="scroll-mt-16 px-4 py-4">
                <h2 className="mb-3 text-sm font-bold text-white">{f.nome}</h2>
                {voci.length === 0 ? (
                  <p className="text-xs text-gray-500">Nessuna trattativa in questa fase.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {voci.map((v) => (
                      <CardTrattativa
                        key={v.id}
                        trattativa={v}
                        onApriTrattativa={handleApriTrattativa}
                        onApriCliente={handleApriCliente}
                        onAzione={handleAzione}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function Kpi({
  etichetta,
  valore,
  allerta,
  onClick,
}: {
  etichetta: string;
  valore: string;
  allerta?: boolean;
  onClick?: () => void;
}) {
  const contenuto = (
    <>
      <dt className="text-[11px] text-gray-400">{etichetta}</dt>
      <dd
        className={`text-base font-extrabold font-mono tabular-nums ${
          allerta ? "text-rose-400" : "text-white"
        }`}
      >
        {valore}
      </dd>
    </>
  );
  return (
    <div className="border-b border-r border-gray-800 px-4 py-2.5 last:border-r-0 md:border-b-0">
      {onClick ? (
        <button type="button" onClick={onClick} className="w-full text-left cursor-pointer">
          {contenuto}
        </button>
      ) : (
        contenuto
      )}
    </div>
  );
}

export default RiepilogoKanbanDash;
