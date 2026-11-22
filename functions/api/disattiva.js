// GET /api/disattiva?u=<id>&t=<firma>: pagina di conferma. POST (stesso indirizzo): disattiva i promemoria email di quell'utente.
// Serve il link in fondo alle email di promemoria e l'intestazione List-Unsubscribe (un clic nel client di posta). La firma e' un HMAC: non si puo' indovinare.
import { firma, esc } from '../_lib/util.js';

const uguali = (a, b) => { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const H = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer', 'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" };
const pagina = (titolo, corpo, st) => new Response('<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + esc(titolo) + ' - Crono Aste</title><style>body{font-family:Arial,sans-serif;color:#10243e;background:#f4f7fb;margin:0;padding:24px 16px}main{max-width:480px;margin:40px auto;background:#fff;border:1px solid #d7e0ec;border-radius:12px;padding:24px}h1{font-size:20px;margin:0 0 12px;color:#14325c}button,a.b{background:#2f5f9e;color:#fff;border:0;padding:12px 20px;border-radius:8px;font-size:16px;cursor:pointer;text-decoration:none;display:inline-block}a{color:#2f5f9e}p{line-height:1.5}</style></head><body><main><h1>' + esc(titolo) + '</h1>' + corpo + '</main></body></html>', { status: st || 200, headers: H });

async function valida(request, env) {
  if (!env.DB || !env.CHIAVE_PROMEMORIA) return null;
  const q = new URL(request.url).searchParams, u = q.get('u') || '', t = q.get('t') || '';
  if (!/^\d{1,12}$/.test(u) || !/^[0-9a-f]{64}$/.test(t)) return null;
  return uguali(await firma(env, 'disattiva:' + u), t) ? +u : null;
}
export async function onRequestGet({ request, env }) {
  const u = await valida(request, env);
  if (!u) return pagina('Link non valido', '<p>Il link non &egrave; valido o &egrave; scaduto. Per gestire i promemoria accedi al tuo account su <a href="https://cronoaste.cloud/account/">cronoaste.cloud</a> oppure scrivici a <a href="mailto:info@cronoaste.it">info@cronoaste.it</a>.</p>', 400);
  return pagina('Disattivare i promemoria?', '<p>Non riceverai pi&ugrave; le email di promemoria sulla scadenza dei beni che hai salvato. Potrai riattivarli in ogni momento dalla pagina &laquo;Il mio account&raquo;.</p><form method="post" action="' + esc(new URL(request.url).pathname + new URL(request.url).search) + '"><button type="submit">Disattiva i promemoria</button></form>');
}
export async function onRequestPost({ request, env }) {
  const u = await valida(request, env);
  if (!u) return pagina('Link non valido', '<p>Il link non &egrave; valido o &egrave; scaduto. Scrivici a <a href="mailto:info@cronoaste.it">info@cronoaste.it</a>.</p>', 400);
  await env.DB.prepare('UPDATE utenti SET promemoria = 0 WHERE id = ?').bind(u).run();
  return pagina('Promemoria disattivati', '<p>Fatto: non riceverai pi&ugrave; promemoria. Puoi riattivarli quando vuoi dalla pagina &laquo;Il mio account&raquo; di <a href="https://cronoaste.cloud/account/">cronoaste.cloud</a>.</p>');
}
export const onRequest = () => new Response('Metodo non consentito', { status: 405 });
