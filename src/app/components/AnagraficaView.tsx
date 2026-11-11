'use client';

interface AnagraficaViewProps {
  company: {
    ragione_sociale: string;
    codice_azienda?: string;
    partita_iva?: string;
    advisor_nome?: string;
    fatturato?: number;
    stato?: string;
  };
}

export function AnagraficaView({ company }: AnagraficaViewProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
      <div className="flex justify-between items-center border-b border-gray-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase">Scheda Anagrafica Azienda</h3>
          <p className="text-xs text-gray-400 mt-0.5">Informazioni societarie e dati di riferimento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
          <span className="text-gray-500 uppercase font-mono text-[10px]">Ragione Sociale</span>
          <div className="text-sm font-bold text-white">{company.ragione_sociale}</div>
        </div>

        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
          <span className="text-gray-500 uppercase font-mono text-[10px]">Codice Azienda / P.IVA</span>
          <div className="text-sm font-bold text-amber-400 font-mono">{company.codice_azienda || company.partita_iva || '—'}</div>
        </div>

        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
          <span className="text-gray-500 uppercase font-mono text-[10px]">Advisor Assegnato</span>
          <div className="text-sm font-semibold text-white">{company.advisor_nome || 'Corrado Pinna'}</div>
        </div>

        <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
          <span className="text-gray-500 uppercase font-mono text-[10px]">Fatturato Registrato</span>
          <div className="text-sm font-bold text-emerald-400 font-mono">€ {(company.fatturato || 250000).toLocaleString('it-IT')}</div>
        </div>
      </div>
    </div>
  );
}
