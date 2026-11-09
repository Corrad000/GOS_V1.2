-- Abilita l'estensione UUID se non attiva
create extension if not exists "uuid-ossp";

-- Definizione dei ruoli utente in base alla specifica V1.2 (Cap. 3)
create type gos_role as enum ('administrator', 'advisor', 'collaborator', 'client');

-- Definizione degli stati aziendali (Cap. 5)
create type gos_company_status as enum ('active', 'prospect', 'client', 'inactive');

-- 1. Tabella Profili Utenti (Collegata a Supabase Auth - Modulo 6 / CORE-002, CORE-003)
create table public.gos_profiles (
  id uuid references auth.users on delete cascade primary key,
  first_name text,
  last_name text,
  email text not null,
  role gos_role not null default 'advisor',
  status text not null default 'active',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Tabella Anagrafica Aziende (Company Profile - Modulo 1 / COMP-001, COMP-002)
create table public.gos_aziende (
  id uuid default gen_random_uuid() primary key,
  ragione_sociale text not null,
  nome_commerciale text,
  codice_fiscale text,
  vat text,
  indirizzo text,
  citta text,
  paese text,
  cap text,
  telefono text,
  email text,
  sito_web text,
  industry text,
  dipendenti integer,
  fatturato numeric,
  stato gos_company_status not null default 'prospect',
  owner_id uuid references public.gos_profiles(id) on delete set null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Sicurezza: Attivazione rigorosa della Row Level Security (Requisito TEC-001)
alter table public.gos_profiles enable row level security;
alter table public.gos_aziende enable row level security;

-- Policy temporanee di accesso per lo sviluppo in localhost
create policy "Consenti lettura profili agli utenti autenticati" on public.gos_profiles
  for select using (auth.role() = 'authenticated');

create policy "Consenti gestione aziende agli utenti autenticati" on public.gos_aziende
  for all using (auth.role() = 'authenticated');
