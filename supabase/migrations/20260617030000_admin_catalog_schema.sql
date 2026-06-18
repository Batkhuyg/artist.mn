create table if not exists public.artists (
  id text primary key,
  name text not null,
  uri text,
  spotify_url text,
  role text,
  avatar text,
  album_count integer not null default 0,
  track_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.artists (id, name, uri, spotify_url, album_count, track_count)
values
  ('0koAqXm6RYw0JyOt50T0al', 'Bold', 'spotify:artist:0koAqXm6RYw0JyOt50T0al', 'https://open.spotify.com/artist/0koAqXm6RYw0JyOt50T0al', 10, 125),
  ('4P3y9tQKLQtB23294oV5rv', 'NENE', 'spotify:artist:4P3y9tQKLQtB23294oV5rv', 'https://open.spotify.com/artist/4P3y9tQKLQtB23294oV5rv', 3, 41),
  ('29HteJ9gLQqgXz9B15tmVC', 'Camerton', 'spotify:artist:29HteJ9gLQqgXz9B15tmVC', 'https://open.spotify.com/artist/29HteJ9gLQqgXz9B15tmVC', 8, 101)
on conflict (id) do update set
  name = excluded.name,
  uri = excluded.uri,
  spotify_url = excluded.spotify_url,
  album_count = excluded.album_count,
  track_count = excluded.track_count,
  updated_at = now();

alter table public.albums add column if not exists artist_id text;
alter table public.albums add column if not exists capacity_count integer not null default 0;

update public.albums
set artist_id = case
    when album_id = '2KaEsbbJC9pUX4kl10iqtC' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '0WaccCAEgeyubhWowLQilD' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '4ZlN379KBdR6RlEqXNh4br' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '0PG4re8QSTGxLTAXYuMeh0' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '2Y6Ra9f9xmEBylTq9T3Efj' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '6NVKbuBnz9Xk81knlfExYv' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '7K0dkBPF67WevIHOrHHTWN' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '3On9O5gRwzgZGIS3u4BpQg' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '6ynoG4LIAwrXHMe9AwQHHs' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '0M1s2FCPS8ZTW0fj4E9bUR' then '0koAqXm6RYw0JyOt50T0al'
    when album_id = '7EZ2QpLsYMNgNHTawSapyU' then '4P3y9tQKLQtB23294oV5rv'
    when album_id = '6AVOSXObld6bM6PcMlTHOr' then '4P3y9tQKLQtB23294oV5rv'
    when album_id = '2KaEsbbJC9pUX4kl10iqtC' then '4P3y9tQKLQtB23294oV5rv'
    when album_id = '7zumKNyInDB6TvLW7joDTe' then '29HteJ9gLQqgXz9B15tmVC'
    when album_id = '7iVfXvdUUdr75ZWuPW77ih' then '29HteJ9gLQqgXz9B15tmVC'
    when album_id = '0SXqEqzgXaC4YckbgMv4y6' then '29HteJ9gLQqgXz9B15tmVC'
    when album_id = '0HI8hJxOw7ZpritprZyNgz' then '29HteJ9gLQqgXz9B15tmVC'
    when album_id = '3BuFWNDg24gPBryzaH9P3k' then '29HteJ9gLQqgXz9B15tmVC'
    when album_id = '73h02QaGx0mYGoEjcQfG5X' then '29HteJ9gLQqgXz9B15tmVC'
    when album_id = '75DjZWcHBlm4wVHYa7AaNE' then '29HteJ9gLQqgXz9B15tmVC'
    when album_id = '6cHlZqdfmDnGvCQtLGdhnf' then '29HteJ9gLQqgXz9B15tmVC'
    else artist_id
  end
where artist_id is null;

alter table public.products add column if not exists artist_id text;
alter table public.products add column if not exists capacity_count integer not null default 0;
alter table public.products add column if not exists kind text;
alter table public.products add column if not exists title text;
alter table public.products add column if not exists artist text;
alter table public.products add column if not exists price integer;
alter table public.products add column if not exists cover text;
alter table public.products add column if not exists tag text;
alter table public.products add column if not exists "desc" text;
alter table public.products add column if not exists sizes text[];

update public.products
set artist_id = case
  when artist = 'Маркус' then '0koAqXm6RYw0JyOt50T0al'
  when artist = 'Кант' then '29HteJ9gLQqgXz9B15tmVC'
  when artist = 'ARTIST.MN' then null
  else artist_id
end
where artist_id is null;

create index if not exists albums_artist_id_idx on public.albums (artist_id);
create index if not exists products_artist_id_idx on public.products (artist_id);

alter table public.artists enable row level security;

drop policy if exists "artists_admin_all" on public.artists;
create policy "artists_admin_all"
  on public.artists
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "artists_public_read" on public.artists;
create policy "artists_public_read"
  on public.artists
  for select
  to anon
  using (true);

drop policy if exists "albums_admin_all" on public.albums;
create policy "albums_admin_all"
  on public.albums
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "products_admin_all" on public.products;
create policy "products_admin_all"
  on public.products
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all"
  on public.orders
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "order_items_admin_all" on public.order_items;
create policy "order_items_admin_all"
  on public.order_items
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "customers_admin_read" on public.customers;
create policy "customers_admin_read"
  on public.customers
  for select
  to authenticated
  using (true);

grant select on public.artists to anon;
grant select, insert, update, delete on public.artists to authenticated;
grant select, insert, update, delete on public.albums to authenticated;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.orders to authenticated;
grant select, insert, update, delete on public.order_items to authenticated;
grant select on public.customers to authenticated;
