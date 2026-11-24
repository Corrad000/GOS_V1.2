'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import AnagraficaForm from './AnagraficaForm';
import {
  resolveGosPermissions,
  type GosUserPermissions,
  type ProfilePermissionInput,
} from '@/utils/gosPermissions';

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
  permissions?: Partial<GosUserPermissions>;
  onCompanyAdded?: () => void;
  onCompaniesDeleted?: (deletedIds: string[]) => void;
}

const STATUS_SECTIONS: Array<{
  key: CompanyStatusModalita;
  label: string;
  badgeClass: string;
}> = [
  {
    key: 'LAVORAZIONE',
    label: 'IN LAVORAZIONE',
    badgeClass: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-400',
  },
  {
    key: 'FOLLOW-UP',
    label: 'FOLLOW-UP',
    badgeClass: 'border-amber-500/35 bg-amber-500/15 text-amber-400',
  },
  {
    key: 'DATABASE',
    label: 'DATABASE',
    badgeClass: 'border-[#2A3A66] bg-[#111E42] text-[#B9C3D9]',
  },
  {
    key: 'CHIUSO',
    label: 'CHIUSO',
    badgeClass: 'border-red-500/35 bg-red-500/15 text-red-400',
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

const eur = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

export function CompanyTable({
  companies,
  title = 'CONTROLLO AZIENDE',
  subtitle = 'Panoramica di tutte le aziende inserite nel database.',
  showRegisterButton = true,
  showImportButton = true,
  fromPath = 'admin',
  permissions,
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
  const [actorIdentity, setActorIdentity] = useState<{
    userId?: string;
    email?: string;
  }>({});
  const [resolvedPerms, setResolvedPerms] = useState<GosUserPermissions>(() =>
    resolveGosPermissions(null)
  );

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const sectionRefs = useRef<Record<CompanyStatusModalita, HTMLDivElement | null>>({
    LAVORAZIONE: null,
    'FOLLOW-UP': null,
    DATABASE: null,
    CHIUSO: null,
  });

  useEffect(() => {
    let active = true;

    async function loadUserPermissions() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (active) {
            setActorIdentity({});
            setResolvedPerms(resolveGosPermissions(null));
          }
          return;
        }

        if (active) {
          setActorIdentity({
            userId: user.id,
            email: user.email || undefined,
          });
        }

        const { data: profile } = await supabase
          .from('gos_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (active) {
          setResolvedPerms(
            resolveGosPermissions((profile as ProfilePermissionInput | null) || {
              ruolo: user.user_metadata?.role,
            })
          );
        }
      } catch {
        if (active) setResolvedPerms(resolveGosPermissions(null));
      }
    }

    loadUserPermissions();

    return () => {
      active = false;
    };
  }, [supabase]);

  const activePermissions: GosUserPermissions = useMemo(
    () => ({
      ...resolvedPerms,
      ...(permissions || {}),
    }),
    [resolvedPerms, permissions]
  );

  const canWriteCompanies =
    activePermissions.canEditAziende ||
    Boolean(activePermissions.tabPermissions?.database_aziende?.edit);

  const canDeleteCompanies =
    activePermissions.canDeleteAziende ||
    Boolean(activePermissions.tabPermissions?.database_aziende?.delete);

  useEffect(() => {
    setItems(companies);
    setSelectedIds((prev) => prev.filter((id) => companies.some((c) => c.id === id)));
  }, [companies]);

  useEffect(() => {
    if (!canDeleteCompanies) {
      setSelectedIds([]);
      setDeleteTargets([]);
    }
  }, [canDeleteCompanies]);

  useEffect(() => {
    if (!canWriteCompanies) {
      setIsRegistering(false);
    }
  }, [canWriteCompanies]);

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

  const toggleSelectOne = (id: string) => {
    if (!canDeleteCompanies) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const openBulkDeleteModal = () => {
    if (!canDeleteCompanies) return;
    const targets = items.filter((c) => selectedIds.includes(c.id));
    if (targets.length > 0) {
      setDeleteTargets(targets);
    }
  };

  const handleConfirmDelete = async () => {
    if (!canDeleteCompanies || deleteTargets.length === 0) return;
    setDeleting(true);

    try {
      const idsToDelete = deleteTargets.map((t) => t.id);
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const response = await fetch('/api/aziende/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ids: idsToDelete,
          actorUserId: actorIdentity.userId || session?.user?.id,
          actorEmail: actorIdentity.email || session?.user?.email,
        }),
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
      alert("Errore durante l'eliminazione da gos_aziende: " + (err?.message || err));
    } finally {
      setDeleting(false);
    }
  };

  const canRegister = showRegisterButton && canWriteCompanies;
  const canImport = showImportButton && canWriteCompanies;

  return (
    <div className="space-y-6 rounded-2xl border border-[#1B2540] bg-[#0B132B] p-6 text-[#E6EAF2]">
      {isRegistering && canWriteCompanies ? (
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
          <div className="flex flex-col items-start justify-between gap-4 border-b border-[#1B2540] pb-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
                {title}
              </h2>
              <p className="mt-1 text-xs text-[#8A94A8]">{subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {canDeleteCompanies && selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={openBulkDeleteModal}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-red-500/40 bg-red-500/15 px-3.5 text-[11px] font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/25"
                >
                  Elimina selezionate ({selectedIds.length})
                </button>
              )}
              {canImport && (
                <Link
                  href="/commerciale/importa"
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-[#2A3A66] bg-[#111E42] px-3.5 text-[11px] font-bold uppercase tracking-wider text-[#E6EAF2] transition-colors hover:bg-[#1B2540]"
                >
                  ↑ Importa Aziende
                </Link>
              )}
              {canRegister && (
                <button
                  type="button"
                  onClick={() => setIsRegistering(true)}
                  className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-[#FF5500] px-3.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-[#FF7A3D]"
                >
                  + Registra Nuova Azienda
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-[#1B2540] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 items-center gap-4">
              <label
                htmlFor="cerca-azienda-tabella"
                className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]"
              >
                CERCA
              </label>
              <input
                id="cerca-azienda-tabella"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cerca per ragione sociale, codice AZ-XXXXX, P.IVA o advisor..."
                className="h-9 w-full rounded-lg border border-[#2A3A66] bg-[#090D16] px-3.5 text-xs text-[#E6EAF2] placeholder:text-[#5B6680] focus:border-[#FF5500] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex h-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[#2A3A66] bg-[#111E42] px-3 text-[11px] font-semibold text-[#B9C3D9] hover:bg-[#1B2540] hover:text-white"
                >
                  Reset
                </button>
              )}
            </div>
            <span className="shrink-0 text-xs text-[#8A94A8]">
              {filteredCompanies.length} di {items.length} aziende
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {STATUS_SECTIONS.map((sec) => {
              const count = countsByStatus[sec.key];
              const isSelected = highlightedStatus === sec.key;
              return (
                <button
                  key={sec.key}
                  type="button"
                  onClick={() => handleJumpToSection(sec.key)}
                  className={`inline-flex h-7 cursor-pointer items-center justify-center rounded-full border px-3 text-[11px] font-semibold transition-colors ${
                    isSelected
                      ? 'border-[#FF5500] bg-[#FF5500] text-white'
                      : 'border-[#2A3A66] text-[#B9C3D9] hover:bg-[#111E42] hover:text-white'
                  }`}
                >
                  {sec.label} ({count})
                </button>
              );
            })}
          </div>

          {items.length === 0 ? (
            <div className="border-t border-[#1B2540] py-12 text-center text-xs text-[#8A94A8]">
              Nessuna azienda trovata nel database.
            </div>
          ) : (
            <div className="space-y-8 pt-1">
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
                    className={`scroll-mt-6 space-y-3 border-t pt-4 transition-colors ${
                      isHighlighted ? 'border-[#FF5500]' : 'border-[#1B2540]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${sec.badgeClass}`}
                      >
                        {sec.label} ({sectionRows.length})
                      </span>
                    </div>

                    {sectionRows.length === 0 ? (
                      <div className="border-b border-[#151F38] py-6 text-center text-xs text-[#8A94A8]">
                        Nessuna azienda in {sec.label.toLowerCase()}.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left text-[13px] text-[#E6EAF2]">
                          <thead>
                            <tr className="border-b border-[#1B2540] text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]">
                              {canDeleteCompanies && (
                                <th className="w-8 px-2 py-2.5">
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
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-[#2A3A66] bg-[#090D16] accent-[#FF5500]"
                                  />
                                </th>
                              )}
                              <th className="px-2 py-2.5">AZIENDA / CODICE</th>
                              <th className="px-2 py-2.5">ADVISOR ASSEGNATO</th>
                              <th className="px-2 py-2.5 text-right">FATTURATO AZIENDALE</th>
                              <th className="px-2 py-2.5">CONTRATTI ATTIVI</th>
                              <th className="px-2 py-2.5">STATO</th>
                              <th className="px-2 py-2.5 text-right">AZIONI</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#151F38]">
                            {sectionRows.map((c) => {
                              const fatturatoVal = Number(
                                c.fatturato ?? (c as any).revenue ?? 0
                              );
                              const contrattiVal = Number(c.contratti_attivi ?? 0);
                              const isChecked = selectedIds.includes(c.id);

                              return (
                                <tr
                                  key={c.id}
                                  className={
                                    isChecked
                                      ? 'bg-[#111E42]/70 transition-colors'
                                      : 'transition-colors hover:bg-[#111E42]/30'
                                  }
                                >
                                  {canDeleteCompanies && (
                                    <td className="px-2 py-3.5">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSelectOne(c.id)}
                                        aria-label={`Seleziona ${c.ragione_sociale}`}
                                        className="h-3.5 w-3.5 cursor-pointer rounded border-[#2A3A66] bg-[#090D16] accent-[#FF5500]"
                                      />
                                    </td>
                                  )}
                                  <td className="px-2 py-3.5">
                                    <div className="font-semibold text-white">
                                      {c.ragione_sociale}
                                    </div>
                                    <div className="text-[11px] text-[#8A94A8]">
                                      {c.codice_azienda || c.id}
                                    </div>
                                  </td>
                                  <td className="px-2 py-3.5">
                                    <div className="font-medium text-white">
                                      {c.advisor_nome || 'Corrado Pinna'}
                                    </div>
                                    <div className="text-[11px] text-[#8A94A8]">
                                      {c.advisor_ruolo || 'Equity Partner'}
                                    </div>
                                  </td>
                                  <td className="px-2 py-3.5 text-right font-semibold text-white">
                                    {eur.format(fatturatoVal)}
                                  </td>
                                  <td className="px-2 py-3.5">
                                    <span className="rounded-md border border-[#2A3A66] bg-[#111E42] px-2.5 py-1 text-[10px] font-semibold text-[#B9C3D9]">
                                      {contrattiVal} Attivi
                                    </span>
                                  </td>
                                  <td className="px-2 py-3.5">
                                    <span className="rounded-md border border-emerald-500/35 bg-emerald-500/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                      {c.stato || 'ATTIVA'}
                                    </span>
                                  </td>
                                  <td className="px-2 py-3.5 text-right">
                                    <div className="inline-flex items-center gap-2">
                                      <Link
                                        href={`/aziende/${c.id}?from=${encodeURIComponent(fromPath)}`}
                                        className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-[#2A3A66] bg-[#1B2540] px-2.5 text-[11px] font-semibold text-[#E6EAF2] transition-colors hover:bg-[#25335A]"
                                      >
                                        DETTAGLI
                                      </Link>
                                      {canDeleteCompanies && (
                                        <button
                                          type="button"
                                          onClick={() => setDeleteTargets([c])}
                                          className="inline-flex h-7 cursor-pointer items-center justify-center rounded-md border border-red-500/35 bg-red-500/15 px-2.5 text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/25"
                                        >
                                          Elimina
                                        </button>
                                      )}
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

      {canDeleteCompanies && deleteTargets.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-red-500/40 bg-[#0B132B] p-6 shadow-2xl">
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-widest text-red-400">
                Attenzione — Azione Irreversibile
              </div>
              <h3 className="text-base font-extrabold text-white">
                {deleteTargets.length === 1
                  ? 'Sei veramente sicuro di voler cancellare questa azienda?'
                  : `Sei veramente sicuro di voler cancellare ${deleteTargets.length} aziende?`}
              </h3>
              <p className="text-xs leading-relaxed text-[#8A94A8]">
                Questa operazione è{' '}
                <strong className="text-red-300">irreversibile</strong> e rimuoverà
                definitivamente dal database:
              </p>
              <ul className="max-h-36 space-y-1 overflow-y-auto border-y border-[#1B2540] py-2.5 text-xs text-white">
                {deleteTargets.map((t) => (
                  <li key={t.id} className="truncate font-semibold">
                    • {t.ragione_sociale}{' '}
                    <span className="text-[11px] text-[#8A94A8]">
                      ({t.codice_azienda || t.id})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTargets([])}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg border border-[#2A3A66] bg-[#111E42] px-3.5 text-xs font-semibold text-[#E6EAF2] hover:bg-[#1B2540]"
              >
                Annulla
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleConfirmDelete}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-lg bg-[#FF5500] px-3.5 text-xs font-bold text-white hover:bg-[#FF7A3D] disabled:opacity-50"
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
