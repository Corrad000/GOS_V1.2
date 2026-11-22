'use client';

import React, { useState, useEffect, useMemo } from 'react';

export type ReportTabKey =
  | 'strategia_advisory'
  | 'financial_input'
  | 'key_metrics'
  | 'profit_and_loss'
  | 'cash_flow'
  | 'stato_patrimoniale'
  | 'debt_plan'
  | 'tasks'
  | 'kronos'
  | 'ruoli'
  | 'cruscotto';

export interface ReportTabOption {
  key: ReportTabKey;
  label: string;
  group: 'Core Finanziario' | 'Analisi & Input' | 'Operativo & Governance';
  description: string;
  defaultIncluded: boolean;
}

export const REPORT_TAB_OPTIONS: ReportTabOption[] = [
  {
    key: 'key_metrics',
    label: 'Key Performance Indicators',
    group: 'Core Finanziario',
    description: 'EBIT, EBITDA Margine, ROI, ROE, WACC e IRR',
    defaultIncluded: true,
  },
  {
    key: 'stato_patrimoniale',
    label: 'Stato Patrimoniale',
    group: 'Core Finanziario',
    description: 'Attivo immobilizzato/circolante, patrimonio netto e passività',
    defaultIncluded: true,
  },
  {
    key: 'profit_and_loss',
    label: 'Profit & Loss (P&L)',
    group: 'Core Finanziario',
    description: 'Conto economico pluriennale a 5 anni (ricavi, costi, EBITDA, utile)',
    defaultIncluded: true,
  },
  {
    key: 'cash_flow',
    label: 'Cash Flow',
    group: 'Core Finanziario',
    description: 'Flussi operativi, investimento, finanziamento e saldo cassa',
    defaultIncluded: true,
  },
  {
    key: 'debt_plan',
    label: 'Debt Plan',
    group: 'Core Finanziario',
    description: 'Piano di ammortamento finanziamenti ed esposizioni',
    defaultIncluded: true,
  },
  {
    key: 'strategia_advisory',
    label: 'Strategia & Advisory',
    group: 'Analisi & Input',
    description: 'Direttive strategiche, posizionamento e note di advisory',
    defaultIncluded: false,
  },
  {
    key: 'financial_input',
    label: 'Financial Input',
    group: 'Analisi & Input',
    description: 'Driver, assunzioni e parametri di input del modello',
    defaultIncluded: false,
  },
  {
    key: 'tasks',
    label: 'Tasks',
    group: 'Operativo & Governance',
    description: 'Attività operative, milestone e avanzamento esecutivo',
    defaultIncluded: false,
  },
  {
    key: 'kronos',
    label: 'Kronos',
    group: 'Operativo & Governance',
    description: 'Cronoprogramma temporale e scadenze di progetto',
    defaultIncluded: false,
  },
  {
    key: 'ruoli',
    label: 'Ruoli',
    group: 'Operativo & Governance',
    description: 'Perimetro ruoli, responsabilità e governance',
    defaultIncluded: false,
  },
  {
    key: 'cruscotto',
    label: 'Cruscotto',
    group: 'Operativo & Governance',
    description: 'Sintesi visuale e indicatori del cruscotto di progetto',
    defaultIncluded: false,
  },
];

interface ReportTabSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedTabs: ReportTabKey[]) => void;
  defaultSelected?: ReportTabKey[];
  isGenerating?: boolean;
}

const GROUPS: ReportTabOption['group'][] = [
  'Core Finanziario',
  'Analisi & Input',
  'Operativo & Governance',
];

