/* Moduli: invio a /api/modulo (email tramite Brevo). */
(function(){
document.querySelectorAll('form[data-modulo]').forEach(function(fm){
  var t0=fm.querySelector('[name=t0]');if(t0)t0.value=Date.now();
  var st=fm.querySelector('.esito'),bt=fm.querySelector('button[type=submit]');
  fm.addEventListener('submit',function(e){
    e.preventDefault();st.className='esito';st.textContent='Invio in corso...';bt.disabled=true;
    fetch('/api/modulo',{method:'POST',body:new FormData(fm)}).then(function(r){return r.json().catch(function(){return{ok:false,msg:'Errore di invio.'}})}).then(function(j){
      st.textContent=j.msg;st.className='esito '+(j.ok?'ok':'ko');
      if(j.ok){fm.reset();if(t0)t0.value=Date.now();}bt.disabled=false;
    }).catch(function(){st.textContent="Connessione non riuscita. Scrivici a info@cronoaste.it.";st.className='esito ko';bt.disabled=false});
  });
});
})();
