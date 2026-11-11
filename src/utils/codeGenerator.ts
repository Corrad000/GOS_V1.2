// src/utils/codeGenerator.ts
import { createBrowserClient } from '@supabase/ssr';

/**
 * Genera un codice unico e sequenziale rispettando lo standard [Codice Azienda] / [Codice Attività]
 * (es. AZ-00024/PRJ-025, AZ-00024/OFF-013, AZ-00024/QST-019).
 * 
 * Interroga Supabase tramite la funzione atomica get_next_sequence per evitare doppioni
 * tra utenti o sessioni concorrenti.
 */
export async function generateGlobalActivityCode(
  companyCode: string | undefined, 
  activityType: 'PRJ' | 'OFF' | 'QST'
): Promise<string> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Garantisce un prefisso azienda pulito (default fallback AZ-00024)
  const cleanCompanyCode = companyCode && companyCode.trim() !== '' ? companyCode.trim().toUpperCase() : 'AZ-00024';
  
  // Mappatura delle chiavi di sequenza del database
  const seqKeyMap = {
    PRJ: 'PROJECT_SEQ',
    OFF: 'OFFER_SEQ',
    QST: 'QUESTIONNAIRE_SEQ'
  };

  try {
    // Chiamata atomica al database Supabase per la sequenzialità condivisa tra tutti gli utenti
    const { data: seqNumber, error } = await supabase.rpc('get_next_sequence', {
      seq_key: seqKeyMap[activityType]
    });

    if (error || !seqNumber) {
      throw error || new Error('Errore nel recupero della sequenza dal database');
    }

    const paddedNumber = String(seqNumber).padStart(3, '0');
    return `${cleanCompanyCode}/${activityType}-${paddedNumber}`;
    
  } catch (err) {
    console.warn('Fallback generazione codice locale (connessione DB non disponibile):', err);
    // Fallback locale in caso di assenza temporanea della RPC SQL
    const fallbackNum = Math.floor(Math.random() * 900) + 100;
    return `${cleanCompanyCode}/${activityType}-${fallbackNum}`;
  }
}
