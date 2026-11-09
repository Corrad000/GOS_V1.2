-- ==========================================
-- GOS V1.2 - Migrazione Financial Engine (Parte 1: Config, Sales, COGS, OPEX)
-- ==========================================

-- 1. Tabella Modelli Finanziari / Financial Model Configuration (Modulo 11.4 / FE01)
create table public.gos_financial_models (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references public.gos_aziende(id) on delete cascade not null,
  project_id uuid references public.gos_progetti(id) on delete set null,
  model_name text not null,
  model_type text not null default 'business_plan', -- business_plan, project_finance, forecast, etc.
  base_currency text not null default 'EUR',
  start_date date not null,
  horizon_months integer not null default 36,
  scenario text not null default 'base', -- base, optimistic, pessimistic
  version integer not null default 1,
  status text not null default 'draft', -- draft, review, approved, archived
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabella Periodi Finanziari (Granularità Mensile)
create table public.gos_financial_periods (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  period_index integer not null, -- 1, 2, 3... N
  year integer not null,
  month integer not null,
  period_date date not null,
  unique(financial_model_id, period_index)
);

-- 3. Tabella Linee di Vendita / Revenue Lines (Modulo 11.5 / FE02)
create table public.gos_revenue_lines (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  code text not null,
  name text not null,
  revenue_type text not null default 'product', -- product, service, contract, project, other
  unit_name text default 'units',
  description text,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabella Previsioni di Vendita Mensili (FE02)
create table public.gos_revenue_forecasts (
  id uuid default gen_random_uuid() primary key,
  revenue_line_id uuid references public.gos_revenue_lines(id) on delete cascade not null,
  period_id uuid references public.gos_financial_periods(id) on delete cascade not null,
  quantity numeric not null default 0,
  unit_price numeric not null default 0,
  unit_discount numeric not null default 0,
  adjustments numeric not null default 0,
  net_revenue numeric not null default 0, -- Calcolato: (qty * price) - discount + adjustments
  unique(revenue_line_id, period_id)
);

-- 5. Tabella Voci di Costo / Cost Items - COGS & OPEX (Modulo 11.6 & 11.8 / FE03 & FE05)
create table public.gos_cost_items (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  category text not null, -- cogs_direct, cogs_overheads, opex_personnel, opex_marketing, opex_ga, opex_it, rent, etc.
  name text not null,
  calculation_mode text not null default 'fixed', -- fixed, variable_revenue, per_unit, manual
  cost_driver_id uuid references public.gos_revenue_lines(id) on delete set null, -- Se legato a una revenue line
  default_amount numeric not null default 0,
  description text,
  is_active boolean not null default true,
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabella Componenti di Costo Dettagliato (Modulo 11.6 / FE03 - Modalità B)
create table public.gos_cost_components (
  id uuid default gen_random_uuid() primary key,
  cost_item_id uuid references public.gos_cost_items(id) on delete cascade not null,
  component_name text not null, -- raw_materials, direct_labour, packaging, transport, etc.
  unit_cost numeric not null default 0,
  sort_order integer default 0
);

-- 7. Tabella Previsioni di Costo Mensili
create table public.gos_cost_forecasts (
  id uuid default gen_random_uuid() primary key,
  cost_item_id uuid references public.gos_cost_items(id) on delete cascade not null,
  period_id uuid references public.gos_financial_periods(id) on delete cascade not null,
  amount numeric not null default 0,
  unique(cost_item_id, period_id)
);

-- ==========================================
-- Sicurezza: Row Level Security (TEC-001)
-- ==========================================
alter table public.gos_financial_models enable row level security;
alter table public.gos_financial_periods enable row level security;
alter table public.gos_revenue_lines enable row level security;
alter table public.gos_revenue_forecasts enable row level security;
alter table public.gos_cost_items enable row level security;
alter table public.gos_cost_components enable row level security;
alter table public.gos_cost_forecasts enable row level security;

-- Policy di accesso in ambiente di sviluppo locale
create policy "Abilita tutto autenticati su financial_models" on public.gos_financial_models for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su financial_periods" on public.gos_financial_periods for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su revenue_lines" on public.gos_revenue_lines for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su revenue_forecasts" on public.gos_revenue_forecasts for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su cost_items" on public.gos_cost_items for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su cost_components" on public.gos_cost_components for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su cost_forecasts" on public.gos_cost_forecasts for all using (auth.role() = 'authenticated');
