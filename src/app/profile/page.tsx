'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import {
  GOS_ROLES,
  normalizeGosRole,
  resolveGosPermissions,
} from '@/utils/gosPermissions';

function ProfilePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const targetIdFromQuery = searchParams?.get('id') || '';

  const [profile, setProfile] = useState<any | null>(null);
  const [loggedInProfile, setLoggedInProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [utente, setUtente] = useState('');
  const [email, setEmail] = useState('');
  const [ruolo, setRuolo] = useState<string>('user Guest');
  const [stato, setStato] = useState('ATTIVO');
  const [permessi, setPermessi] = useState({
    aziende: true,
    questionari: true,
    offerte: true,
    utenti: false,
  });

  // Permessi granulari modificabili direttamente dal GOS
  const [canDeleteAziende, setCanDeleteAziende] = useState(false);
  const [canEditOfferte, setCanEditOfferte] = useState(false);
  const [canDeleteOfferte, setCanDeleteOfferte] = useState(false);
  const [canExportData, setCanExportData] = useState(false);
  const [canDeleteProgetti, setCanDeleteProgetti] = useState(false);
  const [canDeleteDocumenti, setCanDeleteDocumenti] = useState(false);
  const [canDeleteFile, setCanDeleteFile] = useState(false);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const actorRole = useMemo(() => {
    return normalizeGosRole(loggedInProfile?.ruolo || loggedInProfile?.role || '');
  }, [loggedInProfile]);

  const isSuperAdmin = actorRole === 'superadmin';

  useEffect(() => {
    let active = true;

    async function loadProfileData() {
      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user || null;

        let currentUserRow: any = null;
        const { data: allProfiles } = await supabase.from('gos_profiles').select('*');

        if (authUser?.email && Array.isArray(allProfiles)) {
          currentUserRow =
            allProfiles.find(
              (p: any) => (p.email || '').toLowerCase() === authUser.email!.toLowerCase()
            ) || null;
        }

        if (!currentUserRow && authUser?.id && Array.isArray(allProfiles)) {
          currentUserRow =
            allProfiles.find((p: any) => p.id === authUser.id) || null;
        }

        if (active) {
          setLoggedInProfile(currentUserRow);
        }

        const targetId = targetIdFromQuery || currentUserRow?.id || '';

        if (!targetId) {
          if (active) {
            setProfile(null);
            setErrorMsg(
              authUser?.email
                ? `Nessun profilo trovato in gos_profiles per ${authUser.email}.`
                : 'Nessun utente loggato e nessun ID profilo specificato.'
            );
          }
          return;
        }

        const res = await fetch(`/api/utenti/${encodeURIComponent(targetId)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || 'Errore nel caricamento del profilo.');
        }

        const targetRow = json.profile;
        if (!targetRow) {
          throw new Error('Profilo non trovato.');
        }

        if (active) {
          const normalizedRole = normalizeGosRole(
            targetRow.ruolo || targetRow.role || 'user Guest'
          );
          const defaults = resolveGosPermissions({ ruolo: normalizedRole });

          setProfile(targetRow);
          setUtente(targetRow.full_name || targetRow.nome || '');
          setEmail(targetRow.email || '');
          setRuolo(normalizedRole);
          setStato(targetRow.stato || targetRow.status || 'ATTIVO');
          setPermessi({
            aziende: targetRow.permessi?.aziende ?? true,
            questionari: targetRow.permessi?.questionari ?? true,
            offerte: targetRow.permessi?.offerte ?? true,
            utenti: targetRow.permessi?.utenti ?? normalizedRole === 'superadmin',
          });

          setCanDeleteAziende(
            typeof targetRow.can_delete_aziende === 'boolean'
              ? targetRow.can_delete_aziende
              : defaults.canDeleteAziende
          );
          setCanEditOfferte(
            typeof targetRow.can_edit_offerte === 'boolean'
              ? targetRow.can_edit_offerte
              : defaults.canEditOfferte
          );
          setCanDeleteOfferte(
            typeof targetRow.can_delete_offerte === 'boolean'
              ? targetRow.can_delete_offerte
              : defaults.canDeleteOfferte
          );
          setCanExportData(
            typeof targetRow.can_export_data === 'boolean'
              ? targetRow.can_export_data
              : defaults.canExportData
          );
          setCanDeleteProgetti(
            typeof targetRow.can_delete_progetti === 'boolean'
              ? targetRow.can_delete_progetti
              : defaults.canDeleteProgetti
          );
          setCanDeleteDocumenti(
            typeof targetRow.can_delete_documenti === 'boolean'
              ? targetRow.can_delete_documenti
              : defaults.canDeleteDocumenti
          );
          setCanDeleteFile(
            typeof targetRow.can_delete_file === 'boolean'
              ? targetRow.can_delete_file
              : defaults.canDeleteFile
          );
        }
      } catch (err: any) {
        if (active) {
          setErrorMsg(err?.message || 'Errore nel caricamento del profilo.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfileData();
    return () => {
      active = false;
    };
  }, [targetIdFromQuery, supabase]);

  const handleRoleChange = (nextRoleRaw: string) => {
    const nextRole = normalizeGosRole(nextRoleRaw);
    const defaults = resolveGosPermissions({ ruolo: nextRole });
    setRuolo(nextRole);
    setCanDeleteAziende(defaults.canDeleteAziende);
    setCanEditOfferte(defaults.canEditOfferte);
    setCanDeleteOfferte(defaults.canDeleteOfferte);
    setCanExportData(defaults.canExportData);
    setCanDeleteProgetti(defaults.canDeleteProgetti);
    setCanDeleteDocumenti(defaults.canDeleteDocumenti);
    setCanDeleteFile(defaults.canDeleteFile);
    if (nextRole === 'superadmin') {
      setPermessi((prev) => ({ ...prev, utenti: true }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isSuperAdmin) return;
    setSaving(true);

    try {
      const normalizedRole = normalizeGosRole(ruolo);
      const res = await fetch(`/api/utenti/${encodeURIComponent(profile.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorRole: loggedInProfile?.ruolo || loggedInProfile?.role || 'user Guest',
          updates: {
            utente,
            email,
            ruolo: normalizedRole,
            stato,
            permessi,
            can_delete_aziende: canDeleteAziende,
            can_edit_offerte: canEditOfferte,
            can_delete_offerte: canDeleteOfferte,
            can_export_data: canExportData,
            can_delete_progetti: canDeleteProgetti,
            can_delete_documenti: canDeleteDocumenti,
            can_delete_file: canDeleteFile,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Errore durante il salvataggio.');
      }

      setProfile(json.profile);
      alert('Profilo e permessi aggiornati su Supabase.');
    } catch (err: any) {
      alert('Errore durante il salvataggio: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!isSuperAdmin || !email) return;
    setSendingReset(true);

    try {
      const res = await fetch('/api/utenti/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          actorRole: loggedInProfile?.ruolo || loggedInProfile?.role || 'user Guest',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Errore reset password.');
      alert(`Email di reset password inviata a ${email}.`);
    } catch (err: any) {
      alert('Errore reset password: ' + (err?.message || err));
    } finally {
      setSendingReset(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-300 p-8 font-mono text-xs">
        Caricamento profilo da gos_profiles...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-8">
        <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-none p-6 space-y-4">
          <div className="text-xs font-bold text-red-400">
            {errorMsg || 'Profilo utente non trovato.'}
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold uppercase rounded-none"
          >
            ← Torna alla Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const isOnline =
    typeof profile.is_online === 'boolean'
      ? profile.is_online
      : profile.last_seen_at
      ? Date.now() - new Date(profile.last_seen_at).getTime() <= 5 * 60 * 1000
      : false;

  const isSelfProfile =
    loggedInProfile &&
    (loggedInProfile.id === profile.id ||
      (loggedInProfile.email &&
        profile.email &&
        loggedInProfile.email.toLowerCase() === profile.email.toLowerCase()));

  const granularPermissions = [
    {
      label: 'Eliminare Aziende (can_delete_aziende)',
      checked: canDeleteAziende,
      onChange: setCanDeleteAziende,
    },
    {
      label: 'Modificare Offerte (can_edit_offerte)',
      checked: canEditOfferte,
      onChange: setCanEditOfferte,
    },
    {
      label: 'Eliminare Offerte (can_delete_offerte)',
      checked: canDeleteOfferte,
      onChange: setCanDeleteOfferte,
    },
    {
      label: 'Esportare Dati (can_export_data)',
      checked: canExportData,
      onChange: setCanExportData,
    },
    {
      label: 'Eliminare Progetti (can_delete_progetti)',
      checked: canDeleteProgetti,
      onChange: setCanDeleteProgetti,
    },
    {
      label: 'Eliminare Documenti (can_delete_documenti)',
      checked: canDeleteDocumenti,
      onChange: setCanDeleteDocumenti,
    },
    {
      label: 'Eliminare File (can_delete_file)',
      checked: canDeleteFile,
      onChange: setCanDeleteFile,
    },
  ];

  const extraEntries = Object.entries(profile).filter(
    ([key]) =>
      ![
        'id',
        'codice_utente',
        'email',
        'full_name',
        'nome',
        'role',
        'ruolo',
        'stato',
        'status',
        'permessi',
        'is_online',
        'last_seen_at',
        'can_delete_aziende',
        'can_edit_offerte',
        'can_delete_offerte',
        'can_export_data',
        'can_delete_progetti',
        'can_delete_documenti',
        'can_delete_file',
      ].includes(key)
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-800 rounded-none p-6 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="space-y-1">
            <div className="text-[11px] font-mono text-amber-400 uppercase">
              {profile.codice_utente || 'USR-00000'}
            </div>
            <h1 className="text-lg font-black uppercase tracking-wider inline-flex items-center gap-2">
              <span
                title={isOnline ? 'In linea' : 'Non in linea'}
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '9999px',
                  backgroundColor: isOnline ? '#10b981' : '#ef4444',
                  display: 'inline-block',
                }}
              />
              <span>{utente || email || profile.id}</span>
            </h1>
            <p className="text-xs text-gray-400">
              {isSelfProfile
                ? 'Profilo dell’utente attualmente loggato'
                : 'Scheda dettaglio profilo selezionato'}{' '}
              • Sessione attiva:{' '}
              <strong className="text-gray-200">
                {loggedInProfile?.email || 'Non autenticato'}
              </strong>{' '}
              ({actorRole || 'ospite'})
            </p>
          </div>

          <div className="flex items-center gap-2">
            {targetIdFromQuery && loggedInProfile && !isSelfProfile && (
              <Link
                href="/profile"
                className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-amber-300 text-xs font-bold uppercase rounded-none"
              >
                Mio Profilo
              </Link>
            )}
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold uppercase rounded-none cursor-pointer"
            >
              ← Indietro
            </button>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                Utente
              </label>
              <input
                type="text"
                disabled={!isSuperAdmin}
                value={utente}
                onChange={(e) => setUtente(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                Email
              </label>
              <input
                type="email"
                disabled={!isSuperAdmin}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs disabled:opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                Ruolo
              </label>
              <select
                disabled={!isSuperAdmin}
                value={ruolo}
                onChange={(e) => handleRoleChange(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs disabled:opacity-60"
              >
                {GOS_ROLES.map((roleOption) => (
                  <option key={roleOption} value={roleOption}>
                    {roleOption}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                Stato
              </label>
              <select
                disabled={!isSuperAdmin}
                value={stato}
                onChange={(e) => setStato(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-none text-white text-xs disabled:opacity-60"
              >
                <option value="ATTIVO">ATTIVO</option>
                <option value="SOSPESO">SOSPESO</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2 font-bold uppercase text-[10px]">
              Permessi Sezioni
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-950 border border-gray-800 p-3 rounded-none text-xs">
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
                    disabled={!isSuperAdmin}
                    checked={permessi[key]}
                    onChange={(e) =>
                      setPermessi((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                    className="rounded-none"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-400 mb-2 font-bold uppercase text-[10px]">
              Permessi Operativi (Eliminazione, Offerte, Export, Progetti, Documenti, File)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-950 border border-gray-800 p-3 rounded-none text-xs">
              {granularPermissions.map((item) => (
                <label key={item.label} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={!isSuperAdmin}
                    checked={item.checked}
                    onChange={(e) => item.onChange(e.target.checked)}
                    className="rounded-none"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {extraEntries.length > 0 && (
            <div className="bg-gray-950 border border-gray-800 rounded-none p-4 space-y-2">
              <div className="text-[10px] font-mono uppercase text-gray-400 font-bold">
                Altri Attributi Profilo (gos_profiles)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                {extraEntries.map(([key, val]) => (
                  <div key={key} className="border border-gray-800/80 p-2">
                    <span className="text-gray-400">{key}: </span>
                    <span className="text-gray-200">
                      {typeof val === 'object' && val !== null
                        ? JSON.stringify(val)
                        : String(val ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-800">
            {isSuperAdmin ? (
              <button
                type="button"
                disabled={sendingReset}
                onClick={handlePasswordReset}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase rounded-none cursor-pointer"
              >
                {sendingReset ? 'Invio reset...' : 'Reset Password'}
              </button>
            ) : (
              <span className="text-[11px] font-mono text-gray-500">
                Solo i profili superadmin possono modificare dati, permessi o inviare reset password.
              </span>
            )}

            {isSuperAdmin && (
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase rounded-none cursor-pointer"
              >
                {saving ? 'Salvataggio...' : 'Salva Modifiche'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950 text-gray-300 p-8 font-mono text-xs">
          Caricamento pagina profilo...
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  );
}
