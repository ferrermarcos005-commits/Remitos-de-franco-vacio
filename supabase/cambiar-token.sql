-- Cambiar el token de GitHub que usan los avisos, y probar.
-- ANTES DE EJECUTAR: reemplazá NUEVO_TOKEN_ACA por el token nuevo (empieza con github_pat_). Dejá las comillas.
update config_privada set valor = 'NUEVO_TOKEN_ACA' where clave = 'github_token';

-- Prueba: dispara un aviso ahora
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

-- Respuesta de GitHub a los pedidos anteriores (204 = bien; 401/403/404 = problema con el token)
select created, status_code, error_msg, left(content::text, 200) as respuesta
from net._http_response order by created desc limit 3;
