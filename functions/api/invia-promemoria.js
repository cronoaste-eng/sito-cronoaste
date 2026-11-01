// POST /api/invia-promemoria (header X-Chiave-Promemoria = secret CHIAVE_PROMEMORIA): chiamato ogni mattina da GitHub Actions.
// Per ogni bene salvato da un utente con promemoria attivi, manda UNA email 2 giorni e UNA 1 giorno prima della scadenza del deposito.
import { json, brevo, esc, urlOk, pulisci } from '../_lib/util.js';

const HOST_VENDITE = 'cronoaste.fallcoaste.it';
const MAX_PER_GIRO = 100; // Brevo gratuito: 300 email al giorno in totale (moduli compresi)
const uguali = (a, b) => { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
function parti(ms) { const o = {}; for (const p of fmt.formatToParts(new Date(ms))) o[p.type] = +p.value; if (o.hour === 24) o.hour = 0; return o; }
const offsetRoma = ms => { const o = parti(ms); return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - ms; };
function romaMs(s) { // "gg/mm/aaaa hh:mm" ora italiana -> millisecondi
  const m = /(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/.exec(s || ''); if (!m) return null;
  const g = Date.UTC(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]);
  return g - offsetRoma(g - offsetRoma(g));
}
const giornoRoma = ms => { const o = parti(ms); return Date.UTC(o.year, o.month - 1, o.day); };
function scadenza(l) { // stessa regola del sito: il termine di deposito piu' vicino
  const c = [l.termine_carta, l.termine_bonifico].map(s => ({ s, ms: romaMs(s) })).filter(x => x.ms != null);
  if (c.length) return c.reduce((a, b) => (b.ms < a.ms ? b : a));
  const ms = romaMs(l.termine); return ms != null ? { s: l.termine, ms } : null;
}
function messaggio(it, link, quando) {
  const titolo = String(it.t || 'Bene salvato'), trib = it.tr ? 'Trib. ' + it.tr : '';
  const html = '<div style="font-family:Arial,sans-serif;color:#10243e;max-width:560px;line-height:1.5"><p>Ciao,</p><p>ti ricordiamo che il termine per depositare l\'offerta per questo bene scade il <b>' + esc(quando) + '</b>: ' + esc(titolo) + (trib ? ' (' + esc(trib) + ')' : '') + '.</p>'
    + '<p><a href="' + esc(link) + '" style="background:#2f5f9e;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;display:inline-block">Vai alla scheda del bene</a></p>'
    + '<p>Questa email &egrave; solo un promemoria: cronoaste.cloud &egrave; un sito vetrina e non si possono presentare offerte da qui. Per partecipare devi essere registrato sul portale vendite (<a href="https://cronoaste.fallcoaste.it">cronoaste.fallcoaste.it</a>) e depositare l\'offerta direttamente l&igrave;.</p>'
    + '<p>Se hai bisogno di assistenza scrivici a <a href="mailto:info@cronoaste.it">info@cronoaste.it</a>, chiamaci o scrivici su <a href="https://wa.me/393501389723">WhatsApp</a> al 350 138 9723: ti aiutiamo gratuitamente per le vendite gestite da noi.</p>'
    + '<p style="color:#5a6b82;font-size:13px">Per non ricevere pi&ugrave; promemoria togli il cuore dal bene o scrivici a info@cronoaste.it.</p></div>';
  const text = 'Ciao,\n\nti ricordiamo che il termine per depositare l\'offerta per questo bene scade il ' + quando + ': ' + titolo + (trib ? ' (' + trib + ')' : '') + '.\n\nVai alla scheda del bene: ' + link + '\n\nQuesta email e\' solo un promemoria: cronoaste.cloud e\' un sito vetrina e non si possono presentare offerte da qui. Per partecipare devi essere registrato sul portale vendite (https://cronoaste.fallcoaste.it) e depositare l\'offerta direttamente li\'.\n\nSe hai bisogno di assistenza scrivici a info@cronoaste.it, chiamaci o scrivici su WhatsApp al 350 138 9723: ti aiutiamo gratuitamente per le vendite gestite da noi.\n\nPer non ricevere piu\' promemoria togli il cuore dal bene o scrivici a info@cronoaste.it.';
  return { html, text };
}
export async function onRequestPost({ request, env }) {
  if (!env.DB || !env.CHIAVE_PROMEMORIA) return json({ ok: false }, 503);
  if (!uguali(request.headers.get('x-chiave-promemoria'), env.CHIAVE_PROMEMORIA)) return json({ ok: false }, 401);
  const prova = new URL(request.url).searchParams.get('prova') === '1'; // prova: calcola ma non invia e non segna
  let lotti = {};
  try {
    const r = await fetch('https://raw.githubusercontent.com/cronoaste-eng/crono-aste-lotti/main/data/lotti.json?t=' + Date.now());
    if (!r.ok) throw 0;
    for (const l of (await r.json()).lotti || []) lotti[String(l.id)] = l;
  } catch (e) { return json({ ok: false, msg: 'lotti.json non letto' }, 502); }
  const ora = Date.now(), oggi = giornoRoma(ora);
  const rs = await env.DB.prepare('SELECT p.utente_id, p.bene_id, p.dati, u.email FROM preferiti p JOIN utenti u ON u.id = p.utente_id WHERE u.promemoria = 1').all();
  let inviati = 0, errori = 0, esaminati = 0, daInviare = 0;
  for (const r of rs.results || []) {
    if (inviati >= MAX_PER_GIRO) break;
    let it; try { it = JSON.parse(r.dati); } catch (e) { continue; }
    esaminati++;
    const l = lotti[r.bene_id];
    if (l && l.stato && l.stato !== 'attiva') continue;
    const sc = l ? scadenza(l) : (typeof it.s === 'number' ? { ms: it.s, s: null } : null);
    if (!sc || sc.ms <= ora) continue;
    const giorni = Math.round((giornoRoma(sc.ms) - oggi) / 864e5);
    if (giorni !== 1 && giorni !== 2) continue;
    const gia = await env.DB.prepare('SELECT 1 FROM inviati WHERE utente_id = ? AND bene_id = ? AND soglia = ?').bind(r.utente_id, r.bene_id, giorni).first();
    if (gia) continue;
    const link = urlOk(l && l.url, HOST_VENDITE) || urlOk(it.u, HOST_VENDITE) || 'https://cronoaste.fallcoaste.it';
    const o = parti(sc.ms), p2 = n => String(n).padStart(2, '0');
    const data = p2(o.day) + '/' + p2(o.month) + '/' + o.year, quando = data + ' alle ' + p2(o.hour) + ':' + p2(o.minute);
    daInviare++;
    if (prova) continue;
    const { html, text } = messaggio(l ? { t: l.titolo, tr: l.tribunale } : it, link, quando);
    const ok = await brevo(env, { to: r.email, subject: 'Promemoria: il deposito per il bene che hai salvato scade il ' + data, html, text });
    if (ok) {
      inviati++;
      await env.DB.prepare('INSERT OR IGNORE INTO inviati (utente_id, bene_id, soglia, quando) VALUES (?, ?, ?, ?)').bind(r.utente_id, r.bene_id, giorni, Math.floor(ora / 1000)).run();
      if (giorni === 1) await env.DB.prepare('INSERT OR IGNORE INTO inviati (utente_id, bene_id, soglia, quando) VALUES (?, ?, 2, ?)').bind(r.utente_id, r.bene_id, Math.floor(ora / 1000)).run();
    } else errori++;
  }
  await pulisci(env);
  return json({ ok: true, prova, esaminati, daInviare, inviati, errori });
}
export const onRequest = () => json({ ok: false }, 405);
