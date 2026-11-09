-- ==========================================
-- GOS V1.2 - Migrazione Offer Builder & Legal/Document Center
-- ==========================================

-- 1. Tabella Offerte / Engagement Offers (Modulo 8 / OFF-001)
create table public.gos_engagement_offers (
  id uuid default gen_random_uuid() primary key,
  engagement_id uuid references public.gos_engagements(id) on delete cascade not null,
  company_id uuid references public.gos_aziende(id) on delete cascade not null,
  title text not null,
  objective text,
  business_problem text,
  scope_included text,
  scope_excluded text,
  methodology text,
  deliverables text,
  timeline_details text,
  resources_details text,
  client_responsibilities text,
  glaring_responsibilities text,
  fees_amount numeric not null default 0,
  payment_terms text,
  additional_costs text,
  assumptions text,
  limitations text,
  validity_date date,
  status text not null default 'draft', -- draft, internal_review, ready_to_send, sent, under_negotiation, revised, accepted, rejected, expired
  version integer not null default 1,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabella Versioni Offerte (Modulo 8 / OFF-009)
create table public.gos_offer_versions (
  id uuid default gen_random_uuid() primary key,
  offer_id uuid references public.gos_engagement_offers(id) on delete cascade not null,
  version_number integer not null,
  snapshot_data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabella Modelli Documentali / Legal Templates (Modulo 9 / LEG-001)
create table public.gos_document_templates (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  title text not null,
  category text not null, -- legal, contract_template, clause, disclaimer
  content text not null,
  version integer not null default 1,
  is_approved boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabella Documenti / Document Center (Modulo 10 / DOC-001)
create table public.gos_documents (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.gos_aziende(id) on delete cascade,
  project_id uuid references public.gos_progetti(id) on delete cascade,
  engagement_id uuid references public.gos_engagements(id) on delete set null,
  document_type text not null, -- proposal, report, contract, pdf, other
  title text not null,
  file_path text not null, -- Percorso nel bucket Supabase Storage
  version integer not null default 1,
  created_by uuid references public.gos_profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- Sicurezza: Row Level Security (TEC-001)
-- ==========================================
alter table public.gos_engagement_offers enable row level security;
alter table public.gos_offer_versions enable row level security;
alter table public.gos_document_templates enable row level security;
alter table public.gos_documents enable row level security;

-- Policy di accesso in ambiente di sviluppo locale
create policy "Abilita tutto per utenti autenticati su engagement_offers" on public.gos_engagement_offers for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su offer_versions" on public.gos_offer_versions for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su document_templates" on public.gos_document_templates for all using (auth.role() = 'authenticated');
create policy "Abilita todo per utenti autenticati su documents" on public.gos_documents for all using (auth.role() = 'authenticated');
