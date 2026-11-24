import { supabase } from '@/services/supabase/client';

export type OrigineContatto =
  | 'anagrafica'
  | 'trattativa'
  | 'task'
  | 'ruolo'
  | 'kyc'
  | 'manuale';

export interface GosContatto {
  id: string;
  azienda_id: string | null;
  azienda_nome: string | null;
  nome: string;
  cognome: string;
  nome_completo: string;
  email: string | null;
  telefono: string | null;
  ruolo: string | null;
  origine: OrigineContatto | string;
  note: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertContattoInput {
  id?: string | null;
  nome: string;
  cognome?: string;
  email?: string | null;
  telefono?: string | null;
  ruolo?: string | null;
  aziendaId?: string | null;
  aziendaNome?: string | null;
  origine?: OrigineContatto | string;
  note?: string | null;
}

export interface UpdateContattoInput {
  nome?: string;
  cognome?: string | null;
  email?: string | null;
  telefono?: string | null;
  ruolo?: string | null;
  aziendaId?: string | null;
  aziendaNome?: string | null;
  origine?: OrigineContatto | string | null;
  note?: string | null;
}

export function splitNomeCognome(fullName: string): { nome: string; cognome: string } {
  const cleaned = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return { nome: '', cognome: '' };
  const parts = cleaned.split(' ');
  if (parts.length === 1) {
    return { nome: parts[0], cognome: '' };
  }
  return {
    nome: parts[0],
    cognome: parts.slice(1).join(' '),
  };
}

export async function listAziendeOptions(): Promise<
  Array<{ id: string; ragione_sociale: string }>
> {
  const { data, error } = await supabase
    .from('gos_aziende')
    .select('id, ragione_sociale')
    .order('ragione_sociale', { ascending: true });

  if (error) {
    console.warn('Errore caricamento aziende per rubrica:', error.message || error);
    return [];
  }

  return (data || []) as Array<{ id: string; ragione_sociale: string }>;
}

export async function searchContatti(
  query: string,
  options?: { aziendaId?: string | null; limit?: number }
): Promise<GosContatto[]> {
  const q = query.trim().toLowerCase();
  const limit = options?.limit ?? 12;

  const { data, error } = await supabase
    .from('gos_contatti')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Errore ricerca gos_contatti:', error.message || error);
    return [];
  }

  const rows = (data || []) as GosContatto[];

