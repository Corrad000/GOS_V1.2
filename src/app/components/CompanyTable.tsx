'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AnagraficaForm from './AnagraficaForm';

export type CompanyStatusModalita =
  | 'LAVORAZIONE'
  | 'FOLLOW-UP'
  | 'DATABASE'
  | 'CHIUSO';

export interface CompanyItem {
  id: string;
  ragione_sociale: string;
  codice_azienda?: string;
  partita_iva?: string;
  citta?: string;
  referente?: string;
  email?: string;
  advisor_nome?: string;
  advisor_ruolo?: string;
  fatturato?: number;
  contratti_attivi?: number;
  stato?: string;
  modalita?: CompanyStatusModalita | string;
}

interface CompanyTableProps {
  companies: CompanyItem[];
  title?: string;
  subtitle?: string;
  showRegisterButton?: boolean;
  showImportButton?: boolean;
  fromPath?: string;
  onCompanyAdded?: () => void;
  onCompaniesDeleted?: (deletedIds: string[]) => void;
}

const STATUS_SECTIONS: Array<{
  key: CompanyStatusModalita;
  label: string;
  badgeBg: string;
  badgeColor: string;
}> = [
  {
    key: 'LAVORAZIONE',
    label: 'IN LAVORAZIONE',
    badgeBg: '#059669',
    badgeColor: '#ffffff',
  },
  {
    key: 'FOLLOW-UP',
    label: 'FOLLOW-UP',
    badgeBg: '#2563eb',
    badgeColor: '#ffffff',
  },
  {
    key: 'DATABASE',
    label: 'DATABASE',
    badgeBg: '#d97706',
    badgeColor: '#ffffff',
  },
  {
    key: 'CHIUSO',
    label: 'CHIUSO',
    badgeBg: '#374151',
    badgeColor: '#e5e7eb',
  },
];

function normalizeModalita(val?: string): CompanyStatusModalita {
  const upper = String(val || '').trim().toUpperCase();
  if (
    upper === 'LAVORAZIONE' ||
    upper === 'IN_LAVORAZIONE' ||
    upper === 'IN LAVORAZIONE'
  ) {
    return 'LAVORAZIONE';
  }
  if (upper === 'FOLLOW-UP' || upper === 'FOLLOW UP' || upper === 'FOLLOWUP') {
    return 'FOLLOW-UP';
  }
  if (upper === 'CHIUSO' || upper === 'CHIUSA' || upper === 'ARCHIVIATO') {
    return 'CHIUSO';
  }
  return 'DATABASE';
}

