// POST /api/esci: chiude la sessione.
import { json, stessaOrigine, sessione, delCookie } from '../_lib/util.js';
export async function onRequestPost({ request, env }) {
  if (!stessaOrigine(request)) return json({ ok: false }, 403);
  const s = await sessione(request, env);
  if (s) await env.DB.prepare('DELETE FROM sessioni WHERE hash = ?').bind(s.hash).run();
  return json({ ok: true }, 200, { 'set-cookie': delCookie() });
}
export const onRequest = () => json({ ok: false }, 405);
