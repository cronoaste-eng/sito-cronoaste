#!/usr/bin/env python3
"""Costruisce public/ da src/pagine + src/partials. Uso: python3 build.py"""
import pathlib,re,hashlib
R=pathlib.Path(__file__).parent;S=R/'src';P=R/'public'
testata=(S/'partials/testata.html').read_text();pie=(S/'partials/pie.html').read_text()
mod=(S/'modello.html').read_text()
for f in sorted((S/'pagine').glob('*.html')):
    t=f.read_text();m=re.match(r'---\n(.*?)\n---\n',t,re.S);meta=dict(l.split(': ',1) if ': ' in l else (l.rstrip(':'),'') for l in m.group(1).split('\n'));corpo=t[m.end():]
    h=testata
    for k in('beni','come','assistenza','servizi','bollettino','chi'):h=h.replace('{{a_%s}}'%k,' aria-current="page"' if meta.get('attivo')==k else '')
    nome=f.stem;url='/' if nome=='index' else '/%s/'%nome
    out=mod.replace('{{titolo}}',meta['titolo']).replace('{{descrizione}}',meta['descrizione']).replace('{{url}}','https://cronoaste.cloud'+url).replace('{{testata}}',h).replace('{{css}}',''.join('<link rel="stylesheet" href="%s">'%c for c in meta.get('css','').split() ) ).replace('{{js}}',''.join('<script src="%s" defer></script>'%j for j in meta.get('js','').split())).replace('{{corpo}}',corpo).replace('{{pie}}',pie)
    out=re.sub(r'((?:href|src)="(/(?:css|js)/[^"?]+))"',lambda x:'%s?v=%s"'%(x.group(1),hashlib.md5((P/x.group(2)[1:]).read_bytes()).hexdigest()[:8]) if (P/x.group(2)[1:]).exists() else x.group(0),out)  # versione sui file: il telefono ricarica subito dopo ogni modifica
    d=P if nome in('index','404') else P/nome;d.mkdir(exist_ok=True);(d/('404.html' if nome=='404' else 'index.html')).write_text(out);print('ok',url)

# sitemap, robots, 404 (sessione 5)
urls=['/' if f.stem=='index' else '/%s/'%f.stem for f in sorted((S/'pagine').glob('*.html')) if f.stem not in('404','accedi','account')]
(P/'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+''.join('<url><loc>https://cronoaste.cloud%s</loc></url>\n'%u for u in urls)+'</urlset>\n')
print('ok sitemap',len(urls))
