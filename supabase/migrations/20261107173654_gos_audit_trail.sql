-- ==========================================
-- GOS V1.2 - Migrazione Audit Trail (Modulo 24 / TEC-004)
-- ==========================================

create table public.gos_audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.gos_profiles(id) on delete set null,
  action text not null, -- create, update, delete, login, export, approve, etc.
  entity_type text not null, -- company, project, task, questionnaire, offer, financial_model, etc.
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  metadata jsonb,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- Sicurezza: Row Level Security (TEC-001)
-- ==========================================
alter table public.gos_audit_log enable row level security;

-- Policy di accesso in ambiente di sviluppo locale (consultabile solo dagli utenti autenticati)
create policy "Abilita lettura audit log per utenti autenticati" on public.gos_audit_log for select using (auth.role() = 'authenticated');
create policy "Abilita scrittura audit log per utenti autenticati" on public.gos_audit_log for insert with check (auth.role() = 'authenticated');
