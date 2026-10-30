/* Consenso cookie. Analytics G-G0B22TPLPX parte solo dopo consenso. Scelta salvata 6 mesi in localStorage. */
(function(){
var GA='G-G0B22TPLPX',CH='cronoaste_consenso',MESI=6;
function leggi(){try{var v=JSON.parse(localStorage.getItem(CH));if(v&&v.scad>Date.now())return v}catch(e){}return null}
function salva(a,p){var v={a:!!a,p:!!p,scad:Date.now()+MESI*30*864e5};try{localStorage.setItem(CH,JSON.stringify(v))}catch(e){}return v}
function carica(v){
  if(v.a&&!window.__ga){window.__ga=1;window.dataLayer=window.dataLayer||[];
    window.gtag=function(){window.dataLayer.push(arguments)};
    window.gtag('consent','default',{ad_storage:v.p?'granted':'denied',ad_user_data:v.p?'granted':'denied',ad_personalization:v.p?'granted':'denied',analytics_storage:'granted'});
    window.gtag('js',new Date());window.gtag('config',GA,{anonymize_ip:true});
    var s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+GA;document.head.appendChild(s);}
  if(!v.a&&window.__ga){window.gtag('consent','update',{analytics_storage:'denied'});}
  document.documentElement.setAttribute('data-ads',v.p?'si':'no');
  document.dispatchEvent(new CustomEvent('consenso',{detail:v}));
}
function chiudi(){var b=document.getElementById('cc');if(b)b.remove()}
function scegli(a,p){chiudi();carica(salva(a,p))}
function mostra(apri){
  chiudi();var v=leggi()||{a:false,p:false};
  var b=document.createElement('div');b.id='cc';b.setAttribute('role','dialog');b.setAttribute('aria-label','Cookie');
  b.innerHTML='<div class="cc-in"><p><strong>Cookie.</strong> Usiamo cookie tecnici per far funzionare il sito. Con il tuo consenso usiamo anche cookie statistici (Google Analytics) e pubblicitari (Google AdSense). Puoi rifiutare senza conseguenze. <a href="/cookie-policy/">Cookie Policy</a></p>'+
  '<div class="cc-det" hidden><label><input type="checkbox" checked disabled> Tecnici (sempre attivi)</label><label><input type="checkbox" id="cc-a"'+(v.a?' checked':'')+'> Statistici (Google Analytics)</label><label><input type="checkbox" id="cc-p"'+(v.p?' checked':'')+'> Pubblicitari (Google AdSense)</label></div>'+
  '<div class="cc-az"><button type="button" class="btn" id="cc-ok">Accetta</button><button type="button" class="btn" id="cc-no">Rifiuta</button><button type="button" class="btn vuoto" id="cc-pe">Personalizza</button></div></div>';
  document.body.appendChild(b);
  var det=b.querySelector('.cc-det'),pe=b.querySelector('#cc-pe');
  b.querySelector('#cc-ok').onclick=function(){scegli(true,true)};
  b.querySelector('#cc-no').onclick=function(){scegli(false,false)};
  pe.onclick=function(){if(det.hidden){det.hidden=false;pe.textContent='Salva la scelta';}else scegli(b.querySelector('#cc-a').checked,b.querySelector('#cc-p').checked)};
  if(apri){det.hidden=false;pe.textContent='Salva la scelta';}
}
window.gestisciCookie=function(){mostra(true)};
document.addEventListener('click',function(e){var t=e.target.closest&&e.target.closest('[data-gestisci-cookie]');if(t){e.preventDefault();mostra(true)}});
var v=leggi();if(v)carica(v);else mostra(false);
})();
