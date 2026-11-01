// POST /api/elimina-account: cancella account, preferiti, promemoria inviati e sessioni dell'utente collegato.
import { json, stessaOrigine, sessione, delCookie } from '../_lib/util.js';
export async function onRequestPost({ request, env }) {
  if (!stessaOrigine(request)) return json({ ok: false }, 403);
  const s = await sessione(request, env);
  if (!s) return json({ ok: false }, 401);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM preferiti WHERE utente_id = ?').bind(s.id),
    env.DB.prepare('DELETE FROM inviati WHERE utente_id = ?').bind(s.id),
    env.DB.prepare('DELETE FROM sessioni WHERE utente_id = ?').bind(s.id),
    env.DB.prepare('DELETE FROM link_accesso WHERE email = ?').bind(s.email),
    env.DB.prepare('DELETE FROM utenti WHERE id = ?').bind(s.id)
  ]);
  return json({ ok: true }, 200, { 'set-cookie': delCookie() });
}
export const onRequest = () => json({ ok: false }, 405);
