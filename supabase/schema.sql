-- Pegar y ejecutar una vez en Supabase → SQL Editor.
create table if not exists patentes (
  id uuid primary key default gen_random_uuid(),
  patente text not null,
  tipo text not null default 'Camión/Semi',
  esperados int not null default 0,
  nota text,
  creado timestamptz not null default now()
);
create table if not exists remitos (
  id uuid primary key default gen_random_uuid(),
  patente_id uuid not null references patentes(id) on delete cascade,
  numero text not null,
  instruccion text,
  mercaderia text,
  creado timestamptz not null default now()
);
create table if not exists push_subs (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  dispositivo text,
  creado timestamptz not null default now()
);
create index if not exists remitos_patente_idx on remitos(patente_id);

-- Acceso: la app no tiene usuarios, así que quien tenga la dirección de la app puede leer y cargar.
alter table patentes enable row level security;
alter table remitos enable row level security;
alter table push_subs enable row level security;
create policy "app patentes" on patentes for all to anon using (true) with check (true);
create policy "app remitos" on remitos for all to anon using (true) with check (true);
-- Las suscripciones solo se pueden agregar/actualizar desde la app; leerlas solo puede el servidor.
create policy "app push insert" on push_subs for insert to anon with check (true);
create policy "app push update" on push_subs for update to anon using (true) with check (true);
