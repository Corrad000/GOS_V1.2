import { supabase } from '@/services/supabase/client';

export type InvoiceStatus = 'proforma' | 'draft' | 'issued' | 'paid' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  qty: number;
  unit_price: number;
  vat_rate: number;
}

export interface GosInvoiceRecord {
  id?: string;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  currency: string;
  supplier_name: string;
  supplier_registered_office: string;
  supplier_company_number: string;
  supplier_vat_number: string;
  supplier_contact: string;
  azienda_id: string | null;
  customer_name: string;
  customer_billing_address: string;
  customer_vat_number: string;
  customer_contact: string;
  items: InvoiceLineItem[];
  net_total: number;
  vat_standard: number;
  vat_reduced: number;
  vat_zero: number;
  vat_total: number;
  gross_total: number;
  bank_name: string;
  account_name: string;
  sort_code: string;
  account_number: string;
  iban: string;
  bic_swift: string;
  payment_reference: string;
  payment_terms: string;
  late_payment_statement: string;
  vat_treatment: string;
  additional_notes: string;
  created_at?: string;
  updated_at?: string;
}

export interface InvoiceAziendaOption {
  id: string;
  codice_azienda?: string | null;
  ragione_sociale: string;
  vat_number?: string | null;
  indirizzo?: string | null;
  email?: string | null;
  telefono?: string | null;
}

export interface InvoiceTotals {
  netTotal: number;
  vatStandard: number;
  vatReduced: number;
  vatZero: number;
  vatTotal: number;
  grossTotal: number;
}

export const DEFAULT_SUPPLIER_INFO = {
  supplier_name: 'GLARING LLP',
  supplier_registered_office: '',
  supplier_company_number: '',
  supplier_vat_number: 'Not registered',
  supplier_contact: 'support@glaring.world',
};

export const DEFAULT_PAYMENT_AND_TERMS = {
  bank_name: '',
  account_name: 'GLARING LLP',
  sort_code: '',
  account_number: '',
  iban: '',
  bic_swift: '',
  payment_reference: '',
  payment_terms: 'Net 15 days from issue date.',
  late_payment_statement:
    'Late payments may incur statutory interest and recovery costs in accordance with applicable commercial terms.',
  vat_treatment: 'Zero-rated / Outside scope / Exempt as applicable.',
  additional_notes: '',
};

const LOCAL_STORAGE_INVOICES_KEY = 'gos_invoices_fallback_v1';

function readLocalInvoices(): GosInvoiceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_INVOICES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalInvoices(rows: GosInvoiceRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_INVOICES_KEY, JSON.stringify(rows));
  } catch {
    // ignora errori quota storage
  }
}

function normalizeStatus(raw: unknown): InvoiceStatus {
  const s = String(raw || '').toLowerCase().trim();
  if (s === 'proforma' || s === 'pro-forma' || s === 'pro_forma') return 'proforma';
  if (s === 'issued' || s === 'emessa') return 'issued';
  if (s === 'paid' || s === 'pagata') return 'paid';
  if (s === 'cancelled' || s === 'canceled' || s === 'annullata') return 'cancelled';
  return 'draft';
}

function normalizeItems(raw: unknown): InvoiceLineItem[] {
  let list: unknown[] = [];
  if (Array.isArray(raw)) {
    list = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) list = parsed;
    } catch {
      list = [];
    }
  }

  if (list.length === 0) {
    return [
      {
        id: `${Date.now()}-1`,
        description: '',
        qty: 1,
        unit_price: 0,
        vat_rate: 0,
      },
    ];
  }

  return list.map((it, idx) => {
    const obj = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
    return {
      id: typeof obj.id === 'string' && obj.id ? obj.id : `item-${idx}-${Date.now()}`,
      description: typeof obj.description === 'string' ? obj.description : '',
      qty: Number(obj.qty ?? 1) || 0,
      unit_price: Number(obj.unit_price ?? 0) || 0,
      vat_rate: Number(obj.vat_rate ?? 0) || 0,
    };
  });
}

