"use client";

import type { MouseEvent, ReactNode } from "react";

// Card trattativa: componente riutilizzabile in Pipeline, Dashboard e liste.
// Tre zone di clic: corpo -> scheda trattativa, nome azienda -> scheda cliente,
// pulsanti azione -> completa / rinvia / programma (senza aprire nulla).
// Styling: Tailwind (token colore in tailwind.config, vedi nota in fondo).

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
  codiceOfferta?: string; // es. "OFF-0142 v2", offerta congelata
  valore: number; // totale dei moduli, in euro
  azioneNecessaria: string;
  azioneProgrammata: AzioneProgrammata | null;
  statoAzione: StatoAzione;
  scadenzaOriginale?: string; // ISO, mostrata solo se l'azione è stata rinviata
  ultimaModifica: string; // ISO
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

const etichetta: Record<StatoAzione, { testo: string; classe: string }> = {
  scaduta: { testo: "Scaduta", classe: "border-warn text-warn" },
  oggi: { testo: "Oggi", classe: "border-ok text-ok" },
  programmata: { testo: "Programmata", classe: "border-line text-muted" },
  senza_azione: { testo: "Senza azione", classe: "border-dashed border-warn text-warn" },
};

export function CardTrattativa({
  trattativa: t,
  compatta = false,
  onApriTrattativa,
  onApriCliente,
  onAzione,
}: Props) {
  const stato = etichetta[t.statoAzione];
  const bordo = t.statoAzione === "scaduta" ? "border-warn" : t.statoAzione === "senza_azione" ? "border-dashed" : "border-line";

  return (
    <article
      className={`rounded-lg border bg-paper p-3 ${bordo} focus-within:ring-2 focus-within:ring-accent`}
    >
      <button
        type="button"
        onClick={() => onApriTrattativa(t.id)}
        className="block w-full rounded text-left focus-visible:outline-none"
        aria-label={`Apri trattativa ${t.nome}`}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold text-ink">{t.nome}</span>
          <span className={`shrink-0 rounded border px-1.5 text-[10px] ${stato.classe}`}>
            {stato.testo}
          </span>
        </div>

        <div className="mt-1 flex justify-between text-xs tabular-nums text-ink">
          <span>{eur.format(t.valore)}</span>
          {t.codiceOfferta && <span className="text-muted">{t.codiceOfferta}</span>}
        </div>

        {!compatta && (
          <>
            <p className="mt-2 border-t border-line pt-2 text-sm text-ink">
              {t.statoAzione === "senza_azione" ? (
                <b className="font-semibold text-warn">Senza azione</b>
              ) : (
                t.azioneNecessaria
              )}
            </p>

            <p className="text-xs text-muted">
              {t.azioneProgrammata
                ? `Programmata: ${dataOra.format(new Date(t.azioneProgrammata.data))} · ${t.azioneProgrammata.titolo}`
                : "Nessuna azione programmata"}
            </p>

            {t.scadenzaOriginale && (
              <p className="text-xs text-warn">
                Scadenza originale: {dataOra.format(new Date(t.scadenzaOriginale))}
              </p>
            )}

            <p className="mt-2 text-[10px] text-muted">
              Ultima modifica: {dataOra.format(new Date(t.ultimaModifica))}
            </p>
          </>
        )}
      </button>

      {!compatta && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onApriCliente(t.azienda.id)}
            className="mr-auto text-xs text-muted underline decoration-dotted underline-offset-2 hover:text-ink"
          >
            {t.azienda.nome}
          </button>

          {t.statoAzione === "senza_azione" ? (
            <ActionBtn primary onClick={() => onAzione(t.id, "programma")}>Programma</ActionBtn>
          ) : (
            <>
              <ActionBtn primary onClick={() => onAzione(t.id, "fatto")}>Fatto</ActionBtn>
              <ActionBtn onClick={() => onAzione(t.id, "rinvia")}>Rinvia +3 gg</ActionBtn>
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
      className={`rounded border px-2 py-0.5 text-xs ${
        primary ? "border-accent bg-accent text-paper" : "border-line bg-paper text-ink"
      }`}
    >
      {children}
    </button>
  );
}
