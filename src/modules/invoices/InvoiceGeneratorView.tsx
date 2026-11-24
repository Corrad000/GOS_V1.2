'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { fatturePdfService } from '@/services/pdf/fatturePdfService';
import { CompanyAutocompleteInput } from './CompanyAutocompleteInput';
import {
  buildDuplicatedInvoiceDraft,
  calculateInvoiceTotals,
  DEFAULT_PAYMENT_AND_TERMS,
  DEFAULT_SUPPLIER_INFO,
  getNextInvoiceNumber,
  listInvoiceAziendeOptions,
  listInvoices,
  saveInvoice,
  updateInvoiceStatus,
  type GosInvoiceRecord,
  type InvoiceAziendaOption,
  type InvoiceLineItem,
  type InvoiceStatus,
} from './invoiceService';

interface InvoiceGeneratorViewProps {
  initialCompanies?: unknown[];
  advisorName?: string;
}

type StatusFilter = 'all' | InvoiceStatus;

const CURRENCY_OPTIONS = [
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'AED', label: 'AED' },
  { code: 'CHF', label: 'CHF' },
];

const VAT_RATE_OPTIONS = [
  { label: '0% (Zero / Exempt)', value: 0 },
  { label: '5% (Reduced UK)', value: 0.05 },
  { label: '20% (Standard UK)', value: 0.2 },
];

const STATUS_BADGE: Record<InvoiceStatus, { label: string; docTitle: string; cls: string }> = {
  proforma: {
    label: 'Pro-forma',
    docTitle: 'PRO-FORMA INVOICE',
    cls: 'border-purple-500/35 bg-purple-500/15 text-purple-300',
  },
  draft: {
    label: 'Bozza',
    docTitle: 'INVOICE (DRAFT)',
    cls: 'border-amber-500/35 bg-amber-500/15 text-amber-300',
  },
  issued: {
    label: 'Emessa',
    docTitle: 'INVOICE',
    cls: 'border-sky-500/35 bg-sky-500/15 text-sky-300',
  },
  paid: {
    label: 'Pagata',
    docTitle: 'INVOICE — PAID',
    cls: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300',
  },
  cancelled: {
    label: 'Annullata',
    docTitle: 'INVOICE — CANCELLED',
    cls: 'border-rose-500/35 bg-rose-500/15 text-rose-300',
  },
};

const createEmptyItem = (): InvoiceLineItem => ({
  id:
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  description: '',
  qty: 1,
  unit_price: 0,
  vat_rate: 0,
});

function buildInitialDraft(
  nextNumber: string,
  status: InvoiceStatus = 'draft',
  prefixOverride?: string
): GosInvoiceRecord {
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const docNumber = prefixOverride ? `${prefixOverride}${nextNumber}` : nextNumber;

  return {
    invoice_number: docNumber,
    status,
    issue_date: today,
    due_date: due,
    currency: 'GBP',
    ...DEFAULT_SUPPLIER_INFO,
    azienda_id: null,
    customer_name: '',
    customer_billing_address: '',
    customer_vat_number: '',
    customer_contact: '',
    items: [createEmptyItem()],
    net_total: 0,
    vat_standard: 0,
    vat_reduced: 0,
    vat_zero: 0,
    vat_total: 0,
    gross_total: 0,
    ...DEFAULT_PAYMENT_AND_TERMS,
    payment_reference: docNumber,
  };
}

