'use client';

import React, { useState, useEffect } from 'react';
import {
  listAziendeOptions,
  upsertContatto,
  splitNomeCognome,
  type GosContatto,
} from './contactsService';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  onSaved?: (contact: GosContatto) => void;
  initialContact?: GosContatto | null;
  defaultAziendaId?: string | null;
  defaultAziendaNome?: string | null;
}

const COUNTRY_OPTIONS = [
  { name: 'Italia', dial: '+39', iso: 'IT' },
  { name: 'Regno Unito', dial: '+44', iso: 'GB' },
  { name: 'Emirati Arabi Uniti', dial: '+971', iso: 'AE' },
  { name: 'Svizzera', dial: '+41', iso: 'CH' },
  { name: 'Germania', dial: '+49', iso: 'DE' },
  { name: 'Francia', dial: '+33', iso: 'FR' },
  { name: 'Spagna', dial: '+34', iso: 'ES' },
  { name: 'Stati Uniti', dial: '+1', iso: 'US' },
  { name: 'Uzbekistan', dial: '+998', iso: 'UZ' },
  { name: 'Kazakistan', dial: '+7', iso: 'KZ' },
  { name: 'Tagikistan', dial: '+992', iso: 'TJ' },
  { name: 'Tunisia', dial: '+216', iso: 'TN' },
  { name: 'Altro', dial: '', iso: 'INTL' },
];

const DIAL_OPTIONS = Array.from(
  new Map(
    COUNTRY_OPTIONS.filter((c) => c.dial).map((c) => [c.dial, `${c.dial} (${c.iso})`])
  ).entries()
).map(([dial, label]) => ({ dial, label }));

function parseDialAndLocal(fullPhone?: string | null): { dial: string; local: string } {
  const raw = String(fullPhone || '').trim();
  if (!raw) return { dial: '+39', local: '' };

  const sortedByDialLength = [...COUNTRY_OPTIONS]
    .filter((c) => c.dial)
    .sort((a, b) => b.dial.length - a.dial.length);

  for (const c of sortedByDialLength) {
    if (raw.startsWith(c.dial)) {
      return {
        dial: c.dial,
        local: raw.slice(c.dial.length).trim(),
      };
    }
  }

  const match = raw.match(/^(\+\d{1,4})\s*(.*)$/);
  if (match) {
    return { dial: match[1], local: match[2].trim() };
  }

  return { dial: '', local: raw };
}

