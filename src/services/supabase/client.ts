import { createBrowserClient } from '@supabase/ssr';

let supabaseInstance: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Mancano le variabili d\'ambiente NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }

    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

// Istanza esportata direttamente per un utilizzo immediato nei componenti
export const supabase = getSupabaseBrowserClient();
