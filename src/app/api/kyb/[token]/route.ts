import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !serviceKey) {
    return null;
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function sendKybNotifications(params: {
  token: string;
  companyCode: string;
  ragioneSociale: string;
  referenteNome: string;
  referenteEmail: string;
  submittedAt: string;
}) {
  const internalEmail =
    process.env.KYB_INTERNAL_EMAIL || process.env.SUPPORT_EMAIL || 'support@glaring.world';
  const fromEmail =
    process.env.KYB_FROM_EMAIL || 'Glaring KYB <noreply@glaring.world>';
  const resendKey = process.env.RESEND_API_KEY;
  const webhookUrl = process.env.KYB_NOTIFICATION_WEBHOOK_URL;

  const subjectInternal = `[GOS KYB] Pacchetto inviato — ${params.ragioneSociale || params.companyCode} (${params.companyCode})`;
  const htmlInternal = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
      <h2>Nuovo Pacchetto KYB Inviato</h2>
      <p><strong>Azienda / Codice:</strong> ${params.ragioneSociale || '-'} (${params.companyCode})</p>
      <p><strong>Referente:</strong> ${params.referenteNome || '-'} (${params.referenteEmail || '-'})</p>
      <p><strong>Token pratica:</strong> ${params.token}</p>
      <p><strong>Data/Ora invio:</strong> ${params.submittedAt}</p>
    </div>
  `;

  if (resendKey) {
    const recipients: Array<{ to: string; subject: string; html: string }> = [
      { to: internalEmail, subject: subjectInternal, html: htmlInternal },
    ];

    if (params.referenteEmail && params.referenteEmail.includes('@')) {
      recipients.push({
        to: params.referenteEmail.trim(),
        subject: `Conferma ricezione Questionario KYB — ${params.ragioneSociale || params.companyCode}`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
            <h2>Questionario KYB Ricevuto</h2>
            <p>Gentile ${params.referenteNome || 'Cliente'},</p>
            <p>confermiamo che il pacchetto KYB relativo a <strong>${params.ragioneSociale || params.companyCode}</strong> (Pratica: <strong>${params.token}</strong>) è stato ricevuto in data <strong>${params.submittedAt}</strong>.</p>
            <p>Il nostro team procederà con le verifiche di conformità e ti ricontatterà per i passaggi successivi.</p>
          </div>
        `,
      });
    }

    await Promise.allSettled(
      recipients.map((msg) =>
        fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromEmail,
            to: [msg.to],
            subject: msg.subject,
            html: msg.html,
          }),
        })
      )
    );
  }

  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'KYB_INVIATO_CLIENTE',
        internal_email: internalEmail,
        ...params,
      }),
    }).catch((err) => {
      console.warn('Webhook notifica KYB non riuscito:', err);
    });
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const cleanToken = decodeURIComponent(String(token || '')).trim();

  if (!cleanToken) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 });
  }

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Configurazione Supabase mancante' }, { status: 500 });
  }

  const { data, error } = await sb
    .from('gos_kyb_submissions')
    .select('*')
    .eq('token', cleanToken)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Pratica non trovata' }, { status: 404 });
  }

  return NextResponse.json({ submission: data }, { status: 200 });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const cleanToken = decodeURIComponent(String(token || '')).trim();

  if (!cleanToken) {
    return NextResponse.json({ error: 'Token mancante' }, { status: 400 });
  }

  const sb = getServerSupabase();
  if (!sb) {
    return NextResponse.json({ error: 'Configurazione Supabase mancante' }, { status: 500 });
  }

  const rawBody = await req.json();
  const { markSubmitted, ...updateFields } = rawBody || {};

  const { error } = await sb
    .from('gos_kyb_submissions')
    .update(updateFields)
    .eq('token', cleanToken);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: refreshed, error: readErr } = await sb
    .from('gos_kyb_submissions')
    .select('*')
    .eq('token', cleanToken)
    .maybeSingle();

  if (readErr) {
    return NextResponse.json({ error: readErr.message }, { status: 500 });
  }

  const isFinalSubmission = Boolean(markSubmitted) || refreshed?.stato === 'Inviato';

  if (isFinalSubmission && refreshed) {
    const ragioneSociale =
      refreshed?.anagrafica_dati?.ragione_sociale ||
      refreshed?.pacchetto_completo?.controllo_documento?.riferimento_interno ||
      '';
    const referenteNome =
      refreshed?.anagrafica_dati?.referente_nome ||
      refreshed?.societa_ubo_dati?.legale_rappresentante ||
      '';
    const referenteEmail = refreshed?.anagrafica_dati?.referente_email || '';
    const submittedAt = refreshed?.submitted_at || new Date().toISOString();
    const companyCode = refreshed?.company_code || 'KYB';

    const { error: logErr } = await sb.from('gos_system_logs').insert({
      company_code: companyCode,
      action: 'KYB_INVIATO_CLIENTE',
      description: `Pacchetto KYB inviato per ${ragioneSociale || companyCode} (Referente: ${referenteNome || 'N/D'}, Token: ${cleanToken})`,
    });

    if (logErr) {
      console.warn('Errore scrittura gos_system_logs:', logErr.message || logErr);
    }

    try {
      await sendKybNotifications({
        token: cleanToken,
        companyCode,
        ragioneSociale,
        referenteNome,
        referenteEmail,
        submittedAt,
      });
    } catch (mailErr) {
      console.warn('Errore invio email notifica KYB:', mailErr);
    }
  }

  return NextResponse.json({ submission: refreshed }, { status: 200 });
}
