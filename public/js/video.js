/* Video YouTube caricati solo al clic (youtube-nocookie): nessun contatto con Google prima. */
(function(){
document.querySelectorAll('.vbox[data-yt]').forEach(function(b){
  var id=b.getAttribute('data-yt'),t=b.getAttribute('data-t')||'Video';
  var bt=document.createElement('button');bt.type='button';bt.setAttribute('aria-label','Riproduci: '+t);
  bt.innerHTML='<span>▶</span>'+t+'<small>Al clic il video viene caricato da YouTube (privacy avanzata)</small>';
  bt.onclick=function(){var f=document.createElement('iframe');f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';f.title=t;f.allow='autoplay; encrypted-media; picture-in-picture';f.allowFullscreen=true;b.innerHTML='';b.appendChild(f)};
  b.appendChild(bt);
});
})();
