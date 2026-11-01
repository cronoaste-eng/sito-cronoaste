(function(){
  // Pagina "Beni in vendita". Dati: file aggiornati ogni ora su GitHub; aste in corso dal Worker Cloudflare.
  var BASE='https://raw.githubusercontent.com/cronoaste-eng/crono-aste-lotti/main/data/';
  var LIVE='https://live-cronoaste.cronoaste.workers.dev/sito.json';
  var PIATTAFORMA='https://cronoaste.fallcoaste.it';var HOST_URL='cronoaste.fallcoaste.it',HOST_FOTO='d3h8bn4njg0vla.cloudfront.net';
  var root=document.getElementById('ca-beni');
  if(!root)return;
  var HOME=root.hasAttribute('data-home');
  var st={tab:'attivi',trib:'Tutti',q:'',ord:'nuovi',n:0,attivi:null,archivio:null,err:{},live:{}};
  function per(){var w=root.clientWidth||320;if(w<560)return 10;var c=Math.max(2,Math.floor((w+18)/278));return c*2}
  if(!HOME)try{var sv=JSON.parse(sessionStorage.getItem('ca_st')||'null');if(sv&&typeof sv==='object'){if(sv.tab==='attivi'||sv.tab==='archivio')st.tab=sv.tab;if(typeof sv.trib==='string')st.trib=sv.trib.slice(0,60);if(typeof sv.q==='string')st.q=sv.q.slice(0,80);if(typeof sv.ord==='string')st.ord=sv.ord;if(typeof sv.n==='number'&&sv.n>=0&&sv.n<1000)st.n=Math.floor(sv.n)}}catch(x){}
  function salva(){if(HOME)return;try{sessionStorage.setItem('ca_st',JSON.stringify({tab:st.tab,trib:st.trib,q:st.q,ord:st.ord,n:st.n}))}catch(x){}}
  function okurl(u,host){u=String(u==null?'':u);if(!/^https:\/\/[^\s"'<>]+$/.test(u))return '';try{var x=new URL(u);return x.protocol==='https:'&&x.hostname===host&&!x.username&&!x.password?u:''}catch(e){return ''}}
  function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
  function euro(n){if(n==null)return '—';var p=Number(n).toFixed(2).split('.');return p[0].replace(/\B(?=(\d{3})+(?!\d))/g,'.')+','+p[1]}
  function dep(l){var c=l.termine_carta,b=l.termine_bonifico;
    if(c&&b&&c!==b)return '<span>Carta entro: '+esc(c)+'</span><span>Bonifico entro: '+esc(b)+'</span>';
    var d=c||b;return d?'<span>Deposito entro: '+esc(d)+'</span>':''}
  function giorno(s){return (s||'').split(' ')[0]}
  function pd(s){var m=/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)/.exec(s||'');return m?new Date(+m[3],+m[2]-1,+m[1],+m[4],+m[5]).getTime():null}
  function scad(l){var a=[pd(l.termine_carta),pd(l.termine_bonifico)].filter(function(x){return x!=null});return a.length?Math.min.apply(null,a):pd(l.termine)}
  function pr(l){return l.prezzo_minimo!=null?l.prezzo_minimo:l.prezzo}
  var BIG=1e18;
  function nz(x,d){return x==null||isNaN(x)?d:x}
  function ordina(a){
    var o=st.ord,r=a.slice();
    r.sort(function(x,y){
      if(o==='nuovi'){var d=nz(pd(y.pubblicata),0)-nz(pd(x.pubblicata),0);if(d)return d}
      if(o==='rec')return nz(pd(y.termine),0)-nz(pd(x.termine),0);
      if(o==='pa')return nz(pr(x),BIG)-nz(pr(y),BIG);
      if(o==='pd')return nz(pr(y),-1)-nz(pr(x),-1);
      return nz(scad(x),BIG)-nz(scad(y),BIG);
    });
    return r}
  var OPZ={attivi:[['scad','Scadenza più vicina'],['nuovi','Appena pubblicati'],['pa','Prezzo più basso'],['pd','Prezzo più alto']],archivio:[['rec','Più recenti'],['pa','Prezzo più basso'],['pd','Prezzo più alto']]};
  if(!OPZ[st.tab].some(function(o){return o[0]===st.ord}))st.ord=st.tab==='attivi'?'nuovi':'rec';
  function carica(chiave,file){
    if(st[chiave]||st.err[chiave])return Promise.resolve();
    return fetch(BASE+file+'?t='+Math.floor(Date.now()/600000)).then(function(r){if(!r.ok)throw 0;return r.json()}).then(function(d){st[chiave]=d.lotti||[]}).catch(function(){st.err[chiave]=true});
  }
  // Aste in corso: "Asta in corso" e miglior offerta. Prima il Worker (aggiornato ogni pochi secondi), se non risponde il file su GitHub (~1 minuto).
  function leggiLive(){
    return fetch(LIVE).then(function(r){if(!r.ok)throw 0;return r.json()}).catch(function(){
      return fetch(BASE+'live.json?t='+Math.floor(Date.now()/60000)).then(function(r){if(!r.ok)throw 0;return r.json()})});
  }
  function applicaLive(){
    Array.prototype.forEach.call(document.querySelectorAll('#ca-beni .ca-card[data-id],#ca-scad .ca-card[data-id]'),function(a){
      var lv=st.live[a.getAttribute('data-id')],l=a.querySelector('.ca-pl'),v=a.querySelector('.ca-pv');
      var ok=!!lv&&lv.stato==='attiva'&&(st.tab==='attivi'||!!a.closest('#ca-scad'));
      if(ok&&lv.termine){var t=pd(lv.termine);if(t!=null&&t<Date.now()-120000)ok=false}
      a.classList.toggle('ca-inc',ok);
      if(ok&&lv.offerte>0&&typeof lv.prezzo==='number'){l.textContent='Miglior offerta';v.textContent='€ '+euro(lv.prezzo)}
      else{l.textContent=a.getAttribute('data-bl');v.textContent=a.getAttribute('data-bv')}
    });
  }
  function chiuseKey(m){return Object.keys(m).filter(function(k){return m[k].stato==='conclusa'}).sort().join()}
  function caricaLive(forza){
    if(document.hidden&&!forza)return Promise.resolve();
    return leggiLive().then(function(d){
      var m={},ag=Date.parse(d.aggiornato||'');
      if(ag&&Date.now()-ag<1200000)(d.lotti||[]).forEach(function(x){if(x&&x.id)m[String(x.id)]=x});
      var ant=chiuseKey(st.live);st.live=m;if(ant!==chiuseKey(m)&&st.attivi)disegna();else applicaLive();
    }).catch(function(){});
  }
  // Un lotto chiuso da poco (lo dice live.json) sparisce subito da "In vendita", senza aspettare l'aggiornamento orario.
  function chiusa(l){var v=st.live[l.id];return !!v&&v.stato==='conclusa'}
  function lista(){return st.tab==='attivi'?st.attivi:st.archivio}
  function filtrati(){var q=st.q.toLowerCase();return ordina((lista()||[]).filter(function(l){return !(st.tab==='attivi'&&chiusa(l))&&(st.trib==='Tutti'||l.tribunale===st.trib)&&(!q||(l.titolo+' '+l.tribunale).toLowerCase().indexOf(q)>-1)}))}
  var CUORE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/></svg>';
  function prefLeggi(){try{var a=JSON.parse(localStorage.getItem('ca_pref')||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
  function prefHa(id){return prefLeggi().some(function(x){return x&&String(x.id)===String(id)})}
  function conCuore(h,l,forza){
    if(st.tab==='archivio'&&!forza)return h;
    var on=prefHa(l.id);
    return h.replace('<span class="ca-live">','<span class="ca-cuore'+(on?' ca-on':'')+'" role="button" tabindex="0" data-cu="'+esc(l.id)+'" aria-pressed="'+on+'" aria-label="Salva tra Le mie aste">'+CUORE+'</span><span class="ca-live">')}
  function prefSincro(){Array.prototype.forEach.call(document.querySelectorAll('.ca-cuore[data-cu]'),function(c){var on=prefHa(c.getAttribute('data-cu'));c.classList.toggle('ca-on',on);c.setAttribute('aria-pressed',on)})}
  function prefToggle(id){
    var a=prefLeggi(),i=-1;a.forEach(function(x,k){if(x&&String(x.id)===String(id))i=k});
    if(i>=0)a.splice(i,1);
    else{var l=((st.attivi||[]).concat(st.archivio||[])).filter(function(x){return String(x.id)===String(id)})[0];if(!l)return;
      a.unshift({id:String(l.id),t:String(l.titolo||'').slice(0,160),tr:l.tribunale||'',u:okurl(l.url,HOST_URL),f:okurl(l.foto,HOST_FOTO),s:scad(l),p:pr(l)})}
    try{localStorage.setItem('ca_pref',JSON.stringify(a.slice(0,50)))}catch(e){}
    try{if(typeof window.gtag==='function')window.gtag('event',i>=0?'rimuovi_asta':'salva_asta',{transport_type:'beacon'})}catch(e){}
    try{navigator.sendBeacon('/api/evento',i>=0?'rimuovi_asta':'salva_asta')}catch(e){}
    prefSincro();window.dispatchEvent(new Event('ca-pref'));
  }
  function cuoreEvento(e){
    var c=e.target.closest&&e.target.closest('.ca-cuore');if(!c)return;
    if(e.type==='keydown'&&e.key!=='Enter'&&e.key!==' ')return;
    e.preventDefault();e.stopPropagation();prefToggle(c.getAttribute('data-cu'));
  }
  [root,document.getElementById('ca-scad')].forEach(function(el){if(el){el.addEventListener('click',cuoreEvento,true);el.addEventListener('keydown',cuoreEvento,true)}});
  window.addEventListener('ca-pref',prefSincro);
  function card(l,forza){return conCuore(card0(l,forza),l,forza)}
  function card0(l,forza){
    var old=!forza&&st.tab==='archivio';
    var esito=old&&l.esito?'<span class="ca-esito'+(l.esito==='senza offerte'?' ca-no':'')+'">'+(l.esito==='senza offerte'?'Senza offerte':'Con offerte')+'</span>':'';
    var tp=pd(l.pubblicata),nuovo=!old&&tp!=null&&Date.now()-tp>=0&&Date.now()-tp<172800000;
    if(nuovo)esito='<span class="ca-esito ca-new">Nuovo</span>';
    var min=l.prezzo_minimo!=null;
    var prezzo=min?l.prezzo_minimo:l.prezzo;
    var lab=min?'Offerta minima':(old?(l.etichetta||'Prezzo base'):'Prezzo base');
    var righe=old?'<span>Conclusa il '+esc(giorno(l.termine))+'</span>':'<span>Inizio asta: '+esc(l.inizio)+'</span>'+dep(l);
    return '<a class="ca-card'+(old?' ca-old':'')+'" data-id="'+esc(l.id)+'" data-bl="'+esc(lab)+'" data-bv="€ '+euro(prezzo)+'" data-tr="'+esc(l.tribunale||'')+'" data-pr="'+esc(l.procedura||'')+'" href="'+esc(okurl(l.url,HOST_URL)||PIATTAFORMA)+'" target="_blank" rel="noopener"><div class="ca-ph">'+(okurl(l.foto,HOST_FOTO)?'<img loading="lazy" src="'+esc(okurl(l.foto,HOST_FOTO))+'" alt="">':'')+'<span class="ca-tag">Trib. '+esc(l.tribunale||'—')+'</span>'+esito+'<span class="ca-live"><i></i>Asta in corso</span></div><div class="ca-b"><div class="ca-meta">Proc. n. '+esc(l.procedura)+' · '+esc(l.tipo)+'</div><h2 class="ca-t">'+esc(l.titolo)+'</h2><div class="ca-d">'+righe+'</div><div class="ca-p"><span class="ca-pl">'+esc(lab)+'</span><b class="ca-pv">€ '+euro(prezzo)+'</b></div></div></a>';
  }
  // Carosello "Beni in scadenza": i 8 lotti attivi con il termine di deposito piu' vicino (scad), solo se ancora in tempo.
  var scadEl=document.getElementById('ca-scad'),scadHtml='',scadCloni='';
  function giorniA(t){var a=new Date(),b=new Date(t),d=Math.round((new Date(b.getFullYear(),b.getMonth(),b.getDate())-new Date(a.getFullYear(),a.getMonth(),a.getDate()))/86400000);return d}
  function disegnaScad(){
    if(!scadEl||!st.attivi)return;
    var sec=scadEl.closest('section'),now=Date.now();
    var a=st.attivi.filter(function(l){var t=scad(l);return !chiusa(l)&&t!=null&&t>now}).sort(function(x,y){return scad(x)-scad(y)}).slice(0,8);
    if(!a.length){if(sec)sec.hidden=true;return}
    if(sec)sec.hidden=false;
    var schede=a.map(function(l){var d=giorniA(scad(l)),tx=d<=0?'Scade oggi':d===1?'Scade domani':'Scade tra '+d+' giorni';
      return card(l,true).replace('<span class="ca-live">','<span class="ca-esito ca-sc'+(d<=2?' ca-urg':'')+'">'+tx+'</span><span class="ca-live">')});
    scadCloni=schede.map(function(s){return s.replace('<a class="ca-card','<a tabindex="-1" aria-hidden="true" class="ca-card')}).join('');
    var h='<div class="sc-wrap"><div class="sc-track" data-n="'+a.length+'">'+schede.join('')+'</div><button type="button" class="sc-fr sc-prev" data-sc="-1" aria-label="Beni precedenti">\u2039</button><button type="button" class="sc-fr sc-next" data-sc="1" aria-label="Beni successivi">\u203a</button></div>';
    if(h===scadHtml)return;
    scadHtml=h;scadEl.innerHTML=h;
    // Giro continuo: se le schede non entrano tutte, si mette una copia prima e una dopo, si parte dalle vere e si riavvolge senza che si veda.
    var tr=scadEl.querySelector('.sc-track');
    if(tr&&tr.scrollWidth>tr.clientWidth+4){tr.insertAdjacentHTML('beforeend',scadCloni);tr.insertAdjacentHTML('afterbegin',scadCloni);tr.setAttribute('data-loop','1');scadSalta(tr,scadSet(tr))}
    applicaLive();
  }
  if(scadEl)scadEl.addEventListener('click',function(e){
    try{
      var b=e.target.closest&&e.target.closest('.sc-fr');
      if(b){pausaScad(6000);var t=scadEl.querySelector('.sc-track'),dir=+b.getAttribute('data-sc');
        t.scrollBy({left:dir*t.clientWidth*0.8,behavior:'smooth'});return}
      var c=e.target.closest&&e.target.closest('.ca-card');
      if(c&&typeof window.gtag==='function')window.gtag('event','clic_bene',{tribunale:c.getAttribute('data-tr')||'n.d.',procedura:c.getAttribute('data-pr')||'n.d.',sezione:'in_scadenza',posizione:Array.prototype.indexOf.call(c.parentNode.children,c)%(+c.parentNode.getAttribute('data-n')||99)+1,transport_type:'beacon'});
    }catch(x){}
  });
  // Rotazione automatica continua: una scheda ogni 4 s, sempre nello stesso verso. Dopo l'ultima compare la copia della prima
  // e, a movimento finito, si torna senza scatti alla prima vera. Si ferma solo mentre c'e' il dito o il mouse sopra.
  var scadPausa=0,scadTimer=0;
  function pausaScad(ms){scadPausa=ms===Infinity?Infinity:Date.now()+ms}
  function scadSet(t){var n=+t.getAttribute('data-n');return n&&t.children[n]?t.children[n].offsetLeft-t.children[0].offsetLeft:0}
  function scadFine(t){var n=+t.getAttribute('data-n');return n&&t.children[2*n]?t.children[2*n].offsetLeft-t.children[0].offsetLeft:0}
  function scadSalta(t,x){t.style.scrollSnapType='none';t.style.scrollBehavior='auto';t.scrollLeft=x;t.style.scrollBehavior='';requestAnimationFrame(function(){t.style.scrollSnapType=''})}
  function scadRiavvolgi(t){if(!t.getAttribute('data-loop'))return;var s=scadSet(t),f=scadFine(t),x=t.scrollLeft;if(!s||!f)return;if(x>=f-1)scadSalta(t,x-s);else if(x<s-1)scadSalta(t,x+s)}
  if(scadEl){
    ['mouseenter','touchstart','focusin'].forEach(function(n){scadEl.addEventListener(n,function(){pausaScad(Infinity)},{passive:true})});
    ['mouseleave','touchend','touchcancel','focusout'].forEach(function(n){scadEl.addEventListener(n,function(){pausaScad(3500)},{passive:true})});
    scadEl.addEventListener('scroll',function(e){var t=e.target;if(!t||!t.classList||!t.classList.contains('sc-track'))return;clearTimeout(scadTimer);scadTimer=setTimeout(function(){scadRiavvolgi(t)},160)},true);
    if(!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion:reduce)').matches))setInterval(function(){
      try{
        if(document.hidden||Date.now()<scadPausa)return;
        var t=scadEl.querySelector('.sc-track');if(!t||!t.getAttribute('data-loop'))return;
        var r=t.getBoundingClientRect();if(r.bottom<0||r.top>window.innerHeight)return;
        scadRiavvolgi(t);
        var passo=t.children[1].offsetLeft-t.children[0].offsetLeft;
        t.scrollTo({left:Math.round(t.scrollLeft/passo)*passo+passo,behavior:'smooth'});
      }catch(x){}
    },4000);
  }
  function disegnaHome(){
    if(!st.attivi){root.innerHTML=st.err.attivi?'<p class="ca-msg">Non riusciamo a mostrare i beni in questo momento. <a href="'+PIATTAFORMA+'" target="_blank" rel="noopener">Vedi i beni sulla piattaforma vendite</a>.</p>':'<p class="ca-msg">Caricamento dei beni\u2026</p>';return}
    var n=root.clientWidth<560?4:6;st.ord='nuovi';
    root.innerHTML='<div class="ca-grid">'+filtrati().slice(0,n).map(card).join('')+'</div>';applicaLive();
  }
  function disegna(){
    disegnaScad();
    if(HOME){disegnaHome();return}
    var dati=lista(),tabs='<div class="ca-tabs" role="tablist"><button type="button" role="tab" class="ca-tab" data-k="attivi" aria-selected="'+(st.tab==='attivi')+'">In vendita'+(st.attivi?' ('+st.attivi.filter(function(l){return !chiusa(l)}).length+')':'')+'</button><button type="button" role="tab" class="ca-tab" data-k="archivio" aria-selected="'+(st.tab==='archivio')+'">Archivio vendite concluse'+(st.archivio?' ('+st.archivio.length+')':'')+'</button></div>';
    if(!dati){
      root.innerHTML=tabs+(st.err[st.tab]?'<p class="ca-msg">Non riusciamo a mostrare i beni in questo momento. <a href="'+PIATTAFORMA+'" target="_blank" rel="noopener">Vedi tutti i beni sulla piattaforma vendite</a>.</p>':'<p class="ca-msg">Caricamento dei beni…</p>');
      legaTab();return;
    }
    var tribs=['Tutti'];dati.forEach(function(l){if(l.tribunale&&tribs.indexOf(l.tribunale)<0)tribs.push(l.tribunale)});
    var f=filtrati(),pp=per(),np=Math.max(1,Math.ceil(f.length/pp));if(st.n>=np)st.n=np-1;if(st.n<0)st.n=0;var vis=f.slice(st.n*pp,(st.n+1)*pp);
    var h=tabs+'<div class="ca-top"><div class="ca-tools"><input type="search" id="ca-q" placeholder="Cerca un bene…" aria-label="Cerca un bene" value="'+esc(st.q)+'"><select id="ca-ord" aria-label="Ordina per">'+OPZ[st.tab].map(function(o){return '<option value="'+o[0]+'"'+(o[0]===st.ord?' selected':'')+'>'+o[1]+'</option>'}).join('')+'</select><select id="ca-trib" aria-label="Filtra per tribunale">'+tribs.map(function(t){return '<option value="'+esc(t)+'"'+(t===st.trib?' selected':'')+'>'+(t==='Tutti'?'Tutti i tribunali':esc(t))+'</option>'}).join('')+'</select></div></div>';
    h+='<div class="ca-grid">'+vis.map(card).join('')+'</div>';
    if(!f.length)h+='<p class="ca-msg">Nessun bene corrisponde alla ricerca.</p>';
    if(np>1)h+='<nav class="ca-pag" aria-label="Pagine"><button type="button" class="ca-pb" id="ca-prev" aria-label="Pagina precedente"'+(st.n===0?' disabled':'')+'>←<span class="ca-tx"> Precedente</span></button><label class="ca-go">Pagina <input type="number" id="ca-pg" min="1" max="'+np+'" value="'+(st.n+1)+'" inputmode="numeric" aria-label="Vai alla pagina"> di '+np+'</label><button type="button" class="ca-pb" id="ca-next" aria-label="Pagina successiva"'+(st.n>=np-1?' disabled':'')+'><span class="ca-tx">Successiva </span>→</button></nav>';
    root.innerHTML=h;legaTab();salva();applicaLive();
    var q=document.getElementById('ca-q');
    q.addEventListener('input',function(e){if(e.target.value===st.q)return;st.q=e.target.value;st.n=0;var pos=e.target.selectionStart;disegna();var n=document.getElementById('ca-q');n.focus();n.setSelectionRange(pos,pos)});
    document.getElementById('ca-trib').addEventListener('change',function(e){if(e.target.value===st.trib)return;st.trib=e.target.value;st.n=0;disegna()});
    document.getElementById('ca-ord').addEventListener('change',function(e){if(e.target.value===st.ord)return;st.ord=e.target.value;st.n=0;disegna()});
    var pv=document.getElementById('ca-prev'),nx=document.getElementById('ca-next');
    var pg=document.getElementById('ca-pg');
    if(pg){var vai=function(){var v=parseInt(pg.value,10);if(isNaN(v))v=st.n+1;v=Math.max(1,Math.min(np,v));if(v-1!==st.n){st.n=v-1;cambiaPagina()}else pg.value=v};
      pg.addEventListener('change',vai);pg.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();vai()}})}
    if(pv)pv.addEventListener('click',function(){if(st.n>0){st.n--;cambiaPagina()}});
    if(nx)nx.addEventListener('click',function(){if(st.n<np-1){st.n++;cambiaPagina()}});
  }
  // Cambio pagina: aggiorna solo l'elenco e la barra, senza ricreare ricerca e menu, e riporta in cima all'elenco.
  function cambiaPagina(){
    var f=filtrati(),pp=per(),np=Math.max(1,Math.ceil(f.length/pp));if(st.n>=np)st.n=np-1;if(st.n<0)st.n=0;
    var g=root.querySelector('.ca-grid'),pgv=document.getElementById('ca-pg'),pv=document.getElementById('ca-prev'),nx=document.getElementById('ca-next');
    if(!g||!pgv||!pv||!nx){disegna();return}
    g.innerHTML=f.slice(st.n*pp,(st.n+1)*pp).map(card).join('');applicaLive();
    pgv.value=st.n+1;pv.disabled=st.n===0;nx.disabled=st.n>=np-1;salva();
    var top=root.getBoundingClientRect().top;if(top<0)root.scrollIntoView({block:'start'});
  }
  function legaTab(){
    Array.prototype.forEach.call(root.querySelectorAll('.ca-tab'),function(b){b.addEventListener('click',function(){
      st.tab=b.getAttribute('data-k');st.ord=st.tab==='attivi'?'nuovi':'rec';st.trib='Tutti';st.q='';st.n=0;disegna();
      carica(st.tab,st.tab==='attivi'?'lotti.json':'archivio.json').then(disegna);
    })});
  }
  // Misurazione clic sulle schede: evento clic_bene. Predisposto: parte solo se esiste gtag,
  // cioe' dopo il consenso ai cookie di misurazione (banner e Analytics arrivano in una sessione successiva).
  root.addEventListener('click',function(e){
    try{
      var a=e.target;while(a&&a!==root&&!(a.classList&&a.classList.contains('ca-card')))a=a.parentNode;
      if(!a||a===root)return;
      if(typeof window.gtag!=='function')return;
      var i=Array.prototype.indexOf.call(a.parentNode.children,a);
      window.gtag('event','clic_bene',{tribunale:a.getAttribute('data-tr')||'n.d.',procedura:a.getAttribute('data-pr')||'n.d.',sezione:st.tab==='archivio'?'archivio':'in_vendita',posizione:st.n*per()+i+1,transport_type:'beacon'});
    }catch(x){}
  });
  var ultimo=per();window.addEventListener('resize',function(){if(per()!==ultimo){ultimo=per();disegna()}});
  disegna();
  caricaLive(true);setInterval(caricaLive,30000);document.addEventListener('visibilitychange',function(){if(!document.hidden)caricaLive(true)});
  carica('attivi','lotti.json').then(function(){disegna();if(HOME)return;carica('archivio','archivio.json').then(function(){if(st.tab==='archivio'||st.archivio)disegna()})});
})();
