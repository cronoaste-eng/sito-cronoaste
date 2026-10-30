#!/usr/bin/env python3
"""Costruisce public/ da src/pagine + src/partials. Uso: python3 build.py"""
import pathlib,re
R=pathlib.Path(__file__).parent;S=R/'src';P=R/'public'
testata=(S/'partials/testata.html').read_text();pie=(S/'partials/pie.html').read_text()
mod=(S/'modello.html').read_text()
for f in sorted((S/'pagine').glob('*.html')):
    t=f.read_text();m=re.match(r'---\n(.*?)\n---\n',t,re.S);meta=dict(l.split(': ',1) if ': ' in l else (l.rstrip(':'),'') for l in m.group(1).split('\n'));corpo=t[m.end():]
    h=testata
    for k in('beni','come','assistenza','servizi','bollettino','chi'):h=h.replace('{{a_%s}}'%k,' aria-current="page"' if meta.get('attivo')==k else '')
    nome=f.stem;url='/' if nome=='index' else '/%s/'%nome
    out=mod.replace('{{titolo}}',meta['titolo']).replace('{{descrizione}}',meta['descrizione']).replace('{{url}}','https://cronoaste.cloud'+url).replace('{{testata}}',h).replace('{{corpo}}',corpo).replace('{{pie}}',pie)
    d=P if nome=='index' else P/nome;d.mkdir(exist_ok=True);(d/'index.html').write_text(out);print('ok',url)
