-- ==========================================
-- GOS V1.2 - Migrazione Financial Engine (Parte 2: CAPEX, Debt, Results & KPIs)
-- ==========================================

-- 1. Tabella Immobilizzazioni e CAPEX (Modulo 11.9 & 11.10 / FE06 & FE07)
create table public.gos_financial_assets (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  asset_name text not null,
  category text not null, -- machinery, equipment, buildings, it_hardware, software, intangible, other
  purchase_date date not null,
  in_service_date date not null,
  acquisition_cost numeric not null default 0,
  capitalizable_costs numeric not null default 0,
  useful_life_months integer not null default 60,
  depreciation_method text not null default 'linear', -- linear, declining_balance
  residual_value numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabella Finanziamenti e Debiti (Modulo 11.13 / FE10)
create table public.gos_financial_debt (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  loan_name text not null,
  loan_type text not null default 'bank_loan', -- bank_loan, shareholder_loan, leasing, bonds
  principal_amount numeric not null default 0,
  disbursement_date date not null,
  duration_months integer not null default 36,
  annual_interest_rate numeric not null default 0, -- es. 5.5 per 5.5%
  repayment_type text not null default 'constant_principal', -- constant_principal, constant_installment (francese)
  grace_period_months integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabella Parametri Capitale Circolante / Working Capital (Modulo 11.12 / FE09)
create table public.gos_working_capital_params (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  dso_days integer not null default 60, -- Days Sales Outstanding (Crediti)
  dpo_days integer not null default 60, -- Days Payable Outstanding (Debiti)
  dio_days integer not null default 30, -- Days Inventory Outstanding (Magazzino)
  tax_rate numeric not null default 24.0 -- Aliquota fiscale percentuale
);

-- 4. Tabella Risultati Finanziari Aggregati per Periodo (P&L, Cash Flow, Balance Sheet - FE08, FE12, FE13)
create table public.gos_financial_results (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  period_id uuid references public.gos_financial_periods(id) on delete cascade not null,
  -- Conto Economico (P&L)
  gross_revenue numeric not null default 0,
  sales_adjustments numeric not null default 0,
  net_revenue numeric not null default 0,
  total_cogs numeric not null default 0,
  gross_profit numeric not null default 0,
  total_opex numeric not null default 0,
  ebitda numeric not null default 0,
  depreciation_amortization numeric not null default 0,
  ebit numeric not null default 0,
  financial_income numeric not null default 0,
  financial_expenses numeric not null default 0,
  ebt numeric not null default 0,
  taxes numeric not null default 0,
  net_profit numeric not null default 0,
  -- Cash Flow
  operating_cash_flow numeric not null default 0,
  investing_cash_flow numeric not null default 0,
  financing_cash_flow numeric not null default 0,
  net_cash_flow numeric not null default 0,
  opening_cash numeric not null default 0,
  closing_cash numeric not null default 0,
  -- Stato Patrimoniale (Balance Sheet)
  total_assets numeric not null default 0,
  total_liabilities numeric not null default 0,
  total_equity numeric not null default 0,
  unique(financial_model_id, period_id)
);

-- 5. Tabella KPI Finanziari (Modulo 11.17 / FE14)
create table public.gos_financial_kpis (
  id uuid default gen_random_uuid() primary key,
  financial_model_id uuid references public.gos_financial_models(id) on delete cascade not null,
  period_id uuid references public.gos_financial_periods(id) on delete cascade not null,
  kpi_name text not null, -- gross_margin_pct, ebitda_margin_pct, roe, roa, dscr, current_ratio, etc.
  kpi_value numeric not null default 0,
  unique(financial_model_id, period_id, kpi_name)
);

-- ==========================================
-- Sicurezza: Row Level Security (TEC-001)
-- ==========================================
alter table public.gos_financial_assets enable row level security;
alter table public.gos_financial_debt enable row level security;
alter table public.gos_working_capital_params enable row level security;
alter table public.gos_financial_results enable row level security;
alter table public.gos_financial_kpis enable row level security;

-- Policy di accesso in ambiente di sviluppo locale
create policy "Abilita tutto autenticati su financial_assets" on public.gos_financial_assets for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su financial_debt" on public.gos_financial_debt for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su working_capital_params" on public.gos_working_capital_params for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su financial_results" on public.gos_financial_results for all using (auth.role() = 'authenticated');
create policy "Abilita tutto autenticati su financial_kpis" on public.gos_financial_kpis for all using (auth.role() = 'authenticated');
