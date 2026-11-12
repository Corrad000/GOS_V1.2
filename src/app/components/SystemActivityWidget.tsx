'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export function SystemActivityWidget() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchSystemActivity() {
      setLoading(true);
      try {
        // Recupera gli ultimi log di sistema
        const { data, error } = await supabase
          .from('gos_system_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setLogs(data || []);
      } catch (err) {
        // Fallback pulito se la tabella è vuota o in fase di popolamento
        setLogs([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSystemActivity();

    // Sottoscrizione Realtime opzionale per aggiornamenti live
    const channel = supabase
      .channel('public:gos_system_logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'gos_system_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev.slice(0, 9)]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-tight">Monitoraggio & Log di Sistema</h3>
          <p className="text-xs text-gray-400 mt-0.5">Flusso di attività e operazioni in tempo reale sull'infrastruttura GOS</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold">Live Supabase</span>
        </div>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs font-mono text-gray-400">Sincronizzazione log in corso...</div>
      ) : logs.length === 0 ? (
        <div className="p-8 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
          <p className="text-sm text-gray-400">Nessun evento di sistema registrato di recente.</p>
          <p className="text-xs text-gray-500">I log appariranno qui automaticamente non appena verranno eseguite azioni sulle aziende o sui progetti.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id || Math.random()} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-2 transition-all hover:border-gray-700">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 rounded font-mono text-[10px] font-bold uppercase">
                    {log.action || 'EVENTO'}
                  </span>
                  {log.company_code && (
                    <span className="text-[10px] font-mono text-gray-400">
                      [{log.company_code}]
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-200 font-medium">{log.description || 'Nessun dettaglio specificato.'}</p>
              </div>

              <span className="text-[10px] font-mono text-gray-500 self-end md:self-center">
                {new Date(log.created_at || Date.now()).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} — {new Date(log.created_at || Date.now()).toLocaleDateString('it-IT')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