export function ContactModal({
  open,
  onClose,
  onSaved,
  initialContact = null,
  defaultAziendaId = null,
  defaultAziendaNome = null,
}: ContactModalProps) {
  const [fullName, setFullName] = useState('');
  const [ruolo, setRuolo] = useState('');
  const [aziendaId, setAziendaId] = useState<string>('');
  const [aziendaNome, setAziendaNome] = useState<string>('');
  const [countrySelect, setCountrySelect] = useState<string>('Italia');
  const [customCountry, setCustomCountry] = useState<string>('');
  const [dialCode, setDialCode] = useState<string>('+39');
  const [localPhone, setLocalPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [aziendeList, setAziendeList] = useState<Array<{ id: string; ragione_sociale: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void (async () => {
      const rows = await listAziendeOptions();
      setAziendeList(rows);
    })();

    const nameCombined = [initialContact?.nome, initialContact?.cognome]
      .filter(Boolean)
      .join(' ')
      .trim();

    const phoneParts = parseDialAndLocal(initialContact?.telefono);
    const savedCountry = (initialContact?.paese || 'Italia').trim();
    const isKnownCountry = COUNTRY_OPTIONS.some((c) => c.name === savedCountry && c.name !== 'Altro');

    setFullName(nameCombined);
    setRuolo(initialContact?.ruolo || '');
    setAziendaId(initialContact?.azienda_id || defaultAziendaId || '');
    setAziendaNome(initialContact?.azienda_nome || defaultAziendaNome || '');
    if (isKnownCountry) {
      setCountrySelect(savedCountry);
      setCustomCountry('');
    } else {
      setCountrySelect('Altro');
      setCustomCountry(savedCountry);
    }
    setDialCode(phoneParts.dial);
    setLocalPhone(phoneParts.local);
    setEmail(initialContact?.email || '');
    setNote(initialContact?.note || '');
  }, [open, initialContact, defaultAziendaId, defaultAziendaNome]);

  if (!open) return null;

  const effectiveCountry =
    countrySelect === 'Altro' ? customCountry.trim() || null : countrySelect || null;

  const handleCountryChange = (nextCountryName: string) => {
    setCountrySelect(nextCountryName);
    if (nextCountryName !== 'Altro') {
      setCustomCountry('');
    }
    const matched = COUNTRY_OPTIONS.find((c) => c.name === nextCountryName);
    if (matched && matched.dial) {
      setDialCode(matched.dial);
    }
  };

  const handleAziendaSelect = (selectedId: string) => {
    setAziendaId(selectedId);
    const found = aziendeList.find((a) => a.id === selectedId);
    if (found) {
      setAziendaNome(found.ragione_sociale);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { nome, cognome } = splitNomeCognome(fullName);
    if (!nome && !cognome) return;

    setSaving(true);
    const combinedPhone = [dialCode.trim(), localPhone.trim()].filter(Boolean).join(' ').trim();

    const saved = await upsertContatto({
      id: initialContact?.id || null,
      nome,
      cognome,
      ruolo,
      telefono: combinedPhone || null,
      paese: effectiveCountry,
      email,
      note,
      aziendaId: aziendaId || null,
      aziendaNome: aziendaNome || null,
      origine: initialContact?.origine || 'manuale',
    });
    setSaving(false);

    if (saved) {
      onSaved?.(saved);
      onClose();
    } else {
      alert('Errore durante il salvataggio del contatto.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl border border-gray-800 bg-gray-900 p-6 text-gray-100 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold uppercase tracking-wide text-white">
              Aggiungi o Aggiorna Contatto
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              Se email o nominativo esistono già, il contatto viene aggiornato senza duplicati.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg px-2 py-1 text-sm font-bold text-gray-400 hover:bg-gray-800 hover:text-white"
            aria-label="Chiudi"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Nome e Cognome *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Digita per verificare se già presente in rubrica..."
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3.5 py-2.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Azienda
              </label>
              <select
                value={aziendaId}
                onChange={(e) => handleAziendaSelect(e.target.value)}
                className="mb-1.5 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
              >
                <option value="">-- Seleziona da aziende --</option>
                {aziendeList.map((az) => (
                  <option key={az.id} value={az.id}>
                    {az.ragione_sociale}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={aziendaNome}
                onChange={(e) => setAziendaNome(e.target.value)}
                placeholder="Oppure scrivi nome azienda..."
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Paese
              </label>
              <select
                value={countrySelect}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="mb-1.5 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
              >
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name} {c.dial ? `(${c.dial})` : ''}
                  </option>
                ))}
              </select>
              {countrySelect === 'Altro' && (
                <input
                  type="text"
                  value={customCountry}
                  onChange={(e) => setCustomCountry(e.target.value)}
                  placeholder="Scrivi il paese..."
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Ruolo Aziendale
              </label>
              <input
                type="text"
                value={ruolo}
                onChange={(e) => setRuolo(e.target.value)}
                placeholder="Es. CEO, CFO, Direttore Commerciale"
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3.5 py-2.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Telefono (Prefisso + Numero)
              </label>
              <div className="flex gap-2">
                <select
                  aria-label="Prefisso internazionale"
                  value={DIAL_OPTIONS.some((d) => d.dial === dialCode) ? dialCode : ''}
                  onChange={(e) => {
                    if (e.target.value) setDialCode(e.target.value);
                  }}
                  className="w-24 shrink-0 rounded-xl border border-gray-700 bg-gray-950 px-2 py-2.5 font-mono text-xs text-white focus:border-[#FF5500] focus:outline-none"
                >
                  <option value="">Pref.</option>
                  {DIAL_OPTIONS.map((d) => (
                    <option key={d.dial} value={d.dial}>
                      {d.dial}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                  placeholder="+39"
                  aria-label="Prefisso manuale"
                  className="w-16 shrink-0 rounded-xl border border-gray-700 bg-gray-950 px-2 py-2.5 font-mono text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
                <input
                  type="tel"
                  value={localPhone}
                  onChange={(e) => setLocalPhone(e.target.value)}
                  placeholder="Numero..."
                  className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@azienda.it"
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3.5 py-2.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Note
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3.5 py-2.5 text-xs text-white focus:border-[#FF5500] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-bold text-gray-200 hover:bg-gray-700"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={saving}
              className="cursor-pointer rounded-xl bg-[#FF5500] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Salva Contatto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
