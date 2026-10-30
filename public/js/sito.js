(function(){var b=document.getElementById('hamb'),m=document.getElementById('menu');if(!b||!m)return;
b.addEventListener('click',function(){var o=m.classList.toggle('aperto');b.setAttribute('aria-expanded',o?'true':'false');b.textContent=o?'✕':'☰'});})();
