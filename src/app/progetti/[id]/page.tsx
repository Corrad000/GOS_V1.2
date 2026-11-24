'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { FinancialInputView, ProductItem, DynamicCostItem, CommissionItem, BonusItem } from '@/modules/financial-engine/FinancialInputView';
import { KeyMetricsView, KpiRowData } from '@/modules/financial-engine/KeyMetricsView';
import { KpiGuideView } from '@/modules/financial-engine/KpiGuideView';
import { ProfitAndLossView, PnLRowData } from '@/modules/financial-engine/ProfitAndLossView';
import { CashFlowView, CashFlowRowData } from '@/modules/financial-engine/CashFlowView';
import { DebtPlanView, LoanItem } from '@/modules/financial-engine/DebtPlanView';
import { TaskScheduleView } from '@/modules/project-management/TaskScheduleView';
import { KronosGanttView } from '@/modules/project-management/KronosGanttView';
import { ProjectGovernanceView } from '@/modules/project-management/ProjectGovernanceView';
import { StrategyEntryView, StrategyData } from '@/modules/project-management/StrategyEntryView';
import CruscottoProgetti from '@/app/components/cruscotto-progetti';
import { ReportTabSelectorModal, ReportTabKey } from '@/app/components/ReportTabSelectorModal';
import { businessReportService } from '@/services/pdf/businessReportService';
import { calculateFinancials } from '@/modules/financial-engine/financialCalculations';

type EntityStatus = 'Bozza' | 'Attivo' | 'Chiuso';
type FiveYearTuple = [number, number, number, number, number];

function toFiveYearTuple(arr: unknown[]): FiveYearTuple {
  return [
    Number(arr?.[0] ?? 0),
    Number(arr?.[1] ?? 0),
    Number(arr?.[2] ?? 0),
    Number(arr?.[3] ?? 0),
    Number(arr?.[4] ?? 0),
  ];
}

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

interface BalanceSheetRowData {
  label: string;
  values: FiveYearTuple;
  isSubtotal?: boolean;
}

