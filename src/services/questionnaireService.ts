import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface Categoria {
  id: string;
  nome: string;
  descrizione?: string;
  created_at?: string;
}

export interface ModuloQuestionario {
  id: string;
  categoria_id: string;
  titolo: string;
  descrizione?: string;
  stato: 'Bozza' | 'Attivo' | 'Archiviato';
  versione: string;
  created_at?: string;
}

export interface Domanda {
  id: string;
  modulo_id: string;
  sezione: string;
  testo_domanda: string;
  tipo_risposta: 'rating_1_5' | 'text' | 'boolean' | 'choice';
  peso: number;
  ordine: number;
  created_at?: string;
}

export const questionarioService = {
  // --- CATEGORIE ---
  async getCategorie(): Promise<Categoria[]> {
    const { data, error } = await supabase
      .from('gos_categorie')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createCategoria(cat: Omit<Categoria, 'id'>): Promise<Categoria> {
    const { data, error } = await supabase
      .from('gos_categorie')
      .insert([cat])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  // --- MODULI ---
  async getModuliByCategoria(categoriaId: string): Promise<ModuloQuestionario[]> {
    const { data, error } = await supabase
      .from('gos_moduli')
      .select('*')
      .eq('categoria_id', categoriaId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createModuloWithDomanda(
    categoriaId: string, 
    titolo: string, 
    testoDomanda: string, 
    tipoRisposta: string
  ): Promise<ModuloQuestionario> {
    // 1. Inserisci il Modulo
    const { data: modulo, error: modError } = await supabase
      .from('gos_moduli')
      .insert([
        {
          categoria_id: categoriaId,
          titolo,
          descrizione: 'Modulo diagnostico generato da GOS 1.2',
          stato: 'Attivo',
          versione: '1.0'
        }
      ])
      .select()
      .single();

    if (modError) throw new Error(modError.message);

    // 2. Inserisci la Domanda associata
    if (modulo) {
      const { error: domError } = await supabase
        .from('gos_domande')
        .insert([
          {
            modulo_id: modulo.id,
            sezione: 'Generale',
            testo_domanda: testoDomanda,
            tipo_risposta: tipoRisposta,
            peso: 1.0,
            ordine: 1
          }
        ]);

      if (domError) throw new Error(domError.message);
    }

    return modulo;
  },

  // --- DOMANDE ---
  async getDomandeByModulo(moduloId: string): Promise<Domanda[]> {
    const { data, error } = await supabase
      .from('gos_domande')
      .select('*')
      .eq('modulo_id', moduloId)
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
  }
};
