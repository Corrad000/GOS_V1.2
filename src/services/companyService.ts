import { createClient } from '@/services/supabase/client';

// --- [BLOCCO: INTERFACCE E TIPI] ---
export interface Azienda {
  id: string;
  ragione_sociale: string;
  partita_iva?: string;
  codice_fiscale?: string;
  citta?: string;
  settore?: string;
  stato?: string;
  created_at?: string;
}

export type CreateAziendaInput = Omit<Azienda, 'id' | 'created_at'>;

export const companyService = {
  // --- [BLOCCO: RECUPERO LISTA AZIENDE] ---
  async getCompanies(): Promise<Azienda[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gos_aziende')
      .select('*')
      .order('ragione_sociale', { ascending: true });

    if (error) {
      console.error('Errore nel recupero delle aziende:', error.message);
      throw new Error(error.message);
    }
    return data || [];
  },

  // --- [BLOCCO: RECUPERO SINGOLA AZIENDA PER ID] ---
  async getCompanyById(id: string): Promise<Azienda> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gos_aziende')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Errore nel recupero dell\'azienda:', error.message);
      throw new Error(error.message);
    }
    return data;
  },

  // --- [BLOCCO: CREAZIONE NUOVA AZIENDA] ---
  async createCompany(input: CreateAziendaInput): Promise<Azienda> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gos_aziende')
      .insert([input])
      .select()
      .single();

    if (error) {
      console.error('Errore durante la creazione dell\'azienda:', error.message);
      throw new Error(error.message);
    }
    return data;
  }
};
