import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Questionario {
  id: string;
  codice: string;
  titolo: string;
  descrizione?: string;
}

export interface Domanda {
  id: string;
  questionario_id: string;
  sezione: string;
  testo_domanda: string;
  peso: number;
  ordine: number;
}

export interface RispostaAziendale {
  id?: string;
  progetto_id: string;
  domanda_id: string;
  valore_risposta: string;
  note_advisor?: string;
}

export const questionarioService = {
  async getQuestionari(): Promise<Questionario[]> {
    const { data, error } = await supabase
      .from('gos_questionari')
      .select('*')
      .order('codice', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createQuestionario(q: Omit<Questionario, 'id'>): Promise<Questionario> {
    const { data, error } = await supabase
      .from('gos_questionari')
      .insert([q])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async getDomandeByQuestionario(questionarioId: string): Promise<Domanda[]> {
    const { data, error } = await supabase
      .from('gos_domande')
      .select('*')
      .eq('questionario_id', questionarioId)
      .order('ordine', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createDomanda(d: Omit<Domanda, 'id'>): Promise<Domanda> {
    const { data, error } = await supabase
      .from('gos_domande')
      .insert([d])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteDomanda(domandaId: string): Promise<void> {
    const { error } = await supabase
      .from('gos_domande')
      .delete()
      .eq('id', domandaId);

    if (error) throw new Error(error.message);
  },

  async getRisposteByProgetto(progettoId: string): Promise<RispostaAziendale[]> {
    const { data, error } = await supabase
      .from('gos_risposte_aziendali')
      .select('*')
      .eq('progetto_id', progettoId);

    if (error) throw new Error(error.message);
    return data || [];
  },

  async saveRisposta(risposta: RispostaAziendale): Promise<void> {
    const { error } = await supabase
      .from('gos_risposte_aziendali')
      .upsert([risposta], { onConflict: 'progetto_id,domanda_id' });

    if (error) throw new Error(error.message);
  }
};
