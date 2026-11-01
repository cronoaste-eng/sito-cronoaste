// POST /api/verifica {t}: consuma il link monouso, crea l'utente se nuovo e apre la sessione (cookie HttpOnly).
import { json, corpo, stessaOrigine, sha256, limite, ipHash, creaSessione, setCookie } from '../_lib/util.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, msg: 'Servizio non ancora attivo.' }, 503);
  if (!stessaOrigine(request)) return json({ ok: false, msg: 'Richiesta non valida.' }, 403);
  const b = await corpo(request);
  const t = b && String(b.t || '');
  if (!/^[0-9a-f]{64}$/.test(t)) return json({ ok: false, msg: 'Link non valido.' }, 400);
  if (!(await limite(env, 'vr:' + (await ipHash(request)), 20, 3600))) return json({ ok: false, msg: 'Troppi tentativi. Riprova più tardi.' }, 429);
  const ora = Math.floor(Date.now() / 1000);
  const r = await env.DB.prepare('DELETE FROM link_accesso WHERE hash = ? AND scade > ? RETURNING email, consenso').bind(await sha256(t), ora).first();
  if (!r) return json({ ok: false, msg: 'Il link è scaduto o già usato. Richiedine uno nuovo.' }, 400);
  await env.DB.prepare('INSERT INTO utenti (email, creato, consenso) VALUES (?, ?, ?) ON CONFLICT(email) DO NOTHING').bind(r.email, ora, r.consenso).run();
  const u = await env.DB.prepare('SELECT id FROM utenti WHERE email = ?').bind(r.email).first();
  const sess = await creaSessione(env, u.id);
  return json({ ok: true, email: r.email }, 200, { 'set-cookie': setCookie(sess) });
}
export const onRequest = () => json({ ok: false, msg: 'Metodo non consentito.' }, 405);
