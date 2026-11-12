'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import AnagraficaForm from '../../components/AnagraficaForm';
import { AnagraficaView } from '../../components/AnagraficaView';
import { OfferBuilderView } from '@/modules/offer-builder/OfferBuilderView';
import { ModulePickerModal } from '@/modules/offer-builder/ModulePickerModal';
import { OfferPreviewView } from '@/modules/offer-builder/OfferPreviewView';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';

// Import della struttura pulita per i questionari aziendali
import { QuestionnaireBuilderView } from '@/modules/questionnaire-builder/QuestionnaireBuilderView';
import { QuestionnaireComposerView } from '@/modules/questionnaire-builder/QuestionnaireComposerView';
import { QuestionnairePreviewView } from '@/modules/questionnaire-builder/QuestionnairePreviewView';

export default function CompanyPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const [activeTab, setActiveTab] = useState<'anagrafica' | 'questionari' | 'business' | 'offer-builder' | 'documenti'>('anagrafica');
  const [loadingCompany, setLoadingCompany] = useState(true);
  
  const [companyData, setCompanyData] = useState({
    id: '',
    ragione_sociale: 'Caricamento in corso...',
    codice_azienda: '',
    partita_iva: '',
    codice_fiscale: '',
    categoria: '',
    indirizzo: '',
    citta: '',
    nazione: '',
    sito_web: '',
    referente: '',
    email: '',
    telefono: '',
    note: '',
    advisor_nome: 'Corrado Pinna',
    fatturato: 0,
    contratti_attivi: 0,
    stato: 'ATTIVA'
  });

  const [isEditingAnagrafica, setIsEditingAnagrafica] = useState(false);

  // Stati di navigazione interna per i Questionari (stile Offer Builder)
  const [activeQuestionario, setActiveQuestionario] = useState<any>(null);
  const [showQuestPreview, setShowQuestPreview] = useState(false);

  // Stati Business Plan
  const [businessPlans, setBusinessPlans] = useState<any[]>([]);
  const [loadingBp, setLoadingBp] = useState(false);
  const [bpTitle, setBpTitle] = useState('');
  const [bpDescription, setBpDescription] = useState('');
  const [bpStato, setBpStato] = useState('Bozza');
  const [showCreateBpModal, setShowCreateBpModal] = useState(false);
  const [isSubmittingBp, setIsSubmittingBp] = useState(false);

  // Stati Offerte Commerciali (Offer Builder)
  const [offersList, setOffersList] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [activeOffer, setActiveOffer] = useState<any>(null);
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  // Stati per la gestione del Picker moduli, della composizione offerta e dell'anteprima
  const [isModulePickerOpen, setIsModulePickerOpen] = useState(false);
  const [selectedCategoryForPicker, setSelectedCategoryForPicker] = useState<any>(null);
  const [selectedCompanyModules, setSelectedCompanyModules] = useState<any[]>([]);
  const [showOfferPreview, setShowOfferPreview] = useState(false);

  const handleRemoveCompanyModule = (moduleId: string) => {
    setSelectedCompanyModules(prev => prev.filter(m => m.id !== moduleId));
  };

  const [companyFiles, setCompanyFiles] = useState<any[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!companyId) return;

    async function fetchCompanyDetails() {
      setLoadingCompany(true);
      try {
        const { data, error } = await supabase
          .from('gos_aziende')
          .select('*')
          .eq('id', companyId)
          .single();

        if (error) throw error;

        if (data) {
          setCompanyData({
            id: data.id,
            ragione_sociale: data.ragione_sociale || 'Azienda senza nome',
            codice_azienda: data.codice_azienda || data.id,
            partita_iva: data.partita_iva || '',
            codice_fiscale: data.codice_fiscale || '',
            categoria: data.categoria || '',
            indirizzo: data.indirizzo || '',
            citta: data.citta || '',
            nazione: data.nazione || '',
            sito_web: data.sito_web || '',
            referente: data.referente || '',
            email: data.email || '',
            telefono: data.telefono || '',
            note: data.note || '',
            advisor_nome: data.advisor_nome || 'Corrado Pinna',
            fatturato: Number(data.fatturato || 0),
            contratti_attivi: Number(data.contratti_attivi || 0),
            stato: data.stato || 'ATTIVA'
          });
        }
      } catch (err: any) {
        console.error('Errore nel caricamento dell\'azienda:', err?.message || err);
      } finally {
        setLoadingCompany(false);
      }
    }

    fetchCompanyDetails();
  }, [companyId, supabase]);

  useEffect(() => {
    if (activeTab !== 'business' || !companyData.codice_azienda) return;

    async function loadProgetti() {
      setLoadingBp(true);
      try {
        const { data, error } = await supabase
          .from('gos_progetti')
          .select('*')
          .eq('company_code', companyData.codice_azienda);

        if (error) throw error;
        setBusinessPlans(data || []);
      } catch (err) {
        setBusinessPlans([]);
      } finally {
        setLoadingBp(false);
      }
    }

    loadProgetti();
  }, [activeTab, companyData.codice_azienda, supabase]);

  useEffect(() => {
    if (activeTab !== 'offer-builder' || !companyData.codice_azienda) return;

    async function loadOfferte() {
      setLoadingOffers(true);
      try {
        const { data, error } = await supabase
          .from('gos_offerte')
          .select('*')
          .eq('company_code', companyData.codice_azienda);

        if (error) throw error;
        setOffersList(data || []);
      } catch (err) {
        setOffersList([]);
      } finally {
        setLoadingOffers(false);
      }
    }

    loadOfferte();
  }, [activeTab, companyData.codice_azienda, supabase]);

  useEffect(() => {
    if (activeTab !== 'documenti' || !companyData.codice_azienda) return;

    async function loadCompanyFiles() {
      try {
        const { data, error } = await supabase
          .from('gos_company_files')
          .select('*')
          .eq('company_code', companyData.codice_azienda);

        if (error) throw error;
        setCompanyFiles(data || []);
      } catch (err) {
        setCompanyFiles([]);
      }
    }

    loadCompanyFiles();
  }, [activeTab, companyData.codice_azienda, supabase]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadingFile(true);

    try {
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

      const { data } = await supabase
        .from('gos_company_files')
        .insert([fileRecord])
        .select()
        .single();

      if (data) {
        setCompanyFiles(prev => [data, ...prev]);
      }

      alert('File caricato con successo!');
    } catch (err: any) {
      alert('Errore durante il caricamento del file.');
    } finally {
      setUploadingFile(false);
      e.target.value = '';
    }
  };

  const handleCreateBusinessPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bpTitle.trim()) return;

    setIsSubmittingBp(true);
    try {
      const codiceProgetto = await generateGlobalActivityCode(companyData.codice_azienda, 'PRJ');

      const newProgettoPayload = {
        company_code: companyData.codice_azienda,
        codice_progetto: codiceProgetto,
        titolo: bpTitle,
        descrizione: bpDescription,
        stato: bpStato,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('gos_progetti')
        .insert([newProgettoPayload])
        .select()
        .single();

      if (error) throw error;

      const created = data || { id: Date.now().toString(), ...newProgettoPayload };
      setBusinessPlans(prev => [...prev, created]);

      setBpTitle('');
      setBpDescription('');
      setBpStato('Bozza');
      setShowCreateBpModal(false);
      
      router.push(`/progetti/${created.id}`);
    } catch (err: any) {
      alert('Errore Supabase: ' + (err.message || 'Impossibile registrare il progetto.'));
    } finally {
      setIsSubmittingBp(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) return;

    setIsSubmittingOffer(true);
    try {
      const codiceOfferta = await generateGlobalActivityCode(companyData.codice_azienda, 'OFF');

      const newOfferPayload = {
        company_code: companyData.codice_azienda,
        codice_offerta: codiceOfferta,
        titolo: offerTitle,
        descrizione: offerDescription,
        stato: 'Bozza',
        moduli: [],
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('gos_offerte')
        .insert([newOfferPayload])
        .select()
        .single();

      if (error) throw error;

      const created = data || { id: Date.now().toString(), ...newOfferPayload };
      setOffersList(prev => [...prev, created]);

      setOfferTitle('');
      setOfferDescription('');
      setShowCreateOfferModal(false);
      
      setActiveOffer(created);
      setSelectedCompanyModules(created.moduli || []);
    } catch (err: any) {
      alert('Errore nella creazione dell\'offerta: ' + (err.message || err));
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
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
            <p className="text-xs text-gray-400">Panoramica strategica e configurazione commerciale</p>
          </div>

          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
          >
            Torna alla Dashboard
          </button>
        </div>

        {/* BARRA DEI TAB */}
        <div className="flex flex-wrap gap-6 border-b border-gray-800 pb-4 text-sm font-semibold">
          <button
            onClick={() => { setActiveTab('anagrafica'); setIsEditingAnagrafica(false); }}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'anagrafica' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Anagrafica
          </button>
          <button
            onClick={() => { setActiveTab('questionari'); setActiveQuestionario(null); setShowQuestPreview(false); }}
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
            onClick={() => { setActiveTab('offer-builder'); setActiveOffer(null); setShowOfferPreview(false); }}
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

        {activeTab === 'anagrafica' && (
          <div>
            {!isEditingAnagrafica ? (
              <AnagraficaView
                company={companyData}
                onEdit={() => setIsEditingAnagrafica(true)}
              />
            ) : (
              <AnagraficaForm
                initialData={companyData}
                onSave={async (updatedData) => {
                  try {
                    const { error } = await supabase
                      .from('gos_aziende')
                      .update({
                        ragione_sociale: updatedData.ragione_sociale,
                        partita_iva: updatedData.partita_iva,
                        codice_fiscale: updatedData.codice_fiscale,
                        categoria: updatedData.categoria,
                        indirizzo: updatedData.indirizzo,
                        citta: updatedData.citta,
                        nazione: updatedData.nazione,
                        sito_web: updatedData.sito_web,
                        referente: updatedData.referente,
                        email: updatedData.email,
                        telefono: updatedData.telefono,
                        advisor_nome: updatedData.advisor_nome,
                        fatturato: updatedData.fatturato,
                        note: updatedData.note,
                        stato: updatedData.stato
                      })
                      .eq('id', companyId);

                    if (error) throw error;

                    setCompanyData(prev => ({ ...prev, ...updatedData }));
                    setIsEditingAnagrafica(false);
                    alert('Dati aziendali aggiornati con successo!');
                  } catch (err: any) {
                    alert('Errore durante il salvataggio: ' + (err.message || err));
                  }
                }}
                onCancel={() => setIsEditingAnagrafica(false)}
              />
            )}
          </div>
        )}

        {/* TAB QUESTIONARI & ASSESSMENT */}
        {activeTab === 'questionari' && (
          <div className="space-y-6">
            {!activeQuestionario ? (
              <QuestionnaireBuilderView
                companyCode={companyData.codice_azienda}
                companyName={companyData.ragione_sociale}
                onOpenComposer={(q) => {
                  setActiveQuestionario(q);
                  setShowQuestPreview(false);
                }}
                onOpenPreview={(q) => {
                  setActiveQuestionario(q);
                  setShowQuestPreview(true);
                }}
              />
            ) : !showQuestPreview ? (
              <QuestionnaireComposerView
                companyCode={companyData.codice_azienda}
                companyName={companyData.ragione_sociale}
                questionario={activeQuestionario}
                onBack={() => setActiveQuestionario(null)}
                onOpenPreview={() => setShowQuestPreview(true)}
              />
            ) : (
              <QuestionnairePreviewView
                companyCode={companyData.codice_azienda}
                companyName={companyData.ragione_sociale}
                companyEmail={companyData.email}
                questionario={activeQuestionario}
                onBackToComposer={() => setShowQuestPreview(false)}
                onBackToList={() => {
                  setActiveQuestionario(null);
                  setShowQuestPreview(false);
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'business' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white uppercase">Progetti & Business Plan</h3>
                <p className="text-xs text-gray-400 mt-0.5">Elenco dei piani e progetti strategici sviluppati per {companyData.ragione_sociale}.</p>
              </div>
              <button
                onClick={() => setShowCreateBpModal(true)}
                className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
              >
                + Crea Nuovo Progetto
              </button>
            </div>

            {loadingBp ? (
              <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento progetti in corso...</div>
            ) : businessPlans.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
                <p className="text-sm text-gray-400">Nessun progetto registrato per questa azienda.</p>
                <button
                  onClick={() => setShowCreateBpModal(true)}
                  className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                >
                  Crea il primo Progetto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {businessPlans.map((proj) => (
                  <div key={proj.id} className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex justify-between items-start">
                        <span className="px-2.5 py-1 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-xs font-bold rounded-lg uppercase">
                          {proj.codice_progetto || 'PROJ'}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-semibold rounded uppercase">
                          {proj.stato || 'Bozza'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white uppercase">{proj.titolo}</h4>
                      <p className="text-xs text-gray-400 line-clamp-2">{proj.descrizione || 'Nessuna descrizione inserita.'}</p>
                    </div>

                    <div className="pt-3 border-t border-gray-900 flex justify-between items-center">
                      <span className="text-[10px] font-mono text-gray-500">
                        Creato il: {new Date(proj.created_at || Date.now()).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => router.push(`/progetti/${proj.id}`)}
                        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl border border-gray-800 transition-all text-xs cursor-pointer"
                      >
                        Apri Area Progetto -&gt;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* OFFER BUILDER INTEGRATO */}
        {activeTab === 'offer-builder' && (
          <div className="space-y-6">
            {!activeOffer ? (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white uppercase">Offerte Commerciali</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Elenco delle proposte commerciali e listini configurati per {companyData.ragione_sociale}.</p>
                  </div>
                  <button
                    onClick={() => setShowCreateOfferModal(true)}
                    className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
                  >
                    + Crea Nuova Offerta
                  </button>
                </div>

                {loadingOffers ? (
                  <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento offerte in corso...</div>
                ) : offersList.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
                    <p className="text-sm text-gray-400">Nessuna offerta commerciale registrata per questa azienda.</p>
                    <button
                      onClick={() => setShowCreateOfferModal(true)}
                      className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                    >
                      Crea la prima Offerta
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {offersList.map((off) => (
                      <div key={off.id} className="bg-gray-950 border border-gray-800 p-5 rounded-xl space-y-4 flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="px-2.5 py-1 bg-gray-900 text-[#FF5500] border border-gray-800 font-mono text-xs font-bold rounded-lg uppercase">
                              {off.codice_offerta || 'OFF'}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-semibold rounded uppercase">
                              {off.stato || 'Bozza'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white uppercase">{off.titolo}</h4>
                          <p className="text-xs text-gray-400 line-clamp-2">{off.descrizione || 'Nessuna descrizione inserita.'}</p>
                        </div>

                        <div className="pt-3 border-t border-gray-900 flex justify-between items-center">
                          <span className="text-[10px] font-mono text-gray-500">
                            Creato il: {new Date(off.created_at || Date.now()).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              setActiveOffer(off);
                              setSelectedCompanyModules(off.moduli || []);
                            }}
                            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl border border-gray-800 transition-all text-xs cursor-pointer"
                          >
                            Apri Composizione -&gt;
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-gray-900 border border-gray-800 p-4 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-gray-950 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
                      {activeOffer.codice_offerta}
                    </span>
                    <h3 className="text-sm font-extrabold text-white uppercase">{activeOffer.titolo}</h3>
                  </div>
                  <button
                    onClick={() => setActiveOffer(null)}
                    className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-gray-300 border border-gray-800 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                  >
                    &lt;- Torna alla Lista Offerte
                  </button>
                </div>

                {!showOfferPreview ? (
                  <div className="space-y-6">
                    {selectedCompanyModules.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowOfferPreview(true)}
                          className="px-5 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider flex items-center gap-2"
                        >
                          👁️ Visualizza Anteprima Proposta in Chiaro
                        </button>
                      </div>
                    )}

                    <OfferBuilderView 
                      companyId={companyId}
                      companyCode={companyData.codice_azienda}
                      selectedCompanyModules={selectedCompanyModules}
                      onRemoveModule={handleRemoveCompanyModule}
                      onOpenModulePicker={(category: any) => {
                        setSelectedCategoryForPicker(category);
                        setIsModulePickerOpen(true);
                      }}
                    />
                  </div>
                ) : (
                  <OfferPreviewView
                    companyData={companyData}
                    selectedModules={selectedCompanyModules}
                    onBackToBuilder={() => setShowOfferPreview(false)}
                  />
                )}

                <ModulePickerModal
                  selectedCategory={selectedCategoryForPicker}
                  isOpen={isModulePickerOpen}
                  onClose={() => setIsModulePickerOpen(false)}
                  onSelectModule={(module: any) => {
                    if (selectedCompanyModules.some(m => m.id === module.id)) {
                      alert('Questo modulo è già stato aggiunto all\'offerta.');
                      return;
                    }
                    setSelectedCompanyModules(prev => [...prev, module]);
                    alert(`Modulo "${module.title || module.titolo}" aggiunto con successo!`);
                    setIsModulePickerOpen(false);
                  }}
                />
              </div>
            )}
          </div>
        )}

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
                <p className="text-xs text-gray-500">Clicca su Upload Documento per caricare file o immagini.</p>
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
                        Download
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {showCreateBpModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuovo Progetto / Business Plan</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Inserimento diretto su gos_progetti</p>
              </div>
              <button onClick={() => setShowCreateBpModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">X</button>
            </div>

            <form onSubmit={handleCreateBusinessPlan} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo / Nome Progetto</label>
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
                  {isSubmittingBp ? 'Creazione...' : 'Crea Progetto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateOfferModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuova Offerta Commerciale</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Generazione automatica codice univoco OFF</p>
              </div>
              <button onClick={() => setShowCreateOfferModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">X</button>
            </div>

            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo Offerta</label>
                <input
                  type="text"
                  placeholder="Es. Pacchetto Advisory & Automazione Q1"
                  value={offerTitle}
                  onChange={(e) => setOfferTitle(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Descrizione / Note Proposta</label>
                <textarea
                  rows={3}
                  placeholder="Inserisci i dettagli e gli obiettivi di questa offerta..."
                  value={offerDescription}
                  onChange={(e) => setOfferDescription(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowCreateOfferModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" disabled={isSubmittingOffer} className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider disabled:opacity-50">
                  {isSubmittingOffer ? 'Creazione...' : 'Crea Offerta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
