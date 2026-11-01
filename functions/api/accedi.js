// POST /api/accedi {email, consenso, t0, sito_web}: invia il link di accesso (valido 15 minuti, monouso). Risposta sempre uguale.
import { json, corpo, stessaOrigine, EMAIL_OK, token, sha256, limite, ipHash, pulisci, brevo, esc, SITO } from '../_lib/util.js';

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ ok: false, msg: 'Servizio non ancora attivo. Scrivici a info@cronoaste.it.' }, 503);
  if (!stessaOrigine(request)) return json({ ok: false, msg: 'Richiesta non valida.' }, 403);
  const b = await corpo(request);
  if (!b) return json({ ok: false, msg: 'Richiesta non valida.' }, 400);
  const generica = { ok: true, msg: 'Se l\'indirizzo è corretto, ti abbiamo inviato un link di accesso. Controlla la posta (anche lo spam): vale 15 minuti.' };
  if (b.sito_web) return json(generica);
  const t0 = parseInt(b.t0 || '0', 10);
  if (!t0 || Date.now() - t0 < 2000) return json({ ok: false, msg: 'Riprova tra qualche secondo.' }, 400);
  const email = String(b.email || '').trim().toLowerCase();
  if (!EMAIL_OK(email)) return json({ ok: false, msg: 'Controlla l\'indirizzo email.' }, 400);
  if (b.consenso !== true) return json({ ok: false, msg: 'Serve il consenso al trattamento dei dati.' }, 400);
  if (!(await limite(env, 'ip:' + (await ipHash(request)), 10, 3600))) return json({ ok: false, msg: 'Troppi tentativi. Riprova tra un\'ora.' }, 429);
  if (!(await limite(env, 'em:' + (await sha256(email)), 3, 3600))) return json(generica); // niente informazioni su chi ha troppe richieste
  if (Math.random() < 0.05) await pulisci(env);
  const t = token();
  await env.DB.prepare('INSERT INTO link_accesso (hash, email, scade, consenso) VALUES (?, ?, ?, ?)').bind(await sha256(t), email, Math.floor(Date.now() / 1000) + 900, Math.floor(Date.now() / 1000)).run();
  const link = SITO + '/accedi/?t=' + t;
  const html = '<div style="font-family:Arial,sans-serif;color:#10243e;max-width:520px"><h2 style="color:#14325c">Accedi a Crono Aste</h2><p>Hai chiesto di accedere al tuo account su cronoaste.cloud. Clicca il pulsante per continuare: il link vale 15 minuti e si pu&ograve; usare una sola volta.</p><p><a href="' + esc(link) + '" style="background:#2f5f9e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Accedi</a></p><p style="color:#5a6b82;font-size:13px">Se non hai fatto tu la richiesta, ignora questa email: nessun accesso verr&agrave; effettuato.</p></div>';
  const text = 'Accedi a Crono Aste: apri questo link entro 15 minuti (si usa una sola volta):\n' + link + '\n\nSe non hai fatto tu la richiesta, ignora questa email.';
  const ok = await brevo(env, { to: email, subject: 'Il tuo link di accesso a Crono Aste', html, text });
  if (!ok) return json({ ok: false, msg: 'Invio non riuscito. Riprova o scrivici a info@cronoaste.it.' }, 502);
  return json(generica);
}
export const onRequest = () => json({ ok: false, msg: 'Metodo non consentito.' }, 405);
