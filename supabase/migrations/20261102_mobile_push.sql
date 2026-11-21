-- Additive; do not run the destructive root SCHEMA.sql.
-- Apply through the owned Supabase SQL editor/migration deployment, then deploy backend.
create table if not exists public.mobile_push_devices (
  token text primary key,
  role text not null check (role in ('customer','driver')),
  recipient_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mobile_push_recipient on public.mobile_push_devices(role, recipient_id);
alter table public.mobile_push_devices enable row level security;
revoke all on public.mobile_push_devices from anon, authenticated;
grant all on public.mobile_push_devices to service_role;

create table if not exists public.mobile_push_outbox (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  role text not null check (role in ('customer','driver')),
  recipient_id uuid,
  order_id text not null,
  kind text not null check (kind in ('order_status','driver_dispatch')),
  title text not null,
  body text not null,
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  lease_until timestamptz,
  expires_at timestamptz not null default (now() + interval '1 day'),
  delivered_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists mobile_push_due on public.mobile_push_outbox(available_at) where delivered_at is null;
alter table public.mobile_push_outbox enable row level security;
revoke all on public.mobile_push_outbox from anon, authenticated;
grant all on public.mobile_push_outbox to service_role;
create table if not exists public.mobile_push_receipts (
  event_id uuid not null references public.mobile_push_outbox(id) on delete cascade,
  token_hash text not null,
  accepted_at timestamptz not null default now(),
  primary key(event_id, token_hash)
);
alter table public.mobile_push_receipts enable row level security;
revoke all on public.mobile_push_receipts from anon, authenticated;
grant all on public.mobile_push_receipts to service_role;
create or replace function public.claim_mobile_push_jobs(p_limit integer default 10)
returns setof public.mobile_push_outbox language sql security definer set search_path = public as $$
  with due as (
    select id from public.mobile_push_outbox
    where delivered_at is null and available_at <= now() and expires_at > now()
      and (lease_until is null or lease_until < now()) and attempts < 8
    order by available_at limit least(greatest(p_limit,1),25) for update skip locked
  )
  update public.mobile_push_outbox o set lease_until=now()+interval '5 minutes', attempts=o.attempts+1
  from due where o.id=due.id returning o.*;
$$;
revoke all on function public.claim_mobile_push_jobs(integer) from public, anon, authenticated;
grant execute on function public.claim_mobile_push_jobs(integer) to service_role;
