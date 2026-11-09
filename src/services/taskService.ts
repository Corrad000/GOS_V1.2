import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface CleanTask {
  id: string;
  progetto_id: string;
  titolo: string;
  descrizione?: string;
  stato: 'da_fare' | 'in_corso' | 'completato';
  priorita: 'bassa' | 'media' | 'alta';
  data_inizio?: string;
  data_fine?: string;
  costo_budget?: number;
  costo_reale?: number;
  assegnato_a?: string;
  created_at?: string;
}

export const taskService = {
  async getTasksByProject(progettoId: string): Promise<CleanTask[]> {
    const { data, error } = await supabase
      .from('gos_tasks')
      .select('*')
      .eq('progetto_id', progettoId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createTask(task: Omit<CleanTask, 'id' | 'created_at'>): Promise<CleanTask> {
    const { data, error } = await supabase
      .from('gos_tasks')
      .insert([task])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async updateTask(taskId: string, updates: Partial<CleanTask>): Promise<CleanTask> {
    const { data, error } = await supabase
      .from('gos_tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteTask(taskId: string): Promise<void> {
    const { error } = await supabase
      .from('gos_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw new Error(error.message);
  }
};
