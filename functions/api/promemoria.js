// POST /api/promemoria {attivi: true|false}: attiva o disattiva i promemoria email dell'utente collegato.
import { json, corpo, stessaOrigine, sessione } from '../_lib/util.js';
export async function onRequestPost({ request, env }) {
  if (!stessaOrigine(request)) return json({ ok: false }, 403);
  const s = await sessione(request, env);
  if (!s) return json({ ok: false }, 401);
  const b = await corpo(request);
  if (!b || typeof b.attivi !== 'boolean') return json({ ok: false }, 400);
  await env.DB.prepare('UPDATE utenti SET promemoria = ? WHERE id = ?').bind(b.attivi ? 1 : 0, s.id).run();
  return json({ ok: true, promemoria: b.attivi });
}
export const onRequest = () => json({ ok: false }, 405);
