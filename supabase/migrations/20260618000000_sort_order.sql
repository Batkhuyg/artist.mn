-- Manual ordering for artists (home "Уран бүтээлч" sequence) and albums (per-artist order).
-- Run in the Supabase SQL editor.
alter table public.artists add column if not exists sort_order int not null default 0;
alter table public.albums  add column if not exists sort_order int not null default 0;
