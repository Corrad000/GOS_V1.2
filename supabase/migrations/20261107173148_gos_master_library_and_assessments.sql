-- ==========================================
-- GOS V1.2 - Migrazione Master Library & Assessment
-- ==========================================

-- 1. Tabella Master Forms / Moduli Master (Modulo 5 / QMB-001)
create table public.gos_master_forms (
  id uuid default gen_random_uuid() primary key,
  code text not null unique,
  name text not null,
  description text,
  functional_area text,
  version integer not null default 1,
  status text not null default 'draft', -- draft, active, archived
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabella Domande Master (Modulo 5 / QMB-003)
create table public.gos_master_questions (
  id uuid default gen_random_uuid() primary key,
  master_form_id uuid references public.gos_master_forms(id) on delete cascade not null,
  section_name text not null,
  question_text text not null,
  question_type text not null, -- text, textarea, number, currency, percentage, date, single_choice, multi_choice, boolean, rating, file_upload
  is_required boolean not null default false,
  options jsonb, -- Opzioni per scelta singola/multipla
  conditional_logic jsonb, -- Logiche condizionali
  sort_order integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Tabella Questionari Inviati / Assessment (Modulo 6 / ASM-001)
create table public.gos_questionnaires (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.gos_progetti(id) on delete cascade not null,
  title text not null,
  status text not null default 'draft', -- draft, ready, sent, in_progress, submitted, locked, archived
  deadline date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabella Snapshot / Versioni delle domande associate al questionario (Modulo 6 / ASM-002)
create table public.gos_questionnaire_questions_snapshot (
  id uuid default gen_random_uuid() primary key,
  questionnaire_id uuid references public.gos_questionnaires(id) on delete cascade not null,
  master_question_id uuid references public.gos_master_questions(id) on delete set null,
  section_name text not null,
  question_text text not null,
  question_type text not null,
  is_required boolean not null default false,
  options jsonb,
  sort_order integer default 0
);

-- 5. Tabella Risposte Clienti (Modulo 6 / ASM-004)
create table public.gos_risposte_clienti (
  id uuid default gen_random_uuid() primary key,
  questionnaire_id uuid references public.gos_questionnaires(id) on delete cascade not null,
  snapshot_question_id uuid references public.gos_questionnaire_questions_snapshot(id) on delete cascade not null,
  answer_value text, -- Valore testuale, numerico o JSON per scelte multiple
  file_url text, -- Eventuale allegato caricato
  submitted_by text, -- Email o identificativo del compilatore esterno
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ==========================================
-- Sicurezza: Row Level Security (TEC-001)
-- ==========================================
alter table public.gos_master_forms enable row level security;
alter table public.gos_master_questions enable row level security;
alter table public.gos_questionnaires enable row level security;
alter table public.gos_questionnaire_questions_snapshot enable row level security;
alter table public.gos_risposte_clienti enable row level security;

-- Policy di accesso in ambiente di sviluppo locale
create policy "Abilita tutto per utenti autenticati su master_forms" on public.gos_master_forms for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su master_questions" on public.gos_master_questions for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su questionnaires" on public.gos_questionnaires for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su questionnaire_snapshot" on public.gos_questionnaire_questions_snapshot for all using (auth.role() = 'authenticated');
create policy "Abilita tutto per utenti autenticati su risposte_clienti" on public.gos_risposte_clienti for all using (auth.role() = 'authenticated');