export function CompanyTable({
  companies,
  title = 'CONTROLLO AZIENDE',
  subtitle = 'Panoramica di tutte le aziende inserite nel database.',
  showRegisterButton = true,
  showImportButton = true,
  fromPath = 'admin',
  onCompanyAdded,
  onCompaniesDeleted,
}: CompanyTableProps) {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  const [items, setItems] = useState<CompanyItem[]>(companies);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedStatus, setHighlightedStatus] =
    useState<CompanyStatusModalita | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteTargets, setDeleteTargets] = useState<CompanyItem[]>([]);
  const [deleting, setDeleting] = useState(false);

  const sectionRefs = useRef<Record<CompanyStatusModalita, HTMLDivElement | null>>({
    LAVORAZIONE: null,
    'FOLLOW-UP': null,
    DATABASE: null,
    CHIUSO: null,
  });

  useEffect(() => {
    setItems(companies);
    setSelectedIds((prev) => prev.filter((id) => companies.some((c) => c.id === id)));
  }, [companies]);

  const countsByStatus = useMemo(() => {
    const counts: Record<CompanyStatusModalita, number> = {
      LAVORAZIONE: 0,
      'FOLLOW-UP': 0,
      DATABASE: 0,
      CHIUSO: 0,
    };
    for (const c of items) {
      counts[normalizeModalita(c.modalita)] += 1;
    }
    return counts;
  }, [items]);

  const filteredCompanies = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;

    return items.filter((c) => {
      const haystack = [
        c.ragione_sociale,
        c.codice_azienda,
        c.partita_iva,
        c.citta,
        c.referente,
        c.email,
        c.advisor_nome,
        c.stato,
        normalizeModalita(c.modalita),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [items, searchQuery]);

  const groupedByStatus = useMemo(() => {
    const groups: Record<CompanyStatusModalita, CompanyItem[]> = {
      LAVORAZIONE: [],
      'FOLLOW-UP': [],
      DATABASE: [],
      CHIUSO: [],
    };
    for (const c of filteredCompanies) {
      groups[normalizeModalita(c.modalita)].push(c);
    }
    return groups;
  }, [filteredCompanies]);

  const handleJumpToSection = (statusKey: CompanyStatusModalita) => {
    setHighlightedStatus(statusKey);
    const targetEl = sectionRefs.current[statusKey];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const allFilteredSelected =
    filteredCompanies.length > 0 &&
    filteredCompanies.every((c) => selectedIds.includes(c.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredCompanies.map((c) => c.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([
        ...selectedIds,
        ...filteredCompanies.map((c) => c.id),
      ]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openBulkDeleteModal = () => {
    const targets = items.filter((c) => selectedIds.includes(c.id));
    if (targets.length > 0) {
      setDeleteTargets(targets);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTargets.length === 0) return;
    setDeleting(true);

    try {
      const idsToDelete = deleteTargets.map((t) => t.id);

      const response = await fetch('/api/aziende/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: idsToDelete }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Errore durante la cancellazione.');
      }

      const actuallyDeletedIds: string[] = Array.isArray(result?.deletedIds)
        ? result.deletedIds
        : [];

      if (actuallyDeletedIds.length === 0) {
        alert(
          'Supabase non ha eliminato alcuna riga da gos_aziende (0 record rimossi). Verifica chiave service role o policy su public.gos_aziende.'
        );
        setDeleteTargets([]);
        return;
      }

      const deletedSet = new Set(actuallyDeletedIds);
      setItems((prev) => prev.filter((c) => !deletedSet.has(c.id)));
      setSelectedIds((prev) => prev.filter((id) => !deletedSet.has(id)));
      onCompaniesDeleted?.(actuallyDeletedIds);
      setDeleteTargets([]);
      router.refresh();
    } catch (err: any) {
      alert('Errore durante l\'eliminazione da gos_aziende: ' + (err?.message || err));
    } finally {
      setDeleting(false);
    }
  };

  const topActionStyle: React.CSSProperties = {
    height: '32px',
    padding: '0 14px',
    borderRadius: '0px',
    border: 'none',
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  const rowActionStyle: React.CSSProperties = {
    height: '24px',
    padding: '0 10px',
    borderRadius: '0px',
    border: 'none',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  const checkboxStyle: React.CSSProperties = {
    width: '13px',
    height: '13px',
    minWidth: '13px',
    minHeight: '13px',
    margin: 0,
    borderRadius: '0px',
    border: '1px solid #4b5563',
    backgroundColor: '#111827',
    accentColor: '#dc2626',
    verticalAlign: 'middle',
    cursor: 'pointer',
  };

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-none space-y-6 shadow-xl">
      {isRegistering ? (
        <AnagraficaForm
          onSave={(newCompany) => {
            console.log('Azienda registrata in locale:', newCompany);
            setIsRegistering(false);
            if (onCompanyAdded) {
              onCompanyAdded();
            } else {
              window.location.reload();
            }
          }}
          onCancel={() => setIsRegistering(false)}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-base font-black text-white uppercase tracking-wider">{title}</h2>
              <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={openBulkDeleteModal}
                  style={{
                    ...topActionStyle,
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                  }}
                  className="hover:opacity-90 transition-all cursor-pointer"
                >
                  Elimina selezionate ({selectedIds.length})
                </button>
              )}
              {showImportButton && (
                <Link
                  href="/commerciale/importa"
                  style={{
                    ...topActionStyle,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                  }}
                  className="hover:opacity-90 transition-all cursor-pointer"
                >
                  ↑ Importa Aziende
                </Link>
              )}
              {showRegisterButton && (
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  style={{
                    ...topActionStyle,
                    backgroundColor: '#d97706',
                    color: '#ffffff',
                  }}
                  className="hover:opacity-90 transition-all cursor-pointer"
                >
                  + Registra Nuova Azienda
                </button>
              )}
            </div>
          </div>

          {/* Pulsanti [TIPO STATUS] ([QUANTITÀ]) sopra la barra Cerca -> scroll alla sezione */}
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_SECTIONS.map((sec) => {
              const count = countsByStatus[sec.key];
              const isSelected = highlightedStatus === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => handleJumpToSection(sec.key)}
                  style={{
                    ...topActionStyle,
                    backgroundColor: sec.badgeBg,
                    color: sec.badgeColor,
                    outline: isSelected ? '2px solid #fde910' : 'none',
                  }}
                  className="hover:opacity-90 transition-all cursor-pointer"
                >
                  {sec.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Barra ricerca ad alto contrasto */}
          <div className="bg-gray-950 border border-gray-800 rounded-none p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1 flex items-center gap-2">
              <span
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#111827',
                  borderRadius: '0px',
                  border: 'none',
                  height: '32px',
                  padding: '0 12px',
                  fontWeight: 800,
                  fontSize: '10px',
                  textTransform: 'uppercase',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                Cerca
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per ragione sociale, codice AZ-XXXXX, P.IVA o advisor..."
                style={{
                  backgroundColor: '#ffffff',
                  color: '#111827',
                  border: '2px solid #f59e0b',
                  borderRadius: '0px',
                  height: '32px',
                  padding: '0 12px',
                  fontSize: '12px',
                  width: '100%',
                }}
                className="focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    backgroundColor: '#374151',
                    color: '#ffffff',
                    borderRadius: '0px',
                    border: 'none',
                    height: '32px',
                    padding: '0 12px',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                  className="hover:opacity-90 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
            <span className="text-[11px] font-mono text-gray-300 whitespace-nowrap">
              {filteredCompanies.length} / {items.length} aziende
            </span>
          </div>

          {items.length === 0 ? (
            <div className="p-12 text-center text-gray-400 text-xs">
              Nessuna azienda trovata nel database.
            </div>
          ) : (
            <div className="space-y-8">
              {STATUS_SECTIONS.map((sec) => {
                const sectionRows = groupedByStatus[sec.key];
                const isHighlighted = highlightedStatus === sec.key;

                return (
                  <div
                    key={sec.key}
                    id={`sezione-${sec.key.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                    ref={(el) => {
                      sectionRefs.current[sec.key] = el;
                    }}
                    className={`bg-gray-950 border rounded-none p-4 space-y-3 scroll-mt-6 transition-colors ${
                      isHighlighted ? 'border-[#fde910]' : 'border-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                      <span
                        style={{
                          backgroundColor: sec.badgeBg,
                          color: sec.badgeColor,
                        }}
                        className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-none"
                      >
                        {sec.label} ({sectionRows.length})
                      </span>
                    </div>

                    {sectionRows.length === 0 ? (
                      <div className="py-6 text-center text-gray-500 text-xs">
                        Nessuna azienda in {sec.label.toLowerCase()}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-gray-300">
                          <thead className="bg-gray-900 uppercase text-gray-400 font-mono text-[10px] border-b border-gray-800">
                            <tr>
                              <th className="p-4 w-8">
                                <input
                                  type="checkbox"
                                  checked={
                                    sectionRows.length > 0 &&
                                    sectionRows.every((c) => selectedIds.includes(c.id))
                                  }
                                  onChange={() => {
                                    const secIds = sectionRows.map((c) => c.id);
                                    const allSecSelected = secIds.every((id) =>
                                      selectedIds.includes(id)
                                    );
                                    if (allSecSelected) {
                                      const secSet = new Set(secIds);
                                      setSelectedIds((prev) =>
                                        prev.filter((id) => !secSet.has(id))
                                      );
                                    } else {
                                      setSelectedIds((prev) =>
                                        Array.from(new Set([...prev, ...secIds]))
                                      );
                                    }
                                  }}
                                  aria-label={`Seleziona tutte le aziende in ${sec.label}`}
                                  style={checkboxStyle}
                                  className="rounded-none"
                                />
                              </th>
                              <th className="p-4">Azienda / Codice</th>
                              <th className="p-4">Advisor Assegnato</th>
                              <th className="p-4">Fatturato Aziendale</th>
                              <th className="p-4">Contratti Attivi</th>
                              <th className="p-4">Stato</th>
                              <th className="p-4 text-right">Azioni</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-800">
                            {sectionRows.map((c) => {
                              const fatturatoVal = Number(
                                c.fatturato ?? (c as any).revenue ?? 0
                              );
                              const contrattiVal = Number(c.contratti_attivi ?? 0);
                              const isChecked = selectedIds.includes(c.id);

                              return (
                                <tr
                                  key={c.id}
                                  className="hover:bg-gray-850/50 transition-colors"
                                >
                                  <td className="p-4">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => toggleSelectOne(c.id)}
                                      aria-label={`Seleziona ${c.ragione_sociale}`}
                                      style={checkboxStyle}
                                      className="rounded-none"
                                    />
                                  </td>
                                  <td className="p-4">
                                    <div className="font-bold text-white text-sm">
                                      {c.ragione_sociale}
                                    </div>
                                    <div className="text-[10px] font-mono text-amber-400">
                                      {c.codice_azienda || c.id}
                                    </div>
                                  </td>
                                  <td className="p-4">
                                    <div className="font-semibold text-white">
                                      {c.advisor_nome || 'Corrado Pinna'}
                                    </div>
                                    <div className="text-[10px] text-gray-400">
                                      {c.advisor_ruolo || 'Administrator'}
                                    </div>
                                  </td>
                                  <td className="p-4 font-mono font-bold text-emerald-400 text-sm">
                                    € {fatturatoVal.toLocaleString('it-IT')}
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-none text-[10px] font-bold font-mono">
                                      {contrattiVal} Attivi
                                    </span>
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 rounded-none text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                                      {c.stato || 'ATTIVA'}
                                    </span>
                                  </td>
                                  <td className="p-4 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <Link
                                        href={`/aziende/${c.id}?from=${encodeURIComponent(fromPath)}`}
                                        style={{
                                          ...rowActionStyle,
                                          backgroundColor: '#1f2937',
                                          color: '#e5e7eb',
                                        }}
                                        className="hover:opacity-90 transition-all cursor-pointer"
                                      >
                                        Dettagli
                                      </Link>
                                      <button
                                        type="button"
                                        onClick={() => setDeleteTargets([c])}
                                        style={{
                                          ...rowActionStyle,
                                          backgroundColor: '#dc2626',
                                          color: '#ffffff',
                                        }}
                                        className="hover:opacity-90 transition-all cursor-pointer"
                                      >
                                        Elimina
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ALERT DI CONFERMA ELIMINAZIONE IRREVERSIBILE (SINGOLA O MULTIPLA) */}
      {deleteTargets.length > 0 && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-red-600 rounded-none max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-red-400">
                Attenzione — Azione Irreversibile
              </div>
              <h3 className="text-base font-black text-white">
                {deleteTargets.length === 1
                  ? 'Sei veramente sicuro di voler cancellare questa azienda?'
                  : `Sei veramente sicuro di voler cancellare ${deleteTargets.length} aziende?`}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Questa operazione è <strong className="text-red-300">irreversibile</strong> e rimuoverà definitivamente dal database:
              </p>
              <ul className="max-h-36 overflow-y-auto bg-gray-950 border border-gray-800 rounded-none p-2.5 space-y-1 text-xs text-white">
                {deleteTargets.map((t) => (
                  <li key={t.id} className="truncate font-semibold">
                    • {t.ragione_sociale}{' '}
                    <span className="text-[10px] font-mono text-amber-400">
                      ({t.codice_azienda || t.id})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-800">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTargets([])}
                style={{
                  ...topActionStyle,
                  backgroundColor: '#1f2937',
                  color: '#d1d5db',
                }}
                className="hover:opacity-90 cursor-pointer"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                style={{
                  ...topActionStyle,
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                }}
                className="hover:opacity-90 disabled:opacity-50 cursor-pointer"
              >
                {deleting
                  ? 'Eliminazione...'
                  : deleteTargets.length === 1
                  ? 'Sì, cancella definitivamente'
                  : `Sì, cancella tutte (${deleteTargets.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
