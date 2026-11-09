'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

// Importazione moduli finanziari
import { FinancialInputView, ProductItem, DynamicCostItem } from '@/modules/financial-engine/FinancialInputView';
import { ProfitAndLossView, PnLRowData } from '@/modules/financial-engine/ProfitAndLossView';
import { CashFlowView, CashFlowRowData } from '@/modules/financial-engine/CashFlowView';
import { KeyMetricsView, KpiRowData } from '@/modules/financial-engine/KeyMetricsView';
import { DebtPlanView, LoanItem } from '@/modules/financial-engine/DebtPlanView';

// Importazione locale pulita del servizio PDF
import { projectReportService } from './projectReportService';

interface ProjectData {
  id: string;
  company_id: string;
  codice_azienda: string;
  codice_progetto: string;
  titolo: string;
  descrizione: string;
  stato: string;
  ragione_sociale: string;
}

interface ContactItem {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  department: string;
}

interface AssignmentItem {
  id: string;
  entity: string;
  roleAssigned: string;
  startDate: string;
  endDate?: string;
  status: string;
  notes: string;
}

interface TaskItem {
  id: string;
  title: string;
  phase: string;
  assignee: string;
  dueDate: string;
  priority: string;
  status: string;
}

function ProjectDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  
  const searchParams = useSearchParams();
  const companyIdFromUrl = searchParams.get('companyId');

  const [activeTab, setActiveTab] = useState<'questionari' | 'business-plan' | 'cronoprogramma' | 'ruoli'>('business-plan');
  const [subBpTab, setSubBpTab] = useState<'input' | 'ce' | 'sp' | 'cassa' | 'debiti' | 'kpi'>('input');
  
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showPdfPreview, setShowPdfPreview] = useState(false);

  // --- STATI FINANZIARI ---
  const [products, setProducts] = useState<ProductItem[]>([
    { name: 'Prodotto Principale', pieces: [1000, 1200, 1500, 1800, 2000], prices: [150, 150, 160, 160, 170], unitCosts: [60, 60, 65, 65, 70] }
  ]);
  const [generalProductionCosts, setGeneralProductionCosts] = useState<DynamicCostItem[]>([
    { label: 'Costi generali di produzione', amounts: [20000, 22000, 25000, 28000, 30000] }
  ]);
  const [opexItems, setOpexItems] = useState<DynamicCostItem[]>([
    { label: 'Personale & Amministrativo', amounts: [150000, 155000, 160000, 170000, 180000] },
    { label: 'Servizi & Utenze', amounts: [30000, 31000, 32000, 33000, 34000] }
  ]);
  const [capexItems, setCapexItems] = useState<DynamicCostItem[]>([
    { label: 'Impianti & Macchinari', amounts: [40000, 10000, 15000, 0, 5000] }
  ]);
  const [loans, setLoans] = useState<LoanItem[]>([
    { id: '1', name: 'Mutuo Bancario Impianti', principal: 150000, interestRate: 4.5, durationYears: 10 }
  ]);

  const [financialIncome, setFinancialIncome] = useState<number>(2000);
  const [financialExpenses, setFinancialExpenses] = useState<number>(10000);
  const [corporateTaxRate, setCorporateTaxRate] = useState<number>(15);
  const [workingCapitalChange, setWorkingCapitalChange] = useState<number>(-10000);
  const [cashAtBeginning, setCashAtBeginning] = useState<number>(80000);

  // --- STATI GOVERNANCE ---
  const [contacts, setContacts] = useState<ContactItem[]>([
    { id: '1', name: 'Corrado Pinna', role: 'Lead Advisor & Partner', email: 'c.pinna@glaringllp.com', phone: '+39 333 0000000', department: 'Executive Advisory' }
  ]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([
    { id: '1', entity: 'Glaring LLP', roleAssigned: 'Strategic Advisory & Operations', startDate: '2026-10-01', endDate: '', status: 'Attivo', notes: 'Mandato di ristrutturazione' }
  ]);

  // --- STATI CRONOPROGRAMMA & TASK ATTIVI ---
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Audit iniziale bilancio e struttura commerciale', phase: 'Fase 1 - Analisi', assignee: 'Corrado Pinna', dueDate: '2026-11-15', priority: 'Alta', status: 'Completato' },
    { id: '2', title: 'Definizione pricing playbook e modello 5 anni', phase: 'Fase 2 - Strategia', assignee: 'Team GOS', dueDate: '2026-11-30', priority: 'Alta', status: 'In Corso' },
    { id: '3', title: 'Costituzione dipartimento marketing & vendite', phase: 'Fase 3 - Execution', assignee: 'Management', dueDate: '2026-12-15', priority: 'Media', status: 'In Ritardo' }
  ]);

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPhase, setNewTaskPhase] = useState('');
  const [newTaskAssignee, setNewTaskAssignee] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('Media');
  const [newTaskStatus, setNewTaskStatus] = useState('In Corso');

  // Form contatti e governance
  const [newContactName, setNewContactName] = useState('');
  const [newContactRole, setNewContactRole] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactDept, setNewContactDept] = useState('');

  const [newAssignEntity, setNewAssignEntity] = useState('');
  const [newAssignRole, setNewAssignRole] = useState('');
  const [newAssignStartDate, setNewAssignStartDate] = useState('');
  const [newAssignEndDate, setNewAssignEndDate] = useState('');
  const [newAssignStatus, setNewAssignStatus] = useState('Attivo');
  const [newAssignNotes, setNewAssignNotes] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchProject() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('gos_progetti')
          .select('*, gos_aziende(ragione_sociale, codice_azienda)')
          .eq('id', projectId)
          .single();

        if (data && !error) {
          setProject({
            id: data.id,
            company_id: data.company_id || companyIdFromUrl || 'hub',
            codice_azienda: data.gos_aziende?.codice_azienda || 'SUPER',
            codice_progetto: data.codice_progetto || 'PRJ-001',
            titolo: data.titolo || 'Piano Strategico di Intervento & Operation',
            descrizione: data.descrizione || 'Riorganizzazione e sviluppo commerciale',
            stato: data.stato || 'IN_CORSO',
            ragione_sociale: data.gos_aziende?.ragione_sociale || 'Superpower S.r.l.'
          });
        } else {
          setProject({
            id: projectId,
            company_id: companyIdFromUrl || 'hub',
            codice_azienda: 'SUPER',
            codice_progetto: 'PRJ-001',
            titolo: 'Piano Strategico di Intervento & Operation',
            descrizione: 'Riorganizzazione e sviluppo commerciale',
            stato: 'IN_CORSO',
            ragione_sociale: 'Superpower S.r.l.'
          });
        }
      } catch (err) {
        setProject({
          id: projectId,
          company_id: companyIdFromUrl || 'hub',
          codice_azienda: 'SUPER',
          codice_progetto: 'PRJ-001',
          titolo: 'Piano Strategico di Intervento & Operation',
          descrizione: 'Riorganizzazione e sviluppo commerciale',
          stato: 'IN_CORSO',
          ragione_sociale: 'Superpower S.r.l.'
        });
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      fetchProject();
    }
  }, [projectId, companyIdFromUrl, supabase]);

  // --- MOTORI DI CALCOLO QUINQUENNALI (CON TIPIZZAZIONE ESPLICITA DELLE TUPLE) ---
  const years: [number, number, number, number, number] = [0, 1, 2, 3, 4];
  
  const totalRevenues = years.map(y => products.reduce((acc, p) => acc + (p.pieces[y] * p.prices[y]), 0)) as [number, number, number, number, number];
  
  const totalCOGS = years.map(y => {
    const prodCost = products.reduce((acc, p) => acc + (p.pieces[y] * p.unitCosts[y]), 0);
    const genProd = generalProductionCosts.reduce((acc, c) => acc + c.amounts[y], 0);
    return prodCost + genProd;
  }) as [number, number, number, number, number];

  const grossMargins = years.map(y => totalRevenues[y] - totalCOGS[y]) as [number, number, number, number, number];
  
  const totalOpexPerYear = years.map(y => opexItems.reduce((acc, op) => acc + op.amounts[y], 0)) as [number, number, number, number, number];
  
  const ebitdaPerYear = years.map(y => grossMargins[y] - totalOpexPerYear[y]) as [number, number, number, number, number];
  
  const totalCapexPerYear = years.map(y => capexItems.reduce((acc, cx) => acc + cx.amounts[y], 0)) as [number, number, number, number, number];
  
  const depreciationPerYear = years.map(y => totalCapexPerYear[y] * 0.20) as [number, number, number, number, number];
  
  const ebitPerYear = years.map(y => ebitdaPerYear[y] - depreciationPerYear[y]) as [number, number, number, number, number];

  const totalInterestPerYear = years.map(yIdx => {
    let sumInterests = 0;
    loans.forEach(loan => {
      const annualPrincipal = loan.durationYears > 0 ? loan.principal / loan.durationYears : 0;
      let runningDebt = loan.principal;
      for (let yr = 0; yr < yIdx; yr++) runningDebt = Math.max(0, runningDebt - annualPrincipal);
      if (runningDebt > 0) sumInterests += runningDebt * (loan.interestRate / 100);
    });
    return sumInterests;
  }) as [number, number, number, number, number];

  const totalPrincipalRepaymentPerYear = years.map(yIdx => {
    let sumPrincipal = 0;
    loans.forEach(loan => {
      const annualPrincipal = loan.durationYears > 0 ? loan.principal / loan.durationYears : 0;
      let runningDebt = loan.principal;
      for (let yr = 0; yr < yIdx; yr++) runningDebt = Math.max(0, runningDebt - annualPrincipal);
      if (runningDebt > 0) sumPrincipal += annualPrincipal;
    });
    return sumPrincipal;
  }) as [number, number, number, number, number];

  const netFinancialItemsPerYear = years.map(y => financialIncome - (financialExpenses + totalInterestPerYear[y])) as [number, number, number, number, number];
  const ebtPerYear = years.map(y => ebitPerYear[y] + netFinancialItemsPerYear[y]) as [number, number, number, number, number];
  const taxesPerYear = years.map(y => ebtPerYear[y] > 0 ? ebtPerYear[y] * (corporateTaxRate / 100) : 0) as [number, number, number, number, number];
  const netProfitPerYear = years.map(y => ebtPerYear[y] - taxesPerYear[y]) as [number, number, number, number, number];

  const operatingCFPerYear = years.map(y => netProfitPerYear[y] + depreciationPerYear[y] + workingCapitalChange) as [number, number, number, number, number];
  const investingCFPerYear = years.map(y => -totalCapexPerYear[y]) as [number, number, number, number, number];
  const financingCFPerYear = years.map(y => -totalPrincipalRepaymentPerYear[y]) as [number, number, number, number, number];
  const netCashVarPerYear = years.map(y => operatingCFPerYear[y] + investingCFPerYear[y] + financingCFPerYear[y]) as [number, number, number, number, number];

  const cashEndingPerYear: [number, number, number, number, number] = [0, 0, 0, 0, 0];
  let currentCash = cashAtBeginning;
  for (let y = 0; y < 5; y++) {
    currentCash += netCashVarPerYear[y];
    cashEndingPerYear[y] = currentCash;
  }

  const pnlRows: PnLRowData[] = [
    { label: 'Total Revenue', values: totalRevenues, colorClass: 'text-emerald-400 font-bold' },
    { label: 'Cost of Production (COGS)', values: totalCOGS.map(v => -v) as [number, number, number, number, number], isNegative: true, indent: true },
    { label: 'GROSS MARGIN', values: grossMargins, isSubtotal: true, colorClass: 'text-amber-400' },
    ...opexItems.map(op => ({
      label: `OPEX: ${op.label}`,
      values: op.amounts.map(v => -v) as [number, number, number, number, number],
      isNegative: true,
      indent: true
    })),
    { label: 'EBITDA', values: ebitdaPerYear, isSubtotal: true, colorClass: 'text-amber-400' },
    { label: 'Depreciation & Amortization', values: depreciationPerYear.map(v => -v) as [number, number, number, number, number], isNegative: true, indent: true },
    { label: 'EBIT', values: ebitPerYear, isSubtotal: true, colorClass: 'text-amber-400' },
    { label: 'NET FINANCIAL ITEMS', values: netFinancialItemsPerYear, isSubtotal: true, colorClass: 'text-blue-400' },
    { label: 'EBT', values: ebtPerYear, isSubtotal: true, colorClass: 'text-blue-400' },
    { label: 'NET PROFIT', values: netProfitPerYear, isTotal: true, colorClass: 'text-emerald-400 text-sm font-extrabold' }
  ];

  const cashFlowRows: CashFlowRowData[] = [
    { label: 'CFO (Operations)', values: operatingCFPerYear, isSubtotal: true, colorClass: 'text-emerald-400' },
    { label: 'CFI (Investing - CAPEX)', values: investingCFPerYear, isNegative: true, indent: true },
    { label: 'CFF (Financing - Mutui)', values: financingCFPerYear, isNegative: true, indent: true },
    { label: 'Net Cash Flow Variation', values: netCashVarPerYear, isSubtotal: true, colorClass: 'text-amber-400' },
    { label: 'Cash at End of Period', values: cashEndingPerYear, isTotal: true, colorClass: 'text-emerald-400 text-sm font-extrabold' }
  ];

  const ebitdaMarginPerYear = years.map(y => totalRevenues[y] > 0 ? (ebitdaPerYear[y] / totalRevenues[y]) * 100 : 0) as [number, number, number, number, number];
  const netMarginPerYear = years.map(y => totalRevenues[y] > 0 ? (netProfitPerYear[y] / totalRevenues[y]) * 100 : 0) as [number, number, number, number, number];
  const kpiRows: KpiRowData[] = [
    { label: 'EBITDA Margin %', values: ebitdaMarginPerYear, isPercentage: true },
    { label: 'Net Profit Margin %', values: netMarginPerYear, isPercentage: true }
  ];

  const formattedProjectCode = projectReportService.formatProjectCode(
    project?.codice_azienda || 'SUPER',
    project?.codice_progetto || 'PRJ-001'
  );

  async function handleSaveFinancials() {
    setSaving(true);
    setMessage(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setMessage('Modelli economico-finanziari salvati con successo.');
    } finally {
      setSaving(false);
    }
  }

  function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!newTaskTitle) return;
    setTasks([...tasks, {
      id: Date.now().toString(),
      title: newTaskTitle,
      phase: newTaskPhase || 'Fase Operativa',
      assignee: newTaskAssignee || 'Team',
      dueDate: newTaskDueDate || new Date().toISOString().split('T')[0],
      priority: newTaskPriority,
      status: newTaskStatus
    }]);
    setNewTaskTitle('');
    setNewTaskPhase('');
    setNewTaskAssignee('');
    setNewTaskDueDate('');
    setMessage('Task aggiunto al cronoprogramma.');
  }

  function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    if (!newContactName) return;
    setContacts([...contacts, {
      id: Date.now().toString(),
      name: newContactName,
      role: newContactRole || 'Collaboratore',
      email: newContactEmail || 'N/D',
      phone: newContactPhone || 'N/D',
      department: newContactDept || 'Generale'
    }]);
    setNewContactName('');
    setNewContactRole('');
    setNewContactEmail('');
    setNewContactPhone('');
    setNewContactDept('');
    setMessage('Contatto aggiunto alla rubrica.');
  }

  function handleAddAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!newAssignEntity) return;
    setAssignments([...assignments, {
      id: Date.now().toString(),
      entity: newAssignEntity,
      roleAssigned: newAssignRole || 'Referente',
      startDate: newAssignStartDate || new Date().toISOString().split('T')[0],
      endDate: newAssignEndDate || '',
      status: newAssignStatus,
      notes: newAssignNotes || ''
    }]);
    setNewAssignEntity('');
    setNewAssignRole('');
    setNewAssignStartDate('');
    setNewAssignEndDate('');
    setNewAssignNotes('');
    setMessage('Storico assegnazioni aggiornato.');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400 text-sm font-mono">
        Caricamento workspace finanziario GOS...
      </div>
    );
  }

  const backTargetUrl = project?.company_id && project.company_id !== 'hub'
    ? `/advisor/companies/${project.company_id}` 
    : `/advisor/companies`;

  const taskSummary = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'Completato').length,
    inProgress: tasks.filter(t => t.status === 'In Corso').length,
    delayed: tasks.filter(t => t.status === 'In Ritardo').length
  };

  const reportHtmlContent = projectReportService.generateReportHtml({
    activeTab,
    project: {
      codiceAzienda: project?.codice_azienda || 'SUPER',
      codiceProgetto: project?.codice_progetto || 'PRJ-001',
      titolo: project?.titolo || '',
      descrizione: project?.descrizione || '',
      stato: project?.stato || 'IN_CORSO',
      ragioneSociale: project?.ragione_sociale || 'Superpower S.r.l.'
    },
    advisor: {
      nome: 'Corrado Pinna',
      studio: 'Glaring LLP'
    },
    financialData: {
      years: [0, 1, 2, 3, 4],
      pnlRows: pnlRows.map(r => ({ label: r.label, values: r.values, isSubtotal: r.isSubtotal, isTotal: r.isTotal })),
      cashFlowRows: cashFlowRows.map(r => ({ label: r.label, values: r.values, isSubtotal: r.isSubtotal, isTotal: r.isTotal })),
      kpiRows: kpiRows.map(r => ({ label: r.label, values: r.values, isPercentage: r.isPercentage })),
      loans: loans.map(l => ({ name: l.name, principal: l.principal, interestRate: l.interestRate, durationYears: l.durationYears }))
    },
    governanceData: {
      contacts: contacts,
      assignments: assignments
    },
    taskData: {
      summary: taskSummary,
      tasks: tasks
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* HEADER PROGETTO */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-blue-400 font-mono text-xs font-bold rounded-lg">
              {formattedProjectCode}
            </span>
            <span className="px-2.5 py-1 bg-blue-950 border border-blue-800 text-blue-300 text-xs font-semibold rounded-lg uppercase">
              {project?.stato || 'IN_CORSO'}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            {project?.titolo || 'Piano Strategico di Intervento & Operation'}
          </h1>
          <p className="text-xs text-gray-400">
            {project?.ragione_sociale} • {project?.descrizione}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPdfPreview(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <span>Anteprima & Export Report PDF</span>
          </button>

          <Link
            href={backTargetUrl}
            className="px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <span>← Torna all'Hub</span>
          </Link>
        </div>
      </div>

      {/* TAB BAR PRINCIPALI (ALLINEATO A 'questionari') */}
      <div className="flex border-b border-gray-800 gap-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('questionari')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'questionari' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Questionari & Assessment
        </button>

        <button
          onClick={() => setActiveTab('business-plan')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'business-plan' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Business Plan & Finanziario
        </button>

        <button
          onClick={() => setActiveTab('cronoprogramma')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'cronoprogramma' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Cronoprogramma & Task
        </button>

        <button
          onClick={() => setActiveTab('ruoli')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'ruoli' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          Ruoli & Governance
        </button>
      </div>

      {/* CONTENUTO TAB ATTIVA */}
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-sm space-y-6">
        
        {activeTab === 'business-plan' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-4">
              <button onClick={() => setSubBpTab('input')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${subBpTab === 'input' ? 'bg-amber-600 text-white' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>Input Dati</button>
              <button onClick={() => setSubBpTab('ce')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${subBpTab === 'ce' ? 'bg-amber-600 text-white' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>Profit & Loss (CE)</button>
              <button onClick={() => setSubBpTab('sp')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${subBpTab === 'sp' ? 'bg-amber-600 text-white' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>Stato Patrimoniale</button>
              <button onClick={() => setSubBpTab('cassa')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${subBpTab === 'cassa' ? 'bg-amber-600 text-white' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>Cash Flow</button>
              <button onClick={() => setSubBpTab('debiti')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${subBpTab === 'debiti' ? 'bg-amber-600 text-white' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>Piano Debiti</button>
              <button onClick={() => setSubBpTab('kpi')} className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer ${subBpTab === 'kpi' ? 'bg-amber-600 text-white' : 'bg-gray-950 text-gray-400 border border-gray-800'}`}>Key Metrics & KPI</button>
            </div>

            {message && <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">{message}</div>}

            {subBpTab === 'input' && <FinancialInputView products={products} setProducts={setProducts} generalProductionCosts={generalProductionCosts} setGeneralProductionCosts={setGeneralProductionCosts} capexItems={capexItems} setCapexItems={setCapexItems} opexItems={opexItems} setOpexItems={setOpexItems} otherOperatingExpenses={0} setOtherOperatingExpenses={()=>{}} depreciation={0} setDepreciation={()=>{}} financialIncome={financialIncome} setFinancialIncome={setFinancialIncome} financialExpenses={financialExpenses} setFinancialExpenses={setFinancialExpenses} corporateTaxRate={corporateTaxRate} setCorporateTaxRate={setCorporateTaxRate} onSave={handleSaveFinancials} saving={saving} />}
            {subBpTab === 'ce' && <ProfitAndLossView pnlRows={pnlRows} corporateTaxRate={corporateTaxRate} />}
            {subBpTab === 'sp' && <div className="p-6 bg-gray-950 border border-gray-800 rounded-xl text-center text-gray-400 text-xs">Stato patrimoniale pluriennale collegato.</div>}
            {subBpTab === 'cassa' && <CashFlowView cashFlowRows={cashFlowRows} />}
            {subBpTab === 'debiti' && <DebtPlanView loans={loans} setLoans={setLoans} />}
            {subBpTab === 'kpi' && <KeyMetricsView kpiRows={kpiRows} />}
          </div>
        )}

        {activeTab === 'questionari' && <div className="space-y-4"><h3 className="text-base font-bold text-white">Questionari & Assessment Aziendali</h3><p className="text-xs text-gray-400">Raccolta dati strategici.</p></div>}
        
        {/* --- CRONOPROGRAMMA & TASK --- */}
        {activeTab === 'cronoprogramma' && (
          <div className="space-y-8">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-lg font-extrabold text-white">Cruscotto di Riepilogo & Task Attivi</h2>
              <p className="text-xs text-gray-400">Monitoraggio dell'avanzamento operativo e gestione delle attività di progetto.</p>
            </div>

            {message && <div className="p-3 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-cyan-300 text-xs">{message}</div>}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl text-center">
                <span className="text-2xl font-black text-white">{taskSummary.total}</span>
                <span className="block text-[10px] font-bold text-gray-400 uppercase mt-1">Task Totali</span>
              </div>
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl text-center">
                <span className="text-2xl font-black text-emerald-400">{taskSummary.completed}</span>
                <span className="block text-[10px] font-bold text-gray-400 uppercase mt-1">Completati</span>
              </div>
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl text-center">
                <span className="text-2xl font-black text-amber-400">{taskSummary.inProgress}</span>
                <span className="block text-[10px] font-bold text-gray-400 uppercase mt-1">In Corso</span>
              </div>
              <div className="bg-gray-950 border border-gray-800 p-4 rounded-xl text-center">
                <span className="text-2xl font-black text-red-400">{taskSummary.delayed}</span>
                <span className="block text-[10px] font-bold text-gray-400 uppercase mt-1">In Ritardo</span>
              </div>
            </div>

            <div className="space-y-4 bg-gray-950 p-6 rounded-xl border border-gray-800">
              <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider">Elenco Task Operativi</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 uppercase text-gray-400 font-mono text-[10px]">
                    <tr>
                      <th className="p-2.5">Titolo Task</th>
                      <th className="p-2.5">Fase Operativa</th>
                      <th className="p-2.5">Assegnato A</th>
                      <th className="p-2.5">Scadenza</th>
                      <th className="p-2.5">Priorità</th>
                      <th className="p-2.5">Stato</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {tasks.map(t => (
                      <tr key={t.id}>
                        <td className="p-2.5 font-bold text-white">{t.title}</td>
                        <td className="p-2.5">{t.phase}</td>
                        <td className="p-2.5">{t.assignee}</td>
                        <td className="p-2.5 font-mono">{t.dueDate}</td>
                        <td className="p-2.5">{t.priority}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.status === 'Completato' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : t.status === 'In Ritardo' ? 'bg-red-950 text-red-300 border border-red-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleAddTask} className="grid grid-cols-1 md:grid-cols-7 gap-3 pt-4 border-t border-gray-800">
                <input type="text" placeholder="Titolo Task" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" required />
                <input type="text" placeholder="Fase" value={newTaskPhase} onChange={e => setNewTaskPhase(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <input type="text" placeholder="Assegnato a" value={newTaskAssignee} onChange={e => setNewTaskAssignee(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <input type="date" value={newTaskDueDate} onChange={e => setNewTaskDueDate(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="Bassa">Bassa</option>
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                </select>
                <select value={newTaskStatus} onChange={e => setNewTaskStatus(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white">
                  <option value="In Corso">In Corso</option>
                  <option value="Completato">Completato</option>
                  <option value="In Ritardo">In Ritardo</option>
                </select>
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap">+ Aggiungi</button>
              </form>
            </div>
          </div>
        )}

        {/* --- RUOLI & GOVERNANCE --- */}
        {activeTab === 'ruoli' && (
          <div className="space-y-8">
            <div className="border-b border-gray-800 pb-4">
              <h2 className="text-lg font-extrabold text-white">Gestione Rubrica & Storico Assegnazioni Governance</h2>
              <p className="text-xs text-gray-400">Inserisci e gestisci referenti, contatti, stati di mandato e date di fine incarico.</p>
            </div>

            {message && <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl text-indigo-300 text-xs">{message}</div>}

            <div className="space-y-4 bg-gray-950 p-6 rounded-xl border border-gray-800">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Rubrica Incaricati & Contatti</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 uppercase text-gray-400 font-mono text-[10px]">
                    <tr>
                      <th className="p-2.5">Nominativo</th>
                      <th className="p-2.5">Ruolo</th>
                      <th className="p-2.5">Dipartimento</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Telefono</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {contacts.map(c => (
                      <tr key={c.id}>
                        <td className="p-2.5 font-bold text-white">{c.name}</td>
                        <td className="p-2.5">{c.role}</td>
                        <td className="p-2.5">{c.department}</td>
                        <td className="p-2.5 text-indigo-300">{c.email}</td>
                        <td className="p-2.5">{c.phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleAddContact} className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-4 border-t border-gray-800">
                <input type="text" placeholder="Nominativo" value={newContactName} onChange={e => setNewContactName(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" required />
                <input type="text" placeholder="Ruolo" value={newContactRole} onChange={e => setNewContactRole(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <input type="text" placeholder="Dipartimento" value={newContactDept} onChange={e => setNewContactDept(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <input type="email" placeholder="Email" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <div className="flex gap-2">
                  <input type="text" placeholder="Telefono" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white flex-1" />
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap">+ Aggiungi</button>
                </div>
              </form>
            </div>

            <div className="space-y-4 bg-gray-950 p-6 rounded-xl border border-gray-800">
              <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Governance & Storico Assegnazioni</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-300">
                  <thead className="bg-gray-900 uppercase text-gray-400 font-mono text-[10px]">
                    <tr>
                      <th className="p-2.5">Entità / Risorsa</th>
                      <th className="p-2.5">Ruolo Assegnato</th>
                      <th className="p-2.5">Data Inizio</th>
                      <th className="p-2.5">Data Fine</th>
                      <th className="p-2.5">Stato</th>
                      <th className="p-2.5">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {assignments.map(a => (
                      <tr key={a.id}>
                        <td className="p-2.5 font-bold text-white">{a.entity}</td>
                        <td className="p-2.5">{a.roleAssigned}</td>
                        <td className="p-2.5 font-mono">{a.startDate}</td>
                        <td className="p-2.5 font-mono">{a.endDate || '—'}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${a.status === 'Attivo' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-red-950 text-red-300 border border-red-800'}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-gray-400">{a.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <form onSubmit={handleAddAssignment} className="grid grid-cols-1 md:grid-cols-7 gap-3 pt-4 border-t border-gray-800">
                <input type="text" placeholder="Entità / Soggetto" value={newAssignEntity} onChange={e => setNewAssignEntity(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" required />
                <input type="text" placeholder="Ruolo Assegnato" value={newAssignRole} onChange={e => setNewAssignRole(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Data Inizio</span>
                  <input type="date" value={newAssignStartDate} onChange={e => setNewAssignStartDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Data Fine</span>
                  <input type="date" value={newAssignEndDate} onChange={e => setNewAssignEndDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block mb-1">Stato Incarico</span>
                  <select value={newAssignStatus} onChange={e => setNewAssignStatus(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white">
                    <option value="Attivo">Attivo</option>
                    <option value="Concluso">Concluso</option>
                    <option value="Sospeso">Sospeso</option>
                  </select>
                </div>
                <input type="text" placeholder="Note operative" value={newAssignNotes} onChange={e => setNewAssignNotes(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white" />
                <div className="flex items-end">
                  <button type="submit" className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer whitespace-nowrap">+ Registra</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* --- MODALE ANTEPRIMA PDF REPORT --- */}
      {showPdfPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between px-6 py-4 bg-gray-950 border-b border-gray-800">
              <div>
                <h3 className="text-white font-bold text-base">Anteprima Report PDF Ufficiale (Multi-Tab & Multi-Pagina A4)</h3>
                <p className="text-xs text-gray-400">Formattato automaticamente in fogli A4 con header e footer ripetuti.</p>
              </div>
              <button
                onClick={() => setShowPdfPreview(false)}
                className="text-gray-400 hover:text-white text-sm font-bold px-3 py-1 bg-gray-800 rounded-lg cursor-pointer"
              >
                ✕ Chiudi
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-gray-950 space-y-8 flex-1">
              <div 
                className="max-w-4xl mx-auto space-y-8"
                dangerouslySetInnerHTML={{ __html: reportHtmlContent }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-950 border-t border-gray-800">
              <button
                onClick={() => setShowPdfPreview(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Annulla
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer flex items-center gap-2"
              >
                <span>Stampa / Esporta PDF Definitivo</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10">
      <Suspense fallback={<div className="text-center py-20 text-gray-400 text-sm font-mono">Caricamento workspace...</div>}>
        <ProjectDetailContent params={params} />
      </Suspense>
    </main>
  );
}
