"use client";

import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface CruscottoProgettiProps {
  projectTitle?: string;
  financials?: {
    pnlRows: any[];
    cashFlowRows: any[];
    balanceSheetRows: any[];
    kpiRows: any[];
  };
}

export default function CruscottoProgetti({ projectTitle, financials }: CruscottoProgettiProps) {
  // Estrazione dati dal motore finanziario quinquennale (se disponibili, altrimenti fallback)
  const pnl = financials?.pnlRows || [];
  const cashFlow = financials?.cashFlowRows || [];
  const balanceSheet = financials?.balanceSheetRows || [];
  const kpis = financials?.kpiRows || [];

  // Ricavi e Costi per i 5 anni (per il grafico a linee)
  const revenuesRow = pnl.find(r => r.label.includes('Valore della Produzione'))?.values || [0, 0, 0, 0, 0];
  const ebitdaRow = pnl.find(r => r.label === 'EBITDA')?.values || [0, 0, 0, 0, 0];
  const netIncomeRow = pnl.find(r => r.label === 'Utile Netto')?.values || [0, 0, 0, 0, 0];

  const chartData = [
    { anno: 'Anno 1', ricavi: revenuesRow[0], ebitda: ebitdaRow[0], utile: netIncomeRow[0] },
    { anno: 'Anno 2', ricavi: revenuesRow[1], ebitda: ebitdaRow[1], utile: netIncomeRow[1] },
    { anno: 'Anno 3', ricavi: revenuesRow[2], ebitda: ebitdaRow[2], utile: netIncomeRow[2] },
    { anno: 'Anno 4', ricavi: revenuesRow[3], ebitda: ebitdaRow[3], utile: netIncomeRow[3] },
    { anno: 'Anno 5', ricavi: revenuesRow[4], ebitda: ebitdaRow[4], utile: netIncomeRow[4] },
  ];

  // Risultati del 5° Anno per le Card KPI
  const revYear5 = revenuesRow[4] || 0;
  const netYear5 = netIncomeRow[4] || 0;
  const cashYear5 = cashFlow.find(r => r.label.includes('Cassa alla fine'))?.values[4] || 0;
  const totalAssetsYear5 = balanceSheet.find(r => r.label.includes('Totale Attivo'))?.values[4] || 0;

  return (
    <div className="space-y-8 text-gray-100">
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-xl font-bold text-white uppercase tracking-tight">Cruscotto Strategico & Risultati Quinquennali</h2>
        <p className="text-xs text-gray-400 mt-0.5">Analisi di sintesi e proiezioni di fine piano per {projectTitle || 'il progetto'}</p>
      </div>

      {/* KPI - Risultati del 5° Anno (Conto Economico, Cassa, Stato Patrimoniale) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-gray-950 border border-gray-800 p-5 space-y-1 shadow-inner">
          <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Ricavi (Anno 5)</p>
          <p className="text-2xl font-mono font-bold text-white">€ {Math.round(revYear5).toLocaleString('it-IT')}</p>
          <p className="text-xs text-emerald-400 font-mono">Target fine piano</p>
        </div>

        <div className="rounded-xl bg-gray-950 border border-gray-800 p-5 space-y-1 shadow-inner">
          <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Utile Netto (Anno 5)</p>
          <p className="text-2xl font-mono font-bold text-amber-300">€ {Math.round(netYear5).toLocaleString('it-IT')}</p>
          <p className="text-xs text-gray-400 font-mono">Risultato netto annuale</p>
        </div>

        <div className="rounded-xl bg-gray-950 border border-gray-800 p-5 space-y-1 shadow-inner">
          <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Liquidità Finale (Cassa)</p>
          <p className="text-2xl font-mono font-bold text-white">€ {Math.round(cashYear5).toLocaleString('it-IT')}</p>
          <p className="text-xs text-emerald-400 font-mono">Cash flow cumulato</p>
        </div>

        <div className="rounded-xl bg-gray-950 border border-gray-800 p-5 space-y-1 shadow-inner">
          <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider">Totale Attivo (Patrimonio)</p>
          <p className="text-2xl font-mono font-bold text-white">€ {Math.round(totalAssetsYear5).toLocaleString('it-IT')}</p>
          <p className="text-xs text-gray-400 font-mono">Stato Patrimoniale Anno 5</p>
        </div>
      </section>

      {/* Grafico a Linee / Curve Pluriennale (Ricavi, EBITDA, Utile) */}
      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-4">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-tight">Dinamica Pluriennale dei Flussi (€)</h3>
          <p className="text-xs text-gray-400">Andamento quinquennale di Ricavi, EBITDA e Utile Netto</p>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#1F2937" strokeDasharray="3 3" />
              <XAxis dataKey="anno" tickLine={false} axisLine={false} stroke="#9CA3AF" />
              <YAxis tickLine={false} axisLine={false} width={60} stroke="#9CA3AF" />
              <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }} />
              <Legend />
              <Line type="monotone" dataKey="ricavi" name="Valore della Produzione" stroke="#FF5500" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="utile" name="Utile Netto" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Sezione KPI in Grafico (Sostituisce i progetti attivi) */}
      <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6 space-y-6">
        <div>
          <h3 className="text-base font-bold text-white uppercase tracking-tight">Indicatori di Performance (KPI) del Piano</h3>
          <p className="text-xs text-gray-400">Monitoraggio dei principali indici di redditività e sostenibilità finanziaria</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kpis.map((kpi: any, idx: number) => {
            const lastVal = kpi.values?.[4] || kpi.values?.[0] || 0;
            const displayVal = kpi.isPercentage ? `${lastVal.toFixed(1)}%` : `€ ${Math.round(lastVal).toLocaleString('it-IT')}`;
            const barWidth = kpi.isPercentage ? Math.min(100, Math.max(5, Math.abs(lastVal))) : 75;

            return (
              <div key={idx} className="bg-gray-900 border border-gray-800 p-4 rounded-xl space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-200">{kpi.label}</span>
                  <span className="text-xs font-mono font-bold text-amber-300">{displayVal}</span>
                </div>
                <div className="h-2 w-full rounded bg-gray-950 overflow-hidden">
                  <div 
                    className="h-full rounded bg-gradient-to-r from-amber-600 to-[#FF5500] transition-all duration-500" 
                    style={{ width: `${barWidth}%` }} 
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-gray-500">
                  <span>Anno 1-4</span>
                  <span>Target Anno 5</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
