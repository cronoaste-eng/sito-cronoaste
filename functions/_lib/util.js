// Funzioni comuni per l'account (D1 binding "DB", secret BREVO_API_KEY_2).
export const SITO = 'https://cronoaste.cloud';
export const COOKIE = 'ca_sess';
const SESSIONE_S = 60 * 60 * 24 * 30;

export const json = (obj, st, extra) => new Response(JSON.stringify(obj), { status: st || 200, headers: Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, extra || {}) });
export const EMAIL_OK = e => e.length <= 160 && /^[^@\s,;<>"']+@[^@\s,;<>"']+\.[^@\s,;<>"']+$/.test(e);

const hex = buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
export const token = () => { const a = crypto.getRandomValues(new Uint8Array(32)); return Array.from(a).map(b => b.toString(16).padStart(2, '0')).join(''); };

// Le richieste che modificano dati devono arrivare dal nostro sito (difesa CSRF, oltre a SameSite=Lax).
export function stessaOrigine(request) {
  const o = request.headers.get('origin');
  if (!o) return false;
  try { return new URL(o).host === new URL(request.url).host; } catch (e) { return false; }
}
export async function corpo(request) {
  if (!(request.headers.get('content-type') || '').includes('application/json')) return null;
  try { const t = await request.text(); if (t.length > 40000) return null; return JSON.parse(t); } catch (e) { return null; }
}
export function cookie(request, nome) {
  const c = request.headers.get('cookie') || '';
  for (const p of c.split(';')) { const i = p.indexOf('='); if (i > 0 && p.slice(0, i).trim() === nome) return p.slice(i + 1).trim(); }
  return '';
}
export const setCookie = t => COOKIE + '=' + t + '; Max-Age=' + SESSIONE_S + '; Path=/; HttpOnly; Secure; SameSite=Lax';
export const delCookie = () => COOKIE + '=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax';

export async function creaSessione(env, utenteId) {
  const t = token();
  await env.DB.prepare('INSERT INTO sessioni (hash, utente_id, scade) VALUES (?, ?, ?)').bind(await sha256(t), utenteId, Math.floor(Date.now() / 1000) + SESSIONE_S).run();
  return t;
}
export async function sessione(request, env) {
  if (!env.DB) return null;
  const t = cookie(request, COOKIE);
  if (!/^[0-9a-f]{64}$/.test(t)) return null;
  const r = await env.DB.prepare('SELECT u.id, u.email, u.promemoria FROM sessioni s JOIN utenti u ON u.id = s.utente_id WHERE s.hash = ? AND s.scade > ?').bind(await sha256(t), Math.floor(Date.now() / 1000)).first();
  return r ? { id: r.id, email: r.email, promemoria: r.promemoria, hash: await sha256(t) } : null;
}
// Limite di frequenza: true se la richiesta e' consentita. Le chiavi sono hash, non IP in chiaro.
export async function limite(env, chiave, max, finestraS) {
  const f = Math.floor(Date.now() / 1000 / finestraS);
  const r = await env.DB.prepare('INSERT INTO limiti (chiave, finestra, n) VALUES (?, ?, 1) ON CONFLICT(chiave, finestra) DO UPDATE SET n = n + 1 RETURNING n').bind(chiave, f).first();
  return r && r.n <= max;
}
export const ipHash = async request => sha256('ip:' + (request.headers.get('cf-connecting-ip') || 'x'));
export async function pulisci(env) {
  const ora = Math.floor(Date.now() / 1000);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM link_accesso WHERE scade < ?').bind(ora),
    env.DB.prepare('DELETE FROM sessioni WHERE scade < ?').bind(ora),
    env.DB.prepare('DELETE FROM limiti WHERE finestra < ?').bind(Math.floor(ora / 3600) - 48)
  ]);
}
export async function brevo(env, { to, subject, html, text }) {
  const chiave = env.BREVO_API_KEY_2 || env.BREVO_API_KEY;
  if (!chiave) return false;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': chiave, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify({ sender: { name: 'Crono Aste', email: env.MAIL_FROM || 'info@cronoaste.it' }, to: [{ email: to }], subject, htmlContent: html, textContent: text }) });
  return r.ok;
}
export const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function urlOk(u, host) {
  try { const x = new URL(String(u)); return x.protocol === 'https:' && x.hostname === host && !x.username && !x.password && String(u).length <= 500 ? String(u) : ''; } catch (e) { return ''; }
}
