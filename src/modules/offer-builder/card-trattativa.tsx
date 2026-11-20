"use client";

import type { MouseEvent, ReactNode } from "react";

export type StatoAzione = "scaduta" | "oggi" | "programmata" | "senza_azione";
export type TipoAzioneRapida = "fatto" | "rinvia" | "programma";

export type AzioneProgrammata = {
  titolo: string;
  data: string; // ISO 8601 in UTC, formattato nel fuso dell'utente
};

export type TrattativaCard = {
  id: string;
  nome: string;
  azienda: { id: string; nome: string };
  codiceOfferta?: string;
  valore: number;
  azioneNecessaria: string;
  azioneProgrammata: AzioneProgrammata | null;
  statoAzione: StatoAzione;
  scadenzaOriginale?: string;
  ultimaModifica: string;
};

type Props = {
  trattativa: TrattativaCard;
  compatta?: boolean;
  onApriTrattativa: (id: string) => void;
  onApriCliente: (aziendaId: string) => void;
  onAzione: (id: string, tipo: TipoAzioneRapida) => void;
};

const eur = new Intl.NumberFormat("it-IT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const dataOra = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function formatSicuro(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dataOra.format(d);
}

const etichetta: Record<StatoAzione, { testo: string; classe: string }> = {
  scaduta: {
    testo: "Scaduta",
    classe: "border-rose-500 bg-rose-950 text-rose-200",
  },
  oggi: {
    testo: "Oggi",
    classe: "border-emerald-500 bg-emerald-950 text-emerald-200",
  },
  programmata: {
    testo: "Programmata",
    classe: "border-sky-500 bg-sky-950 text-sky-200",
  },
  senza_azione: {
    testo: "Senza azione",
    classe: "border-dashed border-amber-500 bg-amber-950 text-amber-200",
  },
};

export function CardTrattativa({
  trattativa: t,
  compatta = false,
  onApriTrattativa,
  onApriCliente,
  onAzione,
}: Props) {
  const stato = etichetta[t.statoAzione] ?? etichetta.senza_azione;
  const bordo =
    t.statoAzione === "scaduta"
      ? "border-rose-500 hover:border-rose-400"
      : t.statoAzione === "senza_azione"
        ? "border-dashed border-amber-500 hover:border-amber-400"
        : "border-slate-700 hover:border-slate-500";

  return (
    <article
      className={`rounded-none border bg-gray-900/95 p-3.5 text-gray-100 shadow-sm transition ${bordo} focus-within:ring-2 focus-within:ring-[#FF5500]`}
    >
      <button
        type="button"
        onClick={() => onApriTrattativa(t.id)}
        className="block w-full rounded-none text-left focus-visible:outline-none cursor-pointer"
        aria-label={`Apri trattativa ${t.nome}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold text-white leading-snug">{t.nome}</span>
          <span
            className={`shrink-0 rounded-none border px-1.5 py-0.5 text-[10px] font-bold uppercase ${stato.classe}`}
          >
            {stato.testo}
          </span>
        </div>

        <div className="mt-1.5 flex items-center justify-between text-xs tabular-nums">
          <span className="font-mono font-bold text-white">{eur.format(t.valore)}</span>
          {t.codiceOfferta && (
            <span className="font-mono text-[11px] text-emerald-400">{t.codiceOfferta}</span>
          )}
        </div>

        {!compatta && (
          <>
            <p className="mt-2.5 border-t border-gray-800 pt-2 text-xs text-gray-200">
              {t.statoAzione === "senza_azione" ? (
                <b className="font-semibold text-amber-300">Senza azione</b>
              ) : (
                t.azioneNecessaria
              )}
            </p>

            <p className="mt-1 text-[11px] text-gray-400">
              {t.azioneProgrammata
                ? `Programmata: ${formatSicuro(t.azioneProgrammata.data)} · ${t.azioneProgrammata.titolo}`
                : "Nessuna azione programmata"}
            </p>

            {t.scadenzaOriginale && (
              <p className="mt-1 text-[11px] text-rose-300">
                Scadenza originale: {formatSicuro(t.scadenzaOriginale)}
              </p>
            )}

            <p className="mt-2 text-[10px] font-mono text-gray-500">
              Ultima modifica: {formatSicuro(t.ultimaModifica)}
            </p>
          </>
        )}
      </button>

      {!compatta && (
        <div className="mt-3 pt-2.5 border-t border-gray-800/80 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onApriCliente(t.azienda.id)}
            className="mr-auto text-xs font-medium text-gray-300 underline decoration-dotted underline-offset-2 hover:text-white cursor-pointer truncate max-w-[160px]"
          >
            {t.azienda.nome}
          </button>

          {t.statoAzione === "senza_azione" ? (
            <ActionBtn primary onClick={() => onAzione(t.id, "programma")}>
              Programma
            </ActionBtn>
          ) : (
            <>
              <ActionBtn primary onClick={() => onAzione(t.id, "fatto")}>
                Fatto
              </ActionBtn>
              <ActionBtn onClick={() => onAzione(t.id, "rinvia")}>
                Rinvia +3 gg
              </ActionBtn>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function ActionBtn({
  children,
  onClick,
  primary,
}: {
  children: ReactNode;
  onClick: (e: MouseEvent<HTMLButtonElement>) => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-none border px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
        primary
          ? "border-orange-400 bg-[#FF5500] hover:bg-orange-600 text-white"
          : "border-slate-700 bg-gray-950 hover:bg-gray-800 text-gray-200"
      }`}
    >
      {children}
    </button>
  );
}
