-- Migration: Create messaging_log table for WhatsApp inbound/outbound messages
-- Date: 2025-09-23

create table if not exists public.messaging_log (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.store_settings(id) on delete cascade,
  customer_phone text not null,
  direction text not null check (direction in ('inbound','outbound')),
  message_type text not null check (message_type in ('text','image','interactive','template','status','other')),
  content jsonb not null default '{}'::jsonb,
  provider_message_id text,
  status text,
  error_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists messaging_log_store_id_idx on public.messaging_log(store_id);
create index if not exists messaging_log_phone_idx on public.messaging_log(customer_phone);
create index if not exists messaging_log_provider_msg_idx on public.messaging_log(provider_message_id);

alter table public.messaging_log enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'messaging_log' and policyname = 'owner can view logs'
  ) then
    create policy "owner can view logs" on public.messaging_log
      for select using (exists (
        select 1 from public.store_settings s
        where s.id = store_id and s.user_id = auth.uid()
      ));
  end if;
end $$;


