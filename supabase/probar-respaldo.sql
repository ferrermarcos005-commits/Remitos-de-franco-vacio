-- Probar el respaldo de avisos y ver qué responde GitHub.
-- No hace falta cambiar nada: pegar y ejecutar en Supabase → SQL Editor.

-- 1) Dispara un aviso de prueba
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

-- 2) Respuesta de GitHub a los pedidos anteriores (204 = bien; 401/403/404 = problema con el token)
select created, status_code, error_msg, left(content::text, 200) as respuesta
from net._http_response order by created desc limit 3;
