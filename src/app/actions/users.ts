'use server';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createUserWithInvite(formData: {
  nome: string;
  email: string;
  ruolo: string;
}) {
  const cookieStore = cookies();
  
  // Client amministrativo server-side (richiede la chiave service_role nelle variabili d'ambiente protette)
  const supabaseAdmin = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, 
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // 1. Invita l'utente tramite Supabase Auth (invia email automatica con link di primo accesso)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      formData.email,
      {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/update-password`,
      }
    );

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Salva il profilo associato nella tabella gos_profiles con il ruolo scelto
    const { error: profileError } = await supabaseAdmin
      .from('gos_profiles')
      .insert([
        {
          id: userId,
          nome: formData.nome,
          email: formData.email,
          ruolo: formData.ruolo,
          stato: 'ATTIVO'
        }
      ]);

    if (profileError) throw profileError;

    return { success: true };
  } catch (error: any) {
    console.error('Errore durante la creazione dell\'utente:', error.message);
    return { success: false, error: error.message };
  }
}
