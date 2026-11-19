// Diagnóstico: NO imprime claves, solo estados, formatos y cantidades.
import fs from 'node:fs';
const cfg = fs.readFileSync('config.js', 'utf8');
const URL_ = cfg.match(/SUPABASE_URL:\s*'([^']+)'/)[1];
const PUB = cfg.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)[1];
const SEC = process.env.SUPABASE_SECRET_KEY || '';
const VAP = process.env.VAPID_PRIVATE_KEY || '';
const fmt = (k, pre) => ({ largo: k.length, empiezaBien: k.startsWith(pre), espaciosOSaltos: /\s/.test(k), noASCII: /[^\x20-\x7e]/.test(k), conComillas: /["']/.test(k), largoSinEspacios: k.trim().length, empiezaBienSinEspacios: k.trim().startsWith(pre) });
console.log('SECRET formato:', JSON.stringify(fmt(SEC, 'sb_secret_')), 'publishable?', SEC.trim().startsWith('sb_publishable_'), 'jwt?', SEC.trim().startsWith('eyJ'));
console.log('VAPID formato:', JSON.stringify({ largo: VAP.length, largoSinEspacios: VAP.trim().length, base64url: /^[A-Za-z0-9_-]+$/.test(VAP.trim()) }));
async function t(nombre, path, { key, bearer = false, method = 'GET', body, headers = {} } = {}) {
  const h = { apikey: key, ...headers }; if (bearer) h.Authorization = 'Bearer ' + key;
  if (body && !h['Content-Type']) h['Content-Type'] = 'application/json';
  try {
    const r = await fetch(URL_ + path, { method, headers: h, body: body && typeof body !== 'string' ? JSON.stringify(body) : body });
    const txt = await r.text(); let info = txt.slice(0, 160);
    try { const j = JSON.parse(txt); if (Array.isArray(j)) info = `array(${j.length})`; } catch {}
    console.log(`${nombre}: ${r.status} ${info}`); return { status: r.status, txt };
  } catch (e) { console.log(`${nombre}: ERROR ${e.message}`); return {}; }
}
await t('pub GET patentes (solo apikey)', '/rest/v1/patentes?select=id', { key: PUB });
await t('pub GET patentes (con Bearer)', '/rest/v1/patentes?select=id', { key: PUB, bearer: true });
await t('pub GET remitos', '/rest/v1/remitos?select=id', { key: PUB });
await t('pub GET push_subs (RLS deberia dar 0)', '/rest/v1/push_subs?select=endpoint', { key: PUB });
await t('pub GET archivos (tabla nueva)', '/rest/v1/archivos?select=id', { key: PUB });
const ins = await t('pub POST patente de prueba', '/rest/v1/patentes', { key: PUB, method: 'POST', body: { patente: 'ZZ-PRUEBA', esperados: 1 }, headers: { Prefer: 'return=representation' } });
try { const id = JSON.parse(ins.txt)[0].id; await t('pub DELETE patente de prueba', '/rest/v1/patentes?id=eq.' + id, { key: PUB, method: 'DELETE' }); } catch {}
await t('pub upsert push_subs (merge)', '/rest/v1/push_subs?on_conflict=endpoint', { key: PUB, method: 'POST', body: { endpoint: 'https://example.invalid/diag', p256dh: 'x', auth: 'y', dispositivo: 'diagnostico' }, headers: { Prefer: 'resolution=merge-duplicates' } });
await t('pub insert push_subs (ignore dup)', '/rest/v1/push_subs?on_conflict=endpoint', { key: PUB, method: 'POST', body: { endpoint: 'https://example.invalid/diag2', p256dh: 'x', auth: 'y', dispositivo: 'diagnostico' }, headers: { Prefer: 'resolution=ignore-duplicates' } });
await t('pub storage list buckets', '/storage/v1/bucket', { key: PUB });
await t('pub storage list buckets (Bearer)', '/storage/v1/bucket', { key: PUB, bearer: true });
await t('sec GET push_subs (trim)', '/rest/v1/push_subs?select=endpoint,dispositivo', { key: SEC.trim() });
await t('sec storage buckets (trim)', '/storage/v1/bucket', { key: SEC.trim() });
