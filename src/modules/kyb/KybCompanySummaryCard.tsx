'use client';

import React, { useEffect, useState } from 'react';
import {
  GosKybSubmission,
  buildKybClientLink,
  listKybSubmissions,
} from '@/modules/kyb/kybService';
import { printKybSubmissionPdf } from '@/services/pdf/kybPdfExport';

interface KybCompanySummaryCardProps {
  companyCode: string;
  aziendaId?: string | null;
}

export const KybCompanySummaryCard: React.FC<KybCompanySummaryCardProps> = ({
  companyCode,
  aziendaId,
}) => {
  const [items, setItems] = useState<GosKybSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listKybSubmissions(companyCode, aziendaId)
      .then((rows) => {
        if (active) setItems(rows);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [companyCode, aziendaId]);

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-xs text-gray-400">
        Caricamento stato pratiche KYB...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-4 text-xs text-gray-400">
        Nessuna pratica KYB registrata per questa azienda.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/80 p-4 text-gray-100">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
          Pratiche KYB Compilate / Registrate ({items.length})
        </h3>
        <span className="font-mono text-[11px] text-gray-400">{companyCode}</span>
      </div>

      <div className="space-y-2">
        {items.map((sub) => {
          const isSubmitted = sub.stato === 'Inviato' || Boolean(sub.submitted_at);
          const refNome =
            sub.anagrafica_dati?.referente_nome ||
            sub.societa_ubo_dati?.legale_rappresentante ||
            '-';
          const refEmail = sub.anagrafica_dati?.referente_email || '-';
          const dataRiferimento = sub.submitted_at || sub.updated_at || sub.created_at;

          return (
            <div
              key={sub.id}
              className="flex flex-col gap-2 rounded-lg border border-gray-800 bg-gray-950/80 p-3 text-xs md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase ${
                      isSubmitted
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {sub.stato || 'Bozza'}
                  </span>
                  <span className="font-mono text-[11px] text-gray-400">
                    Token: {sub.token}
                  </span>
                </div>
                <div className="text-gray-300">
                  <strong>Referente:</strong> {refNome} ({refEmail})
                </div>
                <div className="text-[11px] text-gray-400">
                  Ultimo aggiornamento:{' '}
                  {dataRiferimento ? new Date(dataRiferimento).toLocaleString('it-IT') : '-'}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => printKybSubmissionPdf(sub)}
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-[#FF5500]/60 bg-[#FF5500]/15 px-3 py-1.5 font-mono text-[11px] font-semibold text-orange-200 hover:bg-[#FF5500]/25"
                >
                  Genera PDF
                </button>
                <a
                  href={buildKybClientLink(sub.token)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-700 bg-gray-900 px-3 py-1.5 font-mono text-[11px] font-semibold text-gray-200 hover:border-gray-500"
                >
                  Apri link KYB
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
