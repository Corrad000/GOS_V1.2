'use client';

import { Suspense, useState, useEffect, useContext, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { supabase } from '@/services/supabase/client';
import AnagraficaForm from '../../components/AnagraficaForm';
import { AnagraficaView } from '../../components/AnagraficaView';
import { OfferBuilderView } from '@/modules/offer-builder/OfferBuilderView';
import { ModulePickerModal } from '@/modules/offer-builder/ModulePickerModal';
import { OfferPreviewView } from '@/modules/offer-builder/OfferPreviewView';
import {
  SchedaTrattativa,
  normalizzaFase,
  normalizzaStato,
  type EventoTimeline,
  type VoceRegistro,
  type FaseTrattativa,
  type StatoTrattativa,
  type ModificaTrattativaPayload,
} from '@/modules/offer-builder/TrattativaSchedaView';
import { generateGlobalActivityCode } from '@/utils/codeGenerator';
import { CalendarSyncProvider, CalendarSyncContext } from '@/app/components/CalendarSyncProvider';
import GoogleCalendarConnectButton from '@/app/components/GoogleCalendarConnectButton';
import CalendarLogToolbarButton from '@/app/components/CalendarLogToolbarButton';
import { ContactsDirectoryView } from '@/modules/contacts/ContactsDirectoryView';
import { ContactAutocompleteInput } from '@/modules/contacts/ContactAutocompleteInput';
import {
  listAllContatti,
  upsertContatto,
  splitNomeCognome,
  type GosContatto,
} from '@/modules/contacts/contactsService';
import { KybQuestionnaireView } from '@/modules/kyb/KybQuestionnaireView';

import { DocumentsView } from '@/modules/project-management/DocumentsView';

import { QuestionnaireBuilderView } from '@/modules/questionnaire-builder/QuestionnaireBuilderView';
import { QuestionnaireComposerView } from '@/modules/questionnaire-builder/QuestionnaireComposerView';
import { QuestionnairePreviewView } from '@/modules/questionnaire-builder/QuestionnairePreviewView';

const PROBABILITA_PER_FASE: Record<FaseTrattativa, number> = {
  lead: 0.2,
  qualifica: 0.4,
  proposta: 0.6,
  negoziazione: 0.8,
  chiusura: 1.0,
};

function formatSupabaseError(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim()) return err;
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
    if (typeof obj.details === 'string' && obj.details.trim()) return obj.details;
    if (typeof obj.error === 'string' && obj.error.trim()) return obj.error;
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}') return json;
    } catch {
      // ignora errori di serializzazione
    }
  }
  return fallback;
}

function CompanyPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const calendarCtx = useContext(CalendarSyncContext);
  const companyId = params?.id ? decodeURIComponent(String(params.id)).trim() : '';
  const queryTab = searchParams?.get('tab');
  const queryTrattativaId = searchParams?.get('trattativa');

  const [activeTab, setActiveTab] = useState<'anagrafica' | 'contatti' | 'questionari' | 'business' | 'offer-builder' | 'trattative' | 'documenti'>(
    queryTab === 'trattative' ? 'trattative' : 'anagrafica'
  );
  const [questionariSubTab, setQuestionariSubTab] = useState<'assessment' | 'kyb'>('assessment');
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

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

  const [companyContacts, setCompanyContacts] = useState<GosContatto[]>([]);

  const [isEditingAnagrafica, setIsEditingAnagrafica] = useState(false);
  const [activeQuestionario, setActiveQuestionario] = useState<any>(null);
  const [showQuestPreview, setShowQuestPreview] = useState(false);

  const [businessPlans, setBusinessPlans] = useState<any[]>([]);
  const [loadingBp, setLoadingBp] = useState(false);
  const [bpTitle, setBpTitle] = useState('');
  const [bpDescription, setBpDescription] = useState('');
  const [bpStato, setBpStato] = useState('Bozza');
  const [showCreateBpModal, setShowCreateBpModal] = useState(false);
  const [isSubmittingBp, setIsSubmittingBp] = useState(false);

  const [offersList, setOffersList] = useState<any[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [activeOffer, setActiveOffer] = useState<any>(null);
  const [showCreateOfferModal, setShowCreateOfferModal] = useState(false);
  const [offerTitle, setOfferTitle] = useState('');
  const [offerDescription, setOfferDescription] = useState('');
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);

  const [isModulePickerOpen, setIsModulePickerOpen] = useState(false);
  const [selectedCategoryForPicker, setSelectedCategoryForPicker] = useState<any>(null);
  const [selectedCompanyModules, setSelectedCompanyModules] = useState<any[]>([]);
  const [showOfferPreview, setShowOfferPreview] = useState(false);

  const [trattativeList, setTrattativeList] = useState<any[]>([]);
  const [loadingTrattative, setLoadingTrattative] = useState(false);
  const [trattativeFiltro, setTrattativeFiltro] = useState<'tutte' | 'aperte' | 'chiuse'>('tutte');
  const [activeTrattativa, setActiveTrattativa] = useState<any>(null);
  const [trattativaTimelineMap, setTrattativaTimelineMap] = useState<Record<string, EventoTimeline[]>>({});
  const [trattativaRegistroMap, setTrattativaRegistroMap] = useState<Record<string, VoceRegistro[]>>({});

  const [showCreateTrattativaModal, setShowCreateTrattativaModal] = useState(false);
  const [trattativaTitolo, setTrattativaTitolo] = useState('');
  const [trattativaDescrizione, setTrattativaDescrizione] = useState('');
  const [trattativaFase, setTrattativaFase] = useState<FaseTrattativa>('lead');
  const [trattativaValore, setTrattativaValore] = useState('0');
  const [trattativaProbabilita, setTrattativaProbabilita] = useState('20');
  const [trattativaChiusuraPrevista, setTrattativaChiusuraPrevista] = useState('');
  const [trattativaProssimaAzione, setTrattativaProssimaAzione] = useState('');
  const [trattativaCodiceOfferta, setTrattativaCodiceOfferta] = useState('');
  const [trattativaReferenteNome, setTrattativaReferenteNome] = useState('');
  const [trattativaReferenteEmail, setTrattativaReferenteEmail] = useState('');
  const [trattativaReferenteRuolo, setTrattativaReferenteRuolo] = useState('');
  const [isSubmittingTrattativa, setIsSubmittingTrattativa] = useState(false);

  useEffect(() => {
    if (queryTab === 'trattative') {
      setActiveTab('trattative');
    }
  }, [queryTab]);

  const handleRemoveCompanyModule = (moduleId: string) => {
    setSelectedCompanyModules(prev => prev.filter(m => m.id !== moduleId));
  };

  const fetchOffersForCompany = useCallback(async (targetId: string, targetCode: string) => {
    setLoadingOffers(true);
    try {
      const codeFilter = targetCode || targetId;
      if (!codeFilter) {
        setOffersList([]);
        return;
      }

      const { data, error } = await supabase
        .from('gos_offerte')
        .select('*')
        .eq('company_code', codeFilter)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Errore lettura gos_offerte:', formatSupabaseError(error, 'Errore lettura offerte'));
        setOffersList([]);
        return;
      }

      setOffersList(data || []);
    } catch (err: unknown) {
      console.error('Eccezione lettura gos_offerte:', formatSupabaseError(err, 'Errore lettura offerte'));
      setOffersList([]);
    } finally {
      setLoadingOffers(false);
    }
  }, []);

  useEffect(() => {
    if (!companyId) {
      setLoadingCompany(false);
      return;
    }

    let cancelled = false;

    async function fetchCompanyDetails() {
      setLoadingCompany(true);
      setCompanyError(null);
      try {
        let data: any = null;

        const byId = await supabase
          .from('gos_aziende')
          .select('*')
          .eq('id', companyId)
          .maybeSingle();

        if (byId.error && byId.error.code !== '22P02') {
          throw new Error(formatSupabaseError(byId.error, 'Errore lettura azienda da ID'));
        }

        data = byId.data;

        if (!data) {
          const byCode = await supabase
            .from('gos_aziende')
            .select('*')
            .eq('codice_azienda', companyId)
            .maybeSingle();

          if (byCode.error) {
            throw new Error(formatSupabaseError(byCode.error, 'Errore lettura azienda da codice'));
          }
          data = byCode.data;
        }

        if (cancelled) return;

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

          if (data.referente) {
            const { nome, cognome } = splitNomeCognome(data.referente);
            void upsertContatto({
              nome,
              cognome,
              email: data.email || null,
              telefono: data.telefono || null,
              ruolo: 'Referente Aziendale',
              aziendaId: data.id,
              aziendaNome: data.ragione_sociale || null,
              origine: 'anagrafica',
            });
          }

          const loadedContacts = await listAllContatti(data.id);
          if (!cancelled) setCompanyContacts(loadedContacts);
        } else {
          setCompanyError('Azienda non trovata su Supabase.');
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = formatSupabaseError(err, 'Errore nel caricamento dell\'azienda');
          console.error('Errore nel caricamento dell\'azienda:', msg);
          setCompanyError(msg);
        }
      } finally {
        if (!cancelled) {
          setLoadingCompany(false);
        }
      }
    }

    fetchCompanyDetails();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const companyCode = companyData.codice_azienda;
  const resolvedCompanyId = companyData.id || companyId;

  useEffect(() => {
    if (activeTab !== 'business' || !companyCode) return;

    let cancelled = false;

    async function loadProgetti() {
      setLoadingBp(true);
      try {
        const { data, error } = await supabase
          .from('gos_progetti')
          .select('*')
          .eq('company_code', companyCode);

        if (error) throw new Error(formatSupabaseError(error, 'Errore caricamento progetti'));
        if (!cancelled) setBusinessPlans(data || []);
      } catch {
        if (!cancelled) setBusinessPlans([]);
      } finally {
        if (!cancelled) setLoadingBp(false);
      }
    }

    loadProgetti();
    return () => {
      cancelled = true;
    };
  }, [activeTab, companyCode]);

  useEffect(() => {
    if (
      activeTab !== 'offer-builder' &&
      activeTab !== 'trattative' &&
      !showCreateTrattativaModal
    ) {
      return;
    }
    if (!resolvedCompanyId && !companyCode) return;

    void fetchOffersForCompany(resolvedCompanyId, companyCode);
  }, [activeTab, resolvedCompanyId, companyCode, showCreateTrattativaModal, fetchOffersForCompany]);

  useEffect(() => {
    if (activeTab !== 'trattative' || !resolvedCompanyId) return;

    let cancelled = false;

    async function loadTrattative() {
      setLoadingTrattative(true);
      try {
        const { data, error } = await supabase
          .from('gos_trattative')
          .select('*')
          .eq('azienda_id', resolvedCompanyId)
          .order('created_at', { ascending: false });

        if (error) throw new Error(formatSupabaseError(error, 'Errore caricamento trattative'));
        if (cancelled) return;

        const rows = data || [];
        setTrattativeList(rows);

        if (queryTrattativaId) {
          const found = rows.find((t: any) => String(t.id) === String(queryTrattativaId));
          if (found) {
            setActiveTrattativa(found);
          }
        }
      } catch {
        if (!cancelled) setTrattativeList([]);
      } finally {
        if (!cancelled) setLoadingTrattative(false);
      }
    }

    loadTrattative();
    return () => {
      cancelled = true;
    };
  }, [activeTab, resolvedCompanyId, queryTrattativaId]);

  const appendRegistro = (trattativaId: string, voce: VoceRegistro) => {
    setTrattativaRegistroMap(prev => ({
      ...prev,
      [trattativaId]: [voce, ...(prev[trattativaId] || [])],
    }));
  };

  const appendTimeline = (trattativaId: string, evento: EventoTimeline) => {
    setTrattativaTimelineMap(prev => ({
      ...prev,
      [trattativaId]: [evento, ...(prev[trattativaId] || [])],
    }));
  };

  const syncTrattativaLocal = (trattativaId: string, patch: Record<string, any>) => {
    setTrattativeList(prev =>
      prev.map(item => (item.id === trattativaId ? { ...item, ...patch } : item))
    );
    setActiveTrattativa((prev: any) =>
      prev && prev.id === trattativaId ? { ...prev, ...patch } : prev
    );
  };

  const handleModificaTrattativa = async (
    trattativaId: string,
    payload: ModificaTrattativaPayload
  ) => {
    const nowIso = new Date().toISOString();
    const chiusuraIso = payload.chiusuraPrevista
      ? new Date(payload.chiusuraPrevista).toISOString()
      : null;

    const updateDbPayload = {
      titolo: payload.nome,
      valore: payload.valore,
      probabilita: payload.probabilita,
      codice_offerta: payload.codiceOfferta ?? null,
      chiusura_prevista: chiusuraIso,
      ultima_modifica: nowIso,
    };

    const { error } = await supabase
      .from('gos_trattative')
      .update(updateDbPayload)
      .eq('id', trattativaId);

    if (error) {
      const msg = formatSupabaseError(error, 'Errore salvataggio trattativa su Supabase');
      alert('Errore salvataggio trattativa su Supabase: ' + msg);
      throw new Error(msg);
    }

    syncTrattativaLocal(trattativaId, updateDbPayload);

    appendRegistro(trattativaId, {
      id: `reg-edit-${Date.now()}`,
      quando: nowIso,
      autore: companyData.advisor_nome || 'Advisor',
      azione: 'Modifica dati trattativa',
      daStato: activeTrattativa?.titolo || 'Trattativa',
      aStato: `${payload.nome} · ${Math.round(payload.valore).toLocaleString('it-IT')} € (${Math.round(payload.probabilita * 100)}%)`,
    });
  };

  const handleCreateBusinessPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bpTitle.trim()) return;

    setIsSubmittingBp(true);
    try {
      const codiceProgetto = await generateGlobalActivityCode(companyCode, 'PRJ');

      const newProgettoPayload = {
        company_code: companyCode,
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

      if (error) throw new Error(formatSupabaseError(error, 'Impossibile registrare il progetto.'));

      const created = data || { id: Date.now().toString(), ...newProgettoPayload };
      setBusinessPlans(prev => [...prev, created]);

      setBpTitle('');
      setBpDescription('');
      setBpStato('Bozza');
      setShowCreateBpModal(false);

      router.push(`/progetti/${created.id}`);
    } catch (err: unknown) {
      alert('Errore Supabase: ' + formatSupabaseError(err, 'Impossibile registrare il progetto.'));
    } finally {
      setIsSubmittingBp(false);
    }
  };

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!offerTitle.trim()) return;

    setIsSubmittingOffer(true);
    try {
      const targetCompanyCode = companyCode || resolvedCompanyId;
      const codiceOfferta = await generateGlobalActivityCode(targetCompanyCode, 'OFF');

      const newOfferPayload = {
        company_code: targetCompanyCode,
        codice_offerta: codiceOfferta,
        titolo: offerTitle.trim(),
        descrizione: offerDescription.trim() || null,
        stato: 'Bozza',
        moduli: []
      };

      const { data, error } = await supabase
        .from('gos_offerte')
        .insert([newOfferPayload])
        .select()
        .single();

      if (error) {
        const msg = formatSupabaseError(error, 'Errore creazione offerta');
        console.error('Errore INSERT gos_offerte:', msg);
        throw new Error(msg);
      }

      const created = data;
      setOffersList(prev => [created, ...prev]);

      setOfferTitle('');
      setOfferDescription('');
      setShowCreateOfferModal(false);

      setActiveOffer(created);
      setSelectedCompanyModules(Array.isArray(created.moduli) ? created.moduli : []);
    } catch (err: unknown) {
      alert('Errore nella creazione dell\'offerta: ' + formatSupabaseError(err, 'Errore sconosciuto'));
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleSaveOfferModules = async (mods: any[]) => {
    if (!activeOffer?.id) return;
    try {
      const { data, error } = await supabase
        .from('gos_offerte')
        .update({ moduli: mods })
        .eq('id', activeOffer.id)
        .select()
        .single();

      if (error) throw new Error(formatSupabaseError(error, 'Errore salvataggio moduli offerta'));

      if (data) {
        setActiveOffer(data);
        setSelectedCompanyModules(Array.isArray(data.moduli) ? data.moduli : mods);
        setOffersList(prev => prev.map(o => (o.id === data.id ? data : o)));
        alert('Moduli salvati su Supabase!');
      }
    } catch (err: unknown) {
      alert('Errore salvataggio moduli offerta: ' + formatSupabaseError(err, 'Errore sconosciuto'));
    }
  };

  const handleCreateTrattativa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trattativaTitolo.trim()) return;

    setIsSubmittingTrattativa(true);
    try {
      const codiceTrattativa = await generateGlobalActivityCode(companyCode || resolvedCompanyId, 'TRT');
      const probDecimal = Math.min(1, Math.max(0, (Number(trattativaProbabilita) || 0) / 100));
      const chiusuraIso = trattativaChiusuraPrevista
        ? new Date(trattativaChiusuraPrevista).toISOString()
        : null;
      const nextActionText = trattativaProssimaAzione.trim() || 'Definire primo contatto o follow-up';
      const chosenReferente = trattativaReferenteNome.trim() || companyData.referente || null;

      if (chosenReferente) {
        const { nome, cognome } = splitNomeCognome(chosenReferente);
        await upsertContatto({
          nome,
          cognome,
          email: trattativaReferenteEmail.trim() || null,
          ruolo: trattativaReferenteRuolo.trim() || 'Referente Trattativa',
          aziendaId: resolvedCompanyId,
          aziendaNome: companyData.ragione_sociale,
          origine: 'trattativa',
        });
        const refreshed = await listAllContatti(resolvedCompanyId);
        setCompanyContacts(refreshed);
      }

      const newTrattativaPayload = {
        azienda_id: resolvedCompanyId,
        codice_trattativa: codiceTrattativa,
        titolo: trattativaTitolo.trim(),
        fase: trattativaFase,
        stato_trattativa: 'attiva',
        probabilita: probDecimal,
        valore: Number(trattativaValore) || 0,
        codice_offerta: trattativaCodiceOfferta.trim() || null,
        chiusura_prevista: chiusuraIso,
        azione_necessaria: nextActionText,
        referente_nome: chosenReferente,
        advisor_nome: companyData.advisor_nome || 'Corrado Pinna',
        note: trattativaDescrizione.trim() || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('gos_trattative')
        .insert([newTrattativaPayload])
        .select()
        .single();

      if (error) throw new Error(formatSupabaseError(error, 'Errore nella creazione della trattativa'));

      const created = data || { id: Date.now().toString(), ...newTrattativaPayload };
      setTrattativeList(prev => [created, ...prev]);

      setTrattativaTitolo('');
      setTrattativaDescrizione('');
      setTrattativaFase('lead');
      setTrattativaValore('0');
      setTrattativaProbabilita('20');
      setTrattativaChiusuraPrevista('');
      setTrattativaProssimaAzione('');
      setTrattativaCodiceOfferta('');
      setTrattativaReferenteNome('');
      setTrattativaReferenteEmail('');
      setTrattativaReferenteRuolo('');
      setShowCreateTrattativaModal(false);
      setActiveTrattativa(created);

      if (calendarCtx && chiusuraIso) {
        await calendarCtx.promptDateSync({
          type: 'FOLLOW_UP',
          title: `${companyData.ragione_sociale} — ${created.titolo}`,
          description: nextActionText,
          startIso: chiusuraIso,
          table: 'gos_trattative',
          recordId: String(created.id),
        });
      }
    } catch (err: unknown) {
      alert('Errore nella creazione della trattativa: ' + formatSupabaseError(err, 'Errore sconosciuto'));
    } finally {
      setIsSubmittingTrattativa(false);
    }
  };

  const filteredTrattative = trattativeList.filter((t) => {
    const st = normalizzaStato(t.stato_trattativa);
    if (trattativeFiltro === 'aperte') return st === 'attiva' || st === 'in_pausa';
    if (trattativeFiltro === 'chiuse') return st === 'vinta' || st === 'persa';
    return true;
  });

  const offerteCollegateScheda = offersList.map((off) => {
    const moduliArr = Array.isArray(off.moduli) ? off.moduli : [];
    const importoCalcolato =
      Number(off.importo ?? off.totale ?? off.valore ?? 0) ||
      moduliArr.reduce((acc: number, m: any) => acc + Number(m?.prezzo ?? m?.importo ?? m?.fee ?? 0), 0);

    const statoRaw = String(off.stato || 'bozza').toLowerCase();
    const statoMappato: 'inviata' | 'bozza' | 'archiviata' | 'in_approvazione' =
      statoRaw.includes('inviat')
        ? 'inviata'
        : statoRaw.includes('archiv')
          ? 'archiviata'
          : statoRaw.includes('approvaz')
            ? 'in_approvazione'
            : 'bozza';

    return {
      codice: off.codice_offerta || off.codice || 'OFF',
      versione: Number(off.versione || 1),
      importo: importoCalcolato,
      stato: statoMappato,
      inviataIl: off.created_at || undefined,
    };
  });

  const buildDatiScheda = (t: any) => {
    const registroIniziale: VoceRegistro[] = trattativaRegistroMap[t.id] || [
      {
        id: `reg-${t.id}`,
        quando: t.created_at || new Date().toISOString(),
        autore: t.advisor_nome || companyData.advisor_nome || 'Sistema GOS',
        azione: 'Creazione trattativa',
        daStato: '-',
        aStato: `${normalizzaFase(t.fase)} / ${normalizzaStato(t.stato_trattativa)}`,
        motivo: t.codice_trattativa || undefined,
      },
    ];

    const contattiScheda =
      companyContacts.length > 0
        ? companyContacts.map((c) => ({
            nome: c.nome_completo,
            ruolo: c.ruolo || 'Referente',
            email: c.email || undefined,
            telefono: c.telefono || undefined,
          }))
        : t.referente_nome
          ? [{ nome: t.referente_nome, ruolo: 'Referente' }]
          : companyData.referente
            ? [{ nome: companyData.referente, ruolo: 'Referente' }]
            : [];

    return {
      trattativa: {
        id: t.id,
        nome: t.titolo,
        azienda: {
          id: resolvedCompanyId,
          nome: companyData.ragione_sociale,
        },
        codiceOfferta: t.codice_offerta || undefined,
        valore: Number(t.valore || 0),
        azioneNecessaria: t.azione_necessaria || 'Nessuna azione da fare',
        azioneProgrammata:
          t.azione_programmata_data && t.azione_programmata_titolo
            ? {
                titolo: t.azione_programmata_titolo,
                data: t.azione_programmata_data,
              }
            : null,
        statoAzione: (t.azione_programmata_data ? 'programmata' : 'senza_azione') as 'scaduta' | 'oggi' | 'programmata' | 'senza_azione',
        ultimaModifica: t.ultima_modifica || t.created_at || new Date().toISOString(),
        fase: normalizzaFase(t.fase),
        statoTrattativa: normalizzaStato(t.stato_trattativa),
        probabilita: Number(t.probabilita ?? PROBABILITA_PER_FASE[normalizzaFase(t.fase)] ?? 0.2),
        chiusuraPrevista: t.chiusura_prevista || undefined,
      },
      moduli: [],
      timeline: trattativaTimelineMap[t.id] || [],
      registro: registroIniziale,
      offerte: offerteCollegateScheda,
      contatti: contattiScheda,
    };
  };

  const handleChangeTrattativaStato = async (
    trattativaId: string,
    nuovoStato: StatoTrattativa
  ) => {
    const precedente = normalizzaStato(activeTrattativa?.stato_trattativa);
    const nowIso = new Date().toISOString();

    syncTrattativaLocal(trattativaId, {
      stato_trattativa: nuovoStato,
      ultima_modifica: nowIso,
    });
    appendRegistro(trattativaId, {
      id: `reg-stato-${Date.now()}`,
      quando: nowIso,
      autore: companyData.advisor_nome || 'Advisor',
      azione: 'Cambio stato trattativa',
      daStato: precedente,
      aStato: nuovoStato,
    });

    await supabase
      .from('gos_trattative')
      .update({ stato_trattativa: nuovoStato, ultima_modifica: nowIso })
      .eq('id', trattativaId);
  };

  const handleChangeTrattativaFase = async (
    trattativaId: string,
    nuovaFase: FaseTrattativa
  ) => {
    const precedente = normalizzaFase(activeTrattativa?.fase);
    const nuovaProb = PROBABILITA_PER_FASE[nuovaFase] ?? 0.2;
    const nowIso = new Date().toISOString();

    syncTrattativaLocal(trattativaId, {
      fase: nuovaFase,
      probabilita: nuovaProb,
      ultima_modifica: nowIso,
    });
    appendRegistro(trattativaId, {
      id: `reg-fase-${Date.now()}`,
      quando: nowIso,
      autore: companyData.advisor_nome || 'Advisor',
      azione: 'Avanzamento fase pipeline',
      daStato: precedente,
      aStato: nuovaFase,
    });

    await supabase
      .from('gos_trattative')
      .update({ fase: nuovaFase, probabilita: nuovaProb, ultima_modifica: nowIso })
      .eq('id', trattativaId);
  };

  const handleRegistraAttivitaTrattativa = async (
    trattativaId: string,
    payload: {
      tipo: EventoTimeline['tipo'];
      titolo: string;
      dettaglio?: string;
      prossimaAzione?: string;
    }
  ) => {
    const nowIso = new Date().toISOString();
    appendTimeline(trattativaId, {
      id: `ev-${Date.now()}`,
      quando: nowIso,
      tipo: payload.tipo,
      titolo: payload.titolo,
      dettaglio: payload.dettaglio,
      autore: companyData.advisor_nome || 'Advisor',
    });

    const patch: Record<string, any> = { ultima_modifica: nowIso };
    if (payload.prossimaAzione) {
      patch.azione_necessaria = payload.prossimaAzione;
      patch.azione_programmata_titolo = null;
      patch.azione_programmata_data = null;
    }
    syncTrattativaLocal(trattativaId, patch);

    if (payload.prossimaAzione) {
      await supabase
        .from('gos_trattative')
        .update({ azione_necessaria: payload.prossimaAzione, ultima_modifica: nowIso })
        .eq('id', trattativaId);
    }
  };

  const handleProgrammaFollowUpTrattativa = async (
    trattativaId: string,
    payload: { titolo: string; data: string }
  ) => {
    const nowIso = new Date().toISOString();
    const parsedDate = new Date(payload.data);
    const isoTarget = Number.isNaN(parsedDate.getTime()) ? nowIso : parsedDate.toISOString();

    const patch = {
      azione_programmata_titolo: payload.titolo,
      azione_programmata_data: isoTarget,
      azione_necessaria: payload.titolo,
      ultima_modifica: nowIso,
    };

    syncTrattativaLocal(trattativaId, patch);

    appendTimeline(trattativaId, {
      id: `ev-fu-${Date.now()}`,
      quando: nowIso,
      tipo: 'followup',
      titolo: `Follow-up programmato: ${payload.titolo}`,
      dettaglio: `Scadenza: ${new Date(isoTarget).toLocaleString('it-IT')}`,
      autore: companyData.advisor_nome || 'Advisor',
    });

    await supabase
      .from('gos_trattative')
      .update({
        azione_necessaria: payload.titolo,
        azione_programmata_titolo: payload.titolo,
        azione_programmata_data: isoTarget,
        ultima_modifica: nowIso,
      })
      .eq('id', trattativaId);
  };

  const handleConfermaAzioneFattaTrattativa = async (trattativaId: string) => {
    const nowIso = new Date().toISOString();
    const azioneCompletata =
      activeTrattativa?.azione_programmata_titolo ||
      activeTrattativa?.azione_necessaria ||
      'Azione completata';

    appendTimeline(trattativaId, {
      id: `ev-done-${Date.now()}`,
      quando: nowIso,
      tipo: 'completata',
      titolo: `Completata: ${azioneCompletata}`,
      dettaglio: 'Confermata come eseguita dalla scheda trattativa',
      autore: companyData.advisor_nome || 'Advisor',
    });

    const patch = {
      azione_necessaria: 'Nessuna azione da fare',
      azione_programmata_titolo: null,
      azione_programmata_data: null,
      ultima_modifica: nowIso,
    };

    syncTrattativaLocal(trattativaId, patch);

    await supabase
      .from('gos_trattative')
      .update({
        azione_necessaria: 'Nessuna azione da fare',
        azione_programmata_titolo: null,
        azione_programmata_data: null,
        ultima_modifica: nowIso,
      })
      .eq('id', trattativaId);
  };

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-sans p-6 md:p-10 space-y-8">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-wrap justify-between items-center gap-4 border-b border-gray-800 pb-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-900 border border-gray-800 text-[#FF5500] font-mono text-xs font-bold rounded-lg uppercase">
                {companyCode || companyId}
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

          <div className="flex flex-wrap items-center gap-2.5">
            <GoogleCalendarConnectButton />
            <CalendarLogToolbarButton />
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-xs font-semibold rounded-xl text-gray-300 transition-all cursor-pointer"
            >
              Torna alla Dashboard
            </button>
          </div>
        </div>

        {!loadingCompany && companyError && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
            {companyError}
          </div>
        )}

        <div className="flex flex-wrap gap-6 border-b border-gray-800 pb-4 text-sm font-semibold">
          <button
            onClick={() => { setActiveTab('anagrafica'); setIsEditingAnagrafica(false); }}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'anagrafica' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Anagrafica
          </button>
          <button
            onClick={() => setActiveTab('contatti')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'contatti' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Contatti &amp; Referenti
          </button>
          <button
            onClick={() => { setActiveTab('questionari'); setActiveQuestionario(null); setShowQuestPreview(false); }}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'questionari' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Questionari &amp; Assessment
          </button>
          <button
            onClick={() => setActiveTab('business')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'business' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Business Plan &amp; Finanziario
          </button>
          <button
            onClick={() => { setActiveTab('offer-builder'); setActiveOffer(null); setShowOfferPreview(false); }}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'offer-builder' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Offer Builder
          </button>
          <button
            onClick={() => { setActiveTab('trattative'); setActiveTrattativa(null); }}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'trattative' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Trattative
          </button>
          <button
            onClick={() => setActiveTab('documenti')}
            className={`pb-2 transition-all cursor-pointer ${activeTab === 'documenti' ? 'text-white border-b-2 border-[#FF5500]' : 'text-gray-400 hover:text-gray-200'}`}
          >
            Documenti &amp; File
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
                      .eq('id', resolvedCompanyId);

                    if (error) throw new Error(formatSupabaseError(error, 'Errore salvataggio anagrafica'));

                    if (updatedData.referente) {
                      const { nome, cognome } = splitNomeCognome(updatedData.referente);
                      await upsertContatto({
                        nome,
                        cognome,
                        email: updatedData.email || null,
                        telefono: updatedData.telefono || null,
                        ruolo: 'Referente Aziendale',
                        aziendaId: resolvedCompanyId,
                        aziendaNome: updatedData.ragione_sociale,
                        origine: 'anagrafica',
                      });
                      const refreshed = await listAllContatti(resolvedCompanyId);
                      setCompanyContacts(refreshed);
                    }

                    setCompanyData(prev => ({ ...prev, ...updatedData }));
                    setIsEditingAnagrafica(false);
                    alert('Dati aziendali aggiornati con successo!');
                  } catch (err: unknown) {
                    alert('Errore durante il salvataggio: ' + formatSupabaseError(err, 'Errore sconosciuto'));
                  }
                }}
                onCancel={() => setIsEditingAnagrafica(false)}
              />
            )}
          </div>
        )}

        {activeTab === 'contatti' && (
          <ContactsDirectoryView
            aziendaId={resolvedCompanyId}
            aziendaNome={companyData.ragione_sociale}
          />
        )}

        {activeTab === 'questionari' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuestionariSubTab('assessment')}
                className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  questionariSubTab === 'assessment'
                    ? 'bg-[#FF5500] text-white shadow'
                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                }`}
              >
                Questionari &amp; Assessment
              </button>
              <button
                type="button"
                onClick={() => setQuestionariSubTab('kyb')}
                className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-wider transition ${
                  questionariSubTab === 'kyb'
                    ? 'bg-[#FF5500] text-white shadow'
                    : 'bg-gray-900 text-gray-400 border border-gray-800 hover:text-white'
                }`}
              >
                Pacchetto KYB (Societario &amp; UBO)
              </button>
            </div>

            {questionariSubTab === 'kyb' ? (
              <KybQuestionnaireView
                companyCode={companyCode || resolvedCompanyId}
                aziendaId={resolvedCompanyId}
                companySeed={{
                  ragione_sociale: companyData.ragione_sociale,
                  partita_iva: companyData.partita_iva,
                  codice_fiscale: companyData.codice_fiscale,
                  indirizzo: companyData.indirizzo,
                  citta: companyData.citta,
                  nazione: companyData.nazione,
                  sito_web: companyData.sito_web,
                  referente: companyData.referente,
                  email: companyData.email,
                  telefono: companyData.telefono,
                  advisor_nome: companyData.advisor_nome,
                }}
              />
            ) : !activeQuestionario ? (
              <QuestionnaireBuilderView
                companyCode={companyCode}
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
                companyCode={companyCode}
                companyName={companyData.ragione_sociale}
                questionario={activeQuestionario}
                onBack={() => setActiveQuestionario(null)}
                onOpenPreview={() => setShowQuestPreview(true)}
              />
            ) : (
              <QuestionnairePreviewView
                companyCode={companyCode}
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
                <h3 className="text-base font-bold text-white uppercase">Progetti &amp; Business Plan</h3>
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

        {activeTab === 'offer-builder' && (
          <div className="space-y-6">
            {!activeOffer ? (
              <div className="bg-gray-950 border border-gray-800 p-6 rounded-2xl space-y-6">
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
                  <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-900 rounded-xl space-y-3">
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
                      <div
                        key={off.id}
                        className="bg-slate-800/90 hover:bg-slate-800 border border-slate-600/80 hover:border-slate-500 p-5 rounded-xl space-y-4 flex flex-col justify-between shadow-md transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex justify-between items-start">
                            <span className="px-2.5 py-1 bg-gray-950 text-[#FF5500] border border-slate-700 font-mono text-xs font-bold rounded-lg uppercase">
                              {off.codice_offerta || 'OFF'}
                            </span>
                            <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-700 text-emerald-300 text-[10px] font-semibold rounded uppercase">
                              {off.stato || 'Bozza'}
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-white uppercase">{off.titolo}</h4>
                          <p className="text-xs text-slate-300 line-clamp-2">{off.descrizione || 'Nessuna descrizione inserita.'}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-700/80 flex justify-between items-center">
                          <span className="text-[10px] font-mono text-slate-400">
                            Creato il: {new Date(off.created_at || Date.now()).toLocaleDateString()}
                          </span>
                          <button
                            onClick={() => {
                              setActiveOffer(off);
                              setSelectedCompanyModules(Array.isArray(off.moduli) ? off.moduli : []);
                            }}
                            className="px-4 py-2 bg-gray-950 hover:bg-gray-900 text-white font-bold rounded-xl border border-slate-600 transition-all text-xs cursor-pointer"
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
                          Visualizza Anteprima Proposta in Chiaro
                        </button>
                      </div>
                    )}

                    <OfferBuilderView
                      companyId={resolvedCompanyId}
                      companyCode={companyCode}
                      offerId={activeOffer.id}
                      selectedCompanyModules={selectedCompanyModules}
                      onRemoveModule={handleRemoveCompanyModule}
                      onOpenModulePicker={(category: any) => {
                        setSelectedCategoryForPicker(category);
                        setIsModulePickerOpen(true);
                      }}
                      onSaveOfferModules={handleSaveOfferModules}
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

        {activeTab === 'trattative' && (
          <div className="space-y-6">
            {!activeTrattativa ? (
              <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white uppercase">Trattative Commerciali</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Elenco delle trattative aperte e chiuse per {companyData.ragione_sociale}.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(['tutte', 'aperte', 'chiuse'] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setTrattativeFiltro(f)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all cursor-pointer ${
                          trattativeFiltro === f
                            ? 'bg-gray-800 text-white border border-gray-600'
                            : 'bg-gray-950 text-gray-400 border border-gray-800 hover:text-gray-200'
                        }`}
                      >
                        {f === 'chiuse' ? 'Fatte / Chiuse' : f}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowCreateTrattativaModal(true)}
                      className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer uppercase tracking-wider"
                    >
                      + Nuova Trattativa
                    </button>
                  </div>
                </div>

                {loadingTrattative ? (
                  <div className="p-8 text-center text-xs font-mono text-gray-400">Caricamento trattative in corso...</div>
                ) : filteredTrattative.length === 0 ? (
                  <div className="p-12 text-center border border-dashed border-gray-800 bg-gray-950 rounded-xl space-y-3">
                    <p className="text-sm text-gray-400">Nessuna trattativa registrata per questo filtro.</p>
                    <button
                      type="button"
                      onClick={() => setShowCreateTrattativaModal(true)}
                      className="px-4 py-2.5 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer"
                    >
                      Crea la prima Trattativa
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-800 bg-gray-950">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 bg-gray-900/70 text-[10px] uppercase tracking-wider text-gray-400">
                          <th className="px-4 py-3">Codice</th>
                          <th className="px-4 py-3">Trattativa</th>
                          <th className="px-4 py-3">Offerta</th>
                          <th className="px-4 py-3">Fase</th>
                          <th className="px-4 py-3">Stato</th>
                          <th className="px-4 py-3 text-right">Valore</th>
                          <th className="px-4 py-3 text-right">Prob.</th>
                          <th className="px-4 py-3">Prossima azione</th>
                          <th className="px-4 py-3 text-right">Azioni</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800/80">
                        {filteredTrattative.map((t) => (
                          <tr
                            key={t.id}
                            onClick={() => setActiveTrattativa(t)}
                            className="hover:bg-gray-900/70 transition cursor-pointer"
                          >
                            <td className="px-4 py-3 font-mono font-bold text-[#FF5500] whitespace-nowrap">
                              {t.codice_trattativa || 'TRT'}
                            </td>
                            <td className="px-4 py-3 font-semibold text-white">{t.titolo}</td>
                            <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">
                              {t.codice_offerta || '-'}
                            </td>
                            <td className="px-4 py-3 text-gray-300 capitalize">{normalizzaFase(t.fase)}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-semibold rounded uppercase">
                                {normalizzaStato(t.stato_trattativa)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-white whitespace-nowrap">
                              € {Number(t.valore || 0).toLocaleString('it-IT')}
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-400 whitespace-nowrap">
                              {Math.round(Number(t.probabilita ?? 0.2) * 100)}%
                            </td>
                            <td className="px-4 py-3 text-gray-400">{t.azione_necessaria || '-'}</td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTrattativa(t);
                                }}
                                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg border border-gray-700 text-[11px] cursor-pointer"
                              >
                                Apri -&gt;
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <SchedaTrattativa
                dati={buildDatiScheda(activeTrattativa)}
                onTornaAzienda={() => setActiveTrattativa(null)}
                onRegistraAttivita={(payload) =>
                  handleRegistraAttivitaTrattativa(activeTrattativa.id, payload)
                }
                onProgrammaFollowUp={(payload) =>
                  handleProgrammaFollowUpTrattativa(activeTrattativa.id, payload)
                }
                onConfermaAzioneFatta={() =>
                  handleConfermaAzioneFattaTrattativa(activeTrattativa.id)
                }
                onNuovaOfferta={() => {
                  setActiveTab('offer-builder');
                  setShowCreateOfferModal(true);
                }}
                onCambiaStato={(nuovoStato) =>
                  handleChangeTrattativaStato(activeTrattativa.id, nuovoStato)
                }
                onCambiaFase={(nuovaFase) =>
                  handleChangeTrattativaFase(activeTrattativa.id, nuovaFase)
                }
                onModificaTrattativa={(payload) =>
                  handleModificaTrattativa(activeTrattativa.id, payload)
                }
              />
            )}
          </div>
        )}

        {activeTab === 'documenti' && (
          <DocumentsView projectId={resolvedCompanyId} />
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

      {showCreateTrattativaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-gray-800 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">Crea Nuova Trattativa</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">Generazione automatica codice univoco TRT</p>
              </div>
              <button onClick={() => setShowCreateTrattativaModal(false)} className="text-gray-400 hover:text-white font-mono text-sm cursor-pointer">X</button>
            </div>

            <form onSubmit={handleCreateTrattativa} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Titolo Trattativa</label>
                <input
                  type="text"
                  placeholder="Es. Riorganizzazione Commerciale 2027"
                  value={trattativaTitolo}
                  onChange={(e) => setTrattativaTitolo(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  required
                />
              </div>

              <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-950/60 p-3">
                <ContactAutocompleteInput
                  label="Referente / Interlocutore (con richiamo in rubrica)"
                  value={trattativaReferenteNome}
                  onChange={setTrattativaReferenteNome}
                  aziendaId={resolvedCompanyId}
                  aziendaNome={companyData.ragione_sociale}
                  origine="trattativa"
                  defaultRuolo={trattativaReferenteRuolo || 'Referente Trattativa'}
                  placeholder={companyData.referente ? `Default: ${companyData.referente}` : 'Digita nome o cerca in rubrica...'}
                  onSelectContact={(c) => {
                    setTrattativaReferenteNome(c.nome_completo);
                    if (c.email) setTrattativaReferenteEmail(c.email);
                    if (c.ruolo) setTrattativaReferenteRuolo(c.ruolo);
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <input
                    type="email"
                    placeholder="Email referente (opzionale)"
                    value={trattativaReferenteEmail}
                    onChange={(e) => setTrattativaReferenteEmail(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                  <input
                    type="text"
                    placeholder="Ruolo (es. CEO, Buyer)"
                    value={trattativaReferenteRuolo}
                    onChange={(e) => setTrattativaReferenteRuolo(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3 py-2 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Fase</label>
                  <select
                    value={trattativaFase}
                    onChange={(e) => setTrattativaFase(e.target.value as FaseTrattativa)}
                    className="w-full bg-gray-950 border border-gray-700 px-3 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  >
                    <option value="lead">Lead</option>
                    <option value="qualifica">Qualifica</option>
                    <option value="proposta">Proposta</option>
                    <option value="negoziazione">Negoziazione</option>
                    <option value="chiusura">Chiusura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Valore (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={trattativaValore}
                    onChange={(e) => setTrattativaValore(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Probabilità (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={trattativaProbabilita}
                    onChange={(e) => setTrattativaProbabilita(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">
                  Offerta Collegata (se presente)
                </label>
                <select
                  value={trattativaCodiceOfferta}
                  onChange={(e) => setTrattativaCodiceOfferta(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                >
                  <option value="">
                    {loadingOffers
                      ? 'Caricamento offerte azienda...'
                      : offersList.length === 0
                        ? 'Nessuna offerta presente per questa azienda'
                        : '-- Nessuna offerta collegata --'}
                  </option>
                  {offersList.map((off) => (
                    <option key={off.id} value={off.codice_offerta || ''}>
                      {off.codice_offerta || 'OFF'} — {off.titolo || 'Offerta'} ({off.stato || 'Bozza'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Prossima Azione</label>
                  <input
                    type="text"
                    placeholder="Es. Call di qualifica"
                    value={trattativaProssimaAzione}
                    onChange={(e) => setTrattativaProssimaAzione(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>

                <div>
                  <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Chiusura Prevista</label>
                  <input
                    type="date"
                    value={trattativaChiusuraPrevista}
                    onChange={(e) => setTrattativaChiusuraPrevista(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-bold uppercase text-[10px]">Note / Obiettivo</label>
                <textarea
                  rows={3}
                  placeholder="Inserisci i dettagli e gli obiettivi di questa trattativa..."
                  value={trattativaDescrizione}
                  onChange={(e) => setTrattativaDescrizione(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 px-3.5 py-2.5 rounded-xl text-white text-xs focus:outline-none focus:border-[#FF5500]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button type="button" onClick={() => setShowCreateTrattativaModal(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold rounded-xl cursor-pointer">Annulla</button>
                <button type="submit" disabled={isSubmittingTrattativa} className="px-5 py-2 bg-[#FF5500] hover:bg-orange-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer uppercase tracking-wider disabled:opacity-50">
                  {isSubmittingTrattativa ? 'Creazione...' : 'Crea Trattativa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default function CompanyPage() {
  return (
    <CalendarSyncProvider>
      <Suspense
        fallback={
          <main className="min-h-screen bg-gray-950 text-gray-400 p-10 text-xs font-mono">
            Caricamento scheda azienda...
          </main>
        }
      >
        <CompanyPageContent />
      </Suspense>
    </CalendarSyncProvider>
  );
}
