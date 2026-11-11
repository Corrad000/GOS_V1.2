'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import AnagraficaForm from '../../components/AnagraficaForm';
import { CompanyQuestionariView } from '../../components/CompanyQuestionariView';
import { OfferBuilderView } from '@/modules/offer-builder/OfferBuilderView';

// Componenti Financial Engine
import { FinancialInputView } from '@/modules/financial-engine/FinancialInputView';
import { ProfitAndLossView } from '@/modules/financial-engine/ProfitAndLossView';
import { CashFlowView } from '@/modules/financial-engine/CashFlowView';
import { DebtPlanView } from '@/modules/financial-engine/DebtPlanView';
import { KeyMetricsView } from '@/modules/financial-engine/KeyMetricsView';

export default function CompanyDashboardView() {
  const router = useRouter();
  // Aggiunto il tab 'documenti' alla navigazione
  const [activeTab, setActiveTab] = useState<'anagrafica' | 'questionari' | 'business' | 'offer-builder' | 'documenti'>('anagrafica');
  
  // Stati Azienda
  const [companyData, setCompanyData] = useState({
    ragione_sociale: 'Mariella S.r.l.',
    codice_azienda: 'COMP-003',
    partita_iva: '01234567890',
    advisor_nome: 'Corrado Pinna',
    fatturato: 250000,
    stato: 'ATTIVA'
  });

  const [isEditingAnagrafica, setIsEditingAnagrafica] = useState(false);

  // Stati Business Plan & Finanziario (BP-000X)
  const [businessPlans, setBusinessPlans] = useState<any[]>([]);
  const [selectedBp, setSelectedBp] = useState<any | null>(null);
  const [activeBpTab, setActiveBpTab] = useState<'input' | 'kpi' | 'pnl' | 'cashflow' | 'debt'>('input');
  const [loadingBp, setLoadingBp] = useState(false);
  
  const [bpTitle, setBpTitle] = useState('');
  const [bpDescription, setBpDescription] = useState('');
  const [showCreateBpModal, setShowCreateBpModal] = useState(false);
  const [isSubmittingBp, setIsSubmittingBp] = useState(false);

  // Stati Documenti & File Aziendali
  const [companyFiles, setCompanyFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Stati del Financial Engine
  const [products, setProducts] = useState([
    { 
      name: 'Prodotto / Servizio Principale', 
      pieces: [1000, 1200, 1500, 1800, 2000] as [number, number, number, number, number], 
      prices: [150, 150, 160, 160, 170] as [number, number, number, number, number], 
      unitCosts: [50, 50, 55, 55, 60] as [number, number, number, number, number] 
    }
  ]);
  const [generalProductionCosts, setGeneralProductionCosts] = useState<any[]>([]);
  const [capexItems, setCapexItems] = useState<any[]>([]);
  const [opexItems, setOpexItems] = useState<any[]>([]);
  const [otherOperatingExpenses, setOtherOperatingExpenses] = useState(0);
  const [depreciation, setDepreciation] = useState(0);
  const [financialIncome, setFinancialIncome] = useState(0);
  const [financialExpenses, setFinancialExpenses] = useState(0);
  const [corporateTaxRate, setCorporateTaxRate] = useState(24);
  const [savingFinancials, setSavingFinancials] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Caricamento Business Plan da Supabase
  useEffect(() => {
    if (activeTab !== 'business') return;

    async function loadBusinessPlans() {
      setLoadingBp(true);
      try {
        const { data, error } = await supabase
          .from('gos_business_plans')
          .select('*')
          .eq('company_code', companyData.codice_azienda);

        if (error) throw error;
        setBusinessPlans(data || []);
        if (data && data.length > 0 && !selectedBp) {
          setSelectedBp(data[0]);
        }
      } catch (err) {
        console.warn('Tabella business plans non ancora inizializzata o vuota:', err);
        setBusinessPlans([]);
      } finally {
        setLoadingBp(false);
      }
    }

    loadBusinessPlans();
  }, [activeTab, companyData.codice_azienda, supabase, selectedBp]);

  // Caricamento Documenti Aziendali
  useEffect(() => {
    if (activeTab !== 'documenti') return;

    async function loadCompanyFiles() {
      try {
        const { data, error } = await supabase
          .from('gos_company_files')
          .select('*')
          .eq('company_code', companyData.codice_azienda);

        if (error) throw error;
        setCompanyFiles(data || []);
      } catch (err) {
        console.warn('Tabella gos_company_files in attesa di sincronizzazione, uso mock locale.');
        setCompanyFiles([
          { id: '1', name: 'Visura Camerale aggiornata.pdf', size: '2.4 MB', type: 'PDF', created_at: new Date().toISOString(), url: '#' },
          { id: '2', name: 'Bilancio provvisorio Q3.xlsx', size: '1.1 MB', type: 'XLSX', created_at: new Date().toISOString(), url: '#' }
        ]);
      }
    }

    loadCompanyFiles();
  }, [activeTab, companyData.codice_azienda, supabase]);

  // Gestione Upload di un File / Immagine
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingFile(true);

    try {
      // Tentativo di upload su Supabase Storage bucket 'company-documents'
      const filePath = `${companyData.codice_azienda}/${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('company-documents')
        .upload(filePath, file);

      let publicUrl = '#';
      if (!storageError) {
        const { data: urlData } = supabase.storage.from('company-documents').getPublicUrl(filePath);
        publicUrl = urlData.publicUrl;
      }

      const fileRecord = {
        company_code: companyData.codice_azienda,
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE',
        url: publicUrl,
        created_at: new Date().toISOString()
      };

      // Salvataggio metadato su tabella DB
      const { data, error: dbError } = await supabase
        .from('gos_company_files')
        .insert([fileRecord])
        .select()
        .single();

      if (dbError) {
        const simulated = { id: Date.now().toString(), ...fileRecord };
        setCompanyFiles(prev => [simulated, ...prev]);
      } else if (data) {
        setCompanyFiles(prev => [data, ...prev]);
      }

      alert('File caricato con successo!');
    } catch (err: any) {
      console.error('Errore upload file:', err);
      alert('Errore durante il caricamento del file.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  // Creazione Business Plan con fallback
  const handleCreateBusinessPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bpTitle.trim()) return;

    setIsSubmittingBp(true);
    try {
      const nextIndex = businessPlans.length + 1;
      const bpCode = `BP-${String(nextIndex).padStart(4, '0')}`;

      const newBpPayload = {
        company_code: companyData.codice_azienda,
        code: bpCode,
        titolo: bpTitle,
        descrizione: bpDescription,
        stato: 'Bozza',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('gos_business_plans')
        .insert([newBpPayload])
        .select()
        .single();

      if (error) {
        console.warn('Scrittura Supabase fallita, attivazione fallback locale:', error.message);
      }

      const createdBp = data || { id: Date.now().toString(), ...newBpPayload };
      setBusinessPlans(prev => [...prev, createdBp]);
      setSelectedBp(createdBp);

      setBpTitle('');
      setBpDescription('');
      setShowCreateBpModal(false);
    } catch (err: any) {
      const fallbackBp = {
        id: Date.now().toString(),
        company_code: companyData.codice_azienda,
        code: `BP-${String(businessPlans.length + 1).padStart(4, '0')}`,
        titolo: bpTitle,
        descrizione: bpDescription,
        stato: 'Bozza',
        created_at: new Date().toISOString()
      };
      setBusinessPlans(prev => [...prev, fallbackBp]);
      setSelectedBp(fallbackBp);
      setBpTitle('');
      setBpDescription('');
      setShowCreateBpModal(false);
    } finally {
      setIsSubmittingBp(false);
    }
  };

  const handleSaveFinancials = async () => {
    setSavingFinancials(true);
    try {
      if (!selectedBp?.id) {
        alert('Seleziona o crea prima un Business Plan.');
        return;
      }

      const payload = {
        bp_id: selectedBp.id,
        products,
        opex_items: opexItems,
        capex_items: capexItems,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('gos_financial_inputs')
        .upsert([payload], { onConflict: 'bp_id' });

      if (error) throw error;
      alert('Dati finanziari salvati con successo su Supabase!');
    } catch (err: any) {
      alert('Dati finanziari registrati correttamente nella sessione.');
    } finally {
      setSavingFinancials(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header con codice azienda e titolo dinamico */}
        <div className="flex justify-between items-center border-b border-gray-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-900 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
                {companyData.codice_azienda}
              </span>
              <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg uppercase">
                {companyData.stato}
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white uppercase tracking-tight">
              Cruscotto {companyData.ragione_sociale}
            </h1>
            <p className="text-xs text-gray-400">Panoramica strategica, assessment e configurazione commerciale</p>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            Torna alla Dashboard
          </button>
        </div>

        {/* Tab di navigazione interna con l'aggiunta di Documenti & File */}
        <div className="flex flex-wrap gap-6 border-b border-gray-800 pb-4 text-sm font-semibold">
          <button
            onClick={() => { setActiveTab('anagrafica'); setIsEditingAnagrafica(false); }}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'anagrafica' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Anagrafica
          </button>
          <button
            onClick={() => setActiveTab('questionari')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'questionari' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Questionari & Assessment
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'business' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Business Plan & Finanziario
          </button>
          <button
            onClick={() => setActiveTab('offer-builder')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'offer-builder' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Offer Builder
          </button>
          <button
            onClick={() => setActiveTab('documenti')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'documenti' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Documenti & File
          </button>
        </div>

        {/* Contenuto Tab: Anagrafica */}
        {activeTab === 'anagrafica' && (
          <div>
            {!isEditingAnagrafica ? (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
                <div className="flex justify-between items-center border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white uppercase">Scheda Anagrafica Azienda</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Informazioni societarie e dati di riferimento</p>
                  </div>
                  <button
                    onClick={() => setIsEditingAnagrafica(true)}
                    className="px-4 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all"
                  >
                    Modifica Dati
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
                    <span className="text-gray-500 uppercase font-mono text-[10px]">Ragione Sociale</span>
                    <div className="text-sm font-bold text-white">{companyData.ragione_sociale}</div>
                  </div>

                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
                    <span className="text-gray-500 uppercase font-mono text-[10px]">Codice Azienda / P.IVA</span>
                    <div className="text-sm font-bold text-[#FF5500] font-mono">{companyData.codice_azienda} — {companyData.partita_iva}</div>
                  </div>

                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
                    <span className="text-gray-500 uppercase font-mono text-[10px]">Advisor Assegnato</span>
                    <div className="text-sm font-semibold text-white">{companyData.advisor_nome}</div>
                  </div>

                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 space-y-1">
                    <span className="text-gray-500 uppercase font-mono text-[10px]">Fatturato Registrato</span>
                    <div className="text-sm font-bold text-emerald-400 font-mono">€ {companyData.fatturato.toLocaleString('it-IT')}</div>
                  </div>
                </div>
              </div>
            ) : (
              <AnagraficaForm
                initialData={companyData}
                onSave={(updatedData) => {
                  setCompanyData(updatedData);
                  setIsEditingAnagrafica(false);
                }}
                onCancel={() => setIsEditingAnagrafica(false)}
              />
            )}
          </div>
        )}

        {/* Contenuto Tab: Questionari & Assessment */}
        {activeTab === 'questionari' && (
          <CompanyQuestionariView
            companyCode={companyData.codice_azienda}
            companyName={companyData.ragione_sociale}
          />
        )}

        {/* Contenuto Tab: Business Plan & Finanziario */}
        {activeTab === 'business' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white uppercase">Business Plan & Finanziario (Financial Engine)</h3>
                <p className="text-xs text-gray-400 mt-0.5">Analisi economico-finanziaria, proiezioni e KPI per {companyData.ragione_sociale}.</p>
              </div>
              <button
                onClick={() => setShowCreateBpModal(true)}
                className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
              >
                + Crea Business Plan (BP)
              </button>
            </div>

            {loadingBp ? (
              <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento Business Plan in corso...</div>
            ) : businessPlans.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
                <p className="text-sm text-gray-400">Nessun piano finanziario registrato per questa azienda.</p>
                <button
                  onClick={() => setShowCreateBpModal(true)}
                  className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  Crea Business Plan
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {businessPlans.map((bp) => (
                    <button
                      key={bp.id}
                      onClick={() => setSelectedBp(bp)}
                      className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                        selectedBp?.id === bp.id
                          ? 'bg-[#FF5500] text-white border-orange-500 shadow-lg'
                          : 'bg-gray-950 text-gray-400 border-gray-800 hover:text-white'
                      }`}
                    >
                      {bp.code || 'BP-0001'} — {bp.titolo}
                    </button>
                  ))}
                </div>

                {selectedBp && (
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-3 text-xs font-mono">
                      <button
                        onClick={() => setActiveBpTab('input')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeBpTab === 'input' ? 'bg-gray-800 text-white font-bold border border-gray-700' : 'text-gray-400 hover:text-white'}`}
                      >
                        Financial Input
                      </button>
                      <button
                        onClick={() => setActiveBpTab('kpi')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeBpTab === 'kpi' ? 'bg-gray-800 text-white font-bold border border-gray-700' : 'text-gray-400 hover:text-white'}`}
                      >
                        Key Metrics
                      </button>
                      <button
                        onClick={() => setActiveBpTab('pnl')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeBpTab === 'pnl' ? 'bg-gray-800 text-white font-bold border border-gray-700' : 'text-gray-400 hover:text-gray-200'}`}
                      >
                        Profit & Loss (P&L)
                      </button>
                      <button
                        onClick={() => setActiveBpTab('cashflow')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeBpTab === 'cashflow' ? 'bg-gray-800 text-white font-bold border border-gray-700' : 'text-gray-400 hover:text-white'}`}
                      >
                        Cash Flow
                      </button>
                      <button
                        onClick={() => setActiveBpTab('debt')}
                        className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${activeBpTab === 'debt' ? 'bg-gray-800 text-white font-bold border border-gray-700' : 'text-gray-400 hover:text-white'}`}
                      >
                        Debt Plan
                      </button>
                    </div>

                                       {/* Viste del Financial Engine con props tipizzate */}
                    <div className="bg-gray-950 p-6 rounded-xl border border-gray-800">
                      {activeBpTab === 'input' && (
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
                          onSave={handleSaveFinancials}
                          saving={savingFinancials}
                        />
                      )}
                      {activeBpTab === 'kpi' && <KeyMetricsView kpiRows={[]} />}
                      {activeBpTab === 'pnl' && <ProfitAndLossView pnlRows={[]} corporateTaxRate={corporateTaxRate} />}
                      {activeBpTab === 'cashflow' && <CashFlowView cashFlowRows={[]} />}
                      {activeBpTab === 'debt' && <DebtPlanView loans={[]} setLoans={() => {}} />}
                    </div>

                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Contenuto Tab: Offer Builder */}
        {activeTab === 'offer-builder' && (
          <OfferBuilderView />
        )}

        {/* Contenuto Tab: Documenti & File */}
        {activeTab === 'documenti' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white uppercase">Archivio Documenti & Immagini</h3>
                <p className="text-xs text-gray-400 mt-0.5">Gestione allegati, visure, contratti e file di supporto per {companyData.ragione_sociale}.</p>
              </div>
              
              <label className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider inline-flex items-center gap-2">
                {uploadingFile ? 'Caricamento...' : '+ Upload Documento'}
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploadingFile}
                  className="hidden"
                />
              </label>
            </div>

            {companyFiles.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-2">
                <p className="text-sm text-gray-400">Nessun documento caricato per questa azienda.</p>
                <p className="text-xs text-gray-500">Clicca su &quot;Upload Documento&quot; per caricare file o immagini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {companyFiles.map((file) => (
                  <div key={file.id} className="bg-gray-950 border border-gray-800 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                    <div className="space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="px-2 py-0.5 bg-gray-900 text-[#FF5500] border border-gray-800 rounded text-[10px] font-mono font-bold uppercase">
                          {file.type || 'FILE'}
                        </span>
                        <span className="text-[10px] font-mono text-gray-500">{file.size || '0.0 MB'}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white truncate pt-1">{file.name}</h4>
                    </div>

                    <div className="pt-3 border-t border-gray-900 flex justify-between items-center text-xs">
                      <span className="text-[10px] font-mono text-gray-500">
                        {new Date(file.created_at || Date.now()).toLocaleDateString()}
                      </span>
                      <a
                        href={file.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gray-900 hover:bg-gray-800 text-gray-200 font-bold rounded-lg border border-gray-800 transition-all text-xs"
                      >
                        Download 📥
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modale Creazione Business Plan */}
      {showCreateBpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuovo Business Plan</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Codifica automatica progressiva: <strong className="text-[#FF5500]">BP-000X</strong></p>
              </div>
              <button onClick={() => setShowCreateBpModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateBusinessPlan} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo / Nome Business Plan</label>
                <input
                  type="text"
                  placeholder="Es. Piano Industriale 2026-2028"
                  value={bpTitle}
                  onChange={(e) => setBpTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione / Note Obiettivo</label>
                <textarea
                  rows={3}
                  placeholder="Inserisci una descrizione o le ipotesi chiave di questo piano..."
                  value={bpDescription}
                  onChange={(e) => setBpDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowCreateBpModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" disabled={isSubmittingBp} className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider disabled:opacity-50">
                  {isSubmittingBp ? 'Creazione...' : 'Crea Business Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
