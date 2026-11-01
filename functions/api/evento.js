// Cloudflare Pages Function: contatore anonimo degli utilizzi (nessun cookie, nessun IP, nessun identificativo).
// Conta solo quante volte al giorno avviene un evento. Serve il binding KV "EVENTI" (Pages > Settings > Bindings).
// Senza binding risponde 204 e non fa nulla.
const OK = { salva_asta: 1, rimuovi_asta: 1, apri_mie_aste: 1, cerca_predittiva: 1 };

export async function onRequestPost({ request, env }) {
  const no = () => new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
  if (!env.EVENTI) return no();
  let nome = '';
  try { nome = String((await request.text()).slice(0, 40)).trim(); } catch (e) { return no(); }
  if (!OK[nome]) return no();
  const giorno = new Date().toISOString().slice(0, 10);
  const k = giorno + ':' + nome;
  try {
    const n = parseInt((await env.EVENTI.get(k)) || '0', 10) || 0;
    if (n < 20000) await env.EVENTI.put(k, String(n + 1), { expirationTtl: 60 * 60 * 24 * 120 });
  } catch (e) {}
  return no();
}
