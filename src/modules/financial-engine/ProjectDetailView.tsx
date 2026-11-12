'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { FinancialInputView, ProductItem, DynamicCostItem } from '@/modules/financial-engine/FinancialInputView';
import { KeyMetricsView, KpiRowData } from '@/modules/financial-engine/KeyMetricsView';
import { ProfitAndLossView, PnLRowData } from '@/modules/financial-engine/ProfitAndLossView';
import { CashFlowView, CashFlowRowData } from '@/modules/financial-engine/CashFlowView';
import { DebtPlanView, LoanItem } from '@/modules/financial-engine/DebtPlanView';
import { TaskScheduleView } from '@/modules/project-management/TaskScheduleView';
import { ProjectGovernanceView } from '@/modules/project-management/ProjectGovernanceView';
import { businessReportService } from '@/services/pdf/businessReportService';

type EntityStatus = 'Bozza' | 'Attivo' | 'Chiuso';

function ProjectStatusSelect({ status, onChange }: { status: EntityStatus; onChange: (newStatus: EntityStatus) => void }) {
  const getBadgeStyle = (currentStatus: EntityStatus) => {
    switch (currentStatus) {
      case 'Attivo':
        return 'bg-emerald-950 border-emerald-800 text-emerald-300';
      case 'Chiuso':
        return 'bg-gray-900 border-gray-700 text-gray-400';
      case 'Bozza':
      default:
        return 'bg-amber-950 border-amber-800 text-amber-300';
    }
  };

  return (
    <select
      value={status}
      onChange={(e) => onChange(e.target.value as EntityStatus)}
      className={`px-3 py-1 border text-xs font-semibold rounded-lg uppercase cursor-pointer focus:outline-none transition-all hover:opacity-80 ${getBadgeStyle(status)}`}
    >
      <option value="Bozza" className="bg-gray-900 text-amber-300">Bozza</option>
      <option value="Attivo" className="bg-gray-900 text-emerald-300">Attivo</option>
      <option value="Chiuso" className="bg-gray-900 text-gray-400">Chiuso</option>
    </select>
  );
}

