'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import {
  GOS_ROLES,
  normalizeGosRole,
  resolveGosPermissions,
} from '@/utils/gosPermissions';

interface UserDetailViewProps {
  forcedUserId?: string;
}

export function UserDetailView({ forcedUserId }: UserDetailViewProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const targetId = forcedUserId || params?.id || '';

  const [profile, setProfile] = useState<any | null>(null);
  const [actorRole, setActorRole] = useState<string>('user Guest');
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

  const isSuperAdmin = normalizeGosRole(actorRole) === 'superadmin';

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    let active = true;

    async function load() {
      if (!targetId) {
        setErrorMsg('ID utente non specificato.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMsg(null);

      try {
        const { data: authData } = await supabase.auth.getUser();
        const authUser = authData?.user;
        const authEmail = authUser?.email;

        if (authUser) {
          const { data: meById } = await supabase
            .from('gos_profiles')
            .select('ruolo')
            .eq('id', authUser.id)
            .maybeSingle();

          if (meById?.ruolo && active) {
            setActorRole(meById.ruolo);
          } else if (authEmail) {
            const { data: allProfs } = await supabase.from('gos_profiles').select('*');
            const me = (allProfs || []).find(
              (p: any) => (p.email || '').toLowerCase() === authEmail.toLowerCase()
            );
            if (me && active) {
              setActorRole(me.ruolo || me.role || 'user Guest');
            }
          }
        }

        const res = await fetch(`/api/utenti/${encodeURIComponent(targetId)}`, {
          cache: 'no-store',
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'Errore caricamento profilo.');

        const p = json.profile;
        if (!active) return;

        const normalizedRole = normalizeGosRole(p.ruolo || p.role || 'user Guest');
        const roleDefaults = resolveGosPermissions({ ruolo: normalizedRole });

        setProfile(p);
        setUtente(p.full_name || p.nome || '');
        setEmail(p.email || '');
        setRuolo(normalizedRole);
        setStato(p.stato || p.status || 'ATTIVO');
        setPermessi({
          aziende: p.permessi?.aziende ?? true,
          questionari: p.permessi?.questionari ?? true,
          offerte: p.permessi?.offerte ?? true,
          utenti: p.permessi?.utenti ?? normalizedRole === 'superadmin',
        });

        setCanDeleteAziende(
          typeof p.can_delete_aziende === 'boolean'
            ? p.can_delete_aziende
            : roleDefaults.canDeleteAziende
        );
        setCanEditOfferte(
          typeof p.can_edit_offerte === 'boolean'
            ? p.can_edit_offerte
            : roleDefaults.canEditOfferte
        );
        setCanDeleteOfferte(
          typeof p.can_delete_offerte === 'boolean'
            ? p.can_delete_offerte
            : roleDefaults.canDeleteOfferte
        );
        setCanExportData(
          typeof p.can_export_data === 'boolean'
            ? p.can_export_data
            : roleDefaults.canExportData
        );
      } catch (err: any) {
        if (active) setErrorMsg(err?.message || 'Errore nel caricamento del profilo.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [targetId, supabase]);

  const handleRoleChange = (nextRoleRaw: string) => {
    const nextRole = normalizeGosRole(nextRoleRaw);
    const defaults = resolveGosPermissions({ ruolo: nextRole });
    setRuolo(nextRole);
    setCanDeleteAziende(defaults.canDeleteAziende);
    setCanEditOfferte(defaults.canEditOfferte);
    setCanDeleteOfferte(defaults.canDeleteOfferte);
    setCanExportData(defaults.canExportData);
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
          actorRole,
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
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Errore aggiornamento profilo.');

      setProfile(json.profile);
      alert('Profilo e permessi salvati su Supabase.');
    } catch (err: any) {
      alert('Errore durante il salvataggio: ' + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!isSuperAdmin || !email) return;
    setSendingReset(true);

    try {
      const res = await fetch('/api/utenti/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, actorRole }),
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
        Caricamento dettaglio profilo...
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

  const granularItems = [
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
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-800 rounded-none p-6 space-y-6 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <div className="text-[11px] font-mono text-amber-400 uppercase">
              {profile.codice_utente || 'USR-00000'} • {profile.id}
            </div>
            <h1 className="text-lg font-black uppercase tracking-wider inline-flex items-center gap-2 mt-1">
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
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold uppercase rounded-none cursor-pointer"
          >
            ← Indietro
          </button>
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
              Permessi Operativi (Eliminazione, Offerte, Export)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-gray-950 border border-gray-800 p-3 rounded-none text-xs">
              {granularItems.map((item) => (
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

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-800">
            {isSuperAdmin ? (
              <button
                type="button"
                disabled={sendingReset}
                onClick={handleResetPassword}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase rounded-none cursor-pointer"
              >
                {sendingReset ? 'Invio reset...' : 'Reset Password'}
              </button>
            ) : (
              <span className="text-[11px] font-mono text-gray-500">
                Solo i profili superadmin possono modificare o inviare reset password.
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

export default function UtenteDettaglioPage() {
  return <UserDetailView />;
}
