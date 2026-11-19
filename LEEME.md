# Remitos Franco

App web instalable (PWA) para seguir los remitos por patente.

- `index.html`, `sw.js`, `manifest.json`, `icon.svg`, `config.js`, `jszip.min.js`: la app (se publica con GitHub Pages).
- Cada patente tiene los remitos esperados; cada remito lleva número, instrucción, mercadería y fotos/PDF/archivos.
- "Descargar todo" en una patente baja un ZIP solo de esa patente: todos sus archivos + `resumen.txt` y `resumen.csv`.
- `supabase/schema.sql` y `supabase/actualizacion-1.sql`: se ejecutan una vez cada uno, en orden, en Supabase → SQL Editor.
- `scripts/enviar-avisos.mjs` + `.github/workflows/avisos.yml`: cada hora, de lunes a viernes de 8 a 18 (hora Argentina), manda una notificación a los dispositivos que activaron los avisos si hay patentes con remitos pendientes.

## Secretos en GitHub (Settings → Secrets and variables → Actions)
- `SUPABASE_SECRET_KEY`: clave secreta de Supabase completa (empieza con `sb_secret_`). No compartirla.
- `VAPID_PRIVATE_KEY`: clave privada para las notificaciones.

## Aviso
La app no tiene usuarios ni contraseña: cualquiera que tenga la dirección puede ver y cargar datos, y las fotos quedan en una carpeta pública de Supabase (con nombres imposibles de adivinar).

`jszip.min.js` es JSZip 3.10.1 (licencia MIT o GPLv3).