export function InvoiceGeneratorView({
  initialCompanies = [],
  advisorName = 'Glaring LLP',
}: InvoiceGeneratorViewProps) {
  const [invoices, setInvoices] = useState<GosInvoiceRecord[]>([]);
  const [aziende, setAziende] = useState<InvoiceAziendaOption[]>([]);
  const [form, setForm] = useState<GosInvoiceRecord>(() => buildInitialDraft('GLR-2026-001', 'draft'));
  const [saving, setSaving] = useState(false);
  const [busyRowId, setBusyRowId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPdfPreview, setShowPdfPreview] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const refreshInvoices = async () => {
    const invList = await listInvoices();
    setInvoices(invList);
  };

  useEffect(() => {
    void (async () => {
      const [invList, nextNum, azList] = await Promise.all([
        listInvoices(),
        getNextInvoiceNumber(),
        listInvoiceAziendeOptions(initialCompanies),
      ]);
      setInvoices(invList);
      setAziende(azList);
      setForm((prev) => (prev.id ? prev : buildInitialDraft(nextNum, 'draft')));
    })();
  }, [initialCompanies]);

  const totals = useMemo(() => calculateInvoiceTotals(form.items), [form.items]);

  const buildSyncedRecord = (base: GosInvoiceRecord): GosInvoiceRecord => {
    const calc = calculateInvoiceTotals(base.items || []);
    return {
      ...base,
      net_total: calc.netTotal,
      vat_standard: calc.vatStandard,
      vat_reduced: calc.vatReduced,
      vat_zero: calc.vatZero,
      vat_total: calc.vatTotal,
      gross_total: calc.grossTotal,
    };
  };

  const handleDateChange = async (nextDate: string) => {
    const parsedYear = parseInt(nextDate.slice(0, 4), 10);
    const targetYear = Number.isNaN(parsedYear) ? new Date().getFullYear() : parsedYear;

    if (!form.id) {
      const nextNum = await getNextInvoiceNumber('GLR-', targetYear);
      const formattedNum = form.status === 'proforma' ? `PF-${nextNum}` : nextNum;
      setForm((prev) => ({
        ...prev,
        issue_date: nextDate,
        invoice_number: formattedNum,
        payment_reference: formattedNum,
      }));
    } else {
      setForm((prev) => ({ ...prev, issue_date: nextDate }));
    }
  };

  const handleApplyAzienda = (found: InvoiceAziendaOption) => {
    const contact = [found.email, found.telefono].filter(Boolean).join(' / ');
    setForm((prev) => ({
      ...prev,
      azienda_id: found.id,
      customer_name: found.ragione_sociale || prev.customer_name,
      customer_billing_address: found.indirizzo || prev.customer_billing_address,
      customer_vat_number: found.vat_number || prev.customer_vat_number,
      customer_contact: contact || prev.customer_contact,
    }));
  };

  const handleSelectAzienda = (aziendaId: string) => {
    if (!aziendaId) {
      setForm((prev) => ({ ...prev, azienda_id: null }));
      return;
    }
    const found = aziende.find((a) => a.id === aziendaId);
    if (!found) return;
    handleApplyAzienda(found);
  };

  const updateItem = (id: string, patch: Partial<InvoiceLineItem>) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, createEmptyItem()] }));
  };

  const removeItem = (id: string) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.length > 1 ? prev.items.filter((it) => it.id !== id) : prev.items,
    }));
  };

  const handleNewInvoice = async (targetStatus: InvoiceStatus = 'draft') => {
    setFeedback(null);
    const nextNum = await getNextInvoiceNumber();
    const prefix = targetStatus === 'proforma' ? 'PF-' : undefined;
    setForm(buildInitialDraft(nextNum, targetStatus, prefix));
  };

  const handleConvertProformaToInvoice = async (
    sourceDoc?: GosInvoiceRecord,
    targetStatus: 'draft' | 'issued' | 'paid' = 'draft'
  ) => {
    const source = sourceDoc || form;
    setFeedback(null);

    const today = new Date().toISOString().slice(0, 10);
    const parsedYear = parseInt(today.slice(0, 4), 10) || new Date().getFullYear();
    const nextNum = await getNextInvoiceNumber('GLR-', parsedYear);

    const proformaRefLine = `Issued following Pro-forma Invoice ${source.invoice_number} (${source.issue_date}).`;
    const existingNotes = (source.additional_notes || '').trim();
    const mergedNotes = existingNotes.includes(source.invoice_number)
      ? existingNotes
      : existingNotes
        ? `${existingNotes}\n${proformaRefLine}`
        : proformaRefLine;

    const clonedItems: InvoiceLineItem[] = (source.items || []).map((it, idx) => ({
      id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      description: it.description,
      qty: Number(it.qty) || 1,
      unit_price: Number(it.unit_price) || 0,
      vat_rate: Number(it.vat_rate) || 0,
    }));

    const convertedDraft = buildSyncedRecord({
      ...source,
      id: undefined,
      status: targetStatus,
      invoice_number: nextNum,
      issue_date: today,
      due_date: targetStatus === 'paid' ? today : source.due_date || today,
      payment_reference: nextNum,
      additional_notes: mergedNotes,
      items: clonedItems.length > 0 ? clonedItems : [createEmptyItem()],
      created_at: undefined,
      updated_at: undefined,
    });

    if (targetStatus === 'issued' || targetStatus === 'paid') {
      setSaving(true);
      const { data, error } = await saveInvoice(convertedDraft);
      setSaving(false);

      if (error || !data) {
        setFeedback({
          type: 'err',
          msg: error || 'Errore durante la conversione in fattura definitiva.',
        });
        return;
      }

      setForm(data);
      setFeedback({
        type: 'ok',
        msg: `Pro-forma ${source.invoice_number} convertita ed emessa come Fattura ${data.invoice_number} (${STATUS_BADGE[data.status].label}).`,
      });
      await refreshInvoices();
    } else {
      setForm(convertedDraft);
      setFeedback({
        type: 'ok',
        msg: `Pro-forma ${source.invoice_number} convertita nella bozza fattura ${nextNum} con data odierna. Controlla e clicca "Emetti e Salva".`,
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSave = async (e: React.FormEvent, overrideStatus?: InvoiceStatus) => {
    e.preventDefault();
    setFeedback(null);

    if (!form.invoice_number.trim() || !form.customer_name.trim()) {
      setFeedback({ type: 'err', msg: 'Inserisci numero documento e nominativo cliente.' });
      return;
    }

    const payloadToSave = buildSyncedRecord(
      overrideStatus ? { ...form, status: overrideStatus } : form
    );

    setSaving(true);
    const { data, error } = await saveInvoice(payloadToSave);
    setSaving(false);

    if (error || !data) {
      setFeedback({ type: 'err', msg: error || 'Errore durante il salvataggio del documento.' });
      return;
    }

    setForm(data);
    setFeedback({
      type: 'ok',
      msg: `Documento ${data.invoice_number} salvato (${STATUS_BADGE[data.status]?.label || data.status}).`,
    });
    await refreshInvoices();
  };

  const handleRowStatusChange = async (inv: GosInvoiceRecord, nextStatus: InvoiceStatus) => {
    if (!inv.id) return;
    setFeedback(null);
    setBusyRowId(inv.id);
    const { ok, error } = await updateInvoiceStatus(inv.id, nextStatus);
    setBusyRowId(null);

    if (!ok) {
      setFeedback({ type: 'err', msg: error || 'Errore aggiornamento stato.' });
      return;
    }

    if (form.id === inv.id) {
      setForm((prev) => ({ ...prev, status: nextStatus }));
    }
    setFeedback({
      type: 'ok',
      msg: `Documento ${inv.invoice_number} impostato su "${STATUS_BADGE[nextStatus].label}".`,
    });
    await refreshInvoices();
  };

  const handleDuplicateInvoice = async (inv: GosInvoiceRecord) => {
    setFeedback(null);
    const draft = await buildDuplicatedInvoiceDraft(inv);
    if (draft.items.length === 0) {
      draft.items = [createEmptyItem()];
    }
    setForm(draft);
    setFeedback({
      type: 'ok',
      msg: `Creata bozza ${draft.invoice_number} duplicando ${inv.invoice_number}.`,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenPdf = (docRecord?: GosInvoiceRecord, downloadDirect = false) => {
    const target = buildSyncedRecord(docRecord || form);
    fatturePdfService.printInvoicePdf(target, {
      advisorName,
      openInNewTab: !downloadDirect,
    });
  };

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: invoices.length,
      proforma: 0,
      issued: 0,
      paid: 0,
      draft: 0,
      cancelled: 0,
    };
    for (const inv of invoices) {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    }
    return counts;
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;
      if (!q) return true;
      return [inv.invoice_number, inv.customer_name, inv.issue_date, inv.currency]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q);
    });
  }, [invoices, statusFilter, searchQuery]);

  const fmtMoney = (amount: number, currency = form.currency) =>
    `${currency} ${amount.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const isPresetCurrency = CURRENCY_OPTIONS.some((c) => c.code === form.currency);
  const currentBadge = STATUS_BADGE[form.status] || STATUS_BADGE.draft;

  return (
    <div className="space-y-6 text-gray-100">
      {/* BARRA AZIONI */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
        <div>
          <h2 className="text-base font-extrabold uppercase tracking-wider text-white">
            Invoice &amp; Pro-forma Generator — Glaring LLP
          </h2>
          <p className="text-xs text-gray-400">
            Fatture Pro-forma, conversione a saldo avvenuto, numerazione sequenziale ed export PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void handleNewInvoice('draft')}
            className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-gray-200 hover:bg-gray-700"
          >
            + Nuova Fattura
          </button>
          <button
            type="button"
            onClick={() => void handleNewInvoice('proforma')}
            className="cursor-pointer rounded-xl border border-purple-600/60 bg-purple-950/50 px-3 py-2 text-xs font-bold text-purple-200 hover:bg-purple-900/60"
          >
            + Nuova Pro-forma
          </button>
          <button
            type="button"
            onClick={() => setShowPdfPreview((prev) => !prev)}
            className="cursor-pointer rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-bold text-gray-200 hover:border-[#FF5500]"
          >
            {showPdfPreview ? 'Nascondi Riepilogo' : 'Riepilogo Documento'}
          </button>
          <button
            type="button"
            onClick={() => handleOpenPdf(form, false)}
            className="cursor-pointer rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-bold text-white hover:border-[#FF5500]"
          >
            Apri PDF
          </button>
          <button
            type="button"
            onClick={() => handleOpenPdf(form, true)}
            className="cursor-pointer rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-xs font-bold text-gray-200 hover:border-[#FF5500]"
          >
            Scarica PDF
          </button>
          <button
            type="button"
            onClick={(e) => void handleSave(e, form.status === 'proforma' ? 'proforma' : 'draft')}
            disabled={saving}
            className="cursor-pointer rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-xs font-bold text-gray-100 hover:bg-gray-700 disabled:opacity-50"
          >
            {form.status === 'proforma' ? 'Salva Pro-forma' : 'Salva Bozza'}
          </button>
          {form.status === 'proforma' ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleConvertProformaToInvoice(form, 'draft')}
              className="cursor-pointer rounded-xl bg-[#FF5500] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-orange-600 disabled:opacity-50"
            >
              Converti in Fattura
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => void handleSave(e, 'issued')}
              disabled={saving}
              className="cursor-pointer rounded-xl bg-[#FF5500] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {saving ? 'Salvataggio...' : 'Emetti e Salva'}
            </button>
          )}
        </div>
      </div>

      {/* BANNER CONVERSIONE PRO-FORMA A SALDO AVVENUTO */}
      {form.status === 'proforma' && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-purple-500/40 bg-purple-950/35 px-4 py-3 text-xs text-purple-100 sm:flex-row sm:items-center">
          <div>
            <span className="font-extrabold uppercase tracking-wider text-purple-300">
              Modalità Pro-forma attiva:
            </span>{' '}
            questo documento non impegna la numerazione fiscale. Quando ricevi il saldo, convertilo in fattura definitiva con progressivo{' '}
            <span className="font-mono font-bold">GLR-YYYY-XXX</span>.
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleConvertProformaToInvoice(form, 'draft')}
              className="cursor-pointer rounded-lg border border-purple-400/50 bg-purple-900/60 px-3 py-1.5 font-bold text-white hover:bg-purple-800 disabled:opacity-50"
            >
              Prepara Bozza Fattura
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleConvertProformaToInvoice(form, 'paid')}
              className="cursor-pointer rounded-lg bg-emerald-600 px-3 py-1.5 font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              Saldo Ricevuto -&gt; Emetti Pagata
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === 'ok'
              ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300'
              : 'border-red-800 bg-red-950/60 text-red-300'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* RIEPILOGO DOCUMENTO OPZIONALE A SCHERMO */}
      {showPdfPreview && (
        <section
          aria-label="Riepilogo Documento"
          className="rounded-2xl border border-gray-300 bg-white p-7 text-gray-900 shadow-xl"
        >
          <div className="flex flex-col justify-between gap-4 border-b border-gray-300 pb-4 sm:flex-row sm:items-start">
            <div>
              <div className="text-xl font-black text-gray-950">
                {form.supplier_name || 'GLARING LLP'}
              </div>
              <div className="mt-1 inline-block rounded bg-gray-950 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-[#FF5500]">
                {currentBadge.docTitle}
              </div>
            </div>
            <div className="space-y-1 text-xs sm:text-right">
              <div className="font-mono font-bold text-gray-950">{form.invoice_number}</div>
              <div className="text-gray-600">
                Data: <span className="font-mono">{form.issue_date}</span> · Scadenza:{' '}
                <span className="font-mono">{form.due_date}</span>
              </div>
              <div className="font-bold text-gray-900">Cliente: {form.customer_name || '-'}</div>
            </div>
          </div>

          <div className="mt-4 flex flex-col justify-between gap-4 text-xs sm:flex-row sm:items-center">
            <div className="text-gray-700">
              {form.items.length} {form.items.length === 1 ? 'riga' : 'righe'} · Valuta:{' '}
              <span className="font-mono font-bold">{form.currency || 'GBP'}</span>
            </div>
            <div className="flex items-center gap-6">
              <div>
                Netto: <span className="font-mono font-bold">{fmtMoney(totals.netTotal)}</span>
              </div>
              <div>
                IVA: <span className="font-mono font-bold">{fmtMoney(totals.vatTotal)}</span>
              </div>
              <div className="text-sm font-black text-[#FF5500]">
                Totale: <span className="font-mono">{fmtMoney(totals.grossTotal)}</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* FORM DI COMPILAZIONE */}
      <form
        onSubmit={(e) => void handleSave(e)}
        className="space-y-6 rounded-2xl border border-gray-800 bg-gray-900 p-6"
      >
        <div className="grid grid-cols-1 gap-6 border-b border-gray-800 pb-6 md:grid-cols-2">
          <div>
            <div className="text-xl font-black tracking-tight text-white">
              {form.supplier_name || 'GLARING LLP'}
            </div>
            <div className="mt-1 text-xs font-bold uppercase tracking-widest text-[#FF5500]">
              {currentBadge.docTitle}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                Document number
              </label>
              <input
                type="text"
                value={form.invoice_number}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    invoice_number: e.target.value,
                    payment_reference: prev.payment_reference || e.target.value,
                  }))
                }
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                Status / Currency
              </label>
              <div className="flex gap-2">
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, status: e.target.value as InvoiceStatus }))
                  }
                  className="w-1/2 rounded-xl border border-gray-700 bg-gray-950 px-2 py-2 text-white"
                >
                  <option value="proforma">Pro-forma</option>
                  <option value="draft">Draft (Bozza)</option>
                  <option value="issued">Issued (Emessa)</option>
                  <option value="paid">Paid (Pagata)</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  aria-label="Valuta fattura"
                  value={isPresetCurrency ? form.currency : 'OTHER'}
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    if (nextVal === 'OTHER') {
                      setForm((prev) => ({ ...prev, currency: '' }));
                    } else {
                      setForm((prev) => ({ ...prev, currency: nextVal }));
                    }
                  }}
                  className="w-1/2 rounded-xl border border-gray-700 bg-gray-950 px-2 py-2 font-mono text-white"
                >
                  {CURRENCY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                  <option value="OTHER">Altra...</option>
                </select>
              </div>
              {!isPresetCurrency && (
                <input
                  type="text"
                  maxLength={5}
                  placeholder="Codice valuta (es. AED, CHF)"
                  value={form.currency}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))
                  }
                  className="mt-1.5 w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-1.5 font-mono text-xs text-white"
                />
              )}
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                Issue date
              </label>
              <input
                type="date"
                value={form.issue_date}
                onChange={(e) => void handleDateChange(e.target.value)}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-gray-400">
                Payment due date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((prev) => ({ ...prev, due_date: e.target.value }))}
                className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2.5 rounded-xl border border-gray-800 bg-gray-950 p-4 text-xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              FROM (SUPPLIER)
            </div>
            <input
              type="text"
              placeholder="Supplier"
              value={form.supplier_name}
              onChange={(e) => setForm((prev) => ({ ...prev, supplier_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Registered office"
              value={form.supplier_registered_office}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, supplier_registered_office: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Company number"
                value={form.supplier_company_number}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, supplier_company_number: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
              />
              <input
                type="text"
                placeholder="VAT number (GB or Not registered)"
                value={form.supplier_vat_number}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, supplier_vat_number: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
              />
            </div>
            <input
              type="text"
              placeholder="Email / telephone"
              value={form.supplier_contact}
              onChange={(e) => setForm((prev) => ({ ...prev, supplier_contact: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
          </div>

          <div className="space-y-2.5 rounded-xl border border-gray-800 bg-gray-950 p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
                TO (CUSTOMER)
              </span>
              <select
                value={form.azienda_id || ''}
                onChange={(e) => handleSelectAzienda(e.target.value)}
                className="max-w-[220px] rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-[11px] text-gray-200"
              >
                <option value="">
                  {aziende.length > 0
                    ? `Carica da aziende (${aziende.length})...`
                    : 'Nessuna azienda trovata'}
                </option>
                {aziende.map((az) => (
                  <option key={az.id} value={az.id}>
                    {az.ragione_sociale}
                  </option>
                ))}
              </select>
            </div>

            <CompanyAutocompleteInput
              companies={aziende}
              value={form.customer_name}
              onChange={(val) =>
                setForm((prev) => ({
                  ...prev,
                  customer_name: val,
                  azienda_id: null,
                }))
              }
              onSelectCompany={handleApplyAzienda}
            />

            <input
              type="text"
              placeholder="Billing address"
              value={form.customer_billing_address}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, customer_billing_address: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Customer VAT number"
                value={form.customer_vat_number}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customer_vat_number: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
              />
              <input
                type="text"
                placeholder="Customer contact"
                value={form.customer_contact}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, customer_contact: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-300">
              SERVICES OR GOODS SUPPLIED
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-gray-700"
            >
              + Aggiungi Riga
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/80 text-[10px] uppercase text-gray-400">
                  <th className="px-3 py-2.5">Description</th>
                  <th className="w-20 px-3 py-2.5">Qty</th>
                  <th className="w-28 px-3 py-2.5">Unit price ({form.currency || 'GBP'})</th>
                  <th className="w-36 px-3 py-2.5">VAT rate</th>
                  <th className="w-28 px-3 py-2.5 text-right">Net</th>
                  <th className="w-24 px-3 py-2.5 text-right">VAT</th>
                  <th className="w-28 px-3 py-2.5 text-right">Gross</th>
                  <th className="w-10 px-2 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {form.items.map((item) => {
                  const lineNet = (Number(item.qty) || 0) * (Number(item.unit_price) || 0);
                  const lineVat = lineNet * (Number(item.vat_rate) || 0);
                  const lineGross = lineNet + lineVat;

                  return (
                    <tr key={item.id}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                          placeholder="Service or goods description..."
                          className="w-full rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1.5 text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="any"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(item.id, { qty: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-lg border border-gray-800 bg-gray-900 px-2 py-1.5 font-mono text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) =>
                            updateItem(item.id, { unit_price: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-lg border border-gray-800 bg-gray-900 px-2 py-1.5 font-mono text-white"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={item.vat_rate}
                          onChange={(e) =>
                            updateItem(item.id, { vat_rate: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full rounded-lg border border-gray-800 bg-gray-900 px-2 py-1.5 text-white"
                        >
                          {VAT_RATE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-200">
                        {lineNet.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-gray-400">
                        {lineVat.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-white">
                        {lineGross.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeItem(item.id)}
                          aria-label="Rimuovi riga"
                          className="cursor-pointer text-gray-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="w-full max-w-sm space-y-2 rounded-xl border border-gray-800 bg-gray-950 p-4 text-xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              TOTALS
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total excluding VAT</span>
              <span className="font-mono text-white">{fmtMoney(totals.netTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">VAT at standard rate (20%)</span>
              <span className="font-mono text-gray-300">{fmtMoney(totals.vatStandard)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">VAT at reduced rate (5%)</span>
              <span className="font-mono text-gray-300">{fmtMoney(totals.vatReduced)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">VAT at zero rate / exempt (0%)</span>
              <span className="font-mono text-gray-300">{fmtMoney(totals.vatZero)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-800 pt-2">
              <span className="text-gray-400">Total VAT</span>
              <span className="font-mono text-white">{fmtMoney(totals.vatTotal)}</span>
            </div>
            <div className="flex justify-between border-t border-gray-700 pt-2 text-sm font-extrabold text-[#FF5500]">
              <span>TOTAL AMOUNT DUE</span>
              <span className="font-mono">{fmtMoney(totals.grossTotal)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 border-t border-gray-800 pt-6 md:grid-cols-2">
          <div className="space-y-2.5 rounded-xl border border-gray-800 bg-gray-950 p-4 text-xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              PAYMENT DETAILS
            </div>
            <input
              type="text"
              placeholder="Bank name"
              value={form.bank_name}
              onChange={(e) => setForm((prev) => ({ ...prev, bank_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Account name"
              value={form.account_name}
              onChange={(e) => setForm((prev) => ({ ...prev, account_name: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Sort code"
                value={form.sort_code}
                onChange={(e) => setForm((prev) => ({ ...prev, sort_code: e.target.value }))}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-white"
              />
              <input
                type="text"
                placeholder="Account number"
                value={form.account_number}
                onChange={(e) => setForm((prev) => ({ ...prev, account_number: e.target.value }))}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-white"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="IBAN (EU payments)"
                value={form.iban}
                onChange={(e) => setForm((prev) => ({ ...prev, iban: e.target.value }))}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-white"
              />
              <input
                type="text"
                placeholder="BIC / SWIFT"
                value={form.bic_swift}
                onChange={(e) => setForm((prev) => ({ ...prev, bic_swift: e.target.value }))}
                className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-white"
              />
            </div>
            <input
              type="text"
              placeholder="Payment reference"
              value={form.payment_reference}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_reference: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 font-mono text-white"
            />
          </div>

          <div className="space-y-2.5 rounded-xl border border-gray-800 bg-gray-950 p-4 text-xs">
            <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-400">
              TERMS AND NOTES
            </div>
            <input
              type="text"
              placeholder="Payment terms"
              value={form.payment_terms}
              onChange={(e) => setForm((prev) => ({ ...prev, payment_terms: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="Late payment statement"
              value={form.late_payment_statement}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, late_payment_statement: e.target.value }))
              }
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <input
              type="text"
              placeholder="VAT treatment"
              value={form.vat_treatment}
              onChange={(e) => setForm((prev) => ({ ...prev, vat_treatment: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
            <textarea
              rows={3}
              placeholder="Additional notes"
              value={form.additional_notes}
              onChange={(e) => setForm((prev) => ({ ...prev, additional_notes: e.target.value }))}
              className="w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white"
            />
          </div>
        </div>
      </form>

      {/* REGISTRO DOCUMENTI */}
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
              Registro Fatture, Pro-forma &amp; Bozze ({filteredInvoices.length} / {invoices.length})
            </h3>
            <p className="mt-0.5 text-[11px] text-gray-400">
              Filtra per stato, genera il PDF, converti una Pro-forma a saldo avvenuto o duplica un documento.
            </p>
          </div>

          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cerca numero o cliente..."
            className="w-full rounded-xl border border-gray-700 bg-gray-950 px-3.5 py-2 text-xs text-white focus:border-[#FF5500] focus:outline-none md:w-64"
          />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {(
            [
              { key: 'all', label: `Tutte (${statusCounts.all})` },
              { key: 'proforma', label: `Pro-forma (${statusCounts.proforma})` },
              { key: 'issued', label: `Emesse (${statusCounts.issued})` },
              { key: 'paid', label: `Pagate (${statusCounts.paid})` },
              { key: 'draft', label: `Bozze (${statusCounts.draft})` },
              { key: 'cancelled', label: `Annullate (${statusCounts.cancelled})` },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatusFilter(tab.key)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                  active
                    ? 'border-[#FF5500] bg-[#FF5500] font-semibold text-white'
                    : 'border-gray-700 bg-gray-950 text-gray-300 hover:border-gray-500'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {filteredInvoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-800 bg-gray-950 p-8 text-center text-xs text-gray-400">
            Nessun documento trovato con i filtri selezionati.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-800 bg-gray-900/70 text-[10px] uppercase text-gray-400">
                  <th className="px-3 py-2.5">Numero</th>
                  <th className="px-3 py-2.5">Cliente</th>
                  <th className="px-3 py-2.5">Data</th>
                  <th className="px-3 py-2.5">Stato</th>
                  <th className="px-3 py-2.5 text-right">Totale</th>
                  <th className="px-3 py-2.5 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80">
                {filteredInvoices.map((inv) => {
                  const badge = STATUS_BADGE[inv.status] || STATUS_BADGE.draft;
                  const busy = busyRowId === inv.id;

                  return (
                    <tr key={inv.id || inv.invoice_number} className="hover:bg-gray-900/50">
                      <td className="px-3 py-2.5 font-mono font-bold text-white">
                        {inv.invoice_number}
                      </td>
                      <td className="px-3 py-2.5 text-gray-200">{inv.customer_name}</td>
                      <td className="px-3 py-2.5 font-mono text-gray-400">{inv.issue_date}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase ${badge.cls}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-white">
                        {fmtMoney(Number(inv.gross_total || 0), inv.currency)}
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setForm(inv);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-800 px-2.5 py-1 text-[11px] font-bold text-white hover:border-[#FF5500]"
                          >
                            Apri
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPdf(inv, false)}
                            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] font-bold text-gray-200 hover:border-[#FF5500]"
                          >
                            PDF
                          </button>

                          {inv.status === 'proforma' && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => void handleConvertProformaToInvoice(inv, 'draft')}
                              className="cursor-pointer rounded-lg border border-purple-600/60 bg-purple-950/60 px-2.5 py-1 text-[11px] font-bold text-purple-200 hover:bg-purple-900 disabled:opacity-50"
                            >
                              Converti in Fattura
                            </button>
                          )}

                          {inv.status === 'draft' && inv.id && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleRowStatusChange(inv, 'issued')}
                              className="cursor-pointer rounded-lg border border-sky-700/60 bg-sky-950/60 px-2.5 py-1 text-[11px] font-bold text-sky-300 hover:bg-sky-900 disabled:opacity-50"
                            >
                              Emetti
                            </button>
                          )}

                          {inv.status === 'issued' && inv.id && (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void handleRowStatusChange(inv, 'paid')}
                              className="cursor-pointer rounded-lg border border-emerald-700/60 bg-emerald-950/60 px-2.5 py-1 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900 disabled:opacity-50"
                            >
                              Segna Pagata
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => void handleDuplicateInvoice(inv)}
                            className="cursor-pointer rounded-lg border border-gray-700 bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-gray-300 hover:border-gray-500 hover:text-white"
                          >
                            Duplica
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
    </div>
  );
}
