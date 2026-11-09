'use client';

import { useState, useEffect, use, Suspense } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';

// Importazione del modulo Offer Builder
import { OfferBuilderView } from '@/modules/offer-builder/OfferBuilderView';

interface CustomField {
  label: string;
  value: string;
}

interface CompanyData {
  id: string;
  ragione_sociale: string;
  codice_fiscale?: string;
  vat?: string;
  indirizzo?: string;
  codice_postale?: string;
  nazione?: string;
  sito_web?: string;
  responsabile?: string;
  mail?: string;
  telefono?: string;
  citta?: string;
  categoria?: string;
  custom_fields?: CustomField[];
}

interface ProjectItem {
  id: string;
  company_id: string;
  codice_progetto: string;
  titolo: string;
  descrizione: string;
  stato: 'IN_CORSO' | 'COMPLETATO' | 'DISMESSO';
}

interface DocumentItem {
  id: string;
  title: string;
  type: 'FILE' | 'LINK';
  urlOrData: string;
  fileSize?: string;
  date: string;
}

function CompanyDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const companyId = resolvedParams.id;

  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'questionnaires' | 'documents' | 'offer-builder'>('overview');
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Stato form nuovo progetto
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectCode, setNewProjectCode] = useState('PRJ-002');
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectStatus, setNewProjectStatus] = useState<'IN_CORSO' | 'COMPLETATO' | 'DISMESSO'>('IN_CORSO');

  // Campi custom anagrafica
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  // --- STATO DOCUMENTI & LINK ---
  const [documents, setDocuments] = useState<DocumentItem[]>([
    {
      id: 'doc-1',
      title: 'Visura Camerale Aggiornata',
      type: 'LINK',
      urlOrData: 'https://les.infocamere.it',
      date: '2026-11-01'
    },
    {
      id: 'doc-2',
      title: 'Bilancio Consolidato Anno Precedente',
      type: 'FILE',
      urlOrData: '#',
      fileSize: '2.4 MB',
      date: '2026-10-15'
    }
  ]);

  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<'FILE' | 'LINK'>('LINK');
  const [docUrl, setDocUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    async function fetchCompanyAndProjects() {
      try {
        setLoading(true);
        
        const { data: compData, error: compError } = await supabase
          .from('gos_aziende')
          .select('*')
          .eq('id', companyId)
          .single();

        if (compData && !compError) {
          setCompany({
            id: compData.id,
            ragione_sociale: compData.ragione_sociale || '',
            codice_fiscale: compData.codice_fiscale || '',
            vat: compData.vat || '',
            indirizzo: compData.indirizzo || '',
            codice_postale: compData.codice_postale || '',
            nazione: compData.nazione || 'Italia',
            sito_web: compData.sito_web || '',
            responsabile: compData.responsabile || '',
            mail: compData.mail || '',
            telefono: compData.telefono || '',
            citta: compData.citta || '',
            categoria: compData.categoria || '',
            custom_fields: compData.custom_fields || []
          });
        } else {
          setCompany({
            id: companyId,
            ragione_sociale: 'Superpower S.r.l.',
            codice_fiscale: '',
            vat: '',
            indirizzo: '',
            codice_postale: '',
            nazione: 'Italia',
            sito_web: '',
            responsabile: '',
            mail: '',
            telefono: '',
            citta: 'Cagliari',
            categoria: 'Consulenza strategica e riorganizzazione',
            custom_fields: []
          });
        }

        const { data: projData, error: projError } = await supabase
          .from('gos_progetti')
          .select('*')
          .eq('company_id', companyId);

        if (projData && projData.length > 0 && !projError) {
          setProjects(projData);
        } else {
          setProjects([
            {
              id: 'PRJ-001',
              company_id: companyId,
              codice_progetto: 'PRJ-001',
              titolo: 'Piano Strategico di Intervento & Operation',
              descrizione: 'Riorganizzazione e sviluppo commerciale.',
              stato: 'IN_CORSO'
            }
          ]);
        }
      } catch (err) {
        setProjects([
          {
            id: 'PRJ-001',
            company_id: companyId,
            codice_progetto: 'PRJ-001',
            titolo: 'Piano Strategico di Intervento & Operation',
            descrizione: 'Riorganizzazione e sviluppo commerciale.',
            stato: 'IN_CORSO'
          }
        ]);
      } finally {
        setLoading(false);
      }
    }

    if (companyId) {
      fetchCompanyAndProjects();
    }
  }, [companyId, supabase]);

  // Gestione creazione progetto (formato codice azienda/progetto)
  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectTitle.trim()) return;

    const companyCodePrefix = company?.ragione_sociale ? company.ragione_sociale.substring(0, 3).toUpperCase() : 'AZ';
    const structuredCode = `${companyCodePrefix}/${newProjectCode}`;

    const newProj: ProjectItem = {
      id: `prj-${Math.random().toString(36).substring(2, 9)}`,
      company_id: companyId,
      codice_progetto: structuredCode,
      titolo: newProjectTitle,
      descrizione: newProjectDesc || 'Nuovo incarico strategico.',
      stato: newProjectStatus
    };

    try {
      await supabase.from('gos_progetti').insert([newProj]);
    } catch (err) {
      console.warn('Sync DB:', err);
    }

    setProjects([...projects, newProj]);
    setNewProjectTitle('');
    setNewProjectDesc('');
    setNewProjectCode(`PRJ-00${projects.length + 2}`);
    setNewProjectStatus('IN_CORSO');
    setIsCreatingProject(false);
    setMessage('Nuovo progetto creato con successo!');
  }

  async function handleUpdateProjectStatus(projId: string, newStatus: 'IN_CORSO' | 'COMPLETATO' | 'DISMESSO') {
    setProjects(projects.map(p => p.id === projId ? { ...p, stato: newStatus } : p));
    try {
      await supabase.from('gos_progetti').update({ stato: newStatus }).eq('id', projId);
    } catch (err) {
      console.warn('Sync DB status:', err);
    }
  }

  async function handleDeleteProject(projId: string) {
    if (!confirm('Sei sicuro di voler eliminare questo progetto?')) return;
    setProjects(projects.filter(p => p.id !== projId));
    try {
      await supabase.from('gos_progetti').delete().eq('id', projId);
    } catch (err) {
      console.warn('Sync DB delete:', err);
    }
  }

  // --- GESTIONE DOCUMENTI & LINK ---
  function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    if (!docTitle.trim()) return;

    const newDoc: DocumentItem = {
      id: `doc-${Math.random().toString(36).substring(2, 9)}`,
      title: docTitle,
      type: docType,
      urlOrData: docType === 'LINK' ? docUrl : (selectedFile ? URL.createObjectURL(selectedFile) : '#'),
      fileSize: docType === 'FILE' && selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(1)} MB` : undefined,
      date: new Date().toISOString().split('T')[0]
    };

    setDocuments([...documents, newDoc]);
    setDocTitle('');
    setDocUrl('');
    setSelectedFile(null);
    setIsAddingDoc(false);
    setMessage('Documento aggiunto con successo.');
  }

  function handleDeleteDocument(docId: string) {
    setDocuments(documents.filter(d => d.id !== docId));
  }

  function handleAddCustomField() {
    if (!newFieldLabel.trim()) return;
    const updatedFields = [...(company?.custom_fields || []), { label: newFieldLabel, value: newFieldValue }];
    setCompany({ ...company!, custom_fields: updatedFields });
    setNewFieldLabel('');
    setNewFieldValue('');
  }

  function handleRemoveCustomField(index: number) {
    const updatedFields = company?.custom_fields?.filter((_, i) => i !== index) || [];
    setCompany({ ...company!, custom_fields: updatedFields });
  }

  async function handleSaveAnagrafica(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!company) return;

    setSaving(true);
    setMessage(null);

    try {
      await supabase
        .from('gos_aziende')
        .update({
          ragione_sociale: company.ragione_sociale,
          vat: company.vat,
          codice_fiscale: company.codice_fiscale,
          indirizzo: company.indirizzo,
          codice_postale: company.codice_postale,
          nazione: company.nazione,
          sito_web: company.sito_web,
          responsabile: company.responsabile,
          mail: company.mail,
          telefono: company.telefono,
          citta: company.citta,
          categoria: company.categoria,
          custom_fields: company.custom_fields
        })
        .eq('id', companyId);

      setMessage('Anagrafica aggiornata con successo.');
    } catch (err: any) {
      setMessage('Modifiche salvate localmente.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh] text-gray-400 text-sm font-mono">
        Caricamento hub azienda e progetti...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      
      {/* HEADER AZIENDA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-emerald-400 font-mono text-xs font-bold rounded-lg">
              HUB AZIENDA
            </span>
            <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold rounded-lg uppercase">
              ATTIVA
            </span>
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mt-1">
            {company?.ragione_sociale || 'Azienda'}
          </h1>
          <p className="text-xs text-gray-400">
            {company?.categoria || 'Consulenza strategica'} • {company?.citta || 'Sardegna'}
          </p>
        </div>

        <Link
          href="/advisor"
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all shadow-sm flex items-center gap-2 self-start cursor-pointer"
        >
          <span>← Cruscotto Advisor</span>
        </Link>
      </div>

      {/* TAB BAR AZIENDA (CON OFFER BUILDER AGGIUNTO) */}
      <div className="flex border-b border-gray-800 gap-8 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          📁 Panoramica Anagrafica
        </button>

        <button
          onClick={() => setActiveTab('projects')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'projects' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          📁 Progetti & Incarichi ({projects.length})
        </button>

        <button
          onClick={() => setActiveTab('offer-builder')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'offer-builder' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          💼 Offer Builder
        </button>

        <button
          onClick={() => setActiveTab('questionnaires')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'questionnaires' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          📋 Questionari
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`pb-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
            activeTab === 'documents' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          📄 Documenti ({documents.length})
        </button>
      </div>

      {/* CONTENUTO TAB */}
      <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-sm space-y-6">
        
        {/* TAB 1: PANORAMICA ANAGRAFICA */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="border-b border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-white">Anagrafica e Dati Societari</h3>
              <p className="text-xs text-gray-400">Gestione completa delle informazioni legali, contabili e di contatto.</p>
            </div>

            {message && (
              <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs font-medium">
                {message}
              </div>
            )}

            <form onSubmit={handleSaveAnagrafica} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Ragione Sociale</label>
                  <input
                    type="text"
                    value={company?.ragione_sociale || ''}
                    onChange={(e) => setCompany({ ...company!, ragione_sociale: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Categoria / Settore</label>
                  <input
                    type="text"
                    value={company?.categoria || ''}
                    onChange={(e) => setCompany({ ...company!, categoria: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Partita IVA / VAT</label>
                  <input
                    type="text"
                    value={company?.vat || ''}
                    onChange={(e) => setCompany({ ...company!, vat: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Codice Fiscale</label>
                  <input
                    type="text"
                    value={company?.codice_fiscale || ''}
                    onChange={(e) => setCompany({ ...company!, codice_fiscale: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Indirizzo Completo</label>
                  <input
                    type="text"
                    value={company?.indirizzo || ''}
                    onChange={(e) => setCompany({ ...company!, indirizzo: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Codice Postale (CAP)</label>
                  <input
                    type="text"
                    value={company?.codice_postale || ''}
                    onChange={(e) => setCompany({ ...company!, codice_postale: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Città / Sede</label>
                  <input
                    type="text"
                    value={company?.citta || ''}
                    onChange={(e) => setCompany({ ...company!, citta: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Nazione</label>
                  <input
                    type="text"
                    value={company?.nazione || ''}
                    onChange={(e) => setCompany({ ...company!, nazione: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Sito Web</label>
                  <input
                    type="text"
                    value={company?.sito_web || ''}
                    onChange={(e) => setCompany({ ...company!, sito_web: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Responsabile / Referente</label>
                  <input
                    type="text"
                    value={company?.responsabile || ''}
                    onChange={(e) => setCompany({ ...company!, responsabile: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">E-mail di Contatto</label>
                  <input
                    type="email"
                    value={company?.mail || ''}
                    onChange={(e) => setCompany({ ...company!, mail: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Telefono</label>
                  <input
                    type="text"
                    value={company?.telefono || ''}
                    onChange={(e) => setCompany({ ...company!, telefono: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

              </div>

              {/* CAMPI CUSTOM */}
              <div className="border-t border-gray-800 pt-6 space-y-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Campi Personalizzati</h4>
                  <p className="text-xs text-gray-400">Aggiungi altri campi specifici.</p>
                </div>

                {company?.custom_fields && company.custom_fields.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {company.custom_fields.map((field, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-gray-950 border border-gray-800 rounded-xl">
                        <div className="flex-1 space-y-1">
                          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">{field.label}</span>
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => {
                              const updated = [...company.custom_fields!];
                              updated[idx].value = e.target.value;
                              setCompany({ ...company, custom_fields: updated });
                            }}
                            className="w-full bg-transparent text-white text-xs focus:outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomField(idx)}
                          className="px-2.5 py-1 bg-red-950/50 hover:bg-red-900 border border-red-900 text-red-400 text-xs rounded-lg transition-all cursor-pointer"
                        >
                          Elimina
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col md:flex-row gap-3 items-center pt-2">
                  <input
                    type="text"
                    placeholder="Nome Etichetta"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="flex-1 w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Valore"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="flex-1 w-full px-4 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-white text-xs focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="w-full md:w-auto px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap"
                  >
                    + Aggiungi Campo
                  </button>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {saving ? 'Salvataggio...' : 'Salva Modifiche Anagrafica'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: PROGETTI & INCARICHI */}
        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Progetti Attivi dell'Azienda</h3>
                <p className="text-xs text-gray-400">Gestisci i progetti secondo lo standard codice azienda/progetto.</p>
              </div>
              <button
                onClick={() => setIsCreatingProject(!isCreatingProject)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
              >
                {isCreatingProject ? 'Annulla' : '+ Nuovo Progetto'}
              </button>
            </div>

            {message && (
              <div className="p-3 bg-blue-950/40 border border-blue-800/60 rounded-xl text-blue-300 text-xs">
                {message}
              </div>
            )}

            {isCreatingProject && (
              <form onSubmit={handleCreateProject} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">Crea Nuovo Incarico / Progetto</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Codice Progetto (Suffisso)</label>
                    <input
                      type="text"
                      value={newProjectCode}
                      onChange={(e) => setNewProjectCode(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono uppercase"
                      required
                    />
                    <span className="text-[10px] text-gray-500 mt-1 block">Formato applicato: AZIENDA/progetto</span>
                  </div>
                  <div>
                    <label className="text-gray-400 block mb-1">Stato Iniziale</label>
                    <select
                      value={newProjectStatus}
                      onChange={(e) => setNewProjectStatus(e.target.value as any)}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-bold cursor-pointer"
                    >
                      <option value="IN_CORSO">In Corso</option>
                      <option value="COMPLETATO">Completato / Finito</option>
                      <option value="DISMESSO">Dismesso</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-gray-400 block mb-1">Titolo Progetto</label>
                    <input
                      type="text"
                      value={newProjectTitle}
                      onChange={(e) => setNewProjectTitle(e.target.value)}
                      placeholder="Es. Riorganizzazione Commerciale & Marketing"
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-bold"
                      required
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="text-gray-400 block mb-1">Descrizione / Obiettivi</label>
                    <input
                      type="text"
                      value={newProjectDesc}
                      onChange={(e) => setNewProjectDesc(e.target.value)}
                      placeholder="Breve sintesi degli obiettivi strategici..."
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    Salva e Crea Progetto
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <div key={proj.id} className="bg-gray-950 border border-gray-800 p-6 rounded-xl space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 bg-gray-900 border border-gray-800 text-blue-400 font-mono text-xs font-bold rounded-lg">
                        {proj.codice_progetto || 'PRJ'}
                      </span>

                      <select
                        value={proj.stato || 'IN_CORSO'}
                        onChange={(e) => handleUpdateProjectStatus(proj.id, e.target.value as any)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg cursor-pointer border uppercase ${
                          proj.stato === 'COMPLETATO' ? 'bg-emerald-950 text-emerald-400 border-emerald-800' :
                          proj.stato === 'DISMESSO' ? 'bg-gray-900 text-gray-400 border-gray-800' :
                          'bg-blue-950 text-blue-400 border-blue-800'
                        }`}
                      >
                        <option value="IN_CORSO">In Corso</option>
                        <option value="COMPLETATO">Completato / Finito</option>
                        <option value="DISMESSO">Dismesso</option>
                      </select>
                    </div>

                    <h4 className="text-white font-bold text-base">{proj.titolo}</h4>
                    <p className="text-xs text-gray-400">{proj.descrizione}</p>
                  </div>

                  <div className="flex items-center gap-3 pt-2 border-t border-gray-900">
                    <Link
                      href={`/advisor/projects/${proj.id}?companyId=${companyId}`}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl text-center transition-all cursor-pointer block shadow-sm"
                    >
                      Apri Workspace →
                    </Link>

                    <button
                      onClick={() => handleDeleteProject(proj.id)}
                      className="px-3 py-2.5 bg-red-950/60 hover:bg-red-900 border border-red-900 text-red-400 text-xs rounded-xl transition-all cursor-pointer"
                      title="Elimina Progetto"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: OFFER BUILDER */}
        {activeTab === 'offer-builder' && (
          <OfferBuilderView companyName={company?.ragione_sociale || 'Azienda Cliente'} advisorName="Corrado Pinna (Glaring LLP)" />
        )}

        {/* TAB 4: QUESTIONARI */}
        {activeTab === 'questionnaires' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white">Questionari Aziendali</h3>
            <p className="text-xs text-gray-400">Assessment e moduli di raccolta dati preliminari.</p>
          </div>
        )}

        {/* TAB 5: DOCUMENTI */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Libreria Documentale & Link</h3>
                <p className="text-xs text-gray-400">Archiviazione visure, bilanci, contratti e link esterni di riferimento.</p>
              </div>
              <button
                onClick={() => setIsAddingDoc(!isAddingDoc)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md"
              >
                {isAddingDoc ? 'Annulla' : '+ Aggiungi Documento / Link'}
              </button>
            </div>

            {message && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded-xl text-amber-300 text-xs">
                {message}
              </div>
            )}

            {isAddingDoc && (
              <form onSubmit={handleAddDocument} className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-4">
                <h4 className="text-sm font-bold text-white">Nuovo Elemento Documentale</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-gray-400 block mb-1">Titolo Documento / Risorsa</label>
                    <input
                      type="text"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      placeholder="Es. Contratto di Consulenza firmato"
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-gray-400 block mb-1">Tipologia Elemento</label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value as any)}
                      className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-bold cursor-pointer"
                    >
                      <option value="LINK">Link Esterno (URL / Drive / Cloud)</option>
                      <option value="FILE">Caricamento File Locale</option>
                    </select>
                  </div>

                  {docType === 'LINK' ? (
                    <div className="md:col-span-2">
                      <label className="text-gray-400 block mb-1">URL / Link di Riferimento</label>
                      <input
                        type="url"
                        value={docUrl}
                        onChange={(e) => setDocUrl(e.target.value)}
                        placeholder="https://drive.google.com/..."
                        className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-white font-mono"
                        required
                      />
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                      <label className="text-gray-400 block mb-1">Seleziona File da Computer</label>
                      <input
                        type="file"
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="w-full bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg text-gray-300 text-xs file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-amber-600 file:text-white hover:file:bg-amber-500 cursor-pointer"
                        required
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
                  >
                    Carica e Salva Documento
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-gray-950 border border-gray-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{doc.type === 'LINK' ? '🔗' : '📄'}</span>
                    <div>
                      <h4 className="text-white font-bold text-sm">{doc.title}</h4>
                      <div className="flex items-center gap-3 text-[11px] text-gray-400 font-mono mt-0.5">
                        <span>Data: {doc.date}</span>
                        {doc.fileSize && <span>Dimensione: {doc.fileSize}</span>}
                        <span className="uppercase px-1.5 py-0.5 bg-gray-900 border border-gray-800 rounded text-[9px] font-bold text-amber-400">
                          {doc.type}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-auto">
                    {doc.type === 'LINK' ? (
                      <a
                        href={doc.urlOrData}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                      >
                        <span>👁️ Visita Link</span>
                      </a>
                    ) : (
                      <>
                        <a
                          href={doc.urlOrData}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                        >
                          <span>👁️ Visualizza</span>
                        </a>
                        <a
                          href={doc.urlOrData}
                          download={doc.title}
                          className="px-3 py-1.5 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/40 text-amber-400 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5"
                        >
                          <span>📥 Download</span>
                        </a>
                      </>
                    )}

                    <button
                      onClick={() => handleDeleteDocument(doc.id)}
                      className="px-3 py-1.5 bg-red-950/60 hover:bg-red-900 border border-red-900 text-red-400 text-xs rounded-lg transition-all cursor-pointer"
                      title="Elimina Documento"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

    </div>
  );
}

export default function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10">
      <Suspense fallback={<div className="text-center py-20 text-gray-400 text-sm font-mono">Caricamento dettagli azienda...</div>}>
        <CompanyDetailContent params={params} />
      </Suspense>
    </main>
  );
}
