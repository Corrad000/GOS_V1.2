'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  searchContatti,
  upsertContatto,
  splitNomeCognome,
  type GosContatto,
  type OrigineContatto,
} from './contactsService';

interface ContactAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelectContact?: (contact: GosContatto) => void;
  aziendaId?: string | null;
  aziendaNome?: string | null;
  origine?: OrigineContatto;
  defaultRuolo?: string;
  placeholder?: string;
  label?: string;
  className?: string;
  allowQuickSave?: boolean;
}

export function ContactAutocompleteInput({
  value,
  onChange,
  onSelectContact,
  aziendaId,
  aziendaNome,
  origine = 'manuale',
  defaultRuolo,
  placeholder = 'Digita nome, cognome, email o ruolo...',
  label,
  className = '',
  allowQuickSave = true,
}: ContactAutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<GosContatto[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingQuick, setSavingQuick] = useState(false);
  const [quickSavedMsg, setQuickSavedMsg] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (!open) return;

    let active = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      const found = await searchContatti(value, { aziendaId, limit: 10 });
      if (active) {
        setResults(found);
        setLoading(false);
      }
    }, 140);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [value, open, aziendaId]);

  const handlePick = (contact: GosContatto) => {
    const labelName = contact.nome_completo || `${contact.nome} ${contact.cognome}`.trim();
    onChange(labelName);
    onSelectContact?.(contact);
    setOpen(false);
    setQuickSavedMsg(null);
  };

  const handleQuickSave = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSavingQuick(true);
    setQuickSavedMsg(null);

    const { nome, cognome } = splitNomeCognome(trimmed);
    const saved = await upsertContatto({
      nome,
      cognome,
      ruolo: defaultRuolo || null,
      aziendaId: aziendaId || null,
      aziendaNome: aziendaNome || null,
      origine,
    });

    setSavingQuick(false);
    if (saved) {
      onSelectContact?.(saved);
      setQuickSavedMsg('Salvato in rubrica');
      setOpen(false);
    }
  };

  const trimmedVal = value.trim();
  const exactMatch = results.some(
    (c) => (c.nome_completo || '').toLowerCase() === trimmedVal.toLowerCase()
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <div className="flex items-center justify-between mb-1">
          <label className="block text-gray-400 font-bold uppercase text-[10px]">
            {label}
          </label>
          {quickSavedMsg && (
            <span className="text-[10px] font-semibold text-emerald-400">
              {quickSavedMsg}
            </span>
          )}
        </div>
      )}

      <input
        type="text"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setQuickSavedMsg(null);
          if (!open) setOpen(true);
        }}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
      />

      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border border-gray-700 bg-gray-900 shadow-2xl overflow-hidden">
          <div className="px-3 py-1.5 border-b border-gray-800 bg-gray-950/80 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
              Rubrica Contatti GOS
            </span>
            <span className="text-[10px] text-gray-500">
              {loading ? 'Ricerca...' : `${results.length} trovati`}
            </span>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-800/70">
            {results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handlePick(c)}
                className="w-full px-3.5 py-2.5 text-left hover:bg-gray-800/80 transition flex items-start justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {c.nome_completo}
                  </div>
                  <div className="text-[11px] text-gray-400 truncate">
                    {[c.ruolo, c.azienda_nome].filter(Boolean).join(' · ') || 'Contatto in rubrica'}
                  </div>
                  {(c.email || c.telefono) && (
                    <div className="text-[10px] font-mono text-gray-500 truncate mt-0.5">
                      {[c.email, c.telefono].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                <span className="shrink-0 px-2 py-0.5 rounded bg-gray-950 border border-gray-700 text-[9px] font-mono uppercase text-[#FF5500]">
                  Seleziona
                </span>
              </button>
            ))}

            {!loading && results.length === 0 && (
              <div className="px-3.5 py-3 text-xs text-gray-400">
                Nessun contatto corrispondente in rubrica.
              </div>
            )}
          </div>

          {allowQuickSave && trimmedVal.length >= 2 && !exactMatch && (
            <div className="p-2 border-t border-gray-800 bg-gray-950">
              <button
                type="button"
                disabled={savingQuick}
                onClick={handleQuickSave}
                className="w-full py-2 px-3 rounded-lg bg-[#FF5500]/15 hover:bg-[#FF5500]/25 border border-[#FF5500]/50 text-[#FF5500] text-[11px] font-bold transition cursor-pointer disabled:opacity-50"
              >
                {savingQuick
                  ? 'Salvataggio in rubrica...'
                  : `+ Salva "${trimmedVal}" in Rubrica Contatti`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
