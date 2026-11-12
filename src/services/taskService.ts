import { createBrowserClient } from '@supabase/ssr';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface CleanTask {
  id: string;
  progetto_id: string;
  codice_task?: string; // <-- Aggiunto il campo per il codice univoco
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

  async createTask(task: Omit<CleanTask, 'id' | 'created_at'>, companyCode?: string): Promise<CleanTask> {
    // Generazione automatica del codice univoco prima dell'inserimento
    const codiceTask = await generateGlobalActivityCode(companyCode, 'TSK');

    const { data, error } = await supabase
      .from('gos_tasks')
      .insert([{ ...task, codice_task: codiceTask }])
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
