-- Migration: Add missing fields to products table to align with frontend ProductForm
-- Date: 2025-09-23

-- Add columns if they don't already exist
alter table public.products
  add column if not exists user_id uuid references auth.users(id);

alter table public.products
  add column if not exists image_url text;

alter table public.products
  add column if not exists sku text;

-- Helpful indexes
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists products_sku_idx on public.products(sku);


