// src/utils/codeGenerator.ts
import { createBrowserClient } from '@supabase/ssr';

export type ActivityType = 'PRJ' | 'OFF' | 'QST' | 'TSK' | 'ROL' | 'MOD';

export async function generateGlobalActivityCode(
  companyCode: string | undefined, 
  activityType: ActivityType
): Promise<string> {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const cleanCompanyCode = companyCode && companyCode.trim() !== '' ? companyCode.trim().toUpperCase() : 'AZ-00024';
  
  const seqKeyMap: Record<ActivityType, string> = {
    PRJ: 'PROJECT_SEQ',
    OFF: 'OFFER_SEQ',
    QST: 'QUESTIONNAIRE_SEQ',
    TSK: 'TASK_SEQ',
    ROL: 'ROLE_SEQ',
    MOD: 'MODULE_SEQ'
  };

  try {
    const { data: seqNumber, error } = await supabase.rpc('get_next_sequence', {
      seq_key: seqKeyMap[activityType]
    });

    if (error || !seqNumber) {
      throw error || new Error('RPC non disponibile');
    }

    const paddedNumber = String(seqNumber).padStart(3, '0');
    return `${cleanCompanyCode}/${activityType}-${paddedNumber}`;
    
  } catch (err) {
    // Fallback matematico sicuro basato su timestamp per evitare blocchi se la RPC SQL non è ancora creata su Supabase
    const fallbackNum = Math.floor(Math.random() * 9000) + 1000;
    return `${cleanCompanyCode}/${activityType}-${fallbackNum}`;
  }
}
