// Cloudflare Pages Function: riceve i moduli del sito e li invia per email con Brevo.
// Variabili segrete (Cloudflare > Settings > Variables and Secrets): BREVO_API_KEY_2 (obbligatoria; se assente si usa BREVO_API_KEY).
// Facoltative: MAIL_TO (default info@cronoaste.it), MAIL_FROM (mittente verificato in Brevo, default info@cronoaste.it).
const TIPI = {
  assistenza: 'Richiesta di assistenza',
  professionista: 'Richiesta servizi per professionisti',
  candidatura: 'Candidatura spontanea'
};
const MAX_CV = 4 * 1024 * 1024;
const OK_CV = { pdf: 1, doc: 1, docx: 1 };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const risp = (ok, msg, st) => new Response(JSON.stringify({ ok, msg }), { status: st || (ok ? 200 : 400), headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function onRequestPost({ request, env }) {
  let f;
  try { f = await request.formData(); } catch (e) { return risp(false, 'Richiesta non valida.'); }
  if (f.get('sito_web')) return risp(true, 'Inviato.'); // campo trappola per i robot
  const t0 = parseInt(f.get('t0') || '0', 10);
  if (!t0 || Date.now() - t0 < 3000) return risp(false, 'Riprova tra qualche secondo.');
  const tipo = String(f.get('tipo') || '');
  if (!TIPI[tipo]) return risp(false, 'Richiesta non valida.');
  const nome = String(f.get('nome') || '').trim().slice(0, 120);
  const email = String(f.get('email') || '').trim().slice(0, 160);
  const tel = String(f.get('telefono') || '').trim().slice(0, 40);
  const msg = String(f.get('messaggio') || '').trim().slice(0, 4000);
  if (!nome || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return risp(false, 'Controlla nome ed email.');
  if (!f.get('consenso')) return risp(false, 'Serve il consenso al trattamento dei dati.');
  if (tipo !== 'candidatura' && !msg) return risp(false, 'Scrivi un messaggio.');
  const extra = [];
  for (const k of ['ruolo', 'tribunale', 'procedura', 'argomento']) {
    const v = String(f.get(k) || '').trim().slice(0, 200);
    if (v) extra.push([k, v]);
  }
  let allegato;
  const cv = f.get('cv');
  if (cv && typeof cv === 'object' && cv.size > 0) {
    const ext = (cv.name.split('.').pop() || '').toLowerCase();
    if (!OK_CV[ext]) return risp(false, 'Il curriculum deve essere PDF o Word.');
    if (cv.size > MAX_CV) return risp(false, 'Il curriculum supera 4 MB.');
    const buf = new Uint8Array(await cv.arrayBuffer());
    let bin = '';
    for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    allegato = [{ name: ('curriculum-' + nome.replace(/[^\w]+/g, '-').slice(0, 40) + '.' + ext), content: btoa(bin) }];
  } else if (tipo === 'candidatura') return risp(false, 'Allega il curriculum (PDF o Word).');
  const chiave = env.BREVO_API_KEY_2 || env.BREVO_API_KEY;
  if (!chiave) return risp(false, 'Servizio non ancora attivo. Scrivici a info@cronoaste.it.', 503);
  const righe = [['Nome', nome], ['Email', email], ['Telefono', tel || '-']].concat(extra.map(([k, v]) => [k[0].toUpperCase() + k.slice(1), v]));
  const html = '<h3>' + esc(TIPI[tipo]) + '</h3><table cellpadding="4">' + righe.map(([k, v]) => '<tr><td><b>' + esc(k) + '</b></td><td>' + esc(v) + '</td></tr>').join('') + '</table>' + (msg ? '<p><b>Messaggio</b><br>' + esc(msg).replace(/\n/g, '<br>') + '</p>' : '') + '<p style="color:#888">Inviato dal modulo del sito. Consenso privacy dato.</p>';
  const corpo = { sender: { name: 'Sito Crono Aste', email: env.MAIL_FROM || 'info@cronoaste.it' }, to: [{ email: env.MAIL_TO || 'info@cronoaste.it' }], replyTo: { email, name: nome }, subject: TIPI[tipo] + ' - ' + nome, htmlContent: html };
  if (allegato) corpo.attachment = allegato;
  const r = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': chiave, 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(corpo) });
  if (!r.ok) return risp(false, 'Invio non riuscito. Scrivici a info@cronoaste.it.', 502);
  return risp(true, 'Grazie, abbiamo ricevuto la richiesta. Ti rispondiamo al piu\' presto.');
}
export const onRequest = () => risp(false, 'Metodo non consentito.', 405);
