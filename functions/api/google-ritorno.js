// GET /api/google-ritorno?code&state: Google ci riporta qui. Scambia il codice (dal server, con il segreto), controlla l'ID token
// (emittente, destinatario, scadenza, nonce, email verificata), crea o riconosce l'utente e apre la sessione. Si usano solo email e "sub".
import { cookie, limite, ipHash, creaSessione, setCookie, EMAIL_OK, SITO, RITORNO, attivo } from '../_lib/util.js';

const uguali = (a, b) => { a = String(a || ''); b = String(b || ''); if (a.length !== b.length || !a) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const CANC = 'ca_oauth=; Max-Age=0; Path=/api; HttpOnly; Secure; SameSite=Lax';
const vai = (esito, extra) => { const h = new Headers({ location: SITO + '/accedi/?g=' + esito, 'cache-control': 'no-store' }); h.append('set-cookie', CANC); if (extra) h.append('set-cookie', extra); return new Response(null, { status: 302, headers: h }); };
function claims(jwt) {
  try {
    const b = String(jwt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(b + '='.repeat((4 - b.length % 4) % 4)));
  } catch (e) { return null; }
}
export async function onRequestGet({ request, env }) {
  if (!attivo(env)) return vai('err');
  const q = new URL(request.url).searchParams;
  const c = cookie(request, 'ca_oauth').split('.');
  const [state, nonce, p] = [c[0], c[1], c[2] === '1' ? 1 : 0];
  if (q.get('error') || !q.get('code') || !uguali(q.get('state'), state) || !nonce) return vai('err');
  if (!(await limite(env, 'gr:' + (await ipHash(request)), 20, 3600))) return vai('err');
  let tk = null;
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code: q.get('code'), client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: RITORNO, grant_type: 'authorization_code' }).toString() });
    if (!r.ok) return vai('err');
    tk = await r.json();
  } catch (e) { return vai('err'); }
  const cl = claims(tk && tk.id_token); // ricevuto direttamente da Google via HTTPS: la firma non va ricontrollata
  const ora = Math.floor(Date.now() / 1000);
  if (!cl || !['https://accounts.google.com', 'accounts.google.com'].includes(cl.iss) || cl.aud !== env.GOOGLE_CLIENT_ID || !(cl.exp > ora) || !uguali(cl.nonce, nonce)) return vai('err');
  const email = String(cl.email || '').trim().toLowerCase(), sub = String(cl.sub || '');
  if (cl.email_verified !== true || !EMAIL_OK(email) || !/^\d{5,40}$/.test(sub)) return vai('err');
  let u = await env.DB.prepare('SELECT id, email, google_sub FROM utenti WHERE google_sub = ?').bind(sub).first();
  if (!u) {
    u = await env.DB.prepare('SELECT id, email, google_sub FROM utenti WHERE email = ?').bind(email).first();
    if (u && u.google_sub && u.google_sub !== sub) return vai('err');
    if (u) await env.DB.prepare('UPDATE utenti SET google_sub = ? WHERE id = ?').bind(sub, u.id).run();
    else {
      await env.DB.prepare('INSERT INTO utenti (email, creato, consenso, promemoria, google_sub) VALUES (?, ?, ?, ?, ?) ON CONFLICT(email) DO NOTHING').bind(email, ora, ora, p, sub).run();
      u = await env.DB.prepare('SELECT id FROM utenti WHERE email = ?').bind(email).first();
    }
  }
  if (!u) return vai('err');
  const sess = await creaSessione(env, u.id);
  return vai('ok', setCookie(sess));
}
export const onRequest = () => new Response('Metodo non consentito', { status: 405 });
