import { createClient } from '@/services/supabase/client';

// --- [BLOCCO: INTERFACCE E TIPI PROGETTO] ---
export interface Progetto {
  id: string;
  azienda_id: string;
  titolo: string;
  codice_progetto?: string;
  descrizione?: string;
  stato: 'in_corso' | 'completato' | 'archiviato';
  created_at?: string;
}

export type CreateProgettoInput = Omit<Progetto, 'id' | 'created_at'>;

export const projectService = {
  // --- [BLOCCO: RECUPERO PROGETTI PER AZIENDA] ---
  async getProjectsByCompany(aziendaId: string): Promise<Progetto[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gos_progetti')
      .select('*')
      .eq('azienda_id', aziendaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Errore nel recupero dei progetti:', error.message);
      throw new Error(error.message);
    }
    return data || [];
  },

  // --- [BLOCCO: RECUPERO SINGOLO PROGETTO PER ID] ---
  async getProjectById(id: string): Promise<Progetto> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gos_progetti')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Errore nel recupero del progetto:', error.message);
      throw new Error(error.message);
    }
    return data;
  },

  // --- [BLOCCO: CREAZIONE NUOVO PROGETTO] ---
  async createProject(input: CreateProgettoInput): Promise<Progetto> {
    const supabase = createClient();
    
    const payload = {
      azienda_id: input.azienda_id,
      titolo: input.titolo,
      nome: input.titolo, // Compatibilità retroattiva con la colonna 'nome'
      codice_progetto: input.codice_progetto || null,
      descrizione: input.descrizione || null,
      stato: input.stato || 'in_corso',
    };

    const { data, error } = await supabase
      .from('gos_progetti')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Errore durante la creazione del progetto:', error.message);
      throw new Error(error.message);
    }
    
    return {
      ...data,
      titolo: data.titolo || data.nome || input.titolo,
    };
  },

  // --- [BLOCCO: AGGIORNAMENTO STATO PROGETTO] ---
  async updateProjectStatus(id: string, stato: Progetto['stato']): Promise<Progetto> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('gos_progetti')
      .update({ stato })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Errore durante l\'aggiornamento dello stato:', error.message);
      throw new Error(error.message);
    }
    return data;
  }
};
