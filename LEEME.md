# Remitos Franco

App web instalable (PWA) para seguir los remitos por patente.

- `index.html`, `sw.js`, `manifest.json`, `icon.svg`, `config.js`: la app (se publica con GitHub Pages).
- `supabase/schema.sql`: crea las tablas. Se ejecuta una vez en Supabase → SQL Editor.
- `scripts/enviar-avisos.mjs` + `.github/workflows/avisos.yml`: cada hora, de lunes a viernes de 8 a 18 (hora Argentina), manda una notificación a los celulares que activaron los avisos si hay patentes con remitos pendientes.

## Secretos que van en GitHub (Settings → Secrets and variables → Actions)
- `SUPABASE_SECRET_KEY`: clave secreta de Supabase (empieza con `sb_secret_`). No compartirla.
- `VAPID_PRIVATE_KEY`: clave privada para las notificaciones.

## Aviso
La app no tiene usuarios ni contraseña: cualquiera que tenga la dirección puede ver y cargar datos.