export function ReportTabSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  defaultSelected,
  isGenerating = false,
}: ReportTabSelectorModalProps) {
  const initialSelection = useMemo(() => {
    if (defaultSelected && defaultSelected.length > 0) {
      return defaultSelected;
    }
    return REPORT_TAB_OPTIONS.filter((t) => t.defaultIncluded).map((t) => t.key);
  }, [defaultSelected]);

  const [selected, setSelected] = useState<ReportTabKey[]>(initialSelection);

  useEffect(() => {
    if (isOpen) {
      setSelected(initialSelection);
    }
  }, [isOpen, initialSelection]);

  if (!isOpen) return null;

  const toggleTab = (key: ReportTabKey) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const applyPreset = (preset: 'core' | 'all' | 'sintesi') => {
    if (preset === 'all') {
      setSelected(REPORT_TAB_OPTIONS.map((t) => t.key));
      return;
    }
    if (preset === 'sintesi') {
      setSelected(['key_metrics', 'profit_and_loss', 'cash_flow']);
      return;
    }
    setSelected(
      REPORT_TAB_OPTIONS.filter((t) => t.defaultIncluded).map((t) => t.key)
    );
  };

  const handleSubmit = () => {
    if (selected.length === 0 || isGenerating) return;
    onConfirm(selected);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-tab-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#1B2540] bg-[#0B132B] text-[#E6EAF2] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#1B2540] px-6 py-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-[#FF5500]">
              ESPORTAZIONE REPORT PDF
            </div>
            <h3
              id="report-tab-modal-title"
              className="mt-0.5 text-base font-extrabold uppercase tracking-wider text-white"
            >
              Seleziona le tab da includere nel report
            </h3>
            <p className="mt-1 text-xs text-[#8A94A8]">
              Scegli quali sezioni del modello includere prima di generare il documento.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isGenerating}
            className="cursor-pointer rounded-lg border border-[#2A3A66] bg-[#111E42] px-2.5 py-1 text-xs font-semibold text-[#B9C3D9] hover:bg-[#1B2540] hover:text-white disabled:opacity-50"
          >
            Chiudi
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1B2540] bg-[#090D16] px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]">
              Preset:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('core')}
              className="cursor-pointer rounded-full border border-[#2A3A66] bg-[#111E42] px-3 py-1 text-xs font-semibold text-[#E6EAF2] hover:border-[#FF5500]"
            >
              Core Finanziario
            </button>
            <button
              type="button"
              onClick={() => applyPreset('sintesi')}
              className="cursor-pointer rounded-full border border-[#2A3A66] bg-[#111E42] px-3 py-1 text-xs font-semibold text-[#E6EAF2] hover:border-[#FF5500]"
            >
              Sintesi (KPI + P&amp;L + CF)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('all')}
              className="cursor-pointer rounded-full border border-[#2A3A66] bg-[#111E42] px-3 py-1 text-xs font-semibold text-[#E6EAF2] hover:border-[#FF5500]"
            >
              Tutte le tab ({REPORT_TAB_OPTIONS.length})
            </button>
          </div>
          <span className="text-xs font-semibold text-white">
            {selected.length} / {REPORT_TAB_OPTIONS.length} selezionate
          </span>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
          {GROUPS.map((group) => {
            const groupItems = REPORT_TAB_OPTIONS.filter((t) => t.group === group);
            return (
              <div key={group} className="space-y-2.5">
                <div className="border-b border-[#151F38] pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]">
                  {group}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {groupItems.map((tab) => {
                    const checked = selected.includes(tab.key);
                    return (
                      <label
                        key={tab.key}
                        className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                          checked
                            ? 'border-[#FF5500]/70 bg-[#111E42]'
                            : 'border-[#1B2540] bg-[#090D16] hover:border-[#2A3A66]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTab(tab.key)}
                          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-[#2A3A66] bg-[#090D16] accent-[#FF5500]"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">{tab.label}</div>
                          <div className="mt-0.5 text-[11px] leading-snug text-[#8A94A8]">
                            {tab.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[#1B2540] bg-[#090D16] px-6 py-4">
          <span className="text-xs text-[#8A94A8]">
            {selected.length === 0
              ? 'Seleziona almeno una tab per procedere.'
              : 'Le tab non selezionate verranno escluse dal PDF.'}
          </span>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isGenerating}
              className="cursor-pointer rounded-lg border border-[#2A3A66] bg-[#111E42] px-4 py-2 text-xs font-semibold text-[#E6EAF2] hover:bg-[#1B2540] disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selected.length === 0 || isGenerating}
              className="cursor-pointer rounded-lg bg-[#FF5500] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#FF7A3D] disabled:opacity-50"
            >
              {isGenerating
                ? 'Generazione...'
                : `Genera Report (${selected.length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
