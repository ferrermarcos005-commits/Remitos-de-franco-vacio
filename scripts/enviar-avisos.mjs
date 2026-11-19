// Manda el aviso de remitos pendientes a los dispositivos registrados.
// Lo dispara GitHub Actions: por horario (cron) y/o desde Supabase (respaldo), lunes a viernes de 8 a 18 (Argentina).
import webpush from 'web-push';
const env = k => (process.env[k] || '').trim();
const SUPABASE_URL = env('SUPABASE_URL'), KEY = env('SUPABASE_SECRET_KEY');
const ORIGEN = env('ORIGEN') || 'github';           // github / supabase = horario automático; manual o *-prueba = a mano
const AUTOMATICO = ['github', 'supabase'].includes(ORIGEN);
if (!KEY.startsWith('sb_secret_') || KEY.length < 20)
  throw new Error(`La clave SUPABASE_SECRET_KEY parece incompleta (tiene ${KEY.length} caracteres). Copiala entera desde Supabase → Project Settings → API Keys.`);
const h = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: h }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };

// Si ya salió un aviso automático hace menos de 40 minutos (por ejemplo, lo disparó el otro horario), no se repite.
let hayLog = true;
if (AUTOMATICO) {
  try {
    const [ult] = await get('avisos_log?select=enviado,origen&origen=in.(github,supabase)&order=enviado.desc&limit=1');
    if (ult && Date.now() - Date.parse(ult.enviado) < 40 * 60e3) { console.log(`Ya se mandó un aviso a las ${ult.enviado} (${ult.origen}). No se repite.`); process.exit(0); }
  } catch (e) { hayLog = false; console.log('Sin registro de avisos (tabla avisos_log):', e.message.slice(0, 80)); }
}

const patentes = await get('patentes?select=patente,esperados,remitos(count)');
const pend = patentes.map(p => ({ ...p, faltan: p.esperados - (p.remitos?.[0]?.count ?? 0) })).filter(p => p.faltan > 0);
const subs = await get('push_subs?select=endpoint,p256dh,auth');
console.log(`Origen: ${ORIGEN}. ${pend.length} patente(s) pendientes, ${subs.length} dispositivo(s) registrados`);
if (!pend.length) process.exit(0);
if (!subs.length) console.log('Ningún dispositivo registrado: abrir la app y activar las notificaciones.');

const payload = JSON.stringify({
  title: `Che, te faltan remitos en ${pend.length} patente(s)`,
  body: pend.slice(0, 4).map(p => `${p.patente}: faltan ${p.faltan}`).join(' · ') + (pend.length > 4 ? ' …' : ''),
});
webpush.setVapidDetails('https://github.com', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
let ok = 0;
for (const s of subs) {
  try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); ok++; }
  catch (e) {
    console.log('falló un envío:', e.statusCode || e.code || e.message);
    if ([404, 410].includes(e.statusCode) || e.code === 'ENOTFOUND')  // suscripción vencida o inválida: se borra
      await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers: h });
  }
}
console.log(`Avisos enviados: ${ok} de ${subs.length}`);
if (hayLog && ok) await fetch(`${SUPABASE_URL}/rest/v1/avisos_log`, { method: 'POST', headers: { ...h, 'Content-Type': 'application/json' }, body: JSON.stringify({ origen: ORIGEN, patentes: pend.length, dispositivos: ok }) }).catch(() => {});
