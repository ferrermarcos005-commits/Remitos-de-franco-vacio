-- Actualización 1: fotos/archivos por remito y arreglo del registro de avisos.
-- Pegar y ejecutar una vez en Supabase → SQL Editor.

-- 1) Archivos (fotos, PDF, etc.) de cada remito
create table if not exists archivos (
  id uuid primary key default gen_random_uuid(),
  remito_id uuid not null references remitos(id) on delete cascade,
  patente_id uuid not null references patentes(id) on delete cascade,
  nombre text not null,
  tipo text,
  tamano bigint,
  ruta text not null unique,
  creado timestamptz not null default now()
);
create index if not exists archivos_remito_idx on archivos(remito_id);
create index if not exists archivos_patente_idx on archivos(patente_id);
alter table archivos enable row level security;
drop policy if exists "app archivos" on archivos;
create policy "app archivos" on archivos for all to anon using (true) with check (true);

-- 2) Lugar donde se guardan los archivos (Storage)
insert into storage.buckets (id, name, public) values ('archivos', 'archivos', true)
on conflict (id) do nothing;
drop policy if exists "app archivos ver" on storage.objects;
drop policy if exists "app archivos subir" on storage.objects;
drop policy if exists "app archivos borrar" on storage.objects;
create policy "app archivos ver" on storage.objects for select to anon using (bucket_id = 'archivos');
create policy "app archivos subir" on storage.objects for insert to anon with check (bucket_id = 'archivos');
create policy "app archivos borrar" on storage.objects for delete to anon using (bucket_id = 'archivos');

-- 3) Registro de celulares para los avisos (antes la base lo rechazaba)
create or replace function public.guardar_suscripcion(p_endpoint text, p_p256dh text, p_auth text, p_dispositivo text)
returns void language sql security definer set search_path = public as $$
  insert into push_subs (endpoint, p256dh, auth, dispositivo)
  values (p_endpoint, p_p256dh, p_auth, p_dispositivo)
  on conflict (endpoint) do update set p256dh = excluded.p256dh, auth = excluded.auth, dispositivo = excluded.dispositivo;
$$;
grant execute on function public.guardar_suscripcion(text, text, text, text) to anon;
drop policy if exists "app push insert" on push_subs;
drop policy if exists "app push update" on push_subs;
