// Lettura dei contatori: solo con l'intestazione X-Chiave-Eventi uguale al secret CHIAVE_EVENTI. Restituisce gli ultimi 30 giorni.
const uguali = (a, b) => { if (a.length !== b.length) return false; let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0; };

export async function onRequestGet({ request, env }) {
  const h = { 'content-type': 'application/json', 'cache-control': 'private, no-store' };
  const chiave = request.headers.get('x-chiave-eventi') || '';
  if (!env.EVENTI || !env.CHIAVE_EVENTI || !chiave || !uguali(chiave, env.CHIAVE_EVENTI)) return new Response('{"errore":"non autorizzato"}', { status: 401, headers: h });
  const out = {};
  const nomi = ['salva_asta', 'rimuovi_asta', 'apri_mie_aste', 'cerca_predittiva'];
  for (let i = 0; i < 30; i++) {
    const g = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    const riga = {};
    for (const n of nomi) { const v = parseInt((await env.EVENTI.get(g + ':' + n)) || '0', 10) || 0; if (v) riga[n] = v; }
    if (Object.keys(riga).length) out[g] = riga;
  }
  return new Response(JSON.stringify({ giorni: out }), { status: 200, headers: h });
}
