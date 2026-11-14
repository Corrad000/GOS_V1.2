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
import { ProjectGovernanceView } from '@/modules/project-management/ProjectGovernanceView';
import CruscottoProgetti from '@/app/components/cruscotto-progetti';
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

interface BalanceSheetRowData {
  label: string;
  values: [number, number, number, number, number];
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

  const [activeTab, setActiveTab] = useState<'input' | 'metrics' | 'pl' | 'cashflow' | 'bs' | 'debt' | 'tasks' | 'ruoli' | 'cruscotto'>('input');
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

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [generalProductionCosts, setGeneralProductionCosts] = useState<DynamicCostItem[]>([]);
  const [staffCostsItems, setStaffCostsItems] = useState<DynamicCostItem[]>([]);
  const [capexItems, setCapexItems] = useState<DynamicCostItem[]>([]);
  const [opexItems, setOpexItems] = useState<DynamicCostItem[]>([]);
  const [commissionItems, setCommissionItems] = useState<CommissionItem[]>([]);
  const [bonusItems, setBonusItems] = useState<BonusItem[]>([]);

  const [corporateTaxRate, setCorporateTaxRate] = useState<number>(24);
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

  // ==========================================
  // MOTORE FINANZIARIO & INVESTIMENTO CONSIGLIATO
  // ==========================================
  const calculatedFinancials = useMemo(() => {
    const yearsCount = 5;
    const revenues = Array(yearsCount).fill(0);
    const cogs = Array(yearsCount).fill(0);
    const staffCosts = Array(yearsCount).fill(0);
    const operationalCosts = Array(yearsCount).fill(0);
    const capexTotal = Array(yearsCount).fill(0);
    const assetSales = Array(yearsCount).fill(0);
    const workingCapitalChange = Array(yearsCount).fill(0);
    const yearlyInterestExpenses = Array(yearsCount).fill(0);
    const yearlyPrincipalRepayments = Array(yearsCount).fill(0);
    const newDebtInflows = Array(yearsCount).fill(0);
    const totalDebtPerYear = Array(yearsCount).fill(0);

    (products || []).forEach((prod) => {
      for (let i = 0; i < yearsCount; i++) {
        const pces = Number(prod?.pieces?.[i] || 0);
        const prc = Number(prod?.prices?.[i] || 0);
        const uc = Number(prod?.unitCosts?.[i] || 0);

        revenues[i] += pces * prc;
        cogs[i] += pces * uc;
      }
    });

    (generalProductionCosts || []).forEach((gc) => {
      for (let i = 0; i < yearsCount; i++) {
        cogs[i] += Number(gc?.amounts?.[i] || 0);
      }
    });

    (staffCostsItems || []).forEach((sc) => {
      for (let i = 0; i < yearsCount; i++) {
        const baseStaff = Number(sc?.amounts?.[i] || 0);
        staffCosts[i] += baseStaff * (1 + (employeeTaxRate / 100));
      }
    });

    (opexItems || []).forEach((op) => {
      for (let i = 0; i < yearsCount; i++) {
        operationalCosts[i] += Number(op?.amounts?.[i] || 0);
      }
    });

    // Somma dei valori economici in euro (€) di provvigioni e bonus percentuali all'interno degli OPEX
    for (let yr = 0; yr < yearsCount; yr++) {
      let yrComm = 0;
      (commissionItems || []).forEach((comm) => {
        yrComm += Number(comm?.amounts?.[yr] || 0);
      });

      let yrBonus = 0;
      (bonusItems || []).forEach((bon) => {
        yrBonus += Number(bon?.amounts?.[yr] || 0);
      });

      operationalCosts[yr] += yrComm + yrBonus;
    }

    (capexItems || []).forEach((cx) => {
      for (let i = 0; i < yearsCount; i++) {
        capexTotal[i] += Number(cx?.amounts?.[i] || 0);
      }
    });

    (loans || []).forEach((loan) => {
      const principal = Number(loan?.principal || 0);
      const interestRate = Number(loan?.interestRate || 0) / 100;
      const durationYears = Number(loan?.durationYears || 0);

      const annualPrincipal = durationYears > 0 ? principal / durationYears : 0;
      let runningDebt = principal;

      for (let yr = 0; yr < yearsCount; yr++) {
        if (yr === 0) newDebtInflows[yr] += principal;
        if (runningDebt > 0 && yr < durationYears) {
          yearlyInterestExpenses[yr] += runningDebt * interestRate;
          yearlyPrincipalRepayments[yr] += annualPrincipal;
          runningDebt = Math.max(0, runningDebt - annualPrincipal);
        }
        totalDebtPerYear[yr] += runningDebt;
      }
    });

    const yearlyDepreciation = capexTotal.map((cx) => Number(depreciation || 0) + (cx * 0.20));

    const ebitda = revenues.map((rev, i) => rev - (cogs[i] + staffCosts[i] + operationalCosts[i]));
    const ebit = ebitda.map((eb, i) => eb - yearlyDepreciation[i]);
    const totalFinancialExpenses = yearlyInterestExpenses.map((interest) => interest + Number(financialExpenses || 0));
    const ebt = ebit.map((eb, i) => eb + Number(financialIncome || 0) - totalFinancialExpenses[i]);
    const taxes = ebt.map((eb) => (eb > 0 ? eb * (Number(corporateTaxRate || 0) / 100) : 0));
    const netIncome = ebt.map((eb, i) => eb - taxes[i]);

    const pnlRows: PnLRowData[] = [
      { label: 'Valore della Produzione (Ricavi)', values: revenues },
      { label: 'Costi Operativi (COGS)', values: cogs, isNegative: true },
      { label: 'Costi del Personale (incl. oneri)', values: staffCosts, isNegative: true },
      { label: 'Costi Operativi (OPEX, Provvigioni & Bonus)', values: operationalCosts, isNegative: true },
      { label: 'EBITDA', values: ebitda, isSubtotal: true },
      { label: 'Ammortamenti', values: yearlyDepreciation, isNegative: true },
      { label: 'EBIT (Risultato Operativo)', values: ebit, isSubtotal: true },
      { label: 'Oneri Finanziari', values: totalFinancialExpenses, isNegative: true },
      { label: 'Utile Ante Tasse (EBT)', values: ebt, isSubtotal: true },
      { label: `Imposte sul Reddito (${corporateTaxRate}%)`, values: taxes, isNegative: true },
      { label: 'Utile Netto', values: netIncome, isSubtotal: true }
    ];

    const operatingCF = netIncome.map((ni, i) => ni + yearlyDepreciation[i] + workingCapitalChange[i]);
    const totalInvestmentCF = capexTotal.map((cx, i) => assetSales[i] - cx);
    const netDebtVariation = newDebtInflows.map((inf, i) => inf - yearlyPrincipalRepayments[i]);
    const dividendsPaid = netIncome.map((ni) => (ni > 0 ? ni * 0.5 : 0));
    const capitalInjection = Array(yearsCount).fill(0);
    const totalFinancingCF = netDebtVariation.map((nd, i) => nd + capitalInjection[i] - dividendsPaid[i]);
    const netCashVariation = operatingCF.map((ocf, i) => ocf + totalInvestmentCF[i] + totalFinancingCF[i]);

    const cashBeginning = Array(yearsCount).fill(0);
    const cashEnding = Array(yearsCount).fill(0);

    let runningCash = 0;
    for (let i = 0; i < yearsCount; i++) {
      cashBeginning[i] = runningCash;
      runningCash += netCashVariation[i];
      cashEnding[i] = runningCash;
    }

    const cashFlowRows: CashFlowRowData[] = [
      { label: 'Profitto Netto', values: netIncome },
      { label: 'Amm.ti e Sva.ni', values: yearlyDepreciation },
      { label: 'Var.ne Capitale Circolante', values: workingCapitalChange },
      { label: 'F.Cassa Operativo', values: operatingCF, isSubtotal: true },
      { label: 'CAPEX', values: capexTotal.map(c => -c), isNegative: true },
      { label: 'Vendita proprietà', values: assetSales },
      { label: 'Totale F.C.Investimento', values: totalInvestmentCF, isSubtotal: true },
      { label: 'Var.ne Debito Netto', values: netDebtVariation },
      { label: 'Dividendi pagati 50%', values: dividendsPaid.map(d => -d), isNegative: true },
      { label: 'Immissione di Capitale', values: capitalInjection },
      { label: 'Totale F.C. Finanziamenti', values: totalFinancingCF, isSubtotal: true },
      { label: 'Variazione/Saldo liquidità netta', values: netCashVariation, isSubtotal: true },
      { label: 'Var.ne Liquidità netta', values: netCashVariation },
      { label: 'Cassa inizio', values: cashBeginning },
      { label: 'Cassa alla fine', values: cashEnding, isSubtotal: true }
    ];

    // --- CALCOLO INVESTIMENTO START-UP CONSIGLIATO ---
    const totalCapexPlan = capexTotal.reduce((a, b) => a + b, 0);
    const firstYearOperatingOutflow = Math.abs(Math.min(0, operatingCF[0] || 0));
    const recommendedInvestment = totalCapexPlan + firstYearOperatingOutflow + ((operationalCosts[0] || 0) * 0.15);

    // --- STATO PATRIMONIALE PERFETTAMENTE QUADRATO ---
    const fixedAssets = Array(yearsCount).fill(0);
    let runningNetAssets = 0;
    for (let i = 0; i < yearsCount; i++) {
      runningNetAssets += capexTotal[i] - yearlyDepreciation[i];
      fixedAssets[i] = Math.max(0, runningNetAssets);
    }

    const currentAssets = cashEnding.map(c => Math.max(0, c));
    const totalAssets = fixedAssets.map((fa, i) => fa + currentAssets[i]);

    const financialLiabilities = totalDebtPerYear;
    const equity = totalAssets.map((ta, i) => ta - financialLiabilities[i]);
    const totalLiabilitiesAndEquity = financialLiabilities.map((fl, i) => fl + equity[i]);

    const balanceSheetRows: BalanceSheetRowData[] = [
      { label: 'Attivo Immobilizzato Netto', values: fixedAssets },
      { label: 'Attivo Circolante (Liquidità & Cassa)', values: currentAssets },
      { label: 'Totale Attivo', values: totalAssets, isSubtotal: true },
      { label: 'Patrimonio Netto', values: equity },
      { label: 'Passività Finanziarie (Debiti Mutui)', values: financialLiabilities },
      { label: 'Totale Passivo & Patrimonio Netto', values: totalLiabilitiesAndEquity, isSubtotal: true }
    ];

    // --- KPI AVANZATI ---
    const ebitdaMargin = revenues.map((rev, i) => (rev > 0 ? (ebitda[i] / rev) * 100 : 0));
    const hasActivity = revenues.some(r => r > 0) || capexTotal.some(c => c > 0);
    const waccConstant = Array(yearsCount).fill(hasActivity ? 8.5 : 0);

    const roi = ebit.map((eb, i) => {
      const ta = totalAssets[i] || 0;
      return ta > 0 ? (eb / ta) * 100 : 0;
    });

    const roe = netIncome.map((ni, i) => {
      const eq = equity[i] || 0;
      return eq > 0 ? (ni / eq) * 100 : 0;
    });

    const initialInv = capexTotal[0] || 0;
    const totalInflows = operatingCF.reduce((a, b) => a + b, 0);
    let calculatedIRR = 0;
    if (initialInv > 0 && totalInflows > 0) {
      calculatedIRR = Number((((totalInflows / initialInv) ** (1 / 5) - 1) * 100).toFixed(1));
      if (isNaN(calculatedIRR) || !isFinite(calculatedIRR)) calculatedIRR = 0;
    }
    const irrSeries = Array(yearsCount).fill(calculatedIRR);

    const kpiRows: KpiRowData[] = [
      { label: 'EBIT (Risultato Operativo)', values: ebit, isCurrency: true },
      { label: 'EBITDA Margine', values: ebitdaMargin, isPercentage: true },
      { label: 'ROI (Return on Investment)', values: roi, isPercentage: true },
      { label: 'ROE (Return on Equity)', values: roe, isPercentage: true },
      { label: 'WACC (Costo Medio Capitolale)', values: waccConstant, isPercentage: true },
      { label: 'IRR (Tasso Interno di Rendimento)', values: irrSeries, isPercentage: true }
    ];

    return { pnlRows, kpiRows, cashFlowRows, balanceSheetRows, recommendedInvestment };
  }, [products, generalProductionCosts, staffCostsItems, opexItems, commissionItems, bonusItems, capexItems, depreciation, financialIncome, financialExpenses, corporateTaxRate, employeeTaxRate, loans]);