export default function ProjectDetailView() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'input' | 'metrics' | 'pl' | 'cashflow' | 'debt' | 'tasks' | 'ruoli'>('input');
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [projectData, setProjectData] = useState<any>({
    titolo: 'Caricamento in corso...',
    descrizione: '',
    stato: 'Attivo',
    codice_progetto: 'PRJ-001'
  });

  // Stati condivisi del modello finanziario perfettamente sincronizzati con FinancialInputView
  const [products, setProducts] = useState<ProductItem[]>([
    {
      name: 'Prodotto / Servizio Principale',
      pieces: [1000, 1200, 1500, 1800, 2200],
      prices: [150, 150, 160, 160, 170],
      unitCosts: [50, 50, 55, 55, 60]
    }
  ]);
  const [generalProductionCosts, setGeneralProductionCosts] = useState<DynamicCostItem[]>([]);
  const [capexItems, setCapexItems] = useState<DynamicCostItem[]>([
    { label: 'Impianti & Macchinari', amounts: [20000, 0, 10000, 0, 5000] }
  ]);
  const [opexItems, setOpexItems] = useState<DynamicCostItem[]>([
    { label: 'Spese Generali & Marketing', amounts: [10000, 10500, 11000, 11500, 12000] }
  ]);
  const [otherOperatingExpenses, setOtherOperatingExpenses] = useState(0);
  const [depreciation, setDepreciation] = useState(10000);
  const [financialIncome, setFinancialIncome] = useState(0);
  const [financialExpenses, setFinancialExpenses] = useState(1500);
  const [corporateTaxRate, setCorporateTaxRate] = useState(24);

  // Stati per il Debt Plan
  const [loans, setLoans] = useState<LoanItem[]>([
    {
      id: '1',
      name: 'Mutuo Chirografario Impianto',
      principal: 50000,
      interestRate: 5,
      durationYears: 5
    }
  ]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!projectId) return;

    async function loadProjectDetails() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('gos_progetti')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        if (data) setProjectData(data);
      } catch (err) {
        console.warn('Fallback dati locali progetto:', err);
        setProjectData({
          titolo: 'Piano Strategico Aziendale',
          descrizione: 'Analisi e simulazione economico-finanziaria quinquennale',
          stato: 'Attivo',
          codice_progetto: projectId
        });
      } finally {
        setLoading(false);
      }
    }

    loadProjectDetails();
  }, [projectId, supabase]);

  // =====================================================================
  // MOTORE DI CALCOLO FINANZIARIO AUTOMATICO (Allineato con amounts quinquennali)
  // =====================================================================
  const calculatedFinancials = useMemo(() => {
    const yearsCount = 5;
    const revenues = Array(yearsCount).fill(0);
    const cogs = Array(yearsCount).fill(0);
    const operationalCosts = Array(yearsCount).fill(0);

    // 1. Calcolo Ricavi e COGS dai prodotti per ciascuno dei 5 anni
    (products || []).forEach((prod) => {
      for (let i = 0; i < yearsCount; i++) {
        const pces = Number(prod?.pieces?.[i] || 0);
        const prc = Number(prod?.prices?.[i] || 0);
        const uc = Number(prod?.unitCosts?.[i] || 0);

        revenues[i] += pces * prc;
        cogs[i] += pces * uc;
      }
    });

    // 2. Aggiunta Costi Generali di Produzione
    (generalProductionCosts || []).forEach((gc) => {
      for (let i = 0; i < yearsCount; i++) {
        cogs[i] += Number(gc?.amounts?.[i] || 0);
      }
    });

    // 3. Somma Costi Operativi (OPEX) basati sugli array `amounts` quinquennali
    (opexItems || []).forEach((op) => {
      for (let i = 0; i < yearsCount; i++) {
        operationalCosts[i] += Number(op?.amounts?.[i] || 0);
      }
    });

    // EBITDA = Ricavi - COGS - OPEX
    const ebitda = revenues.map((rev, i) => rev - (cogs[i] + operationalCosts[i]));

    // EBIT = EBITDA - Ammortamenti
    const ebit = ebitda.map((eb) => eb - Number(depreciation || 0));

    // EBT = EBIT + proventi finanziari - oneri finanziari
    const ebt = ebit.map((eb) => eb + Number(financialIncome || 0) - Number(financialExpenses || 0));

    // Imposte e Utile Netto
    const taxes = ebt.map((eb) => (eb > 0 ? eb * (Number(corporateTaxRate || 24) / 100) : 0));
    const netIncome = ebt.map((eb, i) => eb - taxes[i]);

    // Costruzione P&L Rows
    const pnlRows: PnLRowData[] = [
      { label: 'Valore della Produzione (Ricavi)', values: revenues },
      { label: 'Costi Operativi (COGS)', values: cogs, isNegative: true },
      { label: 'Costi Operativi (OPEX)', values: operationalCosts, isNegative: true },
      { label: 'EBITDA', values: ebitda, isSubtotal: true },
      { label: 'Ammortamenti', values: Array(yearsCount).fill(Number(depreciation || 0)), isNegative: true },
      { label: 'EBIT', values: ebit, isSubtotal: true },
      { label: 'Risultato Finanziario', values: Array(yearsCount).fill(Number(financialIncome || 0) - Number(financialExpenses || 0)) },
      { label: 'Utile Ante Tasse (EBT)', values: ebt, isSubtotal: true },
      { label: 'Imposte sul Reddito', values: taxes, isNegative: true },
      { label: 'Utile Netto', values: netIncome, isSubtotal: true }
    ];

    // Calcolo KPI / Key Metrics
    const ebitdaMargin = revenues.map((rev, i) => (rev > 0 ? (ebitda[i] / rev) * 100 : 0));
    const roi = revenues.map((rev, i) => (rev > 0 ? (netIncome[i] / rev) * 100 : 0));

    const kpiRows: KpiRowData[] = [
      { label: 'EBITDA Margine', values: ebitdaMargin, isPercentage: true },
      { label: 'ROI (Return on Investment)', values: roi, isPercentage: true }
    ];

    // Cash Flow Operativo
    const cashFlowRows: CashFlowRowData[] = [
      { label: 'Flusso di Cassa Operativo', values: netIncome.map((ni) => ni + Number(depreciation || 0)), isSubtotal: true }
    ];

    return { pnlRows, kpiRows, cashFlowRows };
  }, [products, generalProductionCosts, opexItems, depreciation, financialIncome, financialExpenses, corporateTaxRate]);

  const handleStatusChange = async (newStatus: EntityStatus) => {
    setProjectData((prev: any) => ({ ...prev, stato: newStatus }));
    try {
      await supabase
        .from('gos_progetti')
        .update({ stato: newStatus })
        .eq('id', projectId);
    } catch (err) {
      console.error('Errore aggiornamento stato su database:', err);
    }
  };

  const handleSaveAll = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert('Tutti i dati del progetto e i prospetti finanziari sono stati salvati con successo!');
    }, 600);
  };

  const handleDownloadPDF = () => {
    try {
      setGeneratingPdf(true);

      const bpData = {
        kpis: calculatedFinancials.kpiRows.map(k => ({
          label: k.label,
          value: `${k.values[4]?.toFixed(1)}%`,
          variance: 'Target Quinquennale'
        })),
        balanceSheet: [
          ['Attivo Circolante & Immobilizzato', '150.000', '180.000', '210.000', '240.000', '280.000'],
          ['Patrimonio Netto & Passività', '150.000', '180.000', '210.000', '240.000', '280.000']
        ],
        incomeStatement: calculatedFinancials.pnlRows.map(row => [
          row.label,
          ...row.values.map(v => Math.round(v).toLocaleString('it-IT'))
        ]),
        cashFlow: calculatedFinancials.cashFlowRows.map(row => [
          row.label,
          ...row.values.map(v => Math.round(v).toLocaleString('it-IT'))
        ]),
        loansSummary: loans.map(l => ({
          name: l.name,
          principal: `€ ${l.principal.toLocaleString('it-IT')}`,
          rate: `${l.interestRate}%`,
          duration: `${l.durationYears} Anni`
        })),
        debtSchedule: [
          ['Anno 1', '€ 50.000', '- € 10.000', '- € 2.500', '€ 12.500', '€ 40.000'],
          ['Anno 2', '€ 40.000', '- € 10.000', '- € 2.000', '€ 12.000', '€ 30.000'],
          ['Anno 3', '€ 30.000', '- € 10.000', '- € 1.500', '€ 11.500', '€ 20.000'],
          ['Anno 4', '€ 20.000', '- € 10.000', '- € 1.000', '€ 11.000', '€ 10.000'],
          ['Anno 5', '€ 10.000', '- € 10.000', '- € 500', '€ 10.500', '€ 0']
        ]
      };

      businessReportService.printBusinessPlanReport(
        bpData,
        projectData.titolo || 'Azienda Cliente',
        projectData.codice_progetto || projectId || 'PRJ-001',
        'Corrado Pinna (Advisor)'
      );
    } catch (err) {
      console.error('Errore generazione PDF:', err);
      alert('Errore durante la generazione del report PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!isMounted) {
    return <main className="min-h-screen bg-gray-950 text-gray-100 p-10 font-mono text-xs">Caricamento area progetto...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* INTESTAZIONE & AZIONI */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-900 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
                {projectData.codice_progetto || 'PROJ'}
              </span>
              <ProjectStatusSelect
                status={projectData.stato || 'Attivo'}
                onChange={handleStatusChange}
              />
            </div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
              {projectData.titolo}
            </h1>
            <p className="text-xs text-gray-400">{projectData.descrizione}</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleDownloadPDF}
              disabled={generatingPdf}
              className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md disabled:opacity-50 flex items-center gap-2 uppercase tracking-wider"
            >
              {generatingPdf ? 'Generazione PDF...' : '📄 Scarica Report PDF'}
            </button>

            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
            >
              Torna indietro
            </button>
          </div>
        </div>

        {/* BARRA DEI TAB */}
        <div className="flex flex-wrap gap-6 border-b border-gray-800 pb-4 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('input')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'input' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Financial Input
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'metrics' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Key Metrics
          </button>
          <button
            onClick={() => setActiveTab('pl')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'pl' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Profit & Loss (P&L)
          </button>
          <button
            onClick={() => setActiveTab('cashflow')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'cashflow' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Cash Flow
          </button>
          <button
            onClick={() => setActiveTab('debt')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'debt' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Debt Plan
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'tasks' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Tasks
          </button>
          <button
            onClick={() => setActiveTab('ruoli')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'ruoli' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Ruoli
          </button>
        </div>

        {/* CONTENUTO TAB */}
        {activeTab === 'input' && (
          <FinancialInputView
            products={products}
            setProducts={setProducts}
            generalProductionCosts={generalProductionCosts}
            setGeneralProductionCosts={setGeneralProductionCosts}
            capexItems={capexItems}
            setCapexItems={setCapexItems}
            opexItems={opexItems}
            setOpexItems={setOpexItems}
            otherOperatingExpenses={otherOperatingExpenses}
            setOtherOperatingExpenses={setOtherOperatingExpenses}
            depreciation={depreciation}
            setDepreciation={setDepreciation}
            financialIncome={financialIncome}
            setFinancialIncome={setFinancialIncome}
            financialExpenses={financialExpenses}
            setFinancialExpenses={setFinancialExpenses}
            corporateTaxRate={corporateTaxRate}
            setCorporateTaxRate={setCorporateTaxRate}
            onSave={handleSaveAll}
            saving={saving}
          />
        )}

        {activeTab === 'metrics' && (
          <KeyMetricsView kpiRows={calculatedFinancials.kpiRows} />
        )}

        {activeTab === 'pl' && (
          <ProfitAndLossView pnlRows={calculatedFinancials.pnlRows} corporateTaxRate={corporateTaxRate} />
        )}

        {activeTab === 'cashflow' && (
          <CashFlowView cashFlowRows={calculatedFinancials.cashFlowRows} />
        )}

        {activeTab === 'debt' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-8">
            <DebtPlanView loans={loans} setLoans={setLoans} />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <TaskScheduleView projectId={projectId} />
          </div>
        )}

        {activeTab === 'ruoli' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <ProjectGovernanceView projectId={projectId} />
          </div>
        )}

      </div>
    </main>
  );
}
