'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { CompanyItem, CompanyTable } from './CompanyTable';
import { UsersTable } from './UsersTable';
import { CatalogDashboardView } from '@/modules/offer-builder/CatalogDashboardView';
import { ContactsDirectoryView } from '@/modules/contacts/ContactsDirectoryView';
import { InvoiceGeneratorView } from '@/modules/invoices/InvoiceGeneratorView';
import {
  RiepilogoKanbanDash,
  type Voce,
} from '@/app/utenti/[id]/RiepilogoKanbanDash';
import { useCalendarSync } from './CalendarSyncProvider';
import {
  resolveGosPermissions,
  type CruscottoTabKey,
  type GosUserPermissions,
} from '@/utils/gosPermissions';

interface UserDashboardViewProps {
  userId?: string;
  userRole: string;
  userName: string;
  companies: CompanyItem[];
  trattative?: Voce[];
}

type MainTab =
  | 'cruscotto'
  | 'trattative'
  | 'aziende'
  | 'contatti'
  | 'offerte'
  | 'fatture'
  | 'questionari'
  | 'utenti';

type RadarFilter =
  | 'tutte'
  | 'scaduta'
  | 'oggi'
  | 'programmata'
  | 'senza_azione'
  | 'ferma';

const MAIN_TAB_TO_PERMISSION_KEY: Record<MainTab, CruscottoTabKey> = {
  cruscotto: 'cruscotto_operativo',
  trattative: 'trattative',
  aziende: 'database_aziende',
  contatti: 'rubrica_contatti',
  offerte: 'offer_builder',
  fatture: 'invoice_generator',
  questionari: 'questionari',
  utenti: 'utenti_permessi',
};

const PHASE_WEIGHT: Record<string, number> = {
  lead: 0.2,
  qualifica: 0.35,
  proposta: 0.55,
  negoziazione: 0.75,
  chiusura: 0.95,
};

