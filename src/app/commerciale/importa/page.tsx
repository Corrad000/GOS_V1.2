'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

const GOS_COLUMNS = [
  { key: 'ragione_sociale', label: 'Ragione Sociale *', required: true },
  { key: 'codice_azienda', label: 'Codice Azienda (AZ-XXXXX)', required: false },
  { key: 'partita_iva', label: 'Partita IVA', required: false },
  { key: 'codice_fiscale', label: 'Codice Fiscale', required: false },
  { key: 'categoria', label: 'Categoria', required: false },
  { key: 'sito_web', label: 'Sito Web', required: false },
  { key: 'citta', label: 'Città', required: false },
  { key: 'nazione', label: 'Nazione', required: false },
  { key: 'indirizzo', label: 'Indirizzo', required: false },
  { key: 'cap', label: 'CAP', required: false },
  { key: 'referente', label: 'Referente', required: false },
  { key: 'email', label: 'Email', required: false },
  { key: 'telefono', label: 'Telefono', required: false },
  { key: 'advisor_nome', label: 'Advisor', required: false },
  { key: 'fatturato', label: 'Fatturato', required: false },
  { key: 'contratti_attivi', label: 'Contratti Attivi', required: false },
  { key: 'stato', label: 'Stato', required: false },
  { key: 'note', label: 'Note', required: false },
] as const;

type ColumnKey = (typeof GOS_COLUMNS)[number]['key'];
type RowDraft = Record<ColumnKey, string>;

interface EvaluatedRow {
  index: number;
  data: RowDraft;
  resolvedCode: string;
  dedupeKey: string | null;
  isDuplicate: boolean;
  duplicateReason: string | null;
  missingInfoWarnings: string[];
  hasMissingName: boolean;
  canImport: boolean;
}

function emptyRow(): RowDraft {
  return {
    ragione_sociale: '',
    codice_azienda: '',
    partita_iva: '',
    codice_fiscale: '',
    categoria: '',
    sito_web: '',
    citta: '',
    nazione: '',
    indirizzo: '',
    cap: '',
    referente: '',
    email: '',
    telefono: '',
    advisor_nome: '',
    fatturato: '',
    contratti_attivi: '',
    stato: '',
    note: '',
  };
}

function normalizeCompanyCode(rawCode: string, usedCodes: Set<string>): string {
  const trimmed = (rawCode || '').trim().toUpperCase();
  const match = trimmed.match(/^AZ[-_\s]?(\d{1,6})$/);
  if (match) {
    const candidate = `AZ-${match[1].padStart(5, '0')}`;
    if (!usedCodes.has(candidate)) {
      usedCodes.add(candidate);
      return candidate;
    }
  }

  let generated = '';
  let attempts = 0;
  do {
    const num = Math.floor(10000 + Math.random() * 90000);
    generated = `AZ-${num}`;
    attempts++;
  } while (usedCodes.has(generated) && attempts < 100);

  usedCodes.add(generated);
  return generated;
}

function computeDedupeKeyClient(row: RowDraft): string | null {
  const cleanPiva = (row.partita_iva || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleanPiva.length >= 5) {
    return `piva:${cleanPiva}`;
  }

  const cleanCf = (row.codice_fiscale || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleanCf.length >= 6) {
    return `cf:${cleanCf}`;
  }

  let cleanDomain = (row.sito_web || '').trim().toLowerCase();
  cleanDomain = cleanDomain.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0].trim();
  if (cleanDomain.length >= 3) {
    return `domain:${cleanDomain}`;
  }

  let cleanName = (row.ragione_sociale || '').trim().toLowerCase();
  cleanName = cleanName.replace(
    /\b(s\.?r\.?l\.?|s\.?p\.?a\.?|s\.?n\.?c\.?|s\.?a\.?s\.?|l\.?l\.?p\.?|ltd|inc|fzco|dmcc)\b/gi,
    ''
  );
  cleanName = cleanName.replace(/[^a-z0-9]+/g, '');
  if (cleanName.length > 0) {
    return `name:${cleanName}`;
  }

  return null;
}

function parseColumnLines(raw: string): string[] {
  if (!raw) return [];
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  return lines.map((line) => line.trim());
}

