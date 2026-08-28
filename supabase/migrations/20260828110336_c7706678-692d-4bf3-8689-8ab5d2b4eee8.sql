-- Tabelas de cache do dashboard de marketing.
-- O dashboard SEMPRE lê destas tabelas; as Edge Functions (sync-sheets / sync-meta /
-- sync-ghl) é que falam com as APIs externas e gravam aqui.

-- ── LEADS (vem da planilha do Google Sheets) ──────────────────────────────────
create table if not exists public.leads (
  id            text primary key,
  nome          text,
  contato       text,
  email         text,
  empresa       text,
  cargo         text,
  status_reuniao text,
  mql_flag      boolean not null default false,   -- coluna MQL = SIM
  qualificacao  text,                             -- A / B / C / D
  is_mql        boolean not null default false,   -- qualificacao em (A, B)
  origem        text,
  campanha      text,
  criativo      text,
  conjunto      text,
  lead_date     date,
  lead_time     text,
  lead_at       timestamptz,
  sold          boolean not null default false,   -- marcado pelo sync-ghl
  sold_at       timestamptz,
  raw           jsonb,
  synced_at     timestamptz not null default now()
);

create index if not exists leads_lead_date_idx on public.leads (lead_date);
create index if not exists leads_campanha_idx on public.leads (campanha);
create index if not exists leads_criativo_idx on public.leads (criativo);

-- ── META INSIGHTS (investimento diário por criativo, vem do Meta Ads) ─────────
create table if not exists public.meta_insights (
  id           text primary key,
  insight_date date not null,
  account_id   text,
  campanha     text,
  conjunto     text,
  criativo     text,
  spend        numeric not null default 0,
  impressions  bigint  not null default 0,
  clicks       bigint  not null default 0,
  leads        integer not null default 0,
  synced_at    timestamptz not null default now()
);

create index if not exists meta_insights_date_idx on public.meta_insights (insight_date);
create index if not exists meta_insights_criativo_idx on public.meta_insights (criativo);

-- ── SYNC STATUS (alimenta spinners e mensagens de erro) ──────────────────────
create table if not exists public.sync_status (
  source      text primary key,      -- 'sheets' | 'meta' | 'ghl'
  last_run_at timestamptz,
  status      text,                  -- 'ok' | 'error' | 'running'
  rows        integer not null default 0,
  message     text
);

-- ── RLS: o app lê com a chave anon; as Edge Functions escrevem com service_role ──
alter table public.leads         enable row level security;
alter table public.meta_insights enable row level security;
alter table public.sync_status   enable row level security;

grant select on public.leads, public.meta_insights, public.sync_status to anon, authenticated;
grant all    on public.leads, public.meta_insights, public.sync_status to service_role;

drop policy if exists "leads legível por todos"         on public.leads;
drop policy if exists "meta_insights legível por todos" on public.meta_insights;
drop policy if exists "sync_status legível por todos"   on public.sync_status;

create policy "leads legível por todos"         on public.leads         for select to anon, authenticated using (true);
create policy "meta_insights legível por todos" on public.meta_insights for select to anon, authenticated using (true);
create policy "sync_status legível por todos"   on public.sync_status   for select to anon, authenticated using (true);

-- valores iniciais de sync_status
insert into public.sync_status (source, status) values
  ('sheets', 'never'), ('meta', 'never'), ('ghl', 'never')
on conflict (source) do nothing;