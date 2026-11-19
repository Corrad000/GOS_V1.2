'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

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
  const [profiles, setProfiles] = useState<ProfileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [editingProfile, setEditingProfile] = useState<ProfileItem | null>(null);
  const [editUser, setEditUser] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState('user');
  const [editStatus, setEditStatus] = useState('ATTIVO');
  const [editPermissions, setEditPermissions] = useState({
    aziende: true,
    questionari: true,
    offerte: true,
    utenti: false,
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [resettingId, setResettingId] = useState<string | null>(null);
  const [deleteTargets, setDeleteTargets] = useState<ProfileItem[]>([]);
  const [deleting, setDeleting] = useState(false);

  const effectiveRole = useMemo(() => {
    if (detectedRole.toLowerCase() === 'superadmin') return 'superadmin';
    if (currentUserRole.toLowerCase() === 'superadmin') return 'superadmin';
    return detectedRole || currentUserRole;
  }, [detectedRole, currentUserRole]);

  const isSuperAdmin = effectiveRole.toLowerCase() === 'superadmin';

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const markCurrentUserOnlineAndLoad = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.from('gos_profiles').select('*');
      if (error) throw error;

      const list: ProfileItem[] = Array.isArray(data) ? data : [];

      let authEmail = currentUserEmail;
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.email) {
          authEmail = authData.user.email;
        }
      } catch (authErr) {
        console.warn('Lettura sessione auth non disponibile:', authErr);
      }

      if (authEmail) {
        const matchedProfile = list.find(
          (p) => (p.email || '').toLowerCase() === authEmail!.toLowerCase()
        );
        const matchedRole = matchedProfile?.role || matchedProfile?.ruolo;
        if (matchedRole) {
          setDetectedRole(matchedRole);
        }

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
    p.role || p.ruolo || 'user';

  const getStatusValue = (p: ProfileItem) =>
    p.stato || p.status || 'ATTIVO';

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

  const openEditModal = (profile: ProfileItem) => {
    if (!isSuperAdmin) {
      alert('Solo i profili superadmin possono modificare utenti e permessi.');
      return;
    }
    setEditingProfile(profile);
    setEditUser(profile.full_name || profile.nome || '');
    setEditEmail(profile.email || '');
    setEditRole(getRoleValue(profile));
    setEditStatus(getStatusValue(profile));
    setEditPermissions({
      aziende: profile.permessi?.aziende ?? true,
      questionari: profile.permessi?.questionari ?? true,
      offerte: profile.permessi?.offerte ?? true,
      utenti: profile.permessi?.utenti ?? false,
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProfile || !isSuperAdmin) return;
    setSavingEdit(true);

    try {
      const updatePayload: Record<string, any> = {
        codice_utente: editingProfile.codice_utente || generateUserCode(),
        email: editEmail.trim(),
        stato: editStatus,
        permessi: editPermissions,
      };

      if ('full_name' in editingProfile || !('nome' in editingProfile)) {
        updatePayload.full_name = editUser.trim();
      }
      if ('nome' in editingProfile) {
        updatePayload.nome = editUser.trim();
      }
      if ('role' in editingProfile || !('ruolo' in editingProfile)) {
        updatePayload.role = editRole;
      }
      if ('ruolo' in editingProfile) {
        updatePayload.ruolo = editRole;
      }

      const { data: updated, error } = await supabase
        .from('gos_profiles')
        .update(updatePayload)
        .eq('id', editingProfile.id)
        .select('*')
        .single();

      if (error) throw error;

      setProfiles((prev) =>
        prev.map((item) =>
          item.id === editingProfile.id ? { ...item, ...(updated || updatePayload) } : item
        )
      );
      setEditingProfile(null);
    } catch (err: any) {
      alert('Errore durante l\'aggiornamento del profilo: ' + (err?.message || err));
    } finally {
      setSavingEdit(false);
    }
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
      const res = await fetch('/api/utenti/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: profile.email,
          actorRole: effectiveRole,
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
      const res = await fetch('/api/utenti/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: idsToDelete,
          actorRole: effectiveRole,
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
                const activePerms = Object.entries(p.permessi || {})
                  .filter(([, enabled]) => Boolean(enabled))
                  .map(([key]) => key);

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
                        {activePerms.length > 0 ? activePerms.join(', ') : 'standard'}
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
                              onClick={() => openEditModal(p)}
                              style={{
                                ...rowActionStyle,
                                backgroundColor: '#374151',
                                color: '#ffffff',
                              }}
                              className="hover:opacity-90 transition-all cursor-pointer"
                            >
                              Modifica
                            </button>
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

      {/* MODALE MODIFICA UTENTE, EMAIL, RUOLO, PERMESSI E STATO (SOLO SUPERADMIN) */}
      {editingProfile && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-none max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="border-b border-gray-800 pb-3">
              <div className="text-[10px] font-mono uppercase text-amber-400">
                Aggiornamento Profilo • {editingProfile.codice_utente || 'USR-00000'}
              </div>
              <h3 className="text-base font-black text-white">{getDisplayName(editingProfile)}</h3>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                  Utente
                </label>
                <input
                  type="text"
                  value={editUser}
                  onChange={(e) => setEditUser(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                    Ruolo
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  >
                    <option value="superadmin">superadmin</option>
                    <option value="admin">admin</option>
                    <option value="advisor">advisor</option>
                    <option value="Network Partner">Network Partner</option>
                    <option value="user">user</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                    Stato
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  >
                    <option value="ATTIVO">ATTIVO</option>
                    <option value="SOSPESO">SOSPESO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-2 font-bold uppercase text-[10px]">
                  Permessi Moduli
                </label>
                <div className="grid grid-cols-2 gap-2 bg-gray-950 border border-gray-800 p-3 rounded-none text-xs text-gray-200">
                  {(
                    [
                      ['aziende', 'Controllo Aziende'],
                      ['questionari', 'Libreria Questionari'],
                      ['offerte', 'Catalogo Offerte'],
                      ['utenti', 'Gestione Utenti'],
                    ] as const
                  ).map(([key, label]) => (
                    <label key={key} className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions[key]}
                        onChange={(e) =>
                          setEditPermissions((prev) => ({
                            ...prev,
                            [key]: e.target.checked,
                          }))
                        }
                        style={checkboxStyle}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-800">
                <button
                  type="button"
                  disabled={savingEdit}
                  onClick={() => setEditingProfile(null)}
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
                  type="submit"
                  disabled={savingEdit}
                  style={{
                    ...topActionStyle,
                    backgroundColor: '#059669',
                    color: '#ffffff',
                  }}
                  className="hover:opacity-90 disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALERT DI CONFERMA ELIMINAZIONE IRREVERSIBILE */}
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
