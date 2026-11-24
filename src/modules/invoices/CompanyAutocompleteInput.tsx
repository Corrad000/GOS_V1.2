'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { InvoiceAziendaOption } from './invoiceService';

interface CompanyAutocompleteInputProps {
  companies: InvoiceAziendaOption[];
  value: string;
  onChange: (value: string) => void;
  onSelectCompany: (company: InvoiceAziendaOption) => void;
  placeholder?: string;
}

export function CompanyAutocompleteInput({
  companies,
  value,
  onChange,
  onSelectCompany,
  placeholder = 'Customer name (digita nome, codice, P.IVA o indirizzo...)',
}: CompanyAutocompleteInputProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return companies.slice(0, 12);
    return companies
      .filter((c) => {
        const hay = [
          c.ragione_sociale,
          (c as { codice_azienda?: string | null }).codice_azienda,
          c.vat_number,
          c.indirizzo,
          c.email,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return hay.includes(q);
      })
      .slice(0, 12);
  }, [companies, value]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [value, open]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handlePick = (company: InvoiceAziendaOption) => {
    onChange(company.ragione_sociale);
    onSelectCompany(company);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (!open || filtered.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handlePick(filtered[highlightedIndex] || filtered[0]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        required
        autoComplete="off"
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none"
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-xl border border-gray-700 bg-gray-900 shadow-2xl print:hidden">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-gray-400">
              Nessuna azienda trovata ({companies.length} totali). Puoi continuare a scrivere manualmente.
            </div>
          ) : (
            filtered.map((c, idx) => {
              const isActive = idx === highlightedIndex;
              const codice = (c as { codice_azienda?: string | null }).codice_azienda;
              return (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handlePick(c);
                  }}
                  onMouseEnter={() => setHighlightedIndex(idx)}
                  className={`flex w-full cursor-pointer items-center justify-between gap-2 px-3 py-2 text-left text-xs transition ${
                    isActive ? 'bg-[#FF5500]/20 text-white' : 'text-gray-200 hover:bg-gray-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="truncate font-bold text-white">{c.ragione_sociale}</div>
                    <div className="truncate text-[10px] text-gray-400">
                      {c.indirizzo || 'Indirizzo non indicato'}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-mono text-[10px] text-gray-400">
                    {codice && <div className="text-[#FF5500]">{codice}</div>}
                    {c.vat_number && <div>{c.vat_number}</div>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
