-- ==========================================
-- GOS V1.2 - Migrazione Project Management & RACI
-- ==========================================

-- 1. Tabella Task / WBS (Modulo 3 / PROJ-004)
create table public.gos_tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.gos_progetti(id) on delete cascade not null,
  wbs_code text not null,
  task_name text not null,
  description text,
  parent_task_id uuid references public.gos_tasks(id) on delete cascade,
  start_date date,
  end_date date,
  duration integer default 0,
  assigned_to uuid references public.gos_profiles(id) on delete set null,
  priority text not null default 'normal', -- low, normal, high, urgent
  status text not null default 'draft', -- draft, in_progress, completed, delayed
  planned_hours numeric default 0,
  actual_hours numeric default 0,
  hourly_rate numeric default 0,
  planned_budget numeric default 0,
  actual_cost numeric default 0,
  progress integer default 0, -- 0 to 100
  deliverable text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabella Dipendenze Task (Modulo 3 / PROJ-006)
create table public.gos_task_dependencies (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.gos_tasks(id) on delete cascade not null,
  predecessor_id uuid references public.gos_tasks(id) on delete cascade not null,
  dependency_type text not null default 'FS', -- FS (Finish-to-Start), etc.
  unique(task_id, predecessor_id)
);

-- 3. Tabella Consuntivazione Ore (Modulo 3 / PROJ-010)
create table public.gos_time_entries (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.gos_tasks(id) on delete cascade not null,
  user_id uuid references public.gos_profiles(id) on delete cascade not null,
  date date not null,
  hours numeric not null default 0,
  description text,
  cost_associated numeric default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabella Costi di Progetto / Spese effettive (Modulo 3 / PROJ-012)
create table public.gos_project_costs (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.gos_progetti(id) on delete cascade not null,
  task_id uuid references public.gos_tasks(id) on delete set null,
  cost_type text not null, -- internal_hours, external_consulting, travel, materials, other
  amount numeric not null default 0,
  description text,
  date date not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabella Matrice RACI (Modulo 4 / RACI-001)
create table public.gos_raci_assignments (
  id uuid default gen_random_uuid() primary key,
  task_id uuid references public.gos_tasks(id) on delete cascade not null,
  user_id uuid references public.gos_profiles(id) on delete cascade not null,
  raci_role text not null, -- R (Responsible), A (Accountable), C (Consulted), I (Informed)
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(task_id, user_id, raci_role)
);

-- ==========================================
-- Sicurezza: Row Level Security (TEC-001)
-- ==========================================
alter table public.gos_tasks enable row level security;
alter table public.gos_task_dependencies enable row level security;
alter table public.gos_time_entries enable row level security;
alter table public.gos_project_costs enable row level security;
alter table public.gos_raci_assignments enable row level security;

-- Policy di accesso in ambiente di sviluppo locale
create policy "Abilita tutto per utenti autenticati su tasks" on public.gos_tasks for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su task_dependencies" on public.gos_task_dependencies for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su time_entries" on public.gos_time_entries for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su project_costs" on public.gos_project_costs for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su raci_assignments" on public.gos_raci_assignments for all using (auth.role() = 'authenticated');
