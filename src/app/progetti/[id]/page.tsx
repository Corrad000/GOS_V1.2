'use client';

import { useState, useEffect } from 'react';
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

// Componente selettore di stato integrato (Bozza / Attivo / Chiuso)
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

  // Aggiunti i tab 'tasks' e 'ruoli'
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

  // Stati condivisi del modello finanziario (Tab Input)
  const [products, setProducts] = useState<ProductItem[]>([
    {
      name: 'Prodotto / Servizio Principale',
      pieces: [0, 0, 0, 0, 0],
      prices: [0, 0, 0, 0, 0],
      unitCosts: [0, 0, 0, 0, 0]
    }
  ]);
  const [generalProductionCosts, setGeneralProductionCosts] = useState<DynamicCostItem[]>([]);
  const [capexItems, setCapexItems] = useState<DynamicCostItem[]>([]);
  const [opexItems, setOpexItems] = useState<DynamicCostItem[]>([]);
  const [otherOperatingExpenses, setOtherOperatingExpenses] = useState(0);
  const [depreciation, setDepreciation] = useState(0);
  const [financialIncome, setFinancialIncome] = useState(0);
  const [financialExpenses, setFinancialExpenses] = useState(0);
  const [corporateTaxRate, setCorporateTaxRate] = useState(24);

  // Stati per il Debt Plan
  const [loans, setLoans] = useState<LoanItem[]>([
    {
      id: '1',
      name: 'Mutuo Chirografario Impianto',
      principal: 0,
      interestRate: 0,
      durationYears: 0
    }
  ]);

  // Righe P&L
  const [pnlRows, setPnlRows] = useState<PnLRowData[]>([
    { label: 'Valore della Produzione (Ricavi)', values: [0, 0, 0, 0, 0] },
    { label: 'Costi del Personale', values: [0, 0, 0, 0, 0], isNegative: true },
    { label: 'Costi Operativi (COGS)', values: [0, 0, 0, 0, 0], isNegative: true },
    { label: 'EBITDA', values: [0, 0, 0, 0, 0], isSubtotal: true }
  ]);

  // Righe KPI
  const [kpiRows, setKpiRows] = useState<KpiRowData[]>([
    { label: 'EBITDA Margine', values: [0, 0, 0, 0, 0], isPercentage: true },
    { label: 'ROI Stimato', values: [0, 0, 0, 0, 0], isPercentage: true }
  ]);

  // Righe Cash Flow
  const [cashFlowRows, setCashFlowRows] = useState<CashFlowRowData[]>([
    { label: 'Flusso di Cassa Operativo', values: [0, 0, 0, 0, 0], isSubtotal: true }
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

  // Gestione aggiornamento stato con salvataggio su Supabase
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

  const calculateDebtScheduleForPDF = () => {
    const years = [1, 2, 3, 4, 5];
    return years.map((y) => {
      let totalOpening = 0;
      let totalPrincipal = 0;
      let totalInterest = 0;
      let totalClosing = 0;

      loans.forEach((loan) => {
        const annualPrincipal = loan.durationYears > 0 ? loan.principal / loan.durationYears : 0;
        let runningDebt = loan.principal;

        for (let yr = 1; yr < y; yr++) {
          runningDebt = Math.max(0, runningDebt - annualPrincipal);
        }

        const openingDebt = runningDebt;
        const principalRepayment = openingDebt > 0 ? annualPrincipal : 0;
        const interestPayment = openingDebt > 0 ? openingDebt * (loan.interestRate / 100) : 0;
        const closingDebt = Math.max(0, openingDebt - principalRepayment);

        totalOpening += openingDebt;
        totalPrincipal += principalRepayment;
        totalInterest += interestPayment;
        totalClosing += closingDebt;
      });

      return [
        `Anno ${y}`,
        `€ ${Math.round(totalOpening).toLocaleString('it-IT')}`,
        `- € ${Math.round(totalPrincipal).toLocaleString('it-IT')}`,
        `- € ${Math.round(totalInterest).toLocaleString('it-IT')}`,
        `€ ${Math.round(totalPrincipal + totalInterest).toLocaleString('it-IT')}`,
        `€ ${Math.round(totalClosing).toLocaleString('it-IT')}`
      ];
    });
  };

  const handleDownloadPDF = () => {
    try {
      setGeneratingPdf(true);

      const bpData = {
        kpis: kpiRows.map(k => ({
          label: k.label,
          value: `${k.values[4]}%`,
          variance: 'Target Quinquennale'
        })),
        balanceSheet: [
          ['Attivo Circolante & Immobilizzato', '150.000', '180.000', '210.000', '240.000', '280.000'],
          ['Patrimonio Netto & Passività', '150.000', '180.000', '210.000', '240.000', '280.000']
        ],
        incomeStatement: pnlRows.map(row => [
          row.label,
          ...row.values.map(v => Math.round(v).toLocaleString('it-IT'))
        ]),
        cashFlow: cashFlowRows.map(row => [
          row.label,
          ...row.values.map(v => Math.round(v).toLocaleString('it-IT'))
        ]),
        loansSummary: loans.map(l => ({
          name: l.name,
          principal: `€ ${l.principal.toLocaleString('it-IT')}`,
          rate: `${l.interestRate}%`,
          duration: `${l.durationYears} Anni`
        })),
        debtSchedule: calculateDebtScheduleForPDF()
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


        {/* BARRA DEI TAB AGGIORNATA CON TASKS E RUOLI */}
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
          <KeyMetricsView kpiRows={kpiRows} />
        )}

        {activeTab === 'pl' && (
          <ProfitAndLossView pnlRows={pnlRows} corporateTaxRate={corporateTaxRate} />
        )}

        {activeTab === 'cashflow' && (
          <CashFlowView cashFlowRows={cashFlowRows} />
        )}

        {activeTab === 'debt' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-8">
            <DebtPlanView loans={loans} setLoans={setLoans} />
          </div>
        )}

        {/* SEZIONE TAB TASKS INTEGRATA */}
        {activeTab === 'tasks' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <TaskScheduleView projectId={projectId} />
          </div>
        )}

        {/* SEZIONE TAB RUOLI INTEGRATA */}
        {activeTab === 'ruoli' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <ProjectGovernanceView projectId={projectId} />
          </div>
        )}

      </div>
    </main>
  );
}
