'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import {
  AZIENDA_TAB_ITEMS,
  CRUSCOTTO_TAB_ITEMS,
  normalizeGosRole,
  resolveGosPermissions,
} from '@/utils/gosPermissions';

export interface ProfileItem {
  id: string;
  codice_utente?: string;
  email?: string;
  full_name?: string;
  nome?: string;
  role?: string;
  ruolo?: string;
  permessi?: {
    aziende?: boolean;
    questionari?: boolean;
    offerte?: boolean;
    utenti?: boolean;
  } | null;
  tab_permissions?: Record<
    string,
    { read?: boolean; edit?: boolean; delete?: boolean }
  > | null;
  azienda_tab_permissions?: Record<
    string,
    { read?: boolean; edit?: boolean; delete?: boolean }
  > | null;
  stato?: string;
  status?: string;
  is_online?: boolean;
  last_seen_at?: string;
  created_at?: string;
  [key: string]: any;
}

interface UsersTableProps {
  currentUserRole?: string;
  currentUserEmail?: string;
}

function generateUserCode(): string {
  const num = Math.floor(10000 + Math.random() * 90000);
  return `USR-${num}`;
}

function isProfileOnline(profile: ProfileItem): boolean {
  if (typeof profile.is_online === 'boolean') return profile.is_online;
  if (profile.last_seen_at) {
    const diffMs = Date.now() - new Date(profile.last_seen_at).getTime();
    return diffMs >= 0 && diffMs <= 5 * 60 * 1000;
  }
  return false;
}

