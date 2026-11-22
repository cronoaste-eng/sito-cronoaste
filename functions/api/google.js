// GET /api/google          : avvia l'accesso con Google (reindirizza a accounts.google.com; nessuno script di Google nelle nostre pagine).
// GET /api/google?stato=1  : dice se l'accesso con Google e' attivo (servono GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).
// ?p=1 = l'utente ha spuntato i promemoria (consenso facoltativo, usato solo se l'account viene creato adesso).
import { json, token, limite, ipHash, SITO, RITORNO, attivo } from '../_lib/util.js';

export async function onRequestGet({ request, env }) {
  const q = new URL(request.url).searchParams;
  if (q.get('stato') === '1') return json({ ok: attivo(env) });
  if (!attivo(env)) return new Response(null, { status: 302, headers: { location: SITO + '/accedi/?g=err', 'cache-control': 'no-store' } });
  if (!(await limite(env, 'go:' + (await ipHash(request)), 20, 3600))) return new Response(null, { status: 302, headers: { location: SITO + '/accedi/?g=err', 'cache-control': 'no-store' } });
  const state = token().slice(0, 32), nonce = token().slice(0, 32), p = q.get('p') === '1' ? 1 : 0;
  const u = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  u.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: RITORNO, response_type: 'code', scope: 'openid email', state, nonce, prompt: 'select_account' }).toString();
  return new Response(null, { status: 302, headers: { location: u.toString(), 'cache-control': 'no-store', 'set-cookie': 'ca_oauth=' + state + '.' + nonce + '.' + p + '; Max-Age=600; Path=/api; HttpOnly; Secure; SameSite=Lax' } });
}
export const onRequest = () => json({ ok: false }, 405);
