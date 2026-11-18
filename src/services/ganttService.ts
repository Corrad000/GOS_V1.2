import { createBrowserClient } from '@supabase/ssr';

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface GanttItem {
  id: string;
  progetto_id: string;
  type: 'task' | 'opt' | 'ms' | 'gate' | 'grp';
  name: string;
  owner?: string;
  start_date?: string;
  end_date?: string;
  crit?: boolean;
  note?: string;
  position?: number;
  created_at?: string;
}

export const ganttService = {
  async getGanttItemsByProject(progettoId: string): Promise<GanttItem[]> {
    const { data, error } = await supabase
      .from('gos_gantt_items')
      .select('*')
      .eq('progetto_id', progettoId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  },

  async createGanttItem(item: Omit<GanttItem, 'id' | 'created_at'>): Promise<GanttItem> {
    const { data, error } = await supabase
      .from('gos_gantt_items')
      .insert([item])
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async updateGanttItem(id: string, updates: Partial<GanttItem>): Promise<GanttItem> {
    const { data, error } = await supabase
      .from('gos_gantt_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  },

  async deleteGanttItem(id: string): Promise<void> {
    const { error } = await supabase
      .from('gos_gantt_items')
      .delete()
      .eq('id', id);

    if (error) throw new Error(error.message);
  }
};
