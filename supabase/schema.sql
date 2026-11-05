-- Explore Madura schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role text not null default 'visitor' check (role in ('visitor','admin')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  short_description text not null default '',
  description text not null default '',
  address text not null default '',
  village text not null default '',
  district text not null default '',
  regency text not null default 'Sumenep',
  province text not null default 'Jawa Timur',
  latitude numeric(10,7),
  longitude numeric(10,7),
  hero_image text,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.facilities (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  name text not null,
  description text default ''
);

create table if not exists public.galleries (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  image_url text not null,
  caption text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations(id) on delete cascade,
  name text not null,
  description text default '',
  price integer not null check (price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique,
  user_id uuid not null references public.profiles(id) on delete restrict,
  destination_id uuid not null references public.destinations(id) on delete restrict,
  visit_date date not null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  total_amount integer not null check (total_amount >= 0),
  status text not null default 'pending'
    check (status in ('pending','waiting_verification','confirmed','rejected','cancelled')),
  payment_method text not null default 'bank_transfer',
  payment_proof text,
  notes text default '',
  created_at timestamptz not null default now()
);

create table if not exists public.reservation_items (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete restrict,
  ticket_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price integer not null check (unit_price >= 0),
  subtotal integer not null check (subtotal >= 0)
);

create index if not exists reservations_user_id_idx on public.reservations(user_id);
create index if not exists reservations_visit_date_idx on public.reservations(visit_date);
create index if not exists reservation_items_reservation_idx on public.reservation_items(reservation_id);

-- Storage bucket for destination photos and payment proofs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tourism-media', 'tourism-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.facilities enable row level security;
alter table public.galleries enable row level security;
alter table public.ticket_types enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_items enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update
using (id = auth.uid()) with check (id = auth.uid() and role = 'visitor');

drop policy if exists "destinations public read" on public.destinations;
create policy "destinations public read" on public.destinations for select
using (published = true or public.is_admin());
drop policy if exists "destinations admin all" on public.destinations;
create policy "destinations admin all" on public.destinations for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "facilities public read" on public.facilities;
create policy "facilities public read" on public.facilities for select using (true);
drop policy if exists "facilities admin all" on public.facilities;
create policy "facilities admin all" on public.facilities for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "galleries public read" on public.galleries;
create policy "galleries public read" on public.galleries for select using (true);
drop policy if exists "galleries admin all" on public.galleries;
create policy "galleries admin all" on public.galleries for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tickets public read" on public.ticket_types;
create policy "tickets public read" on public.ticket_types for select using (active = true or public.is_admin());
drop policy if exists "tickets admin all" on public.ticket_types;
create policy "tickets admin all" on public.ticket_types for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "reservation own or admin read" on public.reservations;
create policy "reservation own or admin read" on public.reservations for select
using (user_id = auth.uid() or public.is_admin());
drop policy if exists "reservation own insert" on public.reservations;
create policy "reservation own insert" on public.reservations for insert
with check (user_id = auth.uid());
drop policy if exists "reservation admin update" on public.reservations;
create policy "reservation admin update" on public.reservations for update
using (public.is_admin()) with check (public.is_admin());

drop policy if exists "items own or admin read" on public.reservation_items;
create policy "items own or admin read" on public.reservation_items for select
using (
  public.is_admin() or exists (
    select 1 from public.reservations r
    where r.id = reservation_id and r.user_id = auth.uid()
  )
);
drop policy if exists "items own insert" on public.reservation_items;
create policy "items own insert" on public.reservation_items for insert
with check (
  exists (select 1 from public.reservations r
    where r.id = reservation_id and r.user_id = auth.uid())
);
drop policy if exists "items admin all" on public.reservation_items;
create policy "items admin all" on public.reservation_items for all
using (public.is_admin()) with check (public.is_admin());

-- Public read access to images. Upload/update/delete restricted to authenticated admins.
drop policy if exists "public view tourism media" on storage.objects;
create policy "public view tourism media" on storage.objects for select
using (bucket_id = 'tourism-media');
drop policy if exists "admin upload tourism media" on storage.objects;
create policy "admin or owner upload tourism media" on storage.objects for insert
with check (
  bucket_id = 'tourism-media' and (
    public.is_admin() or (
      (storage.foldername(name))[1] = 'payments' and
      (storage.foldername(name))[2] = auth.uid()::text
    )
  )
);
drop policy if exists "admin update tourism media" on storage.objects;
create policy "admin update tourism media" on storage.objects for update
using (bucket_id = 'tourism-media' and public.is_admin())
with check (bucket_id = 'tourism-media' and public.is_admin());
drop policy if exists "admin delete tourism media" on storage.objects;
create policy "admin delete tourism media" on storage.objects for delete
using (bucket_id = 'tourism-media' and public.is_admin());

-- Sample destination. Verify all details and replace sample content before public launch.
insert into public.destinations
(name, slug, short_description, description, address, village, district, regency, latitude, longitude, hero_image)
values
('Pantai Sembilan', 'pantai-sembilan',
 'Pantai berpasir putih di Pulau Gili Genting, Kabupaten Sumenep.',
 'Pantai Sembilan merupakan destinasi wisata pantai di Pulau Gili Genting, Sumenep, Madura. Halaman ini merupakan konten awal untuk demonstrasi platform. Lengkapi sejarah, fasilitas, akses penyeberangan, harga, dan informasi resmi berdasarkan konfirmasi pengelola.',
 'Desa Bringsang, Kecamatan Giligenting, Kabupaten Sumenep, Jawa Timur',
 'Bringsang', 'Giligenting', 'Sumenep', null, null, null)
on conflict (slug) do nothing;

insert into public.ticket_types (destination_id, name, description, price)
select id, 'Tiket masuk', 'Harga contoh — konfirmasi kepada pengelola sebelum digunakan.', 10000
from public.destinations where slug = 'pantai-sembilan'
and not exists (select 1 from public.ticket_types t where t.destination_id = destinations.id);
