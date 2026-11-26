// GET /api/stato?giorno=AAAA-MM-GG (header X-Chiave-Promemoria = secret CHIAVE_PROMEMORIA): solo CONTEGGI per il
// controllo notturno (workflow controllo-notturno.yml su crono-aste-lotti). Nessuna email, nessun hash, nessun id.
// I contatori dei limiti restano in D1 48 ore (pulisci in util.js): oltre quel tempo valgono null.
import { json } from '../_lib/util.js';

const uguali = (a, b) => { a = String(a || ''); b = String(b || ''); if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };
const fmt = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
function offsetRoma(ms) { const o = {}; for (const p of fmt.formatToParts(new Date(ms))) o[p.type] = +p.value; if (o.hour === 24) o.hour = 0; return Date.UTC(o.year, o.month - 1, o.day, o.hour, o.minute, o.second) - ms; }
function mezzanotteRoma(a, m, g) { const u = Date.UTC(a, m - 1, g); return u - offsetRoma(u - offsetRoma(u)); }

export async function onRequestGet({ request, env }) {
  if (!env.DB || !env.CHIAVE_PROMEMORIA) return json({ ok: false }, 503);
  if (!uguali(request.headers.get('x-chiave-promemoria'), env.CHIAVE_PROMEMORIA)) return json({ ok: false }, 401);
  const q = /^(\d{4})-(\d{2})-(\d{2})$/.exec(new URL(request.url).searchParams.get('giorno') || '');
  if (!q) return json({ ok: false, msg: 'giorno=AAAA-MM-GG' }, 400);
  const da = Math.floor(mezzanotteRoma(+q[1], +q[2], +q[3]) / 1000);
  const a = Math.floor(mezzanotteRoma(+q[1], +q[2], +q[3] + 1) / 1000);
  const ora = Math.floor(Date.now() / 1000);
  const n = async (sql, ...v) => { const r = await env.DB.prepare(sql).bind(...v).first(); return r ? (r.n || 0) : 0; };
  const ore = [Math.floor(da / 3600), Math.floor((a - 1) / 3600)];
  const leggibile = ora - da < 47 * 3600; // i contatori orari si cancellano dopo 48 ore
  const somma = async pref => leggibile ? n('SELECT COALESCE(SUM(n),0) AS n FROM limiti WHERE chiave LIKE ? AND finestra BETWEEN ? AND ?', pref + '%', ore[0], ore[1]) : null;
  const scattati = leggibile ? await n(
    "SELECT COUNT(*) AS n FROM limiti WHERE finestra BETWEEN ? AND ? AND ((chiave LIKE 'ip:%' AND n > 5) OR (chiave LIKE 'em:%' AND n > 3) OR ((chiave LIKE 'vr:%' OR chiave LIKE 'go:%' OR chiave LIKE 'gr:%') AND n > 20))",
    ore[0], ore[1]) : null;
  const giorno = Math.floor(da / 86400); // il tetto di 60 email al giorno usa il giorno UTC
  return json({
    ok: true,
    utenti: await n('SELECT COUNT(*) AS n FROM utenti'),
    utenti_nuovi: await n('SELECT COUNT(*) AS n FROM utenti WHERE creato >= ? AND creato < ?', da, a),
    utenti_google: await n('SELECT COUNT(*) AS n FROM utenti WHERE google_sub IS NOT NULL'),
    promemoria_attivi: await n('SELECT COUNT(*) AS n FROM utenti WHERE promemoria = 1'),
    sessioni_attive: await n('SELECT COUNT(*) AS n FROM sessioni WHERE scade > ?', ora),
    preferiti: await n('SELECT COUNT(*) AS n FROM preferiti'),
    promemoria_inviati: await n('SELECT COUNT(*) AS n FROM inviati WHERE quando >= ? AND quando < ?', da, a),
    link_creati: await somma('em:'),
    link_usati: await somma('vr:'),
    accessi_google: await somma('gr:'),
    tetto_giorno_utc: await n("SELECT COALESCE(MAX(n),0) AS n FROM limiti WHERE chiave = 'giorno' AND finestra IN (?, ?)", giorno, giorno + 1),
    limiti_scattati: scattati
  });
}
