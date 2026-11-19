-- Actualización 2: respaldo para que los avisos de cada hora salgan siempre.
-- Supabase llama a GitHub cada hora (minuto 7, de 8 a 18 hora Argentina, lunes a viernes) y GitHub manda el aviso.
-- ANTES DE EJECUTAR: reemplazá PEGAR_TOKEN_ACA (más abajo) por el token de GitHub que empieza con github_pat_
-- Pegar y ejecutar una vez en Supabase → SQL Editor.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Datos privados que la app no puede leer (sin políticas = nadie desde la app)
create table if not exists config_privada (clave text primary key, valor text not null);
alter table config_privada enable row level security;
revoke all on config_privada from anon, authenticated;
insert into config_privada (clave, valor) values ('github_token', 'PEGAR_TOKEN_ACA')
on conflict (clave) do update set valor = excluded.valor;

-- Registro de avisos enviados (evita mandar dos veces el mismo aviso)
create table if not exists avisos_log (
  id bigserial primary key,
  enviado timestamptz not null default now(),
  origen text,
  patentes int,
  dispositivos int
);
alter table avisos_log enable row level security;
revoke all on avisos_log from anon, authenticated;

-- Horario: minuto 7 de cada hora, 11 a 21 UTC (8 a 18 Argentina), lunes a viernes
select cron.schedule('avisos-remitos', '7 11-21 * * 1-5', $$
  select net.http_post(
    url := 'https://api.github.com/repos/ferrermarcos005-commits/Remitos-de-franco-vacio/actions/workflows/avisos.yml/dispatches',
    body := '{"ref":"main","inputs":{"origen":"supabase"}}'::jsonb,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select valor from public.config_privada where clave = 'github_token'),
      'Accept', 'application/vnd.github+json',
      'Content-Type', 'application/json',
      'User-Agent', 'remitos-supabase',
      'X-GitHub-Api-Version', '2022-11-28'),
    timeout_milliseconds := 10000
  );
$$);

-- Prueba ahora mismo: dispara un aviso (si hay patentes pendientes te va a llegar la notificación)
select net.http_post(
  url := 'https://api.github.com/repos/ferrermarcos005-commits/Remitos-de-franco-vacio/actions/workflows/avisos.yml/dispatches',
  body := '{"ref":"main","inputs":{"origen":"supabase-prueba"}}'::jsonb,
  headers := jsonb_build_object(
    'Authorization', 'Bearer ' || (select valor from public.config_privada where clave = 'github_token'),
    'Accept', 'application/vnd.github+json',
    'Content-Type', 'application/json',
    'User-Agent', 'remitos-supabase',
    'X-GitHub-Api-Version', '2022-11-28'),
  timeout_milliseconds := 10000
);
