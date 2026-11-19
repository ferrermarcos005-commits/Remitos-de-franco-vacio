// Lo corre GitHub Actions cada hora (lunes a viernes, 8 a 18 hora Argentina).
import webpush from 'web-push';
const { SUPABASE_URL, SUPABASE_SECRET_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
const h = { apikey: SUPABASE_SECRET_KEY }; // clave secreta sb_secret_, solo en apikey
const get = async p => { const r = await fetch(`${SUPABASE_URL}/rest/v1/${p}`, { headers: h }); if (!r.ok) throw new Error(`${r.status} ${await r.text()}`); return r.json(); };

const patentes = await get('patentes?select=patente,esperados,remitos(count)');
const pend = patentes.map(p => ({ ...p, faltan: p.esperados - (p.remitos?.[0]?.count ?? 0) })).filter(p => p.faltan > 0);
console.log(`${pend.length} patente(s) pendientes`);
if (!pend.length) process.exit(0);

const payload = JSON.stringify({
  title: `Che, te faltan remitos en ${pend.length} patente(s)`,
  body: pend.slice(0, 4).map(p => `${p.patente}: faltan ${p.faltan}`).join(' · ') + (pend.length > 4 ? ' …' : ''),
});
webpush.setVapidDetails('https://github.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const subs = await get('push_subs?select=endpoint,p256dh,auth');
for (const s of subs) {
  try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload); console.log('enviado'); }
  catch (e) {
    console.log('falló', e.statusCode);
    if (e.statusCode === 404 || e.statusCode === 410)  // suscripción vencida: se borra
      await fetch(`${SUPABASE_URL}/rest/v1/push_subs?endpoint=eq.${encodeURIComponent(s.endpoint)}`, { method: 'DELETE', headers: h });
  }
}
