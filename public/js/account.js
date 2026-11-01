/* Account (accesso con link via email) e sincronizzazione dei beni salvati. Cookie di sessione HttpOnly gestito dal server. */
(function(){
var CH='ca_pref',FL='ca_acc',sync=false,timer=null;
function ls(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function lsDel(k){try{localStorage.removeItem(k)}catch(e){}}
function locali(){try{var a=JSON.parse(ls(CH)||'[]');return Array.isArray(a)?a:[]}catch(e){return []}}
function email(){try{var o=JSON.parse(ls(FL)||'null');return o&&typeof o.e==='string'?o.e:''}catch(e){return ''}}
function api(m,u,b){var o={method:m,headers:{},credentials:'same-origin'};if(b!==undefined){o.headers['content-type']='application/json';o.body=JSON.stringify(b)}
  return fetch(u,o).then(function(r){return r.json().catch(function(){return {ok:false}}).then(function(j){j._st=r.status;return j})})}
function menu(){
  var a=document.getElementById('menu-acc'),sub=document.getElementById('acc-sub');if(!a)return;
  var e=email();
  if(e){a.textContent=e.length>22?e.slice(0,20)+'…':e;a.setAttribute('href','#');a.setAttribute('role','button');a.setAttribute('aria-haspopup','true');a.setAttribute('aria-expanded','false');a.setAttribute('title',e)}
  else{a.textContent='Registrati / Accedi';a.setAttribute('href','/accedi/');a.removeAttribute('role');a.removeAttribute('aria-haspopup');a.removeAttribute('aria-expanded');a.removeAttribute('title');if(sub)sub.hidden=true}
}
function chiudiAcc(){var a=document.getElementById('menu-acc'),sub=document.getElementById('acc-sub');if(sub)sub.hidden=true;if(a&&a.getAttribute('aria-haspopup'))a.setAttribute('aria-expanded','false')}
(function(){var a=document.getElementById('menu-acc'),sub=document.getElementById('acc-sub');if(!a||!sub)return;
  a.addEventListener('click',function(e){if(!email())return;e.preventDefault();e.stopPropagation();var o=sub.hidden;sub.hidden=!o;a.setAttribute('aria-expanded',o?'true':'false')});
  document.addEventListener('click',function(e){if(!e.target.closest('#menu-acc-li'))chiudiAcc()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'){chiudiAcc();a.focus()}});
  var mb=document.getElementById('acc-beni');if(mb)mb.addEventListener('click',function(){chiudiAcc();
    var h=document.getElementById('hamb'),m=document.getElementById('menu');if(h&&m&&m.classList.contains('aperto'))h.click();
    var pb=document.getElementById('barra-pref');if(pb)setTimeout(function(){pb.click()},0)});
})();
function uscitaLocale(){lsDel(FL);lsDel(CH);menu();window.dispatchEvent(new Event('ca-pref'))}
function esci(){return api('POST','/api/esci',{}).then(function(){uscitaLocale()})}
function scriviLocale(items){sync=true;lsSet(CH,JSON.stringify(items.slice(0,50)));window.dispatchEvent(new Event('ca-pref'));sync=false}
function salvaCloud(){if(!email())return;api('PUT','/api/preferiti',{items:locali()}).then(function(j){if(j._st===401)uscitaLocale()})}
window.addEventListener('ca-pref',function(){if(sync||!email())return;clearTimeout(timer);timer=setTimeout(salvaCloud,600)});
var bt=document.getElementById('menu-esci-bt');if(bt)bt.addEventListener('click',function(){esci().then(function(){location.href='/'})});
menu();
// A ogni pagina: se risulta collegato, l'elenco in cloud e' quello valido
var inPagina=!!document.getElementById('acc-conferma');
if(email()&&!inPagina)api('GET','/api/preferiti').then(function(j){
  if(j._st===401){uscitaLocale();return}
  if(j.ok&&Array.isArray(j.items)&&JSON.stringify(j.items)!==JSON.stringify(locali()))scriviLocale(j.items)});
// ---- pagina /accedi/
var f=document.getElementById('acc-form');
if(f){
  var t0=f.querySelector('[name=t0]');t0.value=Date.now();
  var es=f.querySelector('.esito'),sb=f.querySelector('button[type=submit]');
  f.addEventListener('submit',function(e){e.preventDefault();
    var em=f.email.value.trim();
    if(!em){es.className='esito ko';es.textContent='Scrivi la tua email.';return}
    if(!f.consenso.checked){es.className='esito ko';es.textContent='Serve il consenso al trattamento dei dati.';return}
    es.className='esito';es.textContent='Invio in corso...';sb.disabled=true;
    var tkn=f.querySelector('[name=cf-turnstile-response]');
    api('POST','/api/accedi',{email:em,consenso:true,t0:t0.value,sito_web:f.sito_web.value,turnstile:tkn?tkn.value:''}).then(function(j){
      try{if(window.turnstile)window.turnstile.reset()}catch(x){}
      es.className='esito '+(j.ok?'ok':'ko');es.textContent=j.msg||(j.ok?'Fatto.':'Errore.');sb.disabled=false;
      if(j.ok){f.reset();t0.value=Date.now()}
    }).catch(function(){es.className='esito ko';es.textContent='Connessione non riuscita. Riprova.';sb.disabled=false})});
  var p=new URLSearchParams(location.search),tk=p.get('t');
  if(tk&&/^[0-9a-f]{64}$/.test(tk)){
    try{history.replaceState(null,'','/accedi/')}catch(x){}
    document.getElementById('acc-form-box').hidden=true;document.getElementById('acc-conferma').hidden=false;
    var cb=document.getElementById('acc-conferma-bt'),ce=document.getElementById('acc-conferma-esito');
    cb.addEventListener('click',function(){cb.disabled=true;ce.className='esito';ce.textContent='Accesso in corso...';
      api('POST','/api/verifica',{t:tk}).then(function(j){
        if(!j.ok){ce.className='esito ko';ce.textContent=j.msg||'Link non valido.';cb.disabled=false;
          if(j._st===400){document.getElementById('acc-form-box').hidden=false;cb.hidden=true}return}
        lsSet(FL,JSON.stringify({e:j.email}));menu();
        // primo accesso: unisco i beni gia' salvati su questo dispositivo con quelli dell'account
        api('GET','/api/preferiti').then(function(c){
          var ids={},uni=[];(c.items||[]).concat(locali()).forEach(function(x){if(x&&x.id&&!ids[x.id]){ids[x.id]=1;uni.push(x)}});
          scriviLocale(uni);
          return api('PUT','/api/preferiti',{items:uni}).then(function(){return uni.length})
        }).then(function(n){
          document.getElementById('acc-conferma').hidden=true;document.getElementById('acc-ok').hidden=false;
          document.getElementById('acc-ok-txt').textContent='Accesso effettuato come '+j.email+'. '+(n?'Beni salvati nel tuo account: '+n+'.':'Tocca il cuore sui beni per salvarli nel tuo account.')})
      }).catch(function(){ce.className='esito ko';ce.textContent='Connessione non riuscita. Riprova.';cb.disabled=false})})
  }
}
// ---- pagina /account/
var dentro=document.getElementById('acc-dentro');
if(dentro){
  var fuori=document.getElementById('acc-fuori'),pr=document.getElementById('acc-prom'),es2=document.getElementById('acc-esito');
  api('GET','/api/preferiti').then(function(j){
    if(!j.ok){if(j._st===401)uscitaLocale();fuori.hidden=false;return}
    dentro.hidden=false;document.getElementById('acc-email').textContent=j.email;document.getElementById('acc-n').textContent=String(j.items.length);pr.checked=!!j.promemoria;
    lsSet(FL,JSON.stringify({e:j.email}));menu();
  });
  pr.addEventListener('change',function(){api('POST','/api/promemoria',{attivi:pr.checked}).then(function(j){es2.className='esito '+(j.ok?'ok':'ko');es2.textContent=j.ok?(pr.checked?'Promemoria attivati.':'Promemoria disattivati.'):'Non riuscito, riprova.';if(!j.ok)pr.checked=!pr.checked})});
  document.getElementById('acc-esci').addEventListener('click',function(){esci().then(function(){location.href='/'})});
  document.getElementById('acc-elimina').addEventListener('click',function(){
    if(!confirm('Eliminare definitivamente il tuo account, i beni salvati e i promemoria?'))return;
    api('POST','/api/elimina-account',{}).then(function(j){if(j.ok){uscitaLocale();location.href='/'}else{es2.className='esito ko';es2.textContent='Non riuscito, riprova.'}})});
}
})();
