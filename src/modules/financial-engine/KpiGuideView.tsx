'use client';

interface KpiDefinition {
  indicator: string;
  formula: string;
  description: string;
}

const kpiDefinitions: KpiDefinition[] = [
  {
    indicator: 'EBIT (Risultato Operativo)',
    formula: 'EBITDA - Ammortamenti & Svalutazioni',
    description: 'Misura il profitto generato dalla gestione tipica aziendale al lordo di oneri finanziari e tasse.'
  },
  {
    indicator: 'EBITDA Margine',
    formula: '(EBITDA / Valore della Produzione) × 100',
    description: 'Indica la redditività operativa pura delle vendite prima di ammortamenti e gestione finanziaria.'
  },
  {
    indicator: 'ROI (Return on Investment)',
    formula: '(EBIT / Totale Attivo) × 100',
    description: 'Esprime l’efficienza e la redditività degli investimenti complessivi impiegati nella gestione aziendale.'
  },
  {
    indicator: 'ROE (Return on Equity)',
    formula: '(Utile Netto / Patrimonio Netto) × 100',
    description: 'Misura la redditività del capitale di rischio investito dai soci o azionisti.'
  },
  {
    indicator: 'WACC (Costo Medio Ponderato del Capitale)',
    formula: 'Costo medio ponderato del debito e del capitale proprio',
    description: 'Rappresenta il tasso di rendimento minimo atteso dai finanziatori e dai portatori di capitale.'
  },
  {
    indicator: 'IRR (Tasso Interno di Rendimento)',
    formula: 'Tasso di sconto che azzera il VAN dei flussi di cassa',
    description: 'Misura la redditività complessiva e la bontà finanziaria del piano d’investimento quinquennale.'
  }
];

export function KpiGuideView() {
  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6 mt-8">
      <div className="border-b border-gray-800 pb-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight">Guida Metodologica & Formule KPI</h3>
        <p className="text-xs text-gray-400 mt-0.5">Dettaglio analitico dei criteri di calcolo adottati nel motore finanziario.</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-950 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Indicatore KPI</th>
              <th className="py-3 px-4">Formula di Calcolo</th>
              <th className="py-3 px-4">Significato Gestionale</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-mono">
            {kpiDefinitions.map((item, idx) => (
              <tr key={idx} className="hover:bg-gray-950/40 transition-colors text-gray-200">
                <td className="py-3 px-4 font-sans font-bold text-[#FF5500]">{item.indicator}</td>
                <td className="py-3 px-4 text-amber-300">{item.formula}</td>
                <td className="py-3 px-4 font-sans text-gray-400">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
