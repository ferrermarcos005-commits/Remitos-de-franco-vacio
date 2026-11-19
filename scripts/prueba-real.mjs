// Prueba de punta a punta contra el Supabase real (corre en GitHub Actions, rama diagnostico).
// Crea una patente de prueba, sube archivos, descarga el ZIP y borra todo. No imprime claves.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
fs.copyFileSync('jszip.min.js', '/tmp/jszip.cjs'); const JSZip = require('/tmp/jszip.cjs');
const cfg = fs.readFileSync('config.js', 'utf8');
const URL_ = cfg.match(/SUPABASE_URL:\s*'([^']+)'/)[1];
const SEC = (process.env.SUPABASE_SECRET_KEY || '').trim();
const PAT = 'ZZPRUEBA' + Date.now().toString().slice(-5);
const res = [];
const ok = (n, c, extra = '') => { res.push(`${c ? 'OK   ' : 'FALLA'} ${n}${extra ? ' — ' + extra : ''}`); };

// Clave secreta (la que usan los avisos)
if (SEC) {
  const r = await fetch(`${URL_}/rest/v1/push_subs?select=dispositivo`, { headers: { apikey: SEC, Authorization: `Bearer ${SEC}` } });
  const t = await r.text(); let n = '?'; try { n = JSON.parse(t).length; } catch {}
  ok('clave secreta válida', r.ok, r.ok ? `${n} dispositivo(s) registrados` : `${r.status} ${t.slice(0, 120)}`);
  if (r.ok) try { console.log('dispositivos:', JSON.parse(t).map(x => (x.dispositivo || '').replace(/\(([^)]*)\).*/, '($1)'))); } catch {}
} else ok('clave secreta válida', false, 'vacía');

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', acceptDownloads: true });
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
try {
  await p.goto('http://localhost:8766/index.html'); await p.waitForTimeout(2000);
  const banner = await p.isVisible('#error') ? await p.textContent('#error') : '';
  ok('conexión y tabla de archivos', !banner, banner);
  await p.click('#btnNuevo'); await p.fill('#frm [name=patente]', PAT); await p.fill('#frm [name=esperados]', '2'); await p.click('#frm button[type=submit]');
  await p.waitForFunction(() => location.hash.startsWith('#/p/'), null, { timeout: 15000 }); await p.waitForSelector('#ocupado', { state: 'hidden' });
  ok('crear patente', true);
  const jpg = Buffer.from(await p.evaluate(async () => { const c = document.createElement('canvas'); c.width = 800; c.height = 600; const x = c.getContext('2d'); x.fillStyle = '#1f6feb'; x.fillRect(0, 0, 800, 600); x.fillStyle = '#fff'; x.font = '80px sans-serif'; x.fillText('PRUEBA', 200, 320); const bl = await new Promise(r => c.toBlob(r, 'image/jpeg', .9)); return [...new Uint8Array(await bl.arrayBuffer())]; }));
  await p.click('#btnNuevo'); await p.fill('#frmR [name=numero]', 'P-001'); await p.fill('#frmR [name=mercaderia]', 'prueba');
  await p.setInputFiles('#inFoto', { name: 'foto prueba.jpg', mimeType: 'image/jpeg', buffer: jpg });
  await p.setInputFiles('#inArchivo', { name: 'remito prueba.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n%prueba\n') });
  await p.click('#btnGuardarR'); await p.waitForSelector('#ocupado', { state: 'hidden', timeout: 30000 }); await p.waitForTimeout(1500);
  const nf = await p.$$eval('#listaRemitos .file', d => d.length);
  ok('subir 2 archivos', nf === 2, `${nf} miniatura(s)`);
  const imgOk = await p.$eval('#listaRemitos .file img', i => new Promise(r => i.complete ? r(i.naturalWidth) : (i.onload = () => r(i.naturalWidth), i.onerror = () => r(0)))).catch(() => 0);
  ok('ver la foto (enlace público)', imgOk > 0, `ancho ${imgOk}`);
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 30000 }), p.click('text=⬇ Descargar todo')]);
  const z = await JSZip.loadAsync(fs.readFileSync(await dl.path()));
  const names = Object.keys(z.files); ok('descargar ZIP de la patente', names.length === 5, names.join(', '));
  const rutas = await p.evaluate(() => { const id = location.hash.split('/').pop(); return archivos.filter(a => a.patente_id === id).map(a => a.ruta); });
  await p.click('#cabPatente >> text=Borrar'); await p.waitForSelector('#ocupado', { state: 'hidden', timeout: 30000 }); await p.waitForTimeout(1000);
  const sigue = await p.evaluate(pat => datos.some(d => d.patente === pat), PAT);
  ok('borrar patente de prueba', !sigue);
  let quedan = 0; for (const r of rutas) { const x = await fetch(`${URL_}/storage/v1/object/public/archivos/${r}`); if (x.ok) quedan++; }
  ok('borrar archivos de la prueba', quedan === 0, `${quedan} siguen accesibles`);
  const rpc = await p.evaluate(async () => { try { await api('rpc/guardar_suscripcion', { method: 'POST', body: { p_endpoint: 'https://example.invalid/prueba', p_p256dh: 'x', p_auth: 'y', p_dispositivo: 'prueba-borrar' } }); return 'ok'; } catch (e) { return e.message; } });
  ok('registrar dispositivo para avisos', rpc === 'ok', rpc === 'ok' ? '' : rpc.slice(0, 160));
  if (SEC) await fetch(`${URL_}/rest/v1/push_subs?dispositivo=eq.prueba-borrar`, { method: 'DELETE', headers: { apikey: SEC, Authorization: `Bearer ${SEC}` } });
} catch (e) {
  ok('prueba', false, e.message.split('\n')[0]);
  const est = await p.evaluate(() => ({ hash: location.hash, dialogo: document.querySelector('dialog[open]')?.id || null, ocupado: !document.querySelector('#ocupado').hidden, ocupadoTxt: document.querySelector('#ocupadoTxt').textContent, titulo: document.querySelector('#titulo').textContent, fab: document.querySelector('#btnNuevo').textContent })).catch(x => x.message);
  console.log('estado al fallar:', JSON.stringify(est));
  console.log(e.message.split('\n').slice(0, 12).join('\n'));
} finally {
  // Limpieza: borra cualquier patente de prueba que haya quedado (y sus archivos)
  const PUB = cfg.match(/SUPABASE_ANON_KEY:\s*'([^']+)'/)[1];
  const H = { apikey: PUB, Authorization: `Bearer ${PUB}`, 'Content-Type': 'application/json' };
  const r = await fetch(`${URL_}/rest/v1/patentes?patente=like.ZZPRUEBA*&select=id,patente`, { headers: H });
  const quedaron = (r.ok ? await r.json() : []).filter(x => /^ZZPRUEBA\d+$/.test(x.patente)); // doble control: solo las de prueba
  for (const { id } of quedaron) {
    const a = await fetch(`${URL_}/rest/v1/archivos?patente_id=eq.${id}&select=ruta`, { headers: H });
    const rutas = a.ok ? (await a.json()).map(x => x.ruta) : [];
    if (rutas.length) await fetch(`${URL_}/storage/v1/object/archivos`, { method: 'DELETE', headers: H, body: JSON.stringify({ prefixes: rutas }) });
    await fetch(`${URL_}/rest/v1/patentes?id=eq.${id}`, { method: 'DELETE', headers: H });
  }
  const r2 = await fetch(`${URL_}/rest/v1/patentes?select=patente`, { headers: H });
  const todas = r2.ok ? (await r2.json()).map(x => x.patente) : [];
  console.log(`limpieza: ${quedaron.length} patente(s) de prueba borradas; quedan ${todas.filter(x => x.startsWith('ZZPRUEBA')).length} de prueba y ${todas.filter(x => !x.startsWith('ZZPRUEBA')).length} reales`);
}
console.log('\n' + res.join('\n')); if (errs.length) console.log('errores de la página:', errs.slice(0, 5));
await b.close();
