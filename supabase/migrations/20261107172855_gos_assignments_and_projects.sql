-- ==========================================
-- GOS V1.2 - Migrazione Assegnazioni e Progetti
-- ==========================================

-- 1. Tabella Assegnazioni Aziende (Cap. 3.5 & Modulo 4 / ASS-002)
create table public.gos_company_assignments (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.gos_aziende(id) on delete cascade not null,
  advisor_id uuid references public.gos_profiles(id) on delete cascade not null,
  permission_level text not null default 'full',
  assigned_by uuid references public.gos_profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(company_id, advisor_id)
);

-- 2. Tabella Incarichi / Engagement (Cap. 8 & Modulo 8 / OFF-001)
create table public.gos_engagements (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.gos_aziende(id) on delete cascade not null,
  title text not null,
  engagement_type text not null, -- assessment, advisory, transformation, etc.
  objective text,
  status text not null default 'draft', -- draft, active, completed, closed
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabella Progetti (Cap. 5.3 & Modulo 3 / PROJ-001)
create table public.gos_progetti (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.gos_aziende(id) on delete cascade not null,
  engagement_id uuid references public.gos_engagements(id) on delete set null,
  name text not null,
  status text not null default 'draft', -- draft, active, on_hold, completed, archived
  start_date date,
  end_date date,
  owner_id uuid references public.gos_profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabella Assegnazioni Progetti (Cap. 8 & Modulo 4 / ASS-003)
create table public.gos_project_assignments (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.gos_progetti(id) on delete cascade not null,
  user_id uuid references public.gos_profiles(id) on delete cascade not null,
  role_type text not null default 'collaborator', -- advisor, collaborator
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, user_id)
);

-- ==========================================
-- Sicurezza: Row Level Security (TEC-001)
-- ==========================================
alter table public.gos_company_assignments enable row level security;
alter table public.gos_engagements enable row level security;
alter table public.gos_progetti enable row level security;
alter table public.gos_project_assignments enable row level security;

-- Policy di accesso in ambiente di sviluppo locale
create policy "Abilita tutto per utenti autenticati su company_assignments" on public.gos_company_assignments for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su engagements" on public.gos_engagements for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su progetti" on public.gos_progetti for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su project_assignments" on public.gos_project_assignments for all using (auth.role() = 'authenticated');
