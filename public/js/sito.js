(function(){var b=document.getElementById('hamb'),m=document.getElementById('menu');if(!b||!m)return;
b.addEventListener('click',function(){var o=m.classList.toggle('aperto');b.setAttribute('aria-expanded',o?'true':'false');b.textContent=o?'✕':'☰'});})();


(function(){
var BASE='https://raw.githubusercontent.com/cronoaste-eng/crono-aste-lotti/main/data/';
var btn=document.getElementById('barra-pref'),pan=document.getElementById('barra-pan'),cnt=document.getElementById('barra-cnt');
var inp=document.getElementById('barra-q'),sug=document.getElementById('barra-sug'),f=document.getElementById('barra-cerca');
if(!f||!inp||!sug)return;
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function ok(u,h){u=String(u==null?'':u);return /^https:\/\/[^\s"'<>]+$/.test(u)&&u.indexOf('https://'+h+'/')===0?u:''}
function euro(n){if(n==null||isNaN(n))return '';var p=Number(n).toFixed(2).split('.');return '€ '+p[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+p[1]}
function pd(s){var m=/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/.exec(s||'');return m?new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5]).getTime():null}
function dm(ms){var d=new Date(ms);return ('0'+d.getDate()).slice(-2)+'/'+('0'+(d.getMonth()+1)).slice(-2)}
function chiudi(){if(pan){pan.hidden=true;btn.setAttribute('aria-expanded','false')}sug.hidden=true}
// ---- Le mie aste (salvate sul dispositivo, senza account)
function leggi(){try{var a=JSON.parse(localStorage.getItem('ca_pref')||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function pref(){
  var a=leggi();
  if(cnt){cnt.textContent=a.length;cnt.hidden=!a.length}
  if(!pan)return;
  if(!a.length){pan.innerHTML='<p class="vuoto">Nessuna asta salvata. Tocca il cuore su un bene per ritrovarlo qui.</p>';return}
  pan.innerHTML='<h3>Le mie aste</h3><ul>'+a.map(function(x){
    var u=ok(x.u,'cronoaste.fallcoaste.it')||'https://cronoaste.fallcoaste.it',sc=typeof x.s==='number'?x.s:null;
    var st=sc==null?'':(sc<Date.now()?'Deposito scaduto':'Deposito entro '+dm(sc));
    return '<li><a href="'+esc(u)+'" target="_blank" rel="noopener"><span><b>'+esc(x.t||'Bene')+'</b><small>'+esc([x.tr?'Trib. '+x.tr:'',st,euro(x.p)].filter(Boolean).join(' · '))+'</small></span></a><button type="button" class="rimuovi" data-rm="'+esc(x.id)+'" aria-label="Rimuovi">×</button></li>'}).join('')+'</ul>';
}
if(btn&&pan){
  btn.addEventListener('click',function(e){e.stopPropagation();var o=pan.hidden;if(o){try{if(typeof window.gtag==='function')window.gtag('event','apri_mie_aste',{transport_type:'beacon'})}catch(x){}try{navigator.sendBeacon('/api/evento','apri_mie_aste')}catch(x){}}chiudi();if(o){pref();pan.hidden=false;btn.setAttribute('aria-expanded','true')}});
  pan.addEventListener('click',function(e){var r=e.target.closest('[data-rm]');if(!r)return;var id=r.getAttribute('data-rm');
    try{localStorage.setItem('ca_pref',JSON.stringify(leggi().filter(function(x){return String(x.id)!==id})))}catch(x){}
    window.dispatchEvent(new Event('ca-pref'))});
  window.addEventListener('ca-pref',function(){pref()});
  window.addEventListener('storage',pref);
  pref();
}
// ---- Ricerca predittiva
var lotti=null,carico=false;
function carica(){if(lotti||carico)return;carico=true;
  fetch(BASE+'lotti.json?t='+Math.floor(Date.now()/600000)).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){lotti=d.lotti||[];mostra()}).catch(function(){carico=false})}
function trova(q){var t=q.toLowerCase().split(/\s+/).filter(Boolean);
  return (lotti||[]).filter(function(l){var h=(String(l.titolo||'')+' '+String(l.tribunale||'')+' '+String(l.procedura||'')).toLowerCase();return t.every(function(w){return h.indexOf(w)>-1})})}
function vaiTutti(q){try{sessionStorage.setItem('ca_st',JSON.stringify({tab:'attivi',trib:'Tutti',q:q.slice(0,80),ord:'nuovi',n:0}))}catch(x){}location.href='/beni-in-vendita/'}
function mostra(){
  var q=inp.value.trim();
  if(pan){pan.hidden=true;btn.setAttribute('aria-expanded','false')}
  if(q.length<2){sug.hidden=true;return}
  if(!lotti){sug.innerHTML='<p class="niente">Cerco…</p>';sug.hidden=false;return}
  var r=trova(q);
  if(!r.length){sug.innerHTML='<p class="niente">Nessun bene trovato.</p>';sug.hidden=false;return}
  sug.innerHTML='<ul>'+r.slice(0,5).map(function(l){
    var u=ok(l.url,'cronoaste.fallcoaste.it')||'https://cronoaste.fallcoaste.it',im=ok(l.foto,'d3h8bn4njg0vla.cloudfront.net'),p=l.prezzo_minimo!=null?l.prezzo_minimo:l.prezzo;
    return '<li><a href="'+esc(u)+'" target="_blank" rel="noopener">'+(im?'<img src="'+esc(im)+'" alt="" loading="lazy">':'')+'<span><b>'+esc(l.titolo||'Bene')+'</b><small>'+esc([l.tribunale?'Trib. '+l.tribunale:'',euro(p)].filter(Boolean).join(' · '))+'</small></span></a></li>'}).join('')+'</ul>'
    +'<a class="tutti" href="/beni-in-vendita/" data-tutti="1">Vedi tutti i risultati ('+r.length+')</a>';
  sug.hidden=false;
}
inp.addEventListener('focus',function(){carica();if(inp.value.trim().length>=2)mostra()});
inp.addEventListener('input',function(){carica();mostra()});
inp.addEventListener('keydown',function(e){
  if(e.key==='Escape'){chiudi()}
  else if(e.key==='ArrowDown'){var a=sug.querySelector('a');if(a){e.preventDefault();a.focus()}}
});
sug.addEventListener('keydown',function(e){
  var l=Array.prototype.slice.call(sug.querySelectorAll('a')),i=l.indexOf(document.activeElement);
  if(e.key==='ArrowDown'&&i<l.length-1){e.preventDefault();l[i+1].focus()}
  else if(e.key==='ArrowUp'){e.preventDefault();if(i>0)l[i-1].focus();else inp.focus()}
  else if(e.key==='Escape'){chiudi();inp.focus()}
});
sug.addEventListener('click',function(e){var t=e.target.closest('[data-tutti]');if(t){e.preventDefault();vaiTutti(inp.value.trim())}});
f.addEventListener('submit',function(e){e.preventDefault();vaiTutti(inp.value.trim())});
document.addEventListener('click',function(e){if(!e.target.closest('.barra'))chiudi()});
document.addEventListener('keydown',function(e){if(e.key==='Escape')chiudi()});
})();
