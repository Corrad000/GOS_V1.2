import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      assignmentId,
      token,
      moduloId,
      titolo,
      codiceModulo,
      submittedAt,
      risposteCount,
    } = body || {};

    const recipient = 'support@glaring.world';
    const origin = req.nextUrl.origin;
    const reviewUrl = assignmentId
      ? `${origin}/questionari-master/risposte/${assignmentId}`
      : `${origin}/questionari-master?id=${moduloId || ''}`;

    const subject = `[GOS Questionario Compilato] ${titolo || 'Questionario'} (${codiceModulo || token || assignmentId})`;

    const textBody = [
      'Un cliente ha completato e inviato un questionario su GOS.',
      '',
      `Titolo: ${titolo || 'N/D'}`,
      `Codice Modulo: ${codiceModulo || 'N/D'}`,
      `ID Assegnazione: ${assignmentId || 'N/D'}`,
      `ID Modulo: ${moduloId || 'N/D'}`,
      `Token: ${token || 'N/D'}`,
      `Risposte compilate: ${risposteCount ?? 0}`,
      `Data/Ora invio: ${submittedAt || new Date().toISOString()}`,
      `Link consultazione risposte: ${reviewUrl}`,
    ].join('\n');

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #111827;">
        <h2 style="margin: 0 0 12px;">Nuovo questionario compilato</h2>
        <p style="margin: 0 0 12px;">Il cliente ha inviato le risposte. Puoi verificare il dettaglio e generare il PDF dal sistema.</p>
        <table cellpadding="6" cellspacing="0" border="0" style="border-collapse: collapse; font-size: 13px;">
          <tr><td><strong>Titolo:</strong></td><td>${titolo || 'N/D'}</td></tr>
          <tr><td><strong>Codice Modulo:</strong></td><td>${codiceModulo || 'N/D'}</td></tr>
          <tr><td><strong>ID Assegnazione:</strong></td><td>${assignmentId || 'N/D'}</td></tr>
          <tr><td><strong>ID Modulo:</strong></td><td>${moduloId || 'N/D'}</td></tr>
          <tr><td><strong>Token:</strong></td><td>${token || 'N/D'}</td></tr>
          <tr><td><strong>Risposte compilate:</strong></td><td>${risposteCount ?? 0}</td></tr>
          <tr><td><strong>Data/Ora invio:</strong></td><td>${submittedAt || new Date().toISOString()}</td></tr>
        </table>
        <p style="margin: 16px 0 0;">
          <a href="${reviewUrl}" style="background:#FF5500;color:#ffffff;padding:10px 16px;text-decoration:none;font-weight:bold;display:inline-block;">
            Apri Risposte Questionario
          </a>
        </p>
      </div>
    `;

    if (process.env.RESEND_API_KEY) {
      const fromAddress = process.env.MAIL_FROM || 'GOS Alert <noreply@glaring.world>';
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipient],
          subject,
          text: textBody,
          html: htmlBody,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        return NextResponse.json(
          { ok: false, error: `Errore Resend: ${errText}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ ok: true, provider: 'resend' });
    }

    return NextResponse.json(
      {
        ok: false,
        warning:
          'RESEND_API_KEY non configurata. Risposte comunque salvate su Supabase.',
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || 'Errore invio notifica' },
      { status: 500 }
    );
  }
}
