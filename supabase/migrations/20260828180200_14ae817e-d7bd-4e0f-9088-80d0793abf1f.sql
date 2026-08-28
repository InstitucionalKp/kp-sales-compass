-- Guarda credenciais editáveis pela tela de Configurações (token do Meta, do GHL).
-- O valor NUNCA volta para o navegador: a tabela não tem policy de SELECT para
-- anon/authenticated. O navegador só grava (via RPC set_secret) e consulta se
-- existe (via secret_is_set). As Edge Functions leem com a service_role.

create table if not exists public.secret_config (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

alter table public.secret_config enable row level security;

grant all on public.secret_config to service_role;
-- sem grants para anon/authenticated e sem policies => browser não lê nem escreve direto

-- grava/atualiza um segredo (o navegador chama isto)
create or replace function public.set_secret(secret_key text, secret_value text)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.secret_config (key, value, updated_at)
  values (secret_key, secret_value, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
$$;

-- diz só se já existe um valor, sem expor o valor
create or replace function public.secret_is_set(secret_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.secret_config where key = secret_key);
$$;

grant execute on function public.set_secret(text, text) to anon, authenticated;
grant execute on function public.secret_is_set(text) to anon, authenticated;