const eur = new Intl.NumberFormat('it-IT', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

function daysBetween(isoDate?: string): number {
  if (!isoDate) return 0;
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDueText(v: Voce, isStagnant: boolean, stagnantDays: number): string {
  if (isStagnant && v.statoAzione === 'senza_azione') {
    return 'Ferma >14gg';
  }
  if (v.statoAzione === 'oggi') return 'Oggi';
  if (v.statoAzione === 'scaduta') {
    const refDate = v.azioneProgrammata?.data || v.scadenzaOriginale;
    if (refDate) {
      const diff = daysBetween(refDate);
      if (diff === 1) return 'Scaduta ieri';
      if (diff > 1) return `Scaduta ${diff}gg fa`;
    }
    return 'Scaduta';
  }
  if (v.statoAzione === 'programmata') {
    const refDate = v.azioneProgrammata?.data || v.scadenzaOriginale;
    if (refDate) {
      const d = new Date(refDate);
      if (!Number.isNaN(d.getTime())) {
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `Programmata · ${dd}/${mm}`;
      }
    }
    return 'Programmata';
  }
  if (isStagnant) return `Ferma ${stagnantDays}gg`;
  return 'Senza azione';
}

export function UserDashboardView({
  userId = '',
  userRole,
  userName,
  companies,
  trattative = [],
}: UserDashboardViewProps) {
  const router = useRouter();
  const { promptDateSync, deleteCalendarEvent } = useCalendarSync();
  const [activeTab, setActiveTab] = useState<MainTab>('cruscotto');
  const [localCompanies, setLocalCompanies] = useState<CompanyItem[]>(companies);
  const [localDeals, setLocalDeals] = useState<Voce[]>(trattative);
  const [liveProfile, setLiveProfile] = useState<any | null>(null);

  const [radarFilter, setRadarFilter] = useState<RadarFilter>('tutte');
  const [companyScope, setCompanyScope] = useState<'mie' | 'tutte'>('mie');
  const [companySearch, setCompanySearch] = useState('');
  const [busyDealId, setBusyDealId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const [categories, setCategories] = useState<any[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [masterQuestionnaires, setMasterQuestionnaires] = useState<any[]>([]);
  const [loadingQuestionnaires, setLoadingQuestionnaires] = useState(false);

  const [stats, setStats] = useState({
    totalModules: 0,
    totalCategories: 0,
    activeAdvisors: 1,
  });

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  useEffect(() => {
    let active = true;

    async function loadCurrentUserProfile() {
      try {
        let authUser: any = null;
        try {
          const { data: authData } = await supabase.auth.getUser();
          authUser = authData?.user || null;
        } catch {
          authUser = null;
        }

        const { data: profiles } = await supabase.from('gos_profiles').select('*');
        const list = Array.isArray(profiles) ? profiles : [];

        const matched =
          list.find((p: any) => userId && String(p.id) === String(userId)) ||
          list.find(
            (p: any) =>
              authUser?.email &&
              (p.email || '').toLowerCase() === String(authUser.email).toLowerCase()
          ) ||
          list.find(
            (p: any) =>
              userName &&
              (p.email || '').toLowerCase() === String(userName).toLowerCase()
          ) ||
          null;

        if (active) {
          setLiveProfile(
            matched || {
              id: authUser?.id || userId || undefined,
              email: authUser?.email || userName || undefined,
              ruolo: userRole,
            }
          );
        }
      } catch (err) {
        console.warn('Errore lettura profilo per permessi:', err);
        if (active) {
          setLiveProfile({
            id: userId || undefined,
            email: userName || undefined,
            ruolo: userRole,
          });
        }
      }
    }

    loadCurrentUserProfile();
    return () => {
      active = false;
    };
  }, [supabase, userId, userName, userRole]);

  const permissions: GosUserPermissions = useMemo(() => {
    return resolveGosPermissions(
      liveProfile || {
        ruolo: userRole,
      }
    );
  }, [liveProfile, userRole]);

  useEffect(() => {
    setLocalCompanies(companies);
  }, [companies]);

  useEffect(() => {
    setLocalDeals(trattative);
  }, [trattative]);

  useEffect(() => {
    async function fetchSystemStats() {
      try {
        const [{ count: modCount }, { count: catCount }, { count: profCount }] = await Promise.all([
          supabase
            .from('gos_moduli')
            .select('*', { count: 'exact', head: true })
            .is('company_code', null),
          supabase.from('gos_categorie').select('*', { count: 'exact', head: true }),
          supabase.from('gos_profiles').select('*', { count: 'exact', head: true }),
        ]);

        setStats({
          totalModules: modCount || 0,
          totalCategories: catCount || 0,
          activeAdvisors: profCount || 1,
        });
      } catch (err) {
        console.error('Errore recupero metriche:', err);
      }
    }
    fetchSystemStats();
  }, [supabase]);

  useEffect(() => {
    if (activeTab !== 'questionari') return;
    if (!permissions.tabPermissions.questionari.read) return;

    async function loadQuestionnairesGallery() {
      setLoadingQuestionnaires(true);
      try {
        const [{ data: catsData, error: catsErr }, { data: modsData, error: modsErr }] =
          await Promise.all([
            supabase.from('gos_categorie').select('*').order('nome'),
            supabase
              .from('gos_moduli')
              .select('*')
              .is('company_code', null)
              .order('created_at', { ascending: false }),
          ]);

        if (catsErr) throw catsErr;
        if (modsErr) throw modsErr;

        setCategories(catsData || []);
        setMasterQuestionnaires(modsData || []);
      } catch (err: any) {
        console.error('Errore caricamento gallery questionari master:', err?.message || err);
        setMasterQuestionnaires([]);
      } finally {
        setLoadingQuestionnaires(false);
      }
    }

    loadQuestionnairesGallery();
  }, [activeTab, supabase, permissions.tabPermissions.questionari.read]);

  const activeDeals = useMemo(() => {
    return localDeals.filter((d) => {
      const st = String(d.statoTrattativa || 'attiva').toLowerCase();
      return st !== 'vinta' && st !== 'persa' && st !== 'chiusa' && st !== 'archiviata';
    });
  }, [localDeals]);

  const enrichedDeals = useMemo(() => {
    const priorityOrder: Record<string, number> = {
      scaduta: 0,
      oggi: 1,
      programmata: 2,
      senza_azione: 3,
    };

    return activeDeals
      .map((deal) => {
        const stagnantDays = daysBetween(deal.ultimaModifica);
        const isStagnant = stagnantDays > 14;
        return {
          ...deal,
          stagnantDays,
          isStagnant,
          dueLabel: formatDueText(deal, isStagnant, stagnantDays),
        };
      })
      .sort((a, b) => {
        const pa = priorityOrder[a.statoAzione] ?? 4;
        const pb = priorityOrder[b.statoAzione] ?? 4;
        if (pa !== pb) return pa - pb;
        return b.valore - a.valore;
      });
  }, [activeDeals]);

  const filteredRadarDeals = useMemo(() => {
    return enrichedDeals.filter((d) => {
      if (radarFilter === 'tutte') return true;
      if (radarFilter === 'ferma') return d.isStagnant;
      return d.statoAzione === radarFilter;
    });
  }, [enrichedDeals, radarFilter]);

  const classifiedCompanies = useMemo(() => {
    const dealsByCompany = new Map<string, Voce[]>();
    for (const d of activeDeals) {
      const key = String(d.azienda?.id || '');
      if (!key) continue;
      const arr = dealsByCompany.get(key) || [];
      arr.push(d);
      dealsByCompany.set(key, arr);
    }

    return (localCompanies as any[]).map((c) => {
      const id = String(c.id || '');
      const code = String(c.codice_azienda || '');
      const linkedDeals = [
        ...(dealsByCompany.get(id) || []),
        ...(code && code !== id ? dealsByCompany.get(code) || [] : []),
      ];

      const rawStatus = String(c.stato || '').toLowerCase().trim();
      const totalDealsValue = linkedDeals.reduce((sum, d) => sum + Number(d.valore || 0), 0);
      const displayValue = totalDealsValue > 0 ? totalDealsValue : Number(c.fatturato || 0);

      const isFollowUp =
        rawStatus === 'prospect' ||
        rawStatus === 'follow-up' ||
        rawStatus === 'followup' ||
        (linkedDeals.length > 0 &&
          linkedDeals.every((d) => d.fase === 'lead' || d.fase === 'proposta'));

      const operationalStatus: 'IN_LAVORAZIONE' | 'FOLLOW_UP' = isFollowUp
        ? 'FOLLOW_UP'
        : 'IN_LAVORAZIONE';

      const subtitleNote =
        c.note_operative ||
        (linkedDeals.length > 0
          ? `${linkedDeals.length} ${linkedDeals.length === 1 ? 'trattativa' : 'trattative'}`
          : c.industry || 'in definizione');

      return {
        raw: c,
        id,
        name: c.ragione_sociale || c.nome_commerciale || 'Azienda senza nome',
        code: code || `AZ-${id.slice(0, 3).toUpperCase()}`,
        ownerId: c.owner_id ? String(c.owner_id) : '',
        operationalStatus,
        displayValue,
        subtitleNote,
      };
    });
  }, [localCompanies, activeDeals]);

  const workingCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    return classifiedCompanies
      .filter((c) => {
        if (companyScope === 'tutte' || !userId) return true;
        return !c.ownerId || c.ownerId === userId;
      })
      .filter((c) => {
        if (!q) return true;
        return (
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.subtitleNote.toLowerCase().includes(q)
        );
      });
  }, [classifiedCompanies, companyScope, userId, companySearch]);

  const kpiMetrics = useMemo(() => {
    const totalActiveValue = activeDeals.reduce((acc, d) => acc + Number(d.valore || 0), 0);
    const weightedValue = activeDeals.reduce((acc, d) => {
      const w = PHASE_WEIGHT[d.fase] ?? 0.4;
      return acc + Number(d.valore || 0) * w;
    }, 0);

    const inLavorazioneCount = workingCompanies.filter(
      (c) => c.operationalStatus === 'IN_LAVORAZIONE'
    ).length;
    const followUpCount = workingCompanies.filter(
      (c) => c.operationalStatus === 'FOLLOW_UP'
    ).length;

    const overdueCount = enrichedDeals.filter((d) => d.statoAzione === 'scaduta').length;
    const todayCount = enrichedDeals.filter((d) => d.statoAzione === 'oggi').length;
    const scheduledCount = enrichedDeals.filter((d) => d.statoAzione === 'programmata').length;
    const dueTodayTotal = overdueCount + todayCount + scheduledCount;

    return {
      totalActiveValue,
      weightedValue,
      workingTotal: workingCompanies.length,
      inLavorazioneCount,
      followUpCount,
      dueTodayTotal,
      overdueCount,
      scheduledCount: todayCount + scheduledCount,
    };
  }, [activeDeals, workingCompanies, enrichedDeals]);

  const canEditCruscotto = permissions.tabPermissions.cruscotto_operativo.edit;
  const canEditQuestionari = permissions.tabPermissions.questionari.edit;
  const canDeleteQuestionari = permissions.tabPermissions.questionari.delete;
  const canCreateOrEditAziende =
    permissions.canCreateAziende ||
    permissions.canEditAziende ||
    permissions.tabPermissions.database_aziende.edit;
  const canDeleteAziende =
    permissions.canDeleteAziende || permissions.tabPermissions.database_aziende.delete;

  const handleMarkDealDone = async (deal: Voce) => {
    if (!canEditCruscotto) {
      setFeedbackMsg('Non hai i permessi di modifica sul Cruscotto Operativo.');
      return;
    }
    setBusyDealId(deal.id);
    setFeedbackMsg(null);
    const nowIso = new Date().toISOString();
    try {
      const { error } = await supabase
        .from('gos_trattative')
        .update({
          stato_azione: 'senza_azione',
          azione_necessaria: 'Nessuna azione da fare',
          azione_programmata_titolo: null,
          azione_programmata_data: null,
          ultima_modifica: nowIso,
        })
        .eq('id', deal.id);

      if (error) throw error;

      setLocalDeals((prev) =>
        prev.map((item) =>
          item.id === deal.id
            ? {
                ...item,
                statoAzione: 'senza_azione',
                azioneNecessaria: 'Nessuna azione definita',
                azioneProgrammata: null,
                ultimaModifica: nowIso,
              }
            : item
        )
      );

      await deleteCalendarEvent({
        type: 'FOLLOW_UP',
        title: `${deal.azienda.nome} — ${deal.nome}`,
        startIso: deal.azioneProgrammata?.data || deal.scadenzaOriginale,
        table: 'gos_trattative',
        recordId: deal.id,
      });
    } catch (err: any) {
      setFeedbackMsg(err?.message || 'Errore aggiornamento azione su Supabase');
    } finally {
      setBusyDealId(null);
    }
  };

  const handlePostponeDeal = async (deal: Voce) => {
    if (!canEditCruscotto) {
      setFeedbackMsg('Non hai i permessi di modifica sul Cruscotto Operativo.');
      return;
    }
    setBusyDealId(deal.id);
    setFeedbackMsg(null);
    const base = deal.azioneProgrammata?.data ? new Date(deal.azioneProgrammata.data) : new Date();
    const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
    safeBase.setDate(safeBase.getDate() + 3);
    const nextIso = safeBase.toISOString();
    const nowIso = new Date().toISOString();
    const actionTitle = deal.azioneProgrammata?.titolo || deal.azioneNecessaria;

    try {
      const { error } = await supabase
        .from('gos_trattative')
        .update({
          stato_azione: 'programmata',
          azione_programmata_titolo: actionTitle,
          azione_programmata_data: nextIso,
          ultima_modifica: nowIso,
        })
        .eq('id', deal.id);

      if (error) throw error;

      setLocalDeals((prev) =>
        prev.map((item) =>
          item.id === deal.id
            ? {
                ...item,
                statoAzione: 'programmata',
                azioneProgrammata: {
                  titolo: actionTitle,
                  data: nextIso,
                },
                ultimaModifica: nowIso,
              }
            : item
        )
      );

      await promptDateSync({
        type: 'FOLLOW_UP',
        title: `${deal.azienda.nome} — ${deal.nome}`,
        description: actionTitle,
        startIso: nextIso,
        table: 'gos_trattative',
        recordId: deal.id,
      });
    } catch (err: any) {
      setFeedbackMsg(err?.message || 'Errore rinvio azione su Supabase');
    } finally {
      setBusyDealId(null);
    }
  };

  const categoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) {
      map[String(c.id)] = c.nome;
    }
    return map;
  }, [categories]);

  const filteredQuestionnaires = useMemo(() => {
    if (filterCategoryId === 'all') return masterQuestionnaires;
    return masterQuestionnaires.filter(
      (q) => String(q.categoria_id) === String(filterCategoryId)
    );
  }, [masterQuestionnaires, filterCategoryId]);

  const handleDeleteQuestionnaire = async (id: string) => {
    if (!canDeleteQuestionari) {
      alert('Non hai i permessi per eliminare questionari.');
      return;
    }
    if (!confirm('Sei sicuro di voler eliminare questo questionario master?')) return;
    try {
      const { error } = await supabase.from('gos_moduli').delete().eq('id', id);
      if (error) throw error;
      setMasterQuestionnaires((prev) => prev.filter((q) => q.id !== id));
      setStats((prev) => ({ ...prev, totalModules: Math.max(0, prev.totalModules - 1) }));
    } catch (err: any) {
      alert("Errore durante l'eliminazione: " + (err?.message || err));
    }
  };

  const navTabs: { key: MainTab; label: string }[] = [
    { key: 'cruscotto', label: 'Cruscotto Operativo' },
    { key: 'trattative', label: 'Trattative' },
    { key: 'aziende', label: 'Database Aziende' },
    { key: 'contatti', label: 'Rubrica Contatti' },
    { key: 'offerte', label: 'Offer Builder' },
    { key: 'fatture', label: 'Invoice Generator' },
    { key: 'questionari', label: 'Questionari' },
    { key: 'utenti', label: 'Utenti & Permessi' },
  ];

  const visibleTabs = useMemo(() => {
    return navTabs.filter((t) => {
      const permKey = MAIN_TAB_TO_PERMISSION_KEY[t.key];
      return Boolean(permissions.tabPermissions[permKey]?.read);
    });
  }, [permissions.tabPermissions]);

  useEffect(() => {
    if (visibleTabs.length === 0) return;
    const isCurrentAllowed = visibleTabs.some((t) => t.key === activeTab);
    if (!isCurrentAllowed) {
      setActiveTab(visibleTabs[0].key);
    }
  }, [visibleTabs, activeTab]);

  const radarFilters: { key: RadarFilter; label: string }[] = [
    { key: 'tutte', label: 'Tutte' },
    { key: 'scaduta', label: 'Scadute' },
    { key: 'oggi', label: 'Oggi' },
    { key: 'programmata', label: 'Programmate' },
    { key: 'senza_azione', label: 'Senza azione' },
    { key: 'ferma', label: 'Ferme >14gg' },
  ];

  const currentTabReadAllowed =
    permissions.tabPermissions[MAIN_TAB_TO_PERMISSION_KEY[activeTab]]?.read ?? false;

  return (
    <div className="mx-auto max-w-[1440px] px-5 py-6 md:px-8">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-[26px]">
            CRUSCOTTO OPERATIVO CONSULENTE
          </h1>
          <p className="mt-1 text-sm text-[#8A94A8]">
            Priorità del giorno, trattative attive e aziende in lavorazione · Sincronizzato con Supabase
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-[#8A94A8] sm:inline">{userName}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live DB
          </span>
        </div>
      </div>

      <nav aria-label="Viste principali" className="mb-6 flex flex-wrap gap-1 border-b border-[#1B2540]">
        {visibleTabs.map((t) => {
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={`-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? 'border-[#FF5500] font-semibold text-white'
                  : 'border-transparent font-medium text-[#8A94A8] hover:text-[#E6EAF2]'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {feedbackMsg && (
        <div className="mb-5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-300">
          {feedbackMsg}
        </div>
      )}

      {!currentTabReadAllowed ? (
        <div className="rounded-2xl border border-[#1B2540] bg-[#0B132B] p-8 text-center text-sm text-[#8A94A8]">
          Non hai i permessi di lettura per questa sezione.
        </div>
      ) : (
        <>
          {activeTab === 'cruscotto' && (
            <div className="space-y-5">
              <section className="grid grid-cols-1 gap-3.5 md:grid-cols-3">
                <div className="rounded-xl border border-[#1B2540] bg-[#0B132B] px-5 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]">
                    TRATTATIVE ATTIVE
                  </div>
                  <div className="mt-2 text-2xl font-bold text-white">
                    {eur.format(kpiMetrics.totalActiveValue)}
                  </div>
                  <div className="mt-1 text-xs text-[#8A94A8]">
                    ponderato {eur.format(Math.round(kpiMetrics.weightedValue))}
                  </div>
                </div>

                <div className="rounded-xl border border-[#1B2540] bg-[#0B132B] px-5 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]">
                    AZIENDE IN LAVORAZIONE
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{kpiMetrics.workingTotal}</span>
                    <span className="text-xs text-[#8A94A8]">attive / follow-up</span>
                  </div>
                  <div className="mt-1 text-xs text-[#8A94A8]">
                    {kpiMetrics.inLavorazioneCount} in lavorazione · {kpiMetrics.followUpCount} in follow-up
                  </div>
                </div>

                <div className="rounded-xl border border-[#1B2540] bg-[#0B132B] px-5 py-4">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]">
                    AZIONI DA FARE OGGI
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{kpiMetrics.dueTodayTotal}</span>
                    <span className="text-xs text-[#8A94A8]">urgenti &amp; programmate</span>
                  </div>
                  <div className="mt-1 text-xs">
                    <span className="font-medium text-amber-400">
                      {kpiMetrics.overdueCount} scadute
                    </span>
                    <span className="text-[#8A94A8]"> · </span>
                    <span className="font-medium text-amber-400">
                      {kpiMetrics.scheduledCount} programmate
                    </span>
                  </div>
                </div>
              </section>

              <section className="grid grid-cols-12 items-start gap-5">
                <div className="col-span-12 rounded-2xl border border-[#1B2540] bg-[#0B132B] p-5 lg:col-span-5">
                  <div className="mb-3.5 flex items-center justify-between">
                    <h2 className="text-[15px] font-bold tracking-wide text-white">
                      RADAR AZIONI &amp; TRATTATIVE PRIORITARIE
                    </h2>
                    <span className="text-xs text-[#8A94A8]">
                      {filteredRadarDeals.length} di {enrichedDeals.length}
                    </span>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {radarFilters.map((f) => {
                      const isCurrent = radarFilter === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          onClick={() => setRadarFilter(f.key)}
                          className={`cursor-pointer rounded-full border px-3 py-1 text-xs transition-colors ${
                            isCurrent
                              ? 'border-[#FF5500] bg-[#FF5500] font-semibold text-white'
                              : 'border-[#2A3A66] font-medium text-[#B9C3D9] hover:bg-[#111E42]'
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {filteredRadarDeals.map((d) => {
                      const busy = busyDealId === d.id || !canEditCruscotto;
                      const borderLeftClass =
                        d.statoAzione === 'scaduta'
                          ? 'border-l-red-400'
                          : d.statoAzione === 'oggi'
                            ? 'border-l-amber-400'
                            : d.statoAzione === 'programmata'
                              ? 'border-l-emerald-400'
                              : 'border-l-slate-500';

                      const dueColorClass =
                        d.statoAzione === 'scaduta' || d.isStagnant
                          ? 'text-red-400'
                          : d.statoAzione === 'oggi'
                            ? 'text-amber-400'
                            : d.statoAzione === 'programmata'
                              ? 'text-emerald-400'
                              : 'text-[#8A94A8]';

                      return (
                        <article
                          key={d.id}
                          className={`rounded-[10px] border border-l-[3px] border-[#1B2540] bg-[#111E42] p-3.5 ${borderLeftClass}`}
                        >
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-white">{d.nome}</div>
                              <div className="mt-0.5 text-xs text-[#8A94A8]">{d.azienda.nome}</div>
                            </div>
                            <div className="whitespace-nowrap text-[15px] font-bold text-white">
                              {eur.format(d.valore)}
                            </div>
                          </div>

                          <div className="mt-2.5 text-[13px] text-[#D5DCEB]">
                            {d.azioneProgrammata?.titolo || d.azioneNecessaria}
                          </div>

                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleMarkDealDone(d)}
                              className="cursor-pointer rounded-[7px] bg-[#FF5500] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#FF7A3D] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Fatto
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handlePostponeDeal(d)}
                              className="cursor-pointer rounded-[7px] border border-[#2A3A66] bg-[#1B2540] px-3 py-1.5 text-xs font-semibold text-[#E6EAF2] hover:bg-[#25335A] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Rinvia +3 gg
                            </button>
                            <span className={`ml-auto text-[11px] font-semibold ${dueColorClass}`}>
                              {d.dueLabel}
                            </span>
                          </div>
                        </article>
                      );
                    })}

                    {filteredRadarDeals.length === 0 && (
                      <p className="py-8 text-center text-sm text-[#8A94A8]">
                        Nessuna trattativa prioritaria per questo filtro.
                      </p>
                    )}
                  </div>
                </div>

                <div className="col-span-12 rounded-2xl border border-[#1B2540] bg-[#0B132B] p-5 lg:col-span-7">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-[15px] font-bold tracking-wide text-white">
                      AZIENDE IN LAVORAZIONE &amp; FOLLOW-UP
                    </h2>

                    <div className="inline-flex overflow-hidden rounded-lg border border-[#2A3A66]">
                      <button
                        type="button"
                        onClick={() => setCompanyScope('mie')}
                        className={`cursor-pointer px-3 py-1.5 text-xs ${
                          companyScope === 'mie'
                            ? 'bg-[#111E42] font-semibold text-white'
                            : 'font-medium text-[#8A94A8] hover:text-white'
                        }`}
                      >
                        Le mie aziende
                      </button>
                      <button
                        type="button"
                        onClick={() => setCompanyScope('tutte')}
                        className={`cursor-pointer px-3 py-1.5 text-xs ${
                          companyScope === 'tutte'
                            ? 'bg-[#111E42] font-semibold text-white'
                            : 'font-medium text-[#8A94A8] hover:text-white'
                        }`}
                      >
                        Tutte
                      </button>
                    </div>
                  </div>

                  <label
                    htmlFor="cerca-azienda-cruscotto"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]"
                  >
                    CERCA
                  </label>
                  <input
                    id="cerca-azienda-cruscotto"
                    type="search"
                    value={companySearch}
                    onChange={(e) => setCompanySearch(e.target.value)}
                    placeholder="Cerca azienda attiva, codice AZ, referente..."
                    className="mb-4 w-full rounded-[9px] border border-[#2A3A66] bg-[#090D16] px-3.5 py-2.5 text-sm text-[#E6EAF2] placeholder:text-[#5B6680] focus:border-[#FF5500] focus:outline-none"
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-[13px]">
                      <thead>
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-widest text-[#8A94A8]">
                          <th className="border-b border-[#1B2540] px-2 py-2.5">AZIENDA</th>
                          <th className="border-b border-[#1B2540] px-2 py-2.5">STATO</th>
                          <th className="border-b border-[#1B2540] px-2 py-2.5 text-right">VALORE</th>
                          <th className="border-b border-[#1B2540] px-2 py-2.5 text-right">
                            <span className="sr-only">Azioni</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {workingCompanies.map((c) => {
                          const inWork = c.operationalStatus === 'IN_LAVORAZIONE';
                          return (
                            <tr key={c.id} className="hover:bg-[#111E42]/30">
                              <td className="border-b border-[#151F38] px-2 py-3">
                                <div className="font-semibold text-white">{c.name}</div>
                                <div className="text-[11px] text-[#8A94A8]">
                                  {c.code} · {c.subtitleNote}
                                </div>
                              </td>
                              <td className="border-b border-[#151F38] px-2 py-3">
                                <span
                                  className={`rounded-md border px-2 py-1 text-[10px] font-bold tracking-wider ${
                                    inWork
                                      ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-400'
                                      : 'border-amber-500/35 bg-amber-500/15 text-amber-400'
                                  }`}
                                >
                                  {inWork ? 'IN LAVORAZIONE' : 'FOLLOW-UP'}
                                </span>
                              </td>
                              <td className="border-b border-[#151F38] px-2 py-3 text-right font-semibold text-white">
                                {eur.format(c.displayValue)}
                              </td>
                              <td className="border-b border-[#151F38] px-2 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => router.push(`/aziende/${c.id}`)}
                                  className="cursor-pointer rounded-md border border-[#2A3A66] bg-[#1B2540] px-2.5 py-1.5 text-[11px] font-semibold text-[#E6EAF2] hover:bg-[#25335A]"
                                >
                                  DETTAGLI
                                </button>
                              </td>
                            </tr>
                          );
                        })}

                        {workingCompanies.length === 0 && (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-sm text-[#8A94A8]">
                              Nessuna azienda attiva trovata con i filtri attuali.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'trattative' && (
            <RiepilogoKanbanDash
              dati={localDeals}
              userId={userId}
              advisorName={userName}
            />
          )}

          {activeTab === 'aziende' && (
            <CompanyTable
              companies={localCompanies}
              title="CONTROLLO AZIENDE"
              subtitle="Panoramica di tutte le aziende inserite nel database, advisor di riferimento e contratti attivi."
              showRegisterButton={canCreateOrEditAziende}
              onCompaniesDeleted={(deletedIds) => {
                if (!canDeleteAziende) return;
                const deletedSet = new Set(deletedIds);
                setLocalCompanies((prev) => prev.filter((c) => !deletedSet.has(c.id)));
              }}
            />
          )}

          {activeTab === 'contatti' && <ContactsDirectoryView />}

          {activeTab === 'offerte' && <CatalogDashboardView />}

          {activeTab === 'fatture' && (
            <InvoiceGeneratorView initialCompanies={localCompanies} />
          )}

          {activeTab === 'questionari' && (
            <div className="space-y-6 rounded-2xl border border-[#1B2540] bg-[#0B132B] p-6 shadow-xl">
              <div className="flex flex-col items-start justify-between gap-4 border-b border-[#1B2540] pb-4 md:flex-row md:items-center">
                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white">
                    Gallery Questionari Master Attivi / Creati
                  </h3>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Consulta i questionari disponibili o apri la pagina dedicata per crearne e lavorarne uno.
                  </p>
                </div>

                {canEditQuestionari && (
                  <button
                    type="button"
                    onClick={() => router.push('/questionari-master?mode=new')}
                    className="cursor-pointer rounded-lg bg-[#FF5500] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition-all hover:bg-orange-600"
                  >
                    + Aggiungi Questionario
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterCategoryId('all')}
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                    filterCategoryId === 'all'
                      ? 'border-orange-500 bg-[#FF5500] text-white'
                      : 'border-[#2A3A66] bg-[#090D16] text-gray-400 hover:text-white'
                  }`}
                >
                  Tutte le categorie ({masterQuestionnaires.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFilterCategoryId(String(cat.id))}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                      String(filterCategoryId) === String(cat.id)
                        ? 'border-orange-500 bg-[#FF5500] text-white'
                        : 'border-[#2A3A66] bg-[#090D16] text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat.nome}
                  </button>
                ))}
              </div>

              {loadingQuestionnaires ? (
                <div className="p-8 text-center font-mono text-xs text-gray-400">
                  Caricamento gallery questionari...
                </div>
              ) : filteredQuestionnaires.length === 0 ? (
                <div className="space-y-3 rounded-xl border border-dashed border-[#2A3A66] bg-[#090D16] p-12 text-center">
                  <p className="text-sm text-gray-400">
                    Nessun questionario master trovato per il filtro selezionato.
                  </p>
                  {canEditQuestionari && (
                    <button
                      type="button"
                      onClick={() => router.push('/questionari-master?mode=new')}
                      className="cursor-pointer rounded-lg bg-[#FF5500] px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow transition-all hover:bg-orange-600"
                    >
                      + Aggiungi il primo Questionario
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredQuestionnaires.map((q) => {
                    const catName =
                      categoryMap[String(q.categoria_id)] ||
                      q.categoria_nome ||
                      'Categoria non assegnata';
                    return (
                      <div
                        key={q.id}
                        className="flex flex-col justify-between space-y-4 rounded-xl border border-[#2A3A66] bg-[#111E42] p-5 shadow-md transition-all hover:border-slate-500"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded border border-slate-700 bg-[#090D16] px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-[#FF5500]">
                              {q.codice_modulo || 'QST'}
                            </span>
                            <span className="rounded border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-300">
                              {q.stato || 'Attivo'}
                            </span>
                          </div>

                          <div className="font-mono text-[11px] uppercase tracking-wide text-amber-300">
                            Categoria: {catName}
                          </div>

                          <h4 className="text-sm font-bold uppercase text-white">{q.titolo}</h4>
                          <p className="line-clamp-2 text-xs text-slate-300">
                            {q.descrizione || 'Nessuna descrizione inserita.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-2 border-t border-[#1B2540] pt-3">
                          {canDeleteQuestionari ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuestionnaire(q.id)}
                              className="cursor-pointer rounded-md border border-red-800 bg-red-950/60 px-2.5 py-1.5 text-[11px] font-bold text-red-300 transition-all hover:bg-red-900"
                            >
                              Elimina
                            </button>
                          ) : (
                            <span />
                          )}

                          {canEditQuestionari && (
                            <button
                              type="button"
                              onClick={() => router.push(`/questionari-master?id=${q.id}`)}
                              className="cursor-pointer rounded-md bg-[#FF5500] px-3.5 py-1.5 text-xs font-bold text-white transition-all hover:bg-orange-600"
                            >
                              Apri / Modifica →
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'utenti' && (
            <UsersTable currentUserRole={userRole} currentUserEmail={userName} />
          )}
        </>
      )}
    </div>
  );
}
