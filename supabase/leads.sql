-- PlayMax leads table
create table if not exists public.leads (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  company text not null,
  email text not null,
  phone text,
  service_interest text not null,
  description text,
  source text not null default 'website',
  intent text,
  status text not null default 'new',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.leads enable row level security;

create policy "Allow anonymous inserts" on public.leads
  for insert
  with check (true);