function BalanceSheetView({ balanceSheetRows }: { balanceSheetRows: BalanceSheetRowData[] }) {
  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
      <div className="border-b border-gray-800 pb-4">
        <h3 className="text-base font-bold text-white uppercase tracking-tight">Stato Patrimoniale Pluriennale (Balance Sheet)</h3>
        <p className="text-xs text-gray-400 mt-0.5">Prospetto patrimoniale a 5 anni con quadratura contabile perfetta (Attivo = Passivo + Netto).</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-gray-950 text-gray-400 uppercase text-[10px]">
            <tr>
              <th className="py-3 px-4">Voce Patrimoniale</th>
              <th className="py-3 px-3 text-center">Anno 1</th>
              <th className="py-3 px-3 text-center">Anno 2</th>
              <th className="py-3 px-3 text-center">Anno 3</th>
              <th className="py-3 px-3 text-center">Anno 4</th>
              <th className="py-3 px-3 text-center">Anno 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/60 font-mono">
            {balanceSheetRows.map((row, idx) => (
              <tr key={idx} className={`hover:bg-gray-950/40 transition-colors ${row.isSubtotal ? 'bg-gray-950/60 font-bold text-amber-400' : 'text-gray-200'}`}>
                <td className="py-3 px-4 font-sans">{row.label}</td>
                {row.values.map((val, yIdx) => (
                  <td key={yIdx} className="py-3 px-3 text-center">
                    € {Math.round(val || 0).toLocaleString('it-IT')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ProjectDetailView() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'strategy' | 'input' | 'metrics' | 'pl' | 'cashflow' | 'bs' | 'debt' | 'tasks' | 'kronos' | 'ruoli' | 'cruscotto'>('strategy');
  const [isMounted, setIsMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [isTabModalOpen, setIsTabModalOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [projectData, setProjectData] = useState<any>({
    titolo: 'Caricamento in corso...',
    descrizione: '',
    stato: 'Attivo',
    codice_progetto: 'PRJ-001'
  });

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [generalProductionCosts, setGeneralProductionCosts] = useState<DynamicCostItem[]>([]);
  const [staffCostsItems, setStaffCostsItems] = useState<DynamicCostItem[]>([]);
  const [capexItems, setCapexItems] = useState<DynamicCostItem[]>([]);
  const [opexItems, setOpexItems] = useState<DynamicCostItem[]>([]);
  const [commissionItems, setCommissionItems] = useState<CommissionItem[]>([]);
  const [bonusItems, setBonusItems] = useState<BonusItem[]>([]);

  const [capitalInjection, setCapitalInjection] = useState<FiveYearTuple>([5000000, 0, 0, 0, 0]);
  const [dso, setDso] = useState<number>(5);
  const [dio, setDio] = useState<number>(3);
  const [dpo, setDpo] = useState<number>(2);

  const [strategy, setStrategy] = useState<StrategyData>({
    themeAndScope: '',
    painPoints: '',
    competitorsBenchmark: '',
    currentProductAsIs: '',
    ourProposedStrategy: ''
  });

  const [corporateTaxRate, setCorporateTaxRate] = useState<number>(15);
  const [employeeTaxRate, setEmployeeTaxRate] = useState<number>(30);

  const [depreciation, setDepreciation] = useState(0);
  const [financialIncome, setFinancialIncome] = useState(0);
  const [financialExpenses, setFinancialExpenses] = useState(0);

  const [loans, setLoans] = useState<LoanItem[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!projectId) return;

    async function loadProjectDetails() {
      try {
        const { data: projData, error: projError } = await supabase
          .from('gos_progetti')
          .select('*')
          .eq('id', projectId)
          .single();

        if (projError) throw projError;
        if (projData) {
          setProjectData(projData);
          if (projData.strategy_data) {
            setStrategy(projData.strategy_data);
          }
        }

        const { data: finData } = await supabase
          .from('gos_financial_data')
          .select('*')
          .eq('project_id', projectId)
          .single();

        if (finData) {
          if (finData.products) setProducts(finData.products);
          if (finData.general_production_costs) setGeneralProductionCosts(finData.general_production_costs);
          if (finData.staff_costs) setStaffCostsItems(finData.staff_costs);
          if (finData.capex_items) setCapexItems(finData.capex_items);
          if (finData.opex_items) setOpexItems(finData.opex_items);
          if (finData.commission_items) setCommissionItems(finData.commission_items);
          if (finData.bonus_items) setBonusItems(finData.bonus_items);
          if (finData.capital_injection) setCapitalInjection(toFiveYearTuple(finData.capital_injection));
          if (finData.dso !== undefined) setDso(finData.dso);
          if (finData.dio !== undefined) setDio(finData.dio);
          if (finData.dpo !== undefined) setDpo(finData.dpo);
          if (finData.corporate_tax_rate !== undefined) setCorporateTaxRate(finData.corporate_tax_rate);
          if (finData.employee_tax_rate !== undefined) setEmployeeTaxRate(finData.employee_tax_rate);
          if (finData.depreciation !== undefined) setDepreciation(finData.depreciation);
          if (finData.financial_income !== undefined) setFinancialIncome(finData.financial_income);
          if (finData.financial_expenses !== undefined) setFinancialExpenses(finData.financial_expenses);
        }
      } catch (err) {
        console.warn('Fallback dati:', err);
        setProjectData({
          titolo: 'Piano Strategico Aziendale',
          descrizione: 'Analisi e simulazione economico-finanziaria quinquennale',
          stato: 'Attivo',
          codice_progetto: projectId
        });
      }
    }

    loadProjectDetails();
  }, [projectId, supabase]);

  const calculatedFinancials = useMemo(() => {
    const raw = calculateFinancials({
      products,
      generalProductionCosts,
      staffCostsItems,
      capexItems,
      opexItems,
      commissionItems,
      bonusItems,
      loans,
      capitalInjection,
      dso,
      dio,
      dpo,
      corporateTaxRate,
      employeeTaxRate,
      depreciationOverride: depreciation,
      financialIncome,
      financialExpenses
    });

    const pnlRows: PnLRowData[] = (raw.pnlRows || []).map((row: any) => ({
      ...row,
      values: toFiveYearTuple(row.values || []),
    }));

    const kpiRows: KpiRowData[] = (raw.kpiRows || []).map((row: any) => ({
      ...row,
      values: toFiveYearTuple(row.values || []),
    }));

    const cashFlowRows: CashFlowRowData[] = (raw.cashFlowRows || []).map((row: any) => ({
      ...row,
      values: toFiveYearTuple(row.values || []),
    }));

    const balanceSheetRows: BalanceSheetRowData[] = (raw.balanceSheetRows || []).map((row: any) => ({
      ...row,
      values: toFiveYearTuple(row.values || []),
    }));

    return {
      ...raw,
      pnlRows,
      kpiRows,
      cashFlowRows,
      balanceSheetRows,
    };
  }, [
    products,
    generalProductionCosts,
    staffCostsItems,
    opexItems,
    commissionItems,
    bonusItems,
    capexItems,
    loans,
    capitalInjection,
    dso,
    dio,
    dpo,
    corporateTaxRate,
    employeeTaxRate,
    depreciation,
    financialIncome,
    financialExpenses
  ]);

  const handleStatusChange = async (newStatus: EntityStatus) => {
    setProjectData((prev: any) => ({ ...prev, stato: newStatus }));
    try {
      await supabase.from('gos_progetti').update({ stato: newStatus }).eq('id', projectId);
    } catch (err) {
      console.error('Errore aggiornamento stato:', err);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      await supabase
        .from('gos_progetti')
        .update({ strategy_data: strategy })
        .eq('id', projectId);

      const financialPayload = {
        project_id: projectId,
        products,
        general_production_costs: generalProductionCosts,
        staff_costs: staffCostsItems,
        capex_items: capexItems,
        opex_items: opexItems,
        commission_items: commissionItems,
        bonus_items: bonusItems,
        capital_injection: capitalInjection,
        dso,
        dio,
        dpo,
        corporate_tax_rate: corporateTaxRate,
        employee_tax_rate: employeeTaxRate,
        depreciation,
        financial_income: financialIncome,
        financial_expenses: financialExpenses,
        updated_at: new Date().toISOString()
      };

      const { error: finError } = await supabase
        .from('gos_financial_data')
        .upsert(financialPayload, { onConflict: 'project_id' });

      if (finError) throw finError;

      alert('Dati salvati con successo!');
    } catch (err) {
      console.error('Errore salvataggio:', err);
      alert('Errore durante il salvataggio.');
    } finally {
      setSaving(false);
    }
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

  const handleOpenReportModal = () => {
    setIsTabModalOpen(true);
  };

  const handleConfirmReportTabs = (selectedTabs: ReportTabKey[]) => {
    setIsTabModalOpen(false);
    try {
      setGeneratingPdf(true);

      const formatEuro = (v: number) => `€ ${Math.round(Number(v) || 0).toLocaleString('it-IT')}`;
      const findRowValues = (rows: Array<{ label: string; values: number[] }>, matcher: (lbl: string) => boolean): FiveYearTuple => {
        const found = rows.find((r) => matcher((r.label || '').toLowerCase()));
        return toFiveYearTuple(found?.values || []);
      };

      const pnlList = calculatedFinancials.pnlRows || [];
      const bsList = calculatedFinancials.balanceSheetRows || [];
      const cfList = calculatedFinancials.cashFlowRows || [];

      const ricaviVals = findRowValues(pnlList, (l) => l.includes('ricav') || l.includes('produzione'));
      const ebitdaVals = findRowValues(pnlList, (l) => l.includes('ebitda'));
      const utileNettoVals = findRowValues(pnlList, (l) => l.includes('utile netto') || l.includes('profitto netto'));
      const attivoVals = findRowValues(bsList, (l) => l.includes('totale attivo'));
      const cassaFinaleVals = findRowValues(cfList, (l) => l.includes('cassa alla fine') || l.includes('liquidità') || l.includes('cassa'));

      const strategyAdvisoryRows = [
        strategy.themeAndScope ? { titolo: 'Tema & Perimetro', dettaglio: strategy.themeAndScope } : null,
        strategy.painPoints ? { titolo: 'Pain Points', dettaglio: strategy.painPoints } : null,
        strategy.competitorsBenchmark ? { titolo: 'Benchmark Competitor', dettaglio: strategy.competitorsBenchmark } : null,
        strategy.currentProductAsIs ? { titolo: 'Situazione As-Is', dettaglio: strategy.currentProductAsIs } : null,
        strategy.ourProposedStrategy ? { titolo: 'Strategia Proposta', dettaglio: strategy.ourProposedStrategy } : null,
      ].filter((item): item is { titolo: string; dettaglio: string } => item !== null);

      const financialInputRows = [
        { driver: 'Aliquota Imposte Società', valore: `${corporateTaxRate}%` },
        { driver: 'DSO / DIO / DPO', valore: `${dso} / ${dio} / ${dpo} gg` },
        { driver: 'Ammortamenti Configurati', valore: formatEuro(depreciation) },
        { driver: 'Oneri Finanziari', valore: formatEuro(financialExpenses) },
      ];

      const bpData = {
        kpis: calculatedFinancials.kpiRows.map(k => ({
          label: k.label,
          value: k.isCurrency ? formatEuro(k.values[4] || 0) : `${k.values[4]?.toFixed(1)}%`,
          variance: 'Target Quinquennale'
        })),
        balanceSheet: calculatedFinancials.balanceSheetRows.map(row => [
          row.label,
          ...row.values.map(v => Math.round(v).toLocaleString('it-IT'))
        ]),
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
          principal: formatEuro(l.principal),
          rate: `${l.interestRate}%`,
          duration: `${l.durationYears} Anni`
        })),
        debtSchedule: calculateDebtScheduleForPDF(),
        strategyAdvisory: strategyAdvisoryRows,
        financialInputs: financialInputRows,
        cruscotto: {
          summaryCards: [
            { titolo: 'Ricavi (Anno 5)', valore: formatEuro(ricaviVals[4]), nota: 'Target fine piano' },
            { titolo: 'Utile Netto (Anno 5)', valore: formatEuro(utileNettoVals[4]), nota: 'Risultato netto annuale' },
            { titolo: 'Liquidità Finale (Cassa)', valore: formatEuro(cassaFinaleVals[4]), nota: 'Cash flow cumulatato' },
            { titolo: 'Totale Attivo (Patrimonio)', valore: formatEuro(attivoVals[4]), nota: 'Stato Patrimoniale Anno 5' },
          ],
          flowsSeries: [
            {
              serie: 'Valore della Produzione (Ricavi)',
              anno1: formatEuro(ricaviVals[0]),
              anno2: formatEuro(ricaviVals[1]),
              anno3: formatEuro(ricaviVals[2]),
              anno4: formatEuro(ricaviVals[3]),
              anno5: formatEuro(ricaviVals[4]),
            },
            {
              serie: 'EBITDA',
              anno1: formatEuro(ebitdaVals[0]),
              anno2: formatEuro(ebitdaVals[1]),
              anno3: formatEuro(ebitdaVals[2]),
              anno4: formatEuro(ebitdaVals[3]),
              anno5: formatEuro(ebitdaVals[4]),
            },
            {
              serie: 'Utile Netto',
              anno1: formatEuro(utileNettoVals[0]),
              anno2: formatEuro(utileNettoVals[1]),
              anno3: formatEuro(utileNettoVals[2]),
              anno4: formatEuro(utileNettoVals[3]),
              anno5: formatEuro(utileNettoVals[4]),
            },
          ],
          kpiIndicators: calculatedFinancials.kpiRows.map((k) => ({
            indicatore: k.label,
            valoreAnno5: k.isCurrency ? formatEuro(k.values[4] || 0) : `${k.values[4]?.toFixed(1)}%`,
            note: 'Target Anno 5',
          })),
        },
      };

      businessReportService.printBusinessPlanReport(
        bpData,
        projectData.titolo || 'Azienda Cliente',
        projectData.codice_progetto || projectId || 'PRJ-001',
        'Corrado Pinna (Advisor)',
        { selectedTabs }
      );
    } catch (err) {
      console.error('Errore PDF:', err);
      alert('Errore generazione PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (!isMounted) {
    return <main className="min-h-screen bg-gray-950 text-gray-100 p-10 font-mono text-xs">Caricamento...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">

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
              onClick={handleOpenReportModal}
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

        <div className="flex flex-wrap gap-6 border-b border-gray-800 pb-4 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('strategy')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'strategy' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Strategia & Advisory
          </button>
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
            onClick={() => setActiveTab('bs')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'bs' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Stato Patrimoniale
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
            onClick={() => setActiveTab('kronos')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'kronos' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Kronos
          </button>
          <button
            onClick={() => setActiveTab('ruoli')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'ruoli' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Ruoli
          </button>
          <button
            onClick={() => setActiveTab('cruscotto')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'cruscotto' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Cruscotto
          </button>
        </div>

        {activeTab === 'strategy' && (
          <StrategyEntryView
            strategy={strategy}
            setStrategy={setStrategy}
            onSave={handleSaveAll}
            saving={saving}
          />
        )}

        {activeTab === 'input' && (
          <FinancialInputView
            products={products}
            setProducts={setProducts}
            generalProductionCosts={generalProductionCosts}
            setGeneralProductionCosts={setGeneralProductionCosts}
            staffCostsItems={staffCostsItems}
            setStaffCostsItems={setStaffCostsItems}
            capexItems={capexItems}
            setCapexItems={setCapexItems}
            opexItems={opexItems}
            setOpexItems={setOpexItems}
            commissionItems={commissionItems}
            setCommissionItems={setCommissionItems}
            bonusItems={bonusItems}
            setBonusItems={setBonusItems}
            capitalInjection={capitalInjection}
            setCapitalInjection={setCapitalInjection}
            dso={dso}
            setDso={setDso}
            dio={dio}
            setDio={setDio}
            dpo={dpo}
            setDpo={setDpo}
            corporateTaxRate={corporateTaxRate}
            setCorporateTaxRate={setCorporateTaxRate}
            employeeTaxRate={employeeTaxRate}
            setEmployeeTaxRate={setEmployeeTaxRate}
            depreciation={depreciation}
            setDepreciation={setDepreciation}
            financialIncome={financialIncome}
            setFinancialIncome={setFinancialIncome}
            financialExpenses={financialExpenses}
            setFinancialExpenses={setFinancialExpenses}
            onSave={handleSaveAll}
            saving={saving}
          />
        )}

        {activeTab === 'metrics' && (
          <div className="space-y-6">
            <KeyMetricsView kpiRows={calculatedFinancials.kpiRows} />
            <KpiGuideView />
          </div>
        )}

        {activeTab === 'pl' && (
          <ProfitAndLossView pnlRows={calculatedFinancials.pnlRows} corporateTaxRate={corporateTaxRate} />
        )}

        {activeTab === 'cashflow' && (
          <CashFlowView cashFlowRows={calculatedFinancials.cashFlowRows} />
        )}

        {activeTab === 'bs' && (
          <BalanceSheetView balanceSheetRows={calculatedFinancials.balanceSheetRows} />
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

        {activeTab === 'kronos' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <KronosGanttView
              projectId={projectId}
              projectTitle={projectData.titolo}
              projectCode={projectData.codice_progetto}
            />
          </div>
        )}

        {activeTab === 'ruoli' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <ProjectGovernanceView projectId={projectId} />
          </div>
        )}

        {activeTab === 'cruscotto' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <CruscottoProgetti
              projectTitle={projectData.titolo}
              financials={{
                pnlRows: calculatedFinancials.pnlRows,
                cashFlowRows: calculatedFinancials.cashFlowRows,
                balanceSheetRows: calculatedFinancials.balanceSheetRows,
                kpiRows: calculatedFinancials.kpiRows,
              }}
            />
          </div>
        )}

        <ReportTabSelectorModal
          isOpen={isTabModalOpen}
          onClose={() => setIsTabModalOpen(false)}
          onConfirm={handleConfirmReportTabs}
          isGenerating={generatingPdf}
        />

      </div>
    </main>
  );
}