export function calculateInvoiceTotals(items: InvoiceLineItem[]): InvoiceTotals {
  let netTotal = 0;
  let vatStandard = 0;
  let vatReduced = 0;
  let vatZero = 0;

  for (const item of items || []) {
    const qty = Number(item.qty) || 0;
    const price = Number(item.unit_price) || 0;
    const rate = Number(item.vat_rate) || 0;
    const lineNet = qty * price;
    const lineVat = lineNet * rate;

    netTotal += lineNet;

    if (Math.abs(rate - 0.2) < 0.001) {
      vatStandard += lineVat;
    } else if (Math.abs(rate - 0.05) < 0.001) {
      vatReduced += lineVat;
    } else if (rate > 0) {
      vatStandard += lineVat;
    } else {
      vatZero += lineNet;
    }
  }

  const vatTotal = vatStandard + vatReduced;
  const grossTotal = netTotal + vatTotal;

  return {
    netTotal: Number(netTotal.toFixed(2)),
    vatStandard: Number(vatStandard.toFixed(2)),
    vatReduced: Number(vatReduced.toFixed(2)),
    vatZero: Number(vatZero.toFixed(2)),
    vatTotal: Number(vatTotal.toFixed(2)),
    grossTotal: Number(grossTotal.toFixed(2)),
  };
}

function normalizeInvoiceRow(raw: Record<string, unknown>): GosInvoiceRecord {
  const items = normalizeItems(raw.items);
  const calc = calculateInvoiceTotals(items);

  return {
    id: typeof raw.id === 'string' ? raw.id : undefined,
    invoice_number:
      typeof raw.invoice_number === 'string' && raw.invoice_number.trim()
        ? raw.invoice_number
        : 'GLR-2026-001',
    status: normalizeStatus(raw.status),
    issue_date:
      typeof raw.issue_date === 'string' && raw.issue_date
        ? raw.issue_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    due_date:
      typeof raw.due_date === 'string' && raw.due_date
        ? raw.due_date.slice(0, 10)
        : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    currency: typeof raw.currency === 'string' && raw.currency ? raw.currency : 'GBP',
    supplier_name:
      typeof raw.supplier_name === 'string'
        ? raw.supplier_name
        : DEFAULT_SUPPLIER_INFO.supplier_name,
    supplier_registered_office:
      typeof raw.supplier_registered_office === 'string'
        ? raw.supplier_registered_office
        : DEFAULT_SUPPLIER_INFO.supplier_registered_office,
    supplier_company_number:
      typeof raw.supplier_company_number === 'string'
        ? raw.supplier_company_number
        : DEFAULT_SUPPLIER_INFO.supplier_company_number,
    supplier_vat_number:
      typeof raw.supplier_vat_number === 'string'
        ? raw.supplier_vat_number
        : DEFAULT_SUPPLIER_INFO.supplier_vat_number,
    supplier_contact:
      typeof raw.supplier_contact === 'string'
        ? raw.supplier_contact
        : DEFAULT_SUPPLIER_INFO.supplier_contact,
    azienda_id: typeof raw.azienda_id === 'string' && raw.azienda_id ? raw.azienda_id : null,
    customer_name: typeof raw.customer_name === 'string' ? raw.customer_name : '',
    customer_billing_address:
      typeof raw.customer_billing_address === 'string' ? raw.customer_billing_address : '',
    customer_vat_number:
      typeof raw.customer_vat_number === 'string' ? raw.customer_vat_number : '',
    customer_contact:
      typeof raw.customer_contact === 'string' ? raw.customer_contact : '',
    items,
    net_total: Number(raw.net_total ?? calc.netTotal) || calc.netTotal,
    vat_standard: Number(raw.vat_standard ?? calc.vatStandard) || calc.vatStandard,
    vat_reduced: Number(raw.vat_reduced ?? calc.vatReduced) || calc.vatReduced,
    vat_zero: Number(raw.vat_zero ?? calc.vatZero) || calc.vatZero,
    vat_total: Number(raw.vat_total ?? calc.vatTotal) || calc.vatTotal,
    gross_total: Number(raw.gross_total ?? calc.grossTotal) || calc.grossTotal,
    bank_name: typeof raw.bank_name === 'string' ? raw.bank_name : DEFAULT_PAYMENT_AND_TERMS.bank_name,
    account_name:
      typeof raw.account_name === 'string'
        ? raw.account_name
        : DEFAULT_PAYMENT_AND_TERMS.account_name,
    sort_code: typeof raw.sort_code === 'string' ? raw.sort_code : DEFAULT_PAYMENT_AND_TERMS.sort_code,
    account_number:
      typeof raw.account_number === 'string'
        ? raw.account_number
        : DEFAULT_PAYMENT_AND_TERMS.account_number,
    iban: typeof raw.iban === 'string' ? raw.iban : DEFAULT_PAYMENT_AND_TERMS.iban,
    bic_swift:
      typeof raw.bic_swift === 'string' ? raw.bic_swift : DEFAULT_PAYMENT_AND_TERMS.bic_swift,
    payment_reference:
      typeof raw.payment_reference === 'string'
        ? raw.payment_reference
        : typeof raw.invoice_number === 'string'
          ? raw.invoice_number
          : '',
    payment_terms:
      typeof raw.payment_terms === 'string'
        ? raw.payment_terms
        : DEFAULT_PAYMENT_AND_TERMS.payment_terms,
    late_payment_statement:
      typeof raw.late_payment_statement === 'string'
        ? raw.late_payment_statement
        : DEFAULT_PAYMENT_AND_TERMS.late_payment_statement,
    vat_treatment:
      typeof raw.vat_treatment === 'string'
        ? raw.vat_treatment
        : DEFAULT_PAYMENT_AND_TERMS.vat_treatment,
    additional_notes:
      typeof raw.additional_notes === 'string'
        ? raw.additional_notes
        : DEFAULT_PAYMENT_AND_TERMS.additional_notes,
    created_at: typeof raw.created_at === 'string' ? raw.created_at : undefined,
    updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : undefined,
  };
}