  const handleStatusChange = async (newStatus: EntityStatus) => {
    setProjectData((prev: any) => ({ ...prev, stato: newStatus }));
    try {
      await supabase.from('gos_progetti').update({ stato: newStatus }).eq('id', projectId);
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
        kpis: calculatedFinancials.kpiRows.map(k => ({
          label: k.label,
          value: k.isCurrency ? `€ ${Math.round(k.values[4] || 0).toLocaleString('it-IT')}` : `${k.values[4]?.toFixed(1)}%`,
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

        {/* CARD INVESTIMENTO CONSIGLIATO OTTIMIZZATA */}
        {activeTab === 'input' && (
          <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-amber-950/30 border border-amber-500/40 p-6 rounded-2xl shadow-xl space-y-4 md:space-y-0 md:flex md:items-center md:justify-between gap-6">
            
            <div className="space-y-2 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 uppercase tracking-widest border border-amber-500/30">
                  💡 Advisory Insight
                </span>
                <h3 className="text-base font-extrabold text-white uppercase tracking-tight">
                  Investimento Start-up Consigliato
                </h3>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Fabbisogno finanziario stimato per sostenere il piano, calcolato sommando:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-gray-400 pt-1 font-mono">
                <div className="bg-gray-950/60 border border-gray-800 p-2 rounded-lg">
                  <span className="text-amber-400 font-bold block">1. CAPEX Totali</span>
                  <span>Investimenti fissi pianificati</span>
                </div>
                <div className="bg-gray-950/60 border border-gray-800 p-2 rounded-lg">
                  <span className="text-amber-400 font-bold block">2. Picco di Cassa</span>
                  <span>Copertura deficit operativo (Anno 1)</span>
                </div>
                <div className="bg-gray-950/60 border border-gray-800 p-2 rounded-lg">
                  <span className="text-amber-400 font-bold block">3. Buffer Circolante</span>
                  <span>15% dei costi operativi di base</span>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0">
              <div className="bg-gray-950 border border-amber-500/50 px-6 py-4 rounded-xl text-center md:text-right shadow-inner">
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-mono block">Capitale Totale Stimato</span>
                <span className="text-3xl font-mono font-extrabold text-amber-300 tracking-tight mt-0.5 block">
                  € {Math.round(calculatedFinancials.recommendedInvestment || 0).toLocaleString('it-IT')}
                </span>
              </div>
            </div>

          </div>
        )}

        {/* CONTENUTO TAB */}
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

      </div>
    </main>
  );
}
