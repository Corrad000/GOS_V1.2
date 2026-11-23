'use client';

import { useCallback, useEffect, useState } from 'react';

interface StatusResponse {
  connected: boolean;
  googleEmail: string | null;
  error?: string;
}

export default function GoogleCalendarConnectButton() {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [connected, setConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/integrations/google/status', { cache: 'no-store' });
      if (!res.ok) return;
      const data = (await res.json()) as StatusResponse;
      setConnected(Boolean(data.connected));
      setGoogleEmail(data.googleEmail ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const gcalStatus = url.searchParams.get('gcal');
      if (gcalStatus === 'connected') {
        setFeedback('Google Calendar collegato');
        url.searchParams.delete('gcal');
        url.searchParams.delete('reason');
        window.history.replaceState({}, '', url.toString());
      } else if (gcalStatus === 'error') {
        const reason = url.searchParams.get('reason') || 'errore_oauth';
        setFeedback(`Errore collegamento GCal (${reason})`);
        url.searchParams.delete('gcal');
        url.searchParams.delete('reason');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [loadStatus]);

  const handleConnect = () => {
    setBusy(true);
    window.location.assign('/api/integrations/google/connect');
  };

  const handleDisconnect = async () => {
    try {
      setBusy(true);
      setFeedback(null);
      const res = await fetch('/api/integrations/google/disconnect', { method: 'POST' });
      if (res.ok) {
        setConnected(false);
        setGoogleEmail(null);
        setFeedback('Google Calendar scollegato');
      }
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <span className="rounded-lg border border-[#2A3A66] bg-[#111E42] px-3 py-2 text-xs text-[#8A94A8]">
        Verifica GCal…
      </span>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {feedback && (
        <span className="rounded-md border border-[#2A3A66] bg-[#111E42] px-2.5 py-1 text-[11px] font-medium text-[#D5DCEB]">
          {feedback}
        </span>
      )}

      {connected ? (
        <div className="inline-flex items-center gap-2 rounded-lg border border-sky-500/35 bg-sky-500/10 px-3 py-1.5 text-xs">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          <span className="font-semibold text-sky-300">
            GCal{googleEmail ? `: ${googleEmail}` : ' attivo'}
          </span>
          <button
            type="button"
            disabled={busy}
            onClick={handleDisconnect}
            className="ml-1 rounded border border-sky-500/30 px-2 py-0.5 text-[11px] font-semibold text-sky-200 hover:bg-sky-500/20 disabled:opacity-50"
          >
            Scollega
          </button>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={handleConnect}
          className="inline-flex items-center gap-2 rounded-lg border border-[#2A3A66] bg-[#111E42] px-3.5 py-2 text-xs font-semibold text-white hover:border-[#FF5500] hover:bg-[#1B2540] disabled:opacity-50"
        >
          <span className="h-2 w-2 rounded-full bg-[#FF5500]" />
          {busy ? 'Connessione…' : 'Collega Google Calendar'}
        </button>
      )}
    </div>
  );
}