export function UsersTable({
  currentUserRole = 'user',
  currentUserEmail,
}: UsersTableProps) {
  const [detectedRole, setDetectedRole] = useState<string>(currentUserRole);
  const [actorInfo, setActorInfo] = useState<{
    userId?: string;
    email?: string;
  }>({ email: currentUserEmail });
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<ProfileItem[]>([]);
  const [deleting, setDeleting] = useState(false);

  const effectiveRole = useMemo(() => {
    const normDetected = normalizeGosRole(detectedRole);
    const normProp = normalizeGosRole(currentUserRole);
    if (normDetected === 'superadmin' || normProp === 'superadmin') return 'superadmin';
    return normDetected || normProp || 'user Guest';
  }, [detectedRole, currentUserRole]);

  const isSuperAdmin = effectiveRole === 'superadmin';

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const buildAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }
    } catch {
      // ignora se la sessione non è disponibile
    }
    return headers;
  }, [supabase]);

  const markCurrentUserOnlineAndLoad = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.from('gos_profiles').select('*');
      if (error) throw error;

      const list: ProfileItem[] = Array.isArray(data) ? data : [];

      let authEmail = currentUserEmail;
      let authUserId: string | undefined;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) {
          authUserId = authData.user.id;
        }
        if (authData?.user?.email) {
          authEmail = authData.user.email;
        }
      } catch (authErr) {
        console.warn('Lettura sessione auth non disponibile:', authErr);
      }

      if (authEmail || authUserId) {
        const matchedProfile = list.find(
          (p) =>
            (authUserId && String(p.id) === String(authUserId)) ||
            (authEmail && (p.email || '').toLowerCase() === authEmail.toLowerCase())
        );

        setActorInfo({
          userId: matchedProfile?.id || authUserId,
          email: matchedProfile?.email || authEmail,
        });

        const matchedRole = matchedProfile?.role || matchedProfile?.ruolo;
        if (matchedRole) {
          setDetectedRole(matchedRole);
        }

        if (authEmail) {
          try {
            await supabase
              .from('gos_profiles')
              .update({
                is_online: true,
                last_seen_at: new Date().toISOString(),
              })
              .eq('email', authEmail);
          } catch (presenceErr) {
            console.warn('Aggiornamento presenza non riuscito:', presenceErr);
          }
        }
      }

      const enriched = await Promise.all(
        list.map(async (item) => {
          if (item.codice_utente) return item;
          const newCode = generateUserCode();
          try {
            await supabase
              .from('gos_profiles')
              .update({ codice_utente: newCode })
              .eq('id', item.id);
          } catch (codeErr) {
            console.warn('Salvataggio codice_utente non riuscito per', item.id, codeErr);
          }
          return { ...item, codice_utente: newCode };
        })
      );

      setProfiles(enriched);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Errore nel caricamento di gos_profiles.');
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, currentUserEmail]);

  useEffect(() => {
    markCurrentUserOnlineAndLoad();
  }, [markCurrentUserOnlineAndLoad]);

  const getDisplayName = (p: ProfileItem) =>
    p.full_name || p.nome || p.email || 'Utente';

  const getRoleValue = (p: ProfileItem) =>
    p.role || p.ruolo || 'user Guest';

  const getStatusValue = (p: ProfileItem) =>
    p.stato || p.status || 'ATTIVO';

  const getPermissionsSummary = (p: ProfileItem) => {
    const resolved = resolveGosPermissions({
      ...p,
      ruolo: p.ruolo || p.role || 'user Guest',
    });

    const cruscottoTabs = CRUSCOTTO_TAB_ITEMS.filter((t) => {
      const f = resolved.tabPermissions[t.key];
      return f?.read || f?.edit || f?.delete;
    }).map((t) => t.label);

    const aziendaTabs = AZIENDA_TAB_ITEMS.filter((t) => {
      const f = resolved.aziendaTabPermissions[t.key];
      return f?.read || f?.edit || f?.delete;
    }).map((t) => `Az: ${t.label}`);

    const combined = [...cruscottoTabs, ...aziendaTabs];
    if (combined.length > 0) {
      return combined.join(', ');
    }

    const legacy = Object.entries(p.permessi || {})
      .filter(([, enabled]) => Boolean(enabled))
      .map(([key]) => key);

    return legacy.length > 0 ? legacy.join(', ') : 'standard';
  };

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return profiles;

    return profiles.filter((p) => {
      const onlineLabel = isProfileOnline(p) ? 'in linea online' : 'non in linea offline';
      const haystack = [
        p.codice_utente,
        p.email,
        p.full_name,
        p.nome,
        p.role,
        p.ruolo,
        p.stato,
        p.status,
        onlineLabel,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [profiles, searchQuery]);

  const onlineCount = useMemo(
    () => profiles.filter((p) => isProfileOnline(p)).length,
    [profiles]
  );

  const allFilteredSelected =
    filteredProfiles.length > 0 &&
    filteredProfiles.every((p) => selectedIds.includes(p.id));

  const toggleSelectAll = () => {
    if (!isSuperAdmin) return;
    if (allFilteredSelected) {
      const filteredSet = new Set(filteredProfiles.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredSet.has(id)));
    } else {
      const merged = new Set([...selectedIds, ...filteredProfiles.map((p) => p.id)]);
      setSelectedIds(Array.from(merged));
    }
  };

  const toggleSelectOne = (id: string) => {
    if (!isSuperAdmin) return;
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleResetPassword = async (profile: ProfileItem) => {
    if (!isSuperAdmin) {
      alert('Solo i profili superadmin possono inviare il reset password.');
      return;
    }
    if (!profile.email) {
      alert('Questo profilo non ha un indirizzo email associato.');
      return;
    }

    setResettingId(profile.id);
    try {
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/utenti/reset-password', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email: profile.email,
          actorRole: effectiveRole,
          actorUserId: actorInfo.userId,
          actorEmail: actorInfo.email || currentUserEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Errore reset password.');
      alert(`Email di reset password inviata a ${profile.email}.`);
    } catch (err: any) {
      alert('Errore reset password: ' + (err?.message || err));
    } finally {
      setResettingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (deleteTargets.length === 0 || !isSuperAdmin) return;
    setDeleting(true);

    try {
      const idsToDelete = deleteTargets.map((t) => t.id);
      const headers = await buildAuthHeaders();
      const res = await fetch('/api/utenti/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ids: idsToDelete,
          actorRole: effectiveRole,
          actorUserId: actorInfo.userId,
          actorEmail: actorInfo.email || currentUserEmail,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Errore durante la cancellazione.');

      const deletedSet = new Set<string>(json?.deletedIds || []);
      if (deletedSet.size === 0) {
        alert('Nessun profilo eliminato da gos_profiles.');
        setDeleteTargets([]);
        return;
      }

      setProfiles((prev) => prev.filter((p) => !deletedSet.has(p.id)));
      setSelectedIds((prev) => prev.filter((id) => !deletedSet.has(id)));
      setDeleteTargets([]);
    } catch (err: any) {
      alert('Errore durante l\'eliminazione da gos_profiles: ' + (err?.message || err));
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider">
            UTENTI & PERMESSI
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            In linea: <strong className="text-emerald-400">{onlineCount}</strong> • Non in linea:{' '}
            <strong className="text-red-400">{Math.max(0, profiles.length - onlineCount)}</strong> •{' '}
            {isSuperAdmin ? (
              <span className="text-amber-400 font-semibold">Modalità SuperAdmin attiva</span>
            ) : (
              <span className="text-gray-500">Sola lettura (richiede ruolo superadmin per modifiche)</span>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && selectedIds.length > 0 && (
            <button
              type="button"
              onClick={() =>
                setDeleteTargets(profiles.filter((p) => selectedIds.includes(p.id)))
              }
              style={{
                ...topActionStyle,
                backgroundColor: '#dc2626',
                color: '#ffffff',
              }}
              className="hover:opacity-90 transition-all cursor-pointer"
            >
              Elimina selezionati ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={markCurrentUserOnlineAndLoad}
            style={{
              ...topActionStyle,
              backgroundColor: '#1f2937',
              color: '#e5e7eb',
            }}
            className="hover:opacity-90 transition-all cursor-pointer"
          >
            Aggiorna Elenco
          </button>
        </div>
      </div>

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
            placeholder="Cerca per codice USR-XXXXX, utente, email, ruolo, stato o in linea..."
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
          {filteredProfiles.length} / {profiles.length} profili
        </span>
      </div>

      {errorMsg ? (
        <div className="bg-red-950/50 border border-red-700 rounded-none p-4 text-xs font-bold text-red-300">
          {errorMsg}
        </div>
      ) : loading ? (
        <div className="p-10 text-center text-gray-400 text-xs font-mono">
          Caricamento profili da gos_profiles...
        </div>
      ) : filteredProfiles.length === 0 ? (
        <div className="p-10 text-center text-gray-400 text-xs">
          Nessun profilo trovato in gos_profiles.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-gray-950 uppercase text-gray-400 font-mono text-[10px] border-b border-gray-800">
              <tr>
                <th className="p-4 w-8">
                  <input
                    type="checkbox"
                    checked={allFilteredSelected}
                    disabled={!isSuperAdmin}
                    onChange={toggleSelectAll}
                    aria-label="Seleziona tutti i profili"
                    style={checkboxStyle}
                    className="rounded-none disabled:opacity-40"
                  />
                </th>
                <th className="p-4">Utente / Codice</th>
                <th className="p-4">Email</th>
                <th className="p-4">Ruolo</th>
                <th className="p-4">Permessi</th>
                <th className="p-4">Stato</th>
                <th className="p-4 text-right">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredProfiles.map((p) => {
                const online = isProfileOnline(p);
                const roleVal = getRoleValue(p);
                const statusVal = getStatusValue(p);
                const isChecked = selectedIds.includes(p.id);
                const permsSummary = getPermissionsSummary(p);

                return (
                  <tr key={p.id} className="hover:bg-gray-850/50 transition-colors">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isSuperAdmin}
                        onChange={() => toggleSelectOne(p.id)}
                        aria-label={`Seleziona ${getDisplayName(p)}`}
                        style={checkboxStyle}
                        className="rounded-none disabled:opacity-40"
                      />
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white text-sm inline-flex items-center gap-2">
                        <span
                          title={online ? 'In linea' : 'Non in linea'}
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '9999px',
                            backgroundColor: online ? '#10b981' : '#ef4444',
                            display: 'inline-block',
                            flexShrink: 0,
                          }}
                        />
                        <span>{getDisplayName(p)}</span>
                      </div>
                      <div className="text-[10px] font-mono text-amber-400">
                        {p.codice_utente || 'USR-00000'}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-gray-300">{p.email || '—'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-none text-[10px] font-bold uppercase font-mono">
                        {roleVal}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-[11px] font-mono text-gray-300">
                        {permsSummary}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-none text-[10px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {statusVal}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/profile?id=${encodeURIComponent(p.id)}`}
                          style={{
                            ...rowActionStyle,
                            backgroundColor: '#1f2937',
                            color: '#e5e7eb',
                          }}
                          className="hover:opacity-90 transition-all cursor-pointer"
                        >
                          Dettagli
                        </Link>

                        {isSuperAdmin && (
                          <>
                            <button
                              type="button"
                              disabled={resettingId === p.id}
                              onClick={() => handleResetPassword(p)}
                              style={{
                                ...rowActionStyle,
                                backgroundColor: '#d97706',
                                color: '#ffffff',
                              }}
                              className="hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                            >
                              {resettingId === p.id ? 'Invio...' : 'Reset Password'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTargets([p])}
                              style={{
                                ...rowActionStyle,
                                backgroundColor: '#dc2626',
                                color: '#ffffff',
                              }}
                              className="hover:opacity-90 transition-all cursor-pointer"
                            >
                              Elimina
                            </button>
                          </>
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

      {deleteTargets.length > 0 && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-red-600 rounded-none max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="space-y-2">
              <div className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-red-400">
                Attenzione — Azione Irreversibile
              </div>
              <h3 className="text-base font-black text-white">
                {deleteTargets.length === 1
                  ? 'Sei veramente sicuro di voler cancellare questo profilo?'
                  : `Sei veramente sicuro di voler cancellare ${deleteTargets.length} profili?`}
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Questa operazione è <strong className="text-red-300">irreversibile</strong> e rimuoverà il record da{' '}
                <span className="font-mono text-gray-200">gos_profiles</span>:
              </p>
              <ul className="max-h-36 overflow-y-auto bg-gray-950 border border-gray-800 rounded-none p-2.5 space-y-1 text-xs text-white">
                {deleteTargets.map((t) => (
                  <li key={t.id} className="truncate font-semibold">
                    • {getDisplayName(t)}{' '}
                    <span className="text-[10px] font-mono text-amber-400">
                      ({t.codice_utente || 'USR-00000'})
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
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
                  : `Sì, cancella tutti (${deleteTargets.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default UsersTable;
