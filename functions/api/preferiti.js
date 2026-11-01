// GET /api/preferiti -> {email, promemoria, items}; PUT /api/preferiti {items} sostituisce l'elenco dell'utente collegato.
import { json, corpo, stessaOrigine, sessione, urlOk } from '../_lib/util.js';

const HOST_VENDITE = 'cronoaste.fallcoaste.it', HOST_FOTO = 'd3h8bn4njg0vla.cloudfront.net';
function pulisciItem(x) {
  if (!x || typeof x !== 'object') return null;
  const id = String(x.id == null ? '' : x.id);
  if (!/^[0-9A-Za-z_-]{1,40}$/.test(id)) return null;
  const num = v => (typeof v === 'number' && isFinite(v) ? v : null);
  return { id, t: String(x.t || '').slice(0, 160), tr: String(x.tr || '').slice(0, 60), u: urlOk(x.u, HOST_VENDITE), f: urlOk(x.f, HOST_FOTO), s: num(x.s), p: num(x.p) };
}
export async function onRequestGet({ request, env }) {
  const s = await sessione(request, env);
  if (!s) return json({ ok: false }, 401);
  const rs = await env.DB.prepare('SELECT dati FROM preferiti WHERE utente_id = ? ORDER BY aggiunto').bind(s.id).all();
  const items = (rs.results || []).map(r => { try { return JSON.parse(r.dati); } catch (e) { return null; } }).filter(Boolean);
  return json({ ok: true, email: s.email, promemoria: !!s.promemoria, items });
}
export async function onRequestPut({ request, env }) {
  if (!stessaOrigine(request)) return json({ ok: false }, 403);
  const s = await sessione(request, env);
  if (!s) return json({ ok: false }, 401);
  const b = await corpo(request);
  if (!b || !Array.isArray(b.items) || b.items.length > 50) return json({ ok: false, msg: 'Richiesta non valida.' }, 400);
  const visti = {}, items = [];
  for (const x of b.items) { const p = pulisciItem(x); if (p && !visti[p.id]) { visti[p.id] = 1; items.push(p); } }
  const st = [env.DB.prepare('DELETE FROM preferiti WHERE utente_id = ?').bind(s.id)];
  items.forEach((p, i) => st.push(env.DB.prepare('INSERT INTO preferiti (utente_id, bene_id, dati, aggiunto) VALUES (?, ?, ?, ?)').bind(s.id, p.id, JSON.stringify(p), i)));
  await env.DB.batch(st);
  return json({ ok: true, n: items.length });
}
export const onRequest = () => json({ ok: false }, 405);
