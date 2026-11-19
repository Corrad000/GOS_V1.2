'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export type CompanyStatusModalita =
  | 'LAVORAZIONE'
  | 'DATABASE'
  | 'CHIUSO'
  | 'FOLLOW-UP';

export interface AnagraficaCompanyData {
  id?: string;
  ragione_sociale?: string;
  codice_azienda?: string;
  partita_iva?: string;
  codice_fiscale?: string;
  categoria?: string;
  indirizzo?: string;
  citta?: string;
  nazione?: string;
  sito_web?: string;
  referente?: string;
  email?: string;
  telefono?: string;
  note?: string;
  advisor_nome?: string;
  fatturato?: number;
  contratti_attivi?: number;
  stato?: string;
  modalita?: CompanyStatusModalita | string;
  [key: string]: any;
}

interface AnagraficaViewProps {
  company: AnagraficaCompanyData;
  onEdit?: () => void;
  onCompanyUpdated?: (updatedCompany: AnagraficaCompanyData) => void;
}

function normalizeModalita(val?: string): CompanyStatusModalita {
  const upper = String(val || '').trim().toUpperCase();
  if (upper === 'LAVORAZIONE' || upper === 'IN_LAVORAZIONE' || upper === 'IN LAVORAZIONE') {
    return 'LAVORAZIONE';
  }
  if (upper === 'CHIUSO' || upper === 'CHIUSA') {
    return 'CHIUSO';
  }
  if (upper === 'FOLLOW-UP' || upper === 'FOLLOW UP' || upper === 'FOLLOWUP') {
    return 'FOLLOW-UP';
  }
  return 'DATABASE';
}

export function AnagraficaView({
  company,
  onEdit,
  onCompanyUpdated,
}: AnagraficaViewProps) {
  const [modalita, setModalita] = useState<CompanyStatusModalita>(
    normalizeModalita(company?.modalita)
  );
  const [savingStatus, setSavingStatus] = useState<boolean>(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    setModalita(normalizeModalita(company?.modalita));
  }, [company?.id, company?.modalita]);

  const handleStatusChange = async (nextStatus: CompanyStatusModalita) => {
    const previousStatus = modalita;
    setModalita(nextStatus);

    if (!company?.id) {
      onCompanyUpdated?.({ ...company, modalita: nextStatus });
      return;
    }

    setSavingStatus(true);
    try {
      const { data, error } = await supabase
        .from('gos_aziende')
        .update({ modalita: nextStatus })
        .eq('id', company.id)
        .select('*')
        .maybeSingle();

      if (error) throw error;

      const merged = data ? { ...company, ...data, modalita: nextStatus } : { ...company, modalita: nextStatus };
      onCompanyUpdated?.(merged);
    } catch (err: any) {
      setModalita(previousStatus);
      alert('Errore durante il salvataggio dello status azienda: ' + (err?.message || err));
    } finally {
      setSavingStatus(false);
    }
  };

  // Funzione di utilità per validare l'effettiva presenza di informazioni reali
  const isValid = (val: any) => {
    if (val === undefined || val === null || val === '') return false;
    const str = String(val).trim();
    return str !== '' && str !== 'Non specificata' && str !== 'Non specificato' && str !== 'N/D';
  };

  // Creazione dinamica di tutti i possibili blocchi anagrafici
  const allFields = [
    {
      label: 'Ragione Sociale',
      value: company.ragione_sociale,
      className: 'text-sm font-bold text-white'
    },
    {
      label: 'Codice Azienda / P.IVA',
      value: [company.codice_azienda, isValid(company.partita_iva) ? company.partita_iva : null]
        .filter(Boolean)
        .join(' — '),
      className: 'text-sm font-bold text-[#FF5500] font-mono'
    },
    {
      label: 'Categoria / Settore',
      value: company.categoria,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Codice Fiscale',
      value: isValid(company.codice_fiscale) ? company.codice_fiscale : null,
      className: 'text-sm font-mono text-white'
    },
    {
      label: 'Email di Riferimento',
      value: isValid(company.email) ? company.email : null,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Telefono',
      value: isValid(company.telefono) ? company.telefono : null,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Indirizzo Sede',
      value: [company.indirizzo, company.citta, company.nazione].filter(isValid).join(', '),
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Sito Web',
      value: isValid(company.sito_web) ? company.sito_web : null,
      className: 'text-sm font-semibold text-blue-400 underline'
    },
    {
      label: 'Referente',
      value: isValid(company.referente) ? company.referente : null,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Advisor Assegnato',
      value: company.advisor_nome,
      className: 'text-sm font-semibold text-white'
    },
    {
      label: 'Fatturato Registrato',
      value: company.fatturato ? `€ ${Number(company.fatturato).toLocaleString('it-IT')}` : null,
      className: 'text-sm font-bold text-emerald-400 font-mono'
    },
    {
      label: 'Note / Profilo Aziendale',
      value: isValid(company.note) ? company.note : null,
      className: 'text-xs text-gray-300 whitespace-pre-line md:col-span-2'
    }
  ];

  // Filtra mantenendo unicamente i campi valorizzati e validi
  const activeFields = allFields.filter((field) => isValid(field.value));

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-wider">Scheda Anagrafica Azienda</h3>
          <p className="text-xs text-gray-400 mt-0.5">Informazioni societarie e dati di riferimento</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5">
            <label
              htmlFor="company-status-select"
              className="text-[10px] font-mono font-bold uppercase text-amber-400 whitespace-nowrap"
            >
              Status
            </label>
            <select
              id="company-status-select"
              value={modalita}
              disabled={savingStatus}
              onChange={(e) => handleStatusChange(e.target.value as CompanyStatusModalita)}
              className="bg-gray-900 text-white text-xs font-bold uppercase px-2.5 py-1 rounded-lg border border-gray-700 focus:outline-none focus:border-[#FF5500] cursor-pointer disabled:opacity-60"
            >
              <option value="LAVORAZIONE">LAVORAZIONE</option>
              <option value="DATABASE">DATABASE</option>
              <option value="CHIUSO">CHIUSO</option>
              <option value="FOLLOW-UP">FOLLOW-UP</option>
            </select>
            {savingStatus && (
              <span className="text-[10px] font-mono text-gray-400">Salvataggio...</span>
            )}
          </div>

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-950/50 transition-all cursor-pointer uppercase tracking-wider"
            >
              Modifica Dati
            </button>
          )}
        </div>
      </div>

      {activeFields.length === 0 ? (
        <div className="p-8 text-center text-xs text-gray-500 italic">
          Nessuna informazione anagrafica inserita.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {activeFields.map((field, idx) => (
            <div
              key={idx}
              className={`bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1 ${
                field.label.includes('Note') ? 'md:col-span-2' : ''
              }`}
            >
              <span className="text-gray-500 uppercase font-mono text-[10px]">{field.label}</span>
              <div className={field.className}>{field.value}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