  const filtered = q
    ? rows.filter((c) => {
        const haystack = [
          c.nome_completo,
          c.nome,
          c.cognome,
          c.email,
          c.telefono,
          c.ruolo,
          c.azienda_nome,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
    : rows;

  const aziendaId = options?.aziendaId || null;
  filtered.sort((a, b) => {
    const aMatch = aziendaId && a.azienda_id === aziendaId ? 1 : 0;
    const bMatch = aziendaId && b.azienda_id === aziendaId ? 1 : 0;
    if (aMatch !== bMatch) return bMatch - aMatch;
    return (a.nome_completo || '').localeCompare(b.nome_completo || '', 'it');
  });

  return filtered.slice(0, limit);
}

export async function upsertContatto(
  input: UpsertContattoInput
): Promise<GosContatto | null> {
  const nomePulito = input.nome.trim();
  if (!nomePulito) return null;

  const cleanAziendaNome =
    input.aziendaNome !== undefined
      ? (input.aziendaNome ? input.aziendaNome.trim() : null)
      : undefined;
  const cleanAziendaId =
    input.aziendaId !== undefined
      ? (input.aziendaId ? input.aziendaId.trim() : null)
      : undefined;

  const { data, error } = await supabase.rpc('upsert_gos_contatto', {
    p_nome: nomePulito,
    p_cognome: (input.cognome || '').trim(),
    p_email: input.email ? input.email.trim().toLowerCase() : null,
    p_telefono: input.telefono ? input.telefono.trim() : null,
    p_ruolo: input.ruolo ? input.ruolo.trim() : null,
    p_azienda_id: cleanAziendaId ?? null,
    p_azienda_nome: cleanAziendaNome ?? null,
    p_origine: input.origine || 'manuale',
    p_note: input.note ? input.note.trim() : null,
  });

  if (error) {
    console.error('Errore upsert_gos_contatto:', error.message || error);
    return null;
  }

  let saved = (data as GosContatto) || null;
  const targetId = saved?.id || input.id || null;

  if (targetId && (cleanAziendaNome !== undefined || cleanAziendaId !== undefined)) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (cleanAziendaNome !== undefined) patch.azienda_nome = cleanAziendaNome;
    if (cleanAziendaId !== undefined) patch.azienda_id = cleanAziendaId;

    const { data: patched, error: patchErr } = await supabase
      .from('gos_contatti')
      .update(patch)
      .eq('id', targetId)
      .select()
      .maybeSingle();

    if (!patchErr && patched) {
      saved = patched as GosContatto;
    }
  }

  return saved;
}

export async function updateContatto(
  id: string,
  input: UpdateContattoInput
): Promise<{ data: GosContatto | null; error: string | null }> {
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    return { data: null, error: 'ID contatto mancante.' };
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.nome !== undefined) {
    const trimmedNome = input.nome.trim();
    if (!trimmedNome) {
      return { data: null, error: 'Il nome del contatto è obbligatorio.' };
    }
    patch.nome = trimmedNome;
  }

  if (input.cognome !== undefined) {
    patch.cognome = input.cognome ? input.cognome.trim() : '';
  }

  if (input.email !== undefined) {
    patch.email = input.email ? input.email.trim().toLowerCase() : null;
  }

  if (input.telefono !== undefined) {
    patch.telefono = input.telefono ? input.telefono.trim() : null;
  }

  if (input.ruolo !== undefined) {
    patch.ruolo = input.ruolo ? input.ruolo.trim() : null;
  }

  if (input.aziendaId !== undefined) {
    patch.azienda_id = input.aziendaId ? input.aziendaId.trim() : null;
  }

  if (input.aziendaNome !== undefined) {
    patch.azienda_nome = input.aziendaNome ? input.aziendaNome.trim() : null;
  }

  if (input.origine !== undefined) {
    patch.origine = input.origine ? String(input.origine).trim() : 'manuale';
  }

  if (input.note !== undefined) {
    patch.note = input.note ? input.note.trim() : null;
  }

  const { data, error } = await supabase
    .from('gos_contatti')
    .update(patch)
    .eq('id', cleanId)
    .select('*')
    .single();

  if (error) {
    console.error('Errore aggiornamento gos_contatti:', error.message || error);
    return { data: null, error: error.message || 'Errore durante l’aggiornamento del contatto.' };
  }

  return { data: data as GosContatto, error: null };
}

export async function deleteContatto(
  id: string
): Promise<{ ok: boolean; error: string | null }> {
  const cleanId = String(id || '').trim();
  if (!cleanId) {
    return { ok: false, error: 'ID contatto mancante.' };
  }

  const { data, error } = await supabase
    .from('gos_contatti')
    .delete()
    .eq('id', cleanId)
    .select('id');

  if (error) {
    console.error('Errore eliminazione contatto gos_contatti:', error.message || error);
    return { ok: false, error: error.message || 'Errore durante l’eliminazione del contatto.' };
  }

  if (!Array.isArray(data) || data.length === 0) {
    return {
      ok: false,
      error: 'Nessun contatto eliminato (verifica policy RLS DELETE su gos_contatti o ID).',
    };
  }

  return { ok: true, error: null };
}

export async function deleteContatti(
  ids: string[]
): Promise<{ ok: boolean; deletedCount: number; error: string | null }> {
  const cleanIds = Array.from(
    new Set((ids || []).map((x) => String(x || '').trim()).filter(Boolean))
  );

  if (cleanIds.length === 0) {
    return { ok: true, deletedCount: 0, error: null };
  }

  const { data, error } = await supabase
    .from('gos_contatti')
    .delete()
    .in('id', cleanIds)
    .select('id');

  if (error) {
    console.error('Errore eliminazione multipla gos_contatti:', error.message || error);
    return {
      ok: false,
      deletedCount: 0,
      error: error.message || 'Errore durante l’eliminazione dei contatti selezionati.',
    };
  }

  const deletedCount = Array.isArray(data) ? data.length : 0;
  if (deletedCount === 0) {
    return {
      ok: false,
      deletedCount: 0,
      error: 'Nessun contatto eliminato (verifica policy RLS DELETE su gos_contatti).',
    };
  }

  return {
    ok: true,
    deletedCount,
    error: null,
  };
}

export async function listAllContatti(aziendaId?: string | null): Promise<GosContatto[]> {
  let query = supabase
    .from('gos_contatti')
    .select('*')
    .order('nome_completo', { ascending: true });

  if (aziendaId) {
    query = query.eq('azienda_id', aziendaId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Errore lettura gos_contatti:', error.message || error);
    return [];
  }

  return (data || []) as GosContatto[];
}
