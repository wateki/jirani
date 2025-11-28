-- Migration: Create business_channel_settings table for WhatsApp channel config
-- Date: 2025-09-23

create table if not exists public.business_channel_settings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.store_settings(id) on delete cascade,
  is_enabled boolean default false,
  wa_business_account_id text,
  wa_phone_number_id text,
  wa_app_id text,
  webhook_verify_token text,
  template_ids jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (store_id)
);

create index if not exists business_channel_settings_store_id_idx on public.business_channel_settings(store_id);

-- RLS: enabled, owner can manage, public cannot read by default
alter table public.business_channel_settings enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'business_channel_settings' and policyname = 'owner can manage settings'
  ) then
    create policy "owner can manage settings" on public.business_channel_settings
      using (exists (
        select 1 from public.store_settings s
        where s.id = store_id and s.user_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.store_settings s
        where s.id = store_id and s.user_id = auth.uid()
      ));
  end if;
end $$;