function parseCsvText(text: string): RowDraft[] {
  const cleaned = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semicolonCount >= commaCount ? ';' : ',';

  const splitLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = splitLine(lines[0]).map((h) => h.toLowerCase().trim());
  const rows: RowDraft[] = [];

  for (let r = 1; r < lines.length; r++) {
    const values = splitLine(lines[r]);
    const draft = emptyRow();
    let hasAnyValue = false;

    headers.forEach((header, idx) => {
      const matchedCol = GOS_COLUMNS.find((c) => c.key === header);
      if (matchedCol) {
        const val = values[idx] ?? '';
        draft[matchedCol.key] = val;
        if (val.trim() !== '') hasAnyValue = true;
      }
    });

    if (hasAnyValue) {
      rows.push(draft);
    }
  }

  return rows;
}

export default function ImportaAziendePage() {
  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [mode, setMode] = useState<'columns' | 'csv'>('columns');
  const [columnInputs, setColumnInputs] = useState<Record<ColumnKey, string>>(() => {
    const initial = {} as Record<ColumnKey, string>;
    for (const col of GOS_COLUMNS) {
      initial[col.key] = '';
    }
    return initial;
  });

  const [csvRows, setCsvRows] = useState<RowDraft[]>([]);
  const [existingDedupeKeys, setExistingDedupeKeys] = useState<Set<string>>(new Set());
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
  const [checkingDb, setCheckingDb] = useState(false);
  const [importing, setImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  const activeRows: RowDraft[] = useMemo(() => {
    if (mode === 'csv') {
      return csvRows;
    }

    const parsedByCol = {} as Record<ColumnKey, string[]>;
    let maxLen = 0;
    for (const col of GOS_COLUMNS) {
      const lines = parseColumnLines(columnInputs[col.key] || '');
      parsedByCol[col.key] = lines;
      if (lines.length > maxLen) {
        maxLen = lines.length;
      }
    }

    const built: RowDraft[] = [];
    for (let i = 0; i < maxLen; i++) {
      const row = emptyRow();
      let nonEmpty = false;
      for (const col of GOS_COLUMNS) {
        const val = parsedByCol[col.key][i] ?? '';
        row[col.key] = val;
        if (val !== '') nonEmpty = true;
      }
      if (nonEmpty) {
        built.push(row);
      }
    }
    return built;
  }, [mode, csvRows, columnInputs]);

  const evaluatedRows: EvaluatedRow[] = useMemo(() => {
    const seenInBatch = new Set<string>();
    const usedCodes = new Set<string>(existingCodes);

    return activeRows.map((data, index) => {
      const resolvedCode = normalizeCompanyCode(data.codice_azienda, usedCodes);
      const dedupeKey = computeDedupeKeyClient(data);
      let isDuplicate = false;
      let duplicateReason: string | null = null;

      if (dedupeKey) {
        if (existingDedupeKeys.has(dedupeKey)) {
          isDuplicate = true;
          duplicateReason = `Già presente in gos_aziende (${dedupeKey})`;
        } else if (seenInBatch.has(dedupeKey)) {
          isDuplicate = true;
          duplicateReason = `Duplicato nello stesso import (${dedupeKey})`;
        } else {
          seenInBatch.add(dedupeKey);
        }
      }

      const hasMissingName = !data.ragione_sociale || data.ragione_sociale.trim() === '';
      const missingInfoWarnings: string[] = [];
      if (!data.partita_iva.trim() && !data.codice_fiscale.trim()) {
        missingInfoWarnings.push('P.IVA / C.F.');
      }
      if (!data.sito_web.trim()) {
        missingInfoWarnings.push('Sito web');
      }
      if (!data.email.trim() && !data.telefono.trim()) {
        missingInfoWarnings.push('Contatti (email/tel)');
      }
      if (!data.referente.trim()) {
        missingInfoWarnings.push('Referente');
      }
      if (!data.citta.trim()) {
        missingInfoWarnings.push('Città');
      }

      const canImport = !hasMissingName && !isDuplicate;

      return {
        index,
        data,
        resolvedCode,
        dedupeKey,
        isDuplicate,
        duplicateReason,
        missingInfoWarnings,
        hasMissingName,
        canImport,
      };
    });
  }, [activeRows, existingDedupeKeys, existingCodes]);

  const summary = useMemo(() => {
    const total = evaluatedRows.length;
    const duplicates = evaluatedRows.filter((r) => r.isDuplicate).length;
    const missingName = evaluatedRows.filter((r) => r.hasMissingName).length;
    const withWarnings = evaluatedRows.filter((r) => r.canImport && r.missingInfoWarnings.length > 0).length;
    const ready = evaluatedRows.filter((r) => r.canImport).length;
    return { total, duplicates, missingName, withWarnings, ready };
  }, [evaluatedRows]);

  const handleCheckDuplicatesOnDb = async () => {
    const keys = Array.from(
      new Set(
        activeRows
          .map((r) => computeDedupeKeyClient(r))
          .filter((k): k is string => Boolean(k))
      )
    );

    setCheckingDb(true);
    setStatusMessage(null);

    try {
      const { data: existingCodesData, error: codesError } = await supabase
        .from('gos_aziende')
        .select('codice_azienda')
        .not('codice_azienda', 'is', null);

      if (codesError) throw codesError;

      const codeSet = new Set<string>(
        (existingCodesData || [])
          .map((item: { codice_azienda: string | null }) => (item.codice_azienda || '').trim().toUpperCase())
          .filter((c): c is string => Boolean(c))
      );
      setExistingCodes(codeSet);

      if (keys.length === 0) {
        setExistingDedupeKeys(new Set());
        setStatusMessage({
          type: 'info',
          text: 'Codici AZ-XXXXX sincronizzati. Nessuna chiave identificativa da verificare per duplicati.',
        });
        return;
      }

      const { data, error } = await supabase
        .from('gos_aziende')
        .select('dedupe_key')
        .in('dedupe_key', keys);

      if (error) throw error;

      const found = new Set<string>(
        (data || [])
          .map((item: { dedupe_key: string | null }) => item.dedupe_key)
          .filter((k): k is string => Boolean(k))
      );

      setExistingDedupeKeys(found);
      setStatusMessage({
        type: 'info',
        text: `Verifica completata: trovati ${found.size} duplicati già presenti in gos_aziende. Codici AZ-XXXXX allineati.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante la verifica su Supabase.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setCheckingDb(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headerLine = GOS_COLUMNS.map((c) => c.key).join(';');
    const exampleLine = [
      'Azienda Esempio Srl',
      '',
      '01234560921',
      '',
      'Servizi B2B',
      'https://aziendaesempio.it',
      'Cagliari',
      'IT',
      '',
      '',
      'Mario Rossi',
      'info@aziendaesempio.it',
      '+39070123456',
      '',
      '',
      '',
      'ATTIVA',
      '',
    ].join(';');

    const csvContent = `\uFEFF${headerLine}\n${exampleLine}\n`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_import_gos_aziende.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsvText(text);
    setCsvRows(parsed);
    setMode('csv');
    setExistingDedupeKeys(new Set());
    setStatusMessage({
      type: 'info',
      text: `Caricate ${parsed.length} righe da "${file.name}". Controlla l'anteprima prima di importare.`,
    });
  };

  const handleImportToSupabase = async () => {
    const rowsToInsert = evaluatedRows
      .filter((r) => r.canImport)
      .map((r) => {
        const d = r.data;
        const payload: Record<string, unknown> = {
          ragione_sociale: d.ragione_sociale.trim(),
          codice_azienda: r.resolvedCode,
          advisor_nome: d.advisor_nome.trim() ? d.advisor_nome.trim() : null,
          fatturato: null,
          contratti_attivi: null,
        };

        if (d.partita_iva.trim()) payload.partita_iva = d.partita_iva.trim();
        if (d.codice_fiscale.trim()) payload.codice_fiscale = d.codice_fiscale.trim();
        if (d.categoria.trim()) payload.categoria = d.categoria.trim();
        if (d.sito_web.trim()) payload.sito_web = d.sito_web.trim();
        if (d.citta.trim()) payload.citta = d.citta.trim();
        if (d.nazione.trim()) payload.nazione = d.nazione.trim();
        if (d.indirizzo.trim()) payload.indirizzo = d.indirizzo.trim();
        if (d.cap.trim()) payload.cap = d.cap.trim();
        if (d.referente.trim()) payload.referente = d.referente.trim();
        if (d.email.trim()) payload.email = d.email.trim();
        if (d.telefono.trim()) payload.telefono = d.telefono.trim();
        if (d.stato.trim()) payload.stato = d.stato.trim();
        if (d.note.trim()) payload.note = d.note.trim();

        const fatturatoNum = Number(d.fatturato.replace(',', '.').replace(/[^0-9.-]/g, ''));
        if (d.fatturato.trim() !== '' && !Number.isNaN(fatturatoNum)) {
          payload.fatturato = fatturatoNum;
        }

        const contrattiNum = parseInt(d.contratti_attivi.replace(/[^0-9-]/g, ''), 10);
        if (d.contratti_attivi.trim() !== '' && !Number.isNaN(contrattiNum)) {
          payload.contratti_attivi = contrattiNum;
        }

        return payload;
      });

    if (rowsToInsert.length === 0) {
      setStatusMessage({
        type: 'error',
        text: 'Nessuna riga importabile (verifica che ci sia la Ragione Sociale e non sia un duplicato).',
      });
      return;
    }

    setImporting(true);
    setStatusMessage(null);

    try {
      const { error } = await supabase.from('gos_aziende').insert(rowsToInsert);
      if (error) throw error;

      setStatusMessage({
        type: 'success',
        text: `Importate ${rowsToInsert.length} aziende con codifica AZ-XXXXX (advisor, fatturato e contratti attivi lasciati vuoti se non indicati). Duplicati saltati: ${summary.duplicates}.`,
      });
      setExistingDedupeKeys(new Set());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Errore durante il salvataggio su Supabase.';
      setStatusMessage({ type: 'error', text: msg });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="w-full space-y-4">
      <div className="bg-[#0F172A] border border-[#1E293B] p-[10px] flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-lg font-extrabold uppercase tracking-wide text-white">
            Area Commerciale — Importazione Aziende
          </h1>
          <p className="text-xs text-[#94A3B8]">
            Codifica automatica AZ-XXXXX. Nessun valore di default su advisor, fatturato o contratti attivi se non inseriti.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-white cursor-pointer"
          >
            Scarica Template CSV
          </button>
          <Link
            href="/dashboard"
            className="px-3 py-2 bg-[#1E293B] hover:bg-[#334155] border border-[#334155] text-xs font-bold text-white"
          >
            Torna alla Dashboard
          </Link>
        </div>
      </div>

      {/* Selettore modalità */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-[10px] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMode('columns')}
            className={`px-3 py-2 text-xs font-bold border cursor-pointer ${
              mode === 'columns'
                ? 'bg-[#EA580C] border-[#EA580C] text-white'
                : 'bg-[#050B14] border-[#1E293B] text-[#94A3B8]'
            }`}
          >
            1. Incolla per Colonna
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('csv');
              fileInputRef.current?.click();
            }}
            className={`px-3 py-2 text-xs font-bold border cursor-pointer ${
              mode === 'csv'
                ? 'bg-[#EA580C] border-[#EA580C] text-white'
                : 'bg-[#050B14] border-[#1E293B] text-[#94A3B8]'
            }`}
          >
            2. Carica File CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvFileChange}
            className="hidden"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCheckDuplicatesOnDb}
            disabled={checkingDb || activeRows.length === 0}
            className="px-3 py-2 bg-[#1E293B] hover:bg-[#334155] disabled:opacity-50 border border-[#334155] text-xs font-bold text-white cursor-pointer"
          >
            {checkingDb ? 'Verifica in corso...' : 'Verifica Duplicati su Supabase'}
          </button>
          <button
            type="button"
            onClick={handleImportToSupabase}
            disabled={importing || summary.ready === 0}
            className="px-4 py-2 bg-[#EA580C] hover:bg-orange-700 disabled:opacity-50 border border-[#EA580C] text-xs font-extrabold uppercase text-white cursor-pointer"
          >
            {importing ? 'Importazione...' : `Importa (${summary.ready})`}
          </button>
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-[10px] border text-xs font-bold ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/50 border-emerald-700 text-emerald-300'
              : statusMessage.type === 'error'
              ? 'bg-red-950/50 border-red-700 text-red-300'
              : 'bg-[#0F172A] border-amber-600 text-amber-300'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Modalità Incolla per Colonna */}
      {mode === 'columns' && (
        <div className="bg-[#0F172A] border border-[#1E293B] p-[10px] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-[#94A3B8]">
              Incolla una lista verticale per colonna (ogni riga = 1 azienda, allineata per riga)
            </span>
            <button
              type="button"
              onClick={() => {
                const cleared = {} as Record<ColumnKey, string>;
                for (const col of GOS_COLUMNS) cleared[col.key] = '';
                setColumnInputs(cleared);
                setExistingDedupeKeys(new Set());
              }}
              className="px-2.5 py-1 bg-[#050B14] border border-[#1E293B] text-[11px] text-[#94A3B8] hover:text-white cursor-pointer"
            >
              Svuota Colonne
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-[10px]">
            {GOS_COLUMNS.map((col) => {
              const count = parseColumnLines(columnInputs[col.key] || '').length;
              return (
                <div key={col.key} className="bg-[#050B14] border border-[#1E293B] p-[8px] flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-white">{col.label}</label>
                    <span className="text-[10px] text-[#94A3B8]">{count} righe</span>
                  </div>
                  <textarea
                    value={columnInputs[col.key]}
                    onChange={(e) =>
                      setColumnInputs((prev) => ({
                        ...prev,
                        [col.key]: e.target.value,
                      }))
                    }
                    rows={5}
                    placeholder={`Incolla ${col.key}...`}
                    className="w-full bg-[#0F172A] border border-[#1E293B] p-1.5 text-xs text-white focus:outline-none focus:border-[#EA580C]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Riepilogo Anteprima */}
      <div className="bg-[#0F172A] border border-[#1E293B] p-[10px] flex flex-wrap items-center gap-4 text-xs">
        <span>Righe rilevate: <strong>{summary.total}</strong></span>
        <span className="text-emerald-400">Importabili: <strong>{summary.ready}</strong></span>
        <span className="text-amber-300">Alert info mancanti (non bloccante): <strong>{summary.withWarnings}</strong></span>
        <span className="text-red-400">Duplicati bloccati: <strong>{summary.duplicates}</strong></span>
        <span className="text-red-400">Senza Ragione Sociale: <strong>{summary.missingName}</strong></span>
      </div>

      {/* Tabella Anteprima */}
      <div className="bg-[#0F172A] border border-[#1E293B] overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-2">#</th>
              <th className="p-2">Esito / Controllo</th>
              <th className="p-2">Codice</th>
              <th className="p-2">Ragione Sociale</th>
              <th className="p-2">P.IVA</th>
              <th className="p-2">Sito Web</th>
              <th className="p-2">Città</th>
              <th className="p-2">Referente / Contatti</th>
              <th className="p-2">Note / Alert</th>
            </tr>
          </thead>
          <tbody>
            {evaluatedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-4 text-center text-[#94A3B8]">
                  Nessuna riga da mostrare. Incolla dati nelle colonne oppure carica un file CSV.
                </td>
              </tr>
            ) : (
              evaluatedRows.map((row) => (
                <tr key={row.index} className="border-t border-[#1E293B]">
                  <td className="p-2 text-[#94A3B8]">{row.index + 1}</td>
                  <td className="p-2 font-bold whitespace-nowrap">
                    {row.hasMissingName ? (
                      <span className="text-red-400">BLOCCATA (Manca Ragione Sociale)</span>
                    ) : row.isDuplicate ? (
                      <span className="text-red-400">DUPLICATO BLOCCATO</span>
                    ) : row.missingInfoWarnings.length > 0 ? (
                      <span className="text-amber-300">OK CON ALERT</span>
                    ) : (
                      <span className="text-emerald-400">PRONTO</span>
                    )}
                  </td>
                  <td className="p-2 font-bold text-amber-300">{row.resolvedCode}</td>
                  <td className="p-2 font-bold">{row.data.ragione_sociale || '—'}</td>
                  <td className="p-2">{row.data.partita_iva || '—'}</td>
                  <td className="p-2">{row.data.sito_web || '—'}</td>
                  <td className="p-2">{row.data.citta || '—'}</td>
                  <td className="p-2">
                    {[row.data.referente, row.data.email, row.data.telefono].filter(Boolean).join(' · ') || '—'}
                  </td>
                  <td className="p-2 text-[11px]">
                    {row.duplicateReason && (
                      <div className="text-red-400">{row.duplicateReason}</div>
                    )}
                    {row.missingInfoWarnings.length > 0 && !row.isDuplicate && (
                      <div className="text-amber-300">
                        Info mancanti (aggiornabili dopo): {row.missingInfoWarnings.join(', ')}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