function mapRawCompanyOption(raw: Record<string, unknown>): InvoiceAziendaOption | null {
  const id = typeof raw.id === 'string' && raw.id ? raw.id : '';
  const ragioneSociale =
    typeof raw.ragione_sociale === 'string' && raw.ragione_sociale.trim()
      ? raw.ragione_sociale.trim()
      : typeof raw.nome === 'string' && raw.nome.trim()
        ? raw.nome.trim()
        : '';

  if (!id && !ragioneSociale) return null;

  const addrParts = [raw.indirizzo, raw.citta, raw.nazione]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());

  const fullAddress =
    addrParts.length > 0
      ? addrParts.join(', ')
      : typeof raw.billing_address === 'string'
        ? raw.billing_address
        : '';

  return {
    id: id || ragioneSociale,
    codice_azienda:
      typeof raw.codice_azienda === 'string' ? raw.codice_azienda : null,
    ragione_sociale: ragioneSociale || id,
    vat_number:
      typeof raw.partita_iva === 'string' && raw.partita_iva.trim()
        ? raw.partita_iva.trim()
        : typeof raw.vat_number === 'string' && raw.vat_number.trim()
          ? raw.vat_number.trim()
          : typeof raw.codice_fiscale === 'string'
            ? raw.codice_fiscale.trim()
            : null,
    indirizzo: fullAddress || null,
    email: typeof raw.email === 'string' ? raw.email.trim() : null,
    telefono: typeof raw.telefono === 'string' ? raw.telefono.trim() : null,
  };
}

export async function listInvoiceAziendeOptions(
  initialCompanies: unknown[] = []
): Promise<InvoiceAziendaOption[]> {
  const merged = new Map<string, InvoiceAziendaOption>();

  for (const item of initialCompanies) {
    if (item && typeof item === 'object') {
      const mapped = mapRawCompanyOption(item as Record<string, unknown>);
      if (mapped) merged.set(mapped.id, mapped);
    }
  }

  try {
    const { data, error } = await supabase
      .from('gos_aziende')
      .select('id, codice_azienda, ragione_sociale, partita_iva, codice_fiscale, indirizzo, citta, nazione, email, telefono')
      .order('ragione_sociale', { ascending: true });

    if (!error && Array.isArray(data)) {
      for (const row of data) {
        const mapped = mapRawCompanyOption(row as Record<string, unknown>);
        if (mapped) merged.set(mapped.id, mapped);
      }
    }
  } catch {
    // fallback sui dati iniziali se la query non è disponibile
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.ragione_sociale.localeCompare(b.ragione_sociale, 'it', { sensitivity: 'base' })
  );
}

export async function listInvoices(): Promise<GosInvoiceRecord[]> {
  try {
    const { data, error } = await supabase
      .from('gos_invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      const normalized = data.map((row) => normalizeInvoiceRow(row as Record<string, unknown>));
      writeLocalInvoices(normalized);
      return normalized;
    }
  } catch {
    // usa fallback locale
  }

  return readLocalInvoices();
}

export async function getNextInvoiceNumber(
  prefix = 'GLR-',
  year = new Date().getFullYear()
): Promise<string> {
  const all = await listInvoices();
  const pattern = new RegExp(`^${prefix}${year}-(\\d+)$`, 'i');
  let maxSeq = 0;

  for (const inv of all) {
    const numStr = String(inv.invoice_number || '').replace(/^PF-/i, '').trim();
    const match = numStr.match(pattern);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(3, '0');
  return `${prefix}${year}-${nextSeq}`;
}

export async function saveInvoice(
  record: GosInvoiceRecord
): Promise<{ data: GosInvoiceRecord | null; error: string | null }> {
  const calc = calculateInvoiceTotals(record.items);
  const nowIso = new Date().toISOString();

  const payload = {
    invoice_number: record.invoice_number.trim(),
    status: normalizeStatus(record.status),
    issue_date: record.issue_date,
    due_date: record.due_date,
    currency: (record.currency || 'GBP').trim().toUpperCase(),
    supplier_name: record.supplier_name,
    supplier_registered_office: record.supplier_registered_office,
    supplier_company_number: record.supplier_company_number,
    supplier_vat_number: record.supplier_vat_number,
    supplier_contact: record.supplier_contact,
    azienda_id: record.azienda_id || null,
    customer_name: record.customer_name.trim(),
    customer_billing_address: record.customer_billing_address,
    customer_vat_number: record.customer_vat_number,
    customer_contact: record.customer_contact,
    items: record.items,
    net_total: calc.netTotal,
    vat_standard: calc.vatStandard,
    vat_reduced: calc.vatReduced,
    vat_zero: calc.vatZero,
    vat_total: calc.vatTotal,
    gross_total: calc.grossTotal,
    bank_name: record.bank_name,
    account_name: record.account_name,
    sort_code: record.sort_code,
    account_number: record.account_number,
    iban: record.iban,
    bic_swift: record.bic_swift,
    payment_reference: record.payment_reference || record.invoice_number.trim(),
    payment_terms: record.payment_terms,
    late_payment_statement: record.late_payment_statement,
    vat_treatment: record.vat_treatment,
    additional_notes: record.additional_notes,
    updated_at: nowIso,
  };

  try {
    if (record.id) {
      const { data, error } = await supabase
        .from('gos_invoices')
        .update(payload)
        .eq('id', record.id)
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message || 'Errore aggiornamento fattura su Supabase.' };
      }

      const normalized = normalizeInvoiceRow((data || { ...payload, id: record.id }) as Record<string, unknown>);
      const existing = readLocalInvoices();
      writeLocalInvoices(existing.map((row) => (row.id === normalized.id ? normalized : row)));
      return { data: normalized, error: null };
    } else {
      const { data, error } = await supabase
        .from('gos_invoices')
        .insert([{ ...payload, created_at: nowIso }])
        .select()
        .single();

      if (error) {
        return { data: null, error: error.message || 'Errore inserimento fattura su Supabase.' };
      }

      const normalized = normalizeInvoiceRow(
        (data || { ...payload, id: `local-${Date.now()}`, created_at: nowIso }) as Record<
          string,
          unknown
        >
      );
      const existing = readLocalInvoices();
      writeLocalInvoices([normalized, ...existing]);
      return { data: normalized, error: null };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore imprevisto durante il salvataggio.';
    return { data: null, error: msg };
  }
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus
): Promise<{ ok: boolean; error: string | null }> {
  const cleanStatus = normalizeStatus(status);
  const nowIso = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('gos_invoices')
      .update({ status: cleanStatus, updated_at: nowIso })
      .eq('id', id);

    if (error) {
      return { ok: false, error: error.message || 'Errore aggiornamento stato su Supabase.' };
    }

    const existing = readLocalInvoices();
    writeLocalInvoices(
      existing.map((row) =>
        row.id === id ? { ...row, status: cleanStatus, updated_at: nowIso } : row
      )
    );
    return { ok: true, error: null };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Errore aggiornamento stato.';
    return { ok: false, error: msg };
  }
}

export async function buildDuplicatedInvoiceDraft(
  source: GosInvoiceRecord
): Promise<GosInvoiceRecord> {
  const nextNum = await getNextInvoiceNumber();
  const today = new Date().toISOString().slice(0, 10);
  const due = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const clonedItems: InvoiceLineItem[] = (source.items || []).map((it, idx) => ({
    id: `${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    description: it.description,
    qty: Number(it.qty) || 1,
    unit_price: Number(it.unit_price) || 0,
    vat_rate: Number(it.vat_rate) || 0,
  }));

  const calc = calculateInvoiceTotals(clonedItems);

  return {
    ...source,
    id: undefined,
    invoice_number: nextNum,
    status: 'draft',
    issue_date: today,
    due_date: due,
    items: clonedItems,
    net_total: calc.netTotal,
    vat_standard: calc.vatStandard,
    vat_reduced: calc.vatReduced,
    vat_zero: calc.vatZero,
    vat_total: calc.vatTotal,
    gross_total: calc.grossTotal,
    payment_reference: nextNum,
    created_at: undefined,
    updated_at: undefined,
  };
}